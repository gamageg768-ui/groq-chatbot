'use client';

import { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Search,
  Pin,
  Tag,
} from 'lucide-react';
import { Conversation, ConversationTag } from '@/types';
import { cn, formatDate } from '@/lib/utils';

const TAG_COLORS: Record<ConversationTag, string> = {
  red: 'bg-red-400',
  orange: 'bg-orange-400',
  yellow: 'bg-yellow-400',
  green: 'bg-green-400',
  blue: 'bg-blue-400',
  purple: 'bg-purple-400',
};

const TAG_OPTIONS: { key: ConversationTag | undefined; bg: string; ring: string }[] = [
  { key: undefined, bg: 'bg-gray-200', ring: 'ring-gray-400' },
  { key: 'red', bg: 'bg-red-400', ring: 'ring-red-400' },
  { key: 'orange', bg: 'bg-orange-400', ring: 'ring-orange-400' },
  { key: 'yellow', bg: 'bg-yellow-400', ring: 'ring-yellow-400' },
  { key: 'green', bg: 'bg-green-400', ring: 'ring-green-400' },
  { key: 'blue', bg: 'bg-blue-400', ring: 'ring-blue-400' },
  { key: 'purple', bg: 'bg-purple-400', ring: 'ring-purple-400' },
];

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onTag: (id: string, tag: ConversationTag | undefined) => void;
  onSettings: () => void;
}

export default function Sidebar({
  conversations,
  activeId,
  onNew,
  onSelect,
  onDelete,
  onPin,
  onTag,
  onSettings,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openTagPicker, setOpenTagPicker] = useState<string | null>(null);

  const sorted = [...conversations].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  const filtered = sorted.filter(
    (c) => !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out shrink-0',
        collapsed ? 'w-14' : 'w-64'
      )}
    >
      {openTagPicker && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenTagPicker(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-gray-100 text-base">GroqChat</span>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-gray-500 dark:text-gray-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-gray-500 dark:text-gray-400 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Search */}
      {!collapsed && (
        <div className="px-2 pt-2">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-xs bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none"
            />
          </div>
        </div>
      )}

      {/* New Chat Button */}
      <div className="px-2 py-2">
        <button
          onClick={onNew}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium text-sm',
            collapsed && 'justify-center px-0'
          )}
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!collapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 space-y-0.5">
        {!collapsed && filtered.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">{searchQuery ? 'No results found' : 'No conversations yet'}</p>
          </div>
        )}

        {filtered.map((conv) => (
          <div
            key={conv.id}
            className={cn(
              'relative group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors',
              activeId === conv.id
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100'
                : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
              collapsed && 'justify-center'
            )}
            onClick={() => { onSelect(conv.id); setOpenTagPicker(null); }}
            onMouseEnter={() => setHoverId(conv.id)}
            onMouseLeave={() => setHoverId(null)}
          >
            {conv.tag && !collapsed && (
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', TAG_COLORS[conv.tag])} />
            )}

            <MessageSquare
              className={cn(
                'w-4 h-4 shrink-0',
                activeId === conv.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
              )}
            />

            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {conv.pinned && <Pin className="w-2.5 h-2.5 text-indigo-400 shrink-0" />}
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {conv.messages.length} msg • {formatDate(conv.updatedAt)}
                  </p>
                </div>

                {hoverId === conv.id && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    {/* Tag button */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenTagPicker(openTagPicker === conv.id ? null : conv.id);
                        }}
                        className="p-1 rounded transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-700"
                        title="Tag"
                      >
                        {conv.tag ? (
                          <span className={cn('w-3 h-3 rounded-full block', TAG_COLORS[conv.tag])} />
                        ) : (
                          <Tag className="w-3 h-3" />
                        )}
                      </button>

                      {openTagPicker === conv.id && (
                        <div
                          className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1.5 flex gap-1 z-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {TAG_OPTIONS.map((opt) => (
                            <button
                              key={opt.key ?? 'none'}
                              onClick={() => { onTag(conv.id, opt.key); setOpenTagPicker(null); }}
                              className={cn(
                                'w-4 h-4 rounded-full transition-transform hover:scale-110',
                                opt.bg,
                                conv.tag === opt.key && `ring-2 ring-offset-1 ${opt.ring}`
                              )}
                              title={opt.key ?? 'No tag'}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Pin button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onPin(conv.id); }}
                      className={cn(
                        'p-1 rounded transition-colors',
                        conv.pinned
                          ? 'text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-700'
                      )}
                      title={conv.pinned ? 'Unpin' : 'Pin'}
                    >
                      <Pin className="w-3 h-3" />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-2 py-3">
        <button
          onClick={onSettings}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 transition-colors text-sm',
            collapsed && 'justify-center px-0'
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
}
