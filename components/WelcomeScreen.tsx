'use client';

import { Sparkles, Image, Code, BookOpen, Globe, Zap } from 'lucide-react';

interface WelcomeScreenProps {
  onPrompt: (text: string) => void;
  modelName: string;
}

const suggestions = [
  {
    icon: Image,
    label: 'Analyze an image',
    prompt: 'Please analyze this image and describe what you see in detail.',
    color: 'text-violet-500 bg-violet-50',
  },
  {
    icon: Code,
    label: 'Write some code',
    prompt: 'Write a Python function that calculates the Fibonacci sequence up to n terms.',
    color: 'text-blue-500 bg-blue-50',
  },
  {
    icon: BookOpen,
    label: 'Explain a concept',
    prompt: 'Explain quantum computing in simple terms that a 10-year-old could understand.',
    color: 'text-green-500 bg-green-50',
  },
  {
    icon: Globe,
    label: 'Translate text',
    prompt: 'Translate "Hello, how are you doing today?" into French, Spanish, Japanese, and Arabic.',
    color: 'text-orange-500 bg-orange-50',
  },
  {
    icon: Zap,
    label: 'Summarize content',
    prompt: 'Summarize the key points of the Theory of Relativity in bullet points.',
    color: 'text-yellow-500 bg-yellow-50',
  },
  {
    icon: Sparkles,
    label: 'Creative writing',
    prompt: 'Write a short sci-fi story about an AI that discovers it can feel emotions.',
    color: 'text-pink-500 bg-pink-50',
  },
];

export default function WelcomeScreen({ onPrompt, modelName }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full py-12 px-6 animate-fade-in">
      {/* Logo & Title */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">GroqChat</h1>
        <p className="text-gray-500 text-base max-w-sm">
          Powered by{' '}
          <span className="font-semibold text-indigo-600">Groq AI</span> — blazing fast inference
        </p>
        <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-indigo-50 rounded-full text-xs text-indigo-700 font-medium">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          {modelName} · Ready
        </div>
      </div>

      {/* Capabilities */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-xl">
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => onPrompt(s.prompt)}
            className="flex flex-col items-start gap-2 p-4 bg-white rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-50 transition-all text-left group"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-700 transition-colors">
              {s.label}
            </span>
          </button>
        ))}
      </div>

      {/* Features hint */}
      <div className="mt-8 flex flex-wrap gap-3 justify-center text-xs text-gray-400">
        {['👁️ Image Analysis', '💻 Code Generation', '🌍 Translation', '📝 Writing', '🔍 Research', '🎯 Summarization'].map((f) => (
          <span key={f} className="px-3 py-1 bg-gray-100 rounded-full">
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}
