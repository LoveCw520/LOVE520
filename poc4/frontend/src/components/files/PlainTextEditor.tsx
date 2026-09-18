import { useLayoutEffect, useState, type KeyboardEvent } from 'react';
import { workspaceBufferRegistry } from '@/app/appRuntime';
import type { FileMetadata, ProjectRelativePath } from '@/contracts/file';
import type { WorkspaceBuffer } from '@/features/editor/editorTypes';
import { formatFileSize } from '@/lib/languageForFile';
import { ensureWorkspaceBuffer, replacePlainTextContent } from './editorSaveCommand';

function currentPlainTextBuffer(
  projectId: string,
  path: ProjectRelativePath,
): WorkspaceBuffer | null {
  const existing = workspaceBufferRegistry.get(projectId, path);
  return existing?.kind === 'plain-text' ? existing : null;
}

export function PlainTextEditor({
  projectId,
  path,
  metadata,
  content,
  readOnly,
  onSave,
}: {
  projectId: string;
  path: ProjectRelativePath;
  metadata: FileMetadata;
  content: string;
  readOnly: boolean;
  onSave: () => void;
}) {
  const [buffer, setBuffer] = useState(() => currentPlainTextBuffer(projectId, path));
  const current = buffer !== null && buffer.path === path ? buffer : null;

  useLayoutEffect(() => {
    setBuffer(
      ensureWorkspaceBuffer({
        projectId,
        path,
        kind: 'plain-text',
        content,
      }),
    );
  }, [projectId, path, content]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (readOnly) {
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      onSave();
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-white/10 bg-[#0d1311] px-3 text-xs">
        <span className="truncate font-medium text-white/82">{metadata.name}</span>
        <span className="text-white/34">{formatFileSize(metadata.sizeBytes)}</span>
        <span className="rounded border border-white/10 bg-white/[0.035] px-2 py-0.5 font-mono text-[9px] uppercase text-white/38">
          纯文本
          <span className="sr-only">Plain text</span>
        </span>
      </div>
      {current !== null ? (
        <textarea
          key={`${projectId}:${path}:plain-text`}
          wrap="off"
          spellCheck={false}
          readOnly={readOnly}
          defaultValue={current.snapshot().content}
          aria-label={metadata.name}
          onChange={(event) => {
            if (readOnly) {
              return;
            }
            replacePlainTextContent(projectId, path, event.target.value);
          }}
          onKeyDown={handleKeyDown}
          className="min-h-0 w-full flex-1 resize-none bg-[#0b100e] p-4 font-mono text-sm leading-6 text-[#e7efeb] caret-[#dfff82] outline-none selection:bg-[#dfff82]/20"
        />
      ) : null}
    </div>
  );
}
