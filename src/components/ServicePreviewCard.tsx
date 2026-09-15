import { useEffect, useState, type ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { serviceMarkerContent } from '../config/globeMarkers';
import { formatServiceLocation, type Service } from '../data/services';

type ServicePreviewCardProps = {
  service: Service;
  maxHeight: number;
  descriptionID?: string;
  children?: ReactNode;
};

const PreviewImage = ({ source, alt }: { source: ImageSourcePropType; alt: string }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);
  if (failed) return null;
  return <Image source={source} accessibilityLabel={alt} resizeMode="cover" onError={() => setFailed(true)} style={styles.previewImage} />;
};

/** Shared service details; callers own positioning, dismissal, and actions. */
export const ServicePreviewCard = ({ service, maxHeight, descriptionID, children }: ServicePreviewCardProps) => {
  const content = serviceMarkerContent[service.id];

  return (
    <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={{ maxHeight }}>
      {content.image && <PreviewImage key={service.id} source={content.image} alt={content.imageAlt ?? `${service.name} in ${formatServiceLocation(service)}`} />}
      <View style={styles.previewBody}>
        <View style={styles.previewEyebrow}>
          <View style={[styles.serviceSwatch, { backgroundColor: service.color }]} />
          <Text style={styles.previewKicker}>SERVICE {service.number}</Text>
        </View>
        <Text style={styles.previewTitle}>{service.name}</Text>
        <Text style={styles.previewLocation}>{service.city} <Text style={styles.locationSeparator}>/</Text> {service.region}</Text>
        <Text nativeID={descriptionID} style={styles.previewDescription}>{content.description ?? service.description}</Text>
        <View style={styles.disciplines}>
          {service.disciplines.map(discipline => <Text key={discipline} style={styles.discipline}>{discipline}</Text>)}
        </View>
        {children}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  preview: { cursor: `auto`, borderRadius: 20, overflow: `hidden`, borderWidth: 1, borderColor: `rgba(186,221,239,0.24)`, backgroundColor: `rgba(8,21,33,0.98)`, boxShadow: `0 20px 60px rgba(0,0,0,0.35)` },
  previewImage: { width: `100%`, height: 138, backgroundColor: `#142D40` },
  previewBody: { padding: 20 },
  previewEyebrow: { flexDirection: `row`, alignItems: `center`, gap: 7, marginBottom: 9 },
  serviceSwatch: { width: 5, height: 5, borderRadius: 3 },
  previewKicker: { color: `#94ADBC`, fontFamily: `Manrope_600SemiBold`, fontSize: 9, lineHeight: 14, letterSpacing: 1.9 },
  previewTitle: { color: `#F1F7FA`, fontFamily: `Manrope_600SemiBold`, fontSize: 21, lineHeight: 28, letterSpacing: -0.5 },
  previewLocation: { color: `#B5CBD7`, fontFamily: `Manrope_500Medium`, fontSize: 11, lineHeight: 18, marginTop: 4 },
  locationSeparator: { color: `#597B90` },
  previewDescription: { color: `#B8C9D4`, fontFamily: `Manrope_400Regular`, fontSize: 12, lineHeight: 19, marginTop: 15 },
  disciplines: { flexDirection: `row`, flexWrap: `wrap`, gap: 6, marginTop: 14 },
  discipline: { color: `#C0D4DF`, fontFamily: `Manrope_500Medium`, fontSize: 9, lineHeight: 14, borderWidth: 1, borderColor: `rgba(158,197,218,0.17)`, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
});

export const servicePreviewCardStyle = styles.preview;
