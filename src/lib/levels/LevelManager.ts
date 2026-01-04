import {
  LevelId,
  LevelState,
  LevelObjective,
  AttendingMessage,
  EndoscopeState,
} from '@/types/simulator';

// Level definitions with objectives and scripted coaching
interface LevelDefinition {
  id: LevelId;
  name: string;
  description: string;
  objectives: Omit<LevelObjective, 'isCompleted' | 'currentValue'>[];
  targetTime: number; // seconds
  coaching: LevelCoaching;
}

interface LevelCoaching {
  intro: string;
  hints: CoachingHint[];
  success: string;
  failure: string;
}

interface CoachingHint {
  trigger: 'time' | 'depth' | 'collision' | 'angle' | 'objective';
  condition: (state: { 
    depth: number; 
    angle: number; 
    time: number; 
    collisions: number;
    objectivesCompleted: number;
  }) => boolean;
  message: string;
  type: AttendingMessage['type'];
  once?: boolean;
}

export const LEVEL_DEFINITIONS: Record<LevelId, LevelDefinition> = {
  1: {
    id: 1,
    name: 'Nasal Corridor Navigation',
    description: 'Navigate from the nostril to the sphenoid ostium without mucosal trauma',
    objectives: [
      { id: 'reach_turbinate', description: 'Identify the middle turbinate', targetValue: 1 },
      { id: 'find_ostium', description: 'Locate the sphenoid ostium', targetValue: 1 },
      { id: 'use_30_scope', description: 'Use 30° scope to visualize lateral anatomy', targetValue: 1 },
      { id: 'min_contacts', description: 'Keep mucosal contacts under 3', targetValue: 3 },
    ],
    targetTime: 120,
    coaching: {
      intro: "Welcome, resident. Today we'll practice navigating the nasal corridor. Start with a 0° scope and advance slowly.",
      hints: [
        {
          trigger: 'depth',
          condition: ({ depth }) => depth > 20 && depth < 30,
          message: "Good advancement. You should be approaching the middle turbinate. Keep the septum on your left.",
          type: 'info',
          once: true,
        },
        {
          trigger: 'collision',
          condition: ({ collisions }) => collisions === 1,
          message: "You're contacting the mucosa. Pull back slightly and redirect. Gentle movements.",
          type: 'warning',
        },
        {
          trigger: 'collision',
          condition: ({ collisions }) => collisions >= 3,
          message: "Too many contacts - you're causing unnecessary trauma. Slow down.",
          type: 'critical',
        },
        {
          trigger: 'depth',
          condition: ({ depth }) => depth > 40 && depth < 50,
          message: "You're past the middle turbinate. Now switch to a 30° scope and look superiorly and laterally for the ostium.",
          type: 'info',
          once: true,
        },
        {
          trigger: 'angle',
          condition: ({ angle, depth }) => angle === 30 && depth > 40,
          message: "Good scope angle. The sphenoid ostium should be visible medial to the superior turbinate.",
          type: 'success',
          once: true,
        },
        {
          trigger: 'time',
          condition: ({ time }) => time > 90,
          message: "You're taking a bit long. In the OR, efficiency matters. Focus on your target.",
          type: 'warning',
          once: true,
        },
      ],
      success: "Excellent work. You've successfully navigated to the sphenoid ostium with minimal trauma. Ready to proceed to sphenoidotomy.",
      failure: "Let's try again. Remember: smooth, deliberate movements. The nasal corridor is narrow - respect the anatomy.",
    },
  },
  2: {
    id: 2,
    name: 'Sphenoidotomy',
    description: 'Enlarge the sphenoid ostium using the drill while maintaining stable visualization',
    objectives: [
      { id: 'position_scope', description: 'Position scope 1-2cm from target', targetValue: 1 },
      { id: 'create_opening', description: 'Create adequate opening (15mm)', targetValue: 15 },
      { id: 'maintain_stability', description: 'Maintain scope stability while drilling', targetValue: 1 },
      { id: 'avoid_lateral', description: 'Avoid lateral wall (carotid zone)', targetValue: 1 },
    ],
    targetTime: 180,
    coaching: {
      intro: "Now we'll enlarge the sphenoid ostium. You'll need two hands - one for the scope, one for the drill. Pinch to activate.",
      hints: [
        {
          trigger: 'objective',
          condition: ({ objectivesCompleted }) => objectivesCompleted === 0,
          message: "First, position your scope with good visualization of the ostium. Keep a stable distance.",
          type: 'info',
          once: true,
        },
        {
          trigger: 'depth',
          condition: ({ depth }) => depth > 60,
          message: "Good positioning. Now use your secondary hand to activate the drill. Pinch gesture.",
          type: 'info',
          once: true,
        },
      ],
      success: "Well done. You've created an adequate sphenoidotomy while avoiding the lateral structures.",
      failure: "The opening isn't adequate or you've compromised the lateral wall. Let's review the anatomy.",
    },
  },
  3: {
    id: 3,
    name: 'Sellar Exposure & Dural Opening',
    description: 'Expose the sella turcica floor and safely open the dura',
    objectives: [
      { id: 'identify_landmarks', description: 'Identify all 4 optic-carotid recesses', targetValue: 4 },
      { id: 'use_angled_scopes', description: 'Use 3+ different scope angles', targetValue: 3 },
      { id: 'expose_sella', description: 'Expose sellar floor', targetValue: 1 },
      { id: 'open_dura', description: 'Open dura with 10mm incision', targetValue: 10 },
      { id: 'maintain_margins', description: 'Maintain >2mm carotid margin', targetValue: 1 },
    ],
    targetTime: 240,
    coaching: {
      intro: "The sellar region requires careful landmark identification. Use angled scopes to map the bilateral optic-carotid recesses before proceeding.",
      hints: [
        {
          trigger: 'angle',
          condition: ({ angle }) => angle === 45,
          message: "The 45° scope gives you excellent lateral visualization. Look for the carotid protuberance.",
          type: 'info',
          once: true,
        },
        {
          trigger: 'angle',
          condition: ({ angle }) => angle === 70,
          message: "70° lets you see the suprasellar region. The optic chiasm would be just beyond.",
          type: 'info',
          once: true,
        },
      ],
      success: "Beautiful exposure. You've identified the landmarks and created a safe dural opening.",
      failure: "The margins aren't safe or you've missed key landmarks. In the OR, this could mean vascular injury.",
    },
  },
  4: {
    id: 4,
    name: 'Tumor Resection',
    description: 'Remove the pituitary tumor while managing complications',
    objectives: [
      { id: 'resection_extent', description: 'Achieve 80%+ tumor resection', targetValue: 80 },
      { id: 'avoid_cn6', description: 'Avoid abducens nerve injury', targetValue: 1 },
      { id: 'avoid_ica', description: 'Avoid internal carotid injury', targetValue: 1 },
      { id: 'manage_bleeding', description: 'Successfully manage any bleeding', targetValue: 1 },
      { id: 'visualization', description: 'Maintain clear view 70%+ of time', targetValue: 70 },
    ],
    targetTime: 360,
    coaching: {
      intro: "This is where it counts. The tumor is soft and suckable, but the cavernous sinus harbors the ICA and CN VI. Respect the lateral boundaries.",
      hints: [
        {
          trigger: 'depth',
          condition: ({ depth }) => depth > 85,
          message: "You're in the sella now. Start with the central tumor - it's safest. Work peripherally with caution.",
          type: 'info',
          once: true,
        },
        {
          trigger: 'collision',
          condition: ({ collisions }) => collisions > 0,
          message: "Watch your lateral limits. The carotid and abducens are right there.",
          type: 'warning',
        },
      ],
      success: "Outstanding resection. You've achieved good tumor removal while preserving critical structures.",
      failure: "There was a complication. Let's debrief on what happened and how to prevent it.",
    },
  },
  5: {
    id: 5,
    name: 'Reconstruction & Closure',
    description: 'Place sellar graft and ensure CSF-tight closure',
    objectives: [
      { id: 'hemostasis', description: 'Verify complete hemostasis', targetValue: 1 },
      { id: 'icg_check', description: 'Use ICG to verify vascular integrity', targetValue: 1 },
      { id: 'place_graft', description: 'Place fascial graft correctly', targetValue: 1 },
      { id: 'confirm_seal', description: 'Confirm graft stability under irrigation', targetValue: 1 },
    ],
    targetTime: 180,
    coaching: {
      intro: "The surgery isn't over until the closure is complete. A CSF leak means failure. Let's do this right.",
      hints: [
        {
          trigger: 'objective',
          condition: ({ objectivesCompleted }) => objectivesCompleted >= 2,
          message: "Good progress. Now carefully place the fascial graft. It needs to cover the entire dural defect.",
          type: 'info',
          once: true,
        },
      ],
      success: "Perfect closure. The patient will wake up with an intact repair. Congratulations, you've completed the procedure.",
      failure: "The closure isn't watertight. In the real OR, this means a return trip. Let's review the technique.",
    },
  },
};

