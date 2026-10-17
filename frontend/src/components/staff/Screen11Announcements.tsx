import React, { useState } from 'react';
import { queueStore, AppState } from '../../services/store';
import { apiClient } from '../../services/apiClient';
import { Icon } from '../common/Icon';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface Screen11AnnouncementsProps {
  appState: AppState;
}

export const Screen11Announcements: React.FC<Screen11AnnouncementsProps> = ({ appState }) => {
  const lastCalledToken = appState.tokens.find(t => t.id === appState.lastCalledTokenId);
  const [tokenInput, setTokenInput] = useState(lastCalledToken?.tokenNumber || '');
  const [counterInput, setCounterInput] = useState(lastCalledToken?.counterNumber || 1);
  const [customMessage, setCustomMessage] = useState(
    lastCalledToken ? `Token ${lastCalledToken.tokenNumber}, please proceed to Counter ${lastCalledToken.counterNumber || 1}.` : ''
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastStatus, setLastStatus] = useState<'idle' | 'speaking' | 'completed' | 'failed'>('idle');

  const handleSpeakNow = async () => {
    setIsSpeaking(true);
    setLastStatus('speaking');

    try {
      const locationId = appState.currentUser?.locationId || 'default-loc';

      await apiClient.createAnnouncement({
        locationId,
        text: customMessage
      });

      queueStore.speakAnnouncementText(
        customMessage,
        () => {
          setIsSpeaking(true);
          setLastStatus('speaking');
        },
        () => {
          setIsSpeaking(false);
          setLastStatus('completed');
        },
        () => {
          setIsSpeaking(false);
          setLastStatus('failed');
        }
      );
    } catch (e) {
      console.error('Failed to create announcement API', e);
      setIsSpeaking(false);
      setLastStatus('failed');
    }
  };

  const handleUpdateTokenNumber = (token: string, counter: number) => {
    setTokenInput(token);
    setCounterInput(counter);
    setCustomMessage(`Token ${token}, please proceed to Counter ${counter}.`);
  };

  return (
    <div className="flex-1 bg-[#f7f7f4] overflow-y-auto p-4 md:p-8 text-[#26251e]">
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[#e6e5e0]">
          <div className="flex items-start gap-4">
            <button
              onClick={() => queueStore.setScreen('SCREEN_09_STAFF_OPERATIONS')}
              className="mt-1 p-2 rounded-md text-[#5a5852] hover:text-[#26251e] hover:bg-white border border-transparent hover:border-[#e6e5e0] transition-colors cursor-pointer"
            >
              <Icon icon="lucide:arrow-left" className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#1f8a65] animate-pulse" />
                <span className="text-[10px] font-mono tracking-wider text-[#1f8a65] uppercase font-semibold">
                  Auditory PA System Active
                </span>
              </div>
              <h1 className="text-display-md text-[#26251e]">
                Announcement Control
              </h1>
              <p className="text-sm text-[#5a5852] mt-1">
                Broadcast synthesized speech and visual alerts across all public display kiosks and terminals.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="md"
            onClick={() => queueStore.setScreen('SCREEN_22_PUBLIC_DISPLAY')}
          >
            Preview Public TV
          </Button>
        </div>

        {/* Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          
          {/* Left Column: Compose & Broadcast */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 md:p-8">
              <h2 className="text-[11px] font-mono tracking-widest text-[#807d72] uppercase font-semibold mb-6">
                Compose Live Broadcast
              </h2>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#5a5852] font-semibold block">
                      Target Token ID
                    </label>
                    <Input
                      type="text"
                      value={tokenInput}
                      onChange={(e) => handleUpdateTokenNumber(e.target.value, counterInput)}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#5a5852] font-semibold block">
                      Assigned Counter
                    </label>
                    <Input
                      type="number"
                      value={counterInput}
                      onChange={(e) => handleUpdateTokenNumber(tokenInput, parseInt(e.target.value) || 1)}
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#5a5852] font-semibold block">
                    Speech Synthesizer Message
                  </label>
                  <textarea
                    rows={3}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full bg-white border border-[#e6e5e0] rounded-md p-3.5 text-sm text-[#26251e] placeholder:text-[#a09c92] focus:outline-none focus:border-[#26251e] resize-none transition-colors"
                  />
                </div>
              </div>

              {/* Action Area */}
              <div className="mt-8 flex flex-col items-center justify-center pt-6 border-t border-[#efeee8]">
                <Button
                  id="broadcast-speak-btn"
                  variant="primary"
                  size="lg"
                  disabled={isSpeaking}
                  isLoading={isSpeaking}
                  onClick={handleSpeakNow}
                  className="px-8 h-12 text-xs font-semibold uppercase tracking-wider rounded-full"
                >
                  <Icon icon="lucide:volume-2" className="w-5 h-5 mr-2" />
                  <span>{isSpeaking ? 'Transmitting Audio...' : 'Broadcast Announcement'}</span>
                </Button>

                <div className="mt-4 h-6 flex items-center justify-center">
                  {isSpeaking ? (
                    <div className="flex items-center gap-2 text-xs font-mono text-[#1f8a65]">
                      <div className="flex items-center gap-0.5 h-3">
                        <span className="w-1 bg-[#1f8a65] rounded-full animate-wave-1 h-3" />
                        <span className="w-1 bg-[#1f8a65] rounded-full animate-wave-2 h-1.5" />
                        <span className="w-1 bg-[#1f8a65] rounded-full animate-wave-3 h-2.5" />
                        <span className="w-1 bg-[#1f8a65] rounded-full animate-wave-4 h-1" />
                      </div>
                      <span>Synthesizing audio signal</span>
                    </div>
                  ) : lastStatus === 'completed' ? (
                    <div className="flex items-center gap-2 text-xs font-mono text-[#1f8a65]">
                      <Icon icon="lucide:check-circle-2" className="w-3.5 h-3.5 text-[#1f8a65]" />
                      <span>Announcement transmitted successfully</span>
                    </div>
                  ) : lastStatus === 'failed' ? (
                    <div className="flex items-center gap-2 text-xs font-mono text-[#cf2d56]">
                      <Icon icon="lucide:alert-circle" className="w-3.5 h-3.5" />
                      <span>Audio broadcast transmission failed</span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono tracking-widest uppercase text-[#807d72]">
                      System standby • Ready to broadcast
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Status & History */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#efeee8]">
                <h2 className="text-[11px] font-mono tracking-widest text-[#807d72] uppercase font-semibold">
                  Recent Broadcasts
                </h2>
                <Icon icon="lucide:radio" className="w-4 h-4 text-[#807d72]" />
              </div>
              
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {appState.announcements.slice(0, 5).map((ann) => (
                  <div key={ann.id} className="p-3.5 bg-[#fafaf7] border border-[#e6e5e0] rounded-md flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold text-[#26251e]">
                        {ann.tokenNumber} &rarr; Counter {ann.counterNumber}
                      </span>
                      <Badge variant={ann.status === 'Sent' ? 'done' : 'error'} size="sm">
                        {ann.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-[#5a5852] line-clamp-2 leading-relaxed">
                      "{ann.text}"
                    </div>
                    <div className="text-[10px] text-[#807d72] font-mono flex items-center gap-1.5 mt-1">
                      <Icon icon="lucide:clock" className="w-3 h-3" />
                      <span>{ann.timeLabel} • {ann.serviceName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
