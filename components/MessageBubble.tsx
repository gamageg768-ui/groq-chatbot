'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Bot, User, Volume2, Pencil, RotateCcw } from 'lucide-react';
import { Message } from '@/types';
import { cn, formatDate, getModelById } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  onEdit?: (newText: string) => void;
  onRegenerate?: () => void;
}

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2">
        <span className="text-xs text-gray-400 font-mono font-medium">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneLight}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: '0.8rem',
          background: '#1f2937',
          color: '#e5e7eb',
        }}
        codeTagProps={{ style: { color: '#e5e7eb' } }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

export default function MessageBubble({ message, onEdit, onRegenerate }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const isUser = message.role === 'user';
  const model = message.model ? getModelById(message.model) : null;

  const getTextContent = (): string => {
    if (typeof message.content === 'string') return message.content;
    return message.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text || '')
      .join('');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getTextContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(getTextContent());
    window.speechSynthesis.speak(utterance);
  };

  const startEdit = () => {
    setEditText(getTextContent());
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (editText.trim() && onEdit) {
      onEdit(editText.trim());
    }
    setIsEditing(false);
  };

  const cancelEdit = () => setIsEditing(false);

  return (
    <div
      className={cn(
        'group flex gap-3 px-4 py-3 animate-slide-up',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
          isUser ? 'bg-indigo-600' : 'bg-white border-2 border-indigo-200'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-indigo-600" />
        )}
      </div>

      {/* Content */}
      <div className={cn('flex-1 min-w-0', isUser ? 'items-end flex flex-col' : '')}>
        {/* Role label */}
        <div
          className={cn(
            'flex items-center gap-2 mb-1',
            isUser ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <span className="text-xs font-semibold text-gray-500">
            {isUser ? 'You' : 'GroqChat'}
          </span>
          {model && !isUser && (
            <span className="text-xs text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">
              {model.name}
            </span>
          )}
          <span className="text-xs text-gray-300">{formatDate(message.timestamp)}</span>
        </div>

        {/* Images (user uploaded) */}
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 justify-end">
            {message.images.map((img, i) => (
              <div
                key={i}
                className="relative w-40 h-40 rounded-xl overflow-hidden border border-gray-200 shadow-sm"
              >
                <img src={img} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* Edit mode */}
        {isUser && isEditing ? (
          <div className="w-full max-w-[85%]">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                }
                if (e.key === 'Escape') cancelEdit();
              }}
              className="w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[80px]"
              autoFocus
            />
            <div className="flex gap-2 mt-2 justify-end">
              <button
                onClick={cancelEdit}
                className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-3 py-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                Save & Send
              </button>
            </div>
          </div>
        ) : (
          /* Message bubble */
          <div
            className={cn(
              'rounded-2xl px-4 py-3 max-w-[85%]',
              isUser
                ? 'bg-indigo-600 text-white rounded-tr-sm'
                : 'bg-white border border-gray-200 shadow-sm text-gray-800 rounded-tl-sm'
            )}
          >
            {message.isStreaming && !getTextContent() ? (
              <div className="flex gap-1 py-1">
                <span
                  className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse-dot"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse-dot"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse-dot"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            ) : isUser ? (
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-white">
                {getTextContent()}
              </p>
            ) : (
              <div className={cn('prose-chat', message.isStreaming && 'typing-cursor')}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const isBlock = match || String(children).includes('\n');
                      if (isBlock) {
                        return (
                          <CodeBlock className={className}>
                            {String(children).replace(/\n$/, '')}
                          </CodeBlock>
                        );
                      }
                      return (
                        <code
                          className="bg-gray-100 text-indigo-700 px-1.5 py-0.5 rounded text-xs font-mono"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {getTextContent()}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Token info (assistant only) */}
        {!isUser && !message.isStreaming && message.tokens && (
          <span className="text-xs text-gray-300 mt-1 block">
            {message.tokens.completion} tokens
            {message.tokens.totalTime !== undefined
              ? ` · ${message.tokens.totalTime.toFixed(2)}s`
              : ''}
          </span>
        )}

        {/* Action bar */}
        {!isEditing && (
          <div
            className={cn(
              'flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity',
              isUser ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            {!isUser && !message.isStreaming && getTextContent() && (
              <>
                <button
                  onClick={handleCopy}
                  className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
                  title="Copy"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                <button
                  onClick={handleSpeak}
                  className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
                  title="Read aloud"
                >
                  <Volume2 className="w-3 h-3" />
                </button>
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
                    title="Regenerate"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </>
            )}
            {isUser && onEdit && (
              <button
                onClick={startEdit}
                className="p-1 hover:bg-indigo-100 rounded text-indigo-300 hover:text-indigo-600 transition-colors"
                title="Edit message"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
