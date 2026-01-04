import { DemoChapter } from './types';

export const DEMO_CHAPTERS: DemoChapter[] = [
  {
    id: 'ai-planning',
    title: 'AI Strategic Planning',
    description: 'See how AI assists with surgical planning and case analysis',
    duration: 90,
    iconName: 'Brain',
    narrationSegments: [
      { text: "Welcome, resident. Before we begin any procedure, let me demonstrate how AI assists with surgical planning.", startTime: 0 },
      { text: "I'm consulting our AI system to analyze this Knosp Grade 2 functioning adenoma presenting with acromegaly.", startTime: 12 },
      { text: "The AI recommends an aggressive medial wall approach to maximize chance of biochemical cure.", startTime: 28 },
      { text: "Notice how it highlights critical structures - the cavernous sinus, carotid arteries, and optic apparatus.", startTime: 45 },
      { text: "The system suggests optimal trajectory angles and identifies potential complications specific to this tumor grade.", startTime: 58 },
      { text: "Strategic planning is essential. The AI helps identify risks before we even enter the nose.", startTime: 75 },
    ],
    demoActions: [
      { type: 'overlay_show', timestamp: 0, data: { overlay: 'case-info', title: 'Case Analysis' } },
      { type: 'ai_request', timestamp: 10, data: { prompt: 'Analyze surgical approach for Knosp Grade 2 functioning adenoma' } },
      { type: 'wait', timestamp: 25, duration: 3 },
      { type: 'overlay_show', timestamp: 28, data: { overlay: 'ai-response' } },
      { type: 'overlay_show', timestamp: 45, data: { overlay: 'anatomy-highlight', structures: ['cavernous_sinus', 'ica', 'optic_nerve'] } },
      { type: 'overlay_show', timestamp: 58, data: { overlay: 'trajectory-map' } },
    ],
  },
  {
    id: 'diagnostic-synthesis',
    title: 'Diagnostic Synthesis',
    description: 'Learn how AI analyzes imaging and generates surgical maps',
    duration: 75,
    iconName: 'ScanSearch',
    narrationSegments: [
      { text: "Next, diagnostic synthesis. We use AI to analyze preoperative imaging and generate actionable insights.", startTime: 0 },
      { text: "The AI processes MRI sequences to identify tumor boundaries, invasion patterns, and critical landmarks.", startTime: 12 },
      { text: "This AI-generated visualization clearly shows the relationship between tumor and cavernous sinus.", startTime: 30 },
      { text: "Notice the internal carotid artery position highlighted in red - this is why Doppler ultrasound is dogma.", startTime: 45 },
      { text: "These synthesized views become our surgical roadmap, reducing intraoperative surprises.", startTime: 60 },
    ],
    demoActions: [
      { type: 'overlay_show', timestamp: 0, data: { overlay: 'mri-display' } },
      { type: 'image_generate', timestamp: 10, data: { type: 'tumor-analysis' } },
      { type: 'overlay_show', timestamp: 28, data: { overlay: 'ai-visualization' } },
      { type: 'overlay_show', timestamp: 45, data: { overlay: 'ica-highlight' } },
    ],
  },
  {
    id: 'endoscopic-dynamics',
    title: 'Endoscopic Dynamics',
    description: 'Watch the attending demonstrate scope and tool techniques',
    duration: 120,
    iconName: 'Telescope',
    narrationSegments: [
      { text: "Now, let's enter the surgical field. Pay close attention to the fulcrum physics of endoscopic navigation.", startTime: 0 },
      { text: "The scope pivots at the nostril. Small hand movements create large tip excursions - this is the lever effect.", startTime: 12 },
      { text: "Watch as I rotate my wrist - this changes the scope angle. Zero degrees for straight ahead, thirty for lateral view.", startTime: 30 },
      { text: "Before any dural incision, Doppler interrogation is mandatory. Let me switch to the Doppler probe.", startTime: 50 },
      { text: "Listen... that arterial signal indicates the internal carotid. We maintain safe distance at all times.", startTime: 65 },
      { text: "Now I'll demonstrate the ring curette technique on the medial wall of the cavernous sinus.", startTime: 82 },
      { text: "Start low, advance superiorly. Never work inferior to cranial nerve six - that's where the artery hides.", startTime: 95 },
      { text: "Practice these movements until they become second nature. Muscle memory saves lives.", startTime: 110 },
    ],
    demoActions: [
      { type: 'camera_move', timestamp: 0, duration: 10, data: { position: { x: 0, y: 0, z: 0.2 }, insertionDepth: 0.1 } },
      { type: 'camera_move', timestamp: 12, duration: 15, data: { position: { x: 0.3, y: 0.1, z: 0.4 }, insertionDepth: 0.3 } },
      { type: 'camera_move', timestamp: 30, duration: 18, data: { rotation: 30, angle: 30 } },
      { type: 'tool_switch', timestamp: 50, data: { tool: 'doppler' } },
      { type: 'doppler_activate', timestamp: 55, duration: 25 },
      { type: 'tool_switch', timestamp: 82, data: { tool: 'curette' } },
      { type: 'camera_move', timestamp: 85, duration: 20, data: { position: { x: 0.1, y: -0.2, z: 0.6 }, insertionDepth: 0.7 } },
    ],
  },
  {
    id: 'grounding-search',
    title: 'Grounding & Search',
    description: 'See how AI retrieves clinical guidelines and evidence',
    duration: 60,
    iconName: 'Search',
    narrationSegments: [
      { text: "Finally, clinical grounding. The AI can search medical literature and guidelines in real-time.", startTime: 0 },
      { text: "Let's query: what are the remission rates for Knosp Grade 3B functioning adenomas with aggressive resection?", startTime: 12 },
      { text: "The literature shows thirty to fifty percent biochemical remission for Grade 3B with experienced surgeons.", startTime: 28 },
      { text: "This evidence directly informs our surgical aggressiveness and patient counseling.", startTime: 42 },
      { text: "Evidence-based practice guides every surgical decision. The AI keeps us current with latest research.", startTime: 50 },
    ],
    demoActions: [
      { type: 'overlay_show', timestamp: 0, data: { overlay: 'search-interface' } },
      { type: 'search_demo', timestamp: 10, data: { query: 'Knosp 3B functioning adenoma remission rates aggressive resection' } },
      { type: 'overlay_show', timestamp: 26, data: { overlay: 'search-results' } },
    ],
  },
];

export function getChapterById(id: string): DemoChapter | undefined {
  return DEMO_CHAPTERS.find(c => c.id === id);
}

export function getNextChapter(currentId: string): DemoChapter | undefined {
  const currentIndex = DEMO_CHAPTERS.findIndex(c => c.id === currentId);
  if (currentIndex === -1 || currentIndex >= DEMO_CHAPTERS.length - 1) return undefined;
  return DEMO_CHAPTERS[currentIndex + 1];
}
