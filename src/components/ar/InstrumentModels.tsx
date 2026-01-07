/**
 * 3D Surgical Instrument Models
 * Procedural geometry for endoscope, curette, and dissector
 * Used for AR overlay on hand tracking
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ToolType } from '@/types/simulator';

interface InstrumentProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  isActive?: boolean;
  gripAmount?: number;
}

const METAL_MATERIAL = {
  color: '#c0c0c0',
  metalness: 0.9,
  roughness: 0.2,
};

const DARK_METAL = {
  color: '#404040',
  metalness: 0.8,
  roughness: 0.3,
};

const GRIP_MATERIAL = {
  color: '#2a2a2a',
  metalness: 0.1,
  roughness: 0.8,
};

export function Endoscope({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, isActive = false }: InstrumentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lensRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (lensRef.current && isActive) {
      const pulse = 0.8 + Math.sin(clock.elapsedTime * 8) * 0.2;
      (lensRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0, 0.15]}>
        <cylinderGeometry args={[0.008, 0.01, 0.3, 16]} />
        <meshStandardMaterial {...METAL_MATERIAL} />
      </mesh>

      <mesh position={[0, 0, 0.31]}>
        <cylinderGeometry args={[0.006, 0.008, 0.02, 16]} />
        <meshStandardMaterial {...DARK_METAL} />
      </mesh>

      <mesh ref={lensRef} position={[0, 0, 0.325]}>
        <sphereGeometry args={[0.007, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#88ccff"
          emissive="#4488ff"
          emissiveIntensity={isActive ? 0.8 : 0.2}
          metalness={0.5}
          roughness={0.1}
          transparent
          opacity={0.9}
        />
      </mesh>

      <mesh position={[0, 0, -0.05]}>
        <cylinderGeometry args={[0.015, 0.012, 0.1, 16]} />
        <meshStandardMaterial {...GRIP_MATERIAL} />
      </mesh>

      <mesh position={[0, 0, -0.12]}>
        <cylinderGeometry args={[0.018, 0.015, 0.04, 16]} />
        <meshStandardMaterial {...METAL_MATERIAL} />
      </mesh>
    </group>
  );
}

export function Curette({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, isActive = false, gripAmount = 0 }: InstrumentProps) {
  const groupRef = useRef<THREE.Group>(null);

  const curetteHeadShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.015, 0.005, 0.02, 0);
    shape.quadraticCurveTo(0.015, -0.005, 0, 0);
    return shape;
  }, []);

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0, 0.12]}>
        <cylinderGeometry args={[0.004, 0.005, 0.24, 12]} />
        <meshStandardMaterial {...METAL_MATERIAL} />
      </mesh>

      <mesh position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
        <extrudeGeometry
          args={[curetteHeadShape, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001 }]}
        />
        <meshStandardMaterial
          color={isActive ? '#ffcc00' : '#d0d0d0'}
          metalness={0.9}
          roughness={0.1}
          emissive={isActive ? '#ff8800' : '#000000'}
          emissiveIntensity={isActive ? 0.3 : 0}
        />
      </mesh>

      <mesh position={[0, 0, -0.05]}>
        <cylinderGeometry args={[0.012, 0.008, 0.1, 16]} />
        <meshStandardMaterial {...GRIP_MATERIAL} />
      </mesh>

      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, 0, -0.08 + i * 0.015]}>
          <torusGeometry args={[0.013, 0.002, 8, 16]} />
          <meshStandardMaterial {...DARK_METAL} />
        </mesh>
      ))}
    </group>
  );
}

export function Dissector({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, isActive = false, gripAmount = 0 }: InstrumentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const jaw1Ref = useRef<THREE.Mesh>(null);
  const jaw2Ref = useRef<THREE.Mesh>(null);

  const jawAngle = gripAmount * 0.3;

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.005, 0.006, 0.2, 12]} />
        <meshStandardMaterial {...METAL_MATERIAL} />
      </mesh>

      <group position={[0, 0, 0.21]}>
        <mesh ref={jaw1Ref} position={[0.003, 0, 0.015]} rotation={[0, 0, jawAngle]}>
          <boxGeometry args={[0.008, 0.003, 0.04]} />
          <meshStandardMaterial
            color={isActive ? '#88ff88' : '#c0c0c0'}
            metalness={0.9}
            roughness={0.15}
            emissive={isActive ? '#00ff00' : '#000000'}
            emissiveIntensity={isActive ? 0.2 : 0}
          />
        </mesh>
        <mesh ref={jaw2Ref} position={[-0.003, 0, 0.015]} rotation={[0, 0, -jawAngle]}>
          <boxGeometry args={[0.008, 0.003, 0.04]} />
          <meshStandardMaterial
            color={isActive ? '#88ff88' : '#c0c0c0'}
            metalness={0.9}
            roughness={0.15}
            emissive={isActive ? '#00ff00' : '#000000'}
            emissiveIntensity={isActive ? 0.2 : 0}
          />
        </mesh>
      </group>

      <mesh position={[0, 0, -0.05]}>
        <cylinderGeometry args={[0.014, 0.01, 0.1, 16]} />
        <meshStandardMaterial {...GRIP_MATERIAL} />
      </mesh>

      <mesh position={[0, 0, -0.12]}>
        <boxGeometry args={[0.025, 0.015, 0.04]} />
        <meshStandardMaterial {...DARK_METAL} />
      </mesh>
    </group>
  );
}

export function DopplerProbe({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, isActive = false }: InstrumentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const tipRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (tipRef.current && isActive) {
      const pulse = 0.5 + Math.sin(clock.elapsedTime * 6) * 0.5;
      (tipRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.006, 0.007, 0.16, 12]} />
        <meshStandardMaterial {...METAL_MATERIAL} />
      </mesh>

      <mesh ref={tipRef} position={[0, 0, 0.17]}>
        <sphereGeometry args={[0.008, 16, 16]} />
        <meshStandardMaterial
          color="#00ccff"
          emissive="#0088ff"
          emissiveIntensity={isActive ? 0.8 : 0.2}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>

      <mesh position={[0, 0, -0.04]}>
        <cylinderGeometry args={[0.012, 0.01, 0.08, 16]} />
        <meshStandardMaterial {...GRIP_MATERIAL} />
      </mesh>

      <mesh position={[0, 0.015, -0.06]}>
        <boxGeometry args={[0.02, 0.01, 0.03]} />
        <meshStandardMaterial color="#222222" metalness={0.2} roughness={0.8} />
      </mesh>
    </group>
  );
}

interface InstrumentSelectorProps {
  tool: ToolType;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  isActive?: boolean;
  gripAmount?: number;
}

export function SurgicalInstrument({ tool, ...props }: InstrumentSelectorProps) {
  switch (tool) {
    case 'scope':
      return <Endoscope {...props} />;
    case 'curette':
      return <Curette {...props} />;
    case 'dissector':
      return <Dissector {...props} />;
    case 'doppler':
      return <DopplerProbe {...props} />;
    default:
      return <Endoscope {...props} />;
  }
}

export default SurgicalInstrument;
