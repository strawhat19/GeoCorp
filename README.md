# GeoCorp

An Expo app for iOS, Android, and the web. The space hero places Geo Studios, Geo Data, and Geo Political Media in one responsive row above an oversized rotating Earth, with a layered star field, a small distant moon, and a transparent header. The space backdrop is rendered procedurally without additional image downloads. A liquid-filled Earth and a motion-blurred percentage counter introduce the page; that same Earth grows into the rotating hero globe. Select a division to descend from orbit into a real 3D map of Los Angeles, Atlanta in Georgia, or New York. The globe hands off after a short flight and holds at regional scale while map tiles load, keeping Earth imagery sharp. Drag, pinch, or scroll to explore streets and buildings, then return to orbit. The app uses the approved `01-core-earth.png` logo.

## Run The App

Use Node 22.13+ or Node 24.3+ (the machine's default Node 22.9 is below Expo SDK 57's supported range).

```sh
npm install
npm run web
```

For a phone, run `npm start` and scan the QR code with an Expo Go version compatible with SDK 57 on the same network. `npm run android` and `npm run ios` launch configured emulators; iOS Simulator requires macOS. No API keys or backend are required. The city maps require internet access. Native store signing and store publication are separate from this source project.

```sh
npm run typecheck
npm run export:web
```

Web exports go to `dist/`. The app uses `web/` for web-specific public files, keeping its logo concepts in `public/` out of the application download. The media production archive belongs to the sibling GeoPoliticalMedia repository. Service coordinates and copy live in `src/data/services.ts`. The shared globe uses React Three Fiber with Expo GL on native and WebGL on web, 4K local textures, cloud and atmosphere layers, and eased spherical camera interpolation. System reduced-motion settings are respected.

Earth textures are by Solar System Scope / INOVE, CC BY 4.0, resized and merged by Three.js contributors. [Texture sources and license](assets/earth/SOURCES.md).

The launch counter follows resource milestones: fonts (20%), three Earth textures (70%), and the first rendered textured frame (10%). It eases toward reported readiness and reaches 100% only when the page and logo can open. The persistent sphere renders as glass before the textures arrive, with a level, gently rippling liquid surface that reveals the continents from below. After a short 100% hold, its camera moves continuously into the landing composition; the canvas, sphere, and orientation are preserved. The GeoCorp logo and wordmark travel from above the loading Earth into the measured header position, retaining identical artwork and typography through the handoff. Short viewports and reduced motion keep the logo at its header position. Shared branding lives in `src/components/GeoBrand.tsx`, loader UI in `src/components/WorldLoader.tsx`, progress/layout helpers in `src/config/launchMotion.ts`, and fill shaders in `src/components/earthShaders.ts`. Reduced motion removes blur, waves, and the camera zoom, with a short content fade. Loading pauses when the app is inactive; a failed globe still releases the page to its retry and destination controls.

Scroll down or use “Explore our perspectives” to begin a continuous Earth journey through the landing page. The same pinned canvas moves the planet to the right beside the perspectives, to the left beside Our Approach, and back to the right beside Places & Perspectives. It then grows into a cropped horizon along the top of the screen above the closing invitation and parallax footer. The footer includes division navigation, a large GeoCorp wordmark, and Back to top. Section heights are measured so the journey stays aligned after responsive reflow and ends at the actual scroll bottom. Copy and links live in `src/components/LandingSections.tsx`; section progress is calculated in `src/config/landingMotion.ts`.

A damped camera transition smoothly changes the globe's apparent size and position. Movement accelerates rotation, then it settles back to its idle orbit. On mobile, the smaller globe sits above the supporting content. Earth rotates automatically, pauses while dragging or inspecting a marker, and resumes 0.6 seconds after a drag is released. Three pulsing markers track Los Angeles, Atlanta, and New York on the Earth; tap a marker or a division link to open its city view. Markers on the far side of the Earth are hidden. Reduced motion keeps the markers still and disables automatic rotation, smooth scrolling, parallax, and animated camera easing.

City dots show the same service detail cards as globe markers on hover or keyboard focus. Activate a city dot to keep its card open; close it with “Back to the city,” Escape, or by interacting with the map. Shared descriptions, images, and dot colors can be customized in `src/config/globeMarkers.ts`.

City maps use [MapLibre GL JS](https://maplibre.org/) with [OpenFreeMap](https://openfreemap.org/) and OpenStreetMap data. The city map document is shared between web iframe and native WebView. Buildings use actual mapped footprints and available height data; they are not photogrammetry. Keep the built-in attribution visible. The globe pauses rendering once the map is visible, and map load failures expose a retry action.

## Customize Globe Markers

Edit `src/config/globeMarkers.ts`. `GLOBE_PULSE_COLOR` controls the pulsing rings and glow for all three dots. The dot cores retain their service colors. An individual service can override its pulse color, tooltip description, or add an image:

```ts
export const GLOBE_PULSE_COLOR = `#8ADDEC`;

export const serviceMarkerContent: Record<ServiceId, ServiceMarkerContent> = {
  studios: {
    pulseColor: `#E3B779`, // Optional; omit to use the global color.
    description: `Your custom introduction to Geo Studios.`,
    image: require('../../assets/brand/01-core-earth.png'),
    imageAlt: `GeoCorp Earth logo`,
  },
  data: {},
  media: {},
};
```

For your own photograph, replace the example image with a local asset or `{ uri: 'https://your-domain.com/image.jpg' }`. Omit `image` for a text-only card. Tooltips always identify the service and location, with its description and disciplines from `src/data/services.ts` unless customized. Hover or keyboard focus reveals the card; the Earth holds still while you read it. Clicking a dot still opens its city directly. Reduced motion shows the card without animated movement.

## Separate Projects

GeoCorp is the parent company and owns this rotating-globe website and iOS/Android app. Its source was moved intact from `GeoPoliticalMedia` at commit `2412f42` on September 15, 2026. This repository has its own Git history and keeps the existing GeoCorp Sites project.

GeoPoliticalMedia is the independent child media website in the sibling `../GeoPoliticalMedia/` repository. Its homepage, media production archive, and G/red-orbit branding stay there. No GeoPoliticalMedia files are needed to build or run this app.

- [GeoCorp website](https://geocorp-earth.rakib987419435.chatgpt.site)
- [GeoPoliticalMedia website](https://geopoliticalmedia.rakib987419435.chatgpt.site)
- [Portfolio overview](docs/overview.md) · [Portfolio channel ideas](docs/ideas.md)
- [GeoCorp logo concepts](public/assets/concepts/geocorp/README.md)

The Expo app exports from `web/`, not `public/`. Concept images are retained as a design archive, separate from the app's deployed assets.
