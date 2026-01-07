import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface EnhancedLightingProps {
  tipPosition: { x: number; y: number; z: number };
  bloodLevel: number;
  dopplerActive: boolean;
  insertionDepth: number;
}

export function EnhancedLighting({ 
  tipPosition, 
  bloodLevel, 
  dopplerActive,
  insertionDepth 
}: EnhancedLightingProps) {
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);

  const lightIntensity = useMemo(() => {
    const baseIntensity = 3.5;
    const bloodDim = Math.max(0.3, 1 - bloodLevel / 150);
    const depthFactor = Math.min(1, insertionDepth / 100);
    return baseIntensity * bloodDim * (0.7 + depthFactor * 0.3);
  }, [bloodLevel, insertionDepth]);

  const lightColor = useMemo(() => {
    if (dopplerActive) return '#88ffaa';
    if (bloodLevel > 50) return '#ffcccc';
    return '#fff5e6';
  }, [dopplerActive, bloodLevel]);

  useFrame(() => {
    if (spotLightRef.current) {
      spotLightRef.current.position.set(tipPosition.x, tipPosition.y, tipPosition.z);
      spotLightRef.current.target.position.set(tipPosition.x, tipPosition.y, tipPosition.z + 5);
      spotLightRef.current.target.updateMatrixWorld();
    }
    if (pointLightRef.current) {
      pointLightRef.current.position.set(tipPosition.x, tipPosition.y, tipPosition.z + 0.5);
    }
  });

  return (
    <>
      <ambientLight intensity={0.05} color="#334455" />
      
      <spotLight
        ref={spotLightRef}
        angle={0.9}
        penumbra={0.6}
        intensity={lightIntensity}
        color={lightColor}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.001}
      />
      
      <pointLight
        ref={pointLightRef}
        intensity={lightIntensity * 0.3}
        color={lightColor}
        distance={3}
        decay={2}
      />

      <hemisphereLight
        intensity={0.08}
        color="#ffffff"
        groundColor="#331111"
      />
    </>
  );
}

interface RealisticTissueMaterialProps {
  type: 'mucosa' | 'bone' | 'dura' | 'vessel' | 'nerve' | 'tumor' | 'gland';
  isInteracting?: boolean;
  isPulsating?: boolean;
  pulsePhase?: number;
}

export function createTissueMaterial({
  type,
  isInteracting = false,
  isPulsating = false,
  pulsePhase = 0
}: RealisticTissueMaterialProps): THREE.MeshStandardMaterial {
  const materials: Record<string, Partial<THREE.MeshStandardMaterialParameters>> = {
    mucosa: {
      color: new THREE.Color('#cc7777'),
      roughness: 0.85,
      metalness: 0.02,
      emissive: new THREE.Color('#220000'),
      emissiveIntensity: 0.05,
    },
    bone: {
      color: new THREE.Color('#e8dcc8'),
      roughness: 0.4,
      metalness: 0.1,
    },
    dura: {
      color: new THREE.Color('#aabbcc'),
      roughness: 0.5,
      metalness: 0.05,
      transparent: true,
      opacity: 0.95,
    },
    vessel: {
      color: new THREE.Color('#cc2222'),
      roughness: 0.3,
      metalness: 0.15,
      emissive: new THREE.Color('#440000'),
      emissiveIntensity: isPulsating ? 0.15 + Math.sin(pulsePhase) * 0.1 : 0.1,
    },
    nerve: {
      color: new THREE.Color('#eeee88'),
      roughness: 0.6,
      metalness: 0.02,
      emissive: new THREE.Color('#333300'),
      emissiveIntensity: 0.1,
    },
    tumor: {
      color: new THREE.Color('#aa6688'),
      roughness: 0.75,
      metalness: 0.0,
      transparent: true,
      opacity: 0.92,
    },
    gland: {
      color: new THREE.Color('#cc9988'),
      roughness: 0.7,
      metalness: 0.02,
    },
  };

  const baseParams = materials[type] || materials.mucosa;
  
  if (isInteracting) {
    baseParams.emissive = new THREE.Color('#004444');
    baseParams.emissiveIntensity = 0.2;
  }

  return new THREE.MeshStandardMaterial(baseParams);
}

export function PulsingICA({ 
  curve, 
  heartbeatPhase 
}: { 
  curve: THREE.Curve<THREE.Vector3>;
  heartbeatPhase: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const pulseScale = useMemo(() => {
    return 1 + Math.sin(heartbeatPhase) * 0.04;
  }, [heartbeatPhase]);

  const geometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 32, 0.35, 12, false);
  }, [curve]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.set(pulseScale, pulseScale, 1);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color="#dd3333"
        roughness={0.3}
        metalness={0.15}
        emissive="#660000"
        emissiveIntensity={0.2 + Math.sin(heartbeatPhase) * 0.1}
      />
    </mesh>
  );
}

export function SurgicalFieldFog({ 
  insertionDepth,
  bloodLevel 
}: { 
  insertionDepth: number;
  bloodLevel: number;
}) {
  const { scene } = useThree();

  useEffect(() => {
    const fogNear = Math.max(1, 10 - insertionDepth / 15);
    const fogFar = Math.max(8, 20 - insertionDepth / 10);
    
    let fogColor = new THREE.Color('#111111');
    if (bloodLevel > 30) {
      fogColor = new THREE.Color('#220808');
    }

    scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);

    return () => {
      scene.fog = null;
    };
  }, [scene, insertionDepth, bloodLevel]);

  return null;
}

export function GridFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 5]} receiveShadow>
      <planeGeometry args={[20, 20, 20, 20]} />
      <meshStandardMaterial
        color="#0a0a0a"
        roughness={0.9}
        metalness={0}
        wireframe
        transparent
        opacity={0.1}
      />
    </mesh>
  );
}

export function VignetteEffect({ bloodLevel, icaProximity }: { bloodLevel: number; icaProximity: number | null }) {
  const safeIcaProximity = icaProximity ?? 999;
  const intensity = useMemo(() => {
    const base = 0.5;
    const bloodVignette = Math.min(0.3, bloodLevel / 200);
    const dangerVignette = safeIcaProximity < 0.5 ? 0.2 : 0;
    return base + bloodVignette + dangerVignette;
  }, [bloodLevel, safeIcaProximity]);

  const dangerPulse = safeIcaProximity < 0.3;

  return (
    <div 
      className={`absolute inset-0 pointer-events-none rounded-full ${dangerPulse ? 'animate-pulse' : ''}`}
      style={{
        background: `radial-gradient(ellipse at center, 
          transparent 40%, 
          rgba(0,0,0,${intensity * 0.5}) 70%, 
          rgba(0,0,0,${intensity}) 100%
        )`,
        mixBlendMode: 'multiply'
      }}
    />
  );
}

export function DangerOverlay({ icaProximity }: { icaProximity: number | null }) {
  const safeIcaProximity = icaProximity ?? 999;
  if (safeIcaProximity > 0.5) return null;

  const intensity = Math.max(0, (0.5 - safeIcaProximity) * 2);
  const isCritical = safeIcaProximity < 0.3;

  return (
    <div 
      className={`absolute inset-0 pointer-events-none ${isCritical ? 'animate-pulse' : ''}`}
      style={{
        boxShadow: `inset 0 0 ${40 + intensity * 60}px rgba(255, 0, 0, ${intensity * 0.3})`,
        borderRadius: '50%'
      }}
    />
  );
}

export function BloomGlow() {
  return (
    <div 
      className="absolute inset-0 pointer-events-none rounded-full"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 60%)',
      }}
    />
  );
}
