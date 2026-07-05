import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, MessageCircle, Pause, Power, Send, Volume2 } from 'lucide-react';
import { API_BASE } from '@/api/context/apiClient';

type ChatMode = 'text' | 'voice';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatVisitor = {
  id: number;
  external_user_id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

type ChatResponse = {
  answer: string;
  api_key_id: number;
  conversation_id: number;
  display_name?: string | null;
  avatar_url?: string | null;
  welcome_message?: string | null;
  visitor?: ChatVisitor | null;
};

const DEFAULT_VOICE = 'marin';
const VISITOR_STORAGE_PREFIX = 'botapi_widget_visitor_';

function initialMessage(welcomeMessage?: string | null): ChatMessage {
  return {
    role: 'assistant',
    content: welcomeMessage || 'Hi! How can I help you today?',
  };
}

function createVisitorId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `visitor_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getStoredVisitorId(apiKey: string) {
  const storageKey = `${VISITOR_STORAGE_PREFIX}${apiKey.slice(-12)}`;
  const existing = localStorage.getItem(storageKey);

  if (existing) return existing;

  const created = createVisitorId();
  localStorage.setItem(storageKey, created);
  return created;
}

function getSupportedRecordingMimeType() {
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function filenameForMimeType(mimeType: string) {
  if (mimeType.includes('mp4')) return 'voice.mp4';
  return 'voice.webm';
}

export default function WidgetChatPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const apiKey = params.get('api_key')?.trim() || '';
  const externalUserId = useMemo(() => {
    const explicitId = params.get('external_user_id')?.trim();

    if (explicitId) return explicitId;
    if (!apiKey) return 'anonymous';

    return getStoredVisitorId(apiKey);
  }, [apiKey, params]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingMimeTypeRef = useRef('audio/webm');

  const [chatMode, setChatMode] = useState<ChatMode>('text');
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage()]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [autoSpeaking, setAutoSpeaking] = useState(false);
  const [displayName, setDisplayName] = useState('Chat');
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [visitor, setVisitor] = useState<ChatVisitor | null>(null);

  useEffect(() => {
    return () => {
      stopMicMeter();

      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();

    const message = input.trim();
    if (!message) return;

    await sendTextMessage(message);
  }

  async function sendTextMessage(message: string) {
    if (!message || !apiKey || sending) return;

    setMessages((current) => [...current, { role: 'user', content: message }]);
    setInput('');

    try {
      setSending(true);

      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          message,
          external_user_id: externalUserId,
          conversation_id: conversationId ? String(conversationId) : null,
        }),
      });

      const data = (await response.json().catch(() => null)) as ChatResponse | { detail?: string } | null;

      if (!response.ok) {
        const detail = data && 'detail' in data ? data.detail : 'Chat request failed';
        throw new Error(detail || 'Chat request failed');
      }

      const chatData = data as ChatResponse;
      const answer = chatData.answer || 'I could not generate a response.';

      setConversationId(chatData.conversation_id);

      if (chatData.display_name) {
        setDisplayName(chatData.display_name);
      }

      if (chatData.welcome_message) {
        setWelcomeMessage(chatData.welcome_message);
      }

      if (chatData.visitor) {
        setVisitor(chatData.visitor);
      }

      setMessages((current) => [...current, { role: 'assistant', content: answer }]);

      if (chatMode === 'voice') {
        await playTextAudio(answer, null);
      }
    } catch (err) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Failed to send message.',
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function startMicMeter(stream: MediaStream) {
    const AudioContextClass =
      window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteTimeDomainData(dataArray);

      let sum = 0;

      for (let index = 0; index < dataArray.length; index += 1) {
        const normalized = (dataArray[index] - 128) / 128;
        sum += normalized * normalized;
      }

      const rms = Math.sqrt(sum / dataArray.length);
      setMicLevel(Math.min(100, Math.round(rms * 260)));

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    tick();
  }

  function stopMicMeter() {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setMicLevel(0);
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || recording || transcribing) return;

    const mimeType = getSupportedRecordingMimeType();

    if (!mimeType) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: 'This browser does not support a speech recording format that can be transcribed. Please try Chrome or Edge.',
        },
      ]);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });

      recordingMimeTypeRef.current = mimeType;
      streamRef.current = stream;
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      startMicMeter(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        transcribeRecording();
      };

      recorder.start();
      setRecording(true);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: 'Microphone access was not allowed.',
        },
      ]);
    }
  }

  function stopRecording() {
    if (!recording) return;

    mediaRecorderRef.current?.stop();
    setRecording(false);
    stopMicMeter();

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function transcribeRecording() {
    const audioBlob = new Blob(audioChunksRef.current, { type: recordingMimeTypeRef.current });

    if (!audioBlob.size) return;

    try {
      setTranscribing(true);

      const formData = new FormData();
      formData.append('api_key', apiKey);
      formData.append('file', audioBlob, filenameForMimeType(recordingMimeTypeRef.current));

      const response = await fetch(`${API_BASE}/voice/transcribe`, {
        method: 'POST',
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as { text?: string; detail?: string } | null;

      if (!response.ok) {
        throw new Error(data?.detail || 'Voice transcription failed');
      }

      const text = data?.text?.trim();

      if (text) {
        await sendTextMessage(text);
      }
    } catch (err) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Failed to transcribe voice.',
        },
      ]);
    } finally {
      setTranscribing(false);
      audioChunksRef.current = [];
    }
  }

  async function playTextAudio(text: string, index: number | null) {
    if (!text.trim() || autoSpeaking) return;

    try {
      setAutoSpeaking(true);
      setSpeakingIndex(index);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const response = await fetch(`${API_BASE}/voice/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, text, voice: DEFAULT_VOICE }),
      });

      if (!response.ok) {
        throw new Error('Speech generation failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setSpeakingIndex(null);
        setAutoSpeaking(false);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setSpeakingIndex(null);
        setAutoSpeaking(false);
      };

      await audio.play();
    } catch {
      setSpeakingIndex(null);
      setAutoSpeaking(false);
    }
  }

  async function playMessage(message: ChatMessage, index: number) {
    if (speakingIndex === index && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setSpeakingIndex(null);
      setAutoSpeaking(false);
      return;
    }

    await playTextAudio(message.content, index);
  }

  function endChat() {
    const confirmed = window.confirm('End this chat and start a new one?');
    if (!confirmed) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    stopMicMeter();

    setConversationId(null);
    setInput('');
    setSpeakingIndex(null);
    setAutoSpeaking(false);
    setMessages([initialMessage(welcomeMessage)]);
  }

  function changeMode(nextMode: ChatMode) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
    }

    setInput('');
    setSpeakingIndex(null);
    setAutoSpeaking(false);
    setChatMode(nextMode);
  }

  if (!apiKey) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm font-semibold text-slate-600 shadow-sm">
          Missing widget API key.
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-950 px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15">
            <MessageCircle size={18} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-black">{displayName}</div>
            <div className="text-xs text-white/70">
              {visitor?.name ? visitor.name : conversationId ? `Chat #${conversationId}` : 'New chat'}
              {autoSpeaking ? ' - Speaking' : ''}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="inline-flex h-9 items-center gap-2 px-3 text-xs font-bold text-white">
            <input
              type="checkbox"
              checked={chatMode === 'voice'}
              onChange={(event) => changeMode(event.target.checked ? 'voice' : 'text')}
              className="h-4 w-4 accent-blue-500"
            />
            Voice
          </label>

          {conversationId && (
            <button
              type="button"
              onClick={endChat}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              aria-label="End chat"
              title="End chat"
            >
              <Power size={16} />
            </button>
          )}
        </div>
      </header>

      <section className="flex-1 space-y-3 overflow-auto bg-slate-50 p-4">
        {messages.map((message, index) => {
          const isAssistant = message.role === 'assistant';

          return (
            <div
              key={`${message.role}-${index}`}
              className={`flex max-w-[85%] items-start gap-2 rounded-2xl p-3 text-sm leading-6 shadow-sm ${
                message.role === 'user'
                  ? 'ml-auto rounded-tr-md bg-blue-600 font-semibold text-white'
                  : 'rounded-tl-md bg-white text-slate-700'
              }`}
            >
              <div className="min-w-0 flex-1 whitespace-pre-wrap break-words">{message.content}</div>

              {isAssistant && (
                <button
                  type="button"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-blue-600 transition hover:bg-blue-50"
                  onClick={() => playMessage(message, index)}
                  aria-label={speakingIndex === index ? 'Stop response audio' : 'Play response audio'}
                  title={speakingIndex === index ? 'Stop audio' : 'Play audio'}
                >
                  {speakingIndex === index ? <Pause size={15} /> : <Volume2 size={15} />}
                </button>
              )}
            </div>
          );
        })}

        {sending && (
          <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white p-3 text-sm leading-6 text-slate-500 shadow-sm">
            Thinking...
          </div>
        )}
      </section>

      {recording && (
        <div className="border-t border-slate-200 bg-white px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="text-xs font-black uppercase tracking-wide text-red-600">Recording</div>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-red-600 transition-[width] duration-75"
                style={{ width: `${Math.max(8, micLevel)}%` }}
              />
            </div>
            <div className="w-10 text-right text-xs font-bold text-slate-500">{micLevel}%</div>
          </div>
        </div>
      )}

      {chatMode === 'text' ? (
        <form onSubmit={sendMessage} className="bg-white p-3">
          <div className="flex items-center gap-2">
            <button
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                recording ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-950 hover:bg-slate-800'
              }`}
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={sending || transcribing || autoSpeaking}
              aria-label={recording ? 'Stop recording' : 'Start voice input'}
              title={recording ? 'Stop recording' : 'Voice input'}
            >
              {recording ? <MicOff size={17} /> : <Mic size={17} />}
            </button>

            <input
              className="min-h-10 flex-1 rounded-full border border-slate-300 px-4 text-sm outline-none focus:border-blue-600"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={transcribing ? 'Transcribing voice...' : 'Type your message...'}
              disabled={sending || transcribing}
            />

            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={sending || transcribing || !input.trim()}
              aria-label="Send message"
            >
              <Send size={17} />
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white p-3">
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={sending || transcribing || autoSpeaking}
            className={`flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              recording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {recording ? <MicOff size={20} /> : <Mic size={20} />}
            {recording
              ? 'Stop and Send'
              : transcribing
                ? 'Transcribing...'
                : sending
                  ? 'Thinking...'
                  : autoSpeaking
                    ? 'Speaking...'
                    : 'Speak Now'}
          </button>
        </div>
      )}
    </main>
  );
}