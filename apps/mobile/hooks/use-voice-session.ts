import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Platform } from 'react-native';
import { Buffer } from 'buffer';
import type { MicrophoneDataEvent, VolumeLevelEvent } from '@speechmatics/expo-two-way-audio';

import { apiPost } from '@/lib/api';
import { API_BASE_URL } from '@/lib/env';

export type VoiceState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'processing'
  | 'tool'
  | 'speaking'
  | 'reconnecting'
  | 'error';

type VoiceSessionResponse = {
  voiceSessionId: string;
  ticket: string;
  websocketPath: string;
  expiresAt: string;
  reconnectGraceSeconds: number;
};

export type VoiceTurnSummary = {
  userTranscript: string;
  assistantTranscript: string;
  toolsUsed: string[];
};

export type PendingVoiceAction = {
  id: string;
  toolName: 'turnPumpOn' | 'turnPumpOff';
  confirmationMessage: string;
};

type UseVoiceSessionOptions = {
  token?: string | null;
  focusFarmPlotId?: string | null;
  focusCropSeasonId?: string | null;
  preferredLanguage?: string | null;
  onTurnSummary?: (summary: VoiceTurnSummary) => void;
};

type NativeAudioModule = typeof import('@speechmatics/expo-two-way-audio');

type ServerEvent =
  | { event: 'session.ready'; data: { state: VoiceState } }
  | { event: 'state.update'; data: { state: VoiceState; message?: string } }
  | { event: 'transcript.input'; data: { text: string; final: boolean } }
  | { event: 'transcript.output'; data: { text: string; final: boolean } }
  | { event: 'audio.output'; data: { audio: string; sampleRate: number; interrupt?: boolean } }
  | {
      event: 'tool.status';
      data: { toolName: string; status: string; message?: string };
    }
  | {
      event: 'action.confirmation_required';
      data: { action: PendingVoiceAction; message: string };
    }
  | { event: 'turn.summary'; data: VoiceTurnSummary }
  | { event: 'session.error'; data: { code: string; message: string } }
  | { event: 'session.closed'; data: { reason: string } };

