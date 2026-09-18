import { create } from 'zustand';

export type ActivityKind = 'info' | 'success' | 'warning' | 'error';

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  message: string | null;
  createdAt: string;
  read: boolean;
};

type ActivityState = {
  items: ActivityItem[];
  toasts: ActivityItem[];
  push(input: {
    kind?: ActivityKind;
    title: string;
    message?: string | null;
  }): ActivityItem;
  dismissToast(id: string): void;
  markAllRead(): void;
  clear(): void;
};

const MAX_ACTIVITY_ITEMS = 50;

function activityId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `activity-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  items: [],
  toasts: [],
  push(input) {
    const item: ActivityItem = {
      id: activityId(),
      kind: input.kind ?? 'info',
      title: input.title,
      message: input.message ?? null,
      createdAt: new Date().toISOString(),
      read: false,
    };
    set((state) => ({
      items: [item, ...state.items].slice(0, MAX_ACTIVITY_ITEMS),
      toasts: [item, ...state.toasts].slice(0, 4),
    }));
    return item;
  },
  dismissToast(id) {
    set((state) => ({
      toasts: state.toasts.filter((item) => item.id !== id),
    }));
  },
  markAllRead() {
    if (!get().items.some((item) => !item.read)) {
      return;
    }
    set((state) => ({
      items: state.items.map((item) => ({ ...item, read: true })),
    }));
  },
  clear() {
    set({ items: [], toasts: [] });
  },
}));

export function pushActivity(input: {
  kind?: ActivityKind;
  title: string;
  message?: string | null;
}): ActivityItem {
  return useActivityStore.getState().push(input);
}

export const activityStore = {
  getState() {
    return useActivityStore.getState();
  },
};
