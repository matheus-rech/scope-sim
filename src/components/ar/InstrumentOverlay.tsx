/**
 * InstrumentOverlay - AR overlay component that positions 3D instruments
 * based on hand tracking landmarks from MediaPipe
 */

import { useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SurgicalInstrument } from './InstrumentModels';
import { inputRefs } from '@/store';
import { ToolType } from '@/types/simulator';

interface HandTransform {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
}

function useHandTransform(isRightHand: boolean = false): HandTransform {
  const handRef = isRightHand ? inputRefs.rightHand : inputRefs.leftHand;
  
  const position = useMemo(() => new THREE.Vector3(), []);
  const rotation = useMemo(() => new THREE.Euler(), []);
  
  const handData = isRightHand ? inputRefs.rightHand : inputRefs.leftHand;
  
  position.set(
    handData.x * 0.5,
    handData.y * 0.5,
    0
  );
  
  const wristRot = 'rot' in handData ? (handData as any).rot : 0;
  rotation.set(
    0,
    0,
    wristRot * (Math.PI / 180)
  );
  
  return {
    position,
    rotation,
    scale: 1,
  };
}

interface TrackedInstrumentProps {
  tool: ToolType;
  isActive: boolean;
  useRightHand?: boolean;
}

function TrackedInstrument({ tool, isActive, useRightHand = false }: TrackedInstrumentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const smoothPosition = useRef(new THREE.Vector3());
  const smoothRotation = useRef(new THREE.Euler());
  
  useFrame(() => {
    if (!groupRef.current) return;
    
    const handData = useRightHand ? inputRefs.rightHand : inputRefs.leftHand;
    const targetX = handData.x * 0.3;
    const targetY = handData.y * 0.3;
    const targetZ = handData.z * 0.1;
    
    smoothPosition.current.x += (targetX - smoothPosition.current.x) * 0.2;
    smoothPosition.current.y += (targetY - smoothPosition.current.y) * 0.2;
    smoothPosition.current.z += (targetZ - smoothPosition.current.z) * 0.2;
    
    groupRef.current.position.copy(smoothPosition.current);
    
    const wristRot = 'rot' in handData ? (handData as any).rot : 0;
    const targetRotZ = wristRot * (Math.PI / 180);
    
    smoothRotation.current.z += (targetRotZ - smoothRotation.current.z) * 0.15;
    
    groupRef.current.rotation.x = Math.PI / 2;
    groupRef.current.rotation.z = smoothRotation.current.z;
    
    const pinchStrength = 'pinchStrength' in handData ? (handData as any).pinchStrength : 0;
    const scale = 1 + pinchStrength * 0.1;
    groupRef.current.scale.setScalar(scale);
  });
  
  const gripAmount = inputRefs.rightHand.pinchStrength;
  
  return (
    <group ref={groupRef}>
      <SurgicalInstrument 
        tool={tool} 
        isActive={isActive} 
        gripAmount={gripAmount}
        scale={15}
      />
    </group>
  );
}

interface InstrumentSceneProps {
  tool: ToolType;
  isActive: boolean;
  showSecondaryHand?: boolean;
}

function InstrumentScene({ tool, isActive, showSecondaryHand = false }: InstrumentSceneProps) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <directionalLight position={[-3, 2, 4]} intensity={0.5} color="#88ccff" />
      <pointLight position={[0, 0, 2]} intensity={0.5} color="#ffffff" />
      
      <TrackedInstrument tool={tool} isActive={isActive} useRightHand={false} />
      
      {showSecondaryHand && (
        <TrackedInstrument tool="scope" isActive={false} useRightHand={true} />
      )}
    </>
  );
}

interface InstrumentOverlayProps {
  tool: ToolType;
  isActive: boolean;
  showSecondaryHand?: boolean;
  className?: string;
}

export function InstrumentOverlay({ 
  tool, 
  isActive, 
  showSecondaryHand = false,
  className = ''
}: InstrumentOverlayProps) {
  return (
    <div className={`pointer-events-none ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 1], fov: 50, near: 0.01, far: 100 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <InstrumentScene 
          tool={tool} 
          isActive={isActive} 
          showSecondaryHand={showSecondaryHand}
        />
      </Canvas>
    </div>
  );
}

export default InstrumentOverlay;