export function useVoiceSession({
  token,
  focusFarmPlotId,
  focusCropSeasonId,
  preferredLanguage,
  onTurnSummary,
}: UseVoiceSessionOptions) {
  const [state, setState] = useState<VoiceState>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(Platform.OS !== 'web');
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inputTranscript, setInputTranscript] = useState('');
  const [outputTranscript, setOutputTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [toolsInUse, setToolsInUse] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingVoiceAction | null>(null);
  const [conversationLog, setConversationLog] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const voiceSessionIdRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const recordingRef = useRef(false);
  const playbackQueueRef = useRef<Array<{ audio: string; sampleRate: number }>>([]);
  const playbackRunningRef = useRef(false);
  const onTurnSummaryRef = useRef(onTurnSummary);
  const nativeAudioRef = useRef<NativeAudioModule | null>(null);

  const MAX_RECONNECT_ATTEMPTS = 3;

  const cleanupSocket = useCallback((disableReconnect = true) => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const socket = wsRef.current;
    if (!socket) {
      return;
    }

    if (disableReconnect) {
      shouldReconnectRef.current = false;
    }

    socket.onclose = null;
    socket.onerror = null;
    socket.onmessage = null;
    socket.onopen = null;
    socket.close();
    wsRef.current = null;
  }, []);

  useEffect(() => {
    onTurnSummaryRef.current = onTurnSummary;
  }, [onTurnSummary]);

  useEffect(() => {
    let mounted = true;

    const setupAudio = async () => {
      try {
        if (Platform.OS === 'web') {
          setIsVoiceSupported(false);
          return;
        }

        const nativeAudio = loadNativeAudioModule();
        if (!nativeAudio) {
          throw new Error('Native voice module is unavailable.');
        }

        nativeAudioRef.current = nativeAudio;
        await nativeAudio.initialize();
        const microphoneSubscription = nativeAudio.addExpoTwoWayAudioEventListener(
          'onMicrophoneData',
          (event: MicrophoneDataEvent) => {
            if (!recordingRef.current || wsRef.current?.readyState !== WebSocket.OPEN) {
              return;
            }

            const audio = Buffer.from(event.data).toString('base64');
            wsRef.current.send(
              JSON.stringify({
                event: 'input.audio',
                data: { audio },
              }),
            );
          },
        );
        const inputLevelSubscription = nativeAudio.addExpoTwoWayAudioEventListener(
          'onInputVolumeLevelData',
          (event: VolumeLevelEvent) => {
            setAudioLevel(event.data);
          },
        );
        const outputLevelSubscription = nativeAudio.addExpoTwoWayAudioEventListener(
          'onOutputVolumeLevelData',
          (event: VolumeLevelEvent) => {
            if (!recordingRef.current) {
              setAudioLevel(event.data);
            }
          },
        );
        const permission = await nativeAudio.getMicrophonePermissionsAsync();
        if (mounted) {
          setPermissionStatus(permission.status);
        }

        return () => {
          microphoneSubscription.remove();
          inputLevelSubscription.remove();
          outputLevelSubscription.remove();
        };
      } catch {
        if (mounted) {
          setIsVoiceSupported(false);
          setPermissionStatus('unsupported');
        }
      }
    };

    let cleanupAudioListeners: (() => void) | undefined;
    void setupAudio().then((cleanup) => {
      if (!mounted) {
        cleanup?.();
        return;
      }
      cleanupAudioListeners = cleanup;
    });

    return () => {
      mounted = false;
      cleanupAudioListeners?.();
      cleanupSocket(true);
      toggleNativeRecording(nativeAudioRef.current, false);
      tearDownSafe(nativeAudioRef.current);
    };
  }, [cleanupSocket]);

  const createBackendSession = useCallback(async () => {
    if (!token) {
      throw new Error('Please log in again to use voice.');
    }

    const session = await apiPost<VoiceSessionResponse>(
      '/assistant/voice/sessions',
      {
        focusFarmPlotId: focusFarmPlotId ?? undefined,
        focusCropSeasonId: focusCropSeasonId ?? undefined,
        preferredLanguage: preferredLanguage === 'hi' ? 'hi' : 'en',
        resumeSessionId: voiceSessionIdRef.current ?? undefined,
      },
      token,
    );

    voiceSessionIdRef.current = session.voiceSessionId;
    return session;
  }, [focusCropSeasonId, focusFarmPlotId, preferredLanguage, token]);

  const connectSocket = useCallback(async () => {
    cleanupSocket(false);
    setErrorMessage(null);
    setState(voiceSessionIdRef.current ? 'reconnecting' : 'connecting');

    const session = await createBackendSession();
    const ws = new WebSocket(buildWebSocketUrl(session.websocketPath));
    wsRef.current = ws;
    shouldReconnectRef.current = true;

    ws.onopen = () => {
      setState('connecting');
    };

    ws.onmessage = (message) => {
      try {
        handleServerEvent(JSON.parse(String(message.data)) as ServerEvent);
      } catch {
        setErrorMessage('Voice response could not be read.');
      }
    };

    ws.onerror = () => {
      setErrorMessage('Voice connection failed.');
      setState('error');
    };

    ws.onclose = () => {
      if (wsRef.current && wsRef.current !== ws) {
        return;
      }

      wsRef.current = null;
      toggleNativeRecording(nativeAudioRef.current, false);
      setIsRecording(false);

      if (!shouldReconnectRef.current) {
        setState('idle');
        return;
      }

      reconnectAttemptsRef.current += 1;
      if (reconnectAttemptsRef.current > MAX_RECONNECT_ATTEMPTS) {
        shouldReconnectRef.current = false;
        reconnectAttemptsRef.current = 0;
        setState('error');
        setErrorMessage('Voice connection lost. Please try again.');
        return;
      }

      setState('reconnecting');
      const backoffMs = Math.min(900 * Math.pow(2, reconnectAttemptsRef.current - 1), 8000);
      reconnectTimerRef.current = setTimeout(() => {
        connectSocket().catch((error) => {
          setState('error');
          setErrorMessage(
            error instanceof Error ? error.message : 'Could not reconnect voice.',
          );
        });
      }, backoffMs);
    };
  }, [cleanupSocket, createBackendSession]);

  const startRecording = useCallback(async () => {
    if (!isVoiceSupported || !token) {
      setErrorMessage('Voice is available only in a signed-in custom mobile build.');
      return;
    }

    reconnectAttemptsRef.current = 0;

    try {
      const permission =
        permissionStatus === 'granted'
          ? await nativeAudioRef.current?.getMicrophonePermissionsAsync()
          : await nativeAudioRef.current?.requestMicrophonePermissionsAsync();

      if (!permission) {
        throw new Error('Native voice module is unavailable.');
      }

      setPermissionStatus(permission.status);
      if (permission.status !== 'granted') {
        setErrorMessage('Microphone permission is needed for voice chat.');
        setState('error');
        return;
      }

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        await connectSocket();
        await waitForSocketOpen(wsRef);
      }

      playbackQueueRef.current = [];
      await interruptPlayback(nativeAudioRef.current);
      toggleNativeRecording(nativeAudioRef.current, true);
      recordingRef.current = true;
      setIsRecording(true);
      setInputTranscript('');
      setOutputTranscript('');
      setState('listening');
    } catch (error) {
      setState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Could not start voice.');
      toggleNativeRecording(nativeAudioRef.current, false);
      setIsRecording(false);
    }
  }, [connectSocket, isVoiceSupported, permissionStatus, token]);

  const stopRecording = useCallback(() => {
    shouldReconnectRef.current = false;
    wsRef.current?.send(JSON.stringify({ event: 'session.end' }));
    cleanupSocket(true);
    playbackQueueRef.current = [];
    void interruptPlayback(nativeAudioRef.current);
    toggleNativeRecording(nativeAudioRef.current, false);
    recordingRef.current = false;
    setIsRecording(false);
    setPendingAction(null);
    setToolsInUse([]);
    setConversationLog([]);
    setInputTranscript('');
    setOutputTranscript('');
    setState('idle');
  }, [cleanupSocket]);

  const endSession = useCallback(() => {
    shouldReconnectRef.current = false;
    wsRef.current?.send(JSON.stringify({ event: 'session.end' }));
    cleanupSocket(true);
    toggleNativeRecording(nativeAudioRef.current, false);
    setIsRecording(false);
    setPendingAction(null);
    setToolsInUse([]);
    setState('idle');
  }, [cleanupSocket]);

  const confirmAction = useCallback(() => {
    if (!pendingAction) {
      return;
    }

    wsRef.current?.send(
      JSON.stringify({
        event: 'action.confirm',
        data: { actionId: pendingAction.id },
      }),
    );
    setPendingAction(null);
    setState('tool');
  }, [pendingAction]);

  const cancelAction = useCallback(() => {
    if (!pendingAction) {
      return;
    }

    wsRef.current?.send(
      JSON.stringify({
        event: 'action.cancel',
        data: { actionId: pendingAction.id },
      }),
    );
    setPendingAction(null);
  }, [pendingAction]);

  const handleServerEvent = (event: ServerEvent) => {
    switch (event.event) {
      case 'session.ready':
        reconnectAttemptsRef.current = 0;
        setState(event.data.state);
        return;
      case 'state.update':
        setState(event.data.state);
        return;
      case 'transcript.input':
        setInputTranscript(event.data.text);
        return;
      case 'transcript.output':
        setOutputTranscript(event.data.text);
        return;
      case 'audio.output':
        if (event.data.interrupt) {
          playbackQueueRef.current = [];
          void interruptPlayback(nativeAudioRef.current);
          setState('listening');
          setOutputTranscript('');
          return;
        }
        playbackQueueRef.current.push({
          audio: event.data.audio,
          sampleRate: event.data.sampleRate,
        });
        void drainPlaybackQueue();
        setState('speaking');
        return;
      case 'tool.status':
        setToolsInUse((current) =>
          event.data.status === 'completed' ||
          event.data.status === 'failed' ||
          event.data.status === 'cancelled'
            ? current.filter((name) => name !== event.data.toolName)
            : Array.from(new Set([...current, event.data.toolName])),
        );
        setState((current) =>
          event.data.status === 'requires_confirmation' ? 'tool' : current,
        );
        return;
      case 'action.confirmation_required':
        setPendingAction(event.data.action);
        setState('tool');
        return;
      case 'turn.summary':
        onTurnSummaryRef.current?.(event.data);
        setToolsInUse([]);
        setPendingAction(null);
        // Save completed turn to conversation log
        setInputTranscript((prevInput) => {
          if (prevInput) {
            setConversationLog((log) => [...log, { role: 'user', text: prevInput }]);
          }
          return '';
        });
        setOutputTranscript((prevOutput) => {
          if (prevOutput) {
            setConversationLog((log) => [...log, { role: 'ai', text: prevOutput }]);
          }
          return '';
        });
        // Auto-resume microphone for continuous conversation
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          toggleNativeRecording(nativeAudioRef.current, true);
          recordingRef.current = true;
          setIsRecording(true);
          setState('listening');
        }
        return;
      case 'session.error':
        setErrorMessage(event.data.message);
        setState('error');
        return;
      case 'session.closed':
        shouldReconnectRef.current = false;
        cleanupSocket(true);
        setState('idle');
        return;
    }
  };

  const drainPlaybackQueue = async () => {
    if (playbackRunningRef.current) {
      return;
    }

    playbackRunningRef.current = true;
    try {
      while (playbackQueueRef.current.length > 0) {
        const chunk = playbackQueueRef.current.shift();
        if (!chunk) {
          continue;
        }

        const pcm = base64PcmToUint8Array(chunk.audio, chunk.sampleRate);
        nativeAudioRef.current?.playPCMData(pcm);
      }
    } finally {
      playbackRunningRef.current = false;
    }
  };

  return {
    state,
    isRecording,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    isProcessing: state === 'processing' || state === 'tool' || state === 'connecting',
    isSpeaking: state === 'speaking',
    isVoiceSupported,
    permissionStatus,
    errorMessage,
    inputTranscript,
    outputTranscript,
    audioLevel,
    toolsInUse,
    pendingAction,
    conversationLog,
    startRecording,
    stopRecording,
    endSession,
    confirmAction,
    cancelAction,
    reconnect: connectSocket,
  };
}

