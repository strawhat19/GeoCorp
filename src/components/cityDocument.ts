import type { Service } from '../data/services';
import { GLOBE_PULSE_COLOR, serviceMarkerContent } from '../config/globeMarkers';

export type CityViewProps = {
  reveal: boolean;
  service: Service;
  reducedMotion: boolean;
  onReady: () => void;
  onError: () => void;
};

export const cityDocument = (service: Service, reducedMotion: boolean) => {
  const settings = JSON.stringify({ id: service.id, name: service.name, city: service.city, latitude: service.latitude, longitude: service.longitude, pulseColor: serviceMarkerContent[service.id].pulseColor ?? GLOBE_PULSE_COLOR, reducedMotion }).replace(/</g, `\\u003c`);
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css"><style>
    html,body,#city-map{margin:0;width:100%;height:100%;overflow:hidden;background:#06101b}
    .maplibregl-ctrl-attrib{font:10px/17px system-ui;background:rgba(3,8,18,.75)!important;color:#afc5d3!important}
    .maplibregl-ctrl-attrib a{color:#c4d9e7!important}.maplibregl-ctrl-bottom-right{bottom:2px;right:6px}
    .city-marker{width:44px;height:44px;padding:0;border:1px solid transparent;border-radius:50%;background:transparent;display:grid;place-items:center;cursor:pointer;touch-action:manipulation}
    .city-marker::before{content:'';width:10px;height:10px;border:2px solid white;border-radius:50%;background:var(--pulse-color);box-shadow:0 0 0 8px color-mix(in srgb,var(--pulse-color) 15%,transparent),0 0 35px color-mix(in srgb,var(--pulse-color) 50%,transparent)}
    .city-marker:hover,.city-marker:focus-visible,.city-marker[aria-expanded=true]{outline:none;border-color:rgba(221,243,255,.6);background:rgba(9,27,40,.28)}
    #city-map:focus-visible{outline:2px solid #8addec;outline-offset:-4px}
  </style></head><body><div id="city-map" tabindex="0" role="region" aria-label="Interactive 3D city map"></div><script src="https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js" onerror="parent.postMessage({source:'geocorp-city',type:'error'},'*');window.ReactNativeWebView?.postMessage(JSON.stringify({source:'geocorp-city',type:'error'}))"></script><script>
    const settings=${settings};
    let map,marker,loaded=false,revealed=false,failed=false,readySent=false,suppressFocus=false;
    const send=(type,detail={})=>{const message={source:'geocorp-city',type,id:settings.id,...detail};window.parent.postMessage(message,'*');window.ReactNativeWebView?.postMessage(JSON.stringify(message));};
    const fail=()=>{if(!failed){failed=true;send('error');}};
    const reveal=()=>{if(!map||!loaded||revealed)return;revealed=true;map.flyTo({center:[settings.longitude,settings.latitude],zoom:15.7,pitch:60,bearing:settings.id==='media'?-24:24,padding:{top:Math.min(innerHeight*.34,290),bottom:70,left:0,right:0},duration:settings.reducedMotion?0:3100,essential:!settings.reducedMotion});};
    window.setCityPreviewState=(expanded,restoreFocus=false)=>{if(!marker)return;marker.setAttribute('aria-expanded',String(expanded));if(restoreFocus){suppressFocus=true;marker.focus({preventScroll:true});suppressFocus=false;}};
    window.addEventListener('message',(event)=>{if(event.source!==parent)return;if(event.data?.type==='reveal')reveal();if(event.data?.type==='preview-state')window.setCityPreviewState(event.data.expanded===true,event.data.restoreFocus===true);});
    window.revealCity=reveal;
    const timeout=setTimeout(()=>{if(!readySent)fail();},25000);
    try {
      map=new maplibregl.Map({container:'city-map',style:'https://tiles.openfreemap.org/styles/liberty',center:[settings.longitude,settings.latitude],zoom:10.5,pitch:0,bearing:0,maxPitch:70,attributionControl:{compact:false},canvasContextAttributes:{antialias:true},fadeDuration:settings.reducedMotion?0:300});
      map.on('load',()=>{
        loaded=true;
        for(const layer of map.getStyle().layers){
          if(layer.type==='background')map.setPaintProperty(layer.id,'background-color','#0a1722');
          if(layer.type==='fill')map.setPaintProperty(layer.id,'fill-color',layer.id.includes('water')?'#06101b':layer.id.includes('park')||layer.id.includes('landcover')?'#142a31':'#162735');
          if(layer.type==='line')map.setPaintProperty(layer.id,'line-color',layer.id.includes('water')?'#20485a':layer.id.includes('motorway')||layer.id.includes('primary')?'#7d919b':'#354e60');
          if(layer.type==='symbol')map.setLayoutProperty(layer.id,'visibility','none');
        }
        if(map.getLayer('building-3d')){
          map.setFilter('building-3d',['!=',['get','hide_3d'],true]);
          map.setPaintProperty('building-3d','fill-extrusion-color','#648ca3');
          map.setPaintProperty('building-3d','fill-extrusion-height',['coalesce',['get','render_height'],3]);
          map.setPaintProperty('building-3d','fill-extrusion-base',['coalesce',['get','render_min_height'],0]);
          map.setPaintProperty('building-3d','fill-extrusion-opacity',0.95);
        }
        map.setLight({anchor:'viewport',color:'#d4eeff',intensity:.55,position:[1.15,210,45]});
        marker=document.createElement('button');marker.type='button';marker.className='city-marker';marker.dataset.testid='city-marker-'+settings.id;marker.style.setProperty('--pulse-color',settings.pulseColor);
        marker.setAttribute('aria-label',settings.name+' in '+settings.city+'. Show service details');marker.setAttribute('aria-expanded','false');
        const preview=(interaction)=>{const bounds=marker.getBoundingClientRect();send('preview',{interaction,x:bounds.left+bounds.width/2,y:bounds.top+bounds.height/2});};
        marker.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch'&&!event.buttons)preview('hover');});
        marker.addEventListener('pointerleave',()=>send('preview-leave',{interaction:'hover'}));
        marker.addEventListener('focus',()=>{if(!suppressFocus)preview('focus');});
        marker.addEventListener('blur',()=>send('preview-leave',{interaction:'focus'}));
        marker.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();preview('press');});
        window.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();send('preview-dismiss');}});
        map.on('movestart',()=>send('preview-dismiss'));
        map.on('click',()=>send('preview-dismiss'));
        new maplibregl.Marker({element:marker}).setLngLat([settings.longitude,settings.latitude]).addTo(map);
        map.once('idle',()=>{readySent=true;clearTimeout(timeout);send('ready');});
        map.on('moveend',()=>{if(revealed){document.body.dataset.cityReady='true';document.body.dataset.cityId=settings.id;send('arrived');}});
      });
      map.on('webglcontextlost',fail);
      map.on('error',event=>{if(!loaded&&event.error?.message?.includes('style'))fail();});
      window.addEventListener('beforeunload',()=>{clearTimeout(timeout);map.remove();});
    } catch(error){fail();}
  </script></body></html>`;
};
