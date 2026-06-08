'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Sidebar from '@/components/Sidebar';
import MessageBubble from '@/components/MessageBubble';
import ChatInput from '@/components/ChatInput';
import SettingsModal from '@/components/SettingsModal';
import WelcomeScreen from '@/components/WelcomeScreen';
import { Conversation, ConversationTag, Message, MessageContent, AppSettings, Role } from '@/types';
import { DEFAULT_SETTINGS, generateTitle, getModelById, GROQ_MODELS } from '@/lib/utils';
import { Menu, X, ChevronDown, Cpu } from 'lucide-react';

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

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

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeId]);

  const activeConv = conversations.find((c) => c.id === activeId) ?? null;

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
        const lines = chunk.split('\n').filter((l) => l.trim());

        for (const line of lines) {
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
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || '';
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

      // Mark streaming done
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, isStreaming: false } : m
                ),
              }
            : c
        )
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          content:
                            '⚠️ Error: Could not get a response. Check your API key and try again.',
                          isStreaming: false,
                        }
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
        ...images.map(
          (url) => ({ type: 'image_url' as const, image_url: { url } } as MessageContent)
        ),
      ];
    } else {
      userContent = text;
    }

    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content: userContent,
      timestamp: new Date(),
      images,
    };

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
    const apiMessages = [...conv.messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    await executeAPICall(convId, apiMessages, assistantMsg.id);
  };

  const handleEdit = async (msgId: string, newText: string) => {
    if (!activeId || isStreaming) return;

    const conv = conversations.find((c) => c.id === activeId);
    if (!conv) return;

    const msgIndex = conv.messages.findIndex((m) => m.id === msgId);
    if (msgIndex === -1) return;

    const updatedMsg: Message = {
      ...conv.messages[msgIndex],
      content: newText,
      images: undefined,
    };

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
      prev.map((c) =>
        c.id === activeId
          ? { ...c, messages: [...messagesUpToEdit, assistantMsg], updatedAt: new Date() }
          : c
      )
    );

    const apiMessages = messagesUpToEdit.map((m) => ({ role: m.role, content: m.content }));
    await executeAPICall(activeId, apiMessages, assistantMsg.id);
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
      prev.map((c) =>
        c.id === activeId
          ? { ...c, messages: [...messagesBefore, assistantMsg], updatedAt: new Date() }
          : c
      )
    );

    const apiMessages = messagesBefore.map((m) => ({ role: m.role, content: m.content }));
    await executeAPICall(activeId, apiMessages, assistantMsg.id);
  };

  const stopStreaming = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setConversations((prev) =>
      prev.map((c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.isStreaming ? { ...m, isStreaming: false } : m
        ),
      }))
    );
  };

  const currentModel = getModelById(settings.model);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
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
          onSelect={(id) => {
            setActiveId(id);
            setMobileSidebarOpen(false);
          }}
          onDelete={deleteConversation}
          onPin={pinConversation}
          onTag={tagConversation}
          onSettings={() => {
            setShowSettings(true);
            setMobileSidebarOpen(false);
          }}
        />
      </div>

      {/* Main chat area */}
      <main className="flex flex-col flex-1 min-w-0 h-full">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 md:hidden transition-colors"
            >
              {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {activeConv ? (
              <h1 className="text-base font-semibold text-gray-800 truncate max-w-[200px] md:max-w-xs">
                {activeConv.title}
              </h1>
            ) : (
              <h1 className="text-base font-semibold text-gray-800">New Chat</h1>
            )}
          </div>

          {/* Model picker */}
          <div className="relative">
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-indigo-700 bg-gray-100 hover:bg-indigo-50 rounded-xl border border-gray-200 hover:border-indigo-200 transition-all"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:block">{currentModel?.name ?? settings.model}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showModelPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowModelPicker(false)} />
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-gray-200 shadow-xl z-20 overflow-hidden">
                  <p className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Select Model
                  </p>
                  <div className="max-h-80 overflow-y-auto scrollbar-thin">
                    {GROQ_MODELS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSettings((p) => ({ ...p, model: model.id }));
                          setShowModelPicker(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors flex items-start justify-between gap-2 ${
                          settings.model === model.id ? 'bg-indigo-50' : ''
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{model.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{model.description}</p>
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                          {model.badge}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {!activeConv || activeConv.messages.length === 0 ? (
            <WelcomeScreen
              onPrompt={(p) => handleSend(p)}
              modelName={currentModel?.name ?? 'Groq AI'}
            />
          ) : (
            <div className="max-w-3xl mx-auto py-4">
              {activeConv.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onEdit={
                    msg.role === 'user' && !isStreaming
                      ? (newText) => handleEdit(msg.id, newText)
                      : undefined
                  }
                  onRegenerate={
                    msg.role === 'assistant' && !msg.isStreaming && !isStreaming
                      ? () => handleRegenerate(msg.id)
                      : undefined
                  }
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 shrink-0">
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
        <SettingsModal
          settings={settings}
          onSave={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
