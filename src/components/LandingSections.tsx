import { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCoordinates, formatServiceLocation, services, type Service } from '../data/services';

type LandingSectionProps = {
  compact: boolean;
  pageHeight: number;
  reducedMotion: boolean;
  progress: Animated.Value;
  start: number;
  onSelect: (service: Service) => void;
};

type LandingFooterProps = LandingSectionProps & {
  onBackToTop: () => void;
  onExplore: () => void;
  viewportHeight: number;
};

const palette = { ink: `#030812`, text: `#F0F4F6`, muted: `#9AAEBD`, cyan: `#8ADDEC` };
const approaches: Record<Service[`id`], { title: string; description: string }> = {
  studios: { title: `Make something matter.`, description: `Film, design, and creative direction. Ideas find their expression through Geo Studios.` },
  data: { title: `Find the useful signal.`, description: `Geo Data turns complex information into intelligence for a clearer next move.` },
  media: { title: `Look beyond the headline.`, description: `Geo Political Media explores the forces, people, and ideas shaping our world.` },
};

const sectionMotion = ({ progress, start, pageHeight, reducedMotion }: LandingSectionProps) => reducedMotion ? undefined : {
  transform: [{
    translateY: progress.interpolate({
      inputRange: [Math.max(0, start - pageHeight * 0.7), Math.max(1, start - pageHeight * 0.12)],
      outputRange: [28, 0],
      extrapolate: `clamp`,
    }),
  }],
};

const SectionLabel = ({ number, children }: { number: string; children: string }) => (
  <View pointerEvents="none" style={styles.sectionLabel}>
    <Text style={styles.sectionNumber}>{number}</Text>
    <View style={styles.labelRule} />
    <Text style={styles.eyebrow}>{children}</Text>
  </View>
);

const ApproachRow = ({ service, compact, onSelect }: Pick<LandingSectionProps, `compact` | `onSelect`> & { service: Service }) => {
  const [highlighted, setHighlighted] = useState(false);
  const approach = approaches[service.id];
  return (
    <Pressable
      testID={`approach-${service.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${approach.title} Explore ${service.name}`}
      onPress={() => onSelect(service)}
      onFocus={() => setHighlighted(true)}
      onBlur={() => setHighlighted(false)}
      onHoverIn={() => setHighlighted(true)}
      onHoverOut={() => setHighlighted(false)}
      style={({ pressed }) => [styles.approachRow, compact && styles.approachRowCompact, (highlighted || pressed) && styles.rowHighlighted]}
    >
      <View pointerEvents="none" style={styles.rowContent}>
        <View style={styles.rowHeading}>
          <Text style={[styles.rowEyebrow, { color: service.color }]}>{service.name.toUpperCase()}</Text>
          <Text style={[styles.arrow, highlighted && styles.highlightedText]}>↗</Text>
        </View>
        <Text style={[styles.approachTitle, compact && styles.approachTitleCompact, highlighted && styles.highlightedText]}>{approach.title}</Text>
        <Text style={styles.rowDescription}>{approach.description}</Text>
      </View>
    </Pressable>
  );
};

export const ApproachSection = (props: LandingSectionProps) => {
  const { compact, pageHeight, onSelect } = props;
  return (
    <View
      testID="approach-section"
      pointerEvents="box-none"
      style={[styles.section, {
        minHeight: pageHeight,
        paddingHorizontal: compact ? 24 : 56,
        paddingTop: pageHeight * (compact ? 0.34 : 0.15),
      }]}
    >
      <Animated.View pointerEvents="box-none" style={[styles.sectionContent, styles.rightContent, compact && styles.sectionContentCompact, sectionMotion(props)]}>
        <View pointerEvents="none">
          <SectionLabel number="02">OUR APPROACH</SectionLabel>
          <Text accessibilityRole="header" style={[styles.headline, compact && styles.headlineCompact]}>Different disciplines.{`\n`}Shared curiosity<Text style={styles.highlightedText}>.</Text></Text>
          <Text style={[styles.description, compact && styles.descriptionCompact]}>Creative work, useful intelligence, and independent storytelling. Each has its own focus. Together, they make room for a broader view.</Text>
        </View>
        <View pointerEvents="box-none" style={styles.editorialRows}>
          {services.map(service => <ApproachRow key={service.id} service={service} compact={compact} onSelect={onSelect} />)}
        </View>
      </Animated.View>
    </View>
  );
};

