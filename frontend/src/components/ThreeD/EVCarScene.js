import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Float,
  OrbitControls,
  RoundedBox,
  Sparkles,
} from "@react-three/drei";
import "./EVCarScene.css";

function Wheel({ position }) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      {/* Tyre */}
      <mesh castShadow>
        <cylinderGeometry args={[0.38, 0.38, 0.25, 32]} />
        <meshStandardMaterial color="#030712" roughness={0.75} />
      </mesh>

      {/* Alloy */}
      <mesh position={[0, -0.14, 0]}>
        <cylinderGeometry args={[0.23, 0.23, 0.03, 16]} />
        <meshStandardMaterial
          color="#94a3b8"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

function ElectricCar() {
  const carRef = useRef();

  useFrame((state, delta) => {
    if (carRef.current) {
      carRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.08} floatIntensity={0.35}>
      <group ref={carRef} position={[0, 0.2, 0]}>
        {/* Main body */}
        <RoundedBox
          args={[3.4, 0.65, 1.45]}
          radius={0.22}
          smoothness={5}
          castShadow
        >
          <meshPhysicalMaterial
            color="#0066ff"
            metalness={0.8}
            roughness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </RoundedBox>

        {/* Upper cabin */}
        <RoundedBox
          args={[1.85, 0.7, 1.23]}
          radius={0.25}
          smoothness={5}
          position={[-0.25, 0.58, 0]}
          castShadow
        >
          <meshPhysicalMaterial
            color="#071426"
            metalness={0.6}
            roughness={0.15}
            transmission={0.15}
          />
        </RoundedBox>

        {/* Roof */}
        <RoundedBox
          args={[1.5, 0.12, 1.05]}
          radius={0.08}
          position={[-0.28, 0.97, 0]}
        >
          <meshStandardMaterial
            color="#0f172a"
            metalness={0.9}
            roughness={0.2}
          />
        </RoundedBox>

        {/* Blue side light strips */}
        <mesh position={[0, 0.13, 0.735]}>
          <boxGeometry args={[2.55, 0.05, 0.025]} />
          <meshStandardMaterial
            color="#00eaff"
            emissive="#00eaff"
            emissiveIntensity={4}
          />
        </mesh>

        <mesh position={[0, 0.13, -0.735]}>
          <boxGeometry args={[2.55, 0.05, 0.025]} />
          <meshStandardMaterial
            color="#00eaff"
            emissive="#00eaff"
            emissiveIntensity={4}
          />
        </mesh>

        {/* Front headlights */}
        {[-0.48, 0.48].map((z) => (
          <mesh key={z} position={[1.72, 0.08, z]}>
            <boxGeometry args={[0.05, 0.16, 0.35]} />
            <meshStandardMaterial
              color="#dffaff"
              emissive="#00eaff"
              emissiveIntensity={8}
            />
          </mesh>
        ))}

        {/* Back lights */}
        {[-0.48, 0.48].map((z) => (
          <mesh key={z} position={[-1.72, 0.08, z]}>
            <boxGeometry args={[0.05, 0.14, 0.3]} />
            <meshStandardMaterial
              color="#ff1744"
              emissive="#ff1744"
              emissiveIntensity={6}
            />
          </mesh>
        ))}

        {/* Wheels */}
        <Wheel position={[1.15, -0.3, 0.73]} />
        <Wheel position={[1.15, -0.3, -0.73]} />
        <Wheel position={[-1.15, -0.3, 0.73]} />
        <Wheel position={[-1.15, -0.3, -0.73]} />
      </group>
    </Float>
  );
}

export default function EVCarScene() {
  return (
    <div className="ev-3d-scene">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [5, 2.6, 5.5], fov: 42 }}
      >
        <color attach="background" args={["#030712"]} />

        <ambientLight intensity={1.2} />

        <directionalLight
          position={[5, 6, 4]}
          intensity={3}
          color="#ffffff"
          castShadow
        />

        <pointLight
          position={[-4, 2, -3]}
          intensity={25}
          color="#0066ff"
        />

        <pointLight
          position={[4, 1, 3]}
          intensity={18}
          color="#00eaff"
        />

        <Suspense fallback={null}>
          <ElectricCar />

          <Sparkles
            count={45}
            scale={[8, 4, 8]}
            size={1.5}
            speed={0.3}
            color="#00d9ff"
          />

          <ContactShadows
            position={[0, -0.55, 0]}
            opacity={0.65}
            scale={9}
            blur={2.5}
            far={5}
          />
        </Suspense>

        <gridHelper
          args={[20, 30, "#0066ff", "#10213d"]}
          position={[0, -0.57, 0]}
        />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>

      <div className="ev-3d-hint">Drag karke 360° dekhein</div>
    </div>
  );
}