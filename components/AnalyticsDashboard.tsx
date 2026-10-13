'use client';

import { X, MessageSquare, Hash, Zap, Clock, BarChart2, TrendingUp } from 'lucide-react';
import { Conversation } from '@/types';
import { GROQ_MODELS } from '@/lib/utils';

interface AnalyticsDashboardProps {
  conversations: Conversation[];
  onClose: () => void;
}

export default function AnalyticsDashboard({ conversations, onClose }: AnalyticsDashboardProps) {
  const assistantMsgs = conversations.flatMap((c) =>
    c.messages.filter((m) => m.role === 'assistant')
  );

  const totalTokens = assistantMsgs.reduce((s, m) => s + (m.tokens?.total ?? 0), 0);
  const totalTime = assistantMsgs.reduce((s, m) => s + (m.tokens?.totalTime ?? 0), 0);
  const totalMsgs = conversations.reduce((s, c) => s + c.messages.length, 0);
  const avgTime =
    assistantMsgs.length > 0 ? (totalTime / assistantMsgs.length).toFixed(1) : null;

  const modelTokens: Record<string, { tokens: number; count: number }> = {};
  for (const msg of assistantMsgs) {
    if (msg.model && msg.tokens) {
      if (!modelTokens[msg.model]) modelTokens[msg.model] = { tokens: 0, count: 0 };
      modelTokens[msg.model].tokens += msg.tokens.total ?? 0;
      modelTokens[msg.model].count += 1;
    }
  }

  const maxTokens = Math.max(...Object.values(modelTokens).map((v) => v.tokens), 1);

  const costEstimate = (tokens: number) =>
    tokens > 0 ? `$${((tokens / 1_000_000) * 0.2).toFixed(4)}` : '$0.0000';

  // Last 7 days activity
  const now = Date.now();
  const dayMs = 86_400_000;
  const dailyCounts = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now - (6 - i) * dayMs);
    const label = day.toLocaleDateString('en-US', { weekday: 'short' });
    const count = conversations.filter((c) => {
      const d = new Date(c.updatedAt);
      return (
        d.getFullYear() === day.getFullYear() &&
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate()
      );
    }).length;
    return { label, count };
  });
  const maxDay = Math.max(...dailyCounts.map((d) => d.count), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-gray-200 dark:border-gray-700 animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm">
            <BarChart2 className="w-4 h-4 text-indigo-500" />
            Token Analytics
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto scrollbar-thin">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: MessageSquare, label: 'Conversations', value: conversations.length },
              { icon: Hash, label: 'Messages', value: totalMsgs },
              { icon: Zap, label: 'Total Tokens', value: totalTokens.toLocaleString() },
              {
                icon: Clock,
                label: 'Avg Response Time',
                value: avgTime ? `${avgTime}s` : '—',
              },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
              </div>
            ))}
          </div>

          {/* Cost estimate */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                Estimated Cost
              </p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
                Based on ~$0.20/M tokens average
              </p>
            </div>
            <span className="text-xl font-bold text-indigo-800 dark:text-indigo-200">
              {costEstimate(totalTokens)}
            </span>
          </div>

          {/* 7-day activity */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              7-Day Activity
            </p>
            <div className="flex items-end gap-1 h-16">
              {dailyCounts.map(({ label, count }) => (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: 48 }}>
                    <div
                      className="w-full bg-indigo-500 rounded-t-sm transition-all"
                      style={{ height: `${Math.max((count / maxDay) * 48, count > 0 ? 4 : 0)}px` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Per-model breakdown */}
          {Object.keys(modelTokens).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Tokens by Model
              </p>
              <div className="space-y-3">
                {Object.entries(modelTokens)
                  .sort((a, b) => b[1].tokens - a[1].tokens)
                  .map(([modelId, { tokens, count }]) => {
                    const model = GROQ_MODELS.find((m) => m.id === modelId);
                    const pct = Math.round((tokens / maxTokens) * 100);
                    return (
                      <div key={modelId}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                            {model?.name ?? modelId}
                          </span>
                          <span className="text-xs text-gray-400">
                            {tokens.toLocaleString()} · {count} msgs
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {totalTokens === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              Send some messages to see analytics.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