const LocationRow = ({ service, compact, onSelect }: Pick<LandingSectionProps, `compact` | `onSelect`> & { service: Service }) => {
  const [highlighted, setHighlighted] = useState(false);
  return (
    <Pressable
      testID={`network-${service.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Explore ${service.name} in ${formatServiceLocation(service)}`}
      onPress={() => onSelect(service)}
      onFocus={() => setHighlighted(true)}
      onBlur={() => setHighlighted(false)}
      onHoverIn={() => setHighlighted(true)}
      onHoverOut={() => setHighlighted(false)}
      style={({ pressed }) => [styles.locationRow, (highlighted || pressed) && styles.rowHighlighted]}
    >
      <Text style={[styles.locationIndex, { color: service.color }]}>{service.number}</Text>
      <View pointerEvents="none" style={styles.locationCopy}>
        <Text style={[styles.city, compact && styles.cityCompact, highlighted && styles.highlightedText]}>{service.city}</Text>
        <Text style={styles.locationService}>{service.name}</Text>
        <Text style={styles.coordinates}>{compact ? service.region : formatCoordinates(service.latitude, service.longitude)}</Text>
      </View>
      <Text style={[styles.locationArrow, highlighted && styles.highlightedText]}>↗</Text>
    </Pressable>
  );
};

