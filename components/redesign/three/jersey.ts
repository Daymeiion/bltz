import * as THREE from "three";

// A football jersey hung back-out on a hanger, built like a real garment rather
// than from primitives: one continuous cloth shape (body and sleeves cut as a
// single silhouette) with a back panel and a front panel that meet at the side,
// shoulder and underarm seams and stay open at the hem, cuffs and collar. The
// panels are inflated to the body's thickness, then draped: hanger sag folds
// from the shoulders, long gravity folds in the lower body, sleeve creases and
// a wavy hem. The back is textured from painted maps: satin yoke and sleeves,
// open-hole mesh body, stitched seams, cuff trim, and twill name and number,
// with matching height (normal) and roughness maps so satin catches the light
// and mesh stays matte.

// ---------- layout (meters, group space; collar top ≈ y 0.11) ----------
const XMIN = -0.48;
const XMAX = 0.48;
const YMIN = -0.85;
const YMAX = 0.14;
const TEX_W = 1024;
const PPM = TEX_W / (XMAX - XMIN); // texture pixels per meter
const TEX_H = Math.round((YMAX - YMIN) * PPM);
const px = (x: number) => (x - XMIN) * PPM;
const py = (y: number) => (YMAX - y) * PPM;

const NAVY = "#1d2752";
const NAVY_MESH = "#1b2654";
const NAVY_RIB = "#121936";
const GOLD = "#e9ad1c";
const WHITE = "#f1efe8";

const DEPTH = 0.07; // half thickness of the body
const ROUND = 0.1; // how far in from a seam the cloth reaches full thickness

type Kind = "seam" | "open";
// Right half of the outline, collar center → around → hem center. Each point's
// kind applies to the segment that leaves it.
const HALF: [number, number, Kind][] = [
  [0, 0.088, "open"], // back neckline
  [0.048, 0.096, "open"],
  [0.086, 0.113, "seam"], // neck side → shoulder seam
  [0.15, 0.094, "seam"],
  [0.212, 0.068, "seam"], // shoulder point
  [0.3, 0.012, "seam"],
  [0.39, -0.062, "seam"],
  [0.445, -0.112, "open"], // cuff
  [0.358, -0.232, "seam"], // underarm seam
  [0.29, -0.207, "seam"],
  [0.229, -0.19, "seam"], // armpit → side seam
  [0.222, -0.32, "seam"],
  [0.218, -0.5, "seam"],
  [0.226, -0.7, "seam"],
  [0.234, -0.806, "open"], // hem
  [0.12, -0.816, "open"],
];
const CUFF: [number, number][] = [
  [0.445, -0.112],
  [0.358, -0.232],
];

type Seg = { ax: number; ay: number; bx: number; by: number; open: boolean };

function buildOutline() {
  // Closed loop: right half, hem center, mirrored left half back up.
  const ctrl: [number, number, Kind][] = [...HALF, [0, -0.82, "open"]];
  for (let i = HALF.length - 1; i >= 1; i--) {
    const [x, y] = HALF[i];
    // On the way back up, the segment leaving a point has the kind of the
    // segment that arrived at its mirror.
    ctrl.push([-x, y, HALF[i - 1][2]]);
  }
  const n = ctrl.length;
  const pts: { x: number; y: number; open: boolean }[] = [];
  const SUB = 10;
  for (let i = 0; i < n; i++) {
    const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
    // Corners at the cuffs and hem stay crisp; everything else is smoothed.
    const sharp = p1[2] !== p0[2] || p2[2] !== p1[2];
    for (let k = 0; k < SUB; k++) {
      const t = k / SUB;
      let x: number, y: number;
      if (sharp) {
        x = p1[0] + (p2[0] - p1[0]) * t;
        y = p1[1] + (p2[1] - p1[1]) * t;
      } else {
        const cr = (a: number, b: number, c: number, d: number) =>
          0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
        x = cr(p0[0], p1[0], p2[0], p3[0]);
        y = cr(p0[1], p1[1], p2[1], p3[1]);
      }
      pts.push({ x, y, open: p1[2] === "open" });
    }
  }
  const segs: Seg[] = pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return { ax: p.x, ay: p.y, bx: q.x, by: q.y, open: p.open };
  });
  return { pts, segs };
}

