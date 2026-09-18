import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { useEffect } from 'react';
import {
  useActivityStore,
  type ActivityItem,
  type ActivityKind,
} from '@/features/activity/activityStore';
import { cn } from '@/lib/utils';

function toastIcon(kind: ActivityKind) {
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

function ToastItem({
  item,
  onDismiss,
}: {
  item: ActivityItem;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 4800);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-[340px] items-start gap-3 rounded-lg border bg-[#171e1b]/96 p-3 shadow-[0_22px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl',
        item.kind === 'error'
          ? 'border-red-300/24'
          : item.kind === 'warning'
            ? 'border-amber-300/24'
            : 'border-white/12',
      )}
    >
      <span className="mt-0.5">{toastIcon(item.kind)}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{item.title}</p>
        {item.message !== null ? (
          <p className="mt-1 text-xs leading-5 text-white/48">{item.message}</p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="关闭通知"
        className="grid size-6 shrink-0 place-items-center rounded text-white/34 hover:bg-white/8 hover:text-white"
        onClick={onDismiss}
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ActivityToaster() {
  const toasts = useActivityStore((state) => state.toasts);
  const dismissToast = useActivityStore((state) => state.dismissToast);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[220] flex flex-col-reverse gap-2">
      {toasts.map((item) => (
        <ToastItem
          key={item.id}
          item={item}
          onDismiss={() => dismissToast(item.id)}
        />
      ))}
    </div>
  );
}
