import * as THREE from "three";

// A football jersey hung back-out on a hanger, built for close-up viewing:
// a subdivided plane draped into cloth folds, a painted color map (twill name
// and number with layered outlines, collar trim, sleeve stripes, stitching), a
// normal map generated from a knit-and-twill height field, and a sheen fabric
// material. Text redraws in place when the athlete's name changes.

const TEX_W = 1024;
const TEX_H = 1280;
const NAVY = "#172b86";
const NAVY_DARK = "#0c1852";
const GOLD = "#f2b51b";
const WHITE = "#f3f1ea";

const JERSEY_W = 0.8;
const JERSEY_H = 1.0;

/** Jersey back silhouette in texture space. */
function silhouette(g: CanvasRenderingContext2D) {
  const w = TEX_W;
  g.beginPath();
  g.moveTo(w * 0.36, 70); // left collar
  g.bezierCurveTo(w * 0.42, 92, w * 0.58, 92, w * 0.64, 70); // back collar dip
  g.bezierCurveTo(w * 0.76, 78, w * 0.88, 104, w * 0.97, 150); // right shoulder
  g.lineTo(w * 0.995, 345); // sleeve outer edge
  g.lineTo(w * 0.8, 382); // sleeve hem
  g.bezierCurveTo(w * 0.78, 330, w * 0.775, 320, w * 0.772, 316); // underarm
  g.bezierCurveTo(w * 0.79, 700, w * 0.8, 1000, w * 0.81, TEX_H - 40); // right side seam
  g.bezierCurveTo(w * 0.6, TEX_H - 14, w * 0.4, TEX_H - 14, w * 0.19, TEX_H - 40); // hem
  g.bezierCurveTo(w * 0.2, 1000, w * 0.21, 700, w * 0.228, 316);
  g.bezierCurveTo(w * 0.225, 320, w * 0.22, 330, w * 0.2, 382);
  g.lineTo(w * 0.005, 345);
  g.lineTo(w * 0.03, 150);
  g.bezierCurveTo(w * 0.12, 104, w * 0.24, 78, w * 0.36, 70);
  g.closePath();
}

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
  silhouette(g);
  g.clip();

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

  // sleeve stripes: white / gold / white
  const stripe = (y: number, color: string, height: number) => {
    g.fillStyle = isColor ? color : "#5a5a5a";
    g.fillRect(0, y, w * 0.24, height);
    g.fillRect(w * 0.76, y, w * 0.24, height);
  };
  stripe(282, WHITE, 14);
  stripe(300, GOLD, 22);
  stripe(326, WHITE, 14);

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

function drapedGeometry() {
  const geo = new THREE.PlaneGeometry(JERSEY_W, JERSEY_H, 64, 80);
  const pos = geo.attributes.position;
  const halfW = JERSEY_W / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const nx = x / halfW; // -1..1
    const ny = (JERSEY_H / 2 - y) / JERSEY_H; // 0 top → 1 bottom
    let z = 0.05 * Math.cos((nx * Math.PI) / 2); // body roundness
    const lower = Math.min(1, Math.max(0, (ny - 0.25) / 0.75));
    z += 0.014 * Math.sin(nx * 9.5 + 0.6) * lower; // long drape folds
    z += 0.006 * Math.sin(nx * 23 + ny * 4) * lower * lower; // finer creases
    if (Math.abs(nx) > 0.55 && ny < 0.32) z -= (Math.abs(nx) - 0.55) * 0.22; // sleeves fall back
    z -= 0.03 * ny * ny; // hem hangs slightly back
    pos.setZ(i, z);
    pos.setX(i, x * (1 - 0.03 * lower)); // tapers as fabric hangs
  }
  geo.computeVertexNormals();
  return geo;
}

function hangerGeometry() {
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.05, 0.2, -0.02),
    new THREE.Vector3(0.04, 0.25, -0.01),
    new THREE.Vector3(0, 0.27, 0),
    new THREE.Vector3(-0.035, 0.24, 0.005),
    new THREE.Vector3(0, 0.18, 0.01),
    new THREE.Vector3(0, 0.12, 0.012),
  ]);
  const hook = new THREE.TubeGeometry(path, 40, 0.007, 10, false);
  const bar = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.37, 0.005, 0.02),
      new THREE.Vector3(-0.18, 0.075, 0.03),
      new THREE.Vector3(0, 0.12, 0.03),
      new THREE.Vector3(0.18, 0.075, 0.03),
      new THREE.Vector3(0.37, 0.005, 0.02),
    ]),
    60,
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

  const material = new THREE.MeshPhysicalMaterial({
    map: colorTex,
    normalMap: normalTex,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 0.82,
    metalness: 0,
    sheen: 0.5,
    sheenColor: new THREE.Color("#3346a8"),
    sheenRoughness: 0.6,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });

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

  const geometry = drapedGeometry();
  const cloth = new THREE.Mesh(geometry, material);
  cloth.position.y = -JERSEY_H / 2 + 0.115; // shoulders rest on the hanger bar
  cloth.receiveShadow = true;

  const metal = new THREE.MeshStandardMaterial({ color: "#c9ccd2", metalness: 1, roughness: 0.22 });
  const [hookGeo, barGeo] = hangerGeometry();
  const hook = new THREE.Mesh(hookGeo, metal);
  const bar = new THREE.Mesh(barGeo, metal);

  const group = new THREE.Group();
  group.add(cloth, hook, bar);

  return {
    group,
    redraw,
    dispose() {
      [geometry, hookGeo, barGeo, material, metal, colorTex, normalTex].forEach((d) => d.dispose());
    },
  };
}
