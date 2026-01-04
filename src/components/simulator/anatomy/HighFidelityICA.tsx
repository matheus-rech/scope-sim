import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  icaVertexShader,
  icaFragmentShader,
  createICAUniforms,
} from '@/lib/shaders/WallResectionShader';
import { createICACurve } from '@/lib/anatomy/ICAGeometry';

interface HighFidelityICAProps {
  side: 'left' | 'right';
  heartbeatPhase: number;
  useGLB?: boolean;
  glbModel?: THREE.Group | null;
}

/**
 * High-fidelity ICA component with pulsation shader.
 * Uses GLB model if provided, otherwise falls back to procedural tube.
 */
export function HighFidelityICA({
  side,
  heartbeatPhase,
  useGLB = false,
  glbModel = null,
}: HighFidelityICAProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Create procedural tube geometry if no GLB
  const geometry = useMemo(() => {
    const curve = createICACurve(side);
    return new THREE.TubeGeometry(curve, 64, 0.18, 16, false);
  }, [side]);

  // Shader uniforms
  const uniforms = useMemo(() => createICAUniforms(), []);

  // Update heartbeat phase every frame
  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uHeartbeatPhase.value = heartbeatPhase;
    }
  });

  // If using GLB model
  if (useGLB && glbModel) {
    return (
      <primitive object={glbModel}>
        <shaderMaterial
          ref={materialRef}
          vertexShader={icaVertexShader}
          fragmentShader={icaFragmentShader}
          uniforms={uniforms}
        />
      </primitive>
    );
  }

  // Procedural fallback with shader
  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={icaVertexShader}
        fragmentShader={icaFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

/**
 * Renders both ICAs with synchronized pulsation
 */
export function ICAGroup({ heartbeatPhase }: { heartbeatPhase: number }) {
  return (
    <group name="ica-group">
      <HighFidelityICA side="left" heartbeatPhase={heartbeatPhase} />
      <HighFidelityICA side="right" heartbeatPhase={heartbeatPhase} />
    </group>
  );
}
