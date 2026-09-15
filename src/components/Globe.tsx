import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { useFrame } from '@react-three/fiber';
import { Canvas, useLoader } from './GlobeCanvas';
import { SpaceBackdrop } from './SpaceBackdrop';
import { globeVertex, surfaceFragment, cloudsFragment, atmosphereFragment } from './earthShaders';
import { GlobeMarkers, type GlobeMarkersHandle, type MarkerProjection } from './GlobeMarkers';
import { services, formatServiceLocation, type Service } from '../data/services';
import { type LaunchMotion } from '../config/launchMotion';
import { Component, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type GlobeProps = {
  paused: boolean;
  compact: boolean;
  viewportHeight: number;
  suspended: boolean;
  reducedMotion: boolean;
  selected: Service | null;
  scrollMotion: React.RefObject<{ progress: number; velocity: number; updatedAt: number }>;
  launchMotion: React.RefObject<LaunchMotion>;
  loaderLayout: { diameter: number; centerY: number };
  onTextureProgress: (progress: number) => void;
  onArrival: () => void;
  onSelect: (service: Service) => void;
  onInteract: () => void;
  onInteractEnd: () => void;
  onReady: () => void;
  onError: () => void;
};

const dayAsset = require(`../../assets/earth/earth_day_4096.jpg`);
const nightAsset = require(`../../assets/earth/earth_night_4096.jpg`);
const detailAsset = require(`../../assets/earth/earth_bump_roughness_clouds_4096.jpg`);
const textureSources = [dayAsset, nightAsset, detailAsset].map(source => Platform.OS === `web` ? Asset.fromModule(source).uri : source);
export const latLngToVector = (latitude: number, longitude: number, radius = 1) => {
  const phi = THREE.MathUtils.degToRad(latitude);
  const theta = THREE.MathUtils.degToRad(longitude);
  return new THREE.Vector3(Math.cos(phi) * Math.cos(theta), Math.sin(phi), -Math.cos(phi) * Math.sin(theta)).multiplyScalar(radius);
};

type SceneProps = GlobeProps & {
  drag: React.RefObject<{ x: number; y: number }>;
  dragging: React.RefObject<boolean>;
  onProjectMarkers: (points: MarkerProjection[]) => void;
};

type ScrollSpring = { value: number; velocity: number };

type EarthUniforms = {
  dayMap: { value: THREE.Texture };
  nightMap: { value: THREE.Texture };
  detailMap: { value: THREE.Texture };
  sunDirection: { value: THREE.Vector3 };
  fillProgress: { value: number };
  launchMix: { value: number };
  liquidTime: { value: number };
  texturesReady: { value: number };
};

// Suspend only texture acquisition: the very same sphere is already visible as
// glass and liquid while these resources load, then receives its Earth maps.
const EarthTextures = ({ uniforms, onConfigured, onProgress }: {
  uniforms: EarthUniforms;
  onConfigured: () => void;
  onProgress: (progress: number) => void;
}) => {
  const textures = useLoader(THREE.TextureLoader, textureSources, loader => {
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_url, loaded, total) => onProgress(loaded / Math.max(textureSources.length, total));
    loader.manager = manager;
  });

  useEffect(() => {
    textures.forEach((texture, index) => {
      texture.colorSpace = index < 2 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
    });
    uniforms.dayMap.value = textures[0];
    uniforms.nightMap.value = textures[1];
    uniforms.detailMap.value = textures[2];
    uniforms.texturesReady.value = 1;
    onConfigured();
    onProgress(1);
  }, [textures, uniforms, onConfigured, onProgress]);

  return null;
};

const advanceScrollSpring = (spring: ScrollSpring, target: number, delta: number) => {
  // Exact critically damped motion keeps velocity continuous when wheel/touch
  // events retarget the composition, without depending on the frame rate.
  const frequency = 2 / 0.16;
  const offset = spring.value - target;
  const step = (spring.velocity + frequency * offset) * delta;
  const decay = Math.exp(-frequency * delta);
  spring.value = target + (offset + step) * decay;
  spring.velocity = (spring.velocity - frequency * step) * decay;
  if (Math.abs(spring.value - target) < 0.00001 && Math.abs(spring.velocity) < 0.0001) {
    spring.value = target;
    spring.velocity = 0;
  }
};

