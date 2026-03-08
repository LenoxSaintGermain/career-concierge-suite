import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { createGeminiLiveToken } from '../services/liveApi';
import { GeminiLiveTokenResponse } from '../types';

type LiveState = 'idle' | 'connecting' | 'connected' | 'error';
const PCM_SMOOTHING_BUFFER_MS = 70;
const PCM_PLAYBACK_LOOKAHEAD_SEC = 0.07;
const CONNECTING_SCENES = [
  'Loading concierge identity',
  'Aligning ROM tone and pacing',
  'Opening low-latency voice channel',
];
type StorySceneId = 'arrival' | 'signal' | 'co_design' | 'launch';
const STORY_SCENES: Array<{
  id: StorySceneId;
  kicker: string;
  title: string;
  body: string;
  cue: string;
}> = [
  {
    id: 'arrival',
    kicker: 'Scene 01',
    title: 'Enter the studio with one decisive intent.',
    body: 'Start voice-first. The concierge listens for pressure, constraints, and what a real win looks like this week.',
    cue: 'Press play and speak naturally for 20 seconds.',
  },
  {
    id: 'signal',
    kicker: 'Scene 02',
    title: 'Convert raw context into strategic signal.',
    body: 'Your tone, pacing, and phrasing become structured direction for the suite. No quiz energy. No generic scripts.',
    cue: 'Name one friction pattern that keeps repeating.',
  },
  {
    id: 'co_design',
    kicker: 'Scene 03',
    title: 'Co-design the next move in real time.',
    body: 'Invite camera only if visual context helps. The system stays focused on decisions, not visual noise.',
    cue: 'Ask for a better framing of your next high-leverage move.',
  },
  {
    id: 'launch',
    kicker: 'Scene 04',
    title: 'Launch with momentum already shaped.',
    body: 'Your live calibration feeds Intake and drives your brief, plan, and execution stack with less friction.',
    cue: 'Close the session once your direction feels precise.',
  },
];

const base64ToBytes = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...Array.from(chunk));
  }
  return btoa(binary);
};

const blobToBase64 = async (blob: Blob) => {
  const buffer = await blob.arrayBuffer();
  return bytesToBase64(new Uint8Array(buffer));
};

