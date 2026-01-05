# NeuroEndoSim - Endoscopic Surgery Simulator

## Overview

NeuroEndoSim is a web-based endoscopic pituitary surgery training simulator. It provides residents and surgeons with a realistic training environment for transsphenoidal endoscopic procedures, featuring hand tracking for instrument control, AI-powered coaching, anatomically accurate 3D visualization, and comprehensive performance metrics.

The application simulates a complete surgical workflow through five progressive levels: nasal navigation, sphenoidotomy, sellar exposure, tumor resection, and reconstruction. It includes Doppler ultrasound simulation for ICA (internal carotid artery) proximity detection, haptic feedback patterns, and real-time surgical coaching from an AI attending physician.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, built with Vite
- **3D Rendering**: React Three Fiber (@react-three/fiber) with Three.js for endoscopic surgical view
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom medical/surgical theme using HSL CSS variables
- **State Management**: Zustand for global game state, React hooks for local state
- **Hand Tracking**: MediaPipe Tasks Vision (@mediapipe/tasks-vision) with FilesetResolver and HandLandmarker for webcam-based gesture recognition

### Backend Architecture
- **Server**: Express.js running on port 5001
- **API Proxy**: Vite dev server proxies /api requests to Express backend
- **Database**: PostgreSQL with Drizzle ORM for session persistence
- **AI Integration**: Lovable AI Gateway for vision analysis and coaching

### Key Design Patterns

**Unified Store Architecture**
- `src/store.ts` combines mutable refs (inputRefs) and Zustand reactive state
- inputRefs: Direct memory access for 60 FPS physics, updated without React re-renders
- useGameStore: Zustand-based reactive state for UI components
- Clear separation between physics data and UI-reactive state in a single file

**Anatomy & Collision System**
- `src/anatomy.ts` defines ICA path arrays and collision detection utilities
- Provides getNearestICADistance() for Doppler and safety checks
- ICA_PARAMS defines danger/warning radii for proximity alerts

**Physics Engines**
- `src/engines/physics.ts` handles collision detection and tool interactions
- `src/engines/audio.ts` manages Doppler audio feedback based on ICA proximity

**Level-Based Progression**
- Five surgical levels with distinct objectives and tool requirements
- `src/lib/levels/LevelManager.ts` handles level transitions and objective evaluation
- Each level has specific anatomical structures visible at different depths/angles

**Surgical Rule Engine**
- `src/lib/surgical/SurgicalRuleEngine.ts` evaluates real-time surgical decisions
- Rules for Doppler usage, tissue handling, ICA proximity warnings
- Generates coaching messages and complication triggers

### Data Flow
1. MediaPipe processes webcam → Hand landmarks
2. HandMapper converts landmarks → Gesture + position data
3. inputRefs updated directly (no React)
4. useFrame physics loop reads refs → Updates scope/tool positions
5. Collision detection runs → Updates gameStore if needed
6. React components render from gameStore state

## Recent Changes

### Migration Complete (January 2026)
- Unified store: Combined `inputRefs` and `gameStore` into single `src/store.ts`
- Created `src/anatomy.ts` with ICA paths and collision detection
- Created engine modules: `src/engines/audio.ts` and `src/engines/physics.ts`
- Migrated hand tracking to @mediapipe/tasks-vision (FilesetResolver + HandLandmarker)
- Created `src/components/HandInput.tsx` and backward-compatible `src/hooks/useHandTracking.ts`
- Updated SmartAnatomy.tsx to use new structure
- Archived old files in `src/_archive/`

## External Dependencies

### Third-Party Services
- **Lovable AI Gateway**: Used for vision-based surgical scene analysis and AI coaching
  - Endpoint: `https://ai.gateway.lovable.dev/v1/chat/completions`
  - Model: `google/gemini-3-pro-image-preview`
  - Requires `LOVABLE_API_KEY` environment variable

- **ElevenLabs TTS**: Text-to-speech for attending physician narration
  - Used via Supabase Edge Functions
  - Requires `ELEVENLABS_API_KEY` environment variable

- **Supabase**: Backend-as-a-service for edge functions
  - Edge function: `orientation-tts` for narration audio
  - Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`

### Database
- **PostgreSQL**: Session persistence via Drizzle ORM
  - Requires `DATABASE_URL` environment variable
  - Schema defined in `shared/schema.ts`
  - Migrations stored in `/migrations` directory

### Key NPM Dependencies
- `@mediapipe/tasks-vision`: Hand tracking with FilesetResolver and HandLandmarker
- `@react-three/fiber` + `@react-three/drei`: 3D rendering
- `@supabase/supabase-js`: Supabase client
- `drizzle-orm` + `drizzle-kit`: Database ORM and migrations
- `zustand`: State management
- `zod`: Schema validation