export type LaunchMotion = { fill: number; reveal: number };

export const getLoaderEarthLayout = (width: number, viewportHeight: number) => ({
  diameter: width < 700 ? 150 : 184,
  centerY: viewportHeight * 0.4,
});

// Resource milestones, not elapsed time: 20% typography, 70% Earth textures,
// and the final 10% only after the configured textures have actually rendered.
export const getLaunchProgress = (fontsReady: boolean, textureProgress: number, earthRendered: boolean, earthFailed: boolean) =>
  (fontsReady ? 0.2 : 0) + (earthFailed ? 0.8 : Math.max(0, Math.min(1, textureProgress)) * 0.7 + (earthRendered ? 0.1 : 0));
