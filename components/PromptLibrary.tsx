'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, BookOpen, X, Check } from 'lucide-react';
import { PromptItem } from '@/types';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

const BUILTIN_PROMPTS: PromptItem[] = [
  { id: 'b1', name: 'Explain simply', prompt: 'Explain this in simple terms:' },
  { id: 'b2', name: 'Improve writing', prompt: 'Improve the clarity and quality of this text while keeping the same meaning:' },
  { id: 'b3', name: 'Debug code', prompt: 'Review this code for bugs, inefficiencies, and suggest improvements:' },
  { id: 'b4', name: 'Summarize', prompt: 'Provide a concise bullet-point summary of:' },
  { id: 'b5', name: 'Translate to English', prompt: 'Translate the following to English:' },
  { id: 'b6', name: 'Write unit tests', prompt: 'Write comprehensive unit tests for the following code:' },
  { id: 'b7', name: 'Pros and cons', prompt: 'List the pros and cons of:' },
  { id: 'b8', name: 'Step-by-step plan', prompt: 'Create a detailed step-by-step plan for:' },
];

interface PromptLibraryProps {
  onInsert: (prompt: string) => void;
  onClose: () => void;
}

export default function PromptLibrary({ onInsert, onClose }: PromptLibraryProps) {
  const [customPrompts, setCustomPrompts] = useState<PromptItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('groqchat_prompts');
      if (stored) setCustomPrompts(JSON.parse(stored));
    } catch {}
  }, []);

  const persistPrompts = (items: PromptItem[]) => {
    setCustomPrompts(items);
    localStorage.setItem('groqchat_prompts', JSON.stringify(items));
  };

  const addPrompt = () => {
    if (!newName.trim() || !newPrompt.trim()) return;
    persistPrompts([...customPrompts, { id: uuidv4(), name: newName.trim(), prompt: newPrompt.trim() }]);
    setNewName('');
    setNewPrompt('');
    setShowAdd(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const deletePrompt = (id: string) => persistPrompts(customPrompts.filter((p) => p.id !== id));

  const allPrompts = [...BUILTIN_PROMPTS, ...customPrompts];

  return (
    <div className="absolute bottom-full mb-2 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-30 overflow-hidden max-h-96 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Prompt Library</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAdd((s) => !s)}
            className="p-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors"
            title="Add prompt"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/20 space-y-2">
          <input
            type="text"
            placeholder="Prompt name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-400"
          />
          <textarea
            placeholder="Prompt text..."
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            rows={2}
            className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 resize-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-400"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAdd(false)}
              className="px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={addPrompt}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {saved ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              Save
            </button>
          </div>
        </div>
      )}

      {/* Prompt list */}
      <div className="overflow-y-auto flex-1 scrollbar-thin">
        {allPrompts.map((p) => (
          <div
            key={p.id}
            className="group flex items-center gap-2 px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0"
          >
            <div
              className="flex-1 min-w-0"
              onClick={() => {
                onInsert(p.prompt);
                onClose();
              }}
            >
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{p.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{p.prompt}</p>
            </div>
            {!p.id.startsWith('b') && (
              <button
                onClick={() => deletePrompt(p.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-gray-400 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
