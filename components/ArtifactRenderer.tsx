'use client';

import { useState } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface ArtifactRendererProps {
  code: string;
  language: string;
  onClose: () => void;
}

export default function ArtifactRenderer({ code, language, onClose }: ArtifactRendererProps) {
  const [fullscreen, setFullscreen] = useState(false);

  const srcDoc =
    language === 'svg'
      ? `<!DOCTYPE html><html><body style="margin:16px;background:#fff;display:flex;justify-content:center;align-items:center">${code}</body></html>`
      : language === 'css'
      ? `<!DOCTYPE html><html><head><style>${code}</style></head><body style="margin:16px;background:#fff"><p class="demo">CSS applied — add HTML to see full effect</p></body></html>`
      : code;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-200 ${
          fullscreen ? 'fixed inset-2' : 'w-full max-w-4xl mx-4 h-[80vh]'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Preview</span>
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-mono">
              {language}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors"
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <iframe
          srcDoc={srcDoc}
          sandbox="allow-scripts"
          className="flex-1 w-full bg-white"
          title="Artifact Preview"
        />
      </div>
    </div>
  );
}
