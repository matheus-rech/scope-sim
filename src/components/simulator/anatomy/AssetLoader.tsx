import { useEffect, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Asset paths for Blender models
const ASSET_PATHS = {
  icaLeft: '/models/ICA_left.glb',
  icaRight: '/models/ICA_right.glb',
  medialWall: '/models/MedialWall.glb',
  tumor: '/models/Tumor.glb',
  sellarDura: '/models/SellarDura.glb',
} as const;

export interface AnatomyAssets {
  icaLeft: THREE.Group | null;
  icaRight: THREE.Group | null;
  medialWall: THREE.Mesh | null;
  tumor: THREE.Mesh | null;
  sellarDura: THREE.Mesh | null;
}

/**
 * Preload all anatomy assets for smooth initialization.
 * Call this before rendering the simulator.
 */
export function preloadAnatomyAssets(): void {
  Object.values(ASSET_PATHS).forEach((path) => {
    try {
      useGLTF.preload(path);
    } catch {
      // Asset doesn't exist yet - that's fine, we'll fallback to procedural
    }
  });
}

/**
 * Attempts to load a GLB model, returns null if not found.
 */
function useSafeGLTF(path: string): THREE.Group | null {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (attempted) return;
    
    setAttempted(true);
    
    // Check if asset exists by attempting to fetch
    fetch(path, { method: 'HEAD' })
      .then((response) => {
        if (response.ok) {
          // Asset exists, load it
          import('@react-three/drei').then(({ useGLTF }) => {
            try {
              const gltf = useGLTF(path);
              setModel(gltf.scene.clone());
            } catch {
              setModel(null);
            }
          });
        }
      })
      .catch(() => {
        // Asset doesn't exist
        setModel(null);
      });
  }, [path, attempted]);

  return model;
}

/**
 * Hook to check which anatomy assets are available.
 * Returns an object indicating which GLB files were found.
 */
export function useAnatomyAssetStatus(): {
  loading: boolean;
  available: Record<keyof typeof ASSET_PATHS, boolean>;
} {
  const [status, setStatus] = useState<{
    loading: boolean;
    available: Record<keyof typeof ASSET_PATHS, boolean>;
  }>({
    loading: true,
    available: {
      icaLeft: false,
      icaRight: false,
      medialWall: false,
      tumor: false,
      sellarDura: false,
    },
  });

  useEffect(() => {
    const checkAssets = async () => {
      const checks = await Promise.all(
        Object.entries(ASSET_PATHS).map(async ([key, path]) => {
          try {
            const response = await fetch(path, { method: 'HEAD' });
            return [key, response.ok] as const;
          } catch {
            return [key, false] as const;
          }
        })
      );

      setStatus({
        loading: false,
        available: Object.fromEntries(checks) as Record<keyof typeof ASSET_PATHS, boolean>,
      });
    };

    checkAssets();
  }, []);

  return status;
}

/**
 * Hook to load all available anatomy GLB assets.
 * Returns null for assets that aren't found, allowing fallback to procedural.
 */
export function useAnatomyAssets(): {
  assets: AnatomyAssets;
  loading: boolean;
  hasAnyAssets: boolean;
} {
  const [assets, setAssets] = useState<AnatomyAssets>({
    icaLeft: null,
    icaRight: null,
    medialWall: null,
    tumor: null,
    sellarDura: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAssets = async () => {
      const loadedAssets: AnatomyAssets = {
        icaLeft: null,
        icaRight: null,
        medialWall: null,
        tumor: null,
        sellarDura: null,
      };

      // Try to load each asset
      await Promise.all(
        Object.entries(ASSET_PATHS).map(async ([key, path]) => {
          try {
            const response = await fetch(path, { method: 'HEAD' });
            if (response.ok) {
              // Asset exists - we'll load it dynamically when needed
              // For now, mark it as available (actual loading happens in components)
              // This is a placeholder - real loading will use useGLTF in render
            }
          } catch {
            // Asset not found
          }
        })
      );

      setAssets(loadedAssets);
      setLoading(false);
    };

    loadAssets();
  }, []);

  const hasAnyAssets = Object.values(assets).some((a) => a !== null);

  return { assets, loading, hasAnyAssets };
}

/**
 * Component that loads a single GLB model if it exists.
 * Renders nothing if asset is not found.
 */
export function ConditionalGLTF({
  path,
  onLoad,
  fallback,
}: {
  path: string;
  onLoad?: (scene: THREE.Group) => void;
  fallback?: React.ReactNode;
}) {
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(path, { method: 'HEAD' })
      .then((r) => setExists(r.ok))
      .catch(() => setExists(false));
  }, [path]);

  if (exists === null) return null; // Still checking
  if (exists === false) return <>{fallback}</>; // Not found, use fallback

  // Asset exists, load and render it
  return <GLTFLoader path={path} onLoad={onLoad} />;
}

/**
 * Internal component that actually loads the GLTF
 */
function GLTFLoader({
  path,
  onLoad,
}: {
  path: string;
  onLoad?: (scene: THREE.Group) => void;
}) {
  const { scene } = useGLTF(path);

  useEffect(() => {
    if (scene && onLoad) {
      onLoad(scene.clone());
    }
  }, [scene, onLoad]);

  return <primitive object={scene.clone()} />;
}

// Export paths for reference in Blender export workflow
export { ASSET_PATHS };
