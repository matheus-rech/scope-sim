import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ImageCategory = 'icon' | 'diagram' | 'background' | 'preview' | 'avatar';

interface GeneratedImage {
  imageUrl: string;
  category: ImageCategory;
  prompt: string;
  timestamp: number;
}

interface ImageCache {
  [key: string]: GeneratedImage;
}

export function useImageGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<ImageCache>({});

  const generateImage = useCallback(async (
    prompt: string,
    category: ImageCategory
  ): Promise<GeneratedImage | null> => {
    // Check cache first
    const cacheKey = `${category}:${prompt}`;
    if (cacheRef.current[cacheKey]) {
      return cacheRef.current[cacheKey];
    }

    setIsGenerating(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-image', {
        body: { prompt, category }
      });

      if (fnError) {
        console.error('Image generation function error:', fnError);
        setError(fnError.message);
        return null;
      }

      if (data?.error || !data?.success) {
        console.warn('Image generation returned error:', data?.error);
        setError(data?.error || 'Failed to generate image');
        return null;
      }

      const result: GeneratedImage = {
        imageUrl: data.imageUrl,
        category: data.category,
        prompt,
        timestamp: data.timestamp
      };

      // Cache the result
      cacheRef.current[cacheKey] = result;
      
      return result;
    } catch (err) {
      console.error('Image generation failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const generateMedicalIcon = useCallback((description: string) => {
    return generateImage(description, 'icon');
  }, [generateImage]);

  const generateAnatomyDiagram = useCallback((structure: string) => {
    return generateImage(structure, 'diagram');
  }, [generateImage]);

  const generateLevelPreview = useCallback((levelDescription: string) => {
    return generateImage(levelDescription, 'preview');
  }, [generateImage]);

  const generateAvatar = useCallback((description: string) => {
    return generateImage(description, 'avatar');
  }, [generateImage]);

  const clearCache = useCallback(() => {
    cacheRef.current = {};
  }, []);

  return {
    generateImage,
    generateMedicalIcon,
    generateAnatomyDiagram,
    generateLevelPreview,
    generateAvatar,
    isGenerating,
    error,
    clearCache,
  };
}
