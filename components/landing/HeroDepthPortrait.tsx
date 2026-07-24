"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import styles from "@/app/homepage-structure.module.css";

const PORTRAIT_PATH = "/images/landing/cal-generated.png";
const PORTRAIT_ASPECT = 768 / 978;

const vertexShader = `
  varying vec2 vUv;

  float gaussian(vec2 point, vec2 center, vec2 spread) {
    vec2 delta = (point - center) / spread;
    return exp(-dot(delta, delta) * 2.0);
  }

  void main() {
    vUv = uv;

    float fist = gaussian(uv, vec2(0.60, 0.52), vec2(0.19, 0.18));
    float helmet = gaussian(uv, vec2(0.47, 0.73), vec2(0.21, 0.19));
    float torso = gaussian(uv, vec2(0.48, 0.32), vec2(0.31, 0.31));
    float depth = fist * 1.0 + helmet * 0.42 + torso * 0.16;

    vec3 displaced = position;
    displaced.z += depth * 0.2;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(uTexture, vUv);
    if (color.a < 0.02) discard;
    gl_FragColor = color;
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function HeroDepthPortrait() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 20);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    container.appendChild(renderer.domElement);

    const pointerTarget = new THREE.Vector2();
    const pointerCurrent = new THREE.Vector2();
    const group = new THREE.Group();
    scene.add(group);

    const geometry = new THREE.PlaneGeometry(4, 4 / PORTRAIT_ASPECT, 64, 80);
    const placeholderTexture = new THREE.Texture();
    const uniforms = {
      uTexture: { value: placeholderTexture },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const portrait = new THREE.Mesh(geometry, material);
    group.add(portrait);

    let texture: THREE.Texture | null = null;
    let disposed = false;
    let frameId = 0;
    let isVisible = true;
    let groupBaseY = -0.12;
    let previousTime = performance.now();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.position.z;
      const visibleWidth = visibleHeight * camera.aspect;
      const portraitHeight = 4 / PORTRAIT_ASPECT;
      const narrow = camera.aspect < 0.75;
      const widthFit = visibleWidth / 4 * (narrow ? 1.36 : 0.94);
      const heightFit = visibleHeight / portraitHeight * (narrow ? 0.94 : 1.1);
      const scale = Math.min(widthFit, heightFit);

      group.scale.setScalar(scale);
      groupBaseY = narrow ? -0.22 : -0.12;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (reducedMotion.matches || !finePointer.matches) return;
      const bounds = container.getBoundingClientRect();
      pointerTarget.set(
        THREE.MathUtils.clamp(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -1, 1),
        THREE.MathUtils.clamp(-(((event.clientY - bounds.top) / bounds.height) * 2 - 1), -1, 1),
      );
    };

    const resetPointer = () => pointerTarget.set(0, 0);

    const render = (time: number) => {
      const delta = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;

      pointerCurrent.x = THREE.MathUtils.damp(pointerCurrent.x, pointerTarget.x, 5.5, delta);
      pointerCurrent.y = THREE.MathUtils.damp(pointerCurrent.y, pointerTarget.y, 5.5, delta);

      camera.position.set(0, 0, 6);
      camera.rotation.set(0, 0, 0);
      group.position.set(pointerCurrent.x * 0.14, groupBaseY + pointerCurrent.y * 0.08, 0);
      group.rotation.set(-pointerCurrent.y * 0.1, pointerCurrent.x * 0.16, 0);

      renderer.render(scene, camera);
      if (isVisible) frameId = requestAnimationFrame(render);
    };

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      PORTRAIT_PATH,
      (loadedTexture) => {
        if (disposed) {
          loadedTexture.dispose();
          return;
        }
        texture = loadedTexture;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
        uniforms.uTexture.value = texture;
        setReady(true);
      },
      undefined,
      () => {
        if (!disposed) setReady(false);
      },
    );

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      const nextVisible = entry.isIntersecting;
      if (nextVisible && !isVisible) {
        isVisible = true;
        previousTime = performance.now();
        frameId = requestAnimationFrame(render);
      } else if (!nextVisible && isVisible) {
        isVisible = false;
        cancelAnimationFrame(frameId);
      }
    });
    visibilityObserver.observe(container);

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("blur", resetPointer);
    reducedMotion.addEventListener("change", resetPointer);
    finePointer.addEventListener("change", resetPointer);

    resize();
    frameId = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", resetPointer);
      reducedMotion.removeEventListener("change", resetPointer);
      finePointer.removeEventListener("change", resetPointer);
      geometry.dispose();
      material.dispose();
      placeholderTexture.dispose();
      texture?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={styles.heroPortrait}
      data-webgl-ready={ready ? "true" : "false"}
      aria-hidden="true"
    >
      <Image
        className={ready ? styles.heroPortraitFallbackHidden : styles.heroPortraitFallback}
        src={PORTRAIT_PATH}
        alt=""
        fill
        priority
        sizes="100vw"
      />
    </div>
  );
}
