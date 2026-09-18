import { ChevronRight, Pencil, Trash2 } from 'lucide-react';
import type { MouseEvent } from 'react';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { FileTreeEntry, ProjectRelativePath } from '@/contracts/file';
import { useWorkspaceSession } from '@/features/editor/workspaceSession';
import {
  fileQueryErrorMessage,
  sortFileTreeEntries,
  useDirectoryTreeQuery,
} from '@/features/files/fileQueries';
import { cn } from '@/lib/utils';
import { getFileIcon, getFileIconColor } from './fileIcons';

function rowClassName(isSelected: boolean): string {
  return cn(
    'group relative mx-1 flex h-7 cursor-pointer select-none items-center gap-1 rounded-md px-2 text-sm text-white/62',
    'outline-none transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:ring-2 focus-visible:ring-[#dfff82]/30',
    isSelected &&
      'bg-[#dfff82]/10 text-white shadow-[inset_0_0_0_1px_rgba(223,255,130,0.08)] before:absolute before:left-0 before:top-1 before:h-5 before:w-[2px] before:rounded-full before:bg-[#dfff82]',
  );
}

function RowActions({
  name,
  disabled,
  onRename,
  onDelete,
}: {
  name: string;
  disabled: boolean;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <span className="ml-auto flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
      <button
        type="button"
        aria-label={`Rename ${name}`}
        title="重命名"
        disabled={disabled}
        className="grid size-6 place-items-center rounded text-white/38 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-24"
        onClick={(event) => {
          event.stopPropagation();
          onRename();
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
        }}
      >
        <Pencil className="size-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={`Delete ${name}`}
        title="删除"
        disabled={disabled}
        className="grid size-6 place-items-center rounded text-white/38 hover:bg-red-400/15 hover:text-red-200 disabled:pointer-events-none disabled:opacity-24"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
        }}
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}

export function FileTreeNode({
  projectId,
  entry,
  depth,
  tabbablePath,
  onFocusedPath,
  actionsDisabled,
  onRequestRename,
  onRequestDelete,
  onRequestContextMenu,
}: {
  projectId: string;
  entry: FileTreeEntry;
  depth: number;
  tabbablePath: ProjectRelativePath | null;
  onFocusedPath: (path: ProjectRelativePath) => void;
  actionsDisabled: boolean;
  onRequestRename: (path: ProjectRelativePath) => void;
  onRequestDelete: (path: ProjectRelativePath) => void;
  onRequestContextMenu: (
    event: MouseEvent<HTMLElement>,
    path: ProjectRelativePath,
    kind: FileTreeEntry['kind'],
  ) => void;
}) {
  if (entry.kind === 'directory') {
    return (
      <DirectoryTreeNode
        projectId={projectId}
        entry={entry}
        depth={depth}
        tabbablePath={tabbablePath}
        onFocusedPath={onFocusedPath}
        actionsDisabled={actionsDisabled}
        onRequestRename={onRequestRename}
        onRequestDelete={onRequestDelete}
        onRequestContextMenu={onRequestContextMenu}
      />
    );
  }
  return (
    <FileTreeLeaf
      entry={entry}
      depth={depth}
      tabbablePath={tabbablePath}
      onFocusedPath={onFocusedPath}
      actionsDisabled={actionsDisabled}
      onRequestRename={onRequestRename}
      onRequestDelete={onRequestDelete}
      onRequestContextMenu={onRequestContextMenu}
    />
  );
}

