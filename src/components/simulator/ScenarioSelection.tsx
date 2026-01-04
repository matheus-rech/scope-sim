import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  TumorScenario, 
  AdenomaType, 
  FunctioningSubtype, 
  KnospGrade,
  KNOSP_GRADES,
} from '@/types/simulator';
import {
  TRAINING_SCENARIOS,
  TrainingScenario,
  getRecommendedStrategy,
  getExpectedOutcomes,
  SUBTYPE_INFO,
  KNOSP_VISUAL_DATA,
} from '@/lib/levels/ScenarioManager';
import { Activity, AlertTriangle, Brain, Target, Shield, Zap } from 'lucide-react';

interface ScenarioSelectionProps {
  onSelect: (scenario: TumorScenario) => void;
  onBack: () => void;
}

const KNOSP_GRADES_LIST: KnospGrade[] = [0, 1, 2, '3A', '3B', 4];

export default function ScenarioSelection({ onSelect, onBack }: ScenarioSelectionProps) {
  const [adenomaType, setAdenomaType] = useState<AdenomaType | null>(null);
  const [subtype, setSubtype] = useState<FunctioningSubtype | null>(null);
  const [knospGrade, setKnospGrade] = useState<KnospGrade | null>(null);

  // Find matching preset scenario or create custom
  const selectedScenario = useMemo((): TumorScenario | null => {
    if (!adenomaType || knospGrade === null) return null;
    if (adenomaType === 'functioning' && !subtype) return null;

    // Find a matching preset
    const preset = TRAINING_SCENARIOS.find(s => 
      s.type === adenomaType && 
      s.knospGrade === knospGrade &&
      (adenomaType === 'non-functioning' || s.subtype === subtype)
    );

    if (preset) return preset;

    // Create custom scenario
    const knosp = KNOSP_GRADES[knospGrade];
    return {
      type: adenomaType,
      subtype: adenomaType === 'functioning' ? subtype! : undefined,
      knospGrade,
      size: knospGrade === 4 || knospGrade === '3A' || knospGrade === '3B' ? 'macro' : 'micro',
      invasive: knospGrade !== 0,
      goal: adenomaType === 'functioning' ? 'biochemical_cure' : 'decompression',
      description: `${adenomaType === 'functioning' ? 'Functioning' : 'Non-functioning'} adenoma with Knosp grade ${knospGrade}`,
    };
  }, [adenomaType, subtype, knospGrade]);

  const strategy = selectedScenario ? getRecommendedStrategy(selectedScenario) : null;
  const outcomes = selectedScenario ? getExpectedOutcomes(selectedScenario) : null;

  const handleBeginSurgery = () => {
    if (selectedScenario) {
      onSelect(selectedScenario);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Select Training Case
          </h1>
          <p className="text-muted-foreground">
            Choose adenoma type and Knosp grade to customize your surgical approach
          </p>
        </div>

        {/* Main Selection Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Type Selection */}
          <div className="space-y-6">
            {/* Adenoma Type */}
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Adenoma Type
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setAdenomaType('functioning'); setSubtype(null); }}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all text-left',
                    adenomaType === 'functioning' 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50 bg-secondary/30'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <span className="font-semibold text-foreground">Functioning</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Goal: <span className="text-primary font-medium">Biochemical Cure</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aggressive medial wall resection
                  </p>
                </button>

                <button
                  onClick={() => { setAdenomaType('non-functioning'); setSubtype(null); }}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all text-left',
                    adenomaType === 'non-functioning' 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50 bg-secondary/30'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <span className="font-semibold text-foreground">Non-Functioning</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Goal: <span className="text-blue-400 font-medium">Decompression</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Conservative peeling technique
                  </p>
                </button>
              </div>
            </div>

            {/* Subtype Selection (FA only) */}
            {adenomaType === 'functioning' && (
              <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Hormone Subtype
                </h2>
                
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(SUBTYPE_INFO) as FunctioningSubtype[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => setSubtype(st)}
                      className={cn(
                        'p-3 rounded-lg border transition-all text-center',
                        subtype === st 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50 bg-secondary/30'
                      )}
                    >
                      <span className="font-semibold text-foreground text-sm">{st}</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {SUBTYPE_INFO[st].condition}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Knosp Grade Selection */}
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Knosp Grade
              </h2>
              
              <div className="grid grid-cols-6 gap-2">
                {KNOSP_GRADES_LIST.map((grade) => {
                  const data = KNOSP_VISUAL_DATA[grade];
                  const knosp = KNOSP_GRADES[grade];
                  return (
                    <button
                      key={String(grade)}
                      onClick={() => setKnospGrade(grade)}
                      className={cn(
                        'p-3 rounded-lg border transition-all text-center',
                        knospGrade === grade 
                          ? 'border-primary ring-2 ring-primary/30' 
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-full mx-auto mb-2', data.color)} />
                      <span className="font-bold text-foreground">{grade}</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {knosp.expectedRemission}%
                      </p>
                    </button>
                  );
                })}
              </div>

              {knospGrade !== null && (
                <div className="bg-secondary/50 rounded-lg p-3 mt-3">
                  <p className="text-sm text-foreground">
                    <strong>Grade {knospGrade}:</strong> {KNOSP_GRADES[knospGrade].description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            {/* Scenario Summary */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="bg-secondary/50 px-5 py-3 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Case Summary</h2>
              </div>
              
              <div className="p-5 space-y-4">
                {selectedScenario ? (
                  <>
                    {/* Type Badge */}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium',
                        selectedScenario.type === 'functioning' 
                          ? 'bg-amber-500/20 text-amber-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      )}>
                        {selectedScenario.type === 'functioning' ? 'FA' : 'NFA'}
                        {selectedScenario.subtype && ` - ${selectedScenario.subtype}`}
                      </div>
                      <div className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium',
                        KNOSP_VISUAL_DATA[selectedScenario.knospGrade].color,
                        'text-white'
                      )}>
                        Knosp {selectedScenario.knospGrade}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground">
                      {selectedScenario.description}
                    </p>

                    {/* Strategy */}
                    {strategy && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground">Surgical Strategy</h3>
                        <p className="text-sm text-primary">{strategy.approach}</p>
                        <ul className="space-y-1">
                          {strategy.keyConsiderations.map((c, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                              <span className="text-primary">•</span>
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Expected Outcomes */}
                    {outcomes && (
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                        {selectedScenario.type === 'functioning' && (
                          <div className="bg-secondary/50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-success">{outcomes.remissionRate}%</p>
                            <p className="text-xs text-muted-foreground">Remission Rate</p>
                          </div>
                        )}
                        <div className="bg-secondary/50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-amber-400">{outcomes.cnPalsyRisk}%</p>
                          <p className="text-xs text-muted-foreground">CN Palsy Risk</p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-red-400">{outcomes.bleedingRisk}%</p>
                          <p className="text-xs text-muted-foreground">Bleeding Risk</p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-blue-400">{outcomes.csfLeakRisk}%</p>
                          <p className="text-xs text-muted-foreground">CSF Leak Risk</p>
                        </div>
                      </div>
                    )}

                    {/* Risk Level */}
                    {strategy && (
                      <div className={cn(
                        'flex items-center gap-2 p-3 rounded-lg',
                        strategy.riskLevel === 'very-high' ? 'bg-red-500/20' :
                        strategy.riskLevel === 'high' ? 'bg-orange-500/20' :
                        strategy.riskLevel === 'moderate' ? 'bg-yellow-500/20' : 'bg-green-500/20'
                      )}>
                        <AlertTriangle className={cn(
                          'w-5 h-5',
                          strategy.riskLevel === 'very-high' ? 'text-red-400' :
                          strategy.riskLevel === 'high' ? 'text-orange-400' :
                          strategy.riskLevel === 'moderate' ? 'text-yellow-400' : 'text-green-400'
                        )} />
                        <span className="text-sm font-medium text-foreground">
                          {strategy.riskLevel.charAt(0).toUpperCase() + strategy.riskLevel.slice(1).replace('-', ' ')} Risk
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Select adenoma type{adenomaType === 'functioning' ? ', subtype,' : ''} and Knosp grade</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Presets */}
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Quick Presets
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {TRAINING_SCENARIOS.slice(0, 4).map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => {
                      setAdenomaType(scenario.type);
                      setSubtype(scenario.subtype || null);
                      setKnospGrade(scenario.knospGrade);
                    }}
                    className={cn(
                      'p-2 rounded-lg border text-left transition-all',
                      'border-border hover:border-primary/50 bg-secondary/30'
                    )}
                  >
                    <span className="text-xs font-medium text-foreground">{scenario.name}</span>
                    <p className="text-xs text-muted-foreground">{scenario.difficulty}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            Back to Instructions
          </Button>
          <Button 
            size="lg" 
            onClick={handleBeginSurgery}
            disabled={!selectedScenario}
            className="px-8"
          >
            Begin Surgery
          </Button>
        </div>
      </div>
    </div>
  );
}
