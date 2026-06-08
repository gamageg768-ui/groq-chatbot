import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GroqModel } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const GROQ_MODELS: GroqModel[] = [
  {
    id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    name: 'Llama 4 Scout',
    contextWindow: 131072,
    supportsVision: true,
    description: 'Meta Llama 4 Scout — vision + text, 128K ctx',
    badge: '👁️ Vision',
  },
  {
    id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    name: 'Llama 4 Maverick',
    contextWindow: 131072,
    supportsVision: true,
    description: 'Meta Llama 4 Maverick — powerful vision model',
    badge: '🔥 Fast',
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    contextWindow: 128000,
    supportsVision: false,
    description: 'Most capable text model, great for complex tasks',
    badge: '⚡ Smart',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B',
    contextWindow: 128000,
    supportsVision: false,
    description: 'Ultra-fast, great for quick responses',
    badge: '🚀 Fastest',
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma 2 9B',
    contextWindow: 8192,
    supportsVision: false,
    description: "Google's Gemma 2 instruction-tuned",
    badge: '💎 Google',
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    contextWindow: 32768,
    supportsVision: false,
    description: 'Mixture of experts, balanced performance',
    badge: '🎯 Balanced',
  },
];

export function getModelById(id: string): GroqModel | undefined {
  return GROQ_MODELS.find((m) => m.id === id);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function generateTitle(content: string): string {
  const text = typeof content === 'string' ? content : 'Image conversation';
  return truncateText(text.replace(/\n/g, ' ').trim(), 50) || 'New Chat';
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export const DEFAULT_SETTINGS = {
  model: 'meta-llama/llama-4-scout-17b-16e-instruct',
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt:
    'You are a helpful, harmless, and honest AI assistant. You can analyze images, write code, answer questions, and help with a wide range of tasks. Format your responses using markdown when appropriate.',
  streamingEnabled: true,
};