function DirectoryTreeNode({
  projectId,
  entry,
  depth,
  tabbablePath,
  onFocusedPath,
  actionsDisabled,
  onRequestRename,
  onRequestDelete,
  onRequestContextMenu,
}: {
  projectId: string;
  entry: FileTreeEntry;
  depth: number;
  tabbablePath: ProjectRelativePath | null;
  onFocusedPath: (path: ProjectRelativePath) => void;
  actionsDisabled: boolean;
  onRequestRename: (path: ProjectRelativePath) => void;
  onRequestDelete: (path: ProjectRelativePath) => void;
  onRequestContextMenu: (
    event: MouseEvent<HTMLElement>,
    path: ProjectRelativePath,
    kind: FileTreeEntry['kind'],
  ) => void;
}) {
  const isExpanded = useWorkspaceSession((state) => state.expandedPaths.has(entry.path));
  const isSelected = useWorkspaceSession((state) => state.selectedPath === entry.path);
  const selectPath = useWorkspaceSession((state) => state.selectPath);
  const toggleDirectory = useWorkspaceSession((state) => state.toggleDirectory);
  const query = useDirectoryTreeQuery(projectId, entry.path);
  const isFocused = tabbablePath === entry.path;
  const isLoading = isExpanded && query.isPending;
  const Icon = getFileIcon(entry.name, true, isExpanded);
  const iconColor = getFileIconColor(entry.name, true);
  const children = query.data ? sortFileTreeEntries(query.data.entries) : [];

  return (
    <>
      <div
        role="treeitem"
        aria-label={entry.name}
        aria-expanded={isExpanded}
        aria-selected={isSelected}
        aria-level={depth + 1}
        tabIndex={isFocused ? 0 : -1}
        data-path={entry.path}
        data-kind="directory"
        className={rowClassName(isSelected)}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={(event) => {
          event.stopPropagation();
          onFocusedPath(entry.path);
          selectPath(entry.path);
          toggleDirectory(entry.path);
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onFocusedPath(entry.path);
          selectPath(entry.path);
          toggleDirectory(entry.path);
        }}
        onContextMenu={(event) => {
          onRequestContextMenu(event, entry.path, 'directory');
        }}
        onFocus={(event) => {
          if (event.target !== event.currentTarget) {
            return;
          }
          onFocusedPath(entry.path);
        }}
      >
        <ChevronRight
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none',
            isExpanded && 'rotate-90',
          )}
          aria-hidden
        />
        {isLoading ? (
          <Spinner />
        ) : (
          <Icon className={cn('h-4 w-4 shrink-0', iconColor)} aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate">{entry.name}</span>
        <RowActions
          name={entry.name}
          disabled={actionsDisabled}
          onRename={() => onRequestRename(entry.path)}
          onDelete={() => onRequestDelete(entry.path)}
        />
      </div>
      {isExpanded ? (
        <div role="group">
          {query.isError ? (
            <div
              className="flex flex-col items-start gap-2 py-1 pr-2"
              style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
            >
              <InlineAlert>
                {fileQueryErrorMessage(query.error, 'Unable to load directory')}
              </InlineAlert>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void query.refetch();
                }}
              >
                Retry
              </Button>
            </div>
          ) : null}
          {query.data && children.length === 0 ? (
            <p
              className="py-1 text-xs text-muted-foreground"
              style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
            >
              Empty
            </p>
          ) : null}
          {children.map((child) => (
            <FileTreeNode
              key={child.path}
              projectId={projectId}
              entry={child}
              depth={depth + 1}
              tabbablePath={tabbablePath}
              onFocusedPath={onFocusedPath}
              actionsDisabled={actionsDisabled}
              onRequestRename={onRequestRename}
              onRequestDelete={onRequestDelete}
              onRequestContextMenu={onRequestContextMenu}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}

function FileTreeLeaf({
  entry,
  depth,
  tabbablePath,
  onFocusedPath,
  actionsDisabled,
  onRequestRename,
  onRequestDelete,
  onRequestContextMenu,
}: {
  entry: FileTreeEntry;
  depth: number;
  tabbablePath: ProjectRelativePath | null;
  onFocusedPath: (path: ProjectRelativePath) => void;
  actionsDisabled: boolean;
  onRequestRename: (path: ProjectRelativePath) => void;
  onRequestDelete: (path: ProjectRelativePath) => void;
  onRequestContextMenu: (
    event: MouseEvent<HTMLElement>,
    path: ProjectRelativePath,
    kind: FileTreeEntry['kind'],
  ) => void;
}) {
  const isSelected = useWorkspaceSession((state) => state.selectedPath === entry.path);
  const selectPath = useWorkspaceSession((state) => state.selectPath);
  const openFile = useWorkspaceSession((state) => state.openFile);
  const isFocused = tabbablePath === entry.path;
  const Icon = getFileIcon(entry.name, false);
  const iconColor = getFileIconColor(entry.name, false);

  return (
    <div
      role="treeitem"
      aria-label={entry.name}
      aria-selected={isSelected}
      aria-level={depth + 1}
      tabIndex={isFocused ? 0 : -1}
      data-path={entry.path}
      data-kind="file"
      className={rowClassName(isSelected)}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={(event) => {
        event.stopPropagation();
        onFocusedPath(entry.path);
        selectPath(entry.path);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onFocusedPath(entry.path);
        selectPath(entry.path);
        openFile(entry.path);
      }}
      onContextMenu={(event) => {
        onRequestContextMenu(event, entry.path, 'file');
      }}
      onFocus={(event) => {
        if (event.target !== event.currentTarget) {
          return;
        }
        onFocusedPath(entry.path);
      }}
    >
      <span className="w-4 shrink-0" />
      <Icon className={cn('h-4 w-4 shrink-0', iconColor)} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{entry.name}</span>
      <RowActions
        name={entry.name}
        disabled={actionsDisabled}
        onRename={() => onRequestRename(entry.path)}
        onDelete={() => onRequestDelete(entry.path)}
      />
    </div>
  );
}
