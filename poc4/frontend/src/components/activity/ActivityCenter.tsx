import { Bell, CheckCheck, CircleAlert, CircleCheck, Info, Trash2, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useActivityStore, type ActivityKind } from '@/features/activity/activityStore';
import { cn } from '@/lib/utils';

function activityIcon(kind: ActivityKind) {
  if (kind === 'success') {
    return <CircleCheck className="size-4 text-[#dfff82]" aria-hidden="true" />;
  }
  if (kind === 'warning') {
    return <TriangleAlert className="size-4 text-amber-300" aria-hidden="true" />;
  }
  if (kind === 'error') {
    return <CircleAlert className="size-4 text-red-300" aria-hidden="true" />;
  }
  return <Info className="size-4 text-sky-300" aria-hidden="true" />;
}

function relativeTime(value: string): string {
  const elapsed = Date.now() - Date.parse(value);
  if (!Number.isFinite(elapsed) || elapsed < 60_000) {
    return '刚刚';
  }
  if (elapsed < 3_600_000) {
    return `${Math.floor(elapsed / 60_000)} 分钟前`;
  }
  return `${Math.floor(elapsed / 3_600_000)} 小时前`;
}

export function ActivityCenter() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const items = useActivityStore((state) => state.items);
  const markAllRead = useActivityStore((state) => state.markAllRead);
  const clear = useActivityStore((state) => state.clear);
  const unreadCount = items.filter((item) => !item.read).length;

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    markAllRead();
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [markAllRead, open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="活动中心"
        aria-expanded={open}
        className="relative grid size-8 place-items-center rounded-md text-white/48 hover:bg-white/8 hover:text-white"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell className="size-4" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute right-0.5 top-0.5 grid min-w-3.5 place-items-center rounded-full bg-[#dfff82] px-1 text-[8px] font-bold leading-3.5 text-[#10140d]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="活动中心"
          className="absolute right-0 top-10 z-[180] w-[360px] overflow-hidden rounded-lg border border-white/14 bg-[#171e1b] shadow-[0_24px_70px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="font-mono text-[9px] uppercase text-[#dfff82]">Activity</p>
              <h2 className="mt-1 text-sm font-semibold text-white">活动中心</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="全部标为已读"
                className="grid size-7 place-items-center rounded text-white/38 hover:bg-white/8 hover:text-white"
                onClick={markAllRead}
              >
                <CheckCheck className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="清空活动"
                className="grid size-7 place-items-center rounded text-white/38 hover:bg-red-400/12 hover:text-red-200"
                onClick={clear}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="max-h-[360px] overflow-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-white/34">暂无活动记录</p>
            ) : (
              items.map((item) => (
                <div
                  className={cn(
                    'flex items-start gap-3 border-b border-white/8 px-4 py-3 last:border-b-0',
                    !item.read && 'bg-[#dfff82]/4',
                  )}
                  key={item.id}
                >
                  <span className="mt-0.5">{activityIcon(item.kind)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/82">{item.title}</p>
                    {item.message !== null ? (
                      <p className="mt-1 text-xs leading-5 text-white/42">{item.message}</p>
                    ) : null}
                    <p className="mt-2 font-mono text-[9px] uppercase text-white/26">
                      {relativeTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
