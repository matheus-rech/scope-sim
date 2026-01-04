import { LevelState, TumorScenario, Complication, KNOSP_GRADES } from '@/types/simulator';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  TrendingUp, 
  Clock, 
  Target,
  Activity,
  Brain,
  Zap,
  Award
} from 'lucide-react';

interface PostOpReportProps {
  levelState: LevelState;
  totalTime: number;
  complications: Complication[];
  scenario?: TumorScenario;
  onContinue: () => void;
  onRestart: () => void;
}

interface BenchmarkData {
  metric: string;
  resident: number;
  expert: number;
  unit: string;
  lowerIsBetter?: boolean;
}

export default function PostOpReport({
  levelState,
  totalTime,
  complications,
  scenario,
  onContinue,
  onRestart,
}: PostOpReportProps) {
  const metrics = levelState.metrics;
  
  // Calculate extent of resection based on level performance
  const extentOfResection = calculateExtentOfResection(levelState, complications);
  
  // Calculate biochemical remission prediction
  const remissionPrediction = calculateRemissionPrediction(extentOfResection, scenario, complications);
  
  // Analyze nerve status
  const nerveStatus = analyzeNerveStatus(complications);
  
  // Calculate overall score
  const overallScore = calculateOverallScore(levelState, extentOfResection, complications, totalTime);
  
  // Generate benchmarks comparison
  const benchmarks = generateBenchmarks(metrics, totalTime, extentOfResection);

  return (
    <div className="min-h-screen bg-background p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Post-Operative Report</h1>
          <p className="text-muted-foreground">
            Level {levelState.id}: {levelState.name}
          </p>
          {scenario && (
            <p className="text-sm text-primary">
              {scenario.type === 'functioning' ? 'Functioning' : 'Non-Functioning'} Adenoma • Knosp Grade {scenario.knospGrade}
            </p>
          )}
        </div>

        {/* Overall Score Card */}
        <div className={cn(
          "rounded-xl p-6 border-2 text-center",
          overallScore >= 90 ? "bg-success/10 border-success" :
          overallScore >= 70 ? "bg-warning/10 border-warning" :
          "bg-destructive/10 border-destructive"
        )}>
          <div className="flex items-center justify-center gap-3 mb-2">
            <Award className={cn(
              "w-8 h-8",
              overallScore >= 90 ? "text-success" :
              overallScore >= 70 ? "text-warning" :
              "text-destructive"
            )} />
            <span className="text-5xl font-bold text-foreground">{overallScore}</span>
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
          <p className="text-lg font-medium text-foreground">
            {getScoreGrade(overallScore)}
          </p>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Extent of Resection */}
          <div className="bg-card rounded-lg border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Extent of Resection</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-4xl font-bold text-foreground">{extentOfResection}%</span>
                <span className="text-sm text-muted-foreground">
                  {getResectionGrade(extentOfResection)}
                </span>
              </div>
              <Progress value={extentOfResection} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {extentOfResection >= 95 ? 'Gross Total Resection (GTR)' :
                 extentOfResection >= 80 ? 'Near Total Resection (NTR)' :
                 extentOfResection >= 50 ? 'Subtotal Resection (STR)' :
                 'Partial Resection'}
              </p>
            </div>
          </div>

          {/* Biochemical Remission */}
          <div className="bg-card rounded-lg border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Biochemical Remission</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-4xl font-bold text-foreground">{remissionPrediction.probability}%</span>
                <span className={cn(
                  "text-sm font-medium px-2 py-1 rounded",
                  remissionPrediction.probability >= 70 ? "bg-success/20 text-success" :
                  remissionPrediction.probability >= 40 ? "bg-warning/20 text-warning" :
                  "bg-destructive/20 text-destructive"
                )}>
                  {remissionPrediction.likelihood}
                </span>
              </div>
              <Progress 
                value={remissionPrediction.probability} 
                className={cn(
                  "h-3",
                  remissionPrediction.probability >= 70 ? "[&>div]:bg-success" :
                  remissionPrediction.probability >= 40 ? "[&>div]:bg-warning" :
                  "[&>div]:bg-destructive"
                )} 
              />
              <p className="text-xs text-muted-foreground">
                {remissionPrediction.note}
              </p>
            </div>
          </div>

          {/* Procedure Time */}
          <div className="bg-card rounded-lg border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Procedure Time</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-4xl font-bold text-foreground">
                  {Math.floor(totalTime / 60)}:{(totalTime % 60).toString().padStart(2, '0')}
                </span>
                <span className="text-sm text-muted-foreground">
                  Target: {getTargetTime(levelState.id)}
                </span>
              </div>
              <div className="flex gap-2 text-xs">
                <span className={cn(
                  "px-2 py-1 rounded",
                  totalTime <= getTargetTimeSeconds(levelState.id) ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                )}>
                  {totalTime <= getTargetTimeSeconds(levelState.id) ? 'Within Target' : 'Over Target'}
                </span>
              </div>
            </div>
          </div>

          {/* Mucosal Integrity */}
          <div className="bg-card rounded-lg border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Tissue Integrity</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mucosal Contacts</span>
                <span className={cn(
                  "font-medium",
                  metrics.mucosalContacts <= 3 ? "text-success" :
                  metrics.mucosalContacts <= 7 ? "text-warning" :
                  "text-destructive"
                )}>
                  {metrics.mucosalContacts}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Blood in Field</span>
                <span className={metrics.bloodInField ? "text-warning" : "text-success"}>
                  {metrics.bloodInField ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Doppler Used</span>
                <span className={metrics.dopplerUsed ? "text-success" : "text-destructive"}>
                  {metrics.dopplerUsed ? 'Yes ✓' : 'No ✗'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nerve Status */}
        <div className="bg-card rounded-lg border border-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Cranial Nerve Status</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(nerveStatus).map(([nerve, status]) => (
              <div 
                key={nerve}
                className={cn(
                  "p-3 rounded-lg border flex items-center gap-3",
                  status === 'intact' ? "bg-success/5 border-success/30" :
                  status === 'transient' ? "bg-warning/5 border-warning/30" :
                  "bg-destructive/5 border-destructive/30"
                )}
              >
                {status === 'intact' ? (
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                ) : status === 'transient' ? (
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                )}
                <div>
                  <p className="font-medium text-foreground text-sm">{nerve}</p>
                  <p className={cn(
                    "text-xs capitalize",
                    status === 'intact' ? "text-success" :
                    status === 'transient' ? "text-warning" :
                    "text-destructive"
                  )}>
                    {status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Complications */}
        {complications.length > 0 && (
          <div className="bg-card rounded-lg border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <h3 className="font-semibold text-foreground">Complications Encountered</h3>
            </div>
            <div className="space-y-2">
              {complications.map((comp, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "p-3 rounded-lg border flex items-center justify-between",
                    comp.severity === 'critical' ? "bg-destructive/10 border-destructive/30" :
                    comp.severity === 'major' ? "bg-warning/10 border-warning/30" :
                    "bg-secondary border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {comp.severity === 'critical' ? (
                      <XCircle className="w-5 h-5 text-destructive" />
                    ) : comp.severity === 'major' ? (
                      <AlertTriangle className="w-5 h-5 text-warning" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="text-foreground capitalize">
                      {comp.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs px-2 py-1 rounded capitalize",
                      comp.severity === 'critical' ? "bg-destructive/20 text-destructive" :
                      comp.severity === 'major' ? "bg-warning/20 text-warning" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      {comp.severity}
                    </span>
                    {comp.managed && (
                      <span className="text-xs px-2 py-1 rounded bg-success/20 text-success">
                        Managed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expert Benchmarks Comparison */}
        <div className="bg-card rounded-lg border border-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Expert Benchmark Comparison</h3>
          </div>
          <div className="space-y-4">
            {benchmarks.map((benchmark, idx) => {
              const residentPercent = benchmark.lowerIsBetter 
                ? Math.max(0, 100 - (benchmark.resident / benchmark.expert) * 100)
                : (benchmark.resident / benchmark.expert) * 100;
              const isGood = benchmark.lowerIsBetter 
                ? benchmark.resident <= benchmark.expert
                : benchmark.resident >= benchmark.expert * 0.8;
              
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{benchmark.metric}</span>
                    <div className="flex gap-4">
                      <span className={isGood ? "text-success" : "text-warning"}>
                        You: {benchmark.resident}{benchmark.unit}
                      </span>
                      <span className="text-muted-foreground">
                        Expert: {benchmark.expert}{benchmark.unit}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden relative">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all",
                        isGood ? "bg-success" : "bg-warning"
                      )}
                      style={{ width: `${Math.min(100, residentPercent)}%` }}
                    />
                    {/* Expert marker */}
                    <div 
                      className="absolute top-0 h-full w-0.5 bg-foreground/50"
                      style={{ left: '80%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            * Vertical line indicates 80% of expert benchmark (acceptable threshold)
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center pt-4">
          <Button variant="outline" size="lg" onClick={onRestart}>
            Retry Level
          </Button>
          <Button size="lg" onClick={onContinue}>
            {levelState.id < 5 ? 'Continue to Next Level' : 'Complete Training'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function calculateExtentOfResection(levelState: LevelState, complications: Complication[]): number {
  let base = levelState.score;
  
  // Reduce for complications
  complications.forEach(comp => {
    if (comp.severity === 'critical') base -= 15;
    else if (comp.severity === 'major') base -= 8;
    else base -= 3;
  });
  
  // Bonus for completed objectives
  const completedRatio = levelState.objectives.filter(o => o.isCompleted).length / levelState.objectives.length;
  base = base * (0.7 + completedRatio * 0.3);
  
  return Math.max(0, Math.min(100, Math.round(base)));
}

function calculateRemissionPrediction(
  extentOfResection: number, 
  scenario?: TumorScenario,
  complications?: Complication[]
): { probability: number; likelihood: string; note: string } {
  let baseProbability = extentOfResection * 0.9;
  
  // Adjust based on Knosp grade
  if (scenario) {
    const knospData = KNOSP_GRADES[scenario.knospGrade];
    baseProbability = (baseProbability + knospData.expectedRemission) / 2;
    
    // Functioning adenomas have different expectations
    if (scenario.type === 'functioning') {
      baseProbability *= 0.95; // Slightly harder to achieve biochemical cure
    }
  }
  
  // Reduce for nerve injuries
  if (complications?.some(c => c.type.includes('cn') || c.type.includes('injury'))) {
    baseProbability *= 0.85;
  }
  
  const probability = Math.max(0, Math.min(100, Math.round(baseProbability)));
  
  let likelihood = 'Unlikely';
  if (probability >= 80) likelihood = 'Very Likely';
  else if (probability >= 60) likelihood = 'Likely';
  else if (probability >= 40) likelihood = 'Possible';
  
  let note = 'Based on extent of resection and procedure quality.';
  if (scenario?.type === 'functioning') {
    note = 'Biochemical cure requires complete adenoma removal for secreting tumors.';
  }
  
  return { probability, likelihood, note };
}

function analyzeNerveStatus(complications: Complication[]): Record<string, 'intact' | 'transient' | 'permanent'> {
  const nerves: Record<string, 'intact' | 'transient' | 'permanent'> = {
    'CN II (Optic)': 'intact',
    'CN III (Oculomotor)': 'intact',
    'CN IV (Trochlear)': 'intact',
    'CN V1 (Ophthalmic)': 'intact',
    'CN V2 (Maxillary)': 'intact',
    'CN VI (Abducens)': 'intact',
  };
  
  complications.forEach(comp => {
    if (comp.type === 'cn6_stretch') {
      nerves['CN VI (Abducens)'] = comp.severity === 'critical' ? 'permanent' : 'transient';
    }
    if (comp.type === 'cn3_injury') {
      nerves['CN III (Oculomotor)'] = comp.severity === 'critical' ? 'permanent' : 'transient';
    }
  });
  
  return nerves;
}

function calculateOverallScore(
  levelState: LevelState,
  extentOfResection: number,
  complications: Complication[],
  totalTime: number
): number {
  let score = 0;
  
  // Objectives completed (30 points)
  const objectiveRatio = levelState.objectives.filter(o => o.isCompleted).length / levelState.objectives.length;
  score += objectiveRatio * 30;
  
  // Extent of resection (30 points)
  score += (extentOfResection / 100) * 30;
  
  // Time efficiency (20 points)
  const targetTime = getTargetTimeSeconds(levelState.id);
  const timeRatio = Math.min(1, targetTime / Math.max(totalTime, 1));
  score += timeRatio * 20;
  
  // Complication penalty (up to -20 points)
  const complicationPenalty = complications.reduce((sum, c) => {
    if (c.severity === 'critical') return sum + 10;
    if (c.severity === 'major') return sum + 5;
    return sum + 2;
  }, 0);
  score -= Math.min(20, complicationPenalty);
  
  // Technique bonus (20 points)
  let techniqueScore = 20;
  if (levelState.metrics.mucosalContacts > 5) techniqueScore -= 5;
  if (levelState.metrics.bloodInField) techniqueScore -= 5;
  if (!levelState.metrics.dopplerUsed && levelState.id >= 3) techniqueScore -= 10;
  score += Math.max(0, techniqueScore);
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

function generateBenchmarks(metrics: LevelState['metrics'], totalTime: number, extentOfResection: number): BenchmarkData[] {
  return [
    { metric: 'Procedure Time', resident: Math.round(totalTime / 60), expert: 45, unit: 'min', lowerIsBetter: true },
    { metric: 'Extent of Resection', resident: extentOfResection, expert: 95, unit: '%' },
    { metric: 'Mucosal Contacts', resident: metrics.mucosalContacts, expert: 2, unit: '', lowerIsBetter: true },
    { metric: 'Scope Adjustments', resident: metrics.scopeAngleChanges, expert: 8, unit: '', lowerIsBetter: true },
  ];
}

function getScoreGrade(score: number): string {
  if (score >= 95) return 'Outstanding - Ready for Independent Practice';
  if (score >= 90) return 'Excellent - Attending Level Performance';
  if (score >= 80) return 'Good - Senior Resident Level';
  if (score >= 70) return 'Satisfactory - Continued Practice Recommended';
  if (score >= 60) return 'Needs Improvement';
  return 'Unsatisfactory - Review Fundamentals';
}

function getResectionGrade(extent: number): string {
  if (extent >= 95) return 'Excellent';
  if (extent >= 80) return 'Good';
  if (extent >= 60) return 'Adequate';
  return 'Incomplete';
}

function getTargetTime(levelId: number): string {
  const times: Record<number, string> = {
    1: '3:00',
    2: '5:00',
    3: '8:00',
    4: '12:00',
    5: '6:00',
  };
  return times[levelId] || '5:00';
}

function getTargetTimeSeconds(levelId: number): number {
  const times: Record<number, number> = {
    1: 180,
    2: 300,
    3: 480,
    4: 720,
    5: 360,
  };
  return times[levelId] || 300;
}
