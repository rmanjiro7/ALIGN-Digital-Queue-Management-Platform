import React from 'react';
import { queueStore, AppState } from '../../services/store';
import { Icon } from '../common/Icon';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

interface Screen07HistoryProps {
  appState: AppState;
}

export const Screen07History: React.FC<Screen07HistoryProps> = ({ appState }) => {
  const historyList = appState.historyTokens;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#e6e5e0]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => queueStore.setScreen('SCREEN_02_DISCOVERY')}
            className="p-2 rounded-md text-[#5a5852] hover:text-[#26251e] hover:bg-white border border-transparent hover:border-[#e6e5e0] transition-colors cursor-pointer"
            title="Back to Discovery"
          >
            <Icon icon="lucide:arrow-left" className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-display-md text-[#26251e]">
              Queue History
            </h1>
            <p className="text-xs text-[#5a5852] mt-1">
              A permanent audit log of your recent service visits and queue tokens.
            </p>
          </div>
        </div>

        {appState.tokens.some(t => ['WAITING', 'CALLED', 'AWAY'].includes(t.state)) && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => queueStore.setScreen('SCREEN_05_ACTIVE_STATUS')}
            className="text-xs font-semibold uppercase tracking-wider"
          >
            View Active Token
          </Button>
        )}
      </div>

      {/* History Table / Card List */}
      <Card className="p-0 overflow-hidden">
        {historyList.length === 0 ? (
          <div className="p-12 text-center text-[#5a5852]">
            <Icon icon="lucide:history" className="w-10 h-10 mx-auto text-[#807d72] mb-3" />
            <p className="text-sm font-semibold text-[#26251e]">No past queue history found</p>
            <p className="text-xs text-[#807d72] mt-1">When your tokens complete or close, they will be archived here.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#efeee8]">
            {historyList.map((item) => {
              const service = appState.services.find(s => s.id === item.serviceId);
              const location = appState.locations.find(l => l.id === item.locationId);

              const isComplete = item.state === 'COMPLETED';
              const isCancelled = item.state === 'CANCELLED';
              const isSkipped = item.state === 'SKIPPED' || item.state === 'NO_SHOW';

              return (
                <div 
                  key={item.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#fafaf7] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-md border border-[#e6e5e0] flex flex-col items-center justify-center shrink-0 bg-[#fafaf7]">
                      <span className="text-[9px] font-mono text-[#807d72] font-semibold uppercase">TOKEN</span>
                      <span className="text-base font-medium font-mono text-[#26251e]">{item.tokenNumber}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#26251e]">
                          {service?.name || 'General Service'}
                        </span>
                        {item.counterNumber && (
                          <Badge variant="read" size="sm">
                            Counter {item.counterNumber}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[#5a5852] mt-1">
                        <Icon icon="lucide:building-2" className="w-3.5 h-3.5 text-[#807d72]" />
                        <span>{location?.name || 'Main Location'} {location?.subtitle && <span className="text-[#807d72]">({location.subtitle})</span>}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#807d72] mt-1 font-mono">
                        <Icon icon="lucide:calendar" className="w-3 h-3 text-[#807d72]" />
                        <span>{new Date(item.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(item.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                    <div>
                      {isComplete && (
                        <Badge variant="done" size="sm">
                          <Icon icon="lucide:check-circle-2" className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                      {isCancelled && (
                        <Badge variant="outline" size="sm">
                          <Icon icon="lucide:x-circle" className="w-3 h-3 mr-1" />
                          Cancelled
                        </Badge>
                      )}
                      {isSkipped && (
                        <Badge variant="error" size="sm">
                          <Icon icon="lucide:alert-circle" className="w-3 h-3 mr-1" />
                          Skipped
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Footer Return Action */}
      <div className="mt-8 text-center">
        <button
          onClick={() => queueStore.setScreen('SCREEN_02_DISCOVERY')}
          className="text-xs font-semibold text-[#f54e00] hover:text-[#d04200] cursor-pointer transition-colors"
        >
          &larr; Discover another organization or service
        </button>
      </div>
    </div>
  );
};
