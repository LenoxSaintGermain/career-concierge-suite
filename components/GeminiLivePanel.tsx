import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { createGeminiLiveToken } from '../services/liveApi';
import { GeminiLiveTokenResponse } from '../types';

type LiveState = 'idle' | 'connecting' | 'connected' | 'error';

const base64ToBytes = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const parsePcmRate = (mimeType: string) => {
  const match = String(mimeType || '').match(/rate=(\d+)/i);
  return match ? Number(match[1]) : 24000;
};

const pcmToWavBlob = (pcmBase64: string, sampleRate = 24000) => {
  const pcm = base64ToBytes(pcmBase64);
  const channels = 1;
  const bitsPerSample = 16;
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const buffer = new ArrayBuffer(44 + pcm.byteLength);
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, pcm.byteLength, true);
  uint8.set(pcm, 44);

  return new Blob([buffer], { type: 'audio/wav' });
};

export function GeminiLivePanel() {
  const [state, setState] = useState<LiveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [transcript, setTranscript] = useState('');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<GeminiLiveTokenResponse | null>(null);

  const sessionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const cameraLoopRef = useRef<number | null>(null);
  const audioChunksRef = useRef<string[]>([]);
  const audioMimeRef = useRef<string>('audio/pcm;rate=24000');
  const firstByteAtRef = useRef<number | null>(null);
  const promptSentAtRef = useRef<number | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const cameraReady = state === 'connected' && cameraEnabled;
  const micReady = state === 'connected' && micEnabled;
  const engagementReady = state === 'connected' && (micEnabled || prompt.trim().length > 0);

  const clearCameraLoop = () => {
    if (cameraLoopRef.current) {
      window.clearInterval(cameraLoopRef.current);
      cameraLoopRef.current = null;
    }
  };

  const stopCamera = () => {
    clearCameraLoop();
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraEnabled(false);
  };

  const stopMic = () => {
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      // noop
    }
    mediaRecorderRef.current = null;
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.sendRealtimeInput?.({ audioStreamEnd: true });
    }
    setMicEnabled(false);
  };

  const closeSession = () => {
    try {
      sessionRef.current?.close?.();
    } catch {
      // noop
    }
    sessionRef.current = null;
    setState('idle');
    stopMic();
    stopCamera();
  };

  const playTurnAudio = async () => {
    const merged = audioChunksRef.current.join('');
    if (!merged) return;

    audioChunksRef.current = [];
    let audioUrl: string | null = null;
    const mime = audioMimeRef.current.toLowerCase();

    try {
      if (mime.startsWith('audio/pcm')) {
        const wavBlob = pcmToWavBlob(merged, parsePcmRate(audioMimeRef.current));
        audioUrl = URL.createObjectURL(wavBlob);
      } else {
        const blob = new Blob([base64ToBytes(merged)], { type: audioMimeRef.current });
        audioUrl = URL.createObjectURL(blob);
      }

      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }

      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;
      await audio.play();
      audio.onended = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
      };
    } catch (e: any) {
      setError(e?.message ?? 'Unable to play Live audio.');
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    }
  };

  const startSession = async () => {
    setError(null);
    setState('connecting');
    setTranscript('');
    setLatencyMs(null);
    audioChunksRef.current = [];
    firstByteAtRef.current = null;
    promptSentAtRef.current = null;

    try {
      const token = await createGeminiLiveToken();
      setTokenInfo(token);
      const ai = new GoogleGenAI({
        apiKey: token.token_name,
        httpOptions: { apiVersion: 'v1alpha' },
      });

      const session = await ai.live.connect({
        model: token.model,
        config: {
          responseModalities: [Modality.AUDIO, Modality.TEXT],
        },
        callbacks: {
          onmessage: async (message: any) => {
            const parts = message?.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part?.inlineData?.data) {
                if (!firstByteAtRef.current && promptSentAtRef.current) {
                  firstByteAtRef.current = performance.now();
                  setLatencyMs(Math.max(0, Math.round(firstByteAtRef.current - promptSentAtRef.current)));
                }
                audioChunksRef.current.push(String(part.inlineData.data).replace(/\s+/g, ''));
              }
              if (part?.inlineData?.mimeType) {
                audioMimeRef.current = String(part.inlineData.mimeType);
              }
              if (part?.text) {
                setTranscript((prev) => `${prev}${prev ? '\n' : ''}${String(part.text).trim()}`);
              }
            }
            if (message?.serverContent?.turnComplete) {
              await playTurnAudio();
            }
          },
          onerror: (event: any) => {
            const detail = String(event?.message || event?.error || 'Live session error');
            setError(detail);
            setState('error');
          },
          onclose: (event: any) => {
            stopMic();
            stopCamera();
            setState('idle');
            if (event?.reason) {
              setError(String(event.reason));
            }
          },
        },
      });

      sessionRef.current = session;
      setState('connected');
    } catch (e: any) {
      setState('error');
      setError(e?.message ?? 'Unable to start Gemini Live session.');
    }
  };

  const sendPrompt = async () => {
    if (!sessionRef.current || !prompt.trim() || sending) return;
    setSending(true);
    setError(null);
    audioChunksRef.current = [];
    firstByteAtRef.current = null;
    promptSentAtRef.current = performance.now();
    try {
      sessionRef.current.sendClientContent({
        turns: [{ role: 'user', parts: [{ text: prompt.trim() }] }],
        turnComplete: true,
      });
      setPrompt('');
    } catch (e: any) {
      setError(e?.message ?? 'Unable to send prompt to Live session.');
    } finally {
      setSending(false);
    }
  };

  const startCamera = async () => {
    if (!sessionRef.current) {
      setError('Connect Live session before starting camera relay.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      cameraStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraEnabled(true);

      const canvas = document.createElement('canvas');
      clearCameraLoop();
      cameraLoopRef.current = window.setInterval(async () => {
        if (!videoRef.current || !sessionRef.current) return;
        const vw = videoRef.current.videoWidth || 640;
        const vh = videoRef.current.videoHeight || 360;
        if (!vw || !vh) return;
        canvas.width = vw;
        canvas.height = vh;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0, vw, vh);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.72));
        if (!blob) return;
        sessionRef.current.sendRealtimeInput({ video: blob });
      }, 1200);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to start camera relay.');
    }
  };

  const startMic = async () => {
    if (!sessionRef.current) {
      setError('Connect Live session before starting microphone stream.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;
      const preferredMimes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const mimeType = preferredMimes.find((entry) => MediaRecorder.isTypeSupported(entry));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (!event.data || event.data.size === 0 || !sessionRef.current) return;
        sessionRef.current.sendRealtimeInput({ audio: event.data });
      };
      recorder.start(250);
      setMicEnabled(true);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to start microphone stream.');
    }
  };

  useEffect(() => {
    return () => {
      closeSession();
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, []);

  return (
    <section className="border border-[#d7ece9] bg-[#f4fbfa] p-5 md:p-6 space-y-5 shadow-[0_1px_0_0_rgba(0,0,0,0.02)]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">Concierge Live Studio</div>
          <div className="text-xl font-editorial italic mt-1">Step into a live conversation with your suite.</div>
          <p className="text-xs text-black/55 mt-2 max-w-xl leading-relaxed">
            This is your OS interaction rail: real-time voice, optional visual context, and immediate strategic
            guidance with ROM-aligned tone.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              state === 'connected' ? 'bg-brand-teal animate-pulse' : state === 'error' ? 'bg-red-500' : 'bg-black/20'
            }`}
          />
          <div className="text-[10px] uppercase tracking-[0.2em] text-black/55">
            {state === 'connected' ? 'Live' : state === 'connecting' ? 'Connecting' : state === 'error' ? 'Error' : 'Idle'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className={`border p-2 text-[10px] uppercase tracking-[0.16em] ${state === 'connected' ? 'border-brand-teal text-brand-teal bg-white' : 'border-black/10 text-black/50 bg-white/80'}`}>
          1. Initiate Session
        </div>
        <div className={`border p-2 text-[10px] uppercase tracking-[0.16em] ${micReady ? 'border-brand-teal text-brand-teal bg-white' : 'border-black/10 text-black/50 bg-white/80'}`}>
          2. Open Voice
        </div>
        <div className={`border p-2 text-[10px] uppercase tracking-[0.16em] ${cameraReady ? 'border-brand-teal text-brand-teal bg-white' : 'border-black/10 text-black/50 bg-white/80'}`}>
          3. Add Camera (Optional)
        </div>
        <div className={`border p-2 text-[10px] uppercase tracking-[0.16em] ${engagementReady ? 'border-brand-teal text-brand-teal bg-white' : 'border-black/10 text-black/50 bg-white/80'}`}>
          4. Ask For Guidance
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5">
        <div className="space-y-3">
          <div className="border border-black/10 bg-white p-3">
            <video ref={videoRef} autoPlay muted playsInline className="w-full aspect-video object-cover bg-black/80" />
          </div>
          <div className="flex flex-wrap gap-2">
            {state !== 'connected' ? (
              <button
                type="button"
                onClick={startSession}
                disabled={state === 'connecting'}
                className="px-4 py-2 btn-brand text-[10px] uppercase tracking-[0.22em] disabled:opacity-40"
              >
                {state === 'connecting' ? 'Opening Studio…' : 'Initiate Conversation'}
              </button>
            ) : (
              <button
                type="button"
                onClick={closeSession}
                className="px-4 py-2 border border-black/20 text-[10px] uppercase tracking-[0.22em] hover-border-brand-teal"
              >
                End Live Session
              </button>
            )}
            <button
              type="button"
              onClick={cameraEnabled ? stopCamera : startCamera}
              disabled={state !== 'connected'}
              className="px-4 py-2 border border-black/20 text-[10px] uppercase tracking-[0.22em] disabled:opacity-40 hover-border-brand-teal"
            >
              {cameraEnabled ? 'Pause Visual Context' : 'Invite Visual Context'}
            </button>
            <button
              type="button"
              onClick={micEnabled ? stopMic : startMic}
              disabled={state !== 'connected'}
              className="px-4 py-2 border border-black/20 text-[10px] uppercase tracking-[0.22em] disabled:opacity-40 hover-border-brand-teal"
            >
              {micEnabled ? 'Close Voice Channel' : 'Open Voice Channel'}
            </button>
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">
            You can stay text-only, voice-first, or add camera context. The system adapts.
          </div>
        </div>

        <div className="space-y-3">
          <div className="border border-black/10 bg-white p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">Realtime Metrics</div>
            <div className="text-xs text-black/70">Model: {tokenInfo?.model ?? 'not connected'}</div>
            <div className="text-xs text-black/70">Voice: {tokenInfo?.voice_name ?? 'n/a'}</div>
            <div className="text-xs text-black/70">Latency to first audio: {latencyMs ? `${latencyMs} ms` : 'n/a'}</div>
            <div className="text-xs text-black/70">Token expires: {tokenInfo?.expires_at ?? 'n/a'}</div>
          </div>
          <div className="border border-black/10 bg-white p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">Guided Prompt</div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask for positioning, rehearsal, or your next high-leverage move..."
              className="w-full min-h-24 border border-black/10 focus-border-brand-teal outline-none p-3 text-sm leading-relaxed"
            />
            <button
              type="button"
              onClick={sendPrompt}
              disabled={state !== 'connected' || sending || !prompt.trim()}
              className="px-4 py-2 btn-brand text-[10px] uppercase tracking-[0.22em] disabled:opacity-40"
            >
              {sending ? 'Sending…' : 'Ask Concierge'}
            </button>
          </div>
        </div>
      </div>

      <div className="border border-black/10 bg-white p-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-black/50 mb-2">Live Transcript</div>
        <pre className="whitespace-pre-wrap font-mono text-xs text-black/75 leading-relaxed min-h-16 max-h-48 overflow-auto">
          {transcript || 'Waiting for model output...'}
        </pre>
      </div>

      {error && (
        <div className="border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-700 leading-relaxed">
          {error}
        </div>
      )}
    </section>
  );
}
