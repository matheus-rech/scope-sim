import { TumorScenario, AdenomaType, FunctioningSubtype, KnospGrade, KNOSP_GRADES } from '@/types/simulator';

export interface TrainingScenario extends TumorScenario {
  id: string;
  name: string;
  patientDescription: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  learningObjectives: string[];
  recommendedLevel: number;
}

// Predefined training scenarios
export const TRAINING_SCENARIOS: TrainingScenario[] = [
  // Functioning Adenomas
  {
    id: 'fa-gh-knosp0',
    name: 'GH Adenoma - Minimal Invasion',
    type: 'functioning',
    subtype: 'GH',
    knospGrade: 0,
    size: 'micro',
    invasive: false,
    goal: 'biochemical_cure',
    description: 'Pure microadenoma with no cavernous sinus involvement. Ideal for learning aggressive medial wall resection technique.',
    patientDescription: '32-year-old male with early acromegaly. Elevated IGF-1 and GH, subtle facial changes.',
    difficulty: 'beginner',
    learningObjectives: ['Medial wall visualization', 'Complete tumor removal', 'Clean surgical margins'],
    recommendedLevel: 4,
  },
  {
    id: 'fa-gh-knosp2',
    name: 'GH Adenoma - Moderate Invasion',
    type: 'functioning',
    subtype: 'GH',
    knospGrade: 2,
    size: 'macro',
    invasive: true,
    goal: 'biochemical_cure',
    description: 'Macroadenoma extending beyond medial ICA tangent. Requires careful medial wall dissection.',
    patientDescription: '45-year-old female with florid acromegaly, sleep apnea, and carpal tunnel syndrome.',
    difficulty: 'intermediate',
    learningObjectives: ['ICA identification', 'Medial wall technique', 'Doppler-guided resection'],
    recommendedLevel: 4,
  },
  {
    id: 'fa-acth-knosp1',
    name: 'ACTH Adenoma - Cushing\'s',
    type: 'functioning',
    subtype: 'ACTH',
    knospGrade: 1,
    size: 'micro',
    invasive: false,
    goal: 'biochemical_cure',
    description: 'Small corticotroph adenoma. Critical to achieve complete resection for biochemical cure.',
    patientDescription: '38-year-old female with Cushing\'s disease: central obesity, moon facies, diabetes.',
    difficulty: 'intermediate',
    learningObjectives: ['Microadenoma identification', 'Pseudocapsule preservation', 'Complete excision'],
    recommendedLevel: 4,
  },
  {
    id: 'fa-prl-knosp3a',
    name: 'Prolactinoma - Superior Invasion',
    type: 'functioning',
    subtype: 'PRL',
    knospGrade: '3A',
    size: 'macro',
    invasive: true,
    goal: 'biochemical_cure',
    description: 'Large prolactinoma with superior CS compartment invasion. Challenging medial wall anatomy.',
    patientDescription: '28-year-old female with amenorrhea, galactorrhea, and visual field defects.',
    difficulty: 'advanced',
    learningObjectives: ['CN III protection', 'Superior compartment navigation', 'Aggressive wall resection'],
    recommendedLevel: 4,
  },
  // Non-Functioning Adenomas
  {
    id: 'nfa-knosp1',
    name: 'NFA - Mild Compression',
    type: 'non-functioning',
    subtype: undefined,
    knospGrade: 1,
    size: 'macro',
    invasive: false,
    goal: 'decompression',
    description: 'Standard NFA with optic chiasm compression. Goal is safe decompression.',
    patientDescription: '55-year-old male with progressive visual field loss and headaches.',
    difficulty: 'beginner',
    learningObjectives: ['Conservative peeling', 'Chiasm decompression', 'Medial wall preservation'],
    recommendedLevel: 4,
  },
  {
    id: 'nfa-knosp2',
    name: 'NFA - Moderate Extension',
    type: 'non-functioning',
    subtype: undefined,
    knospGrade: 2,
    size: 'macro',
    invasive: true,
    goal: 'decompression',
    description: 'NFA with CS extension. Balance between adequate decompression and nerve preservation.',
    patientDescription: '62-year-old female with bitemporal hemianopia and hypopituitarism.',
    difficulty: 'intermediate',
    learningObjectives: ['Two-surgeon technique', 'Extracapsular dissection', 'CN VI protection'],
    recommendedLevel: 4,
  },
  {
    id: 'nfa-knosp3b',
    name: 'NFA - Inferior Extension',
    type: 'non-functioning',
    subtype: undefined,
    knospGrade: '3B',
    size: 'giant',
    invasive: true,
    goal: 'decompression',
    description: 'Giant adenoma with inferior CS compartment invasion. Focus on safe debulking.',
    patientDescription: '48-year-old male with complete visual loss OS, declining vision OD.',
    difficulty: 'advanced',
    learningObjectives: ['Staged resection planning', 'CN VI monitoring', 'Subtotal resection acceptance'],
    recommendedLevel: 4,
  },
  {
    id: 'nfa-knosp4',
    name: 'NFA - Complete ICA Encasement',
    type: 'non-functioning',
    subtype: undefined,
    knospGrade: 4,
    size: 'giant',
    invasive: true,
    goal: 'decompression',
    description: 'Knosp 4 with complete ICA encasement. Palliative debulking only. Gross total resection not achievable.',
    patientDescription: '70-year-old with panhypopituitarism, CN VI palsy, and declining vision.',
    difficulty: 'expert',
    learningObjectives: ['Knowing limitations', 'Safe debulking', 'ICA preservation'],
    recommendedLevel: 4,
  },
];

