import { AnatomicalStructure, ScopeAngle, Vector3D } from '@/types/simulator';

// Anatomical structures organized by surgical level/depth
// Enhanced with cavernous sinus anatomy based on expert surgical guides
export const ANATOMICAL_STRUCTURES: AnatomicalStructure[] = [
  // Level 1: Nasal Corridor
  {
    id: 'nasal_septum',
    name: 'Nasal Septum',
    type: 'bone',
    bounds: { center: { x: 0, y: 0, z: 2 }, radius: 0.3 },
    isCritical: false,
    visibleAtDepth: [0, 50],
    visibleAtAngles: [0, 30],
    tissueProperties: { thickness: 'medium', resistance: 0.7, vascularized: false },
  },
  {
    id: 'inferior_turbinate',
    name: 'Inferior Turbinate',
    type: 'tissue',
    bounds: { center: { x: 0.6, y: -0.3, z: 2.5 }, radius: 0.4 },
    isCritical: false,
    visibleAtDepth: [10, 40],
    visibleAtAngles: [0, 30],
    tissueProperties: { thickness: 'medium', resistance: 0.3, vascularized: true },
  },
  {
    id: 'middle_turbinate',
    name: 'Middle Turbinate',
    type: 'tissue',
    bounds: { center: { x: 0.5, y: 0.2, z: 4 }, radius: 0.5 },
    isCritical: false,
    visibleAtDepth: [25, 55],
    visibleAtAngles: [0, 30, 45],
    tissueProperties: { thickness: 'medium', resistance: 0.3, vascularized: true },
  },
  {
    id: 'sphenoid_ostium',
    name: 'Sphenoid Ostium',
    type: 'landmark',
    bounds: { center: { x: 0.2, y: 0.3, z: 5.5 }, radius: 0.3 },
    isCritical: false,
    visibleAtDepth: [40, 60],
    visibleAtAngles: [30, 45],
  },

  // Level 2: Sphenoid Sinus
  {
    id: 'sphenoid_sinus_wall',
    name: 'Sphenoid Sinus Wall',
    type: 'bone',
    bounds: { center: { x: 0, y: 0, z: 7 }, radius: 0.8 },
    isCritical: false,
    visibleAtDepth: [55, 75],
    visibleAtAngles: [0, 30],
    tissueProperties: { thickness: 'thick', resistance: 0.9, vascularized: false },
  },
  {
    id: 'sphenoid_septation',
    name: 'Sphenoid Septation',
    type: 'bone',
    bounds: { center: { x: 0.3, y: 0, z: 7.5 }, radius: 0.2 },
    isCritical: false,
    visibleAtDepth: [60, 80],
    visibleAtAngles: [0, 30, 45],
    tissueProperties: { thickness: 'thin', resistance: 0.6, vascularized: false },
  },
  {
    id: 'tuberculum_sellae',
    name: 'Tuberculum Sellae',
    type: 'landmark',
    bounds: { center: { x: 0, y: 0.5, z: 8 }, radius: 0.25 },
    isCritical: false,
    visibleAtDepth: [65, 85],
    visibleAtAngles: [0, 30],
  },
  {
    id: 'planum_sphenoidale',
    name: 'Planum Sphenoidale',
    type: 'bone',
    bounds: { center: { x: 0, y: 0.7, z: 7.8 }, radius: 0.4 },
    isCritical: false,
    visibleAtDepth: [60, 85],
    visibleAtAngles: [30, 45, 70],
    tissueProperties: { thickness: 'medium', resistance: 0.8, vascularized: false },
  },
  {
    id: 'clivus',
    name: 'Clivus',
    type: 'bone',
    bounds: { center: { x: 0, y: -0.5, z: 8.5 }, radius: 0.5 },
    isCritical: false,
    visibleAtDepth: [65, 90],
    visibleAtAngles: [0, 30],
    tissueProperties: { thickness: 'thick', resistance: 0.95, vascularized: false },
  },

  // Level 3: Sellar Region
  {
    id: 'sellar_floor',
    name: 'Sellar Floor',
    type: 'bone',
    bounds: { center: { x: 0, y: 0.2, z: 9 }, radius: 0.6 },
    isCritical: false,
    visibleAtDepth: [70, 90],
    visibleAtAngles: [0, 30],
    tissueProperties: { thickness: 'thin', resistance: 0.5, vascularized: false },
  },
  {
    id: 'left_optic_carotid_recess',
    name: 'Left Optic-Carotid Recess',
    type: 'landmark',
    bounds: { center: { x: -0.6, y: 0.4, z: 9 }, radius: 0.25 },
    isCritical: true,
    visibleAtDepth: [70, 95],
    visibleAtAngles: [30, 45],
  },
  {
    id: 'right_optic_carotid_recess',
    name: 'Right Optic-Carotid Recess',
    type: 'landmark',
    bounds: { center: { x: 0.6, y: 0.4, z: 9 }, radius: 0.25 },
    isCritical: true,
    visibleAtDepth: [70, 95],
    visibleAtAngles: [30, 45],
  },
  {
    id: 'left_optic_prominence',
    name: 'Left Optic Prominence',
    type: 'landmark',
    bounds: { center: { x: -0.5, y: 0.6, z: 8.8 }, radius: 0.2 },
    isCritical: true,
    visibleAtDepth: [68, 92],
    visibleAtAngles: [30, 45, 70],
  },
  {
    id: 'right_optic_prominence',
    name: 'Right Optic Prominence',
    type: 'landmark',
    bounds: { center: { x: 0.5, y: 0.6, z: 8.8 }, radius: 0.2 },
    isCritical: true,
    visibleAtDepth: [68, 92],
    visibleAtAngles: [30, 45, 70],
  },

  // Cavernous Sinus - Medial Wall
  {
    id: 'left_medial_wall',
    name: 'Left Cavernous Sinus Medial Wall',
    type: 'dura',
    bounds: { center: { x: -0.7, y: 0.1, z: 9.3 }, radius: 0.3 },
    isCritical: false,
    visibleAtDepth: [75, 100],
    visibleAtAngles: [30, 45],
    tissueProperties: { 
      thickness: 'thin', 
      resistance: 0.2, 
      vascularized: true,
      color: 'hsl(220, 15%, 65%)' 
    },
  },
  {
    id: 'right_medial_wall',
    name: 'Right Cavernous Sinus Medial Wall',
    type: 'dura',
    bounds: { center: { x: 0.7, y: 0.1, z: 9.3 }, radius: 0.3 },
    isCritical: false,
    visibleAtDepth: [75, 100],
    visibleAtAngles: [30, 45],
    tissueProperties: { 
      thickness: 'thin', 
      resistance: 0.2, 
      vascularized: true,
      color: 'hsl(220, 15%, 65%)' 
    },
  },

  // Cavernous Sinus - Lateral Wall (thicker, protective)
  {
    id: 'left_lateral_wall',
    name: 'Left Cavernous Sinus Lateral Wall',
    type: 'dura',
    bounds: { center: { x: -1.0, y: 0.1, z: 9.5 }, radius: 0.25 },
    isCritical: false,
    visibleAtDepth: [80, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thick', 
      resistance: 0.8, 
      vascularized: false,
      color: 'hsl(220, 10%, 55%)' 
    },
  },
  {
    id: 'right_lateral_wall',
    name: 'Right Cavernous Sinus Lateral Wall',
    type: 'dura',
    bounds: { center: { x: 1.0, y: 0.1, z: 9.5 }, radius: 0.25 },
    isCritical: false,
    visibleAtDepth: [80, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thick', 
      resistance: 0.8, 
      vascularized: false,
      color: 'hsl(220, 10%, 55%)' 
    },
  },

  // Internal Carotid Arteries - Paraclival and Cavernous segments
  {
    id: 'left_carotid_protuberance',
    name: 'Left Internal Carotid Artery',
    type: 'vessel',
    bounds: { center: { x: -0.8, y: 0, z: 9.5 }, radius: 0.3 },
    isCritical: true,
    visibleAtDepth: [75, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thick', 
      resistance: 1.0, 
      vascularized: true,
      pulsating: true,
      color: 'hsl(0, 75%, 45%)' 
    },
  },
  {
    id: 'right_carotid_protuberance',
    name: 'Right Internal Carotid Artery',
    type: 'vessel',
    bounds: { center: { x: 0.8, y: 0, z: 9.5 }, radius: 0.3 },
    isCritical: true,
    visibleAtDepth: [75, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thick', 
      resistance: 1.0, 
      vascularized: true,
      pulsating: true,
      color: 'hsl(0, 75%, 45%)' 
    },
  },
  {
    id: 'left_paraclival_ica',
    name: 'Left Paraclival ICA',
    type: 'vessel',
    bounds: { center: { x: -0.9, y: -0.3, z: 10 }, radius: 0.25 },
    isCritical: true,
    visibleAtDepth: [82, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thick', 
      resistance: 1.0, 
      vascularized: true,
      pulsating: true,
      color: 'hsl(0, 70%, 40%)' 
    },
  },
  {
    id: 'right_paraclival_ica',
    name: 'Right Paraclival ICA',
    type: 'vessel',
    bounds: { center: { x: 0.9, y: -0.3, z: 10 }, radius: 0.25 },
    isCritical: true,
    visibleAtDepth: [82, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thick', 
      resistance: 1.0, 
      vascularized: true,
      pulsating: true,
      color: 'hsl(0, 70%, 40%)' 
    },
  },

  // Meningohypophyseal Trunk (MHT)
  {
    id: 'left_mht',
    name: 'Left Meningohypophyseal Trunk',
    type: 'vessel',
    bounds: { center: { x: -0.6, y: 0.2, z: 9.8 }, radius: 0.1 },
    isCritical: true,
    visibleAtDepth: [80, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thin', 
      resistance: 0.8, 
      vascularized: true,
      pulsating: true,
      color: 'hsl(0, 60%, 50%)' 
    },
  },
  {
    id: 'right_mht',
    name: 'Right Meningohypophyseal Trunk',
    type: 'vessel',
    bounds: { center: { x: 0.6, y: 0.2, z: 9.8 }, radius: 0.1 },
    isCritical: true,
    visibleAtDepth: [80, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thin', 
      resistance: 0.8, 
      vascularized: true,
      pulsating: true,
      color: 'hsl(0, 60%, 50%)' 
    },
  },

  // Inferolateral Trunk (ILT)
  {
    id: 'left_ilt',
    name: 'Left Inferolateral Trunk',
    type: 'vessel',
    bounds: { center: { x: -0.75, y: -0.15, z: 9.9 }, radius: 0.08 },
    isCritical: true,
    visibleAtDepth: [82, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thin', 
      resistance: 0.7, 
      vascularized: true,
      pulsating: true,
      color: 'hsl(0, 55%, 55%)' 
    },
  },
  {
    id: 'right_ilt',
    name: 'Right Inferolateral Trunk',
    type: 'vessel',
    bounds: { center: { x: 0.75, y: -0.15, z: 9.9 }, radius: 0.08 },
    isCritical: true,
    visibleAtDepth: [82, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thin', 
      resistance: 0.7, 
      vascularized: true,
      pulsating: true,
      color: 'hsl(0, 55%, 55%)' 
    },
  },

  // Cranial Nerves - CN III (Oculomotor)
  {
    id: 'left_cn3',
    name: 'Left Oculomotor Nerve (CN III)',
    type: 'nerve',
    bounds: { center: { x: -0.85, y: 0.35, z: 9.6 }, radius: 0.08 },
    isCritical: true,
    visibleAtDepth: [80, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thin', 
      resistance: 0.3, 
      vascularized: false,
      color: 'hsl(55, 75%, 70%)' 
    },
  },
  {
    id: 'right_cn3',
    name: 'Right Oculomotor Nerve (CN III)',
    type: 'nerve',
    bounds: { center: { x: 0.85, y: 0.35, z: 9.6 }, radius: 0.08 },
    isCritical: true,
    visibleAtDepth: [80, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thin', 
      resistance: 0.3, 
      vascularized: false,
      color: 'hsl(55, 75%, 70%)' 
    },
  },

  // Cranial Nerves - CN IV (Trochlear)
  {
    id: 'left_cn4',
    name: 'Left Trochlear Nerve (CN IV)',
    type: 'nerve',
    bounds: { center: { x: -0.9, y: 0.25, z: 9.65 }, radius: 0.06 },
    isCritical: true,
    visibleAtDepth: [82, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thin', 
      resistance: 0.2, 
      vascularized: false,
      color: 'hsl(55, 70%, 65%)' 
    },
  },
  {
    id: 'right_cn4',
    name: 'Right Trochlear Nerve (CN IV)',
    type: 'nerve',
    bounds: { center: { x: 0.9, y: 0.25, z: 9.65 }, radius: 0.06 },
    isCritical: true,
    visibleAtDepth: [82, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thin', 
      resistance: 0.2, 
      vascularized: false,
      color: 'hsl(55, 70%, 65%)' 
    },
  },

  // Cranial Nerves - CN V1 (Ophthalmic)
  {
    id: 'left_cn5_v1',
    name: 'Left Ophthalmic Nerve (CN V1)',
    type: 'nerve',
    bounds: { center: { x: -0.95, y: 0.1, z: 9.7 }, radius: 0.07 },
    isCritical: true,
    visibleAtDepth: [83, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thin', 
      resistance: 0.25, 
      vascularized: false,
      color: 'hsl(55, 65%, 60%)' 
    },
  },
  {
    id: 'right_cn5_v1',
    name: 'Right Ophthalmic Nerve (CN V1)',
    type: 'nerve',
    bounds: { center: { x: 0.95, y: 0.1, z: 9.7 }, radius: 0.07 },
    isCritical: true,
    visibleAtDepth: [83, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thin', 
      resistance: 0.25, 
      vascularized: false,
      color: 'hsl(55, 65%, 60%)' 
    },
  },

  // Cranial Nerves - CN V2 (Maxillary)
  {
    id: 'left_cn5_v2',
    name: 'Left Maxillary Nerve (CN V2)',
    type: 'nerve',
    bounds: { center: { x: -1.0, y: -0.05, z: 9.75 }, radius: 0.07 },
    isCritical: true,
    visibleAtDepth: [84, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thin', 
      resistance: 0.25, 
      vascularized: false,
      color: 'hsl(55, 60%, 55%)' 
    },
  },
  {
    id: 'right_cn5_v2',
    name: 'Right Maxillary Nerve (CN V2)',
    type: 'nerve',
    bounds: { center: { x: 1.0, y: -0.05, z: 9.75 }, radius: 0.07 },
    isCritical: true,
    visibleAtDepth: [84, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thin', 
      resistance: 0.25, 
      vascularized: false,
      color: 'hsl(55, 60%, 55%)' 
    },
  },

  // Cranial Nerves - CN VI (Abducens) - Most medial in lateral wall
  {
    id: 'left_cn6',
    name: 'Left Abducens Nerve (CN VI)',
    type: 'nerve',
    bounds: { center: { x: -0.5, y: -0.2, z: 10.5 }, radius: 0.1 },
    isCritical: true,
    visibleAtDepth: [85, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thin', 
      resistance: 0.2, 
      vascularized: false,
      color: 'hsl(55, 80%, 70%)' 
    },
  },
  {
    id: 'right_cn6',
    name: 'Right Abducens Nerve (CN VI)',
    type: 'nerve',
    bounds: { center: { x: 0.5, y: -0.2, z: 10.5 }, radius: 0.1 },
    isCritical: true,
    visibleAtDepth: [85, 100],
    visibleAtAngles: [45, 70],
    tissueProperties: { 
      thickness: 'thin', 
      resistance: 0.2, 
      vascularized: false,
      color: 'hsl(55, 80%, 70%)' 
    },
  },

  // Level 4: Tumor and surrounding structures
  {
    id: 'pituitary_tumor',
    name: 'Pituitary Tumor',
    type: 'tumor',
    bounds: { center: { x: 0, y: 0.1, z: 10 }, radius: 0.7 },
    isCritical: false,
    visibleAtDepth: [80, 100],
    visibleAtAngles: [0, 30, 45],
    tissueProperties: { 
      thickness: 'medium', 
      resistance: 0.4, 
      vascularized: true,
      color: 'hsl(320, 30%, 55%)' // Pink-gray for adenoma
    },
  },
  {
    id: 'tumor_pseudocapsule',
    name: 'Tumor Pseudocapsule',
    type: 'tissue',
    bounds: { center: { x: 0, y: 0.1, z: 10 }, radius: 0.75 },
    isCritical: false,
    visibleAtDepth: [82, 100],
    visibleAtAngles: [0, 30, 45],
    tissueProperties: { 
      thickness: 'thin', 
      resistance: 0.3, 
      vascularized: false,
      color: 'hsl(30, 20%, 70%)' // Whitish avascular plane
    },
  },
  {
    id: 'normal_pituitary',
    name: 'Normal Pituitary Gland',
    type: 'gland',
    bounds: { center: { x: 0, y: 0.4, z: 10.2 }, radius: 0.25 },
    isCritical: true,
    visibleAtDepth: [85, 100],
    visibleAtAngles: [0, 30, 45, 70],
    tissueProperties: { 
      thickness: 'medium', 
      resistance: 0.5, 
      vascularized: true,
      color: 'hsl(15, 50%, 55%)' // Reddish-tan
    },
  },
  {
    id: 'pituitary_stalk',
    name: 'Pituitary Stalk',
    type: 'gland',
    bounds: { center: { x: 0, y: 0.55, z: 10.3 }, radius: 0.1 },
    isCritical: true,
    visibleAtDepth: [87, 100],
    visibleAtAngles: [30, 45, 70],
    tissueProperties: { 
      thickness: 'medium', 
      resistance: 0.6, 
      vascularized: true,
      color: 'hsl(15, 45%, 50%)' 
    },
  },
  {
    id: 'suprasellar_cistern',
    name: 'Suprasellar Cistern',
    type: 'landmark',
    bounds: { center: { x: 0, y: 0.6, z: 11 }, radius: 0.4 },
    isCritical: false,
    visibleAtDepth: [90, 100],
    visibleAtAngles: [70],
  },
  {
    id: 'diaphragma_sellae',
    name: 'Diaphragma Sellae',
    type: 'dura',
    bounds: { center: { x: 0, y: 0.5, z: 10.1 }, radius: 0.35 },
    isCritical: false,
    visibleAtDepth: [85, 100],
    visibleAtAngles: [30, 45, 70],
    tissueProperties: { 
      thickness: 'thin', 
      resistance: 0.4, 
      vascularized: false,
      color: 'hsl(220, 15%, 70%)' 
    },
  },
];

