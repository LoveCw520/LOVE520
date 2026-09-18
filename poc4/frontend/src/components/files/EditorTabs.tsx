import { motion } from 'framer-motion';
import { Save, X } from 'lucide-react';
import { useCallback, useEffect, useRef, type DragEvent } from 'react';
import { Spinner } from '@/components/ui/spinner';
import type { EditorTab } from '@/features/editor/editorTypes';
import { springFast } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { getFileIcon, getFileIconColor } from './fileIcons';

interface EditorTabsProps {
  tabs: EditorTab[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  savePending?: boolean;
}

export function EditorTabs({
  tabs,
  activePath,
  onSelect,
  onClose,
  onReorder,
  onSave,
  saveDisabled = true,
  savePending = false,
}: EditorTabsProps) {
  const draggedIndexRef = useRef<number | null>(null);
  const tabRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  const handleDragStart = useCallback((e: DragEvent, index: number) => {
    draggedIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent, toIndex: number) => {
      e.preventDefault();
      const fromIndex = draggedIndexRef.current;
      if (fromIndex !== null && fromIndex !== toIndex) {
        onReorder(fromIndex, toIndex);
      }
      draggedIndexRef.current = null;
    },
    [onReorder]
  );

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!activePath) return;
    const frameId = requestAnimationFrame(() => {
      const tabEl = tabRefsRef.current.get(activePath);
      tabEl?.scrollIntoView?.({
        behavior: reduceMotion ? 'auto' : 'smooth',
        inline: 'nearest',
        block: 'nearest',
      });
    });
    return () => cancelAnimationFrame(frameId);
  }, [activePath, reduceMotion]);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex h-[40px] shrink-0 items-center overflow-hidden border-b border-white/10 bg-[#0c1210]">
      <div className="h-[40px] min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div role="tablist" aria-label="Editor tabs" className="flex h-[40px] w-max">
          {tabs.map((tab, index) => {
            const isActive = tab.path === activePath;
            const Icon = getFileIcon(tab.title, false);
            const iconColor = getFileIconColor(tab.title, false);

            return (
              <div
                key={tab.path}
                ref={(el) => {
                  if (el) tabRefsRef.current.set(tab.path, el);
                  else tabRefsRef.current.delete(tab.path);
                }}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onClick={() => onSelect(tab.path)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) {
                    return;
                  }
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(tab.path);
                  }
                }}
                role="tab"
                title={tab.path}
                aria-selected={isActive}
                tabIndex={0}
                className={cn(
                  'group relative flex h-[40px] min-w-[132px] max-w-[200px] cursor-pointer select-none items-center gap-2 border-r border-white/8 px-3 text-sm transition-colors',
                  isActive
                    ? 'bg-[#101814] text-white shadow-[inset_0_-1px_0_rgba(223,255,130,0.18)]'
                    : 'bg-[#0c1210] text-white/42 hover:bg-white/[0.045] hover:text-white/72'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="editor-tab-indicator"
                    className="absolute inset-x-0 top-0 h-[2px] bg-[#dfff82] shadow-[0_0_14px_rgba(223,255,130,0.6)]"
                    transition={reduceMotion ? { duration: 0 } : springFast}
                  />
                )}

                <Icon className={cn('h-4 w-4 shrink-0', iconColor)} aria-hidden />

                <span className="flex-1 truncate">
                  {tab.isDirty && <span className="mr-0.5">*</span>}
                  {tab.title}
                </span>

                <button
                  type="button"
                  aria-label={`Close ${tab.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(tab.path);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                  }}
                  className={cn(
                    'shrink-0 rounded p-0.5 text-white/48 opacity-0 transition hover:bg-white/10 hover:text-white',
                    'group-hover:opacity-100 focus-visible:opacity-100',
                    isActive && 'opacity-72'
                  )}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {onSave !== undefined ? (
        <button
          type="button"
          title="Save"
          aria-label="Save"
          disabled={saveDisabled}
          onClick={onSave}
          className="mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-64"
        >
          {savePending ? (
            <Spinner />
          ) : (
            <Save className="size-4 text-[#dfff82]" aria-hidden />
          )}
        </button>
      ) : null}
    </div>
  );
}
