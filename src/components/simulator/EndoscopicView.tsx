import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { EndoscopeState, ScopeAngle, AnatomicalStructure, MedialWallState, ToolType } from '@/types/simulator';
import { getVisibleStructures, getStructureColor, isInDangerZone } from '@/data/anatomicalStructures';
import { LEFT_ICA_CURVE, RIGHT_ICA_CURVE } from '@/lib/anatomy/ICAGeometry';

interface EndoscopicViewProps {
  endoscopeState: EndoscopeState;
  showBloodOverlay?: boolean;
  bloodLevel?: number;
  showFog?: boolean;
  dopplerSignal?: number;
  medialWall?: MedialWallState;
  activeTool?: ToolType;
  isToolActive?: boolean;
}

// Individual anatomical structure mesh with enhanced realism
function AnatomyMesh({ 
  structure, 
  tipPosition,
  scopeAngle,
  heartbeatPhase,
}: { 
  structure: AnatomicalStructure;
  tipPosition: { x: number; y: number; z: number };
  scopeAngle: ScopeAngle;
  heartbeatPhase: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const inDanger = isInDangerZone(tipPosition, structure);
  
  // Use tissue-specific color if available
  const color = useMemo(() => {
    if (structure.tissueProperties?.color) {
      return structure.tissueProperties.color;
    }
    return getStructureColor(structure.type);
  }, [structure.type, structure.tissueProperties?.color]);
  
  // Pulsating effect for vessels (ICA, MHT, ILT)
  useFrame(() => {
    if (meshRef.current) {
      // Pulsating vessels
      if (structure.tissueProperties?.pulsating) {
        const pulse = Math.sin(heartbeatPhase) * 0.05 + 1;
        meshRef.current.scale.setScalar(pulse);
      }
      // Danger zone pulsation for critical structures
      else if (inDanger && structure.isCritical) {
        const dangerPulse = Math.sin(heartbeatPhase * 4) * 0.1 + 1;
        meshRef.current.scale.setScalar(dangerPulse);
      }
    }
  });

  // Different geometry based on structure type
  const geometry = useMemo(() => {
    switch (structure.type) {
      case 'vessel':
        // Tubular vessels
        return new THREE.TorusGeometry(structure.bounds.radius, 0.1, 16, 32);
      case 'nerve':
        // Thin cylindrical nerves
        return new THREE.CylinderGeometry(0.04, 0.04, structure.bounds.radius * 2, 8);
      case 'landmark':
        // Ring markers for anatomical landmarks
        return new THREE.RingGeometry(structure.bounds.radius * 0.6, structure.bounds.radius, 32);
      case 'dura':
        // Flat planes for dural surfaces
        return new THREE.PlaneGeometry(structure.bounds.radius * 2, structure.bounds.radius * 1.5);
      case 'gland':
        // Slightly flattened sphere for glandular tissue
        return new THREE.SphereGeometry(structure.bounds.radius, 32, 24);
      case 'tumor':
        // Irregular-ish tumor shape
        return new THREE.DodecahedronGeometry(structure.bounds.radius, 1);
      default:
        return new THREE.SphereGeometry(structure.bounds.radius, 32, 32);
    }
  }, [structure]);

  // Material properties based on tissue type
  const materialProps = useMemo(() => {
    const baseProps = {
      color,
      emissive: inDanger ? '#ff0000' : '#000000',
      emissiveIntensity: inDanger ? 0.5 : 0,
    };

    switch (structure.type) {
      case 'vessel':
        return { 
          ...baseProps, 
          roughness: 0.3, 
          metalness: 0.2,
          emissive: structure.tissueProperties?.pulsating ? '#660000' : baseProps.emissive,
          emissiveIntensity: structure.tissueProperties?.pulsating ? 0.2 : baseProps.emissiveIntensity,
        };
      case 'nerve':
        return { ...baseProps, roughness: 0.6, metalness: 0 };
      case 'dura':
        return { ...baseProps, roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide };
      case 'gland':
        return { ...baseProps, roughness: 0.7, metalness: 0 };
      case 'tumor':
        return { ...baseProps, roughness: 0.8, metalness: 0, transparent: true, opacity: 0.9 };
      case 'tissue':
        return { ...baseProps, roughness: 0.85, metalness: 0 };
      default:
        return { ...baseProps, roughness: 0.5, metalness: 0 };
    }
  }, [color, inDanger, structure.type, structure.tissueProperties?.pulsating]);

  return (
    <mesh
      ref={meshRef}
      position={[
        structure.bounds.center.x,
        structure.bounds.center.y,
        structure.bounds.center.z,
      ]}
      geometry={geometry}
      rotation={structure.type === 'nerve' ? [0, 0, Math.PI / 2] : undefined}
    >
      <meshStandardMaterial {...materialProps} />
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

// Sellar floor region with medial wall visualization
function SellarRegion({ 
  visible, 
  tumorRemoval = 0, 
  heartbeatPhase,
  medialWall 
}: { 
  visible: boolean; 
  tumorRemoval?: number; 
  heartbeatPhase: number;
  medialWall?: MedialWallState;
}) {
  if (!visible) return null;
  
  const leftIntegrity = medialWall?.leftIntegrity ?? 1.0;
  const rightIntegrity = medialWall?.rightIntegrity ?? 1.0;
  
  return (
    <group position={[0, 0.2, 9.5]}>
      {/* Sellar dura layer */}
      <mesh position={[0, 0, -0.2]}>
        <planeGeometry args={[1.5, 1.2]} />
        <meshStandardMaterial
          color="hsl(220, 15%, 65%)"
          roughness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Left Medial wall - dynamic transparency based on integrity */}
      {leftIntegrity > 0 && (
        <mesh position={[-0.6, 0, 0.1]} rotation={[0, Math.PI / 6, 0]}>
          <planeGeometry args={[0.4, 0.8]} />
          <meshStandardMaterial
            color="hsl(220, 12%, 70%)"
            roughness={0.4}
            side={THREE.DoubleSide}
            transparent
            opacity={leftIntegrity * 0.9}
          />
        </mesh>
      )}
      
      {/* Right Medial wall */}
      {rightIntegrity > 0 && (
        <mesh position={[0.6, 0, 0.1]} rotation={[0, -Math.PI / 6, 0]}>
          <planeGeometry args={[0.4, 0.8]} />
          <meshStandardMaterial
            color="hsl(220, 12%, 70%)"
            roughness={0.4}
            side={THREE.DoubleSide}
            transparent
            opacity={rightIntegrity * 0.9}
          />
        </mesh>
      )}
      
      {/* Tumor pseudocapsule (avascular plane) */}
      {tumorRemoval < 0.3 && (
        <mesh scale={1.05 - tumorRemoval}>
          <sphereGeometry args={[0.65, 32, 32]} />
          <meshStandardMaterial
            color="hsl(30, 20%, 75%)"
            roughness={0.6}
            transparent
            opacity={0.4}
          />
        </mesh>
      )}
      
      {/* Tumor (scales down as removed) */}
      <mesh scale={Math.max(0, 1 - tumorRemoval)}>
        <dodecahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial
          color="hsl(320, 30%, 55%)"
          roughness={0.75}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Normal pituitary gland (becomes visible as tumor removed) */}
      {tumorRemoval > 0.5 && (
        <mesh position={[0, 0.35, 0.15]} scale={0.25}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshStandardMaterial
            color="hsl(15, 50%, 55%)"
            roughness={0.7}
          />
        </mesh>
      )}
      
      {/* Pituitary stalk (visible when tumor cleared) */}
      {tumorRemoval > 0.7 && (
        <mesh position={[0, 0.5, 0.2]}>
          <cylinderGeometry args={[0.05, 0.08, 0.3, 12]} />
          <meshStandardMaterial
            color="hsl(15, 45%, 50%)"
            roughness={0.6}
          />
        </mesh>
      )}
    </group>
  );
}

// Cavernous Sinus Scene with pulsating ICA and CN VI
function CavernousSinusScene({ 
  visible, 
  heartbeatPhase 
}: { 
  visible: boolean; 
  heartbeatPhase: number;
}) {
  const leftICARef = useRef<THREE.Mesh>(null);
  const rightICARef = useRef<THREE.Mesh>(null);
  
  // Pulsating ICA animation (70 BPM)
  useFrame(() => {
    const beat = 1 + Math.sin(heartbeatPhase) * 0.03;
    if (leftICARef.current) leftICARef.current.scale.set(beat, beat, 1);
    if (rightICARef.current) rightICARef.current.scale.set(beat, beat, 1);
  });
  
  if (!visible) return null;
  
  return (
    <group>
      {/* Left Internal Carotid Artery - tube geometry following curve */}
      <mesh ref={leftICARef}>
        <tubeGeometry args={[LEFT_ICA_CURVE, 20, 0.35, 8, false]} />
        <meshStandardMaterial 
          color="#d92b2b" 
          roughness={0.3}
          emissive="#660000"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Right Internal Carotid Artery */}
      <mesh ref={rightICARef}>
        <tubeGeometry args={[RIGHT_ICA_CURVE, 20, 0.35, 8, false]} />
        <meshStandardMaterial 
          color="#d92b2b" 
          roughness={0.3}
          emissive="#660000"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* CN VI (Abducens) - Yellow nerve inferior/lateral to ICA */}
      {/* Left side */}
      <mesh position={[-0.5, -0.5, 9.5]}>
        <tubeGeometry args={[
          new THREE.LineCurve3(
            new THREE.Vector3(0, -0.5, 0),
            new THREE.Vector3(0, 0.5, 0)
          ),
          10, 0.05, 6, false
        ]} />
        <meshStandardMaterial color="#f2e85c" />
      </mesh>
      
      {/* Right side */}
      <mesh position={[0.5, -0.5, 9.5]}>
        <tubeGeometry args={[
          new THREE.LineCurve3(
            new THREE.Vector3(0, -0.5, 0),
            new THREE.Vector3(0, 0.5, 0)
          ),
          10, 0.05, 6, false
        ]} />
        <meshStandardMaterial color="#f2e85c" />
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
      intensity={2.5}
      color="#fff5e6"
      castShadow
      target-position={[position[0], position[1], position[2] + 5]}
    />
  );
}

