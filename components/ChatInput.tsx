'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Send,
  Image as ImageIcon,
  X,
  Mic,
  Square,
  Paperclip,
  Loader2,
} from 'lucide-react';
import { cn, fileToBase64, formatFileSize } from '@/lib/utils';

interface ChatInputProps {
  onSend: (text: string, images?: string[]) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  supportsVision?: boolean;
}

export default function ChatInput({
  onSend,
  disabled,
  isStreaming,
  onStop,
  supportsVision = true,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<{ url: string; name: string; size: number }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && images.length === 0) return;
    onSend(trimmed, images.map((i) => i.url));
    setText('');
    setImages([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const addImages = async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    const newImages = await Promise.all(
      imageFiles.slice(0, 4 - images.length).map(async (f) => ({
        url: await fileToBase64(f),
        name: f.name,
        size: f.size,
      }))
    );
    setImages((prev) => [...prev, ...newImages]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await addImages(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      await addImages(Array.from(e.dataTransfer.files));
    },
    [images]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleVoice = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        // In a real app, you'd send this to Whisper/transcription API
        setText((prev) => prev + ' [Voice input]');
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      alert('Microphone permission denied');
    }
  };

  const canSend = (text.trim() || images.length > 0) && !disabled;

  return (
    <div className="px-4 pb-4 pt-2">
      {/* Image previews */}
      {images.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <img
                src={img.url}
                alt={img.name}
                className="w-16 h-16 rounded-xl object-cover border border-gray-200 shadow-sm"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 rounded-b-xl truncate">
                {formatFileSize(img.size)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'flex items-end gap-2 bg-white border rounded-2xl px-4 py-3 shadow-sm transition-all',
          isDragging
            ? 'border-indigo-400 bg-indigo-50 shadow-indigo-100'
            : 'border-gray-300 hover:border-gray-400 focus-within:border-indigo-400 focus-within:shadow-indigo-100',
          disabled && 'opacity-60 pointer-events-none'
        )}
      >
        {/* Image upload */}
        {supportsVision && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors shrink-0"
              title="Attach image"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Text area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={
            isDragging
              ? 'Drop images here...'
              : supportsVision
              ? 'Message GroqChat... (supports images)'
              : 'Message GroqChat...'
          }
          className="flex-1 resize-none outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent min-h-[24px] max-h-[200px] leading-relaxed scrollbar-thin"
          rows={1}
          disabled={disabled}
        />

        {/* Voice button */}
        <button
          onClick={handleVoice}
          className={cn(
            'p-1.5 rounded-lg transition-colors shrink-0',
            isRecording
              ? 'text-red-500 bg-red-50 animate-pulse'
              : 'text-gray-400 hover:text-indigo-500 hover:bg-indigo-50'
          )}
          title={isRecording ? 'Stop recording' : 'Voice input'}
        >
          <Mic className="w-5 h-5" />
        </button>

        {/* Send / Stop button */}
        {isStreaming ? (
          <button
            onClick={onStop}
            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors shrink-0"
            title="Stop generating"
          >
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              'p-2 rounded-xl transition-all shrink-0',
              canSend
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-indigo-200'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            )}
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 mt-2">
        Powered by{' '}
        <span className="font-medium text-indigo-500">Groq AI</span> · Shift+Enter for new line
      </p>
    </div>
  );
}