const float32ToPcm16 = (input: Float32Array) => {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    out[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return new Uint8Array(out.buffer);
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
  const [showProTools, setShowProTools] = useState(false);
  const [loadingSceneIndex, setLoadingSceneIndex] = useState(0);
  const [activeStoryScene, setActiveStoryScene] = useState<StorySceneId>('arrival');

  const sessionRef = useRef<any>(null);
  const storyRailRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playbackCursorRef = useRef<number>(0);
  const playbackSampleRateRef = useRef<number>(24000);
  const pendingPcmChunksRef = useRef<Uint8Array[]>([]);
  const pendingPcmBytesRef = useRef<number>(0);
  const cameraLoopRef = useRef<number | null>(null);
  const audioChunksRef = useRef<string[]>([]);
  const audioMimeRef = useRef<string>('audio/pcm;rate=24000');
  const firstByteAtRef = useRef<number | null>(null);
  const promptSentAtRef = useRef<number | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const cameraReady = state === 'connected' && cameraEnabled;
  const micReady = state === 'connected' && micEnabled;
  const engagementReady = state === 'connected' && (micEnabled || prompt.trim().length > 0);
  const statusLabel =
    state === 'connected' ? 'Connected' : state === 'connecting' ? 'Connecting' : state === 'error' ? 'Issue' : 'Standby';
  const stageIndex = state !== 'connected' ? 1 : engagementReady ? 4 : cameraReady ? 3 : micReady ? 2 : 1;
  const firstName = String(tokenInfo?.client_name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0];
  const personalGreeting = firstName
    ? `Welcome, ${firstName}. Your concierge is learning your context in real time.`
    : 'Welcome. Your concierge is learning your context in real time.';
  const connectingScene = CONNECTING_SCENES[loadingSceneIndex];
  const activeStory = useMemo(
    () => STORY_SCENES.find((scene) => scene.id === activeStoryScene) ?? STORY_SCENES[0],
    [activeStoryScene]
  );
  const appendTranscriptLine = (line: string) => {
    const cleaned = String(line || '').trim();
    if (!cleaned) return;
    setTranscript((prev) => `${prev}${prev ? '\n' : ''}${cleaned}`);
  };
  const liveMood =
    state === 'connected'
      ? micEnabled
        ? 'Voice channel active'
        : 'Session open, waiting for your first words'
      : state === 'connecting'
        ? 'Assembling cinematic live surface'
        : state === 'error'
          ? 'Session interrupted'
          : 'Immersive studio on standby';

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
    try {
      audioProcessorRef.current?.disconnect();
    } catch {
      // noop
    }
    try {
      audioSourceRef.current?.disconnect();
    } catch {
      // noop
    }
    try {
      audioGainRef.current?.disconnect();
    } catch {
      // noop
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
    }
    audioContextRef.current = null;
    audioSourceRef.current = null;
    audioProcessorRef.current = null;
    audioGainRef.current = null;
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (sessionRef.current) {
      try {
        sessionRef.current.sendRealtimeInput?.({ audioStreamEnd: true });
      } catch {
        // Socket may already be closing; safe to ignore.
      }
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
    if (playbackContextRef.current) {
      void playbackContextRef.current.close().catch(() => undefined);
      playbackContextRef.current = null;
    }
    playbackCursorRef.current = 0;
    playbackSampleRateRef.current = 24000;
    pendingPcmChunksRef.current = [];
    pendingPcmBytesRef.current = 0;
  };

  const flushPendingPcm = (force = false) => {
    const sampleRate = playbackSampleRateRef.current || 24000;
    const minBytes = Math.max(2, Math.floor((sampleRate * PCM_SMOOTHING_BUFFER_MS * 2) / 1000));
    if (!force && pendingPcmBytesRef.current < minBytes) return;
    if (pendingPcmBytesRef.current < 2) return;
    if (!playbackContextRef.current) {
      playbackContextRef.current = new AudioContext({ sampleRate });
      playbackCursorRef.current = playbackContextRef.current.currentTime;
    }

    const merged = new Uint8Array(pendingPcmBytesRef.current);
    let offset = 0;
    for (const chunk of pendingPcmChunksRef.current) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    pendingPcmChunksRef.current = [];
    pendingPcmBytesRef.current = 0;

    const usableByteLength = Math.floor(merged.byteLength / 2) * 2;
    const sampleCount = usableByteLength / 2;
    if (!sampleCount) return;

    const context = playbackContextRef.current;
    const buffer = context.createBuffer(1, sampleCount, sampleRate);
    const channel = buffer.getChannelData(0);
    const view = new DataView(merged.buffer, merged.byteOffset, usableByteLength);
    for (let i = 0; i < sampleCount; i += 1) {
      channel[i] = view.getInt16(i * 2, true) / 32768;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);

    const now = context.currentTime;
    const startAt = Math.max(playbackCursorRef.current, now + PCM_PLAYBACK_LOOKAHEAD_SEC);
    source.start(startAt);
    playbackCursorRef.current = startAt + buffer.duration;
  };

  const queuePcmChunk = (pcmBase64: string, mimeType: string) => {
    const sampleRate = parsePcmRate(mimeType);
    playbackSampleRateRef.current = sampleRate;
    const pcmBytes = base64ToBytes(pcmBase64);
    if (pcmBytes.byteLength < 2) return;
    pendingPcmChunksRef.current.push(pcmBytes);
    pendingPcmBytesRef.current += pcmBytes.byteLength;
    flushPendingPcm(false);
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

      if (playbackContextRef.current) {
        await playbackContextRef.current.close().catch(() => undefined);
      }
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
      if (playbackContextRef.current.state === 'suspended') {
        await playbackContextRef.current.resume();
      }
      playbackCursorRef.current = playbackContextRef.current.currentTime;
      playbackSampleRateRef.current = 24000;
      pendingPcmChunksRef.current = [];
      pendingPcmBytesRef.current = 0;

      const session = await ai.live.connect({
        model: token.model,
        callbacks: {
          onmessage: async (message: any) => {
            const parts = message?.serverContent?.modelTurn?.parts || [];
            const inputTranscript = String(message?.serverContent?.inputTranscription?.text || '').trim();
            const outputTranscript = String(message?.serverContent?.outputTranscription?.text || '').trim();
            if (inputTranscript) appendTranscriptLine(`You · ${inputTranscript}`);
            if (outputTranscript) appendTranscriptLine(`Concierge · ${outputTranscript}`);
            for (const part of parts) {
              if (part?.inlineData?.data) {
                const mimeType = String(part?.inlineData?.mimeType || audioMimeRef.current || 'audio/pcm;rate=24000');
                audioMimeRef.current = mimeType;
                if (!firstByteAtRef.current && promptSentAtRef.current) {
                  firstByteAtRef.current = performance.now();
                  setLatencyMs(Math.max(0, Math.round(firstByteAtRef.current - promptSentAtRef.current)));
                }
                const chunk = String(part.inlineData.data).replace(/\s+/g, '');
                if (mimeType.toLowerCase().startsWith('audio/pcm')) {
                  queuePcmChunk(chunk, mimeType);
                } else {
                  audioChunksRef.current.push(chunk);
                }
              }
              if (part?.text && !outputTranscript) {
                appendTranscriptLine(`Concierge · ${String(part.text).trim()}`);
              }
            }
            if (message?.serverContent?.turnComplete) {
              if (!audioMimeRef.current.toLowerCase().startsWith('audio/pcm')) {
                await playTurnAudio();
              } else {
                flushPendingPcm(true);
                audioChunksRef.current = [];
              }
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
        const mimeType = blob.type || 'image/jpeg';
        const data = await blobToBase64(blob);
        try {
          sessionRef.current.sendRealtimeInput({
            video: {
              mimeType,
              data,
            },
          });
        } catch {
          // Socket might be closing; suppress noisy runtime errors.
        }
      }, 1200);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to start camera relay.');
    }
  };

  const startPcmMicStream = async (stream: MediaStream) => {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) throw new Error('AudioContext unavailable on this browser');
    const context = new AudioContextCtor({ sampleRate: 16000 });
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(1024, 1, 1);
    const gain = context.createGain();
    gain.gain.value = 0;

    processor.onaudioprocess = (event: AudioProcessingEvent) => {
      if (!sessionRef.current) return;
      const channel = event.inputBuffer.getChannelData(0);
      if (!channel?.length) return;
      const pcmBytes = float32ToPcm16(channel);
      if (!pcmBytes.byteLength) return;
      try {
        sessionRef.current.sendRealtimeInput({
          audio: {
            mimeType: 'audio/pcm;rate=16000',
            data: bytesToBase64(pcmBytes),
          },
        });
      } catch {
        // Socket might be closing; suppress noisy runtime errors.
      }
    };

    source.connect(processor);
    processor.connect(gain);
    gain.connect(context.destination);

    if (context.state === 'suspended') {
      await context.resume();
    }

    audioContextRef.current = context;
    audioSourceRef.current = source;
    audioProcessorRef.current = processor;
    audioGainRef.current = gain;
  };

  const startMediaRecorderFallback = async (stream: MediaStream) => {
    const preferredMimes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    const mimeType = preferredMimes.find((entry) => MediaRecorder.isTypeSupported(entry));
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (!event.data || event.data.size === 0 || !sessionRef.current) return;
      void (async () => {
        try {
          const audioMime = event.data.type || recorder.mimeType || mimeType || 'audio/webm';
          const data = await blobToBase64(event.data);
          sessionRef.current?.sendRealtimeInput({
            audio: {
              mimeType: audioMime,
              data,
            },
          });
        } catch {
          // Socket might be closing; suppress noisy runtime errors.
        }
      })();
    };
    recorder.start(250);
  };

  const startMic = async () => {
    if (!sessionRef.current) {
      setError('Connect Live session before starting microphone stream.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;
      try {
        await startPcmMicStream(stream);
      } catch {
        await startMediaRecorderFallback(stream);
      }
      setMicEnabled(true);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to start microphone stream.');
    }
  };

  const scrollToStoryScene = (sceneId: StorySceneId) => {
    const rail = storyRailRef.current;
    if (!rail) return;
    const target = rail.querySelector<HTMLElement>(`[data-story-scene="${sceneId}"]`);
    if (!target) return;
    setActiveStoryScene(sceneId);
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  useEffect(() => {
    if (state !== 'connecting') {
      setLoadingSceneIndex(0);
      return;
    }
    const id = window.setInterval(() => {
      setLoadingSceneIndex((prev) => (prev + 1) % CONNECTING_SCENES.length);
    }, 950);
    return () => window.clearInterval(id);
  }, [state]);

  useEffect(() => {
    const rail = storyRailRef.current;
    if (!rail) return;
    const nodes: NodeListOf<HTMLElement> = rail.querySelectorAll('[data-story-scene]');
    if (!nodes.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible?.target) return;
        const nextId = visible.target.getAttribute('data-story-scene') as StorySceneId | null;
        if (nextId) setActiveStoryScene(nextId);
      },
      { root: rail, threshold: [0.45, 0.7, 0.9] }
    );

    nodes.forEach((node: HTMLElement) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

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
    <section className="relative overflow-hidden border border-[#163840] bg-[#07161a] p-5 md:p-7 text-[#dce7e8] shadow-[0_14px_40px_rgba(1,12,18,0.32)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 -right-16 h-72 w-72 rounded-full bg-[#2dc5c21f] blur-3xl" />
        <div className="absolute left-10 bottom-0 h-36 w-36 rounded-full bg-[#2dc5c214] blur-2xl" />
      </div>

      <div className="relative space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-brand-teal">Concierge Live Studio</div>
            <h3 className="text-[28px] md:text-[34px] font-editorial italic leading-tight mt-2">
              Press play. Step into a cinematic calibration.
            </h3>
            <p className="text-sm text-[#c7d5d7] leading-relaxed mt-3 max-w-2xl">
              {personalGreeting} This rail is designed as an immersive sequence, not a utility form. Speak naturally and
              let the concierge tune itself to your momentum.
            </p>
          </div>

          <div className="flex items-center gap-3 border border-[#22424a] bg-[#0d2329] px-3 py-2">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                state === 'connected' ? 'bg-brand-teal animate-pulse' : state === 'error' ? 'bg-red-500' : 'bg-white/30'
              }`}
            />
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#b5c5c8]">{statusLabel} · {liveMood}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            '1. Enter Studio',
            '2. Share Voice',
            '3. Add Visuals',
            '4. Co-Design',
          ].map((label, idx) => {
            const active = idx + 1 <= stageIndex;
            return (
              <div
                key={label}
                className={`border px-3 py-2 text-[10px] uppercase tracking-[0.16em] transition-all duration-500 ${
                  active ? 'border-brand-teal bg-[#14363b] text-brand-teal' : 'border-[#274148] bg-[#0d2025] text-[#7f9396]'
                }`}
              >
                {label}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[0.85fr_1.15fr] gap-4 border border-[#214047] bg-[#0a1d22] p-3 md:p-4">
          <div className="xl:sticky xl:top-3 self-start border border-[#2a4950] bg-[#102a31] p-4 md:p-5 min-h-[240px] flex flex-col justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">{activeStory.kicker}</div>
              <div className="mt-3 text-[28px] leading-[1.05] font-editorial italic text-[#e7f1f2]">{activeStory.title}</div>
              <p className="mt-4 text-sm leading-relaxed text-[#c4d4d6]">{activeStory.body}</p>
            </div>
            <div className="mt-5 border-t border-[#2d4b52] pt-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#8aa2a6]">Play Cue</div>
              <div className="mt-2 text-sm text-[#d5e2e3]">{activeStory.cue}</div>
            </div>
          </div>

          <div
            ref={storyRailRef}
            className="max-h-[280px] md:max-h-[320px] xl:max-h-[350px] overflow-y-auto no-scrollbar pr-1 space-y-3"
          >
            {STORY_SCENES.map((scene, idx) => {
              const active = scene.id === activeStoryScene;
              return (
                <button
                  key={scene.id}
                  type="button"
                  data-story-scene={scene.id}
                  onClick={() => scrollToStoryScene(scene.id)}
                  className={`w-full text-left border p-4 transition-all duration-500 ${
                    active
                      ? 'border-brand-teal bg-[#153740] shadow-[0_8px_24px_rgba(8,52,62,0.35)]'
                      : 'border-[#2a4850] bg-[#0e242a] hover:border-brand-teal/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-[#95adb1]">
                      {(idx + 1).toString().padStart(2, '0')} · {scene.kicker}
                    </div>
                    <div className={`h-2 w-2 rounded-full ${active ? 'bg-brand-teal animate-pulse' : 'bg-[#4b666a]'}`} />
                  </div>
                  <div className="mt-2 text-xl font-editorial italic text-[#e6eff0]">{scene.title}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.18em] text-[#9cb2b5]">{scene.cue}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-5 items-start">
          <div className="space-y-4">
            <div className="relative overflow-hidden border border-[#254149] bg-black/55 p-3">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full aspect-video object-cover bg-black/85"
              />
              {!cameraEnabled && (
                <div className="absolute inset-3 bg-[radial-gradient(circle_at_20%_20%,rgba(38,200,188,0.18),rgba(7,22,26,0.95)_62%)]">
                  <div className="absolute inset-0 opacity-35">
                    <div className="absolute top-0 left-[-20%] h-[1px] w-[40%] bg-brand-teal/70 animate-shimmer" />
                    <div className="absolute bottom-16 right-[-20%] h-[1px] w-[42%] bg-brand-teal/50 animate-shimmer" />
                  </div>
                  <div className="absolute inset-0 flex flex-col justify-end p-5">
                    {state === 'connecting' ? (
                      <>
                        <div className="text-[10px] uppercase tracking-[0.28em] text-brand-teal">Live Warmup</div>
                        <div className="mt-2 text-2xl font-editorial italic text-[#ebf3f4]">{connectingScene}</div>
                        <div className="mt-3 h-1 w-full overflow-hidden bg-white/15">
                          <div className="h-full w-[32%] bg-brand-teal animate-shimmer" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-[10px] uppercase tracking-[0.28em] text-brand-teal">Cinematic Context</div>
                        <div className="mt-2 text-2xl font-editorial italic text-[#ebf3f4]">
                          Voice-first by default.
                        </div>
                        <div className="mt-2 text-xs uppercase tracking-[0.2em] text-[#a8bcbe]">
                          Add camera only when visual context helps.
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {state !== 'connected' ? (
                <button
                  type="button"
                  onClick={startSession}
                  disabled={state === 'connecting'}
                  className="px-5 py-3 btn-brand text-[10px] uppercase tracking-[0.24em] disabled:opacity-40"
                >
                  {state === 'connecting' ? 'Opening Immersive Session…' : 'Play Immersive Session'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={closeSession}
                  className="px-5 py-3 border border-[#395359] bg-[#11272c] text-[10px] uppercase tracking-[0.24em] text-[#d0ddde] transition-colors hover:border-brand-teal"
                >
                  End Session
                </button>
              )}

              <button
                type="button"
                onClick={micEnabled ? stopMic : startMic}
                disabled={state !== 'connected'}
                className="px-5 py-3 border border-[#395359] bg-[#11272c] text-[10px] uppercase tracking-[0.24em] text-[#d0ddde] transition-colors disabled:opacity-45 hover:border-brand-teal"
              >
                {micEnabled ? 'Pause Voice Channel' : 'Enable Voice Channel'}
              </button>

              <button
                type="button"
                onClick={cameraEnabled ? stopCamera : startCamera}
                disabled={state !== 'connected'}
                className="px-5 py-3 border border-[#395359] bg-[#11272c] text-[10px] uppercase tracking-[0.24em] text-[#d0ddde] transition-colors disabled:opacity-45 hover:border-brand-teal"
              >
                {cameraEnabled ? 'Pause Visual Context' : 'Add Visual Context'}
              </button>
            </div>

            <div className="text-[10px] uppercase tracking-[0.2em] text-[#7f9599]">
              This is a guided live scene. Speak like you are briefing a trusted operator.
            </div>
          </div>

          <div className="space-y-3">
            <div className="border border-[#274148] bg-[#0d2025] p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#8ea3a7]">Session Mood</div>
              <div className="mt-2 text-sm leading-relaxed text-[#d0ddde]">
                {state === 'connected'
                  ? 'Live and adaptive. Keep speaking to shape how your suite responds.'
                  : 'Standby. Enter the studio when you are ready to shape your next move.'}
              </div>
            </div>
            <div className="border border-[#274148] bg-[#0d2025] p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#8ea3a7]">Conversation Memory</div>
              <div className="mt-2 text-sm leading-relaxed text-[#d0ddde]">
                Transcript is intentionally hidden in this view to keep focus on presence and flow.
              </div>
            </div>
            {error && (
              <div className="border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200 leading-relaxed">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[#1c343a] pt-4">
          <button
            type="button"
            onClick={() => setShowProTools((prev) => !prev)}
            className="text-[10px] uppercase tracking-[0.24em] text-[#9bb1b4] hover:text-brand-teal transition-colors"
          >
            {showProTools ? 'Hide Studio Controls' : 'Reveal Studio Controls'}
          </button>

          {showProTools && (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 border border-[#254149] bg-[#0b1e23] p-4 animate-[fadeIn_300ms_ease-out]">
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#8ea3a7]">Realtime Metrics</div>
                <div className="text-xs text-[#bfcfd1]">Model: {tokenInfo?.model ?? 'not connected'}</div>
                <div className="text-xs text-[#bfcfd1]">Voice: {tokenInfo?.voice_name ?? 'n/a'}</div>
                <div className="text-xs text-[#bfcfd1]">Latency: {latencyMs ? `${latencyMs} ms` : 'n/a'}</div>
                <div className="text-xs text-[#bfcfd1]">Token expiry: {tokenInfo?.expires_at ?? 'n/a'}</div>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#8ea3a7]">Guided Prompt Relay</div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask for positioning, rehearsal, or your next high-leverage move..."
                  className="w-full min-h-20 border border-[#385257] bg-[#10272c] text-[#d7e3e4] focus:border-brand-teal outline-none p-3 text-sm leading-relaxed"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={sendPrompt}
                    disabled={state !== 'connected' || sending || !prompt.trim()}
                    className="px-4 py-2 btn-brand text-[10px] uppercase tracking-[0.22em] disabled:opacity-40"
                  >
                    {sending ? 'Sending…' : 'Send Guided Turn'}
                  </button>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#7f9599]">
                    Transcript available below for review only
                  </div>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-xs text-[#b6c8ca] leading-relaxed min-h-14 max-h-40 overflow-auto border border-[#254149] bg-[#07171b] p-3">
                  {transcript || 'Waiting for model output...'}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
