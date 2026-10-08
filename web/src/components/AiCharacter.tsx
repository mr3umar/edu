import { useEffect, useRef } from 'react';
import { getMicLevel, getTutorLevel } from '../lib/voiceLevel';
import type { AiAgentStatus } from '../types/book';
import { CHARACTER, type CharacterBackground, type CharacterFace, type CharacterShape, type Rgb } from '../config/aiIcon';

const STATUSES: AiAgentStatus[] = ['ready', 'listening', 'thinking', 'speaking', 'paused'];

// The icon's size in CSS pixels.
const SIZE = 40;
// How much bigger than drawn the face is shown, so it fills the shape.
const FACE_SCALE = 1.5;
// Where the eyes sit, in units of the icon's radius from its centre (y down).
const EX = 0.26;
const EY = -0.06;

const TAU = Math.PI * 2;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
// Eases `value` towards `target` at `speed`, independent of frame rate.
const approach = (value: number, target: number, speed: number, dt: number) =>
  value + (target - value) * (1 - Math.exp(-speed * dt));
const rgba = (c: Rgb, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

type Weights = Record<AiAgentStatus, number>;
type Ink = string | CanvasGradient;

// What the eyes are doing between frames.
type Eyes = {
  blinkAt: number;
  nextGlance: number;
  gx: number; gy: number; tx: number; ty: number;
  // The line being read, while thinking.
  readY: number;
  // Speech heard since the last nod, and when that nod was.
  spoke: boolean;
  nodAt: number;
  // When the next content smile starts (scholar and monocle, while ready).
  smileAt: number;
};
const newEyes = (t: number): Eyes => ({
  blinkAt: t + 1.5 + Math.random() * 2, nextGlance: t + 1, gx: 0, gy: 0, tx: 0, ty: 0,
  readY: 0, spoke: false, nodAt: -9, smileAt: t + 3 + Math.random() * 6,
});

// ── Drawing helpers (coordinates in units of the radius R) ──────────────

const capsule = (ctx: CanvasRenderingContext2D, R: number, x: number, y: number, w: number, h: number) => {
  ctx.beginPath();
  ctx.roundRect((x - w / 2) * R, (y - h / 2) * R, w * R, h * R, Math.min(w, h) * R / 2);
  ctx.fill();
};
// Draws each look at its state's weight, so states fade into each other.
const each = (ctx: CanvasRenderingContext2D, looks: [number, () => void][]) => {
  for (const [weight, draw] of looks) {
    if (weight > 0.01) {
      ctx.globalAlpha = weight;
      draw();
    }
  }
  ctx.globalAlpha = 1;
};
// An eye smiling: an arc, curved up.
const smile = (ctx: CanvasRenderingContext2D, R: number, x: number, y: number, r: number, width: number) => {
  ctx.lineWidth = R * width;
  ctx.beginPath();
  ctx.arc(x * R, y * R, r * R, Math.PI * 1.12, Math.PI * 1.88);
  ctx.stroke();
};
// The mouth: a capsule, taller as the voice rises.
const mouth = (ctx: CanvasRenderingContext2D, R: number, level: number, y: number, w: number) =>
  capsule(ctx, R, 0, y, w, 0.07 + 0.2 * level);
// The play button, alone, while paused (nudged right to look centred).
const play = (ctx: CanvasRenderingContext2D, R: number) => {
  const h = 0.14;
  ctx.beginPath();
  ctx.moveTo(-h * 0.75 * R, -h * R);
  ctx.lineTo(h * 1.1 * R, 0);
  ctx.lineTo(-h * 0.75 * R, h * R);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = R * 0.045;
  ctx.stroke();
  ctx.fill();
};
// ── Eye behaviour ───────────────────────────────────────────────────────

// How open the eyes are (blinking now and then), 0.1 to 1.
function blink(eyes: Eyes, t: number, rare: boolean) {
  const since = t - eyes.blinkAt;
  if (since >= 0.18) eyes.blinkAt = t + (rare ? 6 : 2.6) + Math.random() * 3;
  return since > 0 && since < 0.18 ? Math.max(0.1, Math.abs(since - 0.09) / 0.09) : 1;
}
// Glancing around, by `amount` (0 looks straight ahead).
function glance(eyes: Eyes, t: number, dt: number, amount: number) {
  if (t > eyes.nextGlance) {
    const a = Math.random() * TAU, d = Math.random();
    eyes.tx = Math.cos(a) * d;
    eyes.ty = Math.sin(a) * d * 0.6;
    eyes.nextGlance = t + 1.4 + Math.random() * 2.4;
  }
  eyes.gx = approach(eyes.gx, eyes.tx * amount, 8, dt);
  eyes.gy = approach(eyes.gy, eyes.ty * amount, 8, dt);
}
// Reading: gliding across a line in reading direction, then flicking back
// and down to the next; three lines, then the top again. How far across the
// line the reading is, from -1 (start) to 1 (end), unmirrored.
const READ_LINE_S = 1.5;
function readingAcross(t: number) {
  const p = (t % READ_LINE_S) / READ_LINE_S;
  const ease = (k: number) => k * k * (3 - 2 * k);
  return p < 0.8 ? lerp(-1, 1, ease(p / 0.8)) : lerp(1, -1, ease((p - 0.8) / 0.2));
}
function reading(eyes: Eyes, t: number, dt: number, dir: number): [number, number] {
  const line = Math.floor(t / READ_LINE_S) % 3;
  eyes.readY = approach(eyes.readY, -0.12 + line * 0.06, 14, dt);
  return [readingAcross(t) * 0.09 * dir, eyes.readY];
}
// A small nod when the voice falls quiet after speech, 0 to 1.
function nod(eyes: Eyes, level: number, t: number) {
  if (level > 0.4) eyes.spoke = true;
  if (eyes.spoke && level < 0.12) {
    eyes.spoke = false;
    eyes.nodAt = t;
  }
  const since = t - eyes.nodAt;
  return since < 0.6 ? Math.sin(Math.PI * since / 0.6) : 0;
}
// A content, eyes-closed smile for a moment every few seconds, 0 to 1.
function contentSmile(eyes: Eyes, t: number) {
  const since = t - eyes.smileAt, LEN = 1.3;
  if (since > LEN) eyes.smileAt = t + 6 * (0.6 + Math.random() * 0.8);
  return since > 0 && since < LEN ? clamp(Math.min(since, LEN - since) / 0.22) : 0;
}

// ── Faces ───────────────────────────────────────────────────────────────

type FaceArgs = {
  ctx: CanvasRenderingContext2D; R: number; t: number; dt: number; w: Weights; level: number; eyes: Eyes; dir: number;
};

// Capsule eyes. Ready: glancing and blinking. Listening: looking at you,
// taller with your voice. Thinking: reading lines, with no mouth.
// Speaking: smiling eyes and a mouth that moves with the voice.
function reader({ ctx, R, t, dt, w, level, eyes, dir }: FaceArgs) {
  glance(eyes, t, dt, w.ready);
  const lid = blink(eyes, t, w.listening > 0.5);
  each(ctx, [
    [w.ready, () => { for (const s of [-1, 1]) capsule(ctx, R, s * EX + eyes.gx * 0.1, EY + eyes.gy * 0.1, 0.13, 0.3 * lid); }],
    [w.listening, () => { for (const s of [-1, 1]) capsule(ctx, R, s * EX, EY, 0.14, (0.3 + 0.16 * level) * lid); }],
    [w.thinking, () => {
      const [rx, ry] = reading(eyes, t, dt, dir);
      for (const s of [-1, 1]) capsule(ctx, R, s * EX + rx, EY + ry + 0.04, 0.13, 0.2);
    }],
    [w.speaking, () => {
      for (const s of [-1, 1]) smile(ctx, R, s * EX, EY - 0.02 - 0.03 * level, 0.11, 0.075);
      mouth(ctx, R, level, 0.33, 0.14);
    }],
    [w.paused, () => play(ctx, R)],
  ]);
}

// The reader in spectacles (or a monocle), calmer: a content smile now and
// then while ready, a nod each time you pause while listening and at the end
// of its own phrases, and a glint sliding across the lenses while it reads.
function scholar(args: FaceArgs, monocle: boolean) {
  const { ctx, R, t, dt, w, level, eyes, dir } = args;
  glance(eyes, t, dt, w.ready);
  const lid = blink(eyes, t, true);
  const nodding = nod(eyes, level, t) * (w.listening + w.speaking);
  const content = contentSmile(eyes, t) * w.ready;
  const ny = 0.06 * nodding;
  const lensR = 0.19, lensY = EY + 0.02 + ny, eyeY = EY + 0.02 + ny;
  const sides = monocle ? [1] : [-1, 1];
  const lens = (x: number) => {
    ctx.beginPath();
    ctx.arc(x * R, lensY * R, lensR * R, 0, TAU);
  };

  // The glasses fade out with the face when paused.
  ctx.globalAlpha = (1 - w.paused) * (0.6 + 0.35 * w.listening);
  ctx.lineWidth = R * 0.035;
  for (const s of sides) { lens(s * EX); ctx.stroke(); }
  ctx.beginPath();
  if (monocle) {
    // A fine chain hanging from the lens.
    ctx.lineWidth = R * 0.022;
    ctx.moveTo((EX + 0.13) * R, (lensY + 0.14) * R);
    ctx.quadraticCurveTo((EX + 0.22) * R, (lensY + 0.45) * R, (EX + 0.42) * R, (lensY + 0.5) * R);
  } else {
    ctx.arc(0, lensY * R, 0.08 * R, Math.PI * 1.15, Math.PI * 1.85);
  }
  ctx.stroke();

  // The glint: a light streak sliding across the lenses while thinking.
  const glint = ((t % 2.8) / 2.8) * 1.6 - 0.3;
  if (w.thinking > 0.01 && glint > 0 && glint < 1) {
    ctx.save();
    ctx.globalAlpha = w.thinking * 0.5 * Math.sin(Math.PI * glint);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = R * 0.03;
    for (const s of sides) {
      ctx.save();
      lens(s * EX);
      ctx.clip();
      const gx = s * EX - 0.2 + glint * 0.4;
      ctx.beginPath();
      ctx.moveTo((gx - 0.08) * R, (lensY + 0.18) * R);
      ctx.lineTo((gx + 0.08) * R, (lensY - 0.18) * R);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  each(ctx, [
    [w.ready * (1 - content), () => { for (const s of [-1, 1]) capsule(ctx, R, s * EX + eyes.gx * 0.06, eyeY + eyes.gy * 0.05, 0.11, 0.22 * lid); }],
    [w.ready * content, () => { for (const s of [-1, 1]) smile(ctx, R, s * EX, eyeY + 0.05, 0.085, 0.065); }],
    [w.listening, () => { for (const s of [-1, 1]) capsule(ctx, R, s * EX, eyeY, 0.12, (0.22 + 0.1 * level) * (1 - 0.3 * nodding) * lid); }],
    [w.thinking, () => {
      const [rx, ry] = reading(eyes, t, dt, dir);
      for (const s of [-1, 1]) capsule(ctx, R, s * EX + rx * 0.6, EY + 0.06 + ry * 0.5, 0.11, 0.15);
    }],
    [w.speaking, () => {
      for (const s of [-1, 1]) smile(ctx, R, s * EX, eyeY + 0.06, 0.085, 0.065);
      mouth(ctx, R, level, 0.38 + ny, 0.12);
    }],
    [w.paused, () => play(ctx, R)],
  ]);
}

const FACES: Record<CharacterFace, (args: FaceArgs) => void> = {
  reader,
  scholar: args => scholar(args, false),
  monocle: args => scholar(args, true),
};

// ── Backgrounds ─────────────────────────────────────────────────────────

const WARM: Rgb = [255, 196, 128];
const DAYLIGHT: Rgb = [214, 226, 255];
const PAGE: Rgb = [235, 238, 250];
const ink = (a: number) => `rgba(18,19,26,${a})`;

const darkFill = (ctx: CanvasRenderingContext2D, R: number, edge: number) => {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, ink(0.88));
  g.addColorStop(1, ink(edge));
  ctx.fillStyle = g;
  ctx.fillRect(-R, -R, 2 * R, 2 * R);
};
const glow = (ctx: CanvasRenderingContext2D, R: number, x: number, y: number, r: number, color: Rgb, alpha: number) => {
  const g = ctx.createRadialGradient(x * R, y * R, 0, x * R, y * R, r * R);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-R, -R, 2 * R, 2 * R);
};

// Each background: dark, lighter in the middle, fading to `edge` at the rim.
// With a `lamp`, a glow from above; while thinking it glides along with the
// eyes as they read each line, as if lighting the words. `living` lamps also
// brighten with the voice and dim when paused. `bounce` adds light reflected
// up from the page below.
type Lamp = { color: Rgb; alpha: number; radius: number };
const BACKGROUNDS: Record<CharacterBackground, { edge: number; lamp?: Lamp; living?: boolean; bounce?: boolean }> = {
  'soft-edge': { edge: 0.25 },
  'study-lamp': { edge: 0.3, lamp: { color: WARM, alpha: 0.28, radius: 1.1 } },
  'reading-nook': { edge: 0.3, lamp: { color: WARM, alpha: 0.26, radius: 1.05 }, bounce: true },
  'daylight-lamp': { edge: 0.3, lamp: { color: DAYLIGHT, alpha: 0.24, radius: 1.1 } },
  'living-lamp': { edge: 0.3, lamp: { color: WARM, alpha: 0.22, radius: 1.1 }, living: true },
};

function drawBackground(ctx: CanvasRenderingContext2D, R: number, t: number, w: Weights, level: number, dir: number, name: CharacterBackground) {
  const bg = BACKGROUNDS[name];
  darkFill(ctx, R, bg.edge);
  if (bg.lamp) {
    const { color, radius } = bg.lamp;
    let alpha = bg.lamp.alpha;
    if (bg.living) alpha += 0.16 * level * (w.listening + w.speaking) - 0.12 * w.paused;
    // At rest above, a little to the left; while thinking, following the reading.
    const x = lerp(-0.15, readingAcross(t) * 0.6 * dir, w.thinking);
    glow(ctx, R, x, lerp(-0.95, -0.9, w.thinking), lerp(radius, 0.95, w.thinking), color, alpha + 0.06 * w.thinking);
  }
  if (bg.bounce) glow(ctx, R, 0, 1, 0.75, PAGE, 0.12);
}

// ── Shapes ──────────────────────────────────────────────────────────────

// Superellipses |x|^n + |y|^n = 1: n = 2 is a circle, n = 4 a squircle (like
// modern app icons); in between, a circle with gentle shoulders. Squarer ones
// are drawn a little smaller, so they look the same size.
const superellipse = (n: number) => (ctx: CanvasRenderingContext2D, R: number) => {
  const k = lerp(1, 0.97, (n - 2) / 2);
  for (let i = 0; i <= 120; i++) {
    const th = i / 120 * TAU, c = Math.cos(th), s = Math.sin(th);
    const x = Math.sign(c) * Math.abs(c) ** (2 / n) * R * k, y = Math.sign(s) * Math.abs(s) ** (2 / n) * R * k;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
};
const SHAPES: Record<CharacterShape, (ctx: CanvasRenderingContext2D, R: number) => void> = {
  circle: (ctx, R) => ctx.arc(0, 0, R, 0, TAU),
  'barely-squared': superellipse(2.5),
  'soft-squircle': superellipse(3),
  squircle: superellipse(4),
};

type Props = {
  status: AiAgentStatus;
  // Arabic: reads right to left.
  rtl?: boolean;
  shape?: CharacterShape;
  background?: CharacterBackground;
  face?: CharacterFace;
};

// The AI icon as a character, chosen in config/aiIcon (CHARACTER).
export default function AiCharacter({
  status, rtl = false, shape = CHARACTER.shape, background = CHARACTER.background, face = CHARACTER.face,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ status, rtl, shape, background, face });
  propsRef.current = { status, rtl, shape, background, face };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = canvas.height = Math.round(SIZE * dpr);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // How much each state shows, fading between them.
    const weights: Weights = { ready: 0, listening: 0, thinking: 0, speaking: 0, paused: 0 };
    weights[propsRef.current.status] = 1;
    const eyes = newEyes(performance.now() / 1000);
    let level = 0;
    let last = performance.now();
    let frameId = 0;

    const draw = (nowMs: number) => {
      const dt = Math.max(0, Math.min(0.05, (nowMs - last) / 1000));
      last = nowMs;
      const calm = reduceMotion.matches;
      // Slowed right down for reduced motion, so changes still show.
      const t = (calm ? 0.25 : 1) * nowMs / 1000;
      const current = propsRef.current;

      for (const s of STATUSES) weights[s] = approach(weights[s], s === current.status ? 1 : 0, 6, dt);
      const raw = current.status === 'listening' ? getMicLevel() : current.status === 'speaking' ? getTutorLevel() : 0;
      // Rises quickly and falls back slowly.
      level = approach(level, calm ? Math.min(raw, 0.4) : raw, raw > level ? 20 : 7, dt);

      const R = SIZE / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.save();
      ctx.translate(R, R);
      ctx.beginPath();
      SHAPES[current.shape](ctx, R);
      ctx.clip();

      const dir = current.rtl ? -1 : 1;
      drawBackground(ctx, R, t, weights, level, dir, current.background);

      // The face's colours, split along a slowly turning axis.
      const turn = (t / CHARACTER.turnSeconds) * TAU;
      const ax = Math.cos(turn) * R * 0.85, ay = Math.sin(turn) * R * 0.85;
      const color: Ink = ctx.createLinearGradient(-ax, -ay, ax, ay);
      color.addColorStop(0, rgba(CHARACTER.colors.from, 1));
      color.addColorStop(1, rgba(CHARACTER.colors.to, 1));
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';

      ctx.scale(FACE_SCALE, FACE_SCALE);
      FACES[current.face]({ ctx, R, t, dt, w: weights, level, eyes, dir });
      ctx.restore();

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return <canvas ref={canvasRef} className="ai-meter" aria-hidden="true" />;
}
