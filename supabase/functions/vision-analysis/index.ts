import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AnalysisType = 'anatomy_identification' | 'safety_check' | 'progress_assessment';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, analysisType } = await req.json() as { 
      imageBase64: string; 
      analysisType: AnalysisType;
    };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = getVisionSystemPrompt(analysisType);

    console.log(`Vision analysis request: type=${analysisType}, imageSize=${imageBase64.length}`);

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
        console.warn("Rate limit exceeded for vision analysis");
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded",
          fallbackAnalysis: "Analysis temporarily unavailable. Continue with visual assessment."
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        console.warn("Payment required for vision analysis");
        return new Response(JSON.stringify({ 
          error: "Payment required",
          fallbackAnalysis: "Vision analysis unavailable."
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error(`AI gateway error: ${response.status}`, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content?.trim() || "Unable to analyze image.";

    console.log(`Vision analysis complete: ${analysis.substring(0, 100)}...`);

    return new Response(JSON.stringify({ 
      analysis,
      analysisType,
      timestamp: Date.now()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Vision analysis error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      fallbackAnalysis: "Analysis failed. Rely on direct visualization."
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getVisionSystemPrompt(analysisType: AnalysisType): string {
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
