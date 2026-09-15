import { Image, StyleSheet, Text, View } from 'react-native';

export type BrandFrame = { x: number; y: number; width: number; height: number };

const logo = require(`../../assets/brand/01-core-earth.png`);

// The loader and header share the exact asset and type metrics for the handoff.
export const GeoBrand = ({ onLoadEnd }: { onLoadEnd?: () => void }) => (
  <View pointerEvents="none" style={styles.brand}>
    <Image source={logo} style={styles.logo} onLoadEnd={onLoadEnd} accessibilityIgnoresInvertColors />
    <Text style={styles.wordmark}>geocorp<Text style={styles.period}>.</Text></Text>
  </View>
);

const styles = StyleSheet.create({
  brand: { gap: 8, flexDirection: `row`, alignItems: `center` },
  logo: { width: 44, height: 44, borderRadius: 22 },
  wordmark: { fontSize: 28, lineHeight: 36, letterSpacing: -1.3, color: `#F0F4F6`, fontFamily: `Manrope_800ExtraBold` },
  period: { color: `#8ADDEC` },
});
