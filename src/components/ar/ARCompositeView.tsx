/**
 * ARCompositeView - Composite renderer that layers 3D instruments over webcam feed
 * Creates the AR effect of holding surgical instruments
 */

import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SurgicalInstrument } from './InstrumentModels';
import { inputRefs, useGameStore } from '@/store';
import { ToolType } from '@/types/simulator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Maximize2, Minimize2, AlertCircle } from 'lucide-react';

interface TrackedInstrumentProps {
  tool: ToolType;
  isActive: boolean;
}

function TrackedInstrument({ tool, isActive }: TrackedInstrumentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const smoothX = useRef(0);
  const smoothY = useRef(0);
  const smoothZ = useRef(0);
  const smoothRot = useRef(0);
  const smoothGrip = useRef(0);

  useFrame(() => {
    if (!groupRef.current) return;
    
    const { leftHand, rightHand } = inputRefs;
    
    const targetX = leftHand.x * 0.25;
    const targetY = leftHand.y * 0.25;
    const targetZ = leftHand.z * 0.05;
    
    smoothX.current += (targetX - smoothX.current) * 0.15;
    smoothY.current += (targetY - smoothY.current) * 0.15;
    smoothZ.current += (targetZ - smoothZ.current) * 0.15;
    
    groupRef.current.position.set(
      smoothX.current,
      smoothY.current,
      smoothZ.current
    );
    
    const targetRot = leftHand.rot * (Math.PI / 180);
    smoothRot.current += (targetRot - smoothRot.current) * 0.12;
    
    groupRef.current.rotation.x = Math.PI / 2;
    groupRef.current.rotation.z = smoothRot.current;
    
    smoothGrip.current += (rightHand.pinchStrength - smoothGrip.current) * 0.2;
    const scale = 12 + smoothGrip.current * 2;
    groupRef.current.scale.setScalar(scale);
  });
  
  return (
    <group ref={groupRef}>
      <SurgicalInstrument 
        tool={tool} 
        isActive={isActive} 
        gripAmount={inputRefs.rightHand.pinchStrength}
      />
    </group>
  );
}

interface ARSceneProps {
  tool: ToolType;
  isActive: boolean;
}

function ARScene({ tool, isActive }: ARSceneProps) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 3, 5]} intensity={0.8} />
      <directionalLight position={[-2, 1, 3]} intensity={0.4} color="#aaccff" />
      <spotLight position={[0, 2, 2]} intensity={0.6} angle={0.5} penumbra={0.5} />
      
      <TrackedInstrument tool={tool} isActive={isActive} />
    </>
  );
}

interface ARCompositeViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  tool: ToolType;
  isActive: boolean;
  showOverlay?: boolean;
  isTracking?: boolean;
  className?: string;
}

export function ARCompositeView({ 
  videoRef, 
  tool, 
  isActive, 
  showOverlay = true,
  isTracking = false,
  className = ''
}: ARCompositeViewProps) {
  const [isVisible, setIsVisible] = useState(showOverlay);
  const [isExpanded, setIsExpanded] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  
  useEffect(() => {
    if (isVisible) {
      setCanvasKey(prev => prev + 1);
    }
  }, [isVisible]);

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        className={`w-full h-full object-cover rounded-lg ${isExpanded ? 'absolute inset-0 z-10' : ''}`}
        autoPlay
        playsInline
        muted
        style={{ transform: 'scaleX(-1)' }}
      />
      
      {isVisible && (
        <div 
          className="absolute inset-0 pointer-events-none z-20"
          style={{ transform: 'scaleX(-1)' }}
        >
          <Canvas
            key={canvasKey}
            camera={{ position: [0, 0, 1], fov: 50, near: 0.001, far: 100 }}
            gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
            style={{ background: 'transparent' }}
          >
            <ARScene tool={tool} isActive={isActive} />
          </Canvas>
        </div>
      )}
      
      <div className="absolute top-2 left-2 z-30 flex flex-wrap gap-1">
        <Badge 
          variant={isActive ? 'default' : 'secondary'}
          className="text-xs"
        >
          {tool.charAt(0).toUpperCase() + tool.slice(1)}
        </Badge>
        
        {isActive && (
          <Badge variant="outline" className="text-xs bg-green-500/20 text-green-400 border-green-500/50">
            Active
          </Badge>
        )}
        
        {!isTracking && (
          <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/50 gap-1">
            <AlertCircle className="h-3 w-3" />
            No Hands
          </Badge>
        )}
      </div>
      
      <div className="absolute top-2 right-2 z-30 flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="bg-background/50 backdrop-blur-sm"
          onClick={() => setIsVisible(!isVisible)}
          data-testid="button-toggle-ar"
        >
          {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
        
        <Button
          size="icon"
          variant="ghost"
          className="bg-background/50 backdrop-blur-sm"
          onClick={() => setIsExpanded(!isExpanded)}
          data-testid="button-toggle-expand"
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>
      
      {isVisible && (
        <div className="absolute bottom-2 left-2 z-30">
          <Badge variant="outline" className="text-xs bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
            AR Mode
          </Badge>
        </div>
      )}
    </div>
  );
}

export default ARCompositeView;
