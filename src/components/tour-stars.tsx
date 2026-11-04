import React, { useEffect, useLayoutEffect, useRef } from "react";
import { ORBIT_UI_ATTR } from "../constants";
import { cx } from "../utils/cx";
import { pickArea } from "../utils/pick-element";
import { hexToRgb } from "../utils/tour";

// Radial's stars: one size on one grid, in CSS pixels, told apart by light alone.
const GRID = 7;
const STAR = 1.08;
// How far they reach from the card at rest.
const REACH = 240;
// The card's corner (--orbit-radius-2xl).
const CORNER = 16;
// Seconds of the boot: the disc gathers in the heart, and ripples out into the field at rest.
const BOOT = 3;
// The moment it has gathered, as a share of the boot. The card and the page come up from there.
const GATHER = 1.6 / BOOT;
const MAX_RATIO = 2;
// The fade out (.orbit-tour__stars--off), and a little room.
const OFF_MS = 400;

const PRISM = ["amber", "peach", "ice", "cyan", "blue"];

const VERT = /* glsl */ `#version 300 es
uniform vec2 uRes;
uniform vec2 uCard;
uniform vec2 uHalf;
uniform vec4 uArea;
uniform ivec2 uCells;
uniform float uCorner;
uniform float uReach;
uniform float uPitch;
uniform float uSize;
uniform float uRatio;
uniform float uTime;
uniform float uBoot;
uniform vec3 uPrism[5];
out vec4 vInk;

const float SPUN = ${(1.6 / 2.6).toFixed(4)}; // how far through its turning it is, once gathered
const float SPIN = 19.0;  // how far the arms' phase runs: three arms, so over three crests past a star
const float WIND = 5.5;   // how tightly they're wound
const float TIP = 0.62;   // the disc tipped away: it stands wider than it's high, as Radial's does
const float GATHER = ${GATHER.toFixed(3)};
const float CORE = 70.0;  // CSS px: how far it gathers, into a ball
const float CREST = 44.0; // and how wide a ripple is
const float SECOND = 0.22; // when the field sets out after the ripple, as a share of the rippling

float hash(vec2 c) {
  vec3 p = fract(vec3(c.xyx) * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

// pow() of a negative is undefined in GLSL, and engines differ: some give 0, Firefox gives NaN, and
// NaN times 0 is still NaN, which lit every star past the ring. So: no pow() without a guard.
float square(float x) {
  return x * x;
}

float fromCard(vec2 p) {
  vec2 q = abs(p - uCard) - uHalf + uCorner;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uCorner;
}

vec3 prism(float t) {
  float x = clamp(t, 0.0, 1.0) * 4.0;
  int i = int(min(x, 3.0));
  return mix(uPrism[i], uPrism[i + 1], x - float(i));
}

void main() {
  vec2 cell = vec2(float(gl_VertexID % uCells.x), float(gl_VertexID / uCells.x));
  vec2 rest = (cell + 0.5) * uPitch;
  float d = fromCard(rest);
  // After the boot, only the card's ring is lit.
  bool ring = d >= 0.0 && d <= uReach;
  if (!ring && uBoot >= 1.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vInk = vec4(0.0);
    return;
  }

  // At rest: currents of light through them, a few twinkling, and now and then a wave from the card.
  float reach = max(d, 0.0) / uReach;
  vec2 q = cell * 0.05;
  float bend = noise(q * 0.6 + uTime * 0.04);
  float current = smoothstep(0.42, 0.78, noise(q + vec2(uTime * 0.09, -uTime * 0.06) + bend * 2.5));
  float id = hash(cell);
  float twinkle = step(0.92, id) * (0.5 + 0.5 * sin(uTime * 1.6 + id * 90.0));
  float wave = exp(-square((reach - fract(uTime / 9.0) * 1.6) * 7.0));
  float still = (0.16 + 0.95 * current + 0.6 * twinkle + 0.5 * wave) * pow(max(1.0 - reach, 0.0), 1.3) * float(ring);
  vec3 stillInk = prism((rest.y - uCard.y + uHalf.y + uReach) / (2.0 * (uHalf.y + uReach)) + (id - 0.5) * 0.12);

  // The boot: no star moves. A shape of light is drawn across them by each one's opacity and
  // colour. A tipped disc of three arms fills the window, curving clockwise and turning clockwise
  // (with y down, an angle that grows), and falls in on the heart, faster and faster. A star comes
  // on at its own threshold as an arm reaches it, so an arm is a density of stars and not a band of
  // paint. Gathered, it is a ball, and it stays: nothing runs back out the way it came. One soft
  // ripple goes out from it, a ring as Radial's core sends them, at Radial's pace, 1 - (1 - t)^3,
  // and the card comes up over the ball. A second spreads the field at rest, under a page that's
  // up by then: its hole for the card and its plain grid are never seen on the black.
  float light = still;
  vec3 ink = stillInk;
  if (uBoot < 1.0) {
    float falling = min(uBoot / GATHER, 1.0);
    // Tipped at first, and round by the time it has gathered, so the ball and its ripples are.
    vec2 own = rest - uCard;
    own.y /= mix(TIP, 1.0, smoothstep(0.55, 1.0, falling));
    float far = length(own);
    float angle = atan(own.y, own.x + 0.0001);
    float wound = log(far + 40.0) * WIND;
    float rippling = max((uBoot - GATHER) / (1.0 - GATHER), 0.0);
    // It turns until it has gathered, and then stands.
    float spun = falling * SPUN;
    float turned = spun * spun * (3.0 - 2.0 * spun) * SPIN;
    float arm = pow(max(0.5 + 0.5 * cos(angle * 3.0 - turned + wound), 0.0), 1.5);
    float hue = 0.5 + 0.5 * cos(angle - turned * 0.33 + wound * 0.3);
    vec3 running = mix(prism(hue), uPrism[2] * 0.4 + 0.6, pow(arm, 6.0));

    // Past the window's furthest corner at first, so the arms fill it to the edges.
    float wide = length(max(uCard, uRes - uCard) / vec2(1.0, TIP)) * 2.0;
    float edge = mix(wide, CORE, 1.0 - pow(max(1.0 - falling * falling, 0.0), 1.5));
    float inDisc = 1.0 - smoothstep(edge * 0.55, edge, far);
    // The arms close up into the ball as it gathers.
    float dense = mix(arm, 1.0, smoothstep(0.8, 1.0, falling));
    float lit = smoothstep(id * 0.75, id * 0.75 + 0.22, dense);
    float shape = smoothstep(0.0, 0.16, falling) * inDisc * lit * mix(0.5, 1.0, hash(cell + 3.0));
    shape *= mix(1.0, 1.5, falling);
    light = shape;
    ink = running;

    if (rippling > 0.0) {
      float ball = shape * (1.0 - smoothstep(0.0, 0.6, rippling));
      // One ripple goes out and leaves. The second is the field itself spreading: barely a crest,
      // gone by the time it reaches the edge of the field, so it turns into it and not past it.
      float first = min(rippling / 0.7, 1.0);
      float second = clamp((rippling - SECOND) / (1.0 - SECOND), 0.0, 1.0);
      float out1 = mix(CORE, length(uHalf + uReach) * 1.3, 1.0 - pow(1.0 - first, 3.0));
      float out2 = mix(CORE, length(uHalf + uReach) * 1.15, 1.0 - pow(1.0 - second, 3.0));
      float ripple = exp(-square((far - out1) / CREST)) * square(1.0 - first) * 0.6;
      if (second > 0.0) ripple += exp(-square((far - out2) / CREST)) * square(1.0 - second) * 0.28;
      // A star comes on at its own threshold here too, so a ripple thins out as it goes.
      float crest = smoothstep(id * 0.7, id * 0.7 + 0.3, ripple);
      float field = smoothstep(out2 + 90.0, out2 - 90.0, far) * smoothstep(0.25, 0.85, rippling);
      light = ball + crest + still * field;
      ink = mix(mix(stillInk, prism(hue), min(crest * 1.5, 1.0)), running, min(ball * 2.0, 1.0));
    }
  }

  // From the burst on, none stands over the rail: only the black lets them there, and it's lifting.
  vec2 inArea = step(uArea.xy, rest) * step(rest, uArea.zw);
  light *= mix(1.0, inArea.x * inArea.y, smoothstep(GATHER, GATHER + 0.04, uBoot));

  // On a pixel's corner for an even size, its middle for an odd one: a star stays crisp.
  float odd = mod(uSize, 2.0) * 0.5;
  vec2 pixel = (floor(rest * uRatio + 0.5 - odd) + odd) / uRatio;
  gl_Position = vec4(pixel.x / uRes.x * 2.0 - 1.0, 1.0 - pixel.y / uRes.y * 2.0, 0.0, 1.0);
  gl_PointSize = uSize;
  vInk = vec4(ink, light);
}`;