// Get structures visible at current depth and angle
export function getVisibleStructures(
  depth: number,
  angle: ScopeAngle
): AnatomicalStructure[] {
  return ANATOMICAL_STRUCTURES.filter(structure => {
    const [minDepth, maxDepth] = structure.visibleAtDepth;
    const isInDepthRange = depth >= minDepth && depth <= maxDepth;
    const isVisibleAtAngle = structure.visibleAtAngles.includes(angle);
    return isInDepthRange && isVisibleAtAngle;
  });
}

// Get color for structure type - enhanced with tissue-accurate colors
export function getStructureColor(type: AnatomicalStructure['type']): string {
  const colors: Record<AnatomicalStructure['type'], string> = {
    bone: 'hsl(45, 35%, 75%)',      // Tan-yellow bone
    tissue: 'hsl(350, 45%, 65%)',   // Pink mucosa
    vessel: 'hsl(0, 70%, 45%)',     // Red-orange vessels
    nerve: 'hsl(55, 75%, 70%)',     // Yellow-white nerves
    tumor: 'hsl(320, 30%, 55%)',    // Pink-gray adenoma
    landmark: 'hsl(185, 80%, 50%)', // Cyan landmarks
    dura: 'hsl(220, 15%, 65%)',     // Gray-white dura
    gland: 'hsl(15, 50%, 55%)',     // Reddish-tan glandular tissue
  };
  return colors[type];
}

