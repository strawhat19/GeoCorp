import { useCallback, useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { cityDocument, type CityViewProps } from './cityDocument';
import { CityMarkerPreview, type CityMarkerPreviewHandle } from './CityMarkerPreview';
import { formatServiceLocation } from '../data/services';

export const CityView = ({ service, reveal, reducedMotion, onReady, onError }: CityViewProps) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const preview = useRef<CityMarkerPreviewHandle>(null);
  const html = useMemo(() => cityDocument(service, reducedMotion), [service, reducedMotion]);
  const updatePreview = useCallback((expanded: boolean, restoreFocus = false) => {
    frame.current?.contentWindow?.postMessage({ type: `preview-state`, expanded, restoreFocus }, `*`);
  }, []);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.source !== `geocorp-city` || (event.data.id != null && event.data.id !== service.id)) return;
      if (event.data.type === `ready`) {
        onReady();
        if (reveal) frame.current?.contentWindow?.postMessage({ type: `reveal` }, `*`);
      }
      if (event.data.type === `error`) onError();
      preview.current?.receive(event.data);
    };
    window.addEventListener(`message`, receive);
    return () => window.removeEventListener(`message`, receive);
  }, [onReady, onError, reveal, service.id]);
  useEffect(() => { if (reveal) frame.current?.contentWindow?.postMessage({ type: `reveal` }, `*`); }, [reveal]);
  return <View style={{ flex: 1 }}>
    <iframe ref={frame} srcDoc={html} tabIndex={reveal ? 0 : -1} aria-hidden={!reveal} title={`Explore ${formatServiceLocation(service)} in 3D`} sandbox="allow-scripts allow-same-origin allow-popups" style={{ width: `100%`, height: `100%`, border: 0, background: `#06101b` }} />
    <CityMarkerPreview ref={preview} service={service} enabled={reveal} reducedMotion={reducedMotion} onVisibilityChange={updatePreview} />
  </View>;
};
