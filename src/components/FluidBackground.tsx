"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useTheme } from "@/components/ThemeProvider";

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform vec3 uColorD;
varying vec2 vUv;

float wave(vec2 p, float speed, float scale, float phase) {
  return sin((p.x * scale + p.y * (scale * 0.7) + uTime * speed + phase));
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 p = (uv - 0.5) * aspect;

  float d1 = length(p - vec2(0.28 * sin(uTime * 0.06), 0.18 * cos(uTime * 0.08)));
  float d2 = length(p + vec2(0.32 * cos(uTime * 0.05), 0.24 * sin(uTime * 0.07)));
  float field = 0.0;
  field += 0.36 / (d1 + 0.28);
  field += 0.28 / (d2 + 0.32);
  field += wave(p, 0.16, 3.4, 0.2) * 0.09;
  field += wave(p.yx, -0.12, 4.1, 1.7) * 0.08;

  vec3 color = mix(uColorA, uColorB, smoothstep(0.25, 1.25, field));
  color = mix(color, uColorC, smoothstep(0.0, 1.0, uv.y + 0.12 * sin(uTime * 0.08)));
  color = mix(color, uColorD, smoothstep(0.55, 1.45, field + uv.x * 0.35));

  float vignette = smoothstep(1.05, 0.25, length(p));
  color *= 0.72 + vignette * 0.38;
  color += vec3(0.012) * sin((uv.x + uv.y + uTime * 0.03) * 80.0);

  gl_FragColor = vec4(color, 1.0);
}
`;

const palettes = {
  dark: ["#0b1026", "#155469", "#48307f", "#087366"],
  light: ["#f7fbff", "#a9d9ee", "#f4c7b1", "#bfe9d2"],
};

function toColor(hex: string) {
  return new THREE.Color(hex);
}

export function FluidBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetColorsRef = useRef(palettes.dark.map(toColor));
  const { theme } = useTheme();

  useEffect(() => {
    targetColorsRef.current = palettes[theme].map(toColor);
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uColorA: { value: toColor(palettes.dark[0]) },
      uColorB: { value: toColor(palettes.dark[1]) },
      uColorC: { value: toColor(palettes.dark[2]) },
      uColorD: { value: toColor(palettes.dark[3]) },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    function resize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(width, height, false);
      uniforms.uResolution.value.set(width, height);
    }

    let frame = 0;
    const clock = new THREE.Clock();
    function render() {
      const elapsed = clock.getElapsedTime();
      const targetColors = targetColorsRef.current;
      uniforms.uTime.value = elapsed;
      uniforms.uColorA.value.lerp(targetColors[0], 0.035);
      uniforms.uColorB.value.lerp(targetColors[1], 0.035);
      uniforms.uColorC.value.lerp(targetColors[2], 0.035);
      uniforms.uColorD.value.lerp(targetColors[3], 0.035);
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    }

    resize();
    window.addEventListener("resize", resize);
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      mesh.geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-fluid-background
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen opacity-100 transition-opacity duration-700"
      aria-hidden="true"
    />
  );
}
