export type Role = 'user' | 'assistant' | 'system';

export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface Message {
  id: string;
  role: Role;
  content: string | MessageContent[];
  timestamp: Date;
  model?: string;
  images?: string[];
  isStreaming?: boolean;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
    totalTime?: number;
  };
}

export type ConversationTag = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  model: string;
  pinned?: boolean;
  tag?: ConversationTag;
}

export interface GroqModel {
  id: string;
  name: string;
  contextWindow: number;
  supportsVision: boolean;
  description: string;
  badge?: string;
}

export interface ChatRequest {
  messages: {
    role: Role;
    content: string | MessageContent[];
  }[];
  model: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface AppSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  streamingEnabled: boolean;
  language: string;
  darkMode: boolean;
}

export interface PromptItem {
  id: string;
  name: string;
  prompt: string;
}
