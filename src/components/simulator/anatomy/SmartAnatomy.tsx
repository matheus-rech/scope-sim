/**
 * SmartAnatomy - Dynamic anatomical visualization with resection mechanics
 * Uses logic-layer ICA paths for collision and Doppler detection
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ICA_LEFT_PATH, ICA_RIGHT_PATH, getNearestICADistance, ICA_PARAMS } from '@/anatomy';
import { useGameStore, inputRefs } from '@/store';

const WallShader = {
  uniforms: {
    uMap: { value: null },
    uAlphaMap: { value: null },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uMap;
    uniform sampler2D uAlphaMap;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(uMap, vUv);
      float alpha = texture2D(uAlphaMap, vUv).r;
      if (alpha < 0.1) discard;
      gl_FragColor = vec4(color.rgb, 1.0);
    }
  `
};

function createICACurve(path: THREE.Vector3[]): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(path, false, 'catmullrom', 0.5);
}

interface SmartAnatomyProps {
  toolPos?: THREE.Vector3;
  audio?: { updateDoppler: (pos: THREE.Vector3, active: boolean) => number };
}

export const SmartAnatomy = ({ toolPos, audio }: SmartAnatomyProps) => {
  const leftIcaMesh = useRef<THREE.Mesh>(null);
  const rightIcaMesh = useRef<THREE.Mesh>(null);
  const { activeTool, addTrauma, setFeedback, incrementResection } = useGameStore();

  const [traumaCanvas, traumaCtx] = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 256, 256);
    return [c, ctx] as const;
  }, []);

  const traumaTexture = useMemo(() => {
    return new THREE.CanvasTexture(traumaCanvas);
  }, [traumaCanvas]);

  const leftIcaCurve = useMemo(() => createICACurve(ICA_LEFT_PATH), []);
  const rightIcaCurve = useMemo(() => createICACurve(ICA_RIGHT_PATH), []);

  const defaultTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return loader.load('https://threejs.org/examples/textures/uv_grid_opengl.jpg');
  }, []);

  useFrame(({ clock }) => {
    if (!toolPos) return;

    const isDoppler = activeTool === 'doppler' && inputRefs.rightHand.pinch;
    if (audio) {
      const signal = audio.updateDoppler(toolPos, isDoppler);
      if (signal > 0.8) {
        setFeedback("Strong Signal: Anterior Genu Found", "success");
      }
    }

    if (activeTool === 'dissector' && inputRefs.rightHand.pinch) {
      const uvX = (toolPos.x + 1.5) / 3;
      const uvY = (toolPos.y + 1.5) / 3;

      if (uvX > 0 && uvX < 1 && uvY > 0 && uvY < 1) {
        const { distance } = getNearestICADistance(toolPos);

        if (distance < ICA_PARAMS.dangerRadius) {
          addTrauma(2);
          setFeedback("CRITICAL: CAROTID INJURY", "critical");
        } else {
          traumaCtx.globalCompositeOperation = 'destination-out';
          traumaCtx.beginPath();
          traumaCtx.arc(uvX * 256, uvY * 256, 15, 0, Math.PI * 2);
          traumaCtx.fill();

          traumaTexture.needsUpdate = true;
          incrementResection();
        }
      }
    }

    const pulse = 1 + Math.sin(clock.elapsedTime * 10) * 0.03;
    if (leftIcaMesh.current) {
      leftIcaMesh.current.scale.set(pulse, pulse, 1);
    }
    if (rightIcaMesh.current) {
      rightIcaMesh.current.scale.set(pulse, pulse, 1);
    }
  });

  return (
    <group>
      <mesh ref={leftIcaMesh}>
        <tubeGeometry args={[leftIcaCurve, 64, 0.35, 16, false]} />
        <meshStandardMaterial color="#990000" roughness={0.1} metalness={0.3} />
      </mesh>

      <mesh ref={rightIcaMesh}>
        <tubeGeometry args={[rightIcaCurve, 64, 0.35, 16, false]} />
        <meshStandardMaterial color="#990000" roughness={0.1} metalness={0.3} />
      </mesh>

      <mesh position={[-0.5, 0, 8]}>
        <planeGeometry args={[3, 3]} />
        <shaderMaterial 
          args={[WallShader]}
          uniforms-uAlphaMap-value={traumaTexture}
          uniforms-uMap-value={defaultTexture}
          transparent={true}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0, 10]}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial color="#d8a6b8" roughness={0.8} />
      </mesh>
    </group>
  );
};

export default SmartAnatomy;