const OUTLINE = buildOutline();

function inside(x: number, y: number) {
  let c = false;
  for (const s of OUTLINE.segs) {
    if (s.ay > y !== s.by > y && x < ((s.bx - s.ax) * (y - s.ay)) / (s.by - s.ay) + s.ax) c = !c;
  }
  return c;
}

function nearest(x: number, y: number, filter?: (s: Seg) => boolean) {
  let best = Infinity, bx = x, by = y, open = false;
  for (const s of OUTLINE.segs) {
    if (filter && !filter(s)) continue;
    const dx = s.bx - s.ax, dy = s.by - s.ay;
    const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (y - s.ay) * dy) / (dx * dx + dy * dy || 1)));
    const cx = s.ax + dx * t, cy = s.ay + dy * t;
    const d = (x - cx) ** 2 + (y - cy) ** 2;
    if (d < best) {
      best = d;
      bx = cx;
      by = cy;
      open = s.open;
    }
  }
  return { d: Math.sqrt(best), x: bx, y: by, open };
}

// ---------- noise ----------
function hash(i: number, j: number, seed: number) {
  const s = Math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x: number, y: number, seed = 0) {
  const i = Math.floor(x), j = Math.floor(y);
  const u = x - i, v = y - j;
  const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const a = hash(i, j, seed), b = hash(i + 1, j, seed), c = hash(i, j + 1, seed), d = hash(i + 1, j + 1, seed);
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
}
function fbm(x: number, y: number, seed = 0) {
  return noise(x, y, seed) * 0.55 + noise(x * 2.1, y * 2.1, seed + 3) * 0.3 + noise(x * 4.3, y * 4.3, seed + 7) * 0.15;
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Fold displacement (meters, outward from the panel) at a point on the back. */
function folds(x: number, y: number) {
  const ax = Math.abs(x);
  const side = x < 0 ? -1 : 1;
  let h = 0;
  // Long gravity folds in the lower body, wandering a little as they fall.
  const lower = smooth(-0.12, -0.7, y) * (1 - smooth(0.2, 0.235, ax));
  const wander = (fbm(x * 4, y * 2.2, 1) - 0.5) * 2.4;
  h += lower * (0.013 * Math.sin(x * 30 + wander + 0.6) + 0.005 * Math.sin(x * 67 + wander * 1.7));
  // Hanger sag: diagonal folds from each shoulder point down toward the center.
  for (const off of [0, 0.055]) {
    const ox = side * (0.19 - off * 0.4), oy = 0.045 - off;
    const dx = side * -0.42, dy = -0.9; // direction toward lower center
    const len = Math.hypot(dx, dy);
    const rx = x - ox, ry = y - oy;
    const along = (rx * dx + ry * dy) / len;
    const across = (rx * dy - ry * dx) / len;
    const a = along / 0.32;
    if (a > 0 && a < 1) h += 0.011 * Math.sin(Math.PI * a) ** 1.5 * Math.exp(-((across / 0.022) ** 2)) * (off ? 0.7 : 1);
  }
  // A soft valley under the collar where the back hangs off the hanger.
  h -= 0.006 * Math.exp(-((x / 0.09) ** 2) - ((y + 0.06) / 0.08) ** 2);
  // Sleeve creases running across the sleeve, plus a fold from the armpit.
  const sleeve = smooth(0.215, 0.27, ax);
  if (sleeve > 0) {
    const sx = ax - 0.22, sy = y + 0.06;
    const along = sx * 0.85 - sy * 0.52;
    const across = sx * 0.52 + sy * 0.85;
    h += sleeve * 0.006 * Math.sin(along * 85 + fbm(ax * 9, y * 9, 4) * 3);
    h += sleeve * 0.006 * Math.exp(-(((across + 0.07) / 0.018) ** 2)) * smooth(0, 0.12, along);
  }
  // Low-frequency unevenness so nothing looks pressed.
  h += 0.005 * (fbm(x * 5, y * 5, 9) - 0.5);
  return h;
}

/** Panel thickness profile: 0 at a seam, rounding up to full depth. */
function thickness(x: number, dSeam: number) {
  const u = Math.min(1, dSeam / ROUND);
  const sleeveFlat = 1 - 0.42 * smooth(0.215, 0.3, Math.abs(x));
  return DEPTH * Math.sqrt(1 - (1 - u) * (1 - u)) * sleeveFlat;
}

function backSurface(x: number, y: number) {
  const dSeam = nearest(x, y, (s) => !s.open).d;
  const base = thickness(x, dSeam);
  const w = smooth(0, 0.045, dSeam);
  const f = folds(x, y) * w;
  return { z: base + f, fold: f, dSeam };
}

// ---------- geometry ----------
function clothGeometry() {
  const STEP = 0.006;
  const nx = Math.ceil((XMAX - XMIN) / STEP);
  const ny = Math.ceil((YMAX - YMIN) / STEP);
  const row = nx + 1;
  const isIn = new Uint8Array(row * (ny + 1));
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) isIn[j * row + i] = inside(XMIN + i * STEP, YMIN + j * STEP) ? 1 : 0;
  }
  // A cell is cloth if any corner is inside; outside corners snap to the edge.
  const used = new Uint8Array(row * (ny + 1));
  const cells: number[] = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * row + i;
      if (isIn[a] || isIn[a + 1] || isIn[a + row] || isIn[a + row + 1]) {
        cells.push(a);
        used[a] = used[a + 1] = used[a + row] = used[a + row + 1] = 1;
      }
    }
  }
  const remap = new Int32Array(row * (ny + 1)).fill(-1);
  const back: number[] = [];
  const front: number[] = [];
  const uv: number[] = [];
  const shade: number[] = [];
  let count = 0;
  for (let k = 0; k < used.length; k++) {
    if (!used[k]) continue;
    let x = XMIN + (k % row) * STEP;
    let y = YMIN + Math.floor(k / row) * STEP;
    if (!isIn[k]) {
      const n = nearest(x, y);
      x = n.x;
      y = n.y;
    }
    const { z, fold, dSeam } = backSurface(x, y);
    // Hem and cuffs hang in soft waves.
    const hemWave = smooth(-0.74, -0.81, y) * 0.005 * Math.sin(x * 38 + 1.2);
    const yy = y + hemWave;
    back.push(x, yy, z);
    const fz = thickness(x, dSeam) + folds(-x * 1.13 + 0.3, y * 0.97 - 0.1) * 0.6 * smooth(0, 0.045, dSeam);
    front.push(x, yy, -fz);
    uv.push((x - XMIN) / (XMAX - XMIN), (y - YMIN) / (YMAX - YMIN));
    // Baked occlusion: fold valleys and the roll into each seam sit darker.
    const ao = Math.max(0.55, 1 - Math.max(0, -fold) * 38 - (1 - smooth(0, 0.05, dSeam)) * 0.18);
    shade.push(ao);
    remap[k] = count++;
  }
  const positions = new Float32Array(count * 6);
  positions.set(back, 0);
  positions.set(front, count * 3);
  const uvs = new Float32Array(count * 4);
  uvs.set(uv, 0);
  uvs.set(uv, count * 2);
  const colors = new Float32Array(count * 6);
  for (let v = 0; v < count; v++) {
    colors.fill(shade[v], v * 3, v * 3 + 3);
    colors.fill(shade[v] * 0.85, (count + v) * 3, (count + v) * 3 + 3);
  }
  const index: number[] = [];
  for (const a of cells) {
    const p = [remap[a], remap[a + 1], remap[a + row + 1], remap[a + row]];
    index.push(p[0], p[1], p[2], p[0], p[2], p[3]);
  }
  const backTris = index.length;
  for (let t = 0; t < backTris; t += 3) index.push(index[t] + count, index[t + 2] + count, index[t + 1] + count);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setIndex(index);
  geo.addGroup(0, backTris, 0);
  geo.addGroup(backTris, backTris, 1);
  geo.computeVertexNormals();
  return geo;
}

