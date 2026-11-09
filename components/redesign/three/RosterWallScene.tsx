"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import styles from "../redesign.module.css";

// A whole program's wall of lockers, rendered as instanced meshes. On load the
// nameplates light up in a wave from left to right: every player on the roster
// getting a locker. Pointer movement gently pans the camera.
export function RosterWallScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

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

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.className = styles.canvas;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050607");
    scene.fog = new THREE.Fog("#050607", 7, 26);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);

    const COLS = 25; // odd, so one locker sits dead center
    const ROWS = 2;
    const W = 0.62;
    const H = 1.7;
    const D = 0.5;
    const GAP = 0.04;
    const total = COLS * ROWS;

    const bodyGeo = new THREE.BoxGeometry(W, H, D);
    const bodyMat = new THREE.MeshStandardMaterial({ color: "#1d2127", metalness: 0.6, roughness: 0.45 });
    const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, total);

    const ventGeo = new THREE.BoxGeometry(W * 0.56, 0.018, 0.01);
    const ventMat = new THREE.MeshBasicMaterial({ color: "#07080a" });
    const VENTS = 5;
    const vents = new THREE.InstancedMesh(ventGeo, ventMat, total * VENTS);

    const plateGeo = new THREE.BoxGeometry(W * 0.62, 0.09, 0.012);
    const plateMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    const plates = new THREE.InstancedMesh(plateGeo, plateMat, total);

    const m = new THREE.Matrix4();
    const dark = new THREE.Color("#23272d");
    const blue = new THREE.Color("#3a63ff");
    const white = new THREE.Color("#dfe6ff");
    const tmp = new THREE.Color();

    // Lockers wrap around the camera on a shallow arc.
    const radius = 11;
    const arc = (COLS * (W + GAP)) / radius;
    const placements: { x: number; z: number; ry: number; col: number; row: number }[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const a = -arc / 2 + (col + 0.5) * (arc / COLS);
        const x = Math.sin(a) * radius;
        const z = -Math.cos(a) * radius + radius;
        placements.push({ x, z: z - 2, ry: -a, col, row });
      }
    }

    placements.forEach((p, i) => {
      const y = H / 2 + p.row * (H + GAP);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.ry, 0));
      m.compose(new THREE.Vector3(p.x, y, p.z), q, new THREE.Vector3(1, 1, 1));
      bodies.setMatrixAt(i, m);

      const forward = new THREE.Vector3(0, 0, D / 2 + 0.006).applyQuaternion(q);
      const plateY = y + H / 2 - 0.13;
      m.compose(new THREE.Vector3(p.x + forward.x, plateY, p.z + forward.z), q, new THREE.Vector3(1, 1, 1));
      plates.setMatrixAt(i, m);
      plates.setColorAt(i, dark);

      for (let v = 0; v < VENTS; v++) {
        const vy = y + H / 2 - 0.3 - v * 0.05;
        m.compose(new THREE.Vector3(p.x + forward.x, vy, p.z + forward.z), q, new THREE.Vector3(1, 1, 1));
        vents.setMatrixAt(i * VENTS + v, m);
      }
    });
    bodies.instanceMatrix.needsUpdate = true;
    vents.instanceMatrix.needsUpdate = true;
    plates.instanceMatrix.needsUpdate = true;
    scene.add(bodies, vents, plates);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: "#090a0c", roughness: 0.28, metalness: 0.4 }),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    scene.add(new THREE.HemisphereLight("#7f8cff", "#050607", 0.5));
    const key = new THREE.SpotLight("#a9b9ff", 140, 30, 0.7, 0.8, 1.4);
    key.position.set(0, 7, 6);
    key.target.position.set(0, 1.5, -2);
    scene.add(key, key.target);
    const warm = new THREE.PointLight("#ffc21a", 6, 6, 1.6);
    warm.position.set(-3.2, 2.6, 1.5);
    scene.add(warm);

    // Wave order: outward from the center column, with a little per-locker jitter so it feels human.
    const delays = placements.map((p) => Math.abs(p.col - (COLS - 1) / 2) * 0.1 + p.row * 0.12 + Math.random() * 0.18);

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
      camera.fov = w / h < 0.8 ? 52 : 34;
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

    const start = performance.now();
    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (!visible) return;
      const t = reduceMotion ? 99 : (performance.now() - start) / 1000;
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;

      for (let i = 0; i < total; i++) {
        const k = Math.min(1, Math.max(0, (t - 0.4 - delays[i]) / 0.35));
        // flash white, settle to blue
        if (k <= 0) tmp.copy(dark);
        else if (k < 0.5) tmp.copy(dark).lerp(white, k * 2);
        else tmp.copy(white).lerp(blue, (k - 0.5) * 2);
        plates.setColorAt(i, tmp);
      }
      if (plates.instanceColor) plates.instanceColor.needsUpdate = true;

      // Centered on the middle locker; the pointer only nudges it.
      camera.position.set(pointer.x * 0.6, 1.6 - pointer.y * 0.15, 6.2);
      camera.lookAt(pointer.x * 0.3, 1.45, -3);
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      [bodyGeo, ventGeo, plateGeo, bodyMat, ventMat, plateMat].forEach((d) => d.dispose());
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      bodies.dispose();
      vents.dispose();
      plates.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={hostRef} style={{ position: "absolute", inset: 0 }}>
      {failed ? <div className={styles.canvasFallback} /> : null}
    </div>
  );
}
