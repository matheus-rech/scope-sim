import { Suspense, useEffect, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { ToolType, MedialWallState } from '@/types/simulator';
import { ProceduralAnatomy } from './ProceduralAnatomy';
import { HighFidelityICA } from './HighFidelityICA';
import { ShaderMedialWall } from './ShaderMedialWall';

// Asset paths - MUST match your Blender export filenames exactly
const ASSET_PATHS = {
  icaLeft: '/models/ICA_left.glb',
  icaRight: '/models/ICA_right.glb',
  medialWall: '/models/MedialWall.glb',
  tumor: '/models/Tumor.glb',
} as const;

interface SmartAnatomyProps {
  heartbeatPhase: number;
  medialWall?: MedialWallState;
  activeTool?: ToolType;
  isToolActive?: boolean;
  tumorRemoval?: number;
  depth: number;
}

interface AssetAvailability {
  icaLeft: boolean;
  icaRight: boolean;
  medialWall: boolean;
  tumor: boolean;
}

/**
 * Checks which GLB assets exist in public/models/
 * This runs once on mount to detect available Blender assets.
 */
function useAssetAvailability(): { checked: boolean; available: AssetAvailability } {
  const [state, setState] = useState<{ checked: boolean; available: AssetAvailability }>({
    checked: false,
    available: { icaLeft: false, icaRight: false, medialWall: false, tumor: false },
  });

  useEffect(() => {
    const checkAssets = async () => {
      const checks: AssetAvailability = { icaLeft: false, icaRight: false, medialWall: false, tumor: false };
      
      await Promise.all(
        (Object.keys(ASSET_PATHS) as Array<keyof typeof ASSET_PATHS>).map(async (key) => {
          try {
            const response = await fetch(ASSET_PATHS[key], { method: 'HEAD' });
            checks[key] = response.ok;
          } catch {
            checks[key] = false;
          }
        })
      );
      
      setState({ checked: true, available: checks });
    };
    checkAssets();
  }, []);

  return state;
}

/**
 * Component to load and render a GLB ICA model with shader
 */
function GLBIca({ path, side, heartbeatPhase }: { path: string; side: 'left' | 'right'; heartbeatPhase: number }) {
  const { scene } = useGLTF(path);
  
  // Clone the scene to avoid mutation issues
  const model = scene.clone();
  
  return (
    <HighFidelityICA
      side={side}
      heartbeatPhase={heartbeatPhase}
      useGLB={true}
      glbModel={model}
    />
  );
}

/**
 * Component to load and render a GLB Medial Wall with resection shader
 */
function GLBMedialWall({
  path,
  side,
  isToolActive,
  activeTool,
}: {
  path: string;
  side: 'left' | 'right';
  isToolActive?: boolean;
  activeTool?: ToolType;
}) {
  const { scene } = useGLTF(path);
  
  // Find the mesh in the loaded scene
  let wallMesh: THREE.Mesh | null = null;
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh && !wallMesh) {
      wallMesh = child.clone();
    }
  });
  
  return (
    <ShaderMedialWall
      side={side}
      isToolActive={isToolActive}
      activeTool={activeTool}
      glbModel={wallMesh}
    />
  );
}

/**
 * Component to load and render a GLB Tumor
 */
function GLBTumor({ path, tumorRemoval }: { path: string; tumorRemoval: number }) {
  const { scene } = useGLTF(path);
  
  // Scale based on removal progress
  const scale = 1 - tumorRemoval;
  
  return (
    <primitive 
      object={scene.clone()} 
      scale={[scale, scale, scale]}
    />
  );
}

/**
 * Smart anatomy component that renders the surgical field.
 * 
 * WIRING LOGIC:
 * 1. On mount, HEAD requests check if GLB files exist in public/models/
 * 2. If a GLB exists → useGLTF loads it and applies the appropriate shader
 * 3. If no GLB exists → procedural geometry is used as fallback
 * 
 * CRITICAL FOR BLENDER USERS:
 * - Export models to public/models/ with EXACT names: ICA_left.glb, ICA_right.glb, MedialWall.glb, Tumor.glb
 * - MedialWall MUST be UV unwrapped for the alpha-mask resection shader
 * - ICA models MUST align to ICA_PATH coordinates in ICAGeometry.ts (not centered at origin!)
 * - Scale: 1 Blender unit = 1 scene unit (approximately 1cm)
 */
export function SmartAnatomy({
  heartbeatPhase,
  medialWall,
  activeTool,
  isToolActive,
  tumorRemoval = 0,
  depth,
}: SmartAnatomyProps) {
  const { checked, available } = useAssetAvailability();

  // Don't render until we've checked for assets
  if (!checked) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <group name="smart-anatomy">
        {/* Background procedural structures (always procedural) */}
        <ProceduralAnatomy
          heartbeatPhase={heartbeatPhase}
          medialWall={medialWall}
          activeTool={activeTool}
          isToolActive={isToolActive}
          tumorRemoval={tumorRemoval}
          depth={depth}
        />

        {/* ICA Left: GLB if available, otherwise procedural with shader */}
        {available.icaLeft ? (
          <Suspense fallback={null}>
            <GLBIca path={ASSET_PATHS.icaLeft} side="left" heartbeatPhase={heartbeatPhase} />
          </Suspense>
        ) : (
          <HighFidelityICA side="left" heartbeatPhase={heartbeatPhase} />
        )}

        {/* ICA Right: GLB if available, otherwise procedural with shader */}
        {available.icaRight ? (
          <Suspense fallback={null}>
            <GLBIca path={ASSET_PATHS.icaRight} side="right" heartbeatPhase={heartbeatPhase} />
          </Suspense>
        ) : (
          <HighFidelityICA side="right" heartbeatPhase={heartbeatPhase} />
        )}

        {/* Medial Walls: GLB if available, otherwise procedural with resection shader */}
        {/* Note: We use the same GLB for both walls, just mirror for right side */}
        {available.medialWall ? (
          <Suspense fallback={null}>
            <GLBMedialWall
              path={ASSET_PATHS.medialWall}
              side="left"
              isToolActive={isToolActive}
              activeTool={activeTool}
            />
            {/* Right wall uses same model - ShaderMedialWall handles positioning */}
            <GLBMedialWall
              path={ASSET_PATHS.medialWall}
              side="right"
              isToolActive={isToolActive}
              activeTool={activeTool}
            />
          </Suspense>
        ) : (
          <>
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
          </>
        )}

        {/* Tumor: GLB if available (procedural tumor is in ProceduralAnatomy) */}
        {available.tumor && (
          <Suspense fallback={null}>
            <GLBTumor path={ASSET_PATHS.tumor} tumorRemoval={tumorRemoval} />
          </Suspense>
        )}
      </group>
    </Suspense>
  );
}

export default SmartAnatomy;
