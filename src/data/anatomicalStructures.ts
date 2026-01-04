import { AnatomicalStructure, ScopeAngle, Vector3D } from '@/types/simulator';

// Anatomical structures organized by surgical level/depth
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
  },
  {
    id: 'inferior_turbinate',
    name: 'Inferior Turbinate',
    type: 'tissue',
    bounds: { center: { x: 0.6, y: -0.3, z: 2.5 }, radius: 0.4 },
    isCritical: false,
    visibleAtDepth: [10, 40],
    visibleAtAngles: [0, 30],
  },
  {
    id: 'middle_turbinate',
    name: 'Middle Turbinate',
    type: 'tissue',
    bounds: { center: { x: 0.5, y: 0.2, z: 4 }, radius: 0.5 },
    isCritical: false,
    visibleAtDepth: [25, 55],
    visibleAtAngles: [0, 30, 45],
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
  },
  {
    id: 'sphenoid_septation',
    name: 'Sphenoid Septation',
    type: 'bone',
    bounds: { center: { x: 0.3, y: 0, z: 7.5 }, radius: 0.2 },
    isCritical: false,
    visibleAtDepth: [60, 80],
    visibleAtAngles: [0, 30, 45],
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
    id: 'left_carotid_protuberance',
    name: 'Left Internal Carotid Artery',
    type: 'vessel',
    bounds: { center: { x: -0.8, y: 0, z: 9.5 }, radius: 0.3 },
    isCritical: true,
    visibleAtDepth: [75, 100],
    visibleAtAngles: [45, 70],
  },
  {
    id: 'right_carotid_protuberance',
    name: 'Right Internal Carotid Artery',
    type: 'vessel',
    bounds: { center: { x: 0.8, y: 0, z: 9.5 }, radius: 0.3 },
    isCritical: true,
    visibleAtDepth: [75, 100],
    visibleAtAngles: [45, 70],
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
  },
  {
    id: 'left_cn6',
    name: 'Left Abducens Nerve (CN VI)',
    type: 'nerve',
    bounds: { center: { x: -0.5, y: -0.2, z: 10.5 }, radius: 0.1 },
    isCritical: true,
    visibleAtDepth: [85, 100],
    visibleAtAngles: [45, 70],
  },
  {
    id: 'right_cn6',
    name: 'Right Abducens Nerve (CN VI)',
    type: 'nerve',
    bounds: { center: { x: 0.5, y: -0.2, z: 10.5 }, radius: 0.1 },
    isCritical: true,
    visibleAtDepth: [85, 100],
    visibleAtAngles: [45, 70],
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

// Get color for structure type
export function getStructureColor(type: AnatomicalStructure['type']): string {
  const colors: Record<AnatomicalStructure['type'], string> = {
    bone: 'hsl(40, 25%, 70%)',      // --tissue-bone
    tissue: 'hsl(350, 45%, 65%)',   // --tissue-mucosa
    vessel: 'hsl(0, 70%, 40%)',     // --tissue-vessel
    nerve: 'hsl(55, 70%, 65%)',     // --tissue-nerve
    tumor: 'hsl(120, 40%, 50%)',    // --tissue-tumor
    landmark: 'hsl(185, 80%, 50%)', // --accent
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
