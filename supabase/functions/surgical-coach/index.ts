import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

Response format: Provide ONLY the coaching message text. No quotes, no attribution, no formatting.

Message types you should use contextually:
- INFO: General teaching points, technique tips
- WARNING: Approaching danger, caution needed
- CRITICAL: Immediate action required, complication occurring
- SUCCESS: Positive reinforcement for good technique`;

interface CoachingRequest {
  context: {
    currentLevel: number;
    levelName: string;
    timeElapsed: number;
    activeTool: string;
    dopplerUsed: boolean;
    dopplerSignal: number;
    nearestICADistance: number;
    isColliding: boolean;
    collidingStructure: string | null;
    mucosalContacts: number;
    complications: string[];
    scenario?: {
      type: string;
      knospGrade: string | number;
      goal: string;
    };
    recentActions: string[];
    objectivesCompleted: number;
    totalObjectives: number;
  };
  trigger: 'periodic' | 'collision' | 'tool_change' | 'complication' | 'milestone' | 'doppler_warning';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { context, trigger } = await req.json() as CoachingRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build contextual prompt based on surgical state
    const userPrompt = buildContextualPrompt(context, trigger);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded",
          fallbackMessage: "Focus on your technique, resident."
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Payment required",
          fallbackMessage: "Continue with the procedure."
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim() || "Continue with the procedure.";
    
    // Determine message type based on trigger and context
    const messageType = determineMessageType(trigger, context);

    return new Response(JSON.stringify({ 
      message,
      type: messageType,
      timestamp: Date.now()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Surgical coach error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      fallbackMessage: "Stay focused, resident.",
      type: "info"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildContextualPrompt(context: CoachingRequest['context'], trigger: string): string {
  const parts: string[] = [];
  
  // Current surgical phase
  parts.push(`Current phase: Level ${context.currentLevel} - ${context.levelName}`);
  parts.push(`Time elapsed: ${Math.floor(context.timeElapsed / 60)}m ${context.timeElapsed % 60}s`);
  
  // Scenario context
  if (context.scenario) {
    parts.push(`Case: ${context.scenario.type} adenoma, Knosp grade ${context.scenario.knospGrade}`);
    parts.push(`Surgical goal: ${context.scenario.goal.replace('_', ' ')}`);
  }
  
  // Current tool and technique
  parts.push(`Active tool: ${context.activeTool}`);
  
  // Doppler status - critical safety check
  if (context.activeTool === 'doppler') {
    parts.push(`Doppler signal strength: ${(context.dopplerSignal * 100).toFixed(0)}%`);
    parts.push(`Nearest ICA distance: ${context.nearestICADistance.toFixed(1)}cm`);
  } else if (!context.dopplerUsed && context.currentLevel >= 3) {
    parts.push("WARNING: Doppler has NOT been used yet in this phase");
  }
  
  // Collision/danger state
  if (context.isColliding && context.collidingStructure) {
    parts.push(`ALERT: Contact with ${context.collidingStructure}`);
  }
  
  // Complications
  if (context.complications.length > 0) {
    parts.push(`Active complications: ${context.complications.join(', ')}`);
  }
  
  // Progress
  parts.push(`Objectives: ${context.objectivesCompleted}/${context.totalObjectives} completed`);
  parts.push(`Mucosal contacts: ${context.mucosalContacts}`);
  
  // Trigger-specific context
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

function determineMessageType(trigger: string, context: CoachingRequest['context']): 'info' | 'warning' | 'success' | 'critical' {
  if (trigger === 'complication' || context.complications.length > 0) {
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
