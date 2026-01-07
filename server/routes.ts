import type { Express } from "express";
import { storage } from "./storage";
import { insertSimulationSessionSchema } from "@shared/schema";
import { registerImageRoutes } from "./replit_integrations/image";

const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export function registerRoutes(app: Express) {
  // Register Gemini image generation routes
  registerImageRoutes(app);

  app.post("/api/vision-analysis", async (req, res) => {
    try {
      const { imageBase64, analysisType } = req.body;
      
      if (!LOVABLE_API_KEY) {
        return res.status(500).json({ error: "LOVABLE_API_KEY is not configured" });
      }

      const systemPrompt = getVisionSystemPrompt(analysisType);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { 
              role: "user", 
              content: [
                { type: "text", text: "Analyze this endoscopic surgical image:" },
                { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } }
              ]
            }
          ],
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return res.status(429).json({ 
            error: "Rate limit exceeded",
            fallbackAnalysis: "Analysis temporarily unavailable. Continue with visual assessment."
          });
        }
        if (response.status === 402) {
          return res.status(402).json({ 
            error: "Payment required",
            fallbackAnalysis: "Vision analysis unavailable."
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data: any = await response.json();
      const analysis = data.choices?.[0]?.message?.content?.trim() || "Unable to analyze image.";

      res.json({ 
        analysis,
        analysisType,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error("Vision analysis error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Unknown error",
        fallbackAnalysis: "Analysis failed. Rely on direct visualization."
      });
    }
  });

  app.post("/api/surgical-coach", async (req, res) => {
    try {
      const { context, trigger } = req.body;
      
      if (!LOVABLE_API_KEY) {
        return res.status(500).json({ error: "LOVABLE_API_KEY is not configured" });
      }

      const SYSTEM_PROMPT = `You are Dr. Chen, an experienced attending neurosurgeon specializing in endoscopic endonasal pituitary surgery. You are supervising a resident during a simulated transsphenoidal adenoma resection with medial wall exploration of the cavernous sinus.

Your role is to provide real-time, contextual coaching based on the surgical situation. Your guidance should be:

1. CONCISE: 1-2 sentences maximum. Time is critical in surgery.
2. ACTIONABLE: Give specific, practical advice the resident can immediately apply.
3. ANATOMICALLY ACCURATE: Reference actual structures (medial wall, CN VI, ICA, MHT, etc.)
4. SAFETY-FOCUSED: Prioritize "Doppler is Dogma" and "Start Low, Go Slow" principles.

Key surgical principles you emphasize:
- ALWAYS use Doppler before dural incision to localize the ICA
- The medial wall is a thin, single-layer dura - respect it
- Functioning adenomas require aggressive resection for biochemical cure
- Non-functioning adenomas: conservative peeling is acceptable
- Never use bipolar directly in the cavernous sinus (thermal injury risk)
- If the plane is lost, consider converting to conservative approach
- CN VI is most vulnerable during medial wall resection

Response format: Provide ONLY the coaching message text. No quotes, no attribution, no formatting.`;

      const userPrompt = buildContextualPrompt(context, trigger);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return res.status(429).json({ 
            error: "Rate limit exceeded",
            fallbackMessage: "Focus on your technique, resident."
          });
        }
        if (response.status === 402) {
          return res.status(402).json({ 
            error: "Payment required",
            fallbackMessage: "Continue with the procedure."
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data: any = await response.json();
      const message = data.choices?.[0]?.message?.content?.trim() || "Continue with the procedure.";
      const messageType = determineMessageType(trigger, context);

      res.json({ 
        message,
        type: messageType,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error("Surgical coach error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Unknown error",
        fallbackMessage: "Stay focused, resident.",
        type: "info"
      });
    }
  });

  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, category } = req.body;
      
      if (!LOVABLE_API_KEY) {
        return res.status(500).json({ error: "LOVABLE_API_KEY is not configured" });
      }

      const enhancedPrompt = getEnhancedPrompt(prompt, category);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [
            { role: "user", content: enhancedPrompt }
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return res.status(429).json({ error: "Rate limit exceeded", fallback: true });
        }
        if (response.status === 402) {
          return res.status(402).json({ error: "Payment required", fallback: true });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data: any = await response.json();
      const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const textResponse = data.choices?.[0]?.message?.content;

      if (!imageData) {
        return res.json({ 
          success: false,
          text: textResponse,
          error: "No image was generated"
        });
      }

      res.json({ 
        success: true,
        imageUrl: imageData,
        text: textResponse,
        category,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error("Image generation error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Unknown error",
        fallback: true
      });
    }
  });

  app.post("/api/orientation-tts", async (req, res) => {
    try {
      const { text, voiceId } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      if (!ELEVENLABS_API_KEY) {
        return res.status(500).json({ error: "ElevenLabs API key not configured" });
      }

      const selectedVoiceId = voiceId || 'JBFqnCBsd6RMkjVDRZzb';

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=mp3_44100_128`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.75,
              style: 0.3,
              use_speaker_boost: true,
              speed: 0.95,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(Buffer.from(audioBuffer));

    } catch (error) {
      console.error("TTS error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/sessions", async (req, res) => {
    try {
      const parsed = insertSimulationSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid session data", details: parsed.error });
      }
      const session = await storage.createSession(parsed.data);
      res.status(201).json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.get("/api/sessions", async (_req, res) => {
    try {
      const sessions = await storage.getSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get sessions" });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getSession(parseInt(req.params.id));
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to get session" });
    }
  });

  app.patch("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.updateSession(parseInt(req.params.id), req.body);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to update session" });
    }
  });
}

function getVisionSystemPrompt(analysisType: string): string {
  switch (analysisType) {
    case 'anatomy_identification':
      return `You are an expert neuroradiologist analyzing endoscopic transsphenoidal surgical views. 
Identify visible anatomical structures with surgical precision:
- Internal Carotid Artery (ICA) and its segments (paraclival, cavernous)
- Cranial Nerve VI (Abducens)
- Sellar dura and medial wall of cavernous sinus
- Pituitary tumor tissue vs normal gland
- Meningohypophyseal trunk (MHT)

Be concise and use standard anatomical terminology. Format: "Structure: Location/Status"`;

    case 'safety_check':
      return `You are a surgical safety officer analyzing endoscopic pituitary surgery views.
Immediately identify any hazards:
- Proximity to Internal Carotid Artery (CRITICAL if <3mm)
- Active bleeding or vascular injury signs
- CN VI compromise indicators
- Instrument positioning relative to critical structures
- Tissue plane integrity

Respond with: SAFE / CAUTION / DANGER followed by specific findings. Be direct and actionable.`;

    case 'progress_assessment':
      return `You are an attending neurosurgeon reviewing transsphenoidal adenoma resection progress.
Assess:
- Estimated tumor removal percentage
- Quality of dissection plane
- Medial wall exposure adequacy
- Residual tumor location (if visible)
- Recommended next surgical step

Be concise. Format: "Progress: X% | Plane: Good/Fair/Lost | Next: [action]"`;

    default:
      return `Analyze this endoscopic surgical image and describe the visible anatomical structures and surgical field. Be precise and use medical terminology.`;
  }
}

function buildContextualPrompt(context: any, trigger: string): string {
  const parts: string[] = [];
  
  parts.push(`Current phase: Level ${context.currentLevel} - ${context.levelName}`);
  parts.push(`Time elapsed: ${Math.floor(context.timeElapsed / 60)}m ${context.timeElapsed % 60}s`);
  
  if (context.scenario) {
    parts.push(`Case: ${context.scenario.type} adenoma, Knosp grade ${context.scenario.knospGrade}`);
    parts.push(`Surgical goal: ${context.scenario.goal.replace('_', ' ')}`);
  }
  
  parts.push(`Active tool: ${context.activeTool}`);
  
  if (context.activeTool === 'doppler') {
    parts.push(`Doppler signal strength: ${(context.dopplerSignal * 100).toFixed(0)}%`);
    parts.push(`Nearest ICA distance: ${context.nearestICADistance.toFixed(1)}cm`);
  } else if (!context.dopplerUsed && context.currentLevel >= 3) {
    parts.push("WARNING: Doppler has NOT been used yet in this phase");
  }
  
  if (context.isColliding && context.collidingStructure) {
    parts.push(`ALERT: Contact with ${context.collidingStructure}`);
  }
  
  if (context.complications && context.complications.length > 0) {
    parts.push(`Active complications: ${context.complications.join(', ')}`);
  }
  
  parts.push(`Objectives: ${context.objectivesCompleted}/${context.totalObjectives} completed`);
  parts.push(`Mucosal contacts: ${context.mucosalContacts}`);
  
  switch (trigger) {
    case 'collision':
      parts.push("TRIGGER: Instrument collision detected - provide immediate guidance");
      break;
    case 'complication':
      parts.push("TRIGGER: Complication occurred - guide management");
      break;
    case 'doppler_warning':
      parts.push("TRIGGER: Approaching vascular structure - warn about ICA proximity");
      break;
    case 'tool_change':
      parts.push("TRIGGER: Tool changed - provide technique guidance for new tool");
      break;
    case 'milestone':
      parts.push("TRIGGER: Objective completed - provide positive reinforcement and next step");
      break;
    case 'periodic':
      parts.push("TRIGGER: Routine check-in - provide general guidance or teaching point");
      break;
  }
  
  parts.push("\nProvide appropriate coaching for this surgical moment:");
  
  return parts.join('\n');
}

function determineMessageType(trigger: string, context: any): 'info' | 'warning' | 'success' | 'critical' {
  if (trigger === 'complication' || (context.complications && context.complications.length > 0)) {
    return 'critical';
  }
  if (trigger === 'collision' || trigger === 'doppler_warning') {
    return 'warning';
  }
  if (trigger === 'milestone') {
    return 'success';
  }
  if (context.nearestICADistance < 0.3) {
    return 'warning';
  }
  return 'info';
}

function getEnhancedPrompt(prompt: string, category: string): string {
  const baseStyle = "Professional medical illustration style, clean, modern, high contrast, suitable for dark UI background.";
  
  switch (category) {
    case 'icon':
      return `Create a simple, minimalist medical icon: ${prompt}. Style: ${baseStyle} Flat design, single color with subtle gradients, suitable as a UI icon at 64x64 pixels. No text, clean edges.`;
    
    case 'diagram':
      return `Create an educational medical diagram: ${prompt}. Style: ${baseStyle} Anatomically accurate but simplified for educational purposes. Clear labels if appropriate. Cross-section view preferred.`;
    
    case 'background':
      return `Create an abstract medical-themed background texture: ${prompt}. Style: ${baseStyle} Subtle, non-distracting, suitable as a card or panel background. Dark tones with subtle cyan/teal accents.`;
    
    case 'preview':
      return `Create a medical procedure preview image: ${prompt}. Style: ${baseStyle} Realistic but clean, showing the surgical approach or anatomical view. Professional medical textbook quality.`;
    
    case 'avatar':
      return `Create a professional medical avatar: ${prompt}. Style: ${baseStyle} Friendly but professional appearance, suitable for a medical simulator coach character. Semi-realistic illustration style.`;
    
    default:
      return `${prompt}. Style: ${baseStyle}`;
  }
}
