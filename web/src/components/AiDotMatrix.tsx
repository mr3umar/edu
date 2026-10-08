import { useEffect, useRef } from 'react';
import { getMicLevel, getTutorLevel } from '../lib/voiceLevel';
import type { AiAgentStatus } from '../types/book';
import {
  DOT_MATRIX, DOT_MATRIX_BACKGROUNDS, DOT_MATRIX_FOREGROUNDS,
  type DotMatrixBackground, type DotMatrixForeground, type Rgb,
} from '../config/aiIcon';

const STATUSES: AiAgentStatus[] = ['ready', 'listening', 'thinking', 'speaking', 'paused'];

// The icon's size in CSS pixels, and its dot grid: 7x7 with the corners
// rounded off (37 dots), in units of the icon's radius.
const SIZE = 40;
const HALF = 3;
const GAP = 0.22;
const DOT = 0.055;
const GRID: [number, number][] = [];
for (let i = -HALF; i <= HALF; i++) for (let j = -HALF; j <= HALF; j++) {
  if (i * i + j * j <= 10) GRID.push([i, j]);
}
// The 16 outer dots, clockwise from the top: the frame that animates around
// the pause and play icons.
const clockwise = ([i, j]: [number, number]) => (Math.atan2(i, -j) + Math.PI * 2) % (Math.PI * 2);
const FRAME = GRID
  .filter(([i, j]) => Math.max(Math.abs(i), Math.abs(j)) === HALF || (Math.abs(i) === HALF - 1 && Math.abs(j) === HALF - 1))
  .sort((a, b) => clockwise(a) - clockwise(b));
const frameIndex = (i: number, j: number) => FRAME.findIndex(([fi, fj]) => fi === i && fj === j);
// While thinking, the dots orbit the stop icon: the outer ring at this many
// radians a second, inner rings faster, as in an orbit.
const ORBIT_SPEED = Math.PI / 2;
const OUTER_R = HALF * GAP;
// While thinking the orbits spread out, from clear of the stop icon
// (ORBIT_INNER) to near the edge (ORBIT_OUTER), and the dots shrink.
const ORBIT_INNER = 0.47;
const ORBIT_OUTER = 0.845;
const ORBIT_DOT = 0.7;
// The innermost dots that orbit (the diagonal neighbours of the middle).
const INNERMOST_R = Math.SQRT2 * GAP;

const TAU = Math.PI * 2;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
// Smooth random wiggle, 0 to 1.
const noise = (x: number) => {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return hash(i) + (hash(i + 1) - hash(i)) * u;
};
const mix = (a: Rgb, b: Rgb, k: number) => {
  const c = clamp(k);
  return a.map((v, i) => Math.round(v + (b[i] - v) * c)).join(',');
};
// Eases `value` towards `target` at `speed`, independent of frame rate.
const approach = (value: number, target: number, speed: number, dt: number) =>
  value + (target - value) * (1 - Math.exp(-speed * dt));

// The AI icon's face: a grid of small dots, floating as if in space, coloured
// and set on a background as chosen in config/aiIcon (DOT_MATRIX).
// Ready: a slow shimmer passes across the dots now and then.
// Listening: the dots light up as a centred level meter of the user's voice.
// Thinking: the dots orbit the stop icon, each on its own ring, inner rings
// faster.
// Speaking: the inner dots fall into a pause icon while the outer frame
// pulses with the tutor's voice.
// Paused: the dots fade away, leaving just the play icon.
// Each dot is on a soft spring to its place, drifting as if weightless, with a
// slight pull towards the centre; voice pushes the dots out and they float
// back. States fade into each other.
type Props = {
  status: AiAgentStatus;
  background?: DotMatrixBackground;
  foreground?: DotMatrixForeground;
};

