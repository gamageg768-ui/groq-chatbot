import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Conversation, GroqModel, Message } from '@/types';

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

export function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function getMessageText(message: Message): string {
  if (typeof message.content === 'string') return message.content;
  return message.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text || '')
    .join('');
}

export function estimateTokens(conv: Conversation): number {
  const totalChars = conv.messages.reduce((sum, m) => sum + getMessageText(m).length, 0);
  return Math.ceil(totalChars / 4);
}

export function getContextUsagePercent(conv: Conversation, contextWindow: number): number {
  if (!contextWindow) return 0;
  return Math.min(100, Math.round((estimateTokens(conv) / contextWindow) * 100));
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportConversation(conv: Conversation, format: 'md' | 'json' | 'txt'): void {
  const safeName = conv.title.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'conversation';

  if (format === 'json') {
    downloadFile(JSON.stringify(conv, null, 2), `${safeName}.json`, 'application/json');
    return;
  }

  if (format === 'txt') {
    const text = conv.messages
      .map((m) => `${m.role === 'user' ? 'You' : 'Assistant'}:\n${getMessageText(m)}`)
      .join('\n\n---\n\n');
    downloadFile(text, `${safeName}.txt`, 'text/plain');
    return;
  }

  const md = [
    `# ${conv.title}`,
    `*Exported ${new Date().toLocaleDateString()}*`,
    '',
    ...conv.messages.map((m) => {
      const label = m.role === 'user' ? '**You**' : '**GroqChat**';
      return `${label}\n\n${getMessageText(m)}`;
    }),
  ].join('\n\n');
  downloadFile(md, `${safeName}.md`, 'text/markdown');
}

export async function copyConversationToClipboard(conv: Conversation): Promise<void> {
  const text = conv.messages
    .map((m) => `${m.role === 'user' ? 'You' : 'Assistant'}: ${getMessageText(m)}`)
    .join('\n\n');
  await navigator.clipboard.writeText(text);
}

export const DEFAULT_SETTINGS = {
  model: 'meta-llama/llama-4-scout-17b-16e-instruct',
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt:
    'You are a helpful, harmless, and honest AI assistant. You can analyze images, write code, answer questions, and help with a wide range of tasks. Format your responses using markdown when appropriate.',
  streamingEnabled: true,
  language: '',
  darkMode: false,
};