// Main scene component with heartbeat sync
function Scene({ 
  endoscopeState, 
  dopplerSignal = 0,
  medialWall 
}: { 
  endoscopeState: EndoscopeState; 
  dopplerSignal?: number;
  medialWall?: MedialWallState;
}) {
  const { camera } = useThree();
  const tipPos = endoscopeState.tipPosition;
  const depth = endoscopeState.insertionDepth;
  const angle = endoscopeState.currentAngle;
  const [heartbeatPhase, setHeartbeatPhase] = useState(0);
  
  // Get visible structures based on current position
  const visibleStructures = useMemo(
    () => getVisibleStructures(depth, angle),
    [depth, angle]
  );
  
  // Update camera to follow endoscope tip and heartbeat phase
  useFrame(({ clock }) => {
    // Heartbeat rhythm (~72 BPM = 1.2Hz)
    setHeartbeatPhase(clock.elapsedTime * Math.PI * 2.4);
    
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
      <ambientLight intensity={0.08} />
      <EndoscopeLight position={[tipPos.x, tipPos.y, tipPos.z]} />
      
      {/* Anatomical structures */}
      <NasalCorridor />
      <SphenoidSinus visible={depth > 50} />
      <SellarRegion visible={depth > 70} heartbeatPhase={heartbeatPhase} medialWall={medialWall} />
      
      {/* Cavernous Sinus with ICA and CN VI */}
      <CavernousSinusScene visible={depth > 65} heartbeatPhase={heartbeatPhase} />
      
      {/* Dynamic structures based on visibility */}
      {visibleStructures.map(structure => (
        <AnatomyMesh
          key={structure.id}
          structure={structure}
          tipPosition={tipPos}
          scopeAngle={angle}
          heartbeatPhase={heartbeatPhase}
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

// Dynamic blood overlay effect based on blood level
function BloodOverlay({ level }: { level: number }) {
  if (level <= 0) return null;
  
  const opacity = Math.min(level / 100, 0.95);
  const isCritical = level > 60;
  
  return (
    <div className="absolute inset-0 pointer-events-none rounded-full overflow-hidden">
      {/* Base red haze */}
      <div 
        className="absolute inset-0 bg-red-600 mix-blend-multiply"
        style={{ opacity: opacity * 0.6 }}
      />
      
      {/* Active Bleeding Pulse (Critical State) */}
      {isCritical && (
        <div 
          className="absolute inset-0 bg-red-800 animate-pulse"
          style={{ opacity: 0.3 }}
        />
      )}
      
      {/* Clotting texture at high levels */}
      {level > 40 && (
        <div 
          className="absolute inset-0 bg-gradient-radial from-transparent via-red-900/20 to-red-950/40"
          style={{ opacity: Math.min((level - 40) / 60, 0.5) }}
        />
      )}
    </div>
  );
}

// Fog overlay for close tissue
function FogOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 pointer-events-none lens-fog rounded-full" />
  );
}

// Tool reticle overlay for active tools
function ToolReticle({ tool, isActive }: { tool?: ToolType; isActive?: boolean }) {
  if (!tool || tool === 'scope') return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {/* DRILL: Spinning Crosshair */}
      {tool === 'drill' && (
        <div className={`w-12 h-12 border-2 border-amber-400 rounded-full ${isActive ? 'animate-spin' : ''}`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-0.5 h-full bg-amber-400/50" />
            <div className="absolute w-full h-0.5 bg-amber-400/50" />
          </div>
        </div>
      )}
      
      {/* SUCTION: Vacuum Ring */}
      {tool === 'suction' && (
        <div className={`w-10 h-10 border-2 border-cyan-400 rounded-full ${isActive ? 'animate-ping' : ''}`} style={{ animationDuration: '1s' }} />
      )}
      
      {/* DOPPLER: Radar Pulse */}
      {tool === 'doppler' && (
        <div className="relative">
          <div className="w-8 h-8 border-2 border-green-400 rounded-full" />
          {isActive && (
            <div className="absolute inset-0 w-8 h-8 border-2 border-green-400 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
          )}
        </div>
      )}
      
      {/* CAUTERY: Glow effect */}
      {tool === 'cautery' && isActive && (
        <div className="w-4 h-4 bg-orange-500 rounded-full shadow-lg shadow-orange-500/50 animate-pulse" />
      )}
    </div>
  );
}

export default function EndoscopicView({
  endoscopeState,
  showBloodOverlay = false,
  bloodLevel = 0,
  showFog = false,
  medialWall,
  activeTool,
  isToolActive,
}: EndoscopicViewProps) {
  // Use bloodLevel for dynamic overlay, fallback to boolean
  const effectiveBloodLevel = bloodLevel > 0 ? bloodLevel : (showBloodOverlay ? 50 : 0);
  
  return (
    <div className="relative w-full h-full bg-scope-shadow rounded-full overflow-hidden">
      <Canvas shadows>
        <PerspectiveCamera makeDefault fov={90} near={0.1} far={100} />
        <Scene endoscopeState={endoscopeState} medialWall={medialWall} />
      </Canvas>
      
      {/* Overlays */}
      <VignetteOverlay />
      <BloodOverlay level={effectiveBloodLevel} />
      <FogOverlay visible={showFog} />
      <ToolReticle tool={activeTool} isActive={isToolActive} />
      
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
