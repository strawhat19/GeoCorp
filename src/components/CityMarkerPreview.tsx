import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlobeTooltipPortal } from './GlobeTooltipPortal';
import { ServicePreviewCard, servicePreviewCardStyle } from './ServicePreviewCard';
import type { Service } from '../data/services';

export type CityPreviewMessage = {
  type: string;
  interaction?: `hover` | `focus` | `press`;
  x?: number;
  y?: number;
};

export type CityMarkerPreviewHandle = { receive: (message: CityPreviewMessage) => void };
type Props = {
  service: Service;
  enabled: boolean;
  reducedMotion: boolean;
  onVisibilityChange: (expanded: boolean, restoreFocus?: boolean) => void;
};

// The card lives above the page chrome; the map supplies coordinates from its
// iframe/WebView so city and globe markers can use the exact same card content.
export const CityMarkerPreview = forwardRef<CityMarkerPreviewHandle, Props>(
  ({ service, enabled, reducedMotion, onVisibilityChange }, ref) => {
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const origin = useRef<View>(null);
    const point = useRef({ x: 0, y: 0 });
    const [position, setPosition] = useState({ x: 12, y: 12 });
    const [cardHeight, setCardHeight] = useState(330);
    const [visible, setVisible] = useState(false);
    const [closeHovered, setCloseHovered] = useState(false);
    const [closeFocused, setCloseFocused] = useState(false);
    const open = useRef(false);
    const ownership = useRef({ markerHovered: false, markerFocused: false, cardHovered: false, cardFocused: false, actionHovered: false, pinned: false });
    const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const opacity = useRef(new Animated.Value(0)).current;
    const cardWidth = Math.min(336, width - 24);
    const maxHeight = Math.max(1, height - insets.top - insets.bottom - 24);

    const clearExit = useCallback(() => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }, []);

    const dismiss = useCallback((restoreFocus = false) => {
      clearExit();
      ownership.current = { markerHovered: false, markerFocused: false, cardHovered: false, cardFocused: false, actionHovered: false, pinned: false };
      setCloseHovered(false);
      setCloseFocused(false);
      open.current = false;
      onVisibilityChange(false, restoreFocus);
      opacity.stopAnimation();
      Animated.timing(opacity, { toValue: 0, duration: reducedMotion ? 0 : 160, useNativeDriver: Platform.OS !== `web`, isInteraction: false }).start(({ finished }) => {
        if (finished && !open.current) setVisible(false);
      });
    }, [clearExit, onVisibilityChange, opacity, reducedMotion]);

    const scheduleExit = useCallback(() => {
      clearExit();
      if (Object.values(ownership.current).some(Boolean)) return;
      exitTimer.current = setTimeout(() => {
        if (!Object.values(ownership.current).some(Boolean)) dismiss();
      }, 300);
    }, [clearExit, dismiss]);

    const place = useCallback(() => {
      origin.current?.measureInWindow((x, y) => {
        if (!open.current) return;
        const anchor = { x: point.current.x + x, y: point.current.y + y };
        const panelHeight = Math.min(cardHeight, maxHeight);
        const top = insets.top + 12;
        const bottom = height - insets.bottom - 12;
        const above = anchor.y - 38 - panelHeight;
        const below = anchor.y + 38;
        const preferred = above >= top || anchor.y - top >= bottom - anchor.y ? above : below;
        setPosition({
          x: Math.max(12, Math.min(anchor.x - cardWidth / 2, width - cardWidth - 12)),
          y: Math.max(top, Math.min(preferred, bottom - panelHeight)),
        });
      });
    }, [cardHeight, cardWidth, height, insets.bottom, insets.top, maxHeight, width]);

    useImperativeHandle(ref, () => ({
      receive(message) {
        if (!enabled) return;
        if (message.type === `preview-dismiss`) { dismiss(); return; }
        if (message.type === `preview-leave`) {
          if (message.interaction === `hover`) ownership.current.markerHovered = false;
          if (message.interaction === `focus`) ownership.current.markerFocused = false;
          scheduleExit();
          return;
        }
        if (message.type !== `preview` || typeof message.x !== `number` || typeof message.y !== `number`
          || !Number.isFinite(message.x) || !Number.isFinite(message.y)) return;
        clearExit();
        if (message.interaction === `hover`) ownership.current.markerHovered = true;
        if (message.interaction === `focus`) ownership.current.markerFocused = true;
        if (message.interaction === `press`) ownership.current.pinned = true;
        point.current = { x: message.x, y: message.y };
        open.current = true;
        setVisible(true);
        place();
        onVisibilityChange(true);
        opacity.stopAnimation();
        Animated.timing(opacity, { toValue: 1, duration: reducedMotion ? 0 : 190, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== `web`, isInteraction: false }).start();
      },
    }), [clearExit, dismiss, enabled, onVisibilityChange, opacity, place, reducedMotion, scheduleExit]);

    useEffect(() => { if (!enabled) dismiss(); }, [dismiss, enabled]);
    useEffect(() => { if (visible) place(); }, [place, visible]);
    useEffect(() => () => { clearExit(); opacity.stopAnimation(); }, [clearExit, opacity]);
    useEffect(() => {
      if (Platform.OS !== `web` || !visible) return;
      const escape = (event: KeyboardEvent) => { if (event.key === `Escape`) { event.preventDefault(); event.stopPropagation(); dismiss(true); } };
      document.addEventListener(`keydown`, escape, true);
      return () => document.removeEventListener(`keydown`, escape, true);
    }, [dismiss, visible]);

    return <>
      <View ref={origin} collapsable={false} pointerEvents="none" style={StyleSheet.absoluteFill} />
      {visible && enabled && <GlobeTooltipPortal>
        <Animated.View style={[styles.position, { left: position.x, top: position.y, width: cardWidth, opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: reducedMotion ? [0, 0] : [8, 0] }) }] }]}>
          <Pressable
            testID="city-service-preview"
            accessible={false}
            focusable={false}
            onHoverIn={() => { ownership.current.cardHovered = true; clearExit(); }}
            onHoverOut={() => { ownership.current.cardHovered = false; scheduleExit(); }}
            onFocus={() => { ownership.current.cardFocused = true; clearExit(); }}
            onBlur={() => { ownership.current.cardFocused = false; scheduleExit(); }}
            onLayout={event => setCardHeight(event.nativeEvent.layout.height)}
            style={[servicePreviewCardStyle, { maxHeight }]}
          >
            <ServicePreviewCard service={service} maxHeight={maxHeight} descriptionID={`city-preview-description-${service.id}`}>
              <Pressable testID="city-preview-close" accessibilityRole="button" accessibilityLabel={`Close ${service.name} details`}
                onHoverIn={() => { setCloseHovered(true); ownership.current.actionHovered = true; clearExit(); }}
                onHoverOut={() => { setCloseHovered(false); ownership.current.actionHovered = false; scheduleExit(); }}
                onFocus={() => { setCloseFocused(true); ownership.current.cardFocused = true; clearExit(); }}
                onBlur={() => { setCloseFocused(false); ownership.current.cardFocused = false; scheduleExit(); }}
                onPress={() => dismiss(true)} style={({ pressed }) => [styles.close, (closeHovered || closeFocused) && styles.closeHighlighted, pressed && styles.closePressed]}>
                <Text style={styles.closeText}>Back to the city</Text><Text style={styles.closeIcon}>×</Text>
              </Pressable>
            </ServicePreviewCard>
          </Pressable>
        </Animated.View>
      </GlobeTooltipPortal>}
    </>;
  },
);
CityMarkerPreview.displayName = `CityMarkerPreview`;

const styles = StyleSheet.create({
  position: { position: `absolute` },
  close: { minHeight: 43, flexDirection: `row`, justifyContent: `space-between`, alignItems: `center`, borderRadius: 10, borderWidth: 1, borderColor: `rgba(157,218,242,0.25)`, backgroundColor: `rgba(131,204,234,0.08)`, paddingHorizontal: 12, marginTop: 18 },
  closeHighlighted: { backgroundColor: `rgba(131,204,234,0.18)`, borderColor: `rgba(157,218,242,0.65)` },
  closePressed: { opacity: 0.72 },
  closeText: { color: `#D6EEF8`, fontFamily: `Manrope_600SemiBold`, fontSize: 11, lineHeight: 18 },
  closeIcon: { color: `#B2DDED`, fontSize: 22, lineHeight: 25 },
});
