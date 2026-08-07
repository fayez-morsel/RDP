"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type Gender = "male" | "female" | "neutral";

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vPosition;
  void main() {
    vPosition = position;
    vec3 displaced = position + normal * sin(position.y * 18.0 + uTime * 2.1) * 0.004;
    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uBoost;
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vPosition;
  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDirection), 0.0), 2.4);
    float scan = smoothstep(0.76, 0.98, sin(vPosition.y * 11.0 - uTime * 2.0) * 0.5 + 0.5);
    float sweep = smoothstep(0.0, 0.12, 0.12 - abs(fract(uTime * 0.19) - fract(vPosition.y * .19)));
    float grain = fract(sin(dot(vPosition.xy + uTime, vec2(12.9898, 78.233))) * 43758.5453) * .08;
    float intensity = .26 + fresnel * 1.35 + scan * .12 + sweep * .42 + grain + uBoost;
    float alpha = .26 + fresnel * .46 + scan * .08;
    gl_FragColor = vec4(uColor * intensity, alpha);
  }
`;

function HoloMaterial({ boost = 0 }: { boost?: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uBoost: { value: boost }, uColor: { value: new THREE.Color("#48eaf2") } }), [boost]);
  useFrame(({ clock }) => { if (material.current) material.current.uniforms.uTime.value = clock.getElapsedTime(); });
  return <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />;
}

function Part({ position, rotation, scale, type = "capsule", boost }: { position: [number, number, number]; rotation?: [number, number, number]; scale?: [number, number, number]; type?: "capsule" | "sphere" | "cylinder"; boost?: number }) {
  return <mesh position={position} rotation={rotation} scale={scale} castShadow><>{type === "sphere" ? <sphereGeometry args={[1, 28, 28]} /> : type === "cylinder" ? <cylinderGeometry args={[1, .88, 1, 24, 14, true]} /> : <capsuleGeometry args={[.5, 1, 12, 24]} />}</><HoloMaterial boost={boost} /></mesh>;
}

function Mannequin({ gender, activeZone }: { gender: Gender; activeZone: string | null }) {
  const ref = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  useFrame(({ clock, pointer: cursor }) => {
    pointer.current.x = THREE.MathUtils.lerp(pointer.current.x, cursor.x, .035);
    pointer.current.y = THREE.MathUtils.lerp(pointer.current.y, cursor.y, .035);
    if (ref.current) { ref.current.rotation.y = pointer.current.x * .1; ref.current.rotation.x = pointer.current.y * .04; ref.current.position.y = Math.sin(clock.getElapsedTime() * 1.25) * .035; }
  });
  const shoulder = gender === "male" ? 1.1 : gender === "female" ? .92 : 1;
  const waist = gender === "female" ? .73 : .84;
  const glow = (zone: string) => activeZone === zone ? .28 : 0;
  return <group ref={ref} position={[0, -1.2, 0]}>
    <Part type="sphere" position={[0, 2.65, 0]} scale={[.47, .61, .47]} boost={glow("head")} />
    <Part type="cylinder" position={[0, 2.1, 0]} scale={[.21, .26, .21]} boost={glow("head")} />
    <Part type="capsule" position={[0, 1.34, 0]} scale={[shoulder, 1.22, .55]} boost={glow("torso")} />
    <Part type="cylinder" position={[0, .48, 0]} scale={[waist, .32, .53]} boost={glow("core")} />
    <Part position={[-.78 * shoulder, 1.47, 0]} rotation={[0, 0, .16]} scale={[.22, 1.01, .22]} boost={glow("body")} />
    <Part position={[.78 * shoulder, 1.47, 0]} rotation={[0, 0, -.16]} scale={[.22, 1.01, .22]} boost={glow("body")} />
    <Part type="sphere" position={[-.93 * shoulder, .62, 0]} scale={[.23, .27, .23]} boost={glow("body")} />
    <Part type="sphere" position={[.93 * shoulder, .62, 0]} scale={[.23, .27, .23]} boost={glow("body")} />
    <Part position={[-.39, -.45, 0]} rotation={[0, 0, .035]} scale={[.31, 1.38, .31]} boost={glow("body")} />
    <Part position={[.39, -.45, 0]} rotation={[0, 0, -.035]} scale={[.31, 1.38, .31]} boost={glow("body")} />
  </group>;
}

function Platform() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (group.current) group.current.rotation.z = clock.getElapsedTime() * .11; });
  return <group ref={group} position={[0, -2.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    {[1.17, 1.48, 1.84, 2.15].map((radius, index) => <mesh key={radius} rotation={[0, 0, index * .68]}><torusGeometry args={[radius, .016 + index * .005, 8, 64]} /><meshBasicMaterial color="#4deaf2" transparent opacity={.65 - index * .09} blending={THREE.AdditiveBlending} /></mesh>)}
    <mesh><circleGeometry args={[1.14, 64]} /><meshBasicMaterial color="#28c8db" transparent opacity={.08} blending={THREE.AdditiveBlending} /></mesh>
    <mesh position={[0, 0, .02]}><ringGeometry args={[.88, .91, 64]} /><meshBasicMaterial color="#b5ffff" transparent opacity={.8} /></mesh>
  </group>;
}

function RankCrystal() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (ref.current) { ref.current.rotation.y = clock.getElapsedTime() * .4; ref.current.rotation.z = Math.sin(clock.getElapsedTime()) * .13; } });
  return <mesh ref={ref} position={[0, 3.95, 0]}><octahedronGeometry args={[.24, 1]} /><meshBasicMaterial color="#60f4ff" transparent opacity={.62} wireframe /></mesh>;
}

function Scene({ gender, activeZone }: { gender: Gender; activeZone: string | null }) {
  return <>
    <ambientLight intensity={.12} />
    <pointLight position={[-3, 2, 2]} color="#3dedff" intensity={1.35} distance={7} />
    <pointLight position={[3, .5, -1]} color="#195bff" intensity={.7} distance={7} />
    <pointLight position={[0, -2, 1]} color="#42f5ff" intensity={1.2} distance={4} />
    <Float speed={.6} rotationIntensity={.04} floatIntensity={.12}><Mannequin gender={gender} activeZone={activeZone} /></Float>
    <Platform /><RankCrystal />
  </>;
}

export default function CharacterScene3D({ gender, activeZone }: { gender: Gender; activeZone: string | null }) {
  return <div className="scene" aria-label="Interactive holographic character preview"><Canvas dpr={[1, 1.5]} camera={{ position: [0, .55, 9], fov: 34 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} fallback={<div className="webgl-fallback">HOLOGRAM LINK OFFLINE</div>}><Scene gender={gender} activeZone={activeZone} /></Canvas></div>;
}
