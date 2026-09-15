import type { ImageSourcePropType } from 'react-native';
import type { ServiceId } from '../data/services';

// Change this one value to recolor the rings and glow on every globe and city dot.
export const GLOBE_PULSE_COLOR = `#8ADDEC`;

export type ServiceMarkerContent = {
  // Optional override for this service; otherwise GLOBE_PULSE_COLOR is used.
  pulseColor?: string;
  // Shared globe/city tooltip copy; otherwise the service's description is shown.
  description?: string;
  // Local require('../../assets/...') or { uri: 'https://...' }.
  image?: ImageSourcePropType;
  imageAlt?: string;
};

// Customize a service here. Empty entries use its existing name, city,
// description, and disciplines from src/data/services.ts, with no image.
export const serviceMarkerContent: Record<ServiceId, ServiceMarkerContent> = {
  studios: {},
  data: {},
  media: {},
};
