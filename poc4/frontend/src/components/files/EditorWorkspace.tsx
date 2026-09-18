import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { Braces, FolderOpen, Sparkles } from 'lucide-react';
import { workspaceBufferRegistry, workspaceResourceRegistry } from '@/app/appRuntime';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { ProjectRelativePath } from '@/contracts/file';
import type { EditorTab } from '@/features/editor/editorTypes';
import {
  applySaveAndCloseSettled,
  CLOSE_TAB_MESSAGE,
  dialogTargetsClosePath,
  dismissUnsavedDialog,
  getUnsavedDialogState,
  patchUnsavedDialog,
  requestCloseTab,
  requestUnsavedDialog,
  useUnsavedDialogState,
} from '@/features/editor/unsavedChangesGuard';
import { useWorkspaceSession } from '@/features/editor/workspaceSession';
import {
  fileQueryErrorMessage,
  getWorkspaceRevision,
  useFileContentQuery,
  useFileMetadataQuery,
} from '@/features/files/fileQueries';
import { parseProjectRelativePath } from '@/features/files/pathPolicy';
import { languageForFile } from '@/lib/languageForFile';
import {
  disposeAllProjectModels,
  disposeProjectModel,
  disposeProjectModels,
} from '@/lib/projectMonacoModels';
import { BlockedFileView } from './BlockedFileView';
import { EditorTabs } from './EditorTabs';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';
import {
  editorKindForRenderMode,
  isSaveEnabled,
  useEditorSaveCommand,
} from './editorSaveCommand';
import { PlainTextEditor } from './PlainTextEditor';
import { WritableMonacoEditor } from './WritableMonacoEditor';

function fileName(path: string): string {
  const index = path.lastIndexOf('/');
  return index === -1 ? path : path.slice(index + 1);
}

function EmptyEditorState() {
  return (
    <div className="relative flex h-full min-h-0 items-center justify-center overflow-hidden bg-[#090e0c]">
      <div
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[size:32px_32px]"
        aria-hidden="true"
      />
      <div className="relative flex max-w-md flex-col items-center px-6 text-center">
        <div className="relative grid size-16 place-items-center rounded-lg border border-[#dfff82]/22 bg-[#dfff82]/6 shadow-[0_0_48px_rgba(223,255,130,0.08)]">
          <Braces className="size-7 text-[#dfff82]" aria-hidden="true" />
          <Sparkles className="absolute -right-2 -top-2 size-4 text-sky-300" aria-hidden="true" />
        </div>
        <p className="mt-6 font-mono text-[10px] uppercase text-[#dfff82]/72">编辑器待命</p>
        <h2 className="mt-2 text-xl font-semibold text-white">等待打开文件</h2>
        <p className="mt-2 text-sm leading-6 text-white/42">
          当前活动缓冲区为空，文件上下文与编辑状态会显示在这里。
        </p>
        <div className="mt-6 flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 font-mono text-[10px] uppercase text-white/46">
          <FolderOpen className="size-3.5 text-[#dfff82]" aria-hidden="true" />
          Java 17 / Maven / Evidence
        </div>
      </div>
    </div>
  );
}

function FileStatus({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex h-full items-center justify-center p-3">
      <Spinner />
    </div>
  );
}

function FileRequestError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 p-3">
      <InlineAlert>{message}</InlineAlert>
      <Button type="button" variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function FileQuerySubscription({
  projectId,
  path,
}: {
  projectId: string;
  path: ProjectRelativePath;
}) {
  const meta = useFileMetadataQuery(projectId, path, true);
  useFileContentQuery(projectId, path, meta.data?.renderMode);
  return null;
}

function ActiveFileSurface({
  projectId,
  path,
  onSave,
  readOnly,
}: {
  projectId: string;
  path: ProjectRelativePath;
  onSave: () => void;
  readOnly: boolean;
}) {
  const meta = useFileMetadataQuery(projectId, path, true);
  const content = useFileContentQuery(projectId, path, meta.data?.renderMode);

  if (meta.isPending) {
    return <FileStatus label="Loading file metadata" />;
  }
  if (meta.isError) {
    return (
      <FileRequestError
        message={fileQueryErrorMessage(meta.error, 'Unable to load file metadata')}
        onRetry={() => {
          void meta.refetch();
        }}
      />
    );
  }
  if (meta.data === undefined) {
    return null;
  }

  if (meta.data.renderMode === 'BLOCKED') {
    return <BlockedFileView key={meta.data.path} projectId={projectId} metadata={meta.data} />;
  }

  if (content.isPending) {
    return <FileStatus label="Loading file content" />;
  }
  if (content.isError) {
    return (
      <FileRequestError
        message={fileQueryErrorMessage(content.error, 'Unable to load file content')}
        onRetry={() => {
          void content.refetch();
        }}
      />
    );
  }
  if (content.data === undefined) {
    return null;
  }

  if (meta.data.renderMode === 'PLAIN_TEXT') {
    return (
      <PlainTextEditor
        projectId={projectId}
        path={path}
        metadata={meta.data}
        content={content.data.content}
        readOnly={readOnly}
        onSave={onSave}
      />
    );
  }

  return (
    <WritableMonacoEditor
      projectId={projectId}
      path={path}
      content={content.data.content}
      language={meta.data.language || languageForFile(path)}
      readOnly={readOnly}
      onSave={onSave}
    />
  );
}