/** The ribbed collar follows the open neckline around the front and back panels. */
function collarGeometry() {
  const pts: THREE.Vector3[] = [];
  const neck = OUTLINE.pts.filter((p) => p.open && p.y > 0);
  neck.sort((a, b) => a.x - b.x);
  for (const p of neck) pts.push(new THREE.Vector3(p.x, p.y, backSurface(p.x, p.y).z * 0.92));
  // Front of the collar dips into a shallow V.
  for (let i = neck.length - 1; i >= 0; i--) {
    const p = neck[i];
    const v = 1 - Math.abs(p.x) / 0.086;
    pts.push(new THREE.Vector3(p.x, p.y + 0.012 - v * 0.05, -backSurface(p.x, p.y).z * 0.92));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, "centripetal"), 120, 0.0085, 10, true);
}

// ---------- painted maps ----------
type Layer = "color" | "height" | "rough";

function tile(size: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!);
  return c;
}

const yokeY = (x: number) => -0.04 - 0.012 * (x / 0.215) ** 2;

function bodyPath(g: CanvasRenderingContext2D) {
  g.beginPath();
  g.moveTo(px(-0.218), py(yokeY(-0.218)));
  for (let x = -0.21; x <= 0.218; x += 0.01) g.lineTo(px(x), py(yokeY(x)));
  g.lineTo(px(0.218), py(yokeY(0.218)));
  g.lineTo(px(0.229), py(-0.19));
  g.lineTo(px(0.3), py(-0.95));
  g.lineTo(px(-0.3), py(-0.95));
  g.lineTo(px(-0.229), py(-0.19));
  g.closePath();
}

