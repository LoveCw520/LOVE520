import { useIsMutating, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { handleUnauthorized } from '@/app/appRuntime';
import { projectFileWritePredicate } from '@/components/files/editorSaveCommand';
import {
  isRunTerminalState,
  type RunId,
  type RunSummary,
} from '@/contracts/run';
import { pushActivity } from '@/features/activity/activityStore';
import {
  resolveRunPreconditions,
  runPreconditionDescription,
} from '@/features/editor/runPreconditions';
import { useWorkspaceSession } from '@/features/editor/workspaceSession';
import { getWorkspaceRevision, useDirectoryTreeQuery } from '@/features/files/fileQueries';
import { parseProjectDirectoryPath } from '@/features/files/pathPolicy';
import {
  EMPTY_LOG_WINDOW,
  RunLogStore,
  runLogStoreKey,
  type RunLogSnapshot,
} from '@/features/logs/RunLogStore';
import { RunLogTransport } from '@/features/logs/RunLogTransport';
import { useRunInsightsStore } from '@/features/runs/runInsightsStore';
import {
  isWorkspaceEditable,
  type RunAuthorityCoordinator,
} from '@/features/runs/RunAuthorityCoordinator';
import { captureStartRunVariables, useStartRunMutation, useStopRunMutation } from '@/features/runs/runMutations';
import {
  flattenRunHistoryPages,
  useActiveRunQuery,
  useRunDetailQuery,
  useRunHistoryQuery,
} from '@/features/runs/runQueries';
import { RunHistory } from './RunHistory';
import { RunInsights } from './RunInsights';
import { RunLogView } from './RunLogView';
import { RunToolbar } from './RunToolbar';
import { StopRunDialog } from './StopRunDialog';

export type RunPanelProps = {
  projectId: string;
  coordinator: RunAuthorityCoordinator;
};

const EMPTY_INSIGHTS_SNAPSHOT: RunLogSnapshot = {
  projectId: '',
  runId: '' as RunLogSnapshot['runId'],
  chunks: [],
  lastAppliedSeq: null,
  window: EMPTY_LOG_WINDOW,
  connection: 'idle',
  pendingOutput: false,
  error: null,
};

function subscribeNone(): () => void {
  return () => {};
}

function getEmptyInsightsSnapshot(): RunLogSnapshot {
  return EMPTY_INSIGHTS_SNAPSHOT;
}

function runQueryFallback(error: unknown, fallback: string): string {
  if (error instanceof Error && /network request failed/i.test(error.message)) {
    return 'Network request failed';
  }
  return fallback;
}

function statusText(options: {
  loadingAuthority: boolean;
  reloading: boolean;
  reloadFailed: boolean;
  idleEditable: boolean;
  run: RunSummary | null;
  stopWaiting: boolean;
}): string {
  if (options.loadingAuthority) {
    return 'Loading authority';
  }
  if (options.reloadFailed) {
    return 'RELOAD_FAILED';
  }
  if (options.reloading) {
    return 'Reloading workspace';
  }
  if (options.run !== null) {
    if (options.stopWaiting) {
      return `${options.run.state} · Waiting`;
    }
    return options.run.state;
  }
  if (options.idleEditable) {
    return 'Idle';
  }
  return 'Idle';
}

export function RunPanel({ projectId, coordinator }: RunPanelProps) {
  const queryClient = useQueryClient();
  const snapshot = useSyncExternalStore(
    coordinator.subscribe,
    coordinator.getSnapshot,
    coordinator.getSnapshot,
  );
  const unconfirmedLock =
    snapshot.observedLockingRunId !== null &&
    snapshot.phase !== 'RELOADING_WORKSPACE' &&
    snapshot.phase !== 'RELOAD_FAILED';
  const activeQuery = useActiveRunQuery(projectId, unconfirmedLock);
  const historyQuery = useRunHistoryQuery(projectId);
  const startMutation = useStartRunMutation(projectId, coordinator);
  const stopMutation = useStopRunMutation(projectId);
  useDirectoryTreeQuery(projectId, parseProjectDirectoryPath(''));

  useEffect(() => {
    const status =
      activeQuery.status === 'pending' || activeQuery.status === 'error' ? activeQuery.status : 'success';
    void coordinator.reconcile(status, activeQuery.data?.run ?? null);
  }, [activeQuery.data, activeQuery.dataUpdatedAt, activeQuery.status, coordinator]);

  const dirtyCount = useWorkspaceSession((state) => state.dirtyPaths.size);
  const authorityMutating =
    useIsMutating({
      predicate: projectFileWritePredicate(projectId),
    }) > 0;
  const writePending = authorityMutating && !startMutation.isPending && !stopMutation.isPending;
  const startPending = snapshot.startPending || startMutation.isPending;
  const workspaceRevision = getWorkspaceRevision(queryClient, projectId);
  const preconditions = resolveRunPreconditions({
    dirtyCount,
    writePending,
    workspaceRevision,
    authorityLoaded: snapshot.phase !== 'LOADING_AUTHORITY',
    hasActiveLockingRun: snapshot.observedLockingRunId !== null,
    startPending,
    reloadPhase: snapshot.phase,
  });
  const workspaceEditable = isWorkspaceEditable(snapshot);
  const canStart = preconditions.canRequestRun;

  const historyItems = useMemo(
    () => flattenRunHistoryPages(historyQuery.data?.pages ?? []),
    [historyQuery.data],
  );
  const activeRun = activeQuery.data?.run ?? null;
  const followActiveRef = useRef(true);
  const [selectedRunId, setSelectedRunId] = useState<RunId | null>(null);
  const [stopOpen, setStopOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [logStore, setLogStore] = useState<RunLogStore | null>(null);
  const storesRef = useRef<Map<string, RunLogStore>>(new Map());
  const previousRunStateRef = useRef<{ id: RunId; state: RunSummary['state'] } | null>(null);

  useEffect(() => {
    if (followActiveRef.current && activeRun !== null) {
      setSelectedRunId(activeRun.id);
      return;
    }
    setSelectedRunId((current) => {
      if (current !== null) {
        return current;
      }
      if (activeRun !== null) {
        return activeRun.id;
      }
      return historyItems[0]?.id ?? null;
    });
  }, [activeRun, historyItems]);

  const detailQuery = useRunDetailQuery(projectId, selectedRunId);
  const selectedRun =
    detailQuery.data !== undefined && detailQuery.data.id === selectedRunId
      ? detailQuery.data
      : activeRun !== null && activeRun.id === selectedRunId
        ? activeRun
        : (historyItems.find((item) => item.id === selectedRunId) ?? null);

  const ticking = selectedRun !== null && selectedRun.finishedAt === null;

  useEffect(() => {
    if (selectedRun === null) {
      previousRunStateRef.current = null;
      return;
    }
    const previous = previousRunStateRef.current;
    if (
      previous !== null &&
      previous.id === selectedRun.id &&
      previous.state !== selectedRun.state &&
      isRunTerminalState(selectedRun.state)
    ) {
      if (selectedRun.state === 'SUCCEEDED') {
        pushActivity({
          kind: 'success',
          title: '实验运行成功',
          message: `退出码 ${selectedRun.exitCode ?? 0}`,
        });
      } else if (selectedRun.state === 'FAILED') {
        pushActivity({
          kind: 'error',
          title: '实验运行失败',
          message: selectedRun.terminationReason ?? 'BUILD_FAILED',
        });
      } else if (selectedRun.state === 'TIMED_OUT') {
        pushActivity({
          kind: 'warning',
          title: '实验运行超时',
          message: `限制 ${selectedRun.policy.timeoutSeconds}s`,
        });
      } else if (selectedRun.state === 'CANCELLED') {
        pushActivity({
          kind: 'warning',
          title: '实验已取消',
          message: selectedRun.id,
        });
      }
    }
    previousRunStateRef.current = { id: selectedRun.id, state: selectedRun.state };
  }, [selectedRun]);
  useEffect(() => {
    if (!ticking) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [ticking, selectedRun?.id]);

  useEffect(() => {
    const stores = storesRef.current;
    return () => {
      for (const store of stores.values()) {
        store.dispose();
      }
      stores.clear();
    };
  }, [projectId]);

  useEffect(() => {
    if (selectedRunId === null) {
      setLogStore(null);
      return undefined;
    }
    const key = runLogStoreKey(projectId, selectedRunId);
    let store = storesRef.current.get(key);
    if (store === undefined) {
      store = new RunLogStore({ projectId, runId: selectedRunId });
      storesRef.current.set(key, store);
    }
    setLogStore(store);
    const transport = new RunLogTransport({
      projectId,
      runId: selectedRunId,
      store,
      queryClient,
      coordinator,
      onUnauthorized: handleUnauthorized,
    });
    transport.connect();
    return () => {
      transport.dispose();
    };
  }, [coordinator, projectId, queryClient, selectedRunId]);

  const insightsLogSnapshot = useSyncExternalStore(
    logStore === null ? subscribeNone : logStore.subscribe,
    logStore === null ? getEmptyInsightsSnapshot : logStore.getSnapshot,
    logStore === null ? getEmptyInsightsSnapshot : logStore.getSnapshot,
  );
  const insightsLogText = insightsLogSnapshot.chunks.map((chunk) => chunk.text).join('');

  useEffect(() => {
    useRunInsightsStore.getState().set(selectedRun, insightsLogText);
  }, [insightsLogText, selectedRun]);

  useEffect(
    () => () => {
      useRunInsightsStore.getState().clear();
    },
    [projectId],
  );

  const activeState = activeRun?.state;
  const canStop = (activeState === 'STARTING' || activeState === 'RUNNING') && !stopMutation.isPending;
  const revisionMatches =
    selectedRun !== null && selectedRun.requestedWorkspaceRevision === workspaceRevision;
  const canReproduce =
    selectedRun !== null &&
    isRunTerminalState(selectedRun.state) &&
    canStart &&
    revisionMatches;
  const stopWaiting = activeState === 'STOPPING' || activeState === 'RECOVERING';
  const loadingAuthority = snapshot.phase === 'LOADING_AUTHORITY';
  const reloading = snapshot.phase === 'RELOADING_WORKSPACE';
  const reloadFailed = snapshot.phase === 'RELOAD_FAILED';

  const onStart = useCallback(() => {
    if (!canStart) {
      return;
    }
    try {
      startMutation.mutate(captureStartRunVariables(queryClient, projectId));
    } catch {
      return;
    }
  }, [canStart, projectId, queryClient, startMutation]);

  const onSelect = useCallback(
    (runId: RunId) => {
      followActiveRef.current = activeRun?.id === runId;
      setSelectedRunId(runId);
    },
    [activeRun?.id],
  );

  return (
    <section aria-label="Run" className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
      <RunToolbar
        run={selectedRun}
        statusText={statusText({
          loadingAuthority,
          reloading,
          reloadFailed,
          idleEditable: workspaceEditable && selectedRun === null,
          run: selectedRun,
          stopWaiting: selectedRun !== null && (selectedRun.state === 'STOPPING' || selectedRun.state === 'RECOVERING'),
        })}
        nowMs={nowMs}
        canStart={canStart}
        startTitle={
          preconditions.canRequestRun ? 'Start run' : runPreconditionDescription(preconditions.reason)
        }
        startPending={startPending}
        canReproduce={canReproduce}
        reproduceTitle={
          selectedRun === null
            ? 'Select a run first'
            : !isRunTerminalState(selectedRun.state)
              ? 'Wait for the run to finish'
              : !revisionMatches
                ? 'Workspace revision changed; backend replay is required'
                : 'Reproduce with current workspace revision'
        }
        onReproduce={onStart}
        canStop={canStop}
        stopWaiting={stopWaiting}
        stopPending={stopMutation.isPending}
        authorityError={
          activeQuery.isError ? runQueryFallback(activeQuery.error, 'Unable to load run authority') : null
        }
        startError={startMutation.isError ? 'Unable to start run' : null}
        stopError={stopMutation.isError ? 'Unable to stop run' : null}
        reloadFailed={reloadFailed}
        onStart={onStart}
        onStop={() => {
          if (!canStop) {
            return;
          }
          setStopOpen(true);
        }}
        onRetryAuthority={() => {
          void activeQuery.refetch();
        }}
        onRetryReload={() => {
          coordinator.retryReload();
        }}
      />
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <RunHistory
          items={historyItems}
          selectedRunId={selectedRunId}
          isPending={historyQuery.isPending}
          isError={historyQuery.isError}
          hasNextPage={historyQuery.hasNextPage}
          isFetchingNextPage={historyQuery.isFetchingNextPage}
          onSelect={onSelect}
          onLoadMore={() => {
            void historyQuery.fetchNextPage();
          }}
          onRetry={() => {
            void historyQuery.refetch();
          }}
        />
        <RunLogView key={selectedRunId ?? 'none'} store={logStore} />
        <RunInsights run={selectedRun} store={logStore} />
      </div>
      <StopRunDialog
        open={stopOpen}
        pending={stopMutation.isPending}
        onCancel={() => {
          setStopOpen(false);
        }}
        onConfirm={() => {
          setStopOpen(false);
          stopMutation.mutate();
        }}
      />
    </section>
  );
}
