import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ToolType } from '@/types/simulator';
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
    if (generationQueueRef.current.has(tool)) {
      return icons[tool]?.imageUrl || null;
    }
    
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
      
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptData.prompt,
          category: 'icon',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.imageUrl) {
        throw new Error(data.error || 'Failed to generate icon');
      }

      const imageUrl = data.imageUrl;

      setIcons(prev => ({
        ...prev,
        [tool]: { imageUrl, isLoading: false, error: null },
      }));

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
    
    for (const tool of TOOL_TYPES) {
      if (!icons[tool]?.imageUrl) {
        await generateIcon(tool);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    setIsGeneratingAll(false);
  }, [icons, generateIcon]);

  const getIcon = useCallback((tool: ToolType): ToolIconData => {
    return icons[tool] || defaultIconData;
  }, [icons]);

  useEffect(() => {
    const uncachedTools = TOOL_TYPES.filter(tool => !icons[tool]?.imageUrl);
    
    if (uncachedTools.length > 0 && uncachedTools.length < TOOL_TYPES.length) {
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
