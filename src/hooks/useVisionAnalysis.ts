import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AnalysisType = 'anatomy_identification' | 'safety_check' | 'progress_assessment';

interface VisionAnalysisResult {
  analysis: string;
  analysisType: AnalysisType;
  timestamp: number;
}

export function useVisionAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<VisionAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeImage = useCallback(async (
    imageBase64: string,
    analysisType: AnalysisType
  ): Promise<VisionAnalysisResult | null> => {
    if (isAnalyzing) {
      console.log('Vision analysis already in progress');
      return null;
    }

    setIsAnalyzing(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('vision-analysis', {
        body: { imageBase64, analysisType }
      });

      if (fnError) {
        console.error('Vision analysis function error:', fnError);
        setError(fnError.message);
        return null;
      }

      if (data?.error) {
        console.warn('Vision analysis returned error:', data.error);
        setError(data.error);
        
        // Return fallback if available
        if (data.fallbackAnalysis) {
          const fallbackResult: VisionAnalysisResult = {
            analysis: data.fallbackAnalysis,
            analysisType,
            timestamp: Date.now()
          };
          setLastAnalysis(fallbackResult);
          return fallbackResult;
        }
        return null;
      }

      const result: VisionAnalysisResult = {
        analysis: data.analysis,
        analysisType: data.analysisType,
        timestamp: data.timestamp
      };

      setLastAnalysis(result);
      return result;
    } catch (err) {
      console.error('Vision analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing]);

  const clearAnalysis = useCallback(() => {
    setLastAnalysis(null);
    setError(null);
  }, []);

  return {
    analyzeImage,
    isAnalyzing,
    lastAnalysis,
    error,
    clearAnalysis,
  };
}
