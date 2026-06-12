'use client';

import { useState } from 'react';
import { X, Key, Cpu, Thermometer, Hash, MessageSquare, Save, Layout, Globe } from 'lucide-react';
import { AppSettings } from '@/types';
import { GROQ_MODELS, cn } from '@/lib/utils';

const SYSTEM_TEMPLATES = [
  {
    name: 'Default Assistant',
    prompt:
      'You are a helpful, harmless, and honest AI assistant. You can analyze images, write code, answer questions, and help with a wide range of tasks. Format your responses using markdown when appropriate.',
  },
  {
    name: 'Coding Assistant',
    prompt:
      'You are an expert software engineer. Help with code, debug issues, explain concepts, and write clean, efficient solutions. Always use proper code blocks with language identifiers.',
  },
  {
    name: 'Academic Writer',
    prompt:
      'You are an academic writing assistant. Help with essays, research, citations, and clear scholarly communication. Maintain a formal, precise tone.',
  },
  {
    name: 'Data Analyst',
    prompt:
      'You are a data analyst expert. Help interpret data, suggest visualizations, write SQL/Python analysis code, and explain statistical concepts clearly.',
  },
  {
    name: 'Creative Writer',
    prompt:
      'You are a creative writing assistant. Help with stories, scripts, poetry, and creative content. Be imaginative, descriptive, and engaging.',
  },
  {
    name: 'Translator',
    prompt:
      'You are a professional translator. Provide accurate, natural-sounding translations. Note any cultural nuances or ambiguities when relevant.',
  },
  {
    name: 'Patient Tutor',
    prompt:
      "You are a patient and encouraging tutor. Explain concepts clearly, use examples, ask clarifying questions, and adapt your explanations to the learner's level.",
  },
  {
    name: 'Executive Assistant',
    prompt:
      'You are an efficient executive assistant. Help draft emails, create summaries, organize information, and communicate professionally and concisely.',
  },
];

const LANGUAGES = [
  { code: '', label: 'Auto (same as input)' },
  { code: 'English', label: 'English' },
  { code: 'Spanish', label: 'Español' },
  { code: 'French', label: 'Français' },
  { code: 'German', label: 'Deutsch' },
  { code: 'Chinese', label: '中文' },
  { code: 'Japanese', label: '日本語' },
  { code: 'Korean', label: '한국어' },
  { code: 'Arabic', label: 'العربية' },
  { code: 'Portuguese', label: 'Português' },
  { code: 'Hindi', label: 'हिन्दी' },
  { code: 'Italian', label: 'Italiano' },
  { code: 'Russian', label: 'Русский' },
];

interface SettingsModalProps {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
  const [local, setLocal] = useState<AppSettings>({ ...settings });
  const [apiKey, setApiKey] = useState('');
  const [activeTab, setActiveTab] = useState<'model' | 'system' | 'templates' | 'advanced'>('model');

  const handleSave = () => {
    if (apiKey) sessionStorage.setItem('groq_api_key_override', apiKey);
    onSave(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-gray-200 dark:border-gray-700 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 px-4 overflow-x-auto">
          {(['model', 'system', 'templates', 'advanced'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-3 text-sm font-medium capitalize border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto scrollbar-thin">
          {activeTab === 'model' && (
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-3">
                <Cpu className="w-4 h-4 text-indigo-500" />
                AI Model
              </label>
              <div className="grid gap-2">
                {GROQ_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setLocal((p) => ({ ...p, model: model.id }))}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl border-2 transition-all',
                      local.model === model.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{model.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{model.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {model.badge && (
                          <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                            {model.badge}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {(model.contextWindow / 1000).toFixed(0)}K ctx
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-4">
              {/* Response Language */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-indigo-500" />
                  Response Language
                </label>
                <select
                  value={local.language}
                  onChange={(e) => setLocal((p) => ({ ...p, language: e.target.value }))}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-400 bg-white dark:bg-gray-700"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* System Prompt */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  System Prompt
                </label>
                <textarea
                  value={local.systemPrompt}
                  onChange={(e) => setLocal((p) => ({ ...p, systemPrompt: e.target.value }))}
                  rows={7}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-indigo-400 resize-none scrollbar-thin bg-white dark:bg-gray-700"
                  placeholder="Enter a system prompt..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  Sets the AI's personality. Use the Templates tab for presets.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-3">
                <Layout className="w-4 h-4 text-indigo-500" />
                System Prompt Templates
              </label>
              <div className="space-y-2">
                {SYSTEM_TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => {
                      setLocal((p) => ({ ...p, systemPrompt: t.prompt }));
                      setActiveTab('system');
                    }}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl border-2 transition-all',
                      local.systemPrompt === t.prompt
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-indigo-200 dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    )}
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2">{t.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <>
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-indigo-500" />
                  Groq API Key (optional override)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-indigo-400 bg-white dark:bg-gray-700"
                  placeholder="gsk_... (leave empty to use server key)"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-2">
                  <Thermometer className="w-4 h-4 text-indigo-500" />
                  Temperature: {local.temperature}
                </label>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={local.temperature}
                  onChange={(e) =>
                    setLocal((p) => ({ ...p, temperature: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Precise (0)</span>
                  <span>Balanced (1)</span>
                  <span>Creative (2)</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-2">
                  <Hash className="w-4 h-4 text-indigo-500" />
                  Max Tokens: {local.maxTokens}
                </label>
                <input
                  type="range"
                  min={256}
                  max={8192}
                  step={256}
                  value={local.maxTokens}
                  onChange={(e) =>
                    setLocal((p) => ({ ...p, maxTokens: parseInt(e.target.value) }))
                  }
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>256</span>
                  <span>4096</span>
                  <span>8192</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Streaming</p>
                  <p className="text-xs text-gray-400">Show responses word by word</p>
                </div>
                <button
                  onClick={() => setLocal((p) => ({ ...p, streamingEnabled: !p.streamingEnabled }))}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors relative',
                    local.streamingEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                      local.streamingEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-xl transition-colors font-medium shadow-sm"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