function buildWebSocketUrl(path: string) {
  const baseUrl = API_BASE_URL.replace(/\/v1\/?$/, '');
  return `${baseUrl.replace(/^http/, 'ws')}${path}`;
}

function loadNativeAudioModule(): NativeAudioModule | null {
  try {
    return require('@speechmatics/expo-two-way-audio') as NativeAudioModule;
  } catch {
    return null;
  }
}

function toggleNativeRecording(nativeAudio: NativeAudioModule | null, value: boolean) {
  try {
    nativeAudio?.toggleRecording(value);
  } catch {
    // The native module throws in unsupported runtimes; the hook surfaces that as unsupported.
  }
}

function waitForSocketOpen(socketRef: RefObject<WebSocket | null>) {
  return new Promise<void>((resolve, reject) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => reject(new Error('Voice socket did not open.')), 5000);
    const previousOpen = socket.onopen;
    const previousError = socket.onerror;

    socket.onopen = (event) => {
      clearTimeout(timeout);
      previousOpen?.call(socket, event);
      resolve();
    };

    socket.onerror = (event) => {
      clearTimeout(timeout);
      previousError?.call(socket, event);
      reject(new Error('Voice socket failed to open.'));
    };
  });
}

async function tearDownSafe(nativeAudio: NativeAudioModule | null) {
  try {
    nativeAudio?.tearDown();
  } catch {
    // no-op
  }
}

