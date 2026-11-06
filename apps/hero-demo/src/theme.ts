import { loadFont as loadPlex } from '@remotion/google-fonts/IBMPlexSans';
import { loadFont as loadPlexCondensed } from '@remotion/google-fonts/IBMPlexSansCondensed';

/** Logical size of the stage. It is rendered at `--scale` for the final pixel size. */
export const WIDTH = 600;
export const HEIGHT = 580;

/** Chrome bands: the top bar and the step bar bound the area scenes draw in. */
export const TOP_BAR = 40;
export const STEP_BAR = 40;

export const { fontFamily: sans } = loadPlex('normal', {
  weights: ['400', '500', '600', '700'],
  subsets: ['latin'],
});

/** Stands in for the site's `.display` face (Plex Sans at 85% width). */
export const { fontFamily: display } = loadPlexCondensed('normal', {
  weights: ['600'],
  subsets: ['latin'],
});

/** `font-resume`: the export template stack, used only for CV content. */
export const resume = 'Georgia, Cambria, "Times New Roman", Times, serif';

export const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

/** Light-scheme tokens from `apps/web/src/app/globals.css`. */
export const color = {
  desk: 'hsl(140 9% 94%)',
  card: 'hsl(0 0% 100%)',
  ink: 'hsl(153 16% 11%)',
  muted: 'hsl(153 6% 37%)',
  border: 'hsl(146 9% 83%)',
  input: 'hsl(146 9% 78%)',
  primary: 'hsl(160 56% 27%)',
  primaryRing: 'hsl(160 56% 27% / 0.5)',
  primaryFg: 'hsl(0 0% 100%)',
  accent: 'hsl(156 36% 93%)',
  accentFg: 'hsl(160 56% 20%)',
  secondary: 'hsl(140 8% 91%)',
  success: 'hsl(152 55% 32%)',
  marker: 'hsl(48 87% 62% / 0.75)',
  pageRule: 'hsl(146 9% 85%)',
  shadowInk: 'hsl(153 18% 9%)',
} as const;
