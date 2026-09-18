import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileCode,
  FlaskConical,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Play,
  SquareTerminal,
} from 'lucide-react';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Link, useSearchParams } from 'react-router';
import { logout } from '@/app/appRuntime';
import { EditorWorkspace } from '@/components/files/EditorWorkspace';
import { ActivityCenter } from '@/components/activity/ActivityCenter';
import { CommandPalette } from '@/components/commands/CommandPalette';
import { UnsavedChangesDialog } from '@/components/files/UnsavedChangesDialog';
import { FileTree } from '@/components/files/FileTree';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { RunInsights } from '@/components/runs/RunInsights';
import { RunPanel } from '@/components/runs/RunPanel';
import { useRunInsightsStore } from '@/features/runs/runInsightsStore';
import { Button } from '@/components/ui/button';
import type { ProjectSummary } from '@/contracts/project';
import {
  dismissUnsavedDialog,
  LEAVE_MESSAGE,
  requestLogout,
  requestUnsavedDialog,
  useDirtyBeforeUnload,
  useUnsavedDialogState,
} from '@/features/editor/unsavedChangesGuard';
import { useWorkspaceSession } from '@/features/editor/workspaceSession';
import {
  isWorkspaceEditable,
  useRunAuthorityCoordinator,
} from '@/features/runs/RunAuthorityCoordinator';
import {
  flattenRunHistoryPages,
  useActiveRunQuery,
  useRunHistoryQuery,
} from '@/features/runs/runQueries';
import { reloadWorkspaceAfterTerminalRun } from '@/features/runs/workspaceReload';
import { cn } from '@/lib/utils';

const EDITOR_REGION_ID = 'workbench-editor';
const RUN_PANEL_ID = 'workbench-run-panel';
const TERMINAL_PANEL_ID = 'workbench-terminal-panel';

type WorkbenchPanel = 'file' | 'run' | 'terminal';

const LazyJobTerminalPanel = lazy(() => import('@/components/terminal/JobTerminalPanel'));

const panelTabClassName =
  'inline-flex h-8 items-center gap-1.5 rounded-md border border-transparent px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[#dfff82]/35';

const panelSurfaceClassName =
  'absolute inset-0 flex min-h-0 min-w-0 flex-col overflow-hidden outline-none';

const WORKBENCH_LAYOUT_KEY = 'manao.workbench-layout.v1';
const DEFAULT_SIDEBAR_WIDTH = 256;
const DEFAULT_INSIGHTS_WIDTH = 320;

