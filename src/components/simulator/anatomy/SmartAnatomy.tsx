import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ICA_LOGIC_PATH } from '../anatomy';
import { useGameStore, inputRefs } from '../store';

// --- SHADER: Organic Resection ---
// This shader takes a texture map. White = Solid, Black = Hole.
const WallShader = {
  uniforms: {
    uMap: { value: null }, // The Visual Texture (e.g., Dura Mater from Blender)
    uAlphaMap: { value: null }, // The Dynamic Canvas we paint on
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
      float alpha = texture2D(uAlphaMap, vUv).r; // Read Red channel
      if (alpha < 0.1) discard; // Cut the hole
      gl_FragColor = vec4(color.rgb, 1.0);
    }
  `
};

export const SmartAnatomy = ({ toolPos, audio }: any) => {
  const icaMesh = useRef<THREE.Mesh>(null);
  const { activeTool, addResectionProgress, addTrauma, setFeedback } = useGameStore();

  // 1. DYNAMIC CANVAS FOR RESECTION
  // We paint on this invisible 2D canvas, then use it as a mask for the 3D wall
  const [traumaCanvas, traumaCtx] = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'white'; // White = Intact Wall
    ctx.fillRect(0, 0, 256, 256);
    return [c, ctx];
  }, []);

  const traumaTexture = useMemo(() => {
    const t = new THREE.CanvasTexture(traumaCanvas);
    return t;
  }, [traumaCanvas]);

  useFrame(({ clock }) => {
    // A. LOGIC: Doppler Audio
    // We check against the INVISIBLE math curve, not the visual mesh
    const isDoppler = activeTool === 'doppler' && inputRefs.rightHand.pinch;
    const signal = audio.updateDoppler(toolPos, isDoppler);
    if (signal > 0.8) setFeedback("Strong Signal: Anterior Genu Found", "success");

    // B. LOGIC: Resection (Painting)
    // If Dissector is active and pinching, we paint "Black" on the canvas
    if (activeTool === 'dissector' && inputRefs.rightHand.pinch) {
      // Map 3D Tool Position to 2D UV Space of the Wall Plane
      // Wall is approx at Z = -10.5, Width=3, Height=3
      const uvX = (toolPos.x + 1.5) / 3;
      const uvY = (toolPos.y + 1.5) / 3;

      if (uvX > 0 && uvX < 1 && uvY > 0 && uvY < 1) {
         // Check Safety: Are we over the Artery?
         // We check logic curve distance (Logic Layer)
         const distToArtery = toolPos.distanceTo(ICA_LOGIC_PATH.getPointAt(0.5));

         if (distToArtery < 0.4) {
             addTrauma(2);
             setFeedback("CRITICAL: CAROTID INJURY", "critical");
         } else {
             // Safe to Cut: Paint Hole
             traumaCtx.globalCompositeOperation = 'destination-out';
             traumaCtx.beginPath();
             traumaCtx.arc(uvX * 256, uvY * 256, 15, 0, Math.PI * 2);
             traumaCtx.fill();

             // Update Texture
             traumaTexture.needsUpdate = true; // Update 3D Texture
             addResectionProgress(0.5);
         }
      }
    }

    // C. VISUALS: Pulsatile Animation
    // The visual mesh pulses, while the logic curve stays static
    if (icaMesh.current) {
       const pulse = 1 + Math.sin(clock.elapsedTime * 10) * 0.03;
       icaMesh.current.scale.set(pulse, pulse, 1);
    }
  });

  return (
    <group>
      {/* 1. ARTERY VISUALS (Simulating Blender Mesh) */}
      <mesh ref={icaMesh}>
        {/* In a real app, useGLTF() here */}
        <tubeGeometry args={[ICA_LOGIC_PATH, 64, 0.35, 16, false]} />
        <meshStandardMaterial color="#990000" roughness={0.1} metalness={0.3} />
      </mesh>

      {/* 2. MEDIAL WALL VISUALS (Hybrid Shader) */}
      <mesh position={[-0.5, 0, -10.5]}>
        <planeGeometry args={[3, 3]} />
        <shaderMaterial 
          args={[WallShader]}
          uniforms-uAlphaMap-value={traumaTexture}
          // In real app, uMap would be useTexture('/assets/dura_texture.jpg')
          uniforms-uMap-value={new THREE.TextureLoader().load('https://threejs.org/examples/textures/uv_grid_opengl.jpg')} 
          transparent={true}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. TUMOR (Behind Wall) */}
      <mesh position={[-0.5, 0, -11.5]}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial color="#d8a6b8" roughness={0.8} />
      </mesh>
    </group>
  );
};