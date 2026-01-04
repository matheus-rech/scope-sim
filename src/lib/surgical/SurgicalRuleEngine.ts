import { GameState, TumorScenario, AttendingMessage } from '@/types/simulator';

export interface RuleResult {
  message: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  ruleId: string;
}

/**
 * Evaluate surgical rules based on current game state
 * Returns feedback message if a rule is triggered
 */
export const evaluateSurgicalRules = (
  gameState: GameState,
  scenario?: TumorScenario
): RuleResult | null => {
  
  // RULE 1: DOPPLER DOGMA
  // "Never incise dura without first confirming ICA location"
  if (gameState.surgicalStep === 'INCISION' && !gameState.levelState.metrics.dopplerUsed) {
    return {
      ruleId: 'doppler_dogma',
      message: "CRITICAL: You haven't used Doppler yet. Never incise without localizing the ICA!",
      type: 'critical'
    };
  }
  
  // RULE 2: DISSECTION VECTOR SAFETY
  // "CN VI is inferior/lateral. Always dissect SUPERIORLY."
  if (gameState.surgicalStep === 'RESECTION') {
    if (gameState.toolVector.verticalComponent < -0.15) {
      return {
        ruleId: 'cn6_danger',
        message: "WARNING: Dissecting DOWNWARD toward CN VI. Always dissect superior-to-inferior!",
        type: 'warning'
      };
    }
  }
  
  // RULE 3: FA/NFA STRATEGY ENFORCEMENT - Tool Selection Validation
  if (gameState.surgicalStep === 'RESECTION' && scenario) {
    const isNFA = scenario.type === 'non-functioning';
    const isFA = scenario.type === 'functioning';
    const lastTool = gameState.medialWall.lastToolUsed;
    const wallBeingResected = 
      gameState.medialWall.leftIntegrity < 0.5 || 
      gameState.medialWall.rightIntegrity < 0.5;
    
    // NFA + Curette = Warning (too aggressive)
    if (isNFA && lastTool === 'curette' && gameState.medialWall.technique === 'resection') {
      return {
        ruleId: 'nfa_curette_warning',
        message: "CAUTION: Using curette on NFA may risk CSF leak. Dissector preferred for gentle peeling.",
        type: 'warning'
      };
    }
    
    // FA + Dissector only (not aggressive enough for cure) - hint, not warning
    if (isFA && lastTool === 'dissector' && gameState.medialWall.leftIntegrity > 0.3 && gameState.medialWall.rightIntegrity > 0.3) {
      return {
        ruleId: 'fa_dissector_hint',
        message: "TIP: For biochemical cure in FA, consider curette for more aggressive medial wall resection.",
        type: 'info'
      };
    }
    
    // Inferior zone danger (CN VI proximity)
    const leftInferior = gameState.medialWall.leftZones?.inferior ?? 1;
    const rightInferior = gameState.medialWall.rightZones?.inferior ?? 1;
    if (leftInferior < 0.5 || rightInferior < 0.5) {
      return {
        ruleId: 'cn6_zone_warning',
        message: "WARNING: Working in inferior zone near CN VI. Proceed with extreme caution!",
        type: 'warning'
      };
    }
    
    // NFA with proper peeling technique - success
    if (isNFA && gameState.medialWall.technique === 'peeling' && wallBeingResected) {
      return {
        ruleId: 'nfa_peel_success',
        message: "Excellent peeling technique. Tumor exposure with minimal dural trauma.",
        type: 'success'
      };
    }
    
    // FA: Complete resection success
    if (isFA && gameState.medialWall.technique === 'resection') {
      if (gameState.medialWall.leftIntegrity < 0.1 && gameState.medialWall.rightIntegrity < 0.1) {
        return {
          ruleId: 'fa_resect_success',
          message: "Complete medial wall resection achieved. Maximum tumor access for biochemical cure.",
          type: 'success'
        };
      }
      if (gameState.medialWall.leftIntegrity < 0.1 || gameState.medialWall.rightIntegrity < 0.1) {
        return {
          ruleId: 'fa_success',
          message: "Excellent medial wall resection. Biochemical cure is now achievable.",
          type: 'success'
        };
      }
    }
  }
  
  // RULE 4: Blood in field warning
  if (gameState.bloodLevel > 60) {
    return {
      ruleId: 'blood_critical',
      message: "CRITICAL: Blood obscuring field. Use suction before proceeding!",
      type: 'critical'
    };
  }
  
  return null; // No rule triggered
};

/**
 * Convert rule result to AttendingMessage
 */
export const ruleToMessage = (result: RuleResult): AttendingMessage => ({
  id: `rule-${result.ruleId}-${Date.now()}`,
  text: result.message,
  type: result.type,
  timestamp: Date.now()
});

/**
 * Determine the current surgical step based on game state
 */
export const determineSurgicalStep = (gameState: GameState): GameState['surgicalStep'] => {
  const depth = gameState.endoscope.insertionDepth;
  const dopplerUsed = gameState.levelState.metrics.dopplerUsed;
  
  // Early phase - approaching target
  if (depth < 60) return 'APPROACH';
  
  // Doppler localization phase
  if (!dopplerUsed && depth >= 60 && depth < 80) return 'DOPPLER';
  
  // Post-doppler, pre-resection
  if (dopplerUsed && depth >= 70 && gameState.medialWall.leftIntegrity > 0.9 && gameState.medialWall.rightIntegrity > 0.9) {
    return 'INCISION';
  }
  
  // Active tumor removal
  if (gameState.levelState.metrics.extentOfResection !== undefined && 
      gameState.levelState.metrics.extentOfResection < 100) {
    return 'RESECTION';
  }
  
  // Completion
  if (gameState.levelState.metrics.extentOfResection !== undefined && 
      gameState.levelState.metrics.extentOfResection >= 90) {
    return 'CLOSURE';
  }
  
  return 'APPROACH';
};