type PersistedLayout = {
  sidebarWidth: number;
  insightsWidth: number;
  sidebarVisible: boolean;
  insightsVisible: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readLayout(): PersistedLayout {
  try {
    const raw = window.localStorage.getItem(WORKBENCH_LAYOUT_KEY);
    if (raw === null) {
      throw new Error('No layout');
    }
    const parsed = JSON.parse(raw) as Partial<PersistedLayout>;
    return {
      sidebarWidth: clamp(Number(parsed.sidebarWidth) || DEFAULT_SIDEBAR_WIDTH, 220, 380),
      insightsWidth: clamp(Number(parsed.insightsWidth) || DEFAULT_INSIGHTS_WIDTH, 280, 460),
      sidebarVisible: parsed.sidebarVisible !== false,
      insightsVisible: parsed.insightsVisible !== false,
    };
  } catch {
    return {
      sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
      insightsWidth: DEFAULT_INSIGHTS_WIDTH,
      sidebarVisible: true,
      insightsVisible: true,
    };
  }
}

function authorityErrorMessage(error: unknown): string {
  if (error instanceof Error && /network request failed/i.test(error.message)) {
    return 'Network request failed';
  }
  return 'Unable to load run authority';
}

export function WorkbenchShell({ project }: { project: ProjectSummary }) {
  const initialLayout = useRef<PersistedLayout | null>(null);
  if (initialLayout.current === null) {
    initialLayout.current = readLayout();
  }
  const [sidebarWidth, setSidebarWidth] = useState(initialLayout.current.sidebarWidth);
  const [insightsWidth, setInsightsWidth] = useState(initialLayout.current.insightsWidth);
  const [sidebarVisible, setSidebarVisible] = useState(initialLayout.current.sidebarVisible);
  const [insightsVisible, setInsightsVisible] = useState(initialLayout.current.insightsVisible);
  const [searchParams] = useSearchParams();
  const requestedPanel = searchParams.get('panel');
  const initialPanel: WorkbenchPanel =
    requestedPanel === 'run' || requestedPanel === 'terminal' ? requestedPanel : 'file';
  const [activePanel, setActivePanel] = useState<WorkbenchPanel>(initialPanel);
  const [terminalLoaded, setTerminalLoaded] = useState(initialPanel === 'terminal');
  const queryClient = useQueryClient();
  const coordinator = useRunAuthorityCoordinator(project.id);
  const snapshot = useSyncExternalStore(
    coordinator.subscribe,
    coordinator.getSnapshot,
    coordinator.getSnapshot,
  );
  const terminalAuthority = useSyncExternalStore(
    coordinator.subscribeTerminalAuthority,
    coordinator.getTerminalAuthoritySnapshot,
    coordinator.getTerminalAuthoritySnapshot,
  );
  const writesLocked = !isWorkspaceEditable(snapshot);

  useEffect(() => {
    if (snapshot.phase !== 'RELOADING_WORKSPACE') {
      return undefined;
    }
    const generation = coordinator.getReloadGeneration();
    let cancelled = false;
    void reloadWorkspaceAfterTerminalRun({
      projectId: project.id,
      queryClient,
    }).then(
      () => {
        if (cancelled || coordinator.getReloadGeneration() !== generation) {
          return;
        }
        coordinator.completeReload();
      },
      () => {
        if (cancelled || coordinator.getReloadGeneration() !== generation) {
          return;
        }
        coordinator.markReloadFailed();
      },
    );
    return () => {
      cancelled = true;
    };
  }, [coordinator, project.id, queryClient, snapshot.phase]);
  const unconfirmedLock =
    snapshot.observedLockingRunId !== null &&
    snapshot.phase !== 'RELOADING_WORKSPACE' &&
    snapshot.phase !== 'RELOAD_FAILED';
  const activeQuery = useActiveRunQuery(project.id, unconfirmedLock);
  const runHistoryQuery = useRunHistoryQuery(project.id);
  const latestRun =
    activeQuery.data?.run ??
    flattenRunHistoryPages(runHistoryQuery.data?.pages ?? [])[0] ??
    null;
  const sharedInsightRun = useRunInsightsStore((state) => state.run);
  const sharedInsightLogText = useRunInsightsStore((state) => state.logText);
  const insightRun = sharedInsightRun ?? latestRun;
  const dirtyCount = useWorkspaceSession((state) => state.dirtyPaths.size);
  const leaveGuard = useUnsavedDialogState();
  const terminalAuthorityError = terminalAuthority.status === 'error'
    ? authorityErrorMessage(activeQuery.error)
    : null;
  useDirtyBeforeUnload(dirtyCount);

  useEffect(() => {
    const layout: PersistedLayout = {
      sidebarWidth,
      insightsWidth,
      sidebarVisible,
      insightsVisible,
    };
    window.localStorage.setItem(WORKBENCH_LAYOUT_KEY, JSON.stringify(layout));
  }, [insightsVisible, insightsWidth, sidebarVisible, sidebarWidth]);

  const startResize = useCallback(
    (panel: 'sidebar' | 'insights', event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = panel === 'sidebar' ? sidebarWidth : insightsWidth;
      const onMove = (moveEvent: PointerEvent) => {
        if (panel === 'sidebar') {
          setSidebarWidth(clamp(startWidth + moveEvent.clientX - startX, 220, 380));
        } else {
          setInsightsWidth(clamp(startWidth + startX - moveEvent.clientX, 280, 460));
        }
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [insightsWidth, sidebarWidth],
  );

  const handleSkipToEditor = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setActivePanel('file');
    document.getElementById(EDITOR_REGION_ID)?.focus();
  }, []);

  const handleLogoutClick = useCallback(() => {
    const decision = requestLogout(useWorkspaceSession.getState().dirtyPaths.size);
    if (decision.kind === 'proceed') {
      logout();
      return;
    }
    requestUnsavedDialog({
      open: true,
      mode: 'leave',
      action: { type: 'logout' },
      message: LEAVE_MESSAGE,
    });
  }, []);

  const handleCancelLeave = useCallback(() => {
    dismissUnsavedDialog();
  }, []);

  const handleDiscardLeave = useCallback(() => {
    dismissUnsavedDialog();
    logout();
  }, []);

  return (
    <div className="workbench-shell flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[#090e0c] text-white">
      <a href={`#${EDITOR_REGION_ID}`} className="skip-to-editor" onClick={handleSkipToEditor}>
        Skip to editor
      </a>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 bg-[#0d1311] px-3">
        <Button
          render={<Link to="/projects" />}
          variant="ghost"
          size="icon"
          aria-label="Back to projects"
          title="Back to projects"
          className="text-white/52 hover:bg-white/[0.055] hover:text-white"
        >
          <ArrowLeft />
        </Button>
        <span className="grid size-7 shrink-0 place-items-center rounded-md border border-[#dfff82]/24 bg-[#dfff82]/6 font-mono text-[10px] font-bold text-[#dfff82]">
          码
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-medium text-white">{project.name}</h1>
          <p className="mt-0.5 truncate font-mono text-[9px] uppercase text-white/28">
            实验工作台 / {project.id}
          </p>
        </div>
        <span className="hidden shrink-0 items-center gap-1.5 rounded-md border border-[#dfff82]/24 bg-[#dfff82]/6 px-2 py-1 font-mono text-[10px] uppercase text-[#dfff82]/86 xl:flex">
          <FlaskConical className="size-3.5" aria-hidden="true" />
          可复现实验室
        </span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.035] px-2.5 py-1 font-mono text-[10px] uppercase text-white/58">
          <span className="size-1.5 rounded-full bg-[#dfff82] shadow-[0_0_10px_rgba(223,255,130,0.7)]" />
          {project.state}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={sidebarVisible ? '隐藏文件面板' : '显示文件面板'}
          title={sidebarVisible ? '隐藏文件面板' : '显示文件面板'}
          className="text-white/48 hover:bg-white/[0.055] hover:text-white"
          onClick={() => setSidebarVisible((current) => !current)}
        >
          {sidebarVisible ? <PanelLeftClose /> : <PanelLeftOpen />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={insightsVisible ? '隐藏运行洞察' : '显示运行洞察'}
          title={insightsVisible ? '隐藏运行洞察' : '显示运行洞察'}
          className="text-white/48 hover:bg-white/[0.055] hover:text-white"
          onClick={() => setInsightsVisible((current) => !current)}
        >
          {insightsVisible ? <PanelRightClose /> : <PanelRightOpen />}
        </Button>
        <CommandPalette />
        <ActivityCenter />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Log out"
          title="Log out"
          className="text-white/48 hover:bg-white/[0.055] hover:text-white"
          onClick={handleLogoutClick}
        >
          <LogOut />
        </Button>
      </header>
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {sidebarVisible ? (
          <>
            <aside
              aria-label="Project files"
              className="relative flex w-[256px] min-w-[256px] max-w-[256px] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#0c1210]"
              style={{ width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth }}
            >
              <span className="pointer-events-none absolute top-0 left-3 z-10 flex h-12 items-center font-mono text-sm text-muted-foreground">
                /
              </span>
              <div className="min-h-0 min-w-0 flex-1">
                <FileTree projectId={project.id} writesLocked={writesLocked} />
              </div>
            </aside>
            <div
              role="separator"
              aria-label="调整文件面板宽度"
              aria-orientation="vertical"
              className="w-1 shrink-0 cursor-col-resize bg-transparent transition hover:bg-[#dfff82]/28 active:bg-[#dfff82]/40"
              onPointerDown={(event) => startResize('sidebar', event)}
            />
          </>
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div
            role="tablist"
            aria-label="Workbench panels"
            className="flex h-10 shrink-0 items-center gap-1 border-b border-white/10 bg-[#0d1311] px-2"
          >
            <button
              type="button"
              role="tab"
              id="workbench-tab-file"
              aria-label="File"
              aria-controls={EDITOR_REGION_ID}
              aria-selected={activePanel === 'file'}
              className={cn(
                panelTabClassName,
                activePanel === 'file'
                  ? 'border-[#dfff82]/20 bg-[#dfff82]/10 text-[#dfff82] shadow-[inset_0_0_0_1px_rgba(223,255,130,0.05)]'
                  : 'text-white/42 hover:bg-white/[0.05] hover:text-white/76',
              )}
              onClick={() => {
                setActivePanel('file');
              }}
            >
              <FileCode className="h-4 w-4" aria-hidden />
              代码
            </button>
            <button
              type="button"
              role="tab"
              id="workbench-tab-run"
              aria-label="Run"
              aria-controls={RUN_PANEL_ID}
              aria-selected={activePanel === 'run'}
              className={cn(
                panelTabClassName,
                activePanel === 'run'
                  ? 'border-[#dfff82]/20 bg-[#dfff82]/10 text-[#dfff82] shadow-[inset_0_0_0_1px_rgba(223,255,130,0.05)]'
                  : 'text-white/42 hover:bg-white/[0.05] hover:text-white/76',
              )}
              onClick={() => {
                setActivePanel('run');
              }}
            >
              <Play className="h-4 w-4" aria-hidden />
              运行
            </button>
            <button
              type="button"
              role="tab"
              id="workbench-tab-terminal"
              aria-label="Terminal"
              aria-controls={TERMINAL_PANEL_ID}
              aria-selected={activePanel === 'terminal'}
              className={cn(
                panelTabClassName,
                activePanel === 'terminal'
                  ? 'border-[#dfff82]/20 bg-[#dfff82]/10 text-[#dfff82] shadow-[inset_0_0_0_1px_rgba(223,255,130,0.05)]'
                  : 'text-white/42 hover:bg-white/[0.05] hover:text-white/76',
              )}
              onClick={() => {
                setTerminalLoaded(true);
                setActivePanel('terminal');
              }}
            >
              <SquareTerminal className="h-4 w-4" aria-hidden />
              终端
            </button>
          </div>
          <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
            <div
              id={EDITOR_REGION_ID}
              role="tabpanel"
              tabIndex={-1}
              aria-label="Editor"
              aria-hidden={activePanel !== 'file'}
              inert={activePanel !== 'file' ? true : undefined}
              className={cn(
                panelSurfaceClassName,
                activePanel === 'file' ? 'z-10' : 'invisible pointer-events-none',
              )}
            >
              {activeQuery.isError ? (
                <div className="flex items-center gap-2 border-b px-3 py-2">
                  <InlineAlert>{authorityErrorMessage(activeQuery.error)}</InlineAlert>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void activeQuery.refetch();
                    }}
                  >
                    Retry loading run authority
                  </Button>
                </div>
              ) : null}
              {snapshot.phase === 'RELOADING_WORKSPACE' ? (
                <div role="status" className="border-b px-3 py-2 text-sm text-muted-foreground">
                  Reloading workspace
                </div>
              ) : null}
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                <EditorWorkspace projectId={project.id} writesLocked={writesLocked} />
              </div>
            </div>
            <div
              id={RUN_PANEL_ID}
              role="tabpanel"
              aria-labelledby="workbench-tab-run"
              aria-hidden={activePanel !== 'run'}
              inert={activePanel !== 'run' ? true : undefined}
              className={cn(
                panelSurfaceClassName,
                activePanel === 'run' ? 'z-10' : 'invisible pointer-events-none',
              )}
            >
              <RunPanel key={project.id} projectId={project.id} coordinator={coordinator} />
            </div>
            {terminalLoaded ? (
              <div
                id={TERMINAL_PANEL_ID}
                role="tabpanel"
                aria-labelledby="workbench-tab-terminal"
                aria-hidden={activePanel !== 'terminal'}
                inert={activePanel !== 'terminal' ? true : undefined}
                className={cn(
                  panelSurfaceClassName,
                  activePanel === 'terminal' ? 'z-10' : 'invisible pointer-events-none',
                )}
              >
                <Suspense
                  fallback={
                    <p role="status" className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Loading terminal
                    </p>
                  }
                >
                  <LazyJobTerminalPanel
                    projectId={project.id}
                    active={activePanel === 'terminal'}
                    authorityLoading={terminalAuthority.status === 'pending'}
                    authorityError={terminalAuthorityError}
                    run={terminalAuthority.run}
                  />
                </Suspense>
              </div>
            ) : null}
          </div>
        </div>
        {activePanel !== 'run' && insightsVisible ? (
          <>
            <div
              role="separator"
              aria-label="调整运行洞察宽度"
              aria-orientation="vertical"
              className="w-1 shrink-0 cursor-col-resize bg-transparent transition hover:bg-[#dfff82]/28 active:bg-[#dfff82]/40"
              onPointerDown={(event) => startResize('insights', event)}
            />
            <RunInsights
              run={insightRun}
              store={null}
              logText={sharedInsightLogText}
              style={{ width: insightsWidth, minWidth: insightsWidth, maxWidth: insightsWidth }}
            />
          </>
        ) : null}
      </div>
      <UnsavedChangesDialog
        open={leaveGuard.open && leaveGuard.action.type === 'logout'}
        mode="leave"
        message={leaveGuard.open ? leaveGuard.message : LEAVE_MESSAGE}
        onDiscard={handleDiscardLeave}
        onCancel={handleCancelLeave}
      />
    </div>
  );
}
