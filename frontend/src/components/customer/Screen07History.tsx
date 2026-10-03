import React from 'react';
import { 
  History, 
  ArrowLeft, 
  Building2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import { queueStore, AppState } from '../../services/store';

interface Screen07HistoryProps {
  appState: AppState;
}

export const Screen07History: React.FC<Screen07HistoryProps> = ({ appState }) => {
  const historyList = appState.historyTokens;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <button
            onClick={() => queueStore.setScreen('SCREEN_02_DISCOVERY')}
            className="p-2 rounded-xl text-content-muted hover:text-content-primary hover:bg-surface-interactive transition-colors cursor-pointer"
            title="Back to Discovery"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-content-primary tracking-tight">
              Queue History
            </h1>
            <p className="text-xs text-content-secondary mt-0.5">
              A record of your recent service visits and queue tokens.
            </p>
          </div>
        </div>

        {appState.tokens.some(t => ['WAITING', 'CALLED', 'AWAY'].includes(t.state)) && (
          <button
            onClick={() => queueStore.setScreen('SCREEN_05_ACTIVE_STATUS')}
            className="text-xs font-semibold text-base bg-accent hover:bg-accent-hover px-4 py-2 rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
          >
            View Active Token
          </button>
        )}
      </div>

      {/* History Table / Card List */}
      <div className="border border-border-subtle rounded-lg overflow-hidden bg-surface">
        {historyList.length === 0 ? (
          <div className="p-12 text-center text-content-secondary">
            <History className="w-10 h-10 mx-auto text-content-muted mb-3" />
            <p className="text-sm font-semibold text-content-primary">No past queue history found</p>
            <p className="text-xs text-content-muted mt-1">When your tokens complete or close, they will be archived here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {historyList.map((item) => {
              const service = appState.services.find(s => s.id === item.serviceId);
              const location = appState.locations.find(l => l.id === item.locationId);

              const isComplete = item.state === 'COMPLETED';
              const isCancelled = item.state === 'CANCELLED';
              const isSkipped = item.state === 'SKIPPED' || item.state === 'NO_SHOW';

              return (
                <div 
                  key={item.id}
                  className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-interactive transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-lg border border-border-strong flex flex-col items-center justify-center shrink-0 bg-surface-elevated">
                      <span className="text-[9px] font-mono text-content-muted font-semibold uppercase">TOKEN</span>
                      <span className="text-base font-bold font-mono text-content-primary">{item.tokenNumber}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-content-primary">
                          {service?.name || 'Account Renewal'}
                        </span>
                        {item.counterNumber && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-accent/15 text-accent font-semibold">
                            Counter {item.counterNumber}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-content-secondary mt-1">
                        <Building2 className="w-3.5 h-3.5 text-content-muted" />
                        <span>{location?.name || 'Main Branch'} • {location?.subtitle || 'Downtown HQ'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-content-muted mt-1 font-mono">
                        <Calendar className="w-3 h-3 text-content-muted" />
                        <span>{new Date(item.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(item.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                    <div>
                      {isComplete && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-3 py-1 rounded-full bg-success/15 text-success border border-success/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Completed
                        </span>
                      )}
                      {isCancelled && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-3 py-1 rounded-full bg-border-subtle/30 text-content-secondary border border-border-subtle">
                          <XCircle className="w-3.5 h-3.5" />
                          Cancelled
                        </span>
                      )}
                      {isSkipped && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-3 py-1 rounded-full bg-error/15 text-error border border-error/30">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Skipped
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Return Action */}
      <div className="mt-6 text-center">
        <button
          onClick={() => queueStore.setScreen('SCREEN_02_DISCOVERY')}
          className="text-xs font-semibold text-accent hover:text-accent-hover cursor-pointer transition-colors"
        >
          &larr; Discover another organization or service
        </button>
      </div>
    </div>
  );
};
