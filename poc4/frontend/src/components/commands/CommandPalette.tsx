import {
  FileCode2,
  FlaskConical,
  LogOut,
  Play,
  Search,
  SquareTerminal,
  Workflow,
  Command as CommandIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router';
import { logout } from '@/app/appRuntime';
import { useWorkspaceSession } from '@/features/editor/workspaceSession';
import { useProjectsQuery } from '@/features/projects/projectQueries';
import { cn } from '@/lib/utils';

type Command = {
  id: string;
  label: string;
  detail: string;
  icon: typeof Search;
  run(): void;
};

function projectIdFromPath(pathname: string): string | null {
  const match = /^\/projects\/([^/]+)/.exec(pathname);
  return match?.[1] === undefined ? null : decodeURIComponent(match[1]);
}

export function CommandPalette() {
  const navigate = useNavigate();
  const location = useLocation();
  const openPaths = useWorkspaceSession((state) => state.openPaths);
  const projectsQuery = useProjectsQuery();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const projectId = projectIdFromPath(location.pathname);
  const workbench = location.pathname.endsWith('/workbench');

  const commands = useMemo<Command[]>(() => {
    const projectPath = projectId === null ? null : `/projects/${encodeURIComponent(projectId)}`;
    const items: Command[] = [
      {
        id: 'projects',
        label: '打开实验控制台',
        detail: '返回所有实验工作区',
        icon: Workflow,
        run: () => void navigate('/projects'),
      },
    ];
    for (const project of projectsQuery.data?.items ?? []) {
      items.push({
        id: `project:${project.id}`,
        label: `打开实验 ${project.name}`,
        detail: `查看实验概览、运行状态与诊断证据 · ${project.state}`,
        icon: FlaskConical,
        run: () => void navigate(`/projects/${encodeURIComponent(project.id)}`),
      });
    }
    if (projectPath !== null) {
      items.push(
        {
          id: 'overview',
          label: '打开实验概览',
          detail: '查看实验蓝图与最近运行',
          icon: FileCode2,
          run: () => void navigate(projectPath),
        },
        {
          id: 'compare',
          label: '打开运行对比',
          detail: '比较两次运行的状态与证据',
          icon: Workflow,
          run: () => void navigate(`${projectPath}/compare`),
        },
      );
    }
    if (projectId !== null && workbench) {
      const workbenchPath = `/projects/${encodeURIComponent(projectId)}/workbench`;
      items.push(
        {
          id: 'panel-file',
          label: '切换到代码面板',
          detail: 'File / Editor',
          icon: FileCode2,
          run: () => void navigate(`${workbenchPath}?panel=file`),
        },
        {
          id: 'panel-run',
          label: '切换到运行面板',
          detail: 'Run / Evidence',
          icon: Play,
          run: () => void navigate(`${workbenchPath}?panel=run`),
        },
        {
          id: 'panel-terminal',
          label: '切换到终端面板',
          detail: 'Terminal',
          icon: SquareTerminal,
          run: () => void navigate(`${workbenchPath}?panel=terminal`),
        },
      );
      for (const path of openPaths.slice(0, 10)) {
        items.push({
          id: `file:${path}`,
          label: `打开文件 ${path}`,
          detail: 'Workspace file',
          icon: FileCode2,
          run: () => {
            useWorkspaceSession.getState().openFile(path);
            void navigate(`${workbenchPath}?panel=file`);
          },
        });
      }
    }
    items.push({
      id: 'logout',
      label: '退出登录',
      detail: '结束当前会话',
      icon: LogOut,
      run: () => logout(),
    });
    return items;
  }, [navigate, openPaths, projectId, projectsQuery.data?.items, workbench]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized.length === 0) {
      return commands;
    }
    return commands.filter((command) =>
      `${command.label} ${command.detail}`.toLowerCase().includes(normalized),
    );
  }, [commands, query]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      } else if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      return;
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  function execute(command: Command | undefined): void {
    if (command === undefined) {
      return;
    }
    setOpen(false);
    command.run();
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="命令面板"
        className="hidden h-8 items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-2.5 text-xs text-white/44 hover:bg-white/[0.06] hover:text-white md:flex"
        onClick={() => setOpen(true)}
      >
        <CommandIcon className="size-3.5" aria-hidden="true" />
        <span>快捷命令</span>
        <kbd className="rounded border border-white/10 bg-black/20 px-1.5 py-0.5 font-mono text-[8px] text-white/34">
          Ctrl K
        </kbd>
      </button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[300] flex items-start justify-center bg-black/58 px-4 pt-[14vh] backdrop-blur-sm"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setOpen(false);
                }
              }}
            >
              <div
                role="dialog"
                aria-label="命令面板"
                className="w-full max-w-xl overflow-hidden rounded-lg border border-white/16 bg-[#171e1b] shadow-[0_30px_90px_rgba(0,0,0,0.62)]"
              >
                <div className="flex items-center gap-3 border-b border-white/10 px-4">
                  <Search className="size-4 text-[#dfff82]" aria-hidden="true" />
                  <input
                    ref={inputRef}
                    value={query}
                    className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/28"
                    placeholder="搜索页面、面板或文件…"
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setActiveIndex(0);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setActiveIndex((current) => Math.min(current + 1, filtered.length - 1));
                      } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        setActiveIndex((current) => Math.max(current - 1, 0));
                      } else if (event.key === 'Enter') {
                        event.preventDefault();
                        execute(filtered[activeIndex]);
                      }
                    }}
                  />
                </div>
                <div className="max-h-[420px] overflow-auto py-1">
                  {filtered.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-white/34">没有匹配的命令</p>
                  ) : (
                    filtered.map((command, index) => {
                      const Icon = command.icon;
                      return (
                        <button
                          type="button"
                          key={command.id}
                          className={cn(
                            'flex w-full items-center gap-3 px-4 py-3 text-left',
                            index === activeIndex ? 'bg-[#dfff82]/10' : 'hover:bg-white/[0.045]',
                          )}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => execute(command)}
                        >
                          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.035]">
                            <Icon className="size-4 text-[#dfff82]" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-white/82">
                              {command.label}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-white/34">
                              {command.detail}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
