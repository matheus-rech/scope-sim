import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ImageCategory = 'icon' | 'diagram' | 'background' | 'preview' | 'avatar';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, category, size } = await req.json() as {
      prompt: string;
      category: ImageCategory;
      size?: { width: number; height: number };
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating ${category} image with prompt: ${prompt.substring(0, 100)}...`);

    // Enhance prompt based on category for medical context
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
          { 
            role: "user", 
            content: enhancedPrompt
          }
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI gateway error: ${response.status} - ${errorText}`);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again later.",
          fallback: true
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Payment required. Please add credits to continue.",
          fallback: true
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract image from response
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textResponse = data.choices?.[0]?.message?.content;

    if (!imageData) {
      console.warn("No image generated, returning text response only");
      return new Response(JSON.stringify({ 
        success: false,
        text: textResponse,
        error: "No image was generated"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Successfully generated ${category} image`);

    return new Response(JSON.stringify({ 
      success: true,
      imageUrl: imageData,
      text: textResponse,
      category,
      timestamp: Date.now()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Image generation error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      fallback: true
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getEnhancedPrompt(prompt: string, category: ImageCategory): string {
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
