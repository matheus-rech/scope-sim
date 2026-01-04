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
  
  // RULE 3: FA/NFA STRATEGY ENFORCEMENT
  if (gameState.surgicalStep === 'RESECTION' && scenario) {
    const isNFA = scenario.type === 'non-functioning';
    const wallBeingResected = 
      gameState.medialWall.leftIntegrity < 0.5 || 
      gameState.medialWall.rightIntegrity < 0.5;
    
    // NFA: Peeling preferred
    if (isNFA && wallBeingResected && gameState.medialWall.technique === 'resection') {
      return {
        ruleId: 'nfa_strategy',
        message: "WARNING: This is an NFA case. Consider peeling rather than resecting - lower risk of CSF leak.",
        type: 'warning'
      };
    }
    
    // FA: Aggressive resection for biochemical cure
    if (scenario.type === 'functioning') {
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
