export interface WalkthroughStep {
  id: string;
  title: string;
  phase: string;
  timeStart: number; // seconds into video
  timeEnd: number;
  narration: string;
  tools: string[];
  landmarks: string[];
  warnings: string[];
  tip: string;
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'nasal-entry',
    title: 'Nasal Cavity Entry',
    phase: 'Navigation',
    timeStart: 0,
    timeEnd: 1.2,
    narration: "We begin with the zero-degree endoscope entering the right nostril. Notice the gentle lateral displacement of the middle turbinate. Our corridor runs medial to the turbinate, along the nasal septum toward the sphenoid ostium.",
    tools: ['0° Endoscope'],
    landmarks: ['Middle Turbinate', 'Nasal Septum', 'Inferior Turbinate'],
    warnings: ['Avoid turbinate trauma - causes bleeding that obscures the field'],
    tip: 'Keep the scope parallel to the floor of the nose for optimal trajectory.'
  },
  {
    id: 'sphenoid-approach',
    title: 'Sphenoid Sinus Approach',
    phase: 'Navigation',
    timeStart: 1.2,
    timeEnd: 2.5,
    narration: "Advancing posteriorly, we identify the sphenoid ostium - our gateway to the sella. The natural ostium sits at the junction of the superior and middle turbinates. We'll enlarge this opening to create our surgical corridor.",
    tools: ['0° Endoscope', 'Suction'],
    landmarks: ['Sphenoid Ostium', 'Superior Turbinate', 'Choana'],
    warnings: ['The sphenopalatine artery runs nearby - brisk bleeding if injured'],
    tip: 'The ostium is typically 1.5cm above the choana.'
  },
  {
    id: 'sphenoidotomy',
    title: 'Sphenoidotomy',
    phase: 'Exposure',
    timeStart: 2.5,
    timeEnd: 4.0,
    narration: "Using the Kerrison rongeur, I'm enlarging the sphenoidotomy bilaterally. We need adequate exposure to visualize both carotid prominences and the sellar floor. The septations within the sphenoid must be removed carefully.",
    tools: ['Kerrison Rongeur', '0° Endoscope'],
    landmarks: ['Sphenoid Sinus', 'Intersinus Septum', 'Rostrum'],
    warnings: ['Septations may insert onto the carotid - always check with Doppler'],
    tip: 'Remove septations at their base to prevent tearing vascular structures.'
  },
  {
    id: 'doppler-mapping',
    title: 'Doppler Interrogation',
    phase: 'Safety Check',
    timeStart: 4.0,
    timeEnd: 5.0,
    narration: "Before any bone work, Doppler is dogma. I'm mapping both internal carotid arteries through the bone. Listen for that arterial signal. The ICAs define our lateral limits - we never work lateral to the carotids.",
    tools: ['Micro-Doppler Probe', '0° Endoscope'],
    landmarks: ['Carotid Prominences', 'Sellar Floor', 'Clival Recess'],
    warnings: ['CRITICAL: Never proceed without confirming ICA position with Doppler'],
    tip: 'Mark the carotid positions mentally - they define your safety corridor.'
  },
  {
    id: 'sellar-opening',
    title: 'Sellar Floor Opening',
    phase: 'Exposure',
    timeStart: 5.0,
    timeEnd: 6.5,
    narration: "Now opening the sellar floor with the high-speed drill. I'm starting in the midline, well away from the carotid canals. The bone here is typically thin - 2 to 3 millimeters. We widen to expose the entire sella.",
    tools: ['High-Speed Drill', '30° Endoscope', 'Suction-Irrigator'],
    landmarks: ['Sellar Floor', 'Dural Surface', 'Cavernous Sinus Margins'],
    warnings: ['Thin bone may transmit heat to dura - irrigate constantly'],
    tip: 'Use the drill in short bursts with continuous irrigation.'
  },
  {
    id: 'dural-opening',
    title: 'Dural Incision',
    phase: 'Tumor Access',
    timeStart: 6.5,
    timeEnd: 7.5,
    narration: "With bone removed, I'm incising the dura in a cruciate fashion. The tumor often presents immediately - you can see the abnormal tissue bulging into view. We preserve the dural margins for reconstruction later.",
    tools: ['Micro-Scissors', '30° Endoscope', 'Bipolar Cautery'],
    landmarks: ['Sellar Dura', 'Tumor Capsule', 'Normal Pituitary'],
    warnings: ['The intercavernous sinus may bleed - have hemostatic agents ready'],
    tip: 'Coagulate the dura before cutting to minimize bleeding.'
  },
  {
    id: 'tumor-resection',
    title: 'Tumor Debulking',
    phase: 'Resection',
    timeStart: 7.5,
    timeEnd: 9.0,
    narration: "Beginning tumor debulking with the ring curette. For functioning adenomas, our goal is gross total resection for biochemical cure. I'm using a circumferential peeling technique - starting medially and working superiorly. Never go inferior first - that's where the carotid hides in the cavernous sinus.",
    tools: ['Ring Curette', 'Suction', '30° Endoscope'],
    landmarks: ['Tumor', 'Medial Wall', 'Diaphragma Sellae', 'Cavernous Sinus'],
    warnings: ['Watch for CSF leak from the diaphragma - indicates suprasellar extent'],
    tip: 'Start low, go superior. Deliver the tumor into the cavity for removal.'
  },
  {
    id: 'hemostasis-closure',
    title: 'Hemostasis & Closure',
    phase: 'Reconstruction',
    timeStart: 9.0,
    timeEnd: 10.0,
    narration: "With resection complete, we achieve hemostasis and reconstruct. The sella is packed with fat graft, followed by fascia lata and tissue sealant. For large defects, a nasoseptal flap provides vascularized coverage. The goal is watertight closure to prevent CSF leak.",
    tools: ['Bipolar Cautery', 'Fat Graft', 'Tissue Sealant'],
    landmarks: ['Resection Cavity', 'Diaphragma', 'Dural Margins'],
    warnings: ['CSF leak is the most common complication - ensure watertight repair'],
    tip: 'Layer your reconstruction: fat, fascia, sealant, flap if needed.'
  }
];

export function getStepAtTime(timeSeconds: number): WalkthroughStep | null {
  return WALKTHROUGH_STEPS.find(
    step => timeSeconds >= step.timeStart && timeSeconds < step.timeEnd
  ) || null;
}

export function getNextStep(currentId: string): WalkthroughStep | null {
  const currentIndex = WALKTHROUGH_STEPS.findIndex(s => s.id === currentId);
  if (currentIndex === -1 || currentIndex >= WALKTHROUGH_STEPS.length - 1) return null;
  return WALKTHROUGH_STEPS[currentIndex + 1];
}

export function getPreviousStep(currentId: string): WalkthroughStep | null {
  const currentIndex = WALKTHROUGH_STEPS.findIndex(s => s.id === currentId);
  if (currentIndex <= 0) return null;
  return WALKTHROUGH_STEPS[currentIndex - 1];
}