export function EditorWorkspace({
  projectId,
  writesLocked,
}: {
  projectId: string;
  writesLocked: boolean;
}) {
  const queryClient = useQueryClient();
  const sessionProjectId = useWorkspaceSession((state) => state.projectId);
  const openPaths = useWorkspaceSession((state) => state.openPaths);
  const activePath = useWorkspaceSession((state) => state.activePath);
  const dirtyPaths = useWorkspaceSession((state) => state.dirtyPaths);
  const aligned = sessionProjectId === projectId;
  const visibleOpenPaths = aligned ? openPaths : [];
  const visibleActivePath = aligned ? activePath : null;
  const pendingDisposeRef = useRef<ProjectRelativePath[]>([]);
  const previousProjectIdRef = useRef<string | null>(null);
  const closeGuard = useUnsavedDialogState();
  const save = useEditorSaveCommand(projectId);
  const activeMeta = useFileMetadataQuery(
    projectId,
    visibleActivePath ?? parseProjectRelativePath('pom.xml'),
    visibleActivePath !== null,
  );
  const canSave =
    visibleActivePath !== null &&
    editorKindForRenderMode(activeMeta.data?.renderMode ?? 'BLOCKED') !== null;
  const activeDirty = visibleActivePath !== null && dirtyPaths.has(visibleActivePath);
  const workspaceRevision = getWorkspaceRevision(queryClient, projectId) ?? '—';
  const activeLanguage =
    visibleActivePath === null
      ? '—'
      : activeMeta.data?.language || languageForFile(visibleActivePath);

  useEffect(() => {
    const unregister = workspaceResourceRegistry.register(disposeAllProjectModels);
    return () => {
      unregister();
    };
  }, []);

  useEffect(() => {
    const previous = previousProjectIdRef.current;
    previousProjectIdRef.current = projectId;
    if (previous !== null && previous !== projectId) {
      pendingDisposeRef.current = [];
      disposeProjectModels(previous);
    }
  }, [projectId]);

  const handleSelect = useCallback((path: string) => {
    const relative = parseProjectRelativePath(path);
    const session = useWorkspaceSession.getState();
    session.selectPath(relative);
    session.openFile(relative);
  }, []);

  const closeTabNow = useCallback((path: ProjectRelativePath) => {
    pendingDisposeRef.current.push(path);
    useWorkspaceSession.getState().closeFile(path);
  }, []);

  const handleClose = useCallback(
    (path: string) => {
      const relative = parseProjectRelativePath(path);
      const decision = requestCloseTab(relative, useWorkspaceSession.getState().dirtyPaths);
      if (decision.kind === 'proceed') {
        closeTabNow(relative);
        return;
      }
      requestUnsavedDialog({
        open: true,
        mode: 'close-tab',
        action: { type: 'close-tab', path: relative },
        message: CLOSE_TAB_MESSAGE,
      });
    },
    [closeTabNow],
  );

  const handleCancelClose = useCallback(() => {
    dismissUnsavedDialog();
  }, []);

  const handleDiscardClose = useCallback(() => {
    const current = getUnsavedDialogState();
    if (!current.open || current.action.type !== 'close-tab') {
      return;
    }
    const path = current.action.path;
    workspaceBufferRegistry.get(projectId, path)?.discard();
    closeTabNow(path);
    dismissUnsavedDialog();
  }, [closeTabNow, projectId]);

  const handleSaveAndClose = useCallback(async () => {
    if (writesLocked) {
      return;
    }
    const current = getUnsavedDialogState();
    if (!current.open || current.action.type !== 'close-tab') {
      return;
    }
    const path = current.action.path;
    const result = await save.savePath(path);
    const outcome = applySaveAndCloseSettled({
      capturedPath: path,
      dialogTargetsPath: dialogTargetsClosePath(getUnsavedDialogState(), path),
      saveStatus: result.status,
      bufferStillDirty: workspaceBufferRegistry.get(projectId, path)?.isDirty() === true,
      saveErrorMessage: result.status === 'failed' ? result.message : undefined,
    });
    if (outcome.kind === 'dismiss') {
      return;
    }
    if (outcome.kind === 'proceed' && outcome.action?.type === 'close-tab') {
      closeTabNow(outcome.action.path);
      dismissUnsavedDialog();
      return;
    }
    if (outcome.message !== undefined) {
      patchUnsavedDialog({ message: outcome.message });
    }
  }, [closeTabNow, projectId, save, writesLocked]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    useWorkspaceSession.getState().reorderTabs(fromIndex, toIndex);
  }, []);

  const handleSave = useCallback(() => {
    if (visibleActivePath === null || writesLocked) {
      return;
    }
    void save.savePath(visibleActivePath);
  }, [save, visibleActivePath, writesLocked]);

  const handleRetry = useCallback(() => {
    if (writesLocked || save.feedback?.kind !== 'alert') {
      return;
    }
    void save.savePath(save.feedback.path);
  }, [save, writesLocked]);

  useEffect(() => {
    if (save.feedback !== null && !visibleOpenPaths.includes(save.feedback.path)) {
      save.clearFeedback();
    }
  }, [save, visibleOpenPaths]);

  useEffect(() => {
    if (save.feedback?.kind === 'status' && visibleActivePath !== save.feedback.path) {
      save.clearFeedback();
    }
  }, [save, visibleActivePath]);

  useEffect(() => {
    if (
      save.feedback?.kind === 'status' &&
      save.feedback.message === 'Saved' &&
      dirtyPaths.has(save.feedback.path)
    ) {
      save.clearFeedback();
    }
  }, [dirtyPaths, save]);

  useEffect(() => {
    const pending = pendingDisposeRef.current;
    if (pending.length === 0) {
      return;
    }
    const stillPending: ProjectRelativePath[] = [];
    pendingDisposeRef.current = [];
    for (const path of pending) {
      if (path === visibleActivePath) {
        stillPending.push(path);
      } else {
        workspaceBufferRegistry.remove(projectId, path);
        disposeProjectModel(projectId, path);
      }
    }
    pendingDisposeRef.current = stillPending;
  }, [projectId, visibleActivePath, visibleOpenPaths]);

  const tabs: EditorTab[] = visibleOpenPaths.map((path) => ({
    path,
    title: fileName(path),
    isDirty: dirtyPaths.has(path),
  }));

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <EditorTabs
        tabs={tabs}
        activePath={visibleActivePath}
        onSelect={handleSelect}
        onClose={handleClose}
        onReorder={handleReorder}
        onSave={canSave ? handleSave : undefined}
        saveDisabled={
          writesLocked || !isSaveEnabled({ dirty: activeDirty, writePending: save.writePending })
        }
        savePending={save.writePending}
      />
      {save.feedback?.kind === 'alert' && save.feedback.path === visibleActivePath ? (
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <InlineAlert>{save.feedback.message}</InlineAlert>
          <Button type="button" variant="outline" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      ) : null}
      {save.feedback?.kind === 'status' && save.feedback.path === visibleActivePath ? (
        <p
          role="status"
          aria-label={save.feedback.message}
          className="px-3 py-1 text-sm text-muted-foreground"
        >
          {save.feedback.message}
        </p>
      ) : null}
      <div className="min-h-0 min-w-0 flex-1">
        {visibleOpenPaths.map((path) =>
          path === visibleActivePath ? null : (
            <FileQuerySubscription key={path} projectId={projectId} path={path} />
          ),
        )}
        {visibleActivePath !== null ? (
          <ActiveFileSurface
            key={visibleActivePath}
            projectId={projectId}
            path={visibleActivePath}
            readOnly={writesLocked}
            onSave={() => {
              if (writesLocked) {
                return;
              }
              void save.savePath(visibleActivePath);
            }}
          />
        ) : (
          <EmptyEditorState />
        )}
      </div>
      <div className="flex h-6 shrink-0 items-center justify-between gap-4 border-t border-white/8 bg-[#0c1210] px-3 font-mono text-[9px] uppercase text-white/32">
        <span className="min-w-0 truncate">
          {visibleActivePath ?? '当前没有活动文件'}
        </span>
        <div className="flex shrink-0 items-center gap-3">
          <span className={activeDirty ? 'text-amber-300' : 'text-[#dfff82]/72'}>
            {activeDirty ? '未保存' : '已同步'}
          </span>
          <span>{writesLocked ? '只读' : '可编辑'}</span>
          <span>{activeLanguage}</span>
          <span>revision {workspaceRevision}</span>
        </div>
      </div>
      <UnsavedChangesDialog
        open={closeGuard.open && closeGuard.mode === 'close-tab'}
        mode="close-tab"
        message={closeGuard.open ? closeGuard.message : CLOSE_TAB_MESSAGE}
        busy={save.writePending}
        onSaveAndClose={
          writesLocked
            ? undefined
            : () => {
                void handleSaveAndClose();
              }
        }
        onDiscard={handleDiscardClose}
        onCancel={handleCancelClose}
      />
    </div>
  );
}
