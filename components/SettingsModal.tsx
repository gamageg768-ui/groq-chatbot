'use client';

import { useState } from 'react';
import { X, Key, Cpu, Thermometer, Hash, MessageSquare, Save } from 'lucide-react';
import { AppSettings, GroqModel } from '@/types';
import { GROQ_MODELS, cn } from '@/lib/utils';

interface SettingsModalProps {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
  const [local, setLocal] = useState<AppSettings>({ ...settings });
  const [apiKey, setApiKey] = useState('');
  const [activeTab, setActiveTab] = useState<'model' | 'system' | 'advanced'>('model');

  const handleSave = () => {
    if (apiKey) {
      // Store in sessionStorage for use in subsequent requests
      sessionStorage.setItem('groq_api_key_override', apiKey);
    }
    onSave(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-gray-200 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {(['model', 'system', 'advanced'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto scrollbar-thin">
          {activeTab === 'model' && (
            <>
              {/* Model selection */}
              <div>
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
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
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{model.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{model.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {model.badge && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
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
            </>
          )}

          {activeTab === 'system' && (
            <div>
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                System Prompt
              </label>
              <textarea
                value={local.systemPrompt}
                onChange={(e) => setLocal((p) => ({ ...p, systemPrompt: e.target.value }))}
                rows={8}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400 resize-none scrollbar-thin"
                placeholder="Enter a system prompt to guide the AI's behavior..."
              />
              <p className="text-xs text-gray-400 mt-1">
                This message sets the AI's personality and behavior for the conversation.
              </p>
            </div>
          )}

          {activeTab === 'advanced' && (
            <>
              {/* API Key */}
              <div>
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-indigo-500" />
                  Groq API Key (optional override)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400"
                  placeholder="gsk_... (leave empty to use server key)"
                />
              </div>

              {/* Temperature */}
              <div>
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
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

              {/* Max tokens */}
              <div>
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
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

              {/* Streaming toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Streaming</p>
                  <p className="text-xs text-gray-400">Show responses word by word</p>
                </div>
                <button
                  onClick={() => setLocal((p) => ({ ...p, streamingEnabled: !p.streamingEnabled }))}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors relative',
                    local.streamingEnabled ? 'bg-indigo-600' : 'bg-gray-300'
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
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-200 transition-colors font-medium"
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
