import { ToolType } from '@/types/simulator';

// Detailed prompts for generating high-quality surgical tool icons
export const TOOL_ICON_PROMPTS: Record<ToolType, { prompt: string; fallbackEmoji: string }> = {
  scope: {
    prompt: 'A minimalist medical endoscope icon, side view, showing a thin tube with fiber optic lighting at the tip, surgical steel color with cyan glow at tip, clean vector style for dark UI',
    fallbackEmoji: '🔭',
  },
  doppler: {
    prompt: 'A minimalist ultrasound Doppler probe icon, handheld medical device with sound waves emanating from tip, amber/orange accent color, clean vector style for dark UI',
    fallbackEmoji: '📡',
  },
  drill: {
    prompt: 'A minimalist surgical bone drill icon, precision medical instrument with rotating burr tip, metallic silver with blue accents, clean vector style for dark UI',
    fallbackEmoji: '🔧',
  },
  dissector: {
    prompt: 'A minimalist surgical dissector instrument icon, fine-tipped precision tool for tissue separation, curved tip, teal/green accent, clean vector style for dark UI',
    fallbackEmoji: '✂️',
  },
  curette: {
    prompt: 'A minimalist surgical curette icon, spoon-shaped scraping instrument for tumor removal, small cup at end, red accent color, clean vector style for dark UI',
    fallbackEmoji: '🥄',
  },
  suction: {
    prompt: 'A minimalist surgical suction cannula icon, thin tube with suction tip, showing air flow lines, cyan accent, clean vector style for dark UI',
    fallbackEmoji: '💨',
  },
  cautery: {
    prompt: 'A minimalist electrocautery pen icon, surgical electrode with electric spark at tip, orange/yellow glow effect, clean vector style for dark UI',
    fallbackEmoji: '⚡',
  },
  irrigation: {
    prompt: 'A minimalist surgical irrigation syringe icon, clear fluid droplets at tip, blue water accent color, clean vector style for dark UI',
    fallbackEmoji: '💧',
  },
};

export const TOOL_LABELS: Record<ToolType, string> = {
  scope: 'Endoscope',
  doppler: 'Doppler',
  drill: 'Drill',
  dissector: 'Dissector',
  curette: 'Curette',
  suction: 'Suction',
  cautery: 'Cautery',
  irrigation: 'Irrigation',
};