// Get scenarios filtered by type
export function getScenariosByType(type: AdenomaType): TrainingScenario[] {
  return TRAINING_SCENARIOS.filter(s => s.type === type);
}

// Get scenarios by difficulty
export function getScenariosByDifficulty(difficulty: TrainingScenario['difficulty']): TrainingScenario[] {
  return TRAINING_SCENARIOS.filter(s => s.difficulty === difficulty);
}

// Get scenario by ID
export function getScenarioById(id: string): TrainingScenario | undefined {
  return TRAINING_SCENARIOS.find(s => s.id === id);
}

// Get recommended strategy based on scenario
export function getRecommendedStrategy(scenario: TumorScenario): {
  approach: string;
  keyConsiderations: string[];
  riskLevel: 'low' | 'moderate' | 'high' | 'very-high';
} {
  const knosp = KNOSP_GRADES[scenario.knospGrade];
  
  if (scenario.type === 'functioning') {
    return {
      approach: 'Aggressive medial wall resection for biochemical cure',
      keyConsiderations: [
        'Doppler confirmation before any incision',
        'Identify and preserve CN III/IV/VI',
        'Pursuit of complete resection warranted',
        'Accept higher risk for cure potential',
      ],
      riskLevel: scenario.knospGrade === 4 ? 'very-high' : 
                 scenario.knospGrade === '3A' || scenario.knospGrade === '3B' ? 'high' : 
                 scenario.knospGrade === 2 ? 'moderate' : 'low',
    };
  } else {
    return {
      approach: 'Conservative peeling technique for safe decompression',
      keyConsiderations: [
        'Preserve medial wall integrity',
        'Prioritize CN VI protection',
        'Accept subtotal resection if needed',
        'Plan for possible adjuvant therapy',
      ],
      riskLevel: scenario.knospGrade === 4 ? 'high' : 
                 scenario.knospGrade === '3A' || scenario.knospGrade === '3B' ? 'moderate' : 'low',
    };
  }
}

// Get expected outcomes based on scenario
export function getExpectedOutcomes(scenario: TumorScenario): {
  remissionRate: number;
  cnPalsyRisk: number;
  bleedingRisk: number;
  csfLeakRisk: number;
} {
  const knosp = KNOSP_GRADES[scenario.knospGrade];
  const baseRemission = knosp.expectedRemission;
  
  // Adjust based on adenoma type
  const remissionModifier = scenario.type === 'functioning' ? 0 : 20; // NFA has no "remission" per se
  
  return {
    remissionRate: scenario.type === 'functioning' ? baseRemission : 0, // NFA doesn't have remission
    cnPalsyRisk: scenario.knospGrade === 4 ? 15 : 
                 scenario.knospGrade === '3A' || scenario.knospGrade === '3B' ? 10 : 
                 scenario.knospGrade === 2 ? 5 : 2,
    bleedingRisk: scenario.invasive ? 8 : 3,
    csfLeakRisk: scenario.size === 'giant' ? 12 : scenario.size === 'macro' ? 6 : 3,
  };
}

// Subtype display information
export const SUBTYPE_INFO: Record<FunctioningSubtype, { name: string; condition: string; urgency: 'routine' | 'urgent' | 'emergent' }> = {
  'GH': { name: 'Growth Hormone', condition: 'Acromegaly', urgency: 'routine' },
  'ACTH': { name: 'Adrenocorticotropic', condition: 'Cushing\'s Disease', urgency: 'urgent' },
  'PRL': { name: 'Prolactin', condition: 'Prolactinoma', urgency: 'routine' },
  'TSH': { name: 'Thyroid Stimulating', condition: 'Hyperthyroidism', urgency: 'routine' },
  'FSH-LH': { name: 'Gonadotropin', condition: 'Gonadotropinoma', urgency: 'routine' },
};

// Knosp grade visual data for UI
export const KNOSP_VISUAL_DATA: Record<KnospGrade, { 
  color: string; 
  label: string; 
  icaStatus: string;
}> = {
  0: { color: 'bg-green-500', label: 'No CS Involvement', icaStatus: 'Clear of ICA' },
  1: { color: 'bg-emerald-500', label: 'Medial to ICA', icaStatus: 'Medial to tangent' },
  2: { color: 'bg-yellow-500', label: 'Between Tangents', icaStatus: 'Partial extension' },
  '3A': { color: 'bg-orange-500', label: 'Superior CS', icaStatus: 'Superior invasion' },
  '3B': { color: 'bg-orange-600', label: 'Inferior CS', icaStatus: 'Inferior invasion' },
  4: { color: 'bg-red-600', label: 'ICA Encasement', icaStatus: 'Complete encasement' },
};
