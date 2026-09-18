import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseProjectRelativePath } from '@/features/files/pathPolicy';
import { useWorkspaceSession } from './workspaceSession';
import {
  installWorkspacePersistence,
  WORKSPACE_SESSION_KEY,
} from './workspacePersistence';

const projectId = 'prj-alice-notebook';
const src = parseProjectRelativePath('src');
const readme = parseProjectRelativePath('README.md');
const pom = parseProjectRelativePath('pom.xml');

let disposePersistence: (() => void) | null = null;

beforeEach(() => {
  useWorkspaceSession.getState().reset();
  window.sessionStorage.clear();
});

afterEach(() => {
  disposePersistence?.();
  disposePersistence = null;
  useWorkspaceSession.getState().reset();
  window.sessionStorage.clear();
});

describe('workspacePersistence', () => {
  it('persists stable workspace context without dirty or code content', () => {
    disposePersistence = installWorkspacePersistence(window.sessionStorage);
    const store = useWorkspaceSession.getState();
    store.activateProject(projectId);
    store.toggleDirectory(src);
    store.selectPath(readme);
    store.openFile(readme);
    store.openFile(pom);
    store.setDirty(pom, true);

    const raw = window.sessionStorage.getItem(WORKSPACE_SESSION_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? '{}')).toEqual({
      projectId,
      expandedPaths: [src],
      selectedPath: readme,
      openPaths: [readme, pom],
      activePath: pom,
    });
    expect(raw).not.toContain('file body');
    expect(raw).not.toContain('dirtyPaths');
  });

  it('restores expanded paths, selection and tabs after a fresh store', () => {
    window.sessionStorage.setItem(
      WORKSPACE_SESSION_KEY,
      JSON.stringify({
        projectId,
        expandedPaths: ['src'],
        selectedPath: 'README.md',
        openPaths: ['README.md', 'pom.xml'],
        activePath: 'pom.xml',
      }),
    );

    disposePersistence = installWorkspacePersistence(window.sessionStorage);

    const store = useWorkspaceSession.getState();
    expect(store.projectId).toBe(projectId);
    expect([...store.expandedPaths]).toEqual([src]);
    expect(store.selectedPath).toBe(readme);
    expect(store.openPaths).toEqual([readme, pom]);
    expect(store.activePath).toBe(pom);
    expect(store.dirtyPaths.size).toBe(0);
  });

  it('clears persisted context on logout reset', () => {
    disposePersistence = installWorkspacePersistence(window.sessionStorage);
    const store = useWorkspaceSession.getState();
    store.activateProject(projectId);
    store.openFile(readme);
    expect(window.sessionStorage.getItem(WORKSPACE_SESSION_KEY)).not.toBeNull();

    useWorkspaceSession.getState().reset();

    expect(window.sessionStorage.getItem(WORKSPACE_SESSION_KEY)).toBeNull();
  });
});