function seamLines(): [number, number][][] {
  const yoke: [number, number][] = [];
  for (let x = -0.218; x <= 0.2181; x += 0.01) yoke.push([x, yokeY(x)]);
  return [
    yoke,
    [[0.212, 0.068], [0.216, -0.06], [0.229, -0.19]],
    [[-0.212, 0.068], [-0.216, -0.06], [-0.229, -0.19]],
  ];
}

function strokePoly(g: CanvasRenderingContext2D, pts: [number, number][], offY = 0) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(px(x), py(y) + offY) : g.moveTo(px(x), py(y) + offY)));
  g.stroke();
}

function fitFont(g: CanvasRenderingContext2D, text: string, font: string, start: number, maxW: number) {
  let size = start;
  g.font = `700 ${size}px ${font}`;
  while (g.measureText(text).width > maxW && size > 20) {
    size -= 3;
    g.font = `700 ${size}px ${font}`;
  }
  return size;
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function paint(g: CanvasRenderingContext2D, name: string, number: string, font: string, layer: Layer) {
  const W = TEX_W, H = TEX_H;
  const col = layer === "color", hgt = layer === "height";
  const v = (c: string, h: number, r: number) => (col ? c : hgt ? `rgb(${h},${h},${h})` : `rgb(0,${r},0)`);
  g.save();
  g.clearRect(0, 0, W, H);

  // satin base (yoke + sleeves) with a fine diagonal weave
  g.fillStyle = v(NAVY, 128, 92);
  g.fillRect(0, 0, W, H);
  if (hgt) {
    g.fillStyle = g.createPattern(tile(4, (t) => { t.fillStyle = "rgba(255,255,255,0.09)"; for (let i = 0; i < 4; i++) t.fillRect(i, i, 1, 1); }), "repeat")!;
    g.fillRect(0, 0, W, H);
  }

  // mesh body: open-hole knit
  g.save();
  bodyPath(g);
  g.clip();
  g.fillStyle = v(NAVY_MESH, 150, 210);
  g.fillRect(0, 0, W, H);
  if (!layer.startsWith("r")) {
    const meshTile = tile(8, (t) => {
      t.fillStyle = col ? "rgba(6,10,38,0.55)" : "rgb(60,60,60)";
      for (const [cx, cy] of [[2, 2], [6, 6]]) {
        t.beginPath();
        t.arc(cx, cy, 1.45, 0, Math.PI * 2);
        t.fill();
      }
    });
    g.fillStyle = g.createPattern(meshTile, "repeat")!;
    g.fillRect(0, 0, W, H);
  }
  g.restore();

  // seams: a raised ridge with twin topstitching on the body side
  for (const line of seamLines()) {
    g.lineCap = "round";
    g.setLineDash([]);
    g.lineWidth = hgt ? 5 : 2.5;
    g.strokeStyle = col ? "rgba(0,0,0,0.38)" : hgt ? "rgb(185,185,185)" : "rgb(0,120,0)";
    strokePoly(g, line);
    g.setLineDash([5, 4]);
    g.lineWidth = 1.6;
    g.strokeStyle = col ? "rgba(255,255,255,0.10)" : hgt ? "rgb(95,95,95)" : "rgb(0,170,0)";
    strokePoly(g, line, 6);
    strokePoly(g, line, 11);
  }
  g.setLineDash([]);

  // cuff trim: ribbed band along the opening, then a gold stripe
  for (const s of [-1, 1]) {
    const [c1, c2] = CUFF.map(([x, y]) => [x * s, y] as [number, number]);
    const ex = c2[0] - c1[0], ey = c2[1] - c1[1];
    const el = Math.hypot(ex, ey);
    const e = [ex / el, ey / el];
    let n = [-e[1], e[0]];
    if (n[0] * (0.2 * s - c1[0]) + n[1] * (0.05 - c1[1]) < 0) n = [-n[0], -n[1]];
    const band = (a: number, b: number, fill: string) => {
      const ext = 0.05;
      const p = [
        [c1[0] - e[0] * ext + n[0] * a, c1[1] - e[1] * ext + n[1] * a],
        [c2[0] + e[0] * ext + n[0] * a, c2[1] + e[1] * ext + n[1] * a],
        [c2[0] + e[0] * ext + n[0] * b, c2[1] + e[1] * ext + n[1] * b],
        [c1[0] - e[0] * ext + n[0] * b, c1[1] - e[1] * ext + n[1] * b],
      ];
      g.fillStyle = fill;
      g.beginPath();
      p.forEach(([x, y], i) => (i ? g.lineTo(px(x), py(y)) : g.moveTo(px(x), py(y))));
      g.closePath();
      g.fill();
    };
    band(-0.01, 0.026, v(NAVY_RIB, 140, 215));
    if (hgt) for (let k = 0; k < 0.026; k += 0.004) band(k, k + 0.0015, "rgb(175,175,175)");
    band(0.032, 0.043, v(GOLD, 150, 110));
  }

  // collar: thin gold stripe under the neckline, brand tab
  g.lineWidth = 0.006 * PPM;
  g.strokeStyle = v(GOLD, 150, 110);
  g.beginPath();
  for (let x = -0.084; x <= 0.0841; x += 0.006) {
    const y = 0.088 + 0.024 * (x / 0.086) ** 2 - 0.016;
    if (x === -0.084) g.moveTo(px(x), py(y));
    else g.lineTo(px(x), py(y));
  }
  g.stroke();
  g.fillStyle = v("rgba(241,239,232,0.85)", 170, 150);
  g.fillRect(px(-0.022), py(0.058), 0.044 * PPM, 0.016 * PPM);

  // hem: double needle stitching
  g.setLineDash([6, 5]);
  g.lineWidth = 1.8;
  g.strokeStyle = col ? "rgba(255,255,255,0.12)" : hgt ? "rgb(80,80,80)" : "rgb(0,200,0)";
  for (const off of [0.02, 0.028]) {
    g.beginPath();
    for (let x = -0.24; x <= 0.2401; x += 0.01) {
      const y = -0.818 + 0.012 * (x / 0.234) ** 2 + off;
      if (x === -0.24) g.moveTo(px(x), py(y));
      else g.lineTo(px(x), py(y));
    }
    g.stroke();
  }
  g.setLineDash([]);

  // twill name, gently arched
  const label = (name.trim().split(/\s+/).pop() || "YOU").toUpperCase();
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  const nameSize = fitFont(g, label, font, Math.round(0.072 * PPM), 0.34 * PPM);
  const spacing = nameSize * 0.07;
  const widths = [...label].map((ch) => g.measureText(ch).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = W / 2 - total / 2;
  const base = py(-0.026);
  if (hgt) g.filter = "blur(1.2px)";
  [...label].forEach((ch, i) => {
    const mid = cx + widths[i] / 2;
    const t = (mid - W / 2) / (total / 2 || 1);
    const y = base + t * t * 0.008 * PPM;
    g.fillStyle = v(WHITE, 205, 180);
    g.fillText(ch, mid, y);
    cx += widths[i];
  });
  g.filter = "none";

  // twill number: gold under-layer, white top layer, edge stitching
  const numSize = Math.round((number.length > 1 ? 0.4 : 0.45) * PPM);
  g.font = `700 ${numSize}px ${font}`;
  g.textBaseline = "middle";
  g.lineJoin = "round";
  const nx = W / 2, ny = py(-0.37);
  if (hgt) g.filter = "blur(1.4px)";
  g.lineWidth = 0.02 * PPM;
  g.strokeStyle = v(GOLD, 185, 165);
  g.strokeText(number, nx, ny);
  g.fillStyle = v(WHITE, 215, 185);
  g.fillText(number, nx, ny);
  g.filter = "none";
  g.setLineDash([5, 5]);
  g.lineWidth = 1.6;
  g.strokeStyle = col ? "rgba(40,44,70,0.45)" : hgt ? "rgb(150,150,150)" : "rgb(0,185,0)";
  g.strokeText(number, nx, ny);
  g.setLineDash([]);

  // fine creases pressed into the cloth (height only), and heather in color
  const rnd = seeded(7);
  if (hgt) {
    g.filter = "blur(5px)";
    g.lineCap = "round";
    for (let k = 0; k < 26; k++) {
      const x0 = -0.21 + rnd() * 0.42, y0 = -0.2 - rnd() * 0.55;
      const len = 0.06 + rnd() * 0.16;
      const ang = Math.PI / 2 + (rnd() - 0.5) * 0.7;
      g.strokeStyle = rnd() > 0.5 ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
      g.lineWidth = 4 + rnd() * 6;
      g.beginPath();
      g.moveTo(px(x0), py(y0));
      g.quadraticCurveTo(px(x0 + (rnd() - 0.5) * 0.04), py(y0 - len / 2), px(x0 + Math.cos(ang) * 0.02), py(y0 - len));
      g.stroke();
    }
    g.filter = "none";
  } else if (col) {
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${rnd() * 0.035})` : `rgba(0,0,0,${rnd() * 0.05})`;
      g.fillRect(rnd() * W, rnd() * H, 2, 2);
    }
  }
  g.restore();
}

/** Turns a grayscale height canvas into a tangent-space normal map. */
function heightToNormal(src: HTMLCanvasElement, strength: number) {
  const w = src.width;
  const h = src.height;
  const data = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const at = (x: number, y: number) => data[(Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/** Inside surfaces (seen through the hem, cuffs and collar) fall into shadow. */
function shadeInside(mat: THREE.Material) {
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      "gl_FragColor.rgb *= gl_FrontFacing ? 1.0 : 0.3;\n#include <dithering_fragment>",
    );
  };
}

function hangerGeometry() {
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.05, 0.2, -0.02),
    new THREE.Vector3(0.04, 0.25, -0.01),
    new THREE.Vector3(0, 0.27, 0),
    new THREE.Vector3(-0.035, 0.24, 0.005),
    new THREE.Vector3(0, 0.18, 0.006),
    new THREE.Vector3(0, 0.07, 0),
  ]);
  const hook = new THREE.TubeGeometry(path, 40, 0.007, 10, false);
  // The bar sits inside the shoulders, as on a real hanger.
  const bar = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.2, 0.02, 0),
      new THREE.Vector3(-0.1, 0.05, 0),
      new THREE.Vector3(0, 0.07, 0),
      new THREE.Vector3(0.1, 0.05, 0),
      new THREE.Vector3(0.2, 0.02, 0),
    ]),
    40,
    0.011,
    10,
    false,
  );
  return [hook, bar];
}

export function createJersey(font: string, initialName: string, number = "1") {
  const mk = (w: number, h: number) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  };
  const colorCanvas = mk(TEX_W, TEX_H);
  const roughCanvas = mk(TEX_W, TEX_H);
  const heightCanvas = mk(TEX_W, TEX_H);

  const colorTex = new THREE.CanvasTexture(colorCanvas);
  colorTex.colorSpace = THREE.SRGBColorSpace;
  colorTex.anisotropy = 8;
  const roughTex = new THREE.CanvasTexture(roughCanvas);
  roughTex.anisotropy = 8;
  const normalTex = new THREE.CanvasTexture(heightToNormal(heightCanvas, 1));
  normalTex.anisotropy = 8;

  const cloth = {
    metalness: 0,
    sheen: 0.8,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color("#3a4a8e"),
    specularIntensity: 0.7,
    vertexColors: true,
    side: THREE.DoubleSide,
  } as const;
  const backMat = new THREE.MeshPhysicalMaterial({
    ...cloth,
    map: colorTex,
    roughness: 1,
    roughnessMap: roughTex,
    normalMap: normalTex,
    normalScale: new THREE.Vector2(0.85, 0.85),
  });
  const frontMat = new THREE.MeshPhysicalMaterial({ ...cloth, color: NAVY_MESH, roughness: 0.75 });
  const collarMat = new THREE.MeshPhysicalMaterial({
    ...cloth,
    vertexColors: false,
    color: NAVY_RIB,
    roughness: 0.85,
    sheenColor: new THREE.Color("#3d4778"),
  });
  [backMat, frontMat].forEach(shadeInside);

  const redraw = (name: string) => {
    paint(colorCanvas.getContext("2d")!, name, number, font, "color");
    paint(roughCanvas.getContext("2d")!, name, number, font, "rough");
    paint(heightCanvas.getContext("2d")!, name, number, font, "height");
    normalTex.image = heightToNormal(heightCanvas, 1.7);
    normalTex.needsUpdate = true;
    colorTex.needsUpdate = true;
    roughTex.needsUpdate = true;
  };
  redraw(initialName);

  const clothGeo = clothGeometry();
  const body = new THREE.Mesh(clothGeo, [backMat, frontMat]);
  body.castShadow = true;
  body.receiveShadow = true;

  const collarGeo = collarGeometry();
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.castShadow = true;

  const metal = new THREE.MeshStandardMaterial({ color: "#c9ccd2", metalness: 1, roughness: 0.22 });
  const [hookGeo, barGeo] = hangerGeometry();
  const hook = new THREE.Mesh(hookGeo, metal);
  const bar = new THREE.Mesh(barGeo, metal);

  const group = new THREE.Group();
  group.add(body, collar, hook, bar);

  return {
    group,
    redraw,
    dispose() {
      [clothGeo, collarGeo, hookGeo, barGeo, backMat, frontMat, collarMat, metal, colorTex, roughTex, normalTex].forEach((d) => d.dispose());
    },
  };
}
