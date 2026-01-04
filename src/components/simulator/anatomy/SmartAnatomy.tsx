import { Suspense } from 'react';
import type { ToolType, MedialWallState } from '@/types/simulator';
import { ProceduralAnatomy } from './ProceduralAnatomy';
import { ICAGroup } from './HighFidelityICA';
import { MedialWallGroup } from './ShaderMedialWall';

interface SmartAnatomyProps {
  heartbeatPhase: number;
  medialWall?: MedialWallState;
  activeTool?: ToolType;
  isToolActive?: boolean;
  tumorRemoval?: number;
  depth: number;
}

/**
 * Smart anatomy component that renders the surgical field.
 * 
 * Uses a hybrid approach:
 * - Shader-based ICA with pulsation (always uses procedural + shader)
 * - Shader-based medial walls with alpha-mask resection
 * - Procedural geometry for background structures
 * - GLB models will be used when placed in public/models/
 * 
 * This design allows immediate functionality with procedural geometry
 * while seamlessly upgrading to high-fidelity Blender assets when available.
 */
export function SmartAnatomy({
  heartbeatPhase,
  medialWall,
  activeTool,
  isToolActive,
  tumorRemoval = 0,
  depth,
}: SmartAnatomyProps) {
  return (
    <Suspense fallback={null}>
      <group name="smart-anatomy">
        {/* Background procedural structures */}
        <ProceduralAnatomy
          heartbeatPhase={heartbeatPhase}
          medialWall={medialWall}
          activeTool={activeTool}
          isToolActive={isToolActive}
          tumorRemoval={tumorRemoval}
          depth={depth}
        />

        {/* Shader-based ICA with pulsation */}
        <ICAGroup heartbeatPhase={heartbeatPhase} />

        {/* Shader-based medial walls with alpha-mask resection */}
        <MedialWallGroup
          isToolActive={isToolActive}
          activeTool={activeTool}
        />
      </group>
    </Suspense>
  );
}

export default SmartAnatomy;