const FRAG = /* glsl */ `#version 300 es
precision mediump float;
in vec4 vInk;
out vec4 outColor;
void main() {
  float light = (1.0 - smoothstep(0.43, 0.47, length(gl_PointCoord - 0.5))) * vInk.a;
  outColor = vec4(vInk.rgb * light, clamp(light * max(vInk.r, max(vInk.g, vInk.b)), 0.0, 1.0));
}`;

function createStars(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, premultipliedAlpha: true });
  if (!gl) return null;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vert = compile(gl.VERTEX_SHADER, VERT);
  const frag = compile(gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!vert || !frag || !program) return null;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const styles = getComputedStyle(canvas);
  gl.uniform3fv(
    uniform("uPrism"),
    PRISM.flatMap((name) => hexToRgb(styles.getPropertyValue(`--orbit-star-${name}`)))
  );
  const uniforms = {
    res: uniform("uRes"),
    card: uniform("uCard"),
    half: uniform("uHalf"),
    area: uniform("uArea"),
    cells: uniform("uCells"),
    corner: uniform("uCorner"),
    reach: uniform("uReach"),
    pitch: uniform("uPitch"),
    size: uniform("uSize"),
    ratio: uniform("uRatio"),
    time: uniform("uTime"),
    boot: uniform("uBoot"),
  };

  return {
    draw(card: DOMRect, time: number, boot: number) {
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_RATIO);
      const width = Math.round(window.innerWidth * ratio);
      const height = Math.round(window.innerHeight * ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      // One grid over the window, which no star leaves.
      const pitch = Math.round(GRID * ratio) / ratio;
      const columns = Math.ceil(window.innerWidth / pitch);
      const rows = Math.ceil(window.innerHeight / pitch);
      const area = pickArea();

      gl.uniform2f(uniforms.res, window.innerWidth, window.innerHeight);
      gl.uniform2f(uniforms.card, card.left + card.width / 2, card.top + card.height / 2);
      gl.uniform2f(uniforms.half, card.width / 2, card.height / 2);
      gl.uniform4f(uniforms.area, area.left, area.top, area.right, area.bottom);
      gl.uniform2i(uniforms.cells, columns, rows);
      gl.uniform1f(uniforms.corner, CORNER);
      gl.uniform1f(uniforms.reach, REACH);
      gl.uniform1f(uniforms.pitch, pitch);
      gl.uniform1f(uniforms.size, Math.max(1, Math.round(STAR * ratio)));
      gl.uniform1f(uniforms.ratio, ratio);
      gl.uniform1f(uniforms.time, time);
      gl.uniform1f(uniforms.boot, boot);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, columns * rows);
    },
  };
}