const EarthScene = ({ selected, paused, compact, viewportHeight, reducedMotion, scrollMotion, launchMotion, loaderLayout, onTextureProgress, drag, dragging, onReady, onArrival, onProjectMarkers }: SceneProps) => {
  const clouds = useRef<THREE.Mesh>(null);
  const sunDirection = useMemo(() => new THREE.Vector3(), []);
  const targetDirection = useMemo(() => new THREE.Vector3(), []);
  const currentDirection = useRef(latLngToVector(20, -100));
  const currentDistance = useRef(compact ? 3.15 : 2.55);
  const currentHorizon = useRef(compact ? 0.66 : 0.68);
  const currentHorizontal = useRef(0);
  const renderedPresentation = useRef({ distance: currentDistance.current, horizon: currentHorizon.current, horizontal: 0 });
  const arrivalSent = useRef(false);
  const texturesConfigured = useRef(false);
  const earthRendered = useRef(false);
  const readySent = useRef(false);
  const lastDrag = useRef({ x: 0, y: 0 });
  const previousSelection = useRef<Service | null>(null);
  const presentationMotion = useRef<ScrollSpring>({ value: 0, velocity: 0 });
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const transition = useRef({ progress: 1, from: currentDirection.current.clone(), ...renderedPresentation.current });
  const markerPositions = useMemo(() => services.map(service => ({ id: service.id, position: latLngToVector(service.latitude, service.longitude, 1.013), projected: new THREE.Vector3() })), []);
  const placeholder = useMemo(() => {
    const texture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    texture.needsUpdate = true;
    return texture;
  }, []);
  const uniforms = useMemo<EarthUniforms>(() => ({
    dayMap: { value: placeholder }, nightMap: { value: placeholder }, detailMap: { value: placeholder },
    sunDirection: { value: sunDirection }, fillProgress: { value: 0 }, launchMix: { value: 1 },
    liquidTime: { value: 0 }, texturesReady: { value: 0 },
  }), [placeholder, sunDirection]);
  // R3F copies declarative uniform entries. Owning these materials preserves
  // the shared live values used by resource loading and the animation frames.
  const materials = useMemo(() => ({
    surface: new THREE.ShaderMaterial({ vertexShader: globeVertex, fragmentShader: surfaceFragment, uniforms }),
    clouds: new THREE.ShaderMaterial({ vertexShader: globeVertex, fragmentShader: cloudsFragment, uniforms, transparent: true, depthWrite: false }),
    atmosphere: new THREE.ShaderMaterial({ vertexShader: globeVertex, fragmentShader: atmosphereFragment, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide }),
  }), [uniforms]);
  const onTexturesConfigured = useCallback(() => { texturesConfigured.current = true; }, []);

  useEffect(() => () => {
    placeholder.dispose();
    Object.values(materials).forEach(material => material.dispose());
  }, [placeholder, materials]);

  useLayoutEffect(() => {
    // An initial orbit is already correctly framed; only destination changes fly.
    if (previousSelection.current === selected) return;
    previousSelection.current = selected;
    // Begin with the frame the user actually sees, including its scroll pose.
    // Baking that pose into the flight avoids visiting the hero framing first.
    const presentation = renderedPresentation.current;
    transition.current = { progress: 0, from: currentDirection.current.clone(), ...presentation };
    currentDistance.current = presentation.distance;
    currentHorizon.current = presentation.horizon;
    currentHorizontal.current = presentation.horizontal;
    presentationMotion.current = { value: 0, velocity: 0 };
    arrivalSent.current = false;
    lastDrag.current = { ...drag.current };
  }, [selected, drag]);

  useFrame(({ camera, size }, frameDelta) => {
    // The prior frame must have drawn the textured Earth before revealing it.
    if (earthRendered.current && !readySent.current) {
      readySent.current = true;
      onReady();
    }
    const delta = Math.min(frameDelta, 0.05);
    const launch = launchMotion.current;
    uniforms.fillProgress.value = launch.fill;
    uniforms.launchMix.value = 1 - launch.reveal;
    if (!reducedMotion) uniforms.liquidTime.value += delta;
    const flight = transition.current;
    const inFlight = flight.progress < 1;
    flight.progress = reducedMotion ? 1 : Math.min(1, flight.progress + delta / (selected ? 2.2 : 2.8));
    const eased = flight.progress < 0.5 ? 4 * flight.progress ** 3 : 1 - (-2 * flight.progress + 2) ** 3 / 2;
    // Keep Earth at regional scale even when city tiles are delayed or unavailable.
    const restingDistance = selected ? 2.2 : (compact ? 3.15 : 2.55);
    const restingHorizon = selected ? 0 : compact ? 0.66 : 0.68;
    const motion = scrollMotion.current;
    const scrollTarget = selected ? 0 : THREE.MathUtils.clamp(motion.progress, 0, 5);
    if (reducedMotion) presentationMotion.current = { value: scrollTarget, velocity: 0 };
    else advanceScrollSpring(presentationMotion.current, scrollTarget, delta);
    const progress = THREE.MathUtils.clamp(presentationMotion.current.value, 0, 5);
    const leg = Math.min(4, Math.floor(progress));
    const legProgress = progress - leg;
    const presentation = legProgress * legProgress * (3 - 2 * legProgress);
    // Rotation follows the visible journey, including its gentle settling.
    // The spring's continuous velocity avoids spikes from individual events.
    const presentationSpeed = Math.abs(6 * legProgress * (1 - legProgress) * presentationMotion.current.velocity);
    const orbitSpeed = 0.027 + Math.min(0.65, presentationSpeed * 0.42);
    targetDirection.copy(latLngToVector(selected?.latitude ?? 20, selected?.longitude ?? -100));
    if (inFlight) {
      const quaternion = new THREE.Quaternion().setFromUnitVectors(flight.from, targetDirection);
      const turn = selected ? Math.min(1, flight.progress / 0.7) : eased;
      const turnEase = selected ? turn * turn * (3 - 2 * turn) : turn;
      currentDirection.current.copy(flight.from).applyQuaternion(new THREE.Quaternion().slerp(quaternion, turnEase));
      const descent = Math.max(0, (flight.progress - 0.32) / 0.68);
      const descentEase = descent * descent * (3 - 2 * descent);
      const lift = Math.min(1, flight.progress / 0.32);
      const liftEase = lift * lift * (3 - 2 * lift);
      const liftedDistance = THREE.MathUtils.lerp(flight.distance, Math.max(flight.distance, 3.2), liftEase);
      currentDistance.current = selected ? THREE.MathUtils.lerp(liftedDistance, restingDistance, descentEase) : THREE.MathUtils.lerp(flight.distance, restingDistance, eased);
      currentHorizon.current = THREE.MathUtils.lerp(flight.horizon, restingHorizon, eased);
      currentHorizontal.current = THREE.MathUtils.lerp(flight.horizontal, 0, eased);
    } else {
      currentDistance.current = reducedMotion ? restingDistance : THREE.MathUtils.damp(currentDistance.current, restingDistance, 7, delta);
      currentHorizon.current = reducedMotion ? restingHorizon : THREE.MathUtils.damp(currentHorizon.current, restingHorizon, 7, delta);
      currentHorizontal.current = reducedMotion ? 0 : THREE.MathUtils.damp(currentHorizontal.current, 0, 7, delta);
      const dx = drag.current.x - lastDrag.current.x;
      const dy = drag.current.y - lastDrag.current.y;
      if (dx || dy) {
        currentDirection.current.applyAxisAngle(up, -dx * 0.004);
        right.crossVectors(up, currentDirection.current).normalize();
        const candidate = currentDirection.current.clone().applyAxisAngle(right, -dy * 0.003);
        if (Math.abs(candidate.y) < 0.94) currentDirection.current.copy(candidate);
      } else if (!paused && !dragging.current && !selected && !reducedMotion) {
        // Continue from the user's orientation, including after the idle delay.
        currentDirection.current.applyAxisAngle(up, delta * orbitSpeed);
      }
    }
    lastDrag.current = { ...drag.current };

    // Scroll changes composition without changing the geographic direction.
    // Destination flights inherit that composition when they begin.
    let distance = currentDistance.current;
    let horizon = currentHorizon.current;
    let horizontal = currentHorizontal.current;
    if (camera instanceof THREE.PerspectiveCamera && size.width && size.height) {
      const targetDiameter = compact ? size.width * 0.56 : Math.min(size.width * 0.45, viewportHeight * 0.68);
      // A sphere's silhouette subtends asin(radius / distance), so retain an
      // exact apparent diameter across viewport aspect ratios and breakpoints.
      // Interpolate the visible size rather than camera distance: otherwise a
      // large mobile Earth collapses too quickly at the start of the journey.
      if (progress > 0) {
        const focalHeight = size.height / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
        const initialDiameter = focalHeight / Math.sqrt(distance * distance - 1);
        const footerDiameter = initialDiameter * 0.94;
        const finalDiameter = initialDiameter * 1.03;
        const diameters = [initialDiameter, targetDiameter, targetDiameter * (compact ? 1 : 1.08), targetDiameter, footerDiameter, finalDiameter];
        const diameter = THREE.MathUtils.lerp(diameters[leg], diameters[leg + 1], presentation);
        distance = Math.sqrt(1 + (focalHeight / diameter) ** 2);
        const storyHorizon = compact ? viewportHeight * 0.17 / size.height - 0.5 : -0.04;
        // At the end the planet's lower edge reaches 26% of the screen. This
        // mirrors the opening horizon while leaving room for the footer.
        const finalHorizon = (viewportHeight * 0.26 - finalDiameter / 2) / size.height - 0.5;
        const footerHorizon = (viewportHeight * 0.2 - footerDiameter / 2) / size.height - 0.5;
        const horizons = [horizon, storyHorizon, storyHorizon, storyHorizon, footerHorizon, finalHorizon];
        const side = compact ? 0.18 : 0.26;
        const horizontals = [horizontal, side, -side, side, -0.04, 0];
        horizon = THREE.MathUtils.lerp(horizons[leg], horizons[leg + 1], presentation);
        horizontal = THREE.MathUtils.lerp(horizontals[leg], horizontals[leg + 1], presentation);
      }
      // Animate this camera from the loader's glass Earth to the opening
      // horizon. No canvas, mesh, texture, or geographic orientation is swapped.
      if (launch.reveal < 1 && !selected) {
        const focalHeight = size.height / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
        const landingDiameter = focalHeight / Math.sqrt(distance * distance - 1);
        const diameter = THREE.MathUtils.lerp(loaderLayout.diameter, landingDiameter, launch.reveal);
        distance = Math.sqrt(1 + (focalHeight / diameter) ** 2);
        horizon = THREE.MathUtils.lerp(loaderLayout.centerY / size.height - 0.5, horizon, launch.reveal);
        horizontal *= launch.reveal;
      }
      camera.setViewOffset(size.width, size.height, -size.width * horizontal, -size.height * horizon, size.width, size.height);
    }
    renderedPresentation.current = { distance, horizon, horizontal };
    camera.position.copy(currentDirection.current).multiplyScalar(distance);
    camera.lookAt(0, 0, 0);
    // Project after updating this frame's camera so the tap targets stay attached
    // to their actual coordinates through dragging, scrolling, and orbiting.
    camera.updateMatrixWorld();
    onProjectMarkers(markerPositions.map(({ id, position, projected }) => {
      projected.copy(position).project(camera);
      const x = (projected.x + 1) * size.width / 2;
      const y = (1 - projected.y) * size.height / 2;
      return {
        id, x, y,
        visible: launch.reveal === 1 && !selected && flight.progress === 1 && position.dot(camera.position) > position.lengthSq()
          && projected.z >= -1 && projected.z <= 1 && x >= 0 && x <= size.width && y >= 0 && y <= size.height,
      };
    }));
    right.crossVectors(up, currentDirection.current).normalize();
    sunDirection.copy(currentDirection.current).multiplyScalar(0.55).addScaledVector(right, -0.75).addScaledVector(up, 0.65).normalize();
    if (clouds.current && !paused && !dragging.current && !reducedMotion) clouds.current.rotation.y += delta * 0.008;
    if (selected && flight.progress === 1 && !arrivalSent.current) { arrivalSent.current = true; onArrival(); }
  });

  return (
    <>
      <SpaceBackdrop compact={compact} launchMotion={launchMotion} reducedMotion={reducedMotion} />
      <Suspense fallback={null}><EarthTextures uniforms={uniforms} onConfigured={onTexturesConfigured} onProgress={onTextureProgress} /></Suspense>
      <mesh name="earth-surface" onAfterRender={() => { if (texturesConfigured.current) earthRendered.current = true; }}>
        <sphereGeometry args={[1, compact ? 64 : 128, compact ? 48 : 96]} />
        <primitive object={materials.surface} attach="material" />
      </mesh>
      <mesh name="earth-clouds" ref={clouds}>
        <sphereGeometry args={[1.005, 64, 48]} />
        <primitive object={materials.clouds} attach="material" />
      </mesh>
      <mesh name="earth-atmosphere">
        <sphereGeometry args={[1.027, 64, 48]} />
        <primitive object={materials.atmosphere} attach="material" />
      </mesh>
    </>
  );
};