async function interruptPlayback(nativeAudio: NativeAudioModule | null) {
  try {
    nativeAudio?.restart();
  } catch {
    // no-op
  }
}

function base64PcmToUint8Array(base64: string, sampleRate: number) {
  const input = new Uint8Array(Buffer.from(base64, 'base64'));
  if (sampleRate === 16000 || input.length < 4) {
    return input;
  }

  return resamplePcm16Le(input, sampleRate, 16000);
}

function resamplePcm16Le(input: Uint8Array, fromRate: number, toRate: number) {
  const inputView = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const inputSamples = Math.floor(input.byteLength / 2);
  const outputSamples = Math.max(1, Math.floor((inputSamples * toRate) / fromRate));
  const output = new Uint8Array(outputSamples * 2);
  const outputView = new DataView(output.buffer);

  for (let i = 0; i < outputSamples; i += 1) {
    const sourceIndex = (i * fromRate) / toRate;
    const left = Math.min(inputSamples - 1, Math.floor(sourceIndex));
    const right = Math.min(inputSamples - 1, left + 1);
    const fraction = sourceIndex - left;
    const leftValue = inputView.getInt16(left * 2, true);
    const rightValue = inputView.getInt16(right * 2, true);
    const value = Math.round(leftValue + (rightValue - leftValue) * fraction);
    outputView.setInt16(i * 2, value, true);
  }

  return output;
}