// Get structure by ID
export function getStructureById(id: string): AnatomicalStructure | undefined {
  return ANATOMICAL_STRUCTURES.find(s => s.id === id);
}

// Check if structure is in danger zone (critical + close proximity)
export function isInDangerZone(
  tipPosition: Vector3D,
  structure: AnatomicalStructure
): boolean {
  if (!structure.isCritical) return false;
  
  const distance = Math.sqrt(
    Math.pow(tipPosition.x - structure.bounds.center.x, 2) +
    Math.pow(tipPosition.y - structure.bounds.center.y, 2) +
    Math.pow(tipPosition.z - structure.bounds.center.z, 2)
  );
  
  // Warning when within 1.5x the structure radius
  return distance < structure.bounds.radius * 1.5;
}

// Calculate Doppler signal strength based on proximity to ICA
export function getDopplerSignal(tipPosition: Vector3D): { strength: number; nearestDistance: number } {
  const icaStructures = ANATOMICAL_STRUCTURES.filter(s => 
    s.id.includes('carotid') || s.id.includes('ica') || s.id.includes('mht') || s.id.includes('ilt')
  );
  
  let minDistance = Infinity;
  
  for (const structure of icaStructures) {
    const distance = Math.sqrt(
      Math.pow(tipPosition.x - structure.bounds.center.x, 2) +
      Math.pow(tipPosition.y - structure.bounds.center.y, 2) +
      Math.pow(tipPosition.z - structure.bounds.center.z, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
    }
  }
  
  // Signal strength: 1.0 at contact, 0 at 2cm away
  const strength = Math.max(0, Math.min(1, 1 - (minDistance / 2)));
  
  return { strength, nearestDistance: minDistance };
}

// Get structures for a specific Knosp grade scenario
export function getStructuresForKnospGrade(grade: number): string[] {
  // Grade determines which lateral structures are visible/accessible
  const baseStructures = ANATOMICAL_STRUCTURES.map(s => s.id);
  
  if (grade >= 3) {
    // Higher grades expose more lateral wall structures
    return baseStructures;
  }
  
  // Lower grades don't expose the lateral wall as much
  return baseStructures.filter(id => !id.includes('lateral_wall'));
}

// Check if approaching the "danger zone" per surgical guide
export function getProximityWarning(tipPosition: Vector3D): { 
  warning: string | null; 
  severity: 'info' | 'warning' | 'critical' 
} {
  // Check proximity to ICA first (most critical)
  const icaStructures = ANATOMICAL_STRUCTURES.filter(s => 
    s.id.includes('carotid') || s.id.includes('ica')
  );
  
  for (const structure of icaStructures) {
    const distance = Math.sqrt(
      Math.pow(tipPosition.x - structure.bounds.center.x, 2) +
      Math.pow(tipPosition.y - structure.bounds.center.y, 2) +
      Math.pow(tipPosition.z - structure.bounds.center.z, 2)
    );
    
    if (distance < structure.bounds.radius * 1.2) {
      return { warning: `CRITICAL: ${structure.name} contact imminent!`, severity: 'critical' };
    }
    if (distance < structure.bounds.radius * 2) {
      return { warning: `Warning: Approaching ${structure.name}`, severity: 'warning' };
    }
  }
  
  // Check CN VI (most medial nerve, commonly stretched)
  const cn6Structures = ANATOMICAL_STRUCTURES.filter(s => s.id.includes('cn6'));
  
  for (const structure of cn6Structures) {
    const distance = Math.sqrt(
      Math.pow(tipPosition.x - structure.bounds.center.x, 2) +
      Math.pow(tipPosition.y - structure.bounds.center.y, 2) +
      Math.pow(tipPosition.z - structure.bounds.center.z, 2)
    );
    
    if (distance < structure.bounds.radius * 2) {
      return { warning: `Caution: Near ${structure.name} - "Start Low, Go Slow"`, severity: 'warning' };
    }
  }
  
  return { warning: null, severity: 'info' };
}
