import { useMemo } from 'react';
import * as THREE from 'three';
import type { ToolType, MedialWallState } from '@/types/simulator';

interface ProceduralAnatomyProps {
  heartbeatPhase: number;
  medialWall?: MedialWallState;
  activeTool?: ToolType;
  isToolActive?: boolean;
  tumorRemoval?: number;
  depth: number;
}

/**
 * Procedural anatomy fallback when GLB assets aren't available.
 * Renders basic geometric shapes for the surgical field.
 */
export function ProceduralAnatomy({
  heartbeatPhase,
  tumorRemoval = 0,
}: ProceduralAnatomyProps) {
  // Pulsating scale for arteries
  const pulseScale = 1 + Math.sin(heartbeatPhase) * 0.03;

  // Tumor visibility based on removal progress
  const tumorOpacity = Math.max(0, 1 - tumorRemoval);

  return (
    <group name="procedural-anatomy">
      {/* Nasal corridor walls */}
      <NasalCorridor />

      {/* Sphenoid sinus cavity */}
      <SphenoidSinus />

      {/* Sellar region background */}
      <SellarBackground />

      {/* Tumor (if visible) */}
      {tumorOpacity > 0.01 && (
        <Tumor opacity={tumorOpacity} />
      )}

      {/* Pituitary gland */}
      <PituitaryGland />

      {/* Note: ICA and Medial Walls use shader components */}
    </group>
  );
}

function NasalCorridor() {
  const geometry = useMemo(() => new THREE.BoxGeometry(2.2, 1.8, 6), []);

  return (
    <mesh position={[0, 0, 3]} geometry={geometry}>
      <meshStandardMaterial
        color="hsl(350, 45%, 55%)"
        side={THREE.BackSide}
        roughness={0.8}
      />
    </mesh>
  );
}

function SphenoidSinus() {
  const geometry = useMemo(() => new THREE.SphereGeometry(1.8, 32, 32), []);

  return (
    <mesh position={[0, 0.1, 7.5]} geometry={geometry}>
      <meshStandardMaterial
        color="hsl(20, 40%, 35%)"
        side={THREE.BackSide}
        roughness={0.6}
      />
    </mesh>
  );
}

function SellarBackground() {
  const geometry = useMemo(() => new THREE.PlaneGeometry(2.5, 2), []);

  return (
    <mesh position={[0, 0.2, 10.5]} geometry={geometry}>
      <meshStandardMaterial
        color="hsl(220, 15%, 60%)"
        roughness={0.5}
        metalness={0.1}
      />
    </mesh>
  );
}

function Tumor({ opacity }: { opacity: number }) {
  const geometry = useMemo(() => new THREE.DodecahedronGeometry(0.45, 1), []);

  return (
    <mesh position={[0, 0.3, 9.5]} geometry={geometry}>
      <meshStandardMaterial
        color="hsl(340, 50%, 65%)"
        transparent
        opacity={opacity}
        roughness={0.7}
      />
    </mesh>
  );
}

function PituitaryGland() {
  const geometry = useMemo(() => new THREE.SphereGeometry(0.18, 16, 16), []);

  return (
    <mesh position={[0, -0.25, 9.8]} geometry={geometry}>
      <meshStandardMaterial
        color="hsl(30, 55%, 60%)"
        roughness={0.6}
      />
    </mesh>
  );
}

export { NasalCorridor, SphenoidSinus, SellarBackground, Tumor, PituitaryGland };
