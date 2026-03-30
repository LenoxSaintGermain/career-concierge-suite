import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { createElevenLabsSession } from '../services/voiceApi';
import { useGhostVoice, type GhostCallbacks } from '../hooks/useGhostVoice';
import { GhostActionFeed } from './GhostActionFeed';

type GhostRuntimeState = 'idle' | 'connecting' | 'connected' | 'error';

type GhostMessage = {
  id: string;
  role: 'user' | 'agent';
  message: string;
};

const withFallback = (value: unknown, fallback: string) => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

function GhostSdkSurface({
  agentId,
  userUid,
  sessionContext,
  ghostCallbacks,
  onStateChange,
  interactionLocked,
  lockedMessage,
}: {
  agentId: string;
  userUid?: string;
  sessionContext?: string;
  ghostCallbacks: GhostCallbacks;
  onStateChange?: (state: GhostRuntimeState) => void;
  interactionLocked?: boolean;
  lockedMessage?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<GhostMessage[]>([]);
  const [transport, setTransport] = useState<'signed' | 'public-fallback' | null>(null);
  const contextSentRef = useRef('');

  const { clientTools, actionLog } = useGhostVoice(ghostCallbacks);
  const {
    startSession,
    endSession,
    sendContextualUpdate,
    status,
    mode,
  } = useConversation({
    clientTools,
    onConnect: () => {
      setError(null);
    },
    onDisconnect: () => {
      contextSentRef.current = '';
    },
    onError: (message) => {
      setError(withFallback(message, 'Ghost session failed.'));
    },
    onMessage: ({ role, message }) => {
      const cleaned = String(message ?? '').trim();
      if (!cleaned || (role !== 'user' && role !== 'agent')) return;
      setMessages((prev) => [{ id: `${role}-${Date.now()}-${prev.length}`, role, message: cleaned }, ...prev].slice(0, 6));
    },
  });

  const mappedState: GhostRuntimeState =
    status === 'connected'
      ? 'connected'
      : status === 'connecting'
        ? 'connecting'
        : error
          ? 'error'
          : 'idle';

  useEffect(() => {
    onStateChange?.(mappedState);
  }, [mappedState, onStateChange]);

  useEffect(() => {
    if (status !== 'connected') return;
    const payload = String(sessionContext ?? '').trim();
    if (!payload || payload === contextSentRef.current) return;
    sendContextualUpdate(payload);
    contextSentRef.current = payload;
  }, [sendContextualUpdate, sessionContext, status]);

  useEffect(() => {
    if (!interactionLocked || status !== 'connected') return;
    endSession();
  }, [endSession, interactionLocked, status]);

  const beginSession = useCallback(async () => {
    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('Microphone access is required.');
      return;
    }

    const baseOptions = {
      userId: userUid,
      dynamicVariables: userUid ? { uid: userUid } : undefined,
    };

    try {
      const session = await createElevenLabsSession();
      setTransport('signed');
      startSession({
        signedUrl: session.signed_url,
        ...baseOptions,
      });
      return;
    } catch (sessionError: any) {
      if (!agentId) {
        setError(sessionError?.message ?? 'Unable to create session.');
        return;
      }
      setTransport('public-fallback');
      startSession({
        agentId,
        ...baseOptions,
      });
    }
  }, [agentId, startSession, userUid]);

  const statusLabel =
    status === 'connected'
      ? mode === 'speaking'
        ? 'Speaking'
        : 'Listening'
      : status === 'connecting'
        ? 'Connecting...'
        : 'Ready';

  return (
    <div className="relative">
      {interactionLocked ? (
        <div className="border border-white/10 bg-white/5 px-3 py-3 text-xs leading-relaxed text-white/70">
          {lockedMessage || 'Donna has stepped out while the suite processes your intake.'}
        </div>
      ) : null}

      {/* Controls row */}
      <div className={`flex items-center gap-3 ${interactionLocked ? 'mt-3 opacity-55' : ''}`}>
        {status === 'connected' ? (
          <button
            type="button"
            onClick={() => endSession()}
            disabled={interactionLocked}
            className="border border-white/20 px-3 py-1.5 font-intake-mono text-[9px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-red-400/50 hover:text-red-300"
          >
            End Session
          </button>
        ) : (
          <button
            type="button"
            onClick={beginSession}
            disabled={interactionLocked}
            className="border border-[var(--intake-teal)] bg-[var(--intake-teal)]/15 px-4 py-1.5 font-intake-mono text-[9px] uppercase tracking-[0.14em] text-[var(--intake-teal-light)] transition-colors hover:bg-[var(--intake-teal)]/25"
          >
            Talk to Donna
          </button>
        )}

        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              status === 'connected'
                ? mode === 'speaking'
                  ? 'bg-[var(--intake-teal)] animate-pulse'
                  : 'bg-[var(--intake-teal)]'
                : 'bg-white/30'
            }`}
          />
          <span className="font-intake-mono text-[8px] uppercase tracking-[0.14em] text-white/50">
            {statusLabel}
          </span>
          {transport ? (
            <span className="font-intake-mono text-[8px] uppercase tracking-[0.1em] text-white/30">
              {transport === 'signed' ? 'signed' : 'public'}
            </span>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mt-2 text-[10px] text-amber-300/80">{error}</div>
      ) : null}

      {/* Transcript — only when connected and has messages */}
      {status === 'connected' && messages.length > 0 ? (
        <div className="mt-2 flex flex-col gap-1 max-h-[120px] overflow-y-auto">
          {messages.slice(0, 4).map((entry) => (
            <div
              key={entry.id}
              className={`px-2 py-1 text-xs leading-snug ${
                entry.role === 'agent'
                  ? 'bg-white/5 text-white/70'
                  : 'bg-[var(--intake-teal)]/8 text-[var(--intake-teal-light)]/80'
              }`}
            >
              <span className="font-intake-mono text-[7px] uppercase tracking-[0.12em] text-white/30 mr-1.5">
                {entry.role === 'agent' ? 'Donna' : 'You'}
              </span>
              {entry.message}
            </div>
          ))}
        </div>
      ) : null}

      <GhostActionFeed actions={actionLog} />
    </div>
  );
}

export function ElevenLabsConvaiPanel({
  agentId,
  userUid,
  sessionContext,
  ghostCallbacks,
  onStateChange,
  interactionLocked,
  lockedMessage,
}: {
  agentId: string;
  userUid?: string;
  sessionContext?: string;
  ghostCallbacks?: GhostCallbacks;
  onStateChange?: (state: GhostRuntimeState) => void;
  interactionLocked?: boolean;
  lockedMessage?: string;
}) {
  const defaultCallbacks: GhostCallbacks = useMemo(
    () => ({
      onNavigateModule: (target) => `Navigation requested for ${target}.`,
      onCloseModule: () => 'Overlay close requested.',
      onToggleAdmin: () => 'Admin toggle requested.',
      onDispatchAgent: (codename) => `Dispatch requested for ${codename}.`,
      onUpdateStance: (stance) => `Stance update requested: ${stance}.`,
      onAddressGap: (gapId) => `Gap update requested for ${gapId}.`,
      onFocusIntakeField: (fieldId) => `Focus requested for ${fieldId}.`,
      onJumpIntakeScreen: (screenId) => `Screen jump requested for ${screenId}.`,
      onSetIntakeTextField: (fieldId, value) => `Text requested for ${fieldId}: ${value}.`,
      onSetIntakeChoiceField: (fieldId, value) => `Choice requested for ${fieldId}: ${value}.`,
      onSetIntakeMultiField: (fieldId, values) => `Multi-select requested for ${fieldId}: ${values.join(', ')}.`,
      onSetIntakeBooleanField: (fieldId, value) => `Boolean requested for ${fieldId}: ${String(value)}.`,
      onClearIntakeField: (fieldId) => `Clear requested for ${fieldId}.`,
      onSetIntentRoute: (intent) => `Intent change requested: ${intent}.`,
      onSetSupportPreference: (preference, value) => `${preference} preference change requested: ${value}.`,
      onSummarizeIntakeState: () => 'No intake summary is connected yet.',
    }),
    [],
  );

  return (
    <ConversationProvider>
      <GhostSdkSurface
        agentId={agentId}
        userUid={userUid}
        sessionContext={sessionContext}
        ghostCallbacks={ghostCallbacks || defaultCallbacks}
        onStateChange={onStateChange}
        interactionLocked={interactionLocked}
        lockedMessage={lockedMessage}
      />
    </ConversationProvider>
  );
}
