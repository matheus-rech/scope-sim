import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { EndoscopeState, ScopeAngle, AnatomicalStructure } from '@/types/simulator';
import { getVisibleStructures, getStructureColor, isInDangerZone } from '@/data/anatomicalStructures';
import { vec3 } from '@/lib/physics/EndoscopePhysics';

interface EndoscopicViewProps {
  endoscopeState: EndoscopeState;
  showBloodOverlay?: boolean;
  showFog?: boolean;
}

// Individual anatomical structure mesh
function AnatomyMesh({ 
  structure, 
  tipPosition,
  scopeAngle,
}: { 
  structure: AnatomicalStructure;
  tipPosition: { x: number; y: number; z: number };
  scopeAngle: ScopeAngle;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const inDanger = isInDangerZone(tipPosition, structure);
  
  const color = useMemo(() => getStructureColor(structure.type), [structure.type]);
  
  // Pulsate critical structures when in danger zone
  useFrame(({ clock }) => {
    if (meshRef.current && inDanger && structure.isCritical) {
      const pulse = Math.sin(clock.elapsedTime * 4) * 0.1 + 1;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  // Different geometry based on structure type
  const geometry = useMemo(() => {
    switch (structure.type) {
      case 'vessel':
        return new THREE.TorusGeometry(structure.bounds.radius, 0.08, 16, 32);
      case 'nerve':
        return new THREE.CylinderGeometry(0.05, 0.05, structure.bounds.radius * 2, 8);
      case 'landmark':
        return new THREE.RingGeometry(structure.bounds.radius * 0.6, structure.bounds.radius, 32);
      default:
        return new THREE.SphereGeometry(structure.bounds.radius, 32, 32);
    }
  }, [structure]);

  return (
    <mesh
      ref={meshRef}
      position={[
        structure.bounds.center.x,
        structure.bounds.center.y,
        structure.bounds.center.z,
      ]}
      geometry={geometry}
    >
      <meshStandardMaterial
        color={color}
        emissive={inDanger ? '#ff0000' : '#000000'}
        emissiveIntensity={inDanger ? 0.5 : 0}
        roughness={structure.type === 'tissue' ? 0.8 : 0.4}
        metalness={structure.type === 'vessel' ? 0.3 : 0}
      />
    </mesh>
  );
}

// Nasal corridor walls
function NasalCorridor() {
  return (
    <group>
      {/* Corridor tube - represents nasal passage */}
      <mesh position={[0, 0, 4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.8, 1.2, 8, 32, 1, true]} />
        <meshStandardMaterial
          color="hsl(350, 45%, 55%)"
          side={THREE.BackSide}
          roughness={0.9}
        />
      </mesh>
      
      {/* Septum - dividing wall */}
      <mesh position={[-0.7, 0, 3]}>
        <boxGeometry args={[0.1, 1.5, 6]} />
        <meshStandardMaterial color="hsl(350, 40%, 50%)" roughness={0.85} />
      </mesh>
    </group>
  );
}

// Sphenoid sinus cavity
function SphenoidSinus({ visible }: { visible: boolean }) {
  if (!visible) return null;
  
  return (
    <group position={[0, 0, 7]}>
      {/* Sinus cavity */}
      <mesh>
        <sphereGeometry args={[1.5, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="hsl(40, 25%, 60%)"
          side={THREE.BackSide}
          roughness={0.7}
        />
      </mesh>
      
      {/* Bony septation */}
      <mesh position={[0.3, 0, 0.5]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.08, 0.8, 1]} />
        <meshStandardMaterial color="hsl(40, 20%, 75%)" roughness={0.5} />
      </mesh>
    </group>
  );
}

// Sellar floor region
function SellarRegion({ visible, tumorRemoval = 0 }: { visible: boolean; tumorRemoval?: number }) {
  if (!visible) return null;
  
  return (
    <group position={[0, 0.2, 9.5]}>
      {/* Dura layer */}
      <mesh position={[0, 0, -0.2]}>
        <planeGeometry args={[1.5, 1.2]} />
        <meshStandardMaterial
          color="hsl(220, 10%, 70%)"
          roughness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Tumor (scales down as removed) */}
      <mesh scale={1 - tumorRemoval}>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial
          color="hsl(120, 40%, 50%)"
          roughness={0.7}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

// Endoscope light source (follows scope)
function EndoscopeLight({ position }: { position: [number, number, number] }) {
  return (
    <spotLight
      position={position}
      angle={0.8}
      penumbra={0.5}
      intensity={2}
      color="#fff5e0"
      castShadow
      target-position={[position[0], position[1], position[2] + 5]}
    />
  );
}

// Main scene component
function Scene({ endoscopeState }: { endoscopeState: EndoscopeState }) {
  const { camera } = useThree();
  const tipPos = endoscopeState.tipPosition;
  const depth = endoscopeState.insertionDepth;
  const angle = endoscopeState.currentAngle;
  
  // Get visible structures based on current position
  const visibleStructures = useMemo(
    () => getVisibleStructures(depth, angle),
    [depth, angle]
  );
  
  // Update camera to follow endoscope tip (first-person view)
  useFrame(() => {
    // Camera at scope tip looking forward
    camera.position.set(tipPos.x, tipPos.y, tipPos.z);
    
    // Apply scope angle rotation
    const angleRad = (angle * Math.PI) / 180;
    camera.rotation.set(angleRad, 0, endoscopeState.rotation * Math.PI / 180);
    
    // Look down the scope axis
    camera.lookAt(tipPos.x, tipPos.y + Math.sin(angleRad), tipPos.z + 5);
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.1} />
      <EndoscopeLight position={[tipPos.x, tipPos.y, tipPos.z]} />
      
      {/* Anatomical structures */}
      <NasalCorridor />
      <SphenoidSinus visible={depth > 50} />
      <SellarRegion visible={depth > 70} />
      
      {/* Dynamic structures based on visibility */}
      {visibleStructures.map(structure => (
        <AnatomyMesh
          key={structure.id}
          structure={structure}
          tipPosition={tipPos}
          scopeAngle={angle}
        />
      ))}
    </>
  );
}

// Vignette overlay for endoscopic look
function VignetteOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none endoscope-vignette rounded-full" />
  );
}

// Blood overlay effect
function BloodOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 pointer-events-none blood-overlay rounded-full" />
  );
}

// Fog overlay for close tissue
function FogOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 pointer-events-none lens-fog rounded-full" />
  );
}