export function createLevelState(levelId: LevelId): LevelState {
  const definition = LEVEL_DEFINITIONS[levelId];
  
  return {
    id: levelId,
    name: definition.name,
    objectives: definition.objectives.map(obj => ({
      ...obj,
      isCompleted: false,
      currentValue: 0,
    })),
    metrics: {
      timeElapsed: 0,
      mucosalContacts: 0,
      bloodInField: false,
      scopeAngleChanges: 0,
      complications: [],
    },
    isCompleted: false,
    score: 0,
  };
}

export function getIntroMessage(levelId: LevelId): AttendingMessage {
  const definition = LEVEL_DEFINITIONS[levelId];
  return {
    id: `intro-${levelId}`,
    text: definition.coaching.intro,
    type: 'info',
    timestamp: Date.now(),
  };
}

// Track which hints have been shown (to handle 'once' triggers)
const shownHints = new Set<string>();

export function evaluateCoaching(
  levelId: LevelId,
  state: {
    depth: number;
    angle: number;
    time: number;
    collisions: number;
    objectivesCompleted: number;
  }
): AttendingMessage | null {
  const definition = LEVEL_DEFINITIONS[levelId];
  
  for (const hint of definition.coaching.hints) {
    const hintKey = `${levelId}-${hint.message.slice(0, 20)}`;
    
    if (hint.once && shownHints.has(hintKey)) continue;
    
    if (hint.condition(state)) {
      if (hint.once) shownHints.add(hintKey);
      
      return {
        id: `hint-${Date.now()}`,
        text: hint.message,
        type: hint.type,
        timestamp: Date.now(),
      };
    }
  }
  
  return null;
}

export function getCompletionMessage(levelId: LevelId, success: boolean): AttendingMessage {
  const definition = LEVEL_DEFINITIONS[levelId];
  return {
    id: `completion-${levelId}`,
    text: success ? definition.coaching.success : definition.coaching.failure,
    type: success ? 'success' : 'critical',
    timestamp: Date.now(),
  };
}

export function resetLevelHints(): void {
  shownHints.clear();
}
