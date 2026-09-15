import { WebView } from 'react-native-webview';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { cityDocument, type CityViewProps } from './cityDocument';
import { CityMarkerPreview, type CityMarkerPreviewHandle } from './CityMarkerPreview';
import { formatServiceLocation } from '../data/services';

export const CityView = ({ service, reveal, reducedMotion, onReady, onError }: CityViewProps) => {
  const view = useRef<WebView>(null);
  const preview = useRef<CityMarkerPreviewHandle>(null);
  const html = useMemo(() => cityDocument(service, reducedMotion), [service, reducedMotion]);
  const updatePreview = useCallback((expanded: boolean, restoreFocus = false) => {
    view.current?.injectJavaScript(`window.setCityPreviewState?.(${expanded},${restoreFocus});true;`);
  }, []);
  useEffect(() => { if (reveal) view.current?.injectJavaScript(`window.revealCity?.();true;`); }, [reveal]);
  return <View style={{ flex: 1 }}><WebView
    ref={view}
    accessibilityLabel={`Explore ${formatServiceLocation(service)} in 3D`}
    source={{ html }}
    javaScriptEnabled
    domStorageEnabled
    scrollEnabled={false}
    originWhitelist={[`*`]}
    androidLayerType="hardware"
    onError={onError}
    onMessage={event => {
      try {
        const message = JSON.parse(event.nativeEvent.data);
        if (message?.source !== `geocorp-city` || (message.id != null && message.id !== service.id)) return;
        if (message.type === `ready`) {
          onReady();
          if (reveal) view.current?.injectJavaScript(`window.revealCity?.();true;`);
        }
        if (message.type === `error`) onError();
        preview.current?.receive(message);
      } catch { onError(); }
    }}
    style={{ flex: 1, backgroundColor: `#06101b` }}
  /><CityMarkerPreview ref={preview} service={service} enabled={reveal} reducedMotion={reducedMotion} onVisibilityChange={updatePreview} /></View>;
};