export const NetworkSection = (props: LandingSectionProps) => {
  const { compact, pageHeight, onSelect } = props;
  return (
    <View
      testID="network-section"
      pointerEvents="box-none"
      style={[styles.section, {
        minHeight: pageHeight,
        paddingHorizontal: compact ? 24 : 56,
        paddingTop: pageHeight * (compact ? 0.34 : 0.18),
      }]}
    >
      <Animated.View pointerEvents="box-none" style={[styles.sectionContent, compact && styles.sectionContentCompact, sectionMotion(props)]}>
        <View pointerEvents="none">
          <SectionLabel number="03">PLACES & PERSPECTIVES</SectionLabel>
          <Text accessibilityRole="header" style={[styles.headline, compact && styles.headlineCompact]}>Rooted in place.{`\n`}Open to the world<Text style={styles.highlightedText}>.</Text></Text>
          <Text style={[styles.description, compact && styles.descriptionCompact]}>From Los Angeles to Atlanta to New York, every perspective begins somewhere. Explore the places behind our work.</Text>
        </View>
        <View pointerEvents="box-none" style={styles.locations}>
          {services.map(service => <LocationRow key={service.id} service={service} compact={compact} onSelect={onSelect} />)}
        </View>
        <View pointerEvents="none" style={styles.networkNote}>
          <View style={styles.smallDot} />
          <Text style={styles.networkNoteText}>THREE PERSPECTIVES. ONE SHARED WORLD.</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const FooterAction = ({ onPress, children, primary = false, testID }: { onPress: () => void; children: string; primary?: boolean; testID: string }) => {
  const [highlighted, setHighlighted] = useState(false);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      onFocus={() => setHighlighted(true)}
      onBlur={() => setHighlighted(false)}
      onHoverIn={() => setHighlighted(true)}
      onHoverOut={() => setHighlighted(false)}
      style={({ pressed }) => [styles.footerAction, primary && styles.primaryAction, (highlighted || pressed) && (primary ? styles.primaryActionHighlighted : styles.footerActionHighlighted)]}
    >
      <Text style={[styles.footerActionText, primary && styles.primaryActionText, highlighted && !primary && styles.highlightedText]}>{children}</Text>
      <Text style={[styles.footerActionArrow, primary && styles.primaryActionText, highlighted && !primary && styles.highlightedText]}>{primary ? `↗` : `↑`}</Text>
    </Pressable>
  );
};

const FooterDivision = ({ service, onSelect, compact }: Pick<LandingSectionProps, `onSelect` | `compact`> & { service: Service }) => {
  const [highlighted, setHighlighted] = useState(false);
  return (
    <Pressable
      testID={`footer-${service.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Explore ${service.name}, ${service.city}`}
      onPress={() => onSelect(service)}
      onFocus={() => setHighlighted(true)}
      onBlur={() => setHighlighted(false)}
      onHoverIn={() => setHighlighted(true)}
      onHoverOut={() => setHighlighted(false)}
      style={({ pressed }) => [styles.footerDivision, compact && styles.footerDivisionCompact, (highlighted || pressed) && styles.rowHighlighted]}
    >
      <View pointerEvents="none" style={styles.footerDivisionCopy}>
        <Text style={[styles.footerDivisionName, highlighted && styles.highlightedText]}>{service.name}</Text>
        <Text style={styles.footerDivisionCity}>{service.city}</Text>
      </View>
      <Text style={[styles.footerDivisionArrow, highlighted && styles.highlightedText]}>↗</Text>
    </Pressable>
  );
};

export const LandingFooter = ({ compact, pageHeight, viewportHeight, reducedMotion, progress, start, onSelect, onExplore, onBackToTop }: LandingFooterProps) => {
  const { width } = useWindowDimensions();
  const [footerHeight, setFooterHeight] = useState(viewportHeight);
  // As the footer enters, this foreground travels more slowly than the page.
  // Only its position changes, so keyboard users never encounter invisible links.
  const parallax = reducedMotion ? undefined : {
    transform: [{
      translateY: progress.interpolate({
        inputRange: [Math.max(0, start - viewportHeight), Math.max(1, start + footerHeight - viewportHeight)],
        outputRange: [-Math.min(110, viewportHeight * 0.14), 0],
        extrapolate: `clamp`,
      }),
    }],
  };
  const wordmarkSize = Math.min(186, (width - (compact ? 48 : 112)) / 4.5);

  return (
    <View testID="landing-footer" pointerEvents="box-none" onLayout={event => setFooterHeight(event.nativeEvent.layout.height)} style={[styles.footer, { minHeight: Math.max(viewportHeight, compact ? pageHeight : 0), paddingTop: viewportHeight * (compact ? 0.29 : 0.27), paddingHorizontal: compact ? 24 : 56 }]}>
      <Animated.View testID="footer-parallax-content" pointerEvents="box-none" style={[styles.footerForeground, parallax]}>
        <View pointerEvents="box-none" style={styles.footerInvitation}>
          <View pointerEvents="none" style={styles.footerHeadlineGroup}>
            <Text style={styles.footerEyebrow}>KEEP EXPLORING</Text>
            <Text accessibilityRole="header" style={[styles.footerHeadline, compact && styles.footerHeadlineCompact]}>A wider world{`\n`}starts here<Text style={styles.highlightedText}>.</Text></Text>
            <Text style={[styles.footerDescription, compact && styles.footerDescriptionCompact]}>Discover the creativity, intelligence, and{compact ? ` ` : `\n`}perspective that connect GeoCorp.</Text>
          </View>
          <FooterAction testID="footer-explore" primary onPress={onExplore}>Explore our divisions</FooterAction>
        </View>

        <View testID="footer-end-panel" pointerEvents="box-none" style={[styles.footerEndPanel, { minHeight: viewportHeight, paddingTop: viewportHeight * 0.31 }]}>
          <LinearGradient
            pointerEvents="none"
            colors={[`rgba(3,8,18,0)`, `rgba(3,8,18,0.8)`, palette.ink]}
            locations={[0, 0.5, 1]}
            style={[styles.footerShade, { top: viewportHeight * 0.27, left: compact ? -24 : -56, right: compact ? -24 : -56 }]}
          />
          <View pointerEvents="box-none" style={[styles.footerNavigation, compact && styles.footerNavigationCompact]}>
            {services.map(service => <FooterDivision key={service.id} service={service} compact={compact} onSelect={onSelect} />)}
          </View>

          <View pointerEvents="none" style={[styles.footerWordmarkWrap, compact && styles.footerWordmarkWrapCompact]}>
            <Text style={[styles.footerWordmark, { fontSize: wordmarkSize, lineHeight: wordmarkSize * 1.22, letterSpacing: -wordmarkSize * 0.065 }]}>geocorp<Text style={styles.footerWordmarkPeriod}>.</Text></Text>
          </View>

          <View pointerEvents="box-none" style={[styles.footerBottom, compact && styles.footerBottomCompact]}>
            <Text style={styles.copyright}>© {new Date().getFullYear()} GeoCorp</Text>
            {!compact && <Text style={styles.footerSignature}>INDEPENDENT THINKING. GLOBAL PERSPECTIVE.</Text>}
            <FooterAction testID="footer-back-to-top" onPress={onBackToTop}>Back to top</FooterAction>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { position: `relative`, paddingBottom: 64, backgroundColor: `transparent` },
  sectionContent: { width: `45%`, maxWidth: 580 },
  rightContent: { alignSelf: `flex-end` },
  sectionContentCompact: { width: `100%`, maxWidth: 500, alignSelf: `flex-start` },
  sectionLabel: { flexDirection: `row`, alignItems: `center`, gap: 12, marginBottom: 24 },
  sectionNumber: { color: palette.muted, fontFamily: `Manrope_500Medium`, fontSize: 10, letterSpacing: 1 },
  labelRule: { width: 28, height: 1, backgroundColor: `rgba(138,221,236,0.45)` },
  eyebrow: { color: palette.cyan, fontFamily: `Manrope_600SemiBold`, fontSize: 9, lineHeight: 15, letterSpacing: 1.8 },
  headline: { color: palette.text, fontFamily: `Manrope_500Medium`, fontSize: 45, lineHeight: 55, letterSpacing: -2.1 },
  headlineCompact: { fontSize: 31, lineHeight: 39, letterSpacing: -1.4 },
  highlightedText: { color: palette.cyan },
  description: { color: palette.muted, fontFamily: `Manrope_400Regular`, fontSize: 15, lineHeight: 25, marginTop: 20, maxWidth: 465 },
  descriptionCompact: { fontSize: 14, lineHeight: 23, marginTop: 16 },
  editorialRows: { marginTop: 30 },
  approachRow: { borderTopWidth: 1, borderTopColor: `rgba(139,171,191,0.23)`, paddingVertical: 18, paddingHorizontal: 2 },
  approachRowCompact: { paddingVertical: 17 },
  rowHighlighted: { borderTopColor: palette.cyan, backgroundColor: `rgba(138,221,236,0.045)` },
  rowContent: { width: `100%`, minWidth: 0 },
  rowHeading: { flexDirection: `row`, alignItems: `center`, justifyContent: `space-between`, gap: 12, marginBottom: 4 },
  rowEyebrow: { fontFamily: `Manrope_600SemiBold`, fontSize: 9, lineHeight: 15, letterSpacing: 1.2 },
  arrow: { color: palette.muted, fontSize: 19, lineHeight: 21 },
  approachTitle: { color: palette.text, fontFamily: `Manrope_500Medium`, fontSize: 21, lineHeight: 29, letterSpacing: -0.5 },
  approachTitleCompact: { fontSize: 19, lineHeight: 27 },
  rowDescription: { color: palette.muted, fontFamily: `Manrope_400Regular`, fontSize: 12, lineHeight: 20, marginTop: 6, maxWidth: 405 },
  locations: { marginTop: 32 },
  locationRow: { flexDirection: `row`, alignItems: `center`, gap: 17, paddingVertical: 20, paddingHorizontal: 2, borderTopWidth: 1, borderTopColor: `rgba(139,171,191,0.23)` },
  locationIndex: { alignSelf: `flex-start`, paddingTop: 7, width: 18, fontFamily: `Manrope_500Medium`, fontSize: 10, lineHeight: 16, letterSpacing: 1 },
  locationCopy: { flex: 1, minWidth: 0 },
  city: { color: palette.text, fontFamily: `Manrope_500Medium`, fontSize: 28, lineHeight: 36, letterSpacing: -0.9 },
  cityCompact: { fontSize: 25, lineHeight: 33 },
  locationService: { color: palette.muted, fontFamily: `Manrope_500Medium`, fontSize: 12, lineHeight: 20, marginTop: 3 },
  coordinates: { color: `#718798`, fontFamily: `Manrope_400Regular`, fontSize: 9, lineHeight: 16, letterSpacing: 0.65, marginTop: 4 },
  locationArrow: { color: palette.muted, fontSize: 24, lineHeight: 32, width: 22, textAlign: `right` },
  networkNote: { flexDirection: `row`, alignItems: `center`, gap: 10, marginTop: 18 },
  smallDot: { height: 4, width: 4, borderRadius: 2, backgroundColor: palette.cyan },
  networkNoteText: { flex: 1, color: `#718798`, fontFamily: `Manrope_500Medium`, fontSize: 8, lineHeight: 15, letterSpacing: 1.35 },
  footer: { position: `relative`, backgroundColor: `transparent` },
  footerShade: { position: `absolute`, left: 0, right: 0, bottom: 0 },
  footerForeground: { width: `100%` },
  footerInvitation: { alignItems: `center` },
  footerHeadlineGroup: { width: `100%`, alignItems: `center` },
  footerEyebrow: { color: palette.cyan, fontFamily: `Manrope_600SemiBold`, fontSize: 9, lineHeight: 15, letterSpacing: 2.3, textAlign: `center`, marginBottom: 16 },
  footerHeadline: { color: palette.text, fontFamily: `Manrope_500Medium`, fontSize: 64, lineHeight: 73, letterSpacing: -3.2, textAlign: `center` },
  footerHeadlineCompact: { fontSize: 39, lineHeight: 47, letterSpacing: -1.9 },
  footerDescription: { color: palette.muted, fontFamily: `Manrope_400Regular`, fontSize: 14, lineHeight: 23, textAlign: `center`, marginTop: 18, maxWidth: 390 },
  footerDescriptionCompact: { fontSize: 13, lineHeight: 22, maxWidth: 290 },
  footerAction: { minHeight: 44, flexDirection: `row`, alignItems: `center`, justifyContent: `center`, gap: 20, paddingHorizontal: 5, borderRadius: 3 },
  footerActionHighlighted: { backgroundColor: `rgba(138,221,236,0.08)` },
  primaryAction: { marginTop: 26, minHeight: 48, borderRadius: 2, borderWidth: 1, borderColor: palette.cyan, paddingHorizontal: 22, backgroundColor: palette.cyan },
  primaryActionHighlighted: { backgroundColor: `#BBEBF3`, borderColor: `#BBEBF3` },
  footerActionText: { color: palette.muted, fontFamily: `Manrope_600SemiBold`, fontSize: 11, lineHeight: 18 },
  footerActionArrow: { color: palette.muted, fontFamily: `Manrope_400Regular`, fontSize: 19, lineHeight: 24 },
  primaryActionText: { color: palette.ink },
  footerEndPanel: { position: `relative`, justifyContent: `space-between`, marginTop: 24, paddingBottom: 20 },
  footerNavigation: { flexDirection: `row`, gap: 36 },
  footerNavigationCompact: { flexDirection: `column`, gap: 0 },
  footerDivision: { flex: 1, minWidth: 0, minHeight: 79, flexDirection: `row`, alignItems: `center`, gap: 12, paddingHorizontal: 2, paddingVertical: 16, borderTopWidth: 1, borderTopColor: `rgba(139,171,191,0.23)` },
  footerDivisionCompact: { flex: 0, width: `100%`, minHeight: 76 },
  footerDivisionCopy: { flex: 1, minWidth: 0 },
  footerDivisionName: { color: palette.text, fontFamily: `Manrope_500Medium`, fontSize: 14, lineHeight: 21, letterSpacing: -0.2 },
  footerDivisionCity: { color: palette.muted, fontFamily: `Manrope_400Regular`, fontSize: 10, lineHeight: 17, marginTop: 3 },
  footerDivisionArrow: { color: palette.muted, fontSize: 21, lineHeight: 28 },
  footerWordmarkWrap: { alignItems: `center`, paddingTop: 18, paddingBottom: 10 },
  footerWordmarkWrapCompact: { paddingTop: 10, paddingBottom: 0 },
  footerWordmark: { color: `rgba(151,184,204,0.16)`, fontFamily: `Manrope_500Medium`, textAlign: `center` },
  footerWordmarkPeriod: { color: `rgba(138,221,236,0.37)` },
  footerBottom: { borderTopWidth: 1, borderTopColor: `rgba(139,171,191,0.17)`, paddingTop: 10, flexDirection: `row`, alignItems: `center`, justifyContent: `space-between`, gap: 20 },
  footerBottomCompact: { gap: 10 },
  copyright: { color: `#718798`, fontFamily: `Manrope_400Regular`, fontSize: 10, lineHeight: 18 },
  footerSignature: { color: `#718798`, fontFamily: `Manrope_500Medium`, fontSize: 8, lineHeight: 15, letterSpacing: 1.15 },
});
