import { useEffect, useRef, useState, type RefObject } from 'react';
import { Animated, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { getLoaderEarthLayout, type LaunchMotion } from '../config/launchMotion';
import { GeoBrand, type BrandFrame } from './GeoBrand';

/** Shared with the persistent Earth so the loader and landing are one continuous scene. */
export type { LaunchMotion } from '../config/launchMotion';

type WorldLoaderProps = {
  progress: number;
  ready: boolean;
  reducedMotion: boolean;
  active: boolean;
  launchMotion: RefObject<LaunchMotion>;
  reveal: Animated.Value;
  brandTarget: BrandFrame;
  onComplete: () => void;
};

type Readout = { percent: number; blur: number };
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const easeInOutCubic = (value: number) => value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
const easeOutSine = (value: number) => Math.sin(value * Math.PI / 2);

/** Animate only toward reported readiness. The WebGL Earth behind this overlay owns its liquid. */
export const WorldLoader = ({ progress, ready, reducedMotion, active, launchMotion, reveal, brandTarget, onComplete }: WorldLoaderProps) => {
  const { width, height } = useWindowDimensions();
  const compact = width < 700;
  const shortViewport = height < 560;
  const { diameter, centerY } = getLoaderEarthLayout(width, height);
  const [readout, setReadout] = useState<Readout>({ percent: 0, blur: 0 });
  const inputs = useRef({ progress, ready, reducedMotion, onComplete });
  inputs.current = { progress, ready, reducedMotion, onComplete };
  const state = useRef({
    value: 0,
    target: 0,
    from: 0,
    elapsed: 0,
    duration: 1800,
    hold: 0,
    departure: 0,
    phase: `fill` as `fill` | `hold` | `reveal` | `complete`,
  });

  useEffect(() => {
    if (!active || state.current.phase === `complete`) return;
    let frame = 0;
    let previousTime: number | null = null;
    let cancelled = false;

    const tick = (time: number) => {
      if (cancelled) return;
      // Tab/app inactivity does not skip the fill or the Earth handoff.
      const delta = previousTime === null ? 0 : Math.min(64, time - previousTime);
      previousTime = time;
      const current = state.current;
      const input = inputs.current;
      const requested = input.ready ? 1 : Math.min(0.99, clamp(Number.isFinite(input.progress) ? input.progress : 0));
      const before = current.value;

      if (current.phase === `fill`) {
        if (requested > current.target) {
          current.from = current.value;
          current.target = requested;
          current.elapsed = 0;
          // A warm cache still has a readable, roughly 1.8 second liquid fill.
          // Slow loads animate to each real milestone and wait there.
          current.duration = Math.max(240, (requested - current.value) * 1800);
        }
        if (input.reducedMotion) {
          current.value = Math.max(current.value, current.target);
        } else if (current.value < current.target) {
          current.elapsed += delta;
          const fraction = clamp(current.elapsed / current.duration);
          current.value = current.from + (current.target - current.from) * easeOutSine(fraction);
          if (fraction === 1) current.value = current.target;
        }
        launchMotion.current.fill = current.value;
        if (input.ready && current.value === 1) {
          current.phase = `hold`;
          current.hold = 0;
        }
      } else if (current.phase === `hold`) {
        current.hold += delta;
        if (current.hold >= (input.reducedMotion ? 0 : 220)) current.phase = `reveal`;
      } else if (current.phase === `reveal`) {
        current.departure = Math.min(1, current.departure + delta / (input.reducedMotion ? 180 : 1700));
        const departure = input.reducedMotion ? current.departure : easeInOutCubic(current.departure);
        launchMotion.current.reveal = input.reducedMotion ? 1 : departure;
        reveal.setValue(departure);
        if (current.departure === 1) {
          current.phase = `complete`;
          inputs.current.onComplete();
          return;
        }
      }

      const percent = current.value === 1 ? 100 : Math.floor(current.value * 100);
      const velocity = delta > 0 ? (current.value - before) / delta : 0;
      const blur = input.reducedMotion || percent === 100 ? 0 : Math.round(Math.min(1.6, velocity * 1900) * 5) / 5;
      setReadout(previous => previous.percent === percent && previous.blur === blur ? previous : { percent, blur });
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [active, launchMotion, reveal]);

  // Clear the readout before the growing sphere reaches its original position.
  const copyOpacity = reveal.interpolate({ inputRange: [0, 0.005, 0.035, 1], outputRange: [1, 1, 0, 0], extrapolate: `clamp` });
  const copyDeparture = reducedMotion ? 0 : reveal.interpolate({ inputRange: [0, 0.04, 1], outputRange: [0, -10, -10], extrapolate: `clamp` });
  const ringSize = diameter + 42;
  const coarseProgress = readout.percent === 100 ? 100 : Math.floor(readout.percent / 10) * 10;
  const motionBlur = !reducedMotion && Platform.OS === `web` ? { filter: `blur(${readout.blur}px)` } : undefined;
  const ghostBlur = Platform.OS === `web` ? { filter: `blur(${Math.max(2, readout.blur * 2)}px)` } : undefined;
  const number = String(readout.percent).padStart(2, `0`);
  // The launch value already eases to zero velocity at the final frame.
  const travel = reveal;
  const centeredBrand = !shortViewport && !reducedMotion;
  const initialScale = centeredBrand ? (compact ? 1.08 : 1.2) : 1;
  const initialTop = Math.max(24, centerY - diameter / 2 - 132);
  const brandX = centeredBrand ? width / 2 - (brandTarget.x + brandTarget.width / 2) : 0;
  const brandY = centeredBrand ? initialTop + brandTarget.height * initialScale / 2 - (brandTarget.y + brandTarget.height / 2) : 0;

  return (
    <View
      testID="world-loader"
      accessibilityRole="progressbar"
      accessibilityLabel="Loading GeoCorp"
      accessibilityValue={{ min: 0, max: 100, now: coarseProgress, text: `${coarseProgress}% loaded` }}
      accessibilityState={{ busy: readout.percent < 100 }}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={coarseProgress}
      aria-valuetext={`${coarseProgress}% loaded`}
      aria-busy={readout.percent < 100}
      accessibilityLiveRegion="polite"
      accessibilityViewIsModal
      style={styles.screen}
    >
      <Animated.View
        testID="loader-brand"
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        aria-hidden
        style={{
          position: `absolute`, left: brandTarget.x, top: brandTarget.y, width: brandTarget.width, height: brandTarget.height,
          transform: [
            { translateX: travel.interpolate({ inputRange: [0, 1], outputRange: [brandX, 0] }) },
            { translateY: travel.interpolate({ inputRange: [0, 1], outputRange: [brandY, 0] }) },
            { scale: travel.interpolate({ inputRange: [0, 1], outputRange: [initialScale, 1] }) },
          ],
        }}
      >
        <GeoBrand />
      </Animated.View>
      <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={[styles.visuals, { opacity: copyOpacity }]}>
        <View style={[styles.brandRow, compact && styles.brandRowCompact, shortViewport && styles.hidden]}>
          <View style={styles.edition}>
            <View style={styles.statusDot} />
            <Text style={styles.editionText}>A WIDER WORLD</Text>
          </View>
        </View>

        <Animated.View style={[styles.eyebrowRow, { top: Math.max(shortViewport && compact ? brandTarget.y + brandTarget.height + 14 : 10, centerY - diameter / 2 - (compact ? 59 : 65)), transform: [{ translateY: copyDeparture }] }]}>
          <View style={styles.eyebrowLine} />
          <Text style={styles.eyebrow}>SETTING THE WORLD IN MOTION</Text>
          <View style={styles.eyebrowLine} />
        </Animated.View>

        <View style={[styles.orbit, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, left: (width - ringSize) / 2, top: centerY - ringSize / 2 }]}>
          <View style={styles.orbitTickTop} />
          <View style={styles.orbitTickBottom} />
          <View style={styles.orbitTickLeft} />
          <View style={styles.orbitTickRight} />
        </View>
        <View style={[styles.glass, { width: diameter + 4, height: diameter + 4, borderRadius: (diameter + 4) / 2, left: (width - diameter - 4) / 2, top: centerY - diameter / 2 - 2 }]} />
        <View style={[styles.glint, { left: width / 2 + diameter * 0.33, top: centerY - diameter * 0.37 }]} />

        <Animated.View style={[styles.readout, { top: centerY + diameter / 2 + (shortViewport ? 9 : compact ? 27 : 35), transform: [{ translateY: copyDeparture }] }]}>
          <View style={styles.counterRow}>
            {!reducedMotion && readout.blur > 0 && (
              <Text style={[styles.number, compact && styles.numberCompact, shortViewport && styles.numberShort, styles.ghost, ghostBlur, { opacity: Math.min(0.26, readout.blur * 0.18), transform: [{ translateY: readout.blur * 3 }] }]}>{number}</Text>
            )}
            <Text testID="loader-percentage" style={[styles.number, compact && styles.numberCompact, shortViewport && styles.numberShort, motionBlur]}>{number}</Text>
            <Text style={[styles.percentSign, (compact || shortViewport) && styles.percentSignCompact]}>%</Text>
          </View>
          <Text style={styles.status}>{readout.percent === 100 ? `Ready for a wider world` : `Preparing your perspective`}</Text>
          <View testID="loader-progress-track" style={[styles.progressTrack, shortViewport && styles.progressTrackShort]}>
            <View testID="loader-progress-fill" style={[styles.progressFill, { width: `${readout.percent}%` }]} />
          </View>
        </Animated.View>

        <View style={[styles.bottomRow, compact && styles.bottomRowCompact, shortViewport && styles.hidden]}>
          <Text style={styles.bottomText}>ONE WORLD. ENDLESS POSSIBILITY.</Text>
          <Text style={styles.bottomNumber}>{compact ? `GEOCORP / WORLDWIDE` : `GLOBAL THINKING / LOCAL IMPACT`}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { position: `absolute`, inset: 0, zIndex: 20, backgroundColor: `transparent` },
  hidden: { display: `none` },
  visuals: { position: `absolute`, inset: 0 },
  brandRow: { position: `absolute`, top: 36, left: 44, right: 44, flexDirection: `row`, justifyContent: `flex-end`, alignItems: `center` },
  brandRowCompact: { top: 28, left: 24, right: 24 },
  edition: { flexDirection: `row`, alignItems: `center`, gap: 8 },
  statusDot: { height: 4, width: 4, borderRadius: 2, backgroundColor: `#8ADDEC` },
  editionText: { fontFamily: `Manrope_500Medium`, color: `#8497A6`, fontSize: 8, letterSpacing: 1.6 },
  eyebrowRow: { position: `absolute`, left: 0, right: 0, flexDirection: `row`, justifyContent: `center`, alignItems: `center`, gap: 12 },
  eyebrowLine: { width: 18, height: 1, backgroundColor: `rgba(138,221,236,0.3)` },
  eyebrow: { fontFamily: `Manrope_600SemiBold`, fontSize: 8, lineHeight: 14, letterSpacing: 1.9, color: `#8DA6B7` },
  orbit: { position: `absolute`, borderWidth: 1, borderColor: `rgba(138,221,236,0.12)` },
  orbitTickTop: { position: `absolute`, top: -3, left: `50%`, width: 1, height: 5, backgroundColor: `rgba(138,221,236,0.35)` },
  orbitTickBottom: { position: `absolute`, bottom: -3, left: `50%`, width: 1, height: 5, backgroundColor: `rgba(138,221,236,0.35)` },
  orbitTickLeft: { position: `absolute`, left: -3, top: `50%`, width: 5, height: 1, backgroundColor: `rgba(138,221,236,0.35)` },
  orbitTickRight: { position: `absolute`, right: -3, top: `50%`, width: 5, height: 1, backgroundColor: `rgba(138,221,236,0.35)` },
  glass: { position: `absolute`, borderWidth: 1, borderColor: `rgba(169,226,234,0.24)`, borderTopColor: `rgba(219,250,255,0.4)`, borderBottomColor: `rgba(169,226,234,0.1)` },
  glint: { position: `absolute`, width: 3, height: 3, borderRadius: 2, backgroundColor: `rgba(227,251,255,0.7)` },
  readout: { position: `absolute`, left: 0, right: 0, alignItems: `center` },
  counterRow: { position: `relative`, flexDirection: `row`, alignItems: `flex-start` },
  number: { fontFamily: `Manrope_400Regular`, fontSize: 78, lineHeight: 94, letterSpacing: -5.5, fontVariant: [`tabular-nums`], color: `#F0F4F6` },
  numberCompact: { fontSize: 68, lineHeight: 82, letterSpacing: -4.5 },
  numberShort: { fontSize: 56, lineHeight: 68, letterSpacing: -4 },
  ghost: { position: `absolute`, left: 0, top: 0, color: `#C7F3FC` },
  percentSign: { fontFamily: `Manrope_400Regular`, fontSize: 19, lineHeight: 30, color: `#7F9AA9`, marginLeft: 9, marginTop: 17 },
  percentSignCompact: { fontSize: 16, marginTop: 14 },
  status: { fontFamily: `Manrope_400Regular`, fontSize: 11, lineHeight: 18, letterSpacing: 0.45, color: `#9AAEBD`, marginTop: 4 },
  progressTrack: { marginTop: 24, width: 112, height: 1, backgroundColor: `rgba(138,221,236,0.13)` },
  progressTrackShort: { marginTop: 16 },
  progressFill: { height: 1, backgroundColor: `#8ADDEC` },
  bottomRow: { position: `absolute`, left: 44, right: 44, bottom: 32, flexDirection: `row`, justifyContent: `space-between`, alignItems: `center` },
  bottomRowCompact: { left: 24, right: 24, bottom: 25 },
  bottomText: { fontFamily: `Manrope_500Medium`, fontSize: 8, lineHeight: 12, letterSpacing: 1.35, color: `#657D8D` },
  bottomNumber: { fontFamily: `Manrope_500Medium`, fontSize: 8, lineHeight: 12, letterSpacing: 1.1, color: `#536C7E` },
});
