import { ringRadius } from "../utils/pick-element";
import { hexToRgb } from "../utils/tour";

export const PRISM = ["amber", "peach", "ice", "cyan", "blue"];

// Off the element, in CSS px: where stars leave from, just past its edge.
const GAP = 3;
// CSS px of rim for each star it lets go, and at least this many, around the smallest button.
const SPACING = 5;
const LEAST = 44;
// Seconds to come up on a new element.
const SHOW = 0.7;
/** The tour's canvas draws at no more than this, and its stars are this big, in CSS px. */
export const MAX_RATIO = 2;
export const STAR = 1.08;

/** What both shaders of the tour share. `prism` reads their `uPrism`. */
export const STAR_GLSL = /* glsl */ `
float hash(vec2 c) {
  vec3 p = fract(vec3(c.xyx) * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

// pow() of a negative is undefined in GLSL, and engines differ: some give 0, Firefox gives NaN, and
// NaN times 0 is still NaN, which lit every star past the ring. So: no pow() without a guard.
float square(float x) {
  return x * x;
}

vec3 prism(float t) {
  float x = clamp(t, 0.0, 1.0) * 4.0;
  int i = int(min(x, 3.0));
  return mix(uPrism[i], uPrism[i + 1], x - float(i));
}
`;

/**
 * What the tour points at, after Radial's home core: a corona, stars the element lets go, leaving
 * its rim on straight lines, fading as they go, each at its own slow pace. These stars glide on
 * whole pixels, as Radial's core does, and stand on no grid.
 */
const VERT = /* glsl */ `#version 300 es
uniform vec2 uRes;
uniform vec4 uBox;
uniform float uCorner;
uniform float uLength;
uniform float uSize;
uniform float uRatio;
uniform float uTime;
uniform float uShow;
uniform vec3 uPrism[5];
out vec4 vInk;

const float PACE = 0.13;  // how often a star leaves, a second, before its own speed
const float NEAR = 26.0;  // CSS px: how far the closest fade out
const float FAR = 96.0;   // and the furthest
const float PI = 3.14159265;

${STAR_GLSL}

// A place on the rim of the rounded box, \`u\` CSS px along it clockwise from the top left: xy, and
// the way out from it: zw.
vec4 onRim(float u) {
  vec2 from = uBox.xy + uCorner;
  vec2 inner = uBox.zw - 2.0 * uCorner;
  float arc = PI * uCorner * 0.5;
  vec2 c;
  float at = u;
  if (at < inner.x) return vec4(from.x + at, uBox.y, 0.0, -1.0);
  at -= inner.x;
  if (at < arc) { c = from + vec2(inner.x, 0.0); float a = at / uCorner; return vec4(c + uCorner * vec2(sin(a), -cos(a)), sin(a), -cos(a)); }
  at -= arc;
  if (at < inner.y) return vec4(uBox.x + uBox.z, from.y + at, 1.0, 0.0);
  at -= inner.y;
  if (at < arc) { c = from + inner; float a = at / uCorner; return vec4(c + uCorner * vec2(cos(a), sin(a)), cos(a), sin(a)); }
  at -= arc;
  if (at < inner.x) return vec4(from.x + inner.x - at, uBox.y + uBox.w, 0.0, 1.0);
  at -= inner.x;
  if (at < arc) { c = from + vec2(0.0, inner.y); float a = at / uCorner; return vec4(c + uCorner * vec2(-sin(a), cos(a)), -sin(a), cos(a)); }
  at -= arc;
  if (at < inner.y) return vec4(uBox.x, from.y + inner.y - at, -1.0, 0.0);
  at -= inner.y;
  c = from;
  float a = at / uCorner;
  return vec4(c + uCorner * vec2(-cos(a), -sin(a)), -cos(a), -sin(a));
}

void main() {
  float id = float(gl_VertexID);
  float seed = hash(vec2(id, 7.0));
  float other = hash(vec2(id, 19.0));

  // Out of the rim along its own line, coming up as it leaves and fading.
  vec4 rim = onRim(hash(vec2(id, 3.0)) * uLength);
  float flown = fract(uTime * PACE * (0.6 + seed) + other);
  vec2 at = rim.xy + rim.zw * flown * mix(NEAR, FAR, seed * seed);
  float light = min(smoothstep(0.0, 0.12, flown) * square(1.0 - flown) * 1.5, 1.0) * uShow;
  vec3 ink = prism(0.5 + 0.5 * flown);

  float odd = mod(uSize, 2.0) * 0.5;
  vec2 pixel = (floor(at * uRatio + 0.5 - odd) + odd) / uRatio;
  gl_Position = vec4(pixel.x / uRes.x * 2.0 - 1.0, 1.0 - pixel.y / uRes.y * 2.0, 0.0, 1.0);
  gl_PointSize = uSize;
  vInk = vec4(ink, sqrt(max(light, 0.0)));
}`;

/** A program from its two shaders; null where it doesn't build. */
export function buildProgram(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vert = compile(gl.VERTEX_SHADER, vertex);
  const frag = compile(gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!vert || !frag || !program) return null;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

/** The prism's colours from their tokens, as a shader takes them. */
export function prismColours(styles: CSSStyleDeclaration) {
  return PRISM.flatMap((name) => hexToRgb(styles.getPropertyValue(`--orbit-star-${name}`)));
}

export function createCorona(gl: WebGL2RenderingContext, styles: CSSStyleDeclaration, fragment: string) {
  const program = buildProgram(gl, VERT, fragment);
  if (!program) return null;
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  gl.useProgram(program);
  gl.uniform3fv(uniform("uPrism"), prismColours(styles));
  const uniforms = {
    res: uniform("uRes"),
    box: uniform("uBox"),
    corner: uniform("uCorner"),
    length: uniform("uLength"),
    size: uniform("uSize"),
    ratio: uniform("uRatio"),
    time: uniform("uTime"),
    show: uniform("uShow"),
  };

  let shown: Element | null = null;
  let since = 0;
  let corner = 0;

  return {
    draw(element: Element | null, time: number) {
      if (element !== shown) {
        shown = element;
        since = time;
        // The ring's own: `50%` or `9999px` come out as a radius of this element, past the gap.
        corner = element ? parseFloat(ringRadius(element as HTMLElement, GAP)) : 0;
      }
      if (!element) return;
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_RATIO);
      const width = rect.width + GAP * 2;
      const height = rect.height + GAP * 2;
      const round = Math.min(corner, width / 2, height / 2);
      const rim = 2 * (width + height) - 8 * round + 2 * Math.PI * round;

      gl.useProgram(program);
      gl.uniform2f(uniforms.res, window.innerWidth, window.innerHeight);
      gl.uniform4f(uniforms.box, rect.left - GAP, rect.top - GAP, width, height);
      gl.uniform1f(uniforms.corner, round);
      gl.uniform1f(uniforms.length, rim);
      gl.uniform1f(uniforms.size, Math.max(1, Math.round(STAR * ratio)));
      gl.uniform1f(uniforms.ratio, ratio);
      gl.uniform1f(uniforms.time, time);
      gl.uniform1f(uniforms.show, Math.min((time - since) / SHOW, 1));
      gl.drawArrays(gl.POINTS, 0, Math.max(LEAST, Math.floor(rim / SPACING)));
    },
  };
}
