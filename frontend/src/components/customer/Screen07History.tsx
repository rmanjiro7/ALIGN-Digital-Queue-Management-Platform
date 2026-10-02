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
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => queueStore.setScreen('SCREEN_02_DISCOVERY')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            title="Back to Discovery"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
              Queue History
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              A record of your recent service visits and queue tokens.
            </p>
          </div>
        </div>

        {appState.tokens.some(t => ['WAITING', 'CALLED', 'AWAY'].includes(t.state)) && (
          <button
            onClick={() => queueStore.setScreen('SCREEN_05_ACTIVE_STATUS')}
            className="text-xs font-bold text-white bg-[#00ACC1] hover:bg-[#0097A7] px-4 py-2 rounded-xl shadow-md shadow-[#00ACC1]/25 uppercase tracking-wider transition-colors cursor-pointer"
          >
            View Active Token
          </button>
        )}
      </div>

      {/* History Table / Card List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {historyList.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <History className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-700">No past queue history found</p>
            <p className="text-xs text-slate-400 mt-1">When your tokens complete or close, they will be archived here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {historyList.map((item) => {
              const service = appState.services.find(s => s.id === item.serviceId);
              const location = appState.locations.find(l => l.id === item.locationId);

              const isComplete = item.state === 'COMPLETED';
              const isCancelled = item.state === 'CANCELLED';
              const isSkipped = item.state === 'SKIPPED' || item.state === 'NO_SHOW';

              return (
                <div 
                  key={item.id}
                  className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F1F5F9]/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] border border-slate-200 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">TOKEN</span>
                      <span className="text-base font-black font-mono text-[#0F172A]">{item.tokenNumber}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {service?.name || 'Account Renewal'}
                        </span>
                        {item.counterNumber && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#00ACC1]/15 text-[#00ACC1] font-bold">
                            Counter {item.counterNumber}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{location?.name || 'Main Branch'} • {location?.subtitle || 'Downtown HQ'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{new Date(item.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(item.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                    <div>
                      {isComplete && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Completed
                        </span>
                      )}
                      {isCancelled && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          <XCircle className="w-3.5 h-3.5" />
                          Cancelled
                        </span>
                      )}
                      {isSkipped && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
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
          className="text-xs font-bold text-[#00ACC1] hover:underline cursor-pointer"
        >
          &larr; Discover another organization or service
        </button>
      </div>
    </div>
  );
};
