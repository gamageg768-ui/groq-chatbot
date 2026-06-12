'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Sidebar from '@/components/Sidebar';
import MessageBubble from '@/components/MessageBubble';
import ChatInput from '@/components/ChatInput';
import SettingsModal from '@/components/SettingsModal';
import WelcomeScreen from '@/components/WelcomeScreen';
import {
  Conversation,
  ConversationTag,
  Message,
  MessageContent,
  AppSettings,
  Role,
} from '@/types';
import {
  DEFAULT_SETTINGS,
  generateTitle,
  getModelById,
  GROQ_MODELS,
  getContextUsagePercent,
  exportConversation,
  copyConversationToClipboard,
  getMessageText,
} from '@/lib/utils';
import {
  Menu,
  X,
  ChevronDown,
  Cpu,
  Moon,
  Sun,
  Copy,
  Check,
  Download,
  Sparkles,
  Loader2,
} from 'lucide-react';

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copiedConv, setCopiedConv] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summarizing, setSummarizing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('groqchat_convs');
      const savedSettings = localStorage.getItem('groqchat_settings');
      if (saved) {
        const parsed = JSON.parse(saved) as Conversation[];
        setConversations(parsed);
        if (parsed.length > 0) setActiveId(parsed[0].id);
      }
      if (savedSettings) setSettings(JSON.parse(savedSettings));
    } catch {}
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('groqchat_convs', JSON.stringify(conversations));
    }
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('groqchat_settings', JSON.stringify(settings));
  }, [settings]);

  // Sync dark mode class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
  }, [settings.darkMode]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeId]);

  const activeConv = conversations.find((c) => c.id === activeId) ?? null;
  const currentModel = getModelById(settings.model);
  const contextPercent =
    activeConv && currentModel
      ? getContextUsagePercent(activeConv, currentModel.contextWindow)
      : 0;

  const createConversation = useCallback(() => {
    const id = uuidv4();
    const conv: Conversation = {
      id,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      model: settings.model,
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(id);
    setMobileSidebarOpen(false);
  }, [settings.model]);

  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const pinConversation = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  };

  const tagConversation = (id: string, tag: ConversationTag | undefined) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, tag } : c))
    );
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'k') { e.preventDefault(); createConversation(); }
      if (mod && e.key === ',') { e.preventDefault(); setShowSettings(true); }
      if (e.key === 'Escape' && isStreaming) stopStreaming();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [createConversation, isStreaming]);

  // Helper: read stream and return accumulated text (non-state)
  const fetchCompletion = async (
    messages: { role: Role; content: string }[],
    systemPrompt: string
  ): Promise<string> => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        model: 'llama-3.1-8b-instant',
        temperature: 0.3,
        max_tokens: 512,
        systemPrompt,
      }),
    });
    if (!res.ok) throw new Error('Failed');
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value, { stream: true }).split('\n').filter((l) => l.trim())) {
        if (line.startsWith('data: ')) {
          const d = line.slice(6);
          if (d === '[DONE]' || d.startsWith('[USAGE]')) continue;
          try { result += JSON.parse(d).choices?.[0]?.delta?.content || ''; } catch {}
        }
      }
    }
    return result;
  };

  const executeAPICall = async (
    convId: string,
    apiMessages: { role: Role; content: string | MessageContent[] }[],
    assistantMsgId: string
  ) => {
    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          messages: apiMessages,
          model: settings.model,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
          systemPrompt: settings.systemPrompt,
          language: settings.language,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n').filter((l) => l.trim())) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            if (data.startsWith('[USAGE] ')) {
              try {
                const usage = JSON.parse(data.slice(8));
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === convId
                      ? {
                          ...c,
                          messages: c.messages.map((m) =>
                            m.id === assistantMsgId
                              ? {
                                  ...m,
                                  tokens: {
                                    prompt: usage.prompt_tokens,
                                    completion: usage.completion_tokens,
                                    total: usage.total_tokens,
                                    totalTime: usage.total_time,
                                  },
                                }
                              : m
                          ),
                        }
                      : c
                  )
                );
              } catch {}
              continue;
            }
            try {
              const delta = JSON.parse(data).choices?.[0]?.delta?.content || '';
              if (delta) {
                accumulated += delta;
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === convId
                      ? {
                          ...c,
                          messages: c.messages.map((m) =>
                            m.id === assistantMsgId ? { ...m, content: accumulated } : m
                          ),
                        }
                      : c
                  )
                );
              }
            } catch {}
          }
        }
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, messages: c.messages.map((m) => (m.id === assistantMsgId ? { ...m, isStreaming: false } : m)) }
            : c
        )
      );

      // Auto-generate title on first exchange
      if (apiMessages.length === 1 && accumulated) {
        const userText =
          typeof apiMessages[0].content === 'string'
            ? apiMessages[0].content
            : (apiMessages[0].content as MessageContent[])
                .filter((c) => c.type === 'text')
                .map((c) => c.text || '')
                .join('');
        if (userText) {
          fetch('/api/title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userMessage: userText.slice(0, 300), assistantMessage: accumulated.slice(0, 300) }),
          })
            .then((r) => (r.ok ? r.json() : { title: '' }))
            .then(({ title }) => {
              if (title) setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, title } : c)));
            })
            .catch(() => {});
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: '⚠️ Error: Could not get a response. Check your API key and try again.', isStreaming: false }
                      : m
                  ),
                }
              : c
          )
        );
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSend = async (text: string, images?: string[]) => {
    if (!text.trim() && !images?.length) return;

    let convId = activeId;
    if (!convId) {
      const id = uuidv4();
      const conv: Conversation = {
        id,
        title: generateTitle(text),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        model: settings.model,
      };
      setConversations((prev) => [conv, ...prev]);
      setActiveId(id);
      convId = id;
    }

    let userContent: string | MessageContent[];
    if (images && images.length > 0) {
      userContent = [
        { type: 'text', text } as MessageContent,
        ...images.map((url) => ({ type: 'image_url' as const, image_url: { url } } as MessageContent)),
      ];
    } else {
      userContent = text;
    }

    const userMsg: Message = { id: uuidv4(), role: 'user', content: userContent, timestamp: new Date(), images };
    const assistantMsg: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      model: settings.model,
      isStreaming: true,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: [...c.messages, userMsg, assistantMsg],
              updatedAt: new Date(),
              title: c.messages.length === 0 ? generateTitle(text || 'Image') : c.title,
            }
          : c
      )
    );

    const conv = conversations.find((c) => c.id === convId) ?? { messages: [] as Message[] };
    const apiMessages = [...conv.messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
    await executeAPICall(convId, apiMessages, assistantMsg.id);
  };

  const handleEdit = async (msgId: string, newText: string) => {
    if (!activeId || isStreaming) return;
    const conv = conversations.find((c) => c.id === activeId);
    if (!conv) return;
    const msgIndex = conv.messages.findIndex((m) => m.id === msgId);
    if (msgIndex === -1) return;

    const updatedMsg: Message = { ...conv.messages[msgIndex], content: newText, images: undefined };
    const assistantMsg: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      model: settings.model,
      isStreaming: true,
    };
    const messagesUpToEdit = [...conv.messages.slice(0, msgIndex), updatedMsg];

    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, messages: [...messagesUpToEdit, assistantMsg], updatedAt: new Date() } : c))
    );
    await executeAPICall(activeId, messagesUpToEdit.map((m) => ({ role: m.role, content: m.content })), assistantMsg.id);
  };

  const handleRegenerate = async (msgId: string) => {
    if (!activeId || isStreaming) return;
    const conv = conversations.find((c) => c.id === activeId);
    if (!conv) return;
    const msgIndex = conv.messages.findIndex((m) => m.id === msgId);
    if (msgIndex === -1) return;

    const assistantMsg: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      model: settings.model,
      isStreaming: true,
    };
    const messagesBefore = conv.messages.slice(0, msgIndex);

    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, messages: [...messagesBefore, assistantMsg], updatedAt: new Date() } : c))
    );
    await executeAPICall(activeId, messagesBefore.map((m) => ({ role: m.role, content: m.content })), assistantMsg.id);
  };

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setConversations((prev) =>
      prev.map((c) => ({
        ...c,
        messages: c.messages.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
      }))
    );
  }, []);

  const handleCopyConversation = async () => {
    if (!activeConv) return;
    await copyConversationToClipboard(activeConv);
    setCopiedConv(true);
    setTimeout(() => setCopiedConv(false), 2000);
  };

  const handleSummarize = async () => {
    if (!activeConv || summarizing) return;
    setSummarizing(true);
    setShowSummary(true);
    setSummaryText('');
    try {
      const msgs = activeConv.messages.map((m) => ({ role: m.role as Role, content: getMessageText(m) }));
      const summary = await fetchCompletion(
        msgs,
        'Summarize this conversation in 5-7 concise bullet points. Focus on key topics, decisions, and outcomes.'
      );
      setSummaryText(summary || 'No summary available.');
    } catch {
      setSummaryText('Failed to generate summary.');
    }
    setSummarizing(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:relative z-30 h-full transition-transform duration-300 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onNew={createConversation}
          onSelect={(id) => { setActiveId(id); setMobileSidebarOpen(false); }}
          onDelete={deleteConversation}
          onPin={pinConversation}
          onTag={tagConversation}
          onSettings={() => { setShowSettings(true); setMobileSidebarOpen(false); }}
        />
      </div>

      {/* Main */}
      <main className="flex flex-col flex-1 min-w-0 h-full">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 md:hidden transition-colors"
            >
              {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[150px] md:max-w-xs">
              {activeConv?.title ?? 'New Chat'}
            </h1>
            {/* Context warning */}
            {contextPercent >= 70 && (
              <span
                className={`hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium ${
                  contextPercent >= 90
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                }`}
              >
                {contextPercent}% ctx
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Conversation actions */}
            {activeConv && activeConv.messages.length > 0 && (
              <>
                {/* Summarize */}
                <button
                  onClick={handleSummarize}
                  disabled={summarizing || isStreaming}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title="Summarize conversation (AI)"
                >
                  <Sparkles className="w-4 h-4" />
                </button>

                {/* Copy */}
                <button
                  onClick={handleCopyConversation}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  title="Copy conversation"
                >
                  {copiedConv ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>

                {/* Export dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu((s) => !s)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    title="Export conversation"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {showExportMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 overflow-hidden w-36">
                        {(['md', 'txt', 'json'] as const).map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() => {
                              exportConversation(activeConv, fmt);
                              setShowExportMenu(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                          >
                            Export .{fmt}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Dark mode toggle */}
            <button
              onClick={() => setSettings((p) => ({ ...p, darkMode: !p.darkMode }))}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 transition-colors"
              title={settings.darkMode ? 'Light mode' : 'Dark mode'}
            >
              {settings.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Model picker */}
            <div className="relative ml-1">
              <button
                onClick={() => setShowModelPicker(!showModelPicker)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-700 dark:hover:text-indigo-400 bg-gray-100 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-200 transition-all"
              >
                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:block">{currentModel?.name ?? settings.model}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showModelPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowModelPicker(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl z-20 overflow-hidden">
                    <p className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                      Select Model
                    </p>
                    <div className="max-h-80 overflow-y-auto scrollbar-thin">
                      {GROQ_MODELS.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => { setSettings((p) => ({ ...p, model: model.id })); setShowModelPicker(false); }}
                          className={`w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors flex items-start justify-between gap-2 ${
                            settings.model === model.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{model.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{model.description}</p>
                          </div>
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                            {model.badge}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {!activeConv || activeConv.messages.length === 0 ? (
            <WelcomeScreen onPrompt={(p) => handleSend(p)} modelName={currentModel?.name ?? 'Groq AI'} />
          ) : (
            <div className="max-w-3xl mx-auto py-4">
              {activeConv.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onEdit={msg.role === 'user' && !isStreaming ? (t) => handleEdit(msg.id, t) : undefined}
                  onRegenerate={msg.role === 'assistant' && !msg.isStreaming && !isStreaming ? () => handleRegenerate(msg.id) : undefined}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <div className="max-w-3xl mx-auto">
            <ChatInput
              onSend={handleSend}
              disabled={false}
              isStreaming={isStreaming}
              onStop={stopStreaming}
              supportsVision={currentModel?.supportsVision ?? false}
            />
          </div>
        </div>
      </main>

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal settings={settings} onSave={setSettings} onClose={() => setShowSettings(false)} />
      )}

      {/* Summary modal */}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-gray-200 dark:border-gray-700 animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Conversation Summary
              </h3>
              <button
                onClick={() => setShowSummary(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 max-h-80 overflow-y-auto scrollbar-thin">
              {summarizing ? (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Generating summary...</span>
                </div>
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {summaryText}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