class GlobeBoundary extends Component<{ children: ReactNode; showError: boolean; onRetry: () => void; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() {
    if (this.state.failed && !this.props.showError) return null;
    if (this.state.failed) return <View style={styles.loading}><Text style={styles.errorTitle}>The globe couldn’t load</Text><Text style={styles.errorText}>Choose a destination to explore its city.</Text><Pressable onPress={this.props.onRetry} accessibilityRole="button" style={styles.retry}><Text style={styles.loadingText}>RETRY GLOBE ↗</Text></Pressable></View>;
    return this.props.children;
  }
}

export const Globe = (props: GlobeProps) => {
  const drag = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const markerPressCancelled = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  const markers = useRef<GlobeMarkersHandle>(null);
  const [markerPreviewOpen, setMarkerPreviewOpen] = useState(false);
  const handleMarkerPreviewChange = useCallback((open: boolean) => {
    if (open) markerPressCancelled.current = false;
    setMarkerPreviewOpen(open);
  }, []);
  const projectMarkers = useCallback((points: MarkerProjection[]) => markers.current?.update(points), []);
  const canSelectMarker = useCallback(() => !markerPressCancelled.current && !dragging.current, []);
  const [attempt, setAttempt] = useState(0);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: () => { markerPressCancelled.current = false; return false; },
    onMoveShouldSetPanResponderCapture: (_, gesture) => {
      if (Math.hypot(gesture.dx, gesture.dy) > 6) markerPressCancelled.current = true;
      return Math.abs(gesture.dx) > 5 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
    },
    onPanResponderGrant: () => { markerPressCancelled.current = true; markers.current?.dismissPreview?.(); origin.current = { ...drag.current }; dragging.current = true; props.onInteract(); },
    onPanResponderMove: (_, gesture) => { drag.current = { x: origin.current.x + gesture.dx, y: origin.current.y + gesture.dy }; },
    onPanResponderRelease: () => { dragging.current = false; props.onInteractEnd(); },
    onPanResponderTerminate: () => { dragging.current = false; props.onInteractEnd(); },
  }), [props.onInteract, props.onInteractEnd]);

  return (
    <View style={styles.container} {...responder.panHandlers} accessibilityLabel={props.selected ? `Earth focused on ${formatServiceLocation(props.selected)}` : `Interactive rotating Earth. Drag horizontally to rotate, or choose a city marker`}>
      <GlobeBoundary key={attempt} showError={props.launchMotion.current.reveal === 1} onError={() => { markers.current?.hide(); props.onError(); }} onRetry={() => { useLoader.clear(THREE.TextureLoader, textureSources); setAttempt(value => value + 1); }}>
        <View style={[styles.canvas, { pointerEvents: `none` }]}>
          <Canvas frameloop={props.suspended ? `never` : `always`} camera={{ fov: 38, near: 0.01, far: 80, position: [0, 0, 2.55] }} dpr={[1, props.compact ? 1.5 : 2]} gl={{ alpha: true, antialias: true, powerPreference: `high-performance` }} style={styles.canvas}>
            <Suspense fallback={null}><EarthScene {...props} paused={props.paused || markerPreviewOpen} drag={drag} dragging={dragging} onProjectMarkers={projectMarkers} /></Suspense>
          </Canvas>
        </View>
      </GlobeBoundary>
      <GlobeMarkers ref={markers} onSelect={props.onSelect} onPreviewChange={handleMarkerPreviewChange} canSelectPointer={canSelectMarker} reducedMotion={props.reducedMotion} paused={props.paused} enabled={!props.selected && !props.suspended} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  canvas: { flex: 1 },
  loading: { position: `absolute`, top: `56%`, right: 0, bottom: 100, left: 0, gap: 18, paddingHorizontal: 24, alignItems: `center`, justifyContent: `center` },
  loadingText: { color: `#8DA6B7`, fontSize: 12, letterSpacing: 2 },
  errorTitle: { color: `#EAF1F5`, fontSize: 20, textAlign: `center` },
  errorText: { color: `#8DA6B7`, fontSize: 14, textAlign: `center` },
  retry: { padding: 16, borderWidth: 1, borderColor: `#294655`, borderRadius: 30 },
});
