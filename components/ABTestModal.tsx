'use client';

import { useState, useRef } from 'react';
import { X, Send, FlaskConical } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AppSettings } from '@/types';

interface ABTestModalProps {
  settings: AppSettings;
  onClose: () => void;
}

interface StreamState {
  text: string;
  isStreaming: boolean;
  error: boolean;
}

const INITIAL: StreamState = { text: '', isStreaming: false, error: false };

async function streamResponse(
  systemPrompt: string,
  userMessage: string,
  settings: AppSettings,
  signal: AbortSignal,
  onChunk: (text: string) => void,
  onDone: (error?: boolean) => void
) {
  try {
    const apiKeyOverride = sessionStorage.getItem('groq_api_key_override') || undefined;
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        messages: [{ role: 'user', content: userMessage }],
        model: settings.model,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        systemPrompt,
        streamingEnabled: true,
        apiKeyOverride,
      }),
    });
    if (!res.ok) { onDone(true); return; }
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value, { stream: true }).split('\n').filter((l) => l.trim())) {
        if (!line.startsWith('data: ')) continue;
        const d = line.slice(6);
        if (d === '[DONE]' || d.startsWith('[USAGE]')) continue;
        try {
          const delta = JSON.parse(d).choices?.[0]?.delta?.content || '';
          if (delta) { accumulated += delta; onChunk(accumulated); }
        } catch {}
      }
    }
    onDone();
  } catch (e: any) {
    if (e.name !== 'AbortError') onDone(true);
  }
}

export default function ABTestModal({ settings, onClose }: ABTestModalProps) {
  const [promptA, setPromptA] = useState(settings.systemPrompt);
  const [promptB, setPromptB] = useState('');
  const [userMessage, setUserMessage] = useState('');
  const [stateA, setStateA] = useState<StreamState>(INITIAL);
  const [stateB, setStateB] = useState<StreamState>(INITIAL);
  const abortA = useRef<AbortController | null>(null);
  const abortB = useRef<AbortController | null>(null);

  const isRunning = stateA.isStreaming || stateB.isStreaming;

  const handleTest = () => {
    if (!userMessage.trim() || isRunning) return;
    abortA.current?.abort();
    abortB.current?.abort();
    abortA.current = new AbortController();
    abortB.current = new AbortController();

    setStateA({ text: '', isStreaming: true, error: false });
    setStateB({ text: '', isStreaming: true, error: false });

    streamResponse(
      promptA, userMessage, settings, abortA.current.signal,
      (text) => setStateA((p) => ({ ...p, text })),
      (error) => setStateA((p) => ({ ...p, isStreaming: false, error: !!error }))
    );
    streamResponse(
      promptB, userMessage, settings, abortB.current.signal,
      (text) => setStateB((p) => ({ ...p, text })),
      (error) => setStateB((p) => ({ ...p, isStreaming: false, error: !!error }))
    );
  };

  const cols = [
    { state: stateA, label: 'A', prompt: promptA, setPrompt: setPromptA },
    { state: stateB, label: 'B', prompt: promptB, setPrompt: setPromptB },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 animate-slide-up"
        style={{ height: '92vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm">
            <FlaskConical className="w-4 h-4 text-indigo-500" />
            Prompt A/B Test
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* System prompts */}
        <div className="grid grid-cols-2 gap-4 px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          {cols.map(({ label, prompt, setPrompt }) => (
            <div key={label}>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">
                System Prompt {label}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isRunning}
                rows={4}
                placeholder={label === 'A' ? 'Your current system prompt…' : 'Alternative system prompt to test…'}
                className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:border-indigo-400 resize-none scrollbar-thin"
              />
            </div>
          ))}
        </div>

        {/* Responses */}
        <div className="flex-1 grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700 overflow-hidden min-h-0">
          {cols.map(({ state, label }) => (
            <div key={label} className="flex flex-col overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 shrink-0">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Response {label}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
                {state.error ? (
                  <p className="text-sm text-red-500">⚠️ Failed to get response.</p>
                ) : state.text ? (
                  <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{state.text}</ReactMarkdown>
                  </div>
                ) : state.isStreaming ? (
                  <div className="flex gap-1 pt-1">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse-dot"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Response will appear here</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex gap-3">
            <textarea
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTest();
                }
              }}
              placeholder="Enter a test message to send to both prompts…"
              rows={2}
              disabled={isRunning}
              className="flex-1 text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:border-indigo-400 resize-none scrollbar-thin"
            />
            <button
              onClick={handleTest}
              disabled={!userMessage.trim() || isRunning}
              className="px-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white rounded-xl transition-colors shrink-0 flex items-center gap-2 text-sm font-medium"
            >
              <Send className="w-4 h-4" />
              Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
