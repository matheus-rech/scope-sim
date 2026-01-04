import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { inputRefs } from '@/store/inputRefs';
import {
  wallVertexShader,
  wallFragmentShader,
  createWallGridTexture,
  updateWallGridTexture,
  createWallUniforms,
} from '@/lib/shaders/WallResectionShader';
import type { ToolType } from '@/types/simulator';

interface ShaderMedialWallProps {
  side: 'left' | 'right';
  isToolActive?: boolean;
  activeTool?: ToolType;
  glbModel?: THREE.Mesh | null;
}

// Wall positioning to match existing procedural geometry
const WALL_POSITIONS = {
  left: { x: -0.55, y: 0.2, z: 9.5, rotY: 0.3 },
  right: { x: 0.55, y: 0.2, z: 9.5, rotY: -0.3 },
} as const;

/**
 * Shader-based medial wall with alpha-mask resection.
 * Paints transparency based on inputRefs.wallGrid data.
 */
export function ShaderMedialWall({
  side,
  isToolActive = false,
  activeTool,
  glbModel = null,
}: ShaderMedialWallProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const textureRef = useRef<THREE.DataTexture | null>(null);

  const pos = WALL_POSITIONS[side];

  // Create wall grid texture on mount
  useEffect(() => {
    textureRef.current = createWallGridTexture(inputRefs.wallGrid);
    return () => {
      textureRef.current?.dispose();
    };
  }, []);

  // Shader uniforms
  const uniforms = useMemo(() => {
    const tex = createWallGridTexture(inputRefs.wallGrid);
    textureRef.current = tex;
    return createWallUniforms(tex);
  }, []);

  // Procedural plane geometry (fallback if no GLB)
  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(0.9, 0.7, 10, 10);
  }, []);

  // Update texture and uniforms every frame
  useFrame((state) => {
    if (textureRef.current && materialRef.current) {
      // Update wall grid texture from inputRefs
      updateWallGridTexture(textureRef.current, inputRefs.wallGrid);

      // Update time for animation
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;

      // Update tool activity status
      const isResecting =
        isToolActive &&
        (activeTool === 'curette' || activeTool === 'dissector');
      materialRef.current.uniforms.uToolActive.value = isResecting ? 1.0 : 0.0;

      // Update tool UV position (approximate from tool position)
      if (isResecting) {
        const toolPos = inputRefs.toolPosition;
        // Convert world position to approximate UV
        const uvX = THREE.MathUtils.clamp((toolPos.x - pos.x + 0.45) / 0.9, 0, 1);
        const uvY = THREE.MathUtils.clamp((toolPos.y - pos.y + 0.35) / 0.7, 0, 1);
        materialRef.current.uniforms.uToolUV.value.set(uvX, uvY);
      }
    }
  });

  // If using GLB model with proper UVs
  if (glbModel) {
    return (
      <primitive
        object={glbModel}
        position={[pos.x, pos.y, pos.z]}
        rotation={[0, pos.rotY, 0]}
      >
        <shaderMaterial
          ref={materialRef}
          vertexShader={wallVertexShader}
          fragmentShader={wallFragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </primitive>
    );
  }

  // Procedural fallback
  return (
    <mesh
      position={[pos.x, pos.y, pos.z]}
      rotation={[0, pos.rotY, 0]}
      geometry={geometry}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={wallVertexShader}
        fragmentShader={wallFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Renders both medial walls
 */
export function MedialWallGroup({
  isToolActive,
  activeTool,
}: {
  isToolActive?: boolean;
  activeTool?: ToolType;
}) {
  return (
    <group name="medial-wall-group">
      <ShaderMedialWall
        side="left"
        isToolActive={isToolActive}
        activeTool={activeTool}
      />
      <ShaderMedialWall
        side="right"
        isToolActive={isToolActive}
        activeTool={activeTool}
      />
    </group>
  );
}
