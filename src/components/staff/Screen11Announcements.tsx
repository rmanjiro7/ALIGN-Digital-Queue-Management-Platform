import React, { useState } from 'react';
import {
  Volume2,
  Radio,
  Play,
  CheckCircle2,
  AlertCircle,
  Mic,
  RefreshCw,
  Clock,
  Sparkles,
  Sliders,
  ArrowLeft
} from 'lucide-react';
import { queueStore, AppState } from '../../services/store';
import { apiClient } from '../../services/apiClient';

interface Screen11AnnouncementsProps {
  appState: AppState;
}

export const Screen11Announcements: React.FC<Screen11AnnouncementsProps> = ({ appState }) => {
  const [tokenInput, setTokenInput] = useState('A-042');
  const [counterInput, setCounterInput] = useState(3);
  const [customMessage, setCustomMessage] = useState('Token A-042, please proceed to Counter 3.');
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

      // Still call local synthesize for immediate feedback if desired, or skip it
      // Let's just keep the local one as well for now so it still works if no STOMP client is connected
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => queueStore.setScreen('SCREEN_09_STAFF_OPERATIONS')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-[#F1F5F9] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#00ACC1]">
                Output: PA System A • Audio Active
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight mt-1">
              Announcement Control
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage and broadcast speech-based queue announcements to public waiting monitors.
            </p>
          </div>
        </div>

        <button
          onClick={() => queueStore.setScreen('SCREEN_22_PUBLIC_DISPLAY')}
          className="text-xs font-bold text-white bg-[#0F172A] hover:bg-slate-800 px-5 py-3 rounded-2xl shadow-lg shadow-slate-900/20 transition-all uppercase tracking-wider cursor-pointer"
        >
          View Public Monitor (TV)
        </button>
      </div>

      {/* Main Broadcast Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Teleprompter & Giant Speak Button */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">
              Preview Broadcast Message
            </h2>

            {/* Editable Script Card */}
            <div className="bg-[#F1F5F9] p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Target Token</label>
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => handleUpdateTokenNumber(e.target.value, counterInput)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:border-[#00ACC1]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Target Counter</label>
                  <input
                    type="number"
                    value={counterInput}
                    onChange={(e) => handleUpdateTokenNumber(tokenInput, parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:border-[#00ACC1]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Speech Teleprompter</label>
                <textarea
                  rows={2}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:border-[#00ACC1] resize-none"
                />
              </div>
            </div>

            {/* Giant Circular SPEAK Action Button */}
            <div className="py-8 flex flex-col items-center justify-center">
              <button
                id="broadcast-speak-btn"
                disabled={isSpeaking}
                onClick={handleSpeakNow}
                className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center text-white font-black transition-all transform cursor-pointer ${
                  isSpeaking
                    ? 'bg-[#00ACC1] scale-105 shadow-2xl animate-pulse-ring'
                    : 'bg-[#0F172A] hover:bg-[#00ACC1] hover:scale-105 shadow-xl shadow-slate-900/20 active:scale-95'
                }`}
              >
                <Volume2 className="w-8 h-8 mb-1 text-white" />
                <span className="text-xs tracking-wider">{isSpeaking ? 'BROADCASTING' : 'SPEAK'}</span>
              </button>

              <div className="mt-4 text-center">
                {isSpeaking ? (
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#00ACC1]">
                    <div className="flex items-center gap-0.5 h-4">
                      <span className="w-1 bg-[#00ACC1] rounded-full animate-wave-1"></span>
                      <span className="w-1 bg-[#00ACC1] rounded-full animate-wave-2"></span>
                      <span className="w-1 bg-[#00ACC1] rounded-full animate-wave-3"></span>
                      <span className="w-1 bg-[#00ACC1] rounded-full animate-wave-4"></span>
                    </div>
                    <span>Broadcasting audio to lobby speakers...</span>
                  </div>
                ) : lastStatus === 'completed' ? (
                  <div className="flex items-center gap-1 text-xs font-mono text-emerald-600 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Announcement broadcast completed successfully</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 font-mono">
                    Click to trigger public speech chime and announcement
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Status Indicators & Recent Broadcast History */}
        <div className="space-y-6">
          {/* Status Indicator Legend */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-3">
              Status Indicator Reference
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F1F5F9] border border-slate-200">
                <span className="text-slate-700 font-medium">Speaking</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00ACC1]/20 text-[#00ACC1] font-bold">
                  Sound waves
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F1F5F9] border border-slate-200">
                <span className="text-slate-700 font-medium">Completed</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                  Sent / Ack
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F1F5F9] border border-slate-200">
                <span className="text-slate-700 font-medium">Failed</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                  Red Alert
                </span>
              </div>
            </div>
          </div>

          {/* Recent History */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-3">
              Recent Broadcast Log
            </h2>
            <div className="space-y-3 max-h-[280px] overflow-y-auto">
              {appState.announcements.slice(0, 5).map((ann) => (
                <div key={ann.id} className="p-3.5 bg-[#F1F5F9] rounded-2xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Token {ann.tokenNumber} &rarr; Counter {ann.counterNumber}
                    </span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      ann.status === 'Sent'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {ann.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1">
                    {ann.text}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{ann.timeLabel} • {ann.serviceName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
