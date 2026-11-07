"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import styles from "../redesign.module.css";
import { createJersey } from "./jersey";

type Props = {
  /** Athlete name typed in the hero form. Drawn on the center nameplate and jersey. */
  name: string;
  /** 0 → 1 as the hero scrolls. Pushes the camera in and swings the door open. */
  progressRef: MutableRefObject<number>;
  fontFamily: string;
};

const LOCKER_W = 1.04;
const LOCKER_H = 2.5;
const LOCKER_D = 0.75;
const DOOR_H = 1.86;
const SPACING = 1.1;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function doorTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 520;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, "#2b3036");
  grad.addColorStop(0.5, "#353a41");
  grad.addColorStop(1, "#272b31");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 520);
  // brushed steel streaks
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`;
    g.fillRect(Math.random() * 256, Math.random() * 520, 1, 10 + Math.random() * 60);
  }
  const vents = (top: number) => {
    for (let r = 0; r < 6; r++) {
      const y = top + r * 13;
      g.fillStyle = "#0a0b0d";
      g.beginPath();
      g.roundRect(54, y, 148, 6, 3);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.08)";
      g.fillRect(56, y + 6, 144, 1);
    }
  };
  vents(26);
  vents(420);
  // inset panel line
  g.strokeStyle = "rgba(0,0,0,0.45)";
  g.lineWidth = 3;
  g.strokeRect(10, 10, 236, 500);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function drawPlate(canvas: HTMLCanvasElement, text: string, font: string, lit: boolean) {
  const g = canvas.getContext("2d")!;
  const { width: w, height: h } = canvas;
  g.clearRect(0, 0, w, h);
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, lit ? "#f4efe2" : "#9b9a95");
  grad.addColorStop(1, lit ? "#d8d0bc" : "#7d7c78");
  g.fillStyle = grad;
  g.beginPath();
  g.roundRect(4, 4, w - 8, h - 8, 10);
  g.fill();
  g.fillStyle = "rgba(0,0,0,0.35)";
  for (const x of [22, w - 22]) {
    g.beginPath();
    g.arc(x, h / 2, 6, 0, Math.PI * 2);
    g.fill();
  }
  const label = text.trim().toUpperCase() || "YOUR NAME";
  let size = 86;
  g.font = `700 ${size}px ${font}`;
  while (g.measureText(label).width > w - 90 && size > 30) {
    size -= 4;
    g.font = `700 ${size}px ${font}`;
  }
  g.fillStyle = lit ? "#15120a" : "#2d2c2a";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(label, w / 2, h / 2 + 4);
}

export function LockerRoomScene({ name, progressRef, fontFamily }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const redrawRef = useRef<(name: string) => void>(() => {});
  const nameRef = useRef(name);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    nameRef.current = name;
    redrawRef.current(name);
  }, [name]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      setFailed(true);
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const font = fontFamily || "Arial Narrow, sans-serif";

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.className = styles.canvas;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050607");
    scene.fog = new THREE.Fog("#050607", 6, 16);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.3, 40);
    const lookAt = new THREE.Vector3(0, 1.25, 0);

    // ---------- materials ----------
    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(item: T) => {
      disposables.push(item);
      return item;
    };

    const bodyMat = track(new THREE.MeshStandardMaterial({ color: "#23272c", metalness: 0.55, roughness: 0.5 }));
    // Interior walls of the open locker. They are the shell's own walls (no
    // separate inner box), so no two surfaces share a plane and nothing
    // z-fights or flickers as the camera moves.
    const interiorMat = track(new THREE.MeshStandardMaterial({ color: "#191c20", metalness: 0.35, roughness: 0.78 }));
    const doorTex = track(doorTexture());
    const doorMat = track(new THREE.MeshStandardMaterial({ map: doorTex, metalness: 0.6, roughness: 0.42 }));
    const handleMat = track(new THREE.MeshStandardMaterial({ color: "#8b8f96", metalness: 0.9, roughness: 0.25 }));

    const bodyGeo = track(new THREE.BoxGeometry(LOCKER_W, LOCKER_H, LOCKER_D));
    const doorGeo = track(new THREE.BoxGeometry(LOCKER_W - 0.1, DOOR_H, 0.035));
    const handleGeo = track(new THREE.BoxGeometry(0.035, 0.28, 0.05));
    const plateGeo = track(new THREE.PlaneGeometry(0.74, 0.17));

    const isNarrow = window.innerWidth < 760;
    const count = isNarrow ? 5 : 9;
    const center = Math.floor(count / 2);

    let centerDoor: THREE.Group | null = null;
    let plateCanvas: HTMLCanvasElement | null = null;
    let plateTex: THREE.CanvasTexture | null = null;

    for (let i = 0; i < count; i++) {
      const isCenter = i === center;
      const locker = new THREE.Group();
      locker.position.x = (i - center) * SPACING;
      scene.add(locker);

      // body: solid for neighbours, hollow shell for the center locker so its
      // interior is visible once the door swings open.
      if (isCenter) {
        // [w, h, d, x, y, z, interior?]
        const sides: [number, number, number, number, number, number, boolean][] = [
          // Top, base and header fit between the side walls and in front of the
          // back panel, so no faces overlap.
          [LOCKER_W - 0.1, 0.06, LOCKER_D - 0.04, 0, LOCKER_H / 2 - 0.03, 0.02, false],
          [LOCKER_W - 0.1, 0.4, LOCKER_D - 0.04, 0, -LOCKER_H / 2 + 0.2, 0.02, false],
          [0.05, LOCKER_H, LOCKER_D, -LOCKER_W / 2 + 0.025, 0, 0, true],
          [0.05, LOCKER_H, LOCKER_D, LOCKER_W / 2 - 0.025, 0, 0, true],
          [LOCKER_W - 0.1, LOCKER_H - 0.46, 0.04, 0, 0.2 - 0.03, -LOCKER_D / 2 + 0.02, true],
          [LOCKER_W - 0.1, LOCKER_H - DOOR_H - 0.48, LOCKER_D - 0.04, 0, LOCKER_H / 2 - 0.06 - (LOCKER_H - DOOR_H - 0.48) / 2, 0.02, false],
        ];
        for (const [w, h, d, x, y, z, interior] of sides) {
          const g = track(new THREE.BoxGeometry(w, h, d));
          const m = new THREE.Mesh(g, interior ? interiorMat : bodyMat);
          m.position.set(x, LOCKER_H / 2 + y, z);
          m.castShadow = true;
          m.receiveShadow = true;
          locker.add(m);
        }

        // hanging rod + realistic jersey, back facing out
        const rod = new THREE.Mesh(track(new THREE.CylinderGeometry(0.012, 0.012, LOCKER_W - 0.1, 12)), handleMat);
        rod.rotation.z = Math.PI / 2;
        rod.position.set(0, 0.4 + DOOR_H - 0.165, -0.08); // sits inside the hanger hook
        locker.add(rod);
        const jersey = createJersey(font, nameRef.current);
        disposables.push(jersey);
        jersey.group.position.set(0, 0.4 + DOOR_H - 0.42, -0.08);
        jersey.group.scale.setScalar(0.98);
        locker.add(jersey.group);

        const glow = new THREE.PointLight("#ffd27a", 0, 2.6, 1.4);
        glow.position.set(0, 0.4 + DOOR_H - 0.05, 0.3);
        glow.name = "glow";
        locker.add(glow);

        const prev = redrawRef.current;
        redrawRef.current = (n) => {
          prev(n);
          jersey.redraw(n);
        };
      } else {
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = LOCKER_H / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        locker.add(body);
      }

      // door on a hinge (left edge)
      const hinge = new THREE.Group();
      hinge.position.set(-LOCKER_W / 2 + 0.05, 0.4 + DOOR_H / 2, LOCKER_D / 2 + 0.02);
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.x = (LOCKER_W - 0.1) / 2;
      door.castShadow = true;
      door.receiveShadow = true;
      hinge.add(door);
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.set(LOCKER_W - 0.22, -0.05, 0.04);
      hinge.add(handle);
      locker.add(hinge);
      if (isCenter) centerDoor = hinge;

      // nameplate on the header strip above the door
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 118;
      const tex = track(new THREE.CanvasTexture(canvas));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const others = ["CARTER", "REYES", "OKAFOR", "MASON", "BELL", "NGUYEN", "BROOKS", "SALAZAR"];
      drawPlate(canvas, isCenter ? nameRef.current : others[i % others.length], font, isCenter);
      const plate = new THREE.Mesh(
        plateGeo,
        track(new THREE.MeshStandardMaterial({ map: tex, metalness: 0.5, roughness: 0.35 })),
      );
      plate.position.set(0, 0.4 + DOOR_H + (LOCKER_H - DOOR_H - 0.4) / 2, LOCKER_D / 2 + 0.006);
      locker.add(plate);
      if (isCenter) {
        plateCanvas = canvas;
        plateTex = tex;
      }
    }

    const prevRedraw = redrawRef.current;
    redrawRef.current = (n) => {
      prevRedraw(n);
      if (plateCanvas && plateTex) {
        drawPlate(plateCanvas, n, font, true);
        plateTex.needsUpdate = true;
      }
    };
    // Webfont may land after first draw.
    document.fonts?.ready.then(() => redrawRef.current(nameRef.current));

    // bench
    const wood = track(new THREE.MeshStandardMaterial({ color: "#5a412a", roughness: 0.62, metalness: 0.05 }));
    const bench = new THREE.Mesh(track(new THREE.BoxGeometry(isNarrow ? 3.2 : 5.2, 0.08, 0.42)), wood);
    bench.position.set(0, 0.48, 1.55);
    bench.castShadow = true;
    bench.receiveShadow = true;
    scene.add(bench);
    const legGeo = track(new THREE.BoxGeometry(0.06, 0.44, 0.3));
    for (const x of isNarrow ? [-1.3, 1.3] : [-2.3, 0, 2.3]) {
      const leg = new THREE.Mesh(legGeo, bodyMat);
      leg.position.set(x, 0.22, 1.55);
      leg.castShadow = true;
      scene.add(leg);
    }

    // floor + back wall
    const floor = new THREE.Mesh(
      track(new THREE.PlaneGeometry(40, 40)),
      track(new THREE.MeshStandardMaterial({ color: "#0c0d0f", roughness: 0.32, metalness: 0.35 })),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const wall = new THREE.Mesh(
      track(new THREE.PlaneGeometry(40, 12)),
      track(new THREE.MeshStandardMaterial({ color: "#0b0c0e", roughness: 0.9 })),
    );
    wall.position.set(0, 6, -LOCKER_D / 2 - 0.01);
    wall.receiveShadow = true;
    scene.add(wall);

    // lights
    scene.add(new THREE.HemisphereLight("#8d97a8", "#050607", 0.35));
    const key = new THREE.SpotLight("#ffd58a", 90, 14, 0.5, 0.75, 1.6);
    key.position.set(0, 5.2, 3);
    key.target.position.set(0, 1.1, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.03; // no shadow acne shimmer on the interior walls
    scene.add(key, key.target);
    for (const x of [-4.4, 4.4]) {
      const rim = new THREE.SpotLight("#5a78ff", 22, 12, 0.6, 0.9, 1.6);
      rim.position.set(x, 4.6, 2.6);
      rim.target.position.set(x * 0.8, 1, 0);
      scene.add(rim, rim.target);
    }

    const glow = scene.getObjectByName("glow") as THREE.PointLight | undefined;

    // ---------- loop ----------
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointer = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    if (!reduceMotion) window.addEventListener("pointermove", onPointer, { passive: true });

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w / h < 0.8 ? 46 : 32;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(host);

    let frame = 0;
    let smoothed = progressRef.current;
    const start = performance.now();
    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (!visible) return;
      const t = (performance.now() - start) / 1000;
      smoothed += (progressRef.current - smoothed) * (reduceMotion ? 1 : 0.12);
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;

      const p = smoothed;
      const push = ease(clamp01(p / 0.8));
      const open = ease(clamp01((p - 0.22) / 0.45));
      const portrait = camera.aspect < 0.8;
      const startZ = portrait ? 9.4 : 7.4;
      const endZ = portrait ? 3.9 : 3.25;
      // A slow intro dolly on load: the one orchestrated motion of the page.
      const intro = reduceMotion ? 1 : ease(clamp01(t / 2.4));

      camera.position.set(
        pointer.x * 0.25 * (1 - push),
        1.45 - pointer.y * 0.08 + (1 - intro) * 0.4,
        startZ + (1 - intro) * 2.2 - (startZ - endZ) * push,
      );
      // On tall screens aim lower so the nameplates sit above the headline.
      lookAt.set(0, portrait ? 0.55 + push * 0.95 : 0.98 + push * 0.52, 0);
      camera.lookAt(lookAt);

      if (centerDoor) centerDoor.rotation.y = -1.9 * open;
      if (glow) glow.intensity = 5 * open;
      key.intensity = 90 * intro;

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      redrawRef.current = () => {};
    };
  }, [fontFamily, progressRef]);

  return (
    <div ref={hostRef} style={{ position: "absolute", inset: 0 }}>
      {failed ? <div className={styles.canvasFallback} /> : null}
    </div>
  );
}
