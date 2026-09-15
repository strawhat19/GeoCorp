// Measured section stops keep the journey aligned with larger text and short
// viewports, including the actual bottom of the page.
export const getJourneyProgress = (scrollY: number, stops: readonly number[]) => {
  const y = Math.max(0, scrollY);
  for (let index = 1; index < stops.length; index += 1) {
    if (y <= stops[index]) {
      const distance = Math.max(1, stops[index] - stops[index - 1]);
      return index - 1 + Math.min(1, Math.max(0, (y - stops[index - 1]) / distance));
    }
  }
  return stops.length - 1;
};
