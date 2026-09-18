import type { ProjectRelativePath } from '@/contracts/file';
import { parseProjectRelativePath } from '@/features/files/pathPolicy';
import { useWorkspaceSession } from './workspaceSession';

const WORKSPACE_SESSION_KEY = 'manao.workspace-session.v1';

type PersistedWorkspaceSession = {
  projectId: string;
  expandedPaths: string[];
  selectedPath: string | null;
  openPaths: string[];
  activePath: string | null;
};

function parsePath(value: unknown): ProjectRelativePath | null {
  if (typeof value !== 'string' || value === '') {
    return null;
  }
  try {
    return parseProjectRelativePath(value);
  } catch {
    return null;
  }
}

function parsePathList(value: unknown): ProjectRelativePath[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const paths: ProjectRelativePath[] = [];
  for (const item of value) {
    const path = parsePath(item);
    if (path !== null && !seen.has(path)) {
      seen.add(path);
      paths.push(path);
    }
  }
  return paths;
}

function readPersistedSession(storage: Storage): PersistedWorkspaceSession | null {
  const raw = storage.getItem(WORKSPACE_SESSION_KEY);
  if (raw === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedWorkspaceSession>;
    if (typeof parsed.projectId !== 'string' || parsed.projectId.length === 0) {
      return null;
    }
    const openPaths = parsePathList(parsed.openPaths);
    const selectedPath = parsePath(parsed.selectedPath);
    const activeCandidate = parsePath(parsed.activePath);
    return {
      projectId: parsed.projectId,
      expandedPaths: parsePathList(parsed.expandedPaths).map(String),
      selectedPath,
      openPaths,
      activePath:
        activeCandidate !== null && openPaths.includes(activeCandidate)
          ? activeCandidate
          : (openPaths.at(-1) ?? null),
    };
  } catch {
    return null;
  }
}

function applyPersistedSession(session: PersistedWorkspaceSession): void {
  useWorkspaceSession.setState({
    projectId: session.projectId,
    expandedPaths: new Set(parsePathList(session.expandedPaths)),
    selectedPath: parsePath(session.selectedPath),
    openPaths: parsePathList(session.openPaths),
    activePath: parsePath(session.activePath),
    dirtyPaths: new Set(),
  });
}

export function installWorkspacePersistence(storage: Storage = window.sessionStorage): () => void {
  const persisted = readPersistedSession(storage);
  if (persisted !== null) {
    applyPersistedSession(persisted);
  }

  return useWorkspaceSession.subscribe((state) => {
    if (state.projectId === null) {
      storage.removeItem(WORKSPACE_SESSION_KEY);
      return;
    }
    const snapshot: PersistedWorkspaceSession = {
      projectId: state.projectId,
      expandedPaths: [...state.expandedPaths],
      selectedPath: state.selectedPath,
      openPaths: state.openPaths,
      activePath: state.activePath,
    };
    storage.setItem(WORKSPACE_SESSION_KEY, JSON.stringify(snapshot));
  });
}

export { WORKSPACE_SESSION_KEY };