interface TourStarsProps {
  cardRef: React.RefObject<HTMLElement>;
  /** Off, it fades out and stops drawing. */
  on: boolean;
  /** Time for the card and the page. At once when there is no boot to wait for. */
  onLanded: () => void;
}

/**
 * Radial's stars around a card, on Radial's grid in the prism's colours, with currents of light
 * running through them. They boot once: no star moves, a shape is drawn across them by their opacity
 * and colour, a tipped disc of arms that fills the window, gathers in the heart and stays there,
 * while a ripple goes out from it and the field at rest spreads after it. One draw of points on one canvas, drawn only while `on`. Decoration, so
 * it gives way easily: one still frame with reduced motion, and nothing without WebGL2.
 */
export function TourStars({ cardRef, on, onLanded }: TourStarsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef<() => void>(() => {});
  const startRef = useRef<() => void>(() => {});
  const landedRef = useRef(onLanded);
  landedRef.current = onLanded;

  // Before the first paint: without a boot, there is no black to see.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const stars = createStars(canvas);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!stars || still) landedRef.current();
    if (!stars) return;

    let drawing: typeof stars | null = stars;
    let frame = 0;
    let time = still ? 20 : 0;
    let last = 0;
    // The boot goes by the clock: on a slow machine it drops frames, it doesn't take longer, so
    // nobody sits in the black.
    let began = still ? -Infinity : 0;
    let landed = still;

    const draw = (now: number) => {
      const card = cardRef.current;
      const boot = began === 0 ? 0 : Math.min((now - began) / 1000 / BOOT, 1);
      if (card) drawing?.draw(card.getBoundingClientRect(), time, boot);
      if (!landed && boot >= GATHER) {
        landed = true;
        landedRef.current();
      }
    };
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (!began) began = now;
      // A hidden tab stops the frames; the stars pick up where they were.
      time += Math.min(0.1, (now - (last || now)) / 1000);
      last = now;
      draw(now);
    };
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };
    const start = () => {
      if (still) return draw(performance.now());
      if (frame) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };
    stopRef.current = stop;
    startRef.current = start;

    // Only needed while nothing else draws: with reduced motion, and once it stands still.
    const redraw = () => {
      if (!frame) draw(performance.now());
    };
    const resize = new ResizeObserver(redraw);
    if (cardRef.current) resize.observe(cardRef.current);
    window.addEventListener("resize", redraw);

    const onLost = (e: Event) => {
      e.preventDefault();
      stop();
      drawing = null;
      landedRef.current();
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      stop();
      resize.disconnect();
      window.removeEventListener("resize", redraw);
      canvas.removeEventListener("webglcontextlost", onLost);
      stopRef.current = () => {};
      startRef.current = () => {};
      // The context stays: a canvas gives the same one back, and StrictMode runs this effect
      // twice. It goes with the canvas.
    };
  }, [cardRef]);

  useEffect(() => {
    if (on) {
      startRef.current();
      return;
    }
    const timer = window.setTimeout(() => stopRef.current(), OFF_MS);
    return () => window.clearTimeout(timer);
  }, [on]);

  return React.createElement("canvas", {
    ref: canvasRef,
    [ORBIT_UI_ATTR]: "",
    "aria-hidden": true,
    className: cx("orbit-root orbit-tour__stars", !on && "orbit-tour__stars--off"),
  });
}
