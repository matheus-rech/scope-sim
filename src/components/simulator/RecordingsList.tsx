/**
 * RECORDINGS LIST COMPONENT
 * 
 * Displays saved recordings with:
 * - Level/scenario info
 * - Duration and date
 * - Final score
 * - Play and delete actions
 */

import { Play, Trash2, Film, Calendar, Clock, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MedicalCard } from '@/components/ui/medical-card';
import { formatDuration } from '@/lib/replay/ReplayStorage';
import type { SavedRecording } from '@/lib/replay/types';

interface RecordingsListProps {
  recordings: SavedRecording[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export function RecordingsList({ recordings, onSelect, onDelete, loading }: RecordingsListProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Film className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Saved Recordings</h3>
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground text-sm mt-2">Loading...</p>
        </div>
      ) : recordings.length === 0 ? (
        <MedicalCard variant="glass" className="text-center py-8">
          <Film className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground text-sm">
            No recordings yet. Complete a procedure to save a replay.
          </p>
        </MedicalCard>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {recordings.map((rec) => (
            <MedicalCard 
              key={rec.id} 
              variant="glass" 
              size="sm"
              className="transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <div className="font-medium truncate">
                    Level {rec.metadata.levelId}
                    {rec.metadata.scenario && (
                      <span className="text-muted-foreground">
                        {' '}- {rec.metadata.scenario.type}
                      </span>
                    )}
                  </div>
                  
                  {/* Metadata row */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(rec.metadata.duration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(rec.savedAt)}
                    </span>
                    {rec.metadata.finalScore !== undefined && (
                      <span className="flex items-center gap-1 text-success">
                        <Trophy className="w-3 h-3" />
                        {rec.metadata.finalScore}
                      </span>
                    )}
                  </div>
                  
                  {/* Complications */}
                  {rec.metadata.complications.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {rec.metadata.complications.slice(0, 3).map((comp, i) => (
                        <span 
                          key={i}
                          className="text-[10px] px-1.5 py-0.5 bg-destructive/20 text-destructive rounded"
                        >
                          {comp}
                        </span>
                      ))}
                      {rec.metadata.complications.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                          +{rec.metadata.complications.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex gap-1 flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => onSelect(rec.id)}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDelete(rec.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </MedicalCard>
          ))}
        </div>
      )}
    </div>
  );
}
