import * as THREE from "three";

// A football jersey hung back-out on a hanger, built as a real garment: a
// rounded torso with thickness (shoulder yoke, open hem, soft drape folds),
// two striped sleeves, a collar ring and a hanger tucked inside the shoulders.
// The back graphics (twill name and number with layered outlines, collar trim,
// side mesh panels, stitching) are painted to a canvas and projected onto the
// torso, with a normal map generated from a knit-and-twill height field and a
// sheen fabric material. Text redraws in place when the athlete's name changes.

const TEX_W = 1024;
const TEX_H = 1280;
const NAVY = "#172b86";
const NAVY_DARK = "#0c1852";
const GOLD = "#f2b51b";
const WHITE = "#f3f1ea";

const JERSEY_W = 0.8;

function fitFont(g: CanvasRenderingContext2D, text: string, font: string, start: number, maxW: number) {
  let size = start;
  g.font = `700 ${size}px ${font}`;
  while (g.measureText(text).width > maxW && size > 24) {
    size -= 4;
    g.font = `700 ${size}px ${font}`;
  }
  return size;
}

type Layer = "color" | "height";

/** Draws either the color map or the height map (white = raised). */
function paint(g: CanvasRenderingContext2D, name: string, number: string, font: string, layer: Layer) {
  const w = TEX_W;
  const h = TEX_H;
  const isColor = layer === "color";
  g.clearRect(0, 0, w, h);
  if (!isColor) {
    g.fillStyle = "#000";
    g.fillRect(0, 0, w, h);
  }

  g.save();

  // body
  if (isColor) {
    const body = g.createLinearGradient(0, 0, w, 0);
    body.addColorStop(0, NAVY_DARK);
    body.addColorStop(0.24, NAVY);
    body.addColorStop(0.5, "#1d3394");
    body.addColorStop(0.76, NAVY);
    body.addColorStop(1, NAVY_DARK);
    g.fillStyle = body;
  } else {
    g.fillStyle = "#3a3a3a";
  }
  g.fillRect(0, 0, w, h);

  // knit texture (height) / faint heather (color)
  if (!isColor) {
    g.fillStyle = "rgba(255,255,255,0.10)";
    for (let y = 0; y < h; y += 6) {
      for (let x = (y / 6) % 2 ? 3 : 0; x < w; x += 6) g.fillRect(x, y, 3, 3);
    }
  } else {
    for (let i = 0; i < 6000; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }

  // side mesh panels (airflow)
  for (const x0 of [w * 0.2, w * 0.71]) {
    g.fillStyle = isColor ? "rgba(0,0,0,0.14)" : "rgba(0,0,0,0.5)";
    g.fillRect(x0, 330, w * 0.09, h);
    g.fillStyle = isColor ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.25)";
    for (let y = 340; y < h; y += 10) for (let x = x0 + 4; x < x0 + w * 0.09; x += 10) g.fillRect(x, y, 4, 4);
  }

  // collar trim
  g.lineWidth = 22;
  g.strokeStyle = isColor ? GOLD : "#6a6a6a";
  g.beginPath();
  g.moveTo(w * 0.35, 66);
  g.bezierCurveTo(w * 0.42, 96, w * 0.58, 96, w * 0.65, 66);
  g.stroke();
  g.lineWidth = 8;
  g.strokeStyle = isColor ? WHITE : "#6a6a6a";
  g.beginPath();
  g.moveTo(w * 0.35, 88);
  g.bezierCurveTo(w * 0.42, 116, w * 0.58, 116, w * 0.65, 88);
  g.stroke();

  // brand tab under collar
  g.fillStyle = isColor ? "rgba(243,241,234,0.85)" : "#777";
  g.fillRect(w / 2 - 28, 128, 56, 22);

  // name bar (twill letters, slightly arched by drawing per-letter)
  const label = (name.trim().split(/\s+/).pop() || "YOU").toUpperCase();
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  const nameSize = fitFont(g, label, font, 104, w * 0.5);
  const spacing = nameSize * 0.06;
  const widths = [...label].map((ch) => g.measureText(ch).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = w / 2 - total / 2;
  const nameBase = 268;
  [...label].forEach((ch, i) => {
    const mid = cx + widths[i] / 2;
    const t = (mid - w / 2) / (total / 2 || 1);
    const y = nameBase + t * t * 10; // gentle arch
    if (isColor) {
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.fillText(ch, mid + 2, y + 4);
      g.fillStyle = WHITE;
      g.fillText(ch, mid, y);
    } else {
      g.fillStyle = "#cfcfcf";
      g.fillText(ch, mid, y);
    }
    cx += widths[i];
  });

  // number: white twill, gold outline, navy inner outline, stitch line
  const numSize = number.length > 1 ? 560 : 640;
  g.font = `700 ${numSize}px ${font}`;
  g.textBaseline = "middle";
  g.lineJoin = "round";
  const nx = w / 2;
  const ny = 720;
  if (isColor) {
    g.fillStyle = "rgba(0,0,0,0.4)";
    g.fillText(number, nx + 6, ny + 10);
    g.lineWidth = 34;
    g.strokeStyle = GOLD;
    g.strokeText(number, nx, ny);
    g.lineWidth = 14;
    g.strokeStyle = NAVY_DARK;
    g.strokeText(number, nx, ny);
    g.fillStyle = WHITE;
    g.fillText(number, nx, ny);
    g.setLineDash([6, 8]);
    g.lineWidth = 2;
    g.strokeStyle = "rgba(20,36,95,0.55)";
    g.strokeText(number, nx, ny);
    g.setLineDash([]);
  } else {
    g.lineWidth = 34;
    g.strokeStyle = "#a8a8a8";
    g.strokeText(number, nx, ny);
    g.fillStyle = "#e6e6e6";
    g.fillText(number, nx, ny);
  }

  // hem + seam stitching
  g.setLineDash([10, 9]);
  g.lineWidth = 3;
  g.strokeStyle = isColor ? "rgba(255,255,255,0.18)" : "#111";
  g.beginPath();
  g.moveTo(w * 0.19, h - 70);
  g.bezierCurveTo(w * 0.4, h - 44, w * 0.6, h - 44, w * 0.81, h - 70);
  g.stroke();
  g.setLineDash([]);

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

// Torso profile from collar (top) to hem: [y, half width, half depth], in meters.
const PROFILE: [number, number, number][] = [
  [0.0, 0.078, 0.062], // collar opening
  [-0.018, 0.16, 0.098],
  [-0.055, 0.228, 0.118], // shoulder line
  [-0.2, 0.226, 0.126], // chest / underarm
  [-0.5, 0.214, 0.116], // waist
  [-0.9, 0.232, 0.104], // hem
];
const TORSO_TOP_PX = 70; // texture row that lines up with the collar
const TORSO_BOTTOM_PX = TEX_H - 30;
const TORSO_H = -PROFILE[PROFILE.length - 1][0];

function profileAt(t: number) {
  // Catmull-Rom through the profile points, t = 0 (collar) … 1 (hem).
  const n = PROFILE.length - 1;
  const f = Math.min(n - 1e-6, Math.max(0, t * n));
  const i = Math.floor(f);
  const u = f - i;
  const p = (k: number) => PROFILE[Math.min(n, Math.max(0, k))];
  const out: number[] = [];
  for (let c = 0; c < 3; c++) {
    const p0 = p(i - 1)[c], p1 = p(i)[c], p2 = p(i + 1)[c], p3 = p(i + 2)[c];
    out.push(
      0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u),
    );
  }
  return out as [number, number, number];
}

/** A closed tube of fabric from collar to hem, slightly boxy like a real jersey. */
function torsoGeometry() {
  const rings = 72;
  const segs = 72;
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  const pxPerMeter = (TORSO_BOTTOM_PX - TORSO_TOP_PX) / TORSO_H;
  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    const [y, hw, hd] = profileAt(t);
    const lower = Math.min(1, Math.max(0, (t - 0.3) / 0.7));
    for (let s = 0; s <= segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      // superellipse: flatter front and back panels
      let x = hw * Math.sign(c) * Math.pow(Math.abs(c), 0.62);
      let z = hd * Math.sign(sn) * Math.pow(Math.abs(sn), 0.85);
      // drape: long folds on the lower body, a little sag at the hem
      const fold = 1 + lower * (0.035 * Math.sin(a * 7 + 0.8) + 0.015 * Math.sin(a * 15 + t * 6));
      x *= fold;
      z *= fold;
      const yy = y - lower * lower * 0.012 * Math.cos(a * 2);
      positions.push(x, yy, z);
      // Planar projection from the back (+z, toward the camera), so the
      // painted back graphics keep their proportions.
      uvs.push(0.5 + x / JERSEY_W, 1 - (TORSO_TOP_PX - y * pxPerMeter) / TEX_H);
    }
  }
  const row = segs + 1;
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segs; s++) {
      const a = r * row + s;
      const b = a + row;
      index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/** Sleeve stripes: white / gold / white near the cuff. */
function sleeveTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d")!;
  const body = g.createLinearGradient(0, 0, 128, 0);
  body.addColorStop(0, NAVY_DARK);
  body.addColorStop(0.5, NAVY);
  body.addColorStop(1, NAVY_DARK);
  g.fillStyle = body;
  g.fillRect(0, 0, 128, 256);
  // cylinder v runs bottom (cuff) → top (shoulder); canvas y runs top → bottom
  g.fillStyle = WHITE;
  g.fillRect(0, 186, 128, 10);
  g.fillStyle = GOLD;
  g.fillRect(0, 200, 128, 18);
  g.fillStyle = WHITE;
  g.fillRect(0, 222, 128, 10);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
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
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = TEX_W;
  colorCanvas.height = TEX_H;
  const heightCanvas = document.createElement("canvas");
  heightCanvas.width = TEX_W / 2;
  heightCanvas.height = TEX_H / 2;

  const colorTex = new THREE.CanvasTexture(colorCanvas);
  colorTex.colorSpace = THREE.SRGBColorSpace;
  colorTex.anisotropy = 8;
  const normalTex = new THREE.CanvasTexture(colorCanvas);

  const fabric = {
    roughness: 0.82,
    metalness: 0,
    sheen: 0.5,
    sheenColor: new THREE.Color("#3346a8"),
    sheenRoughness: 0.6,
    side: THREE.DoubleSide,
  } as const;
  const material = new THREE.MeshPhysicalMaterial({
    ...fabric,
    map: colorTex,
    normalMap: normalTex,
    normalScale: new THREE.Vector2(0.9, 0.9),
  });
  const sleeveTex = sleeveTexture();
  const sleeveMat = new THREE.MeshPhysicalMaterial({ ...fabric, map: sleeveTex });
  const collarMat = new THREE.MeshPhysicalMaterial({ ...fabric, color: GOLD, sheenColor: new THREE.Color("#ffd36b") });

  const redraw = (name: string) => {
    paint(colorCanvas.getContext("2d")!, name, number, font, "color");
    const hg = heightCanvas.getContext("2d")!;
    hg.save();
    hg.scale(0.5, 0.5);
    paint(hg, name, number, font, "height");
    hg.restore();
    normalTex.image = heightToNormal(heightCanvas, 3);
    normalTex.needsUpdate = true;
    colorTex.needsUpdate = true;
  };
  redraw(initialName);

  const TOP = 0.1; // collar height above the group origin (the hanger bar sits just below)
  const torsoGeo = torsoGeometry();
  const torso = new THREE.Mesh(torsoGeo, material);
  torso.position.y = TOP;
  torso.castShadow = true;
  torso.receiveShadow = true;

  // Sleeves hang down and out from the shoulders.
  const sleeveGeo = new THREE.CylinderGeometry(0.1, 0.076, 0.28, 40, 6, true);
  const sleeves = [-1, 1].map((side) => {
    const m = new THREE.Mesh(sleeveGeo, sleeveMat);
    const angle = 0.86;
    const dir = new THREE.Vector3(side * Math.sin(angle), -Math.cos(angle), 0);
    // cylinder +y (radiusTop) points back toward the shoulder
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
    // Start the sleeve inside the torso so the shoulder seam reads as one piece.
    const shoulder = new THREE.Vector3(side * 0.165, TOP - 0.085, 0);
    m.position.copy(shoulder).addScaledVector(dir, 0.14);
    m.scale.set(1, 1, 0.78);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  });

  const collarGeo = new THREE.TorusGeometry(0.07, 0.011, 12, 48);
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.rotation.x = Math.PI / 2;
  collar.scale.set(0.078 / 0.07, 0.062 / 0.07, 1);
  collar.position.y = TOP;

  const metal = new THREE.MeshStandardMaterial({ color: "#c9ccd2", metalness: 1, roughness: 0.22 });
  const [hookGeo, barGeo] = hangerGeometry();
  const hook = new THREE.Mesh(hookGeo, metal);
  const bar = new THREE.Mesh(barGeo, metal);

  const group = new THREE.Group();
  group.add(torso, ...sleeves, collar, hook, bar);

  return {
    group,
    redraw,
    dispose() {
      [torsoGeo, sleeveGeo, collarGeo, hookGeo, barGeo, material, sleeveMat, collarMat, metal, colorTex, normalTex, sleeveTex].forEach((d) =>
        d.dispose(),
      );
    },
  };
}