export default function EndoscopicView({
  endoscopeState,
  showBloodOverlay = false,
  showFog = false,
}: EndoscopicViewProps) {
  return (
    <div className="relative w-full h-full bg-scope-shadow rounded-full overflow-hidden">
      <Canvas shadows>
        <PerspectiveCamera makeDefault fov={90} near={0.1} far={100} />
        <Scene endoscopeState={endoscopeState} />
      </Canvas>
      
      {/* Overlays */}
      <VignetteOverlay />
      <BloodOverlay visible={showBloodOverlay} />
      <FogOverlay visible={showFog} />
      
      {/* Scope angle indicator */}
      <div className="absolute top-4 left-4 bg-secondary/80 backdrop-blur px-3 py-1.5 rounded-md border border-border">
        <span className="text-xs text-muted-foreground">Scope: </span>
        <span className="text-sm font-mono text-primary font-bold">
          {endoscopeState.currentAngle}°
        </span>
      </div>
      
      {/* Depth indicator */}
      <div className="absolute top-4 right-4 bg-secondary/80 backdrop-blur px-3 py-1.5 rounded-md border border-border">
        <span className="text-xs text-muted-foreground">Depth: </span>
        <span className="text-sm font-mono text-primary font-bold">
          {endoscopeState.insertionDepth.toFixed(0)}%
        </span>
      </div>
      
      {/* Collision warning */}
      {endoscopeState.isColliding && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-destructive/90 backdrop-blur px-4 py-2 rounded-md glow-danger">
          <span className="text-sm text-destructive-foreground font-medium">
            ⚠ Contact: {endoscopeState.collidingStructure}
          </span>
        </div>
      )}
    </div>
  );
}
