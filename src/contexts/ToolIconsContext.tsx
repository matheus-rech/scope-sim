import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ToolType } from '@/types/simulator';
import { supabase } from '@/integrations/supabase/client';
import { TOOL_ICON_PROMPTS } from '@/lib/assets/toolIconPrompts';

interface ToolIconData {
  imageUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

interface ToolIconsContextValue {
  icons: Record<ToolType, ToolIconData>;
  getIcon: (tool: ToolType) => ToolIconData;
  generateIcon: (tool: ToolType) => Promise<string | null>;
  generateAllIcons: () => Promise<void>;
  isGeneratingAll: boolean;
}

const defaultIconData: ToolIconData = {
  imageUrl: null,
  isLoading: false,
  error: null,
};

const TOOL_TYPES: ToolType[] = ['scope', 'doppler', 'drill', 'dissector', 'curette', 'suction', 'cautery', 'irrigation'];

const CACHE_KEY = 'neuroendosim_tool_icons_v1';

// Helper to get cached icons from localStorage
function getCachedIcons(): Record<string, string> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn('Failed to read icon cache:', e);
  }
  return {};
}

// Helper to save icons to localStorage
function saveCachedIcons(icons: Record<string, string>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(icons));
  } catch (e) {
    console.warn('Failed to save icon cache:', e);
  }
}

const ToolIconsContext = createContext<ToolIconsContextValue | null>(null);

export function ToolIconsProvider({ children }: { children: React.ReactNode }) {
  const [icons, setIcons] = useState<Record<ToolType, ToolIconData>>(() => {
    const initial: Record<ToolType, ToolIconData> = {} as Record<ToolType, ToolIconData>;
    const cached = getCachedIcons();
    
    TOOL_TYPES.forEach(tool => {
      initial[tool] = {
        imageUrl: cached[tool] || null,
        isLoading: false,
        error: null,
      };
    });
    
    return initial;
  });
  
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const generationQueueRef = useRef<Set<ToolType>>(new Set());

  const generateIcon = useCallback(async (tool: ToolType): Promise<string | null> => {
    // Check if already generating
    if (generationQueueRef.current.has(tool)) {
      return icons[tool]?.imageUrl || null;
    }
    
    // Check cache first
    if (icons[tool]?.imageUrl) {
      return icons[tool].imageUrl;
    }

    generationQueueRef.current.add(tool);
    
    setIcons(prev => ({
      ...prev,
      [tool]: { ...prev[tool], isLoading: true, error: null },
    }));

    try {
      const promptData = TOOL_ICON_PROMPTS[tool];
      
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: promptData.prompt,
          category: 'icon',
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success || !data?.imageUrl) {
        throw new Error(data?.error || 'Failed to generate icon');
      }

      const imageUrl = data.imageUrl;

      // Update state
      setIcons(prev => ({
        ...prev,
        [tool]: { imageUrl, isLoading: false, error: null },
      }));

      // Update cache
      const cached = getCachedIcons();
      cached[tool] = imageUrl;
      saveCachedIcons(cached);

      return imageUrl;
    } catch (err) {
      console.error(`Failed to generate icon for ${tool}:`, err);
      
      setIcons(prev => ({
        ...prev,
        [tool]: { 
          imageUrl: null, 
          isLoading: false, 
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      }));
      
      return null;
    } finally {
      generationQueueRef.current.delete(tool);
    }
  }, [icons]);

  const generateAllIcons = useCallback(async () => {
    setIsGeneratingAll(true);
    
    // Generate icons sequentially to avoid rate limiting
    for (const tool of TOOL_TYPES) {
      if (!icons[tool]?.imageUrl) {
        await generateIcon(tool);
        // Add small delay between generations to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    setIsGeneratingAll(false);
  }, [icons, generateIcon]);

  const getIcon = useCallback((tool: ToolType): ToolIconData => {
    return icons[tool] || defaultIconData;
  }, [icons]);

  // Auto-generate icons that aren't cached on mount
  useEffect(() => {
    const uncachedTools = TOOL_TYPES.filter(tool => !icons[tool]?.imageUrl);
    
    if (uncachedTools.length > 0 && uncachedTools.length < TOOL_TYPES.length) {
      // Only auto-generate if some are already cached (user has started the process)
      // Don't auto-generate all on first visit
    }
  }, []);

  return (
    <ToolIconsContext.Provider value={{ icons, getIcon, generateIcon, generateAllIcons, isGeneratingAll }}>
      {children}
    </ToolIconsContext.Provider>
  );
}

export function useToolIcons() {
  const context = useContext(ToolIconsContext);
  if (!context) {
    throw new Error('useToolIcons must be used within a ToolIconsProvider');
  }
  return context;
}
