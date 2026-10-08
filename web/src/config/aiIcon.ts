// How the AI tutor icon looks.

export type Rgb = readonly [number, number, number];

export type AiIconStyle = 'dot-matrix' | 'character';

// Which design the icon uses. Each has its own settings below.
export const AI_ICON_STYLE: AiIconStyle = 'character';

// ── Character (components/AiCharacter) ──────────────────────────────────
// A calm, wise little face (no gender, no age, nothing human) that listens,
// reads while it thinks, and talks.
// From round to square-ish: 'circle'; 'barely-squared' (a circle with the
// faintest fullness at four points); 'soft-squircle' (halfway, with gentle
// shoulders); 'squircle' (like modern app icons).
export type CharacterShape = 'circle' | 'barely-squared' | 'soft-squircle' | 'squircle';
// Dark backgrounds, lighter in the middle: a plain soft edge, or lit by a
// lamp above that, while thinking, follows the eyes as they read ('living-lamp'
// also brightens with the voice and dims when paused; 'reading-nook' adds
// light bouncing up from the page). The mouth is hidden while thinking.
export type CharacterBackground = 'reading-nook' | 'study-lamp' | 'daylight-lamp' | 'living-lamp' | 'soft-edge';
// 'reader': capsule eyes. 'scholar': the same in round spectacles, nodding as
// it listens. 'monocle': the scholar with a single lens on a chain.
export type CharacterFace = 'reader' | 'scholar' | 'monocle';

export const CHARACTER: {
  shape: CharacterShape;
  background: CharacterBackground;
  face: CharacterFace;
  // The face's two colours, split along an axis that slowly turns.
  colors: { from: Rgb; to: Rgb };
  // Seconds for that axis to turn once.
  turnSeconds: number;
} = {
  shape: 'soft-squircle',
  background: 'reading-nook',
  face: 'monocle',
  colors: { from: [96, 225, 210], to: [168, 150, 255] },
  turnSeconds: 14,
};

// ── Dot matrix (components/AiDotMatrix) ─────────────────────────────────
// A grid of small floating dots. Pick its background and dot colours from
// the options further down.
export const DOT_MATRIX: {
  background: DotMatrixBackground;
  foreground: DotMatrixForeground;
  // Seconds for the 'turning' colours' axis to turn once around the icon.
  turnSeconds: number;
} = {
  background: 'soft-edge',
  foreground: 'turning',
  turnSeconds: 14,
};

// Backgrounds.
export type DotMatrixBackground =
  | 'near-black' | 'nebula' | 'graphite' | 'deep-violet'
  | 'turning-rim' | 'light' | 'pure-black' | 'midnight-teal'
  | 'ink-glass' | 'soft-edge' | 'outline' | 'vanishing-edge';

// Dot colours.
export type DotMatrixForeground = 'turning' | 'deep-navy';

// Each dot's colour is between `from` and `to`: by where it is along an axis
// that slowly turns around the icon ('turning'), or by how bright it is
// ('brightness'). `icon` colours the stop, pause and play icons. On a light
// background, `onLight`'s deeper colours are used instead, so they show; with
// no background, `onAny`'s mid-tones, which show on light and dark pages.
type Colors = { from: Rgb; to: Rgb; icon: string };
export const DOT_MATRIX_FOREGROUNDS: Record<DotMatrixForeground, Colors & { by: 'turning' | 'brightness'; onLight: Colors; onAny: Colors }> = {
  // Teal to violet.
  turning: {
    from: [96, 225, 210], to: [168, 150, 255], by: 'turning', icon: '#ffffff',
    onLight: { from: [13, 148, 136], to: [109, 40, 217], icon: '#1a1530' },
    onAny: { from: [20, 184, 166], to: [139, 92, 246], icon: '#8b86a8' },
  },
  // Pale ice blue: soft blue when dim, near-white when bright (on light: soft
  // blue to deep navy).
  'deep-navy': {
    from: [150, 175, 230], to: [228, 238, 255], by: 'brightness', icon: '#eef3ff',
    onLight: { from: [110, 130, 185], to: [24, 36, 84], icon: '#18223f' },
    onAny: { from: [130, 150, 200], to: [64, 96, 196], icon: '#7d8bb0' },
  },
};

// Each background: a radial gradient from `centre` to `edge`, or through
// `stops` ([position from 0 at the centre to 1 at the edge, colour]) for more
// steps; colours may be see-through, letting the page show through. Without
// either, none. With
// `haze`, a faint glow of the two dot colours on opposite sides, turning
// slowly, at that opacity. With `rim`, a thin ring round the edge in the two
// dot colours, turning with them, at that opacity (and `rimWidth`, in units
// of the icon's radius). `colors` picks the foreground's colours for the
// background: 'onLight' on light ones (no glow round bright dots), 'onAny'
// when the page shows through.
type Background = {
  centre?: string;
  edge?: string;
  stops?: readonly (readonly [number, string])[];
  haze?: number;
  rim?: number;
  rimWidth?: number;
  colors?: 'onLight' | 'onAny';
};
export const DOT_MATRIX_BACKGROUNDS: Record<DotMatrixBackground, Background> = {
  'near-black': { centre: '#17181e', edge: '#09090c' },
  nebula: { centre: '#15151c', edge: '#08080b', haze: 0.2 },
  graphite: { centre: '#2c2d35', edge: '#18191e' },
  'deep-violet': { centre: '#22203f', edge: '#0a0917' },
  'turning-rim': { centre: '#17181e', edge: '#09090c', rim: 0.85 },
  light: { centre: '#ffffff', edge: '#eef0f7', colors: 'onLight' },
  'pure-black': { centre: '#000000', edge: '#000000' },
  'midnight-teal': { centre: '#10272b', edge: '#040c0e' },
  // Dark, slightly see-through: takes a hint of the page behind.
  'ink-glass': { centre: 'rgba(22,23,30,0.80)', edge: 'rgba(22,23,30,0.90)' },
  // Dark in the middle, fading out towards the edge.
  'soft-edge': { centre: 'rgba(18,19,26,0.88)', edge: 'rgba(18,19,26,0.25)' },
  // Holds dark through the middle, then fades to nothing at the edge.
  'vanishing-edge': { stops: [[0, 'rgba(18,19,26,0.9)'], [0.55, 'rgba(18,19,26,0.75)'], [1, 'rgba(18,19,26,0)']] },
  // No fill: mid-tone dots and a faint turning ring.
  outline: { rim: 0.5, rimWidth: 0.05, colors: 'onAny' },
};