export default function AiDotMatrix({ status, background = DOT_MATRIX.background, foreground = DOT_MATRIX.foreground }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef(status);
  statusRef.current = status;
  const backgroundRef = useRef(background);
  backgroundRef.current = background;
  const foregroundRef = useRef(foreground);
  foregroundRef.current = foreground;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = canvas.height = Math.round(SIZE * dpr);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // How much each state shows, fading between them.
    const weights: Record<AiAgentStatus, number> = { ready: 0, listening: 0, thinking: 0, speaking: 0, paused: 0 };
    weights[statusRef.current] = 1;
    const columns = new Array(HALF * 2 + 1).fill(0);
    const dots = GRID.map(([i, j]) => ({ i, j, x: i * GAP, y: j * GAP, vx: 0, vy: 0, frame: frameIndex(i, j) }));
    let level = 0;
    // How far the orbit has turned; back to 0 once thinking has faded out, so
    // the next one starts from the grid.
    let orbit = 0;
    let last = performance.now();
    let frameId = 0;

    const draw = (nowMs: number) => {
      const dt = Math.max(0, Math.min(0.05, (nowMs - last) / 1000));
      last = nowMs;
      const calm = reduceMotion.matches;
      // Slowed right down for reduced motion, so changes still show.
      const t = (calm ? 0.25 : 1) * nowMs / 1000;
      const current = statusRef.current;

      for (const s of STATUSES) weights[s] = approach(weights[s], s === current ? 1 : 0, 6, dt);
      const raw = current === 'listening' ? getMicLevel() : current === 'speaking' ? getTutorLevel() : 0;
      // Rises quickly and falls back slowly, like a meter's needle.
      const previous = level;
      level = approach(level, calm ? Math.min(raw, 0.4) : raw, raw > level ? 20 : 7, dt);
      const rise = Math.max(0, level - previous);

      const { ready, listening, thinking, speaking, paused } = weights;
      const idle = ready + listening;
      const answer = thinking + speaking + paused;
      const listen = idle > 0.001 ? listening / idle : 0;

      const R = SIZE / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(R, R);

      // The axis the colours split along, turning slowly.
      const turnAngle = (t / DOT_MATRIX.turnSeconds) * TAU;
      const axisX = Math.cos(turnAngle), axisY = Math.sin(turnAngle);
      const bg = DOT_MATRIX_BACKGROUNDS[backgroundRef.current];
      const fg = DOT_MATRIX_FOREGROUNDS[foregroundRef.current];
      const { from, to, icon } = bg.colors ? fg[bg.colors] : fg;

      // Deep space, a little lighter in the middle (see-through backgrounds
      // need last frame cleared first)…
      ctx.clearRect(-R, -R, SIZE, SIZE);
      const stops = bg.stops ?? (bg.centre && bg.edge ? [[0, bg.centre], [1, bg.edge]] as const : undefined);
      if (stops) {
        const space = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
        for (const [position, color] of stops) space.addColorStop(position, color);
        ctx.fillStyle = space;
        ctx.fillRect(-R, -R, SIZE, SIZE);
      }
      // …with a faint haze of each colour on its side, for the nebula.
      if (bg.haze) {
        for (const [color, side] of [[from, -1], [to, 1]] as const) {
          const hx = axisX * 0.55 * R * side, hy = axisY * 0.55 * R * side;
          const haze = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 0.95);
          haze.addColorStop(0, `rgba(${color.join(',')},${bg.haze})`);
          haze.addColorStop(1, `rgba(${color.join(',')},0)`);
          ctx.fillStyle = haze;
          ctx.fillRect(-R, -R, SIZE, SIZE);
        }
      }
      // …or a thin two-colour rim round the edge.
      if (bg.rim) {
        const rim = ctx.createLinearGradient(-axisX * R, -axisY * R, axisX * R, axisY * R);
        rim.addColorStop(0, `rgba(${from.join(',')},${bg.rim})`);
        rim.addColorStop(1, `rgba(${to.join(',')},${bg.rim})`);
        const width = Math.max(1, R * (bg.rimWidth ?? 0.07));
        ctx.strokeStyle = rim;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.arc(0, 0, R - width / 2, 0, TAU);
        ctx.stroke();
      }

      for (let i = -HALF; i <= HALF; i++) {
        const target = level * (1 - Math.abs(i) * 0.13) * (0.55 + 0.45 * noise(i * 5.7 + t * 9));
        columns[i + HALF] = approach(columns[i + HALF], target, 14, dt);
      }
      orbit = thinking < 0.01 ? 0 : orbit + dt * ORBIT_SPEED * (calm ? 0.25 : 1);

      dots.forEach((d, n) => {
        const { i, j } = d;
        const gx = i * GAP, gy = j * GAP;
        const inner = d.frame < 0;
        const r = Math.hypot(gx, gy);
        // The dots right round the middle make way for the stop icon.
        const centre = r < 0.25;

        // Where it floats to: its place in the grid, or round its orbit
        // while thinking, drifting a little…
        const turn = centre ? 0 : orbit * OUTER_R / r;
        const spread = centre ? 1 : lerp(ORBIT_INNER, ORBIT_OUTER, (r - INNERMOST_R) / (OUTER_R - INNERMOST_R)) / r;
        const ox = lerp(gx, (gx * Math.cos(turn) - gy * Math.sin(turn)) * spread, thinking);
        const oy = lerp(gy, (gx * Math.sin(turn) + gy * Math.cos(turn)) * spread, thinking);
        const drift = calm ? 0 : 0.02 * (1 - paused);
        let tx = ox + drift * (noise(n * 7.3 + t * 0.35) * 2 - 1);
        let ty = oy + drift * (noise(n * 7.3 + 50 + t * 0.31) * 2 - 1);
        // …pulled in towards the centre when it's quiet,
        let pull = 0.05 * (1 - level);
        // and the inner dots falling into the pause or play icon (only the
        // middle ones into the stop icon: the rest orbit it).
        if (inner) pull += 0.9 * (centre ? answer : speaking + paused);
        tx *= 1 - pull;
        ty *= 1 - pull;

        // Voice pushes it outwards; the spring brings it back.
        if (!calm && rise > 0) {
          const r = Math.hypot(gx, gy) || 1;
          d.vx += gx / r * rise * 4;
          d.vy += gy / r * rise * 4;
        }
        const stiffness = 40, damping = 6;
        d.vx += (stiffness * (tx - d.x) - damping * d.vx) * dt;
        d.vy += (stiffness * (ty - d.y) - damping * d.vy) * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;

        // How bright: the meter while idle, steady while orbiting, the frame
        // while speaking, and nothing while paused.
        const shimmer = Math.max(0, Math.cos((i - j) * 0.37 - t * 1.3)) ** 10;
        const lit = clamp((columns[i + HALF] * 4.8 - Math.abs(j)) * 1.5 + 0.5);
        let b = idle * lerp(0.2 + 0.65 * shimmer, 0.14 + 0.86 * lit, listen);
        // Steady while orbiting, each at its own strength: some bright, some
        // faint, like stars at different distances.
        if (!centre) b += thinking * lerp(0.12, 0.8, hash(n * 4.7 + 1) ** 1.5);
        if (!inner) {
          b += speaking * (0.15 + 0.85 * clamp(level * (0.45 + 0.8 * noise(d.frame * 3.3 + t * 8))));
        }
        // A faint twinkle, like starlight.
        b = clamp(b * (0.88 + 0.12 * noise(n * 3.1 + t * 2.4)));

        const x = d.x * R, y = d.y * R, size = R * DOT * (0.9 + 0.25 * b) * lerp(1, ORBIT_DOT, thinking);
        // Its colour: by how far it is along the turning axis, or how bright.
        const color = mix(from, to, fg.by === 'turning' ? (d.x * axisX + d.y * axisY + 0.85) / 1.7 : b);
        if (b > 0.55 && bg.colors !== 'onLight') {
          const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 2.6);
          glow.addColorStop(0, `rgba(${color},${(b - 0.55) * 0.6})`);
          glow.addColorStop(1, `rgba(${color},0)`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, size * 2.6, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${color},${b})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TAU);
        ctx.fill();
      });

      ctx.fillStyle = icon;
      const s = R * 0.14;
      if (thinking > 0.01) {
        ctx.globalAlpha = thinking;
        ctx.beginPath();
        ctx.roundRect(-s, -s, s * 2, s * 2, s * 0.3);
        ctx.fill();
      }
      if (speaking > 0.01) {
        ctx.globalAlpha = speaking;
        const w = s * 0.62, h = s * 2.1;
        ctx.beginPath();
        ctx.roundRect(-s * 0.95, -h / 2, w, h, w * 0.3);
        ctx.roundRect(s * 0.33, -h / 2, w, h, w * 0.3);
        ctx.fill();
      }
      if (paused > 0.01) {
        // Nudged right: a triangle's visual centre is left of its box's.
        ctx.globalAlpha = paused;
        const h = s * 1.2;
        ctx.beginPath();
        ctx.moveTo(-h * 0.75, -h);
        ctx.lineTo(h * 1.1, 0);
        ctx.lineTo(-h * 0.75, h);
        ctx.closePath();
        ctx.lineJoin = 'round';
        ctx.lineWidth = s * 0.3;
        ctx.strokeStyle = icon;
        ctx.stroke();
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return <canvas ref={canvasRef} className="ai-meter" aria-hidden="true" />;
}
