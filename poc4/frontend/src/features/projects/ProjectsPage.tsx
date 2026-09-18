import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { CloudCog, FolderCode, LogOut, Search, X } from 'lucide-react';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { logout } from '../../app/appRuntime';
import { Button } from '@/components/ui/button';
import { ActivityCenter } from '@/components/activity/ActivityCenter';
import { CommandPalette } from '@/components/commands/CommandPalette';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useAuth } from '../auth/AuthProvider';
import { CreateProjectForm } from './CreateProjectForm';
import { ProjectCard } from './ProjectCard';
import { useProjectsQuery } from './projectQueries';

gsap.registerPlugin(useGSAP);

function isNetworkError(error: unknown): boolean {
  return error instanceof Error && /network request failed/i.test(error.message);
}

export function AppChrome({ title, children }: { title: string; children: ReactNode }) {
  const { snapshot } = useAuth();
  const username = snapshot.status === 'authenticated' ? snapshot.user.username : '';

  return (
    <div className="flex min-h-full flex-col bg-[#1a2320] text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/14 bg-[#202a26]/96 px-5 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-md border border-[#dfff82]/35 bg-[#dfff82]/8 font-mono text-xs font-bold text-[#dfff82]">
            码
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">码瑙</span>
            <span className="font-mono text-[10px] uppercase text-white/38">Manao</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[10px] uppercase text-white/40 sm:inline">
            成员 / {username}
          </span>
          <span className="hidden size-1.5 rounded-full bg-[#dfff82] shadow-[0_0_12px_rgba(223,255,130,0.8)] sm:block" />
          <span className="text-sm text-white/64">{username}</span>
          <CommandPalette />
          <ActivityCenter />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Log out"
            className="text-white/58 hover:bg-white/8 hover:text-white"
            onClick={() => logout()}
          >
            <LogOut />
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),transparent_340px)] px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <div className="flex flex-col gap-4 border-b border-white/14 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase text-[#dfff82]">
              可复现云端实验平台
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[0] text-white">{title}</h1>
          </div>
        <div className="flex items-center gap-2 rounded-md border border-white/14 bg-white/[0.055] px-3 py-2 font-mono text-[10px] uppercase text-white/62">
          <CloudCog className="size-4 text-[#dfff82]" aria-hidden="true" />
          证据链路就绪
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

export function ProjectsPage() {
  const query = useProjectsQuery();
  const pageRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<'ALL' | 'READY' | 'CREATING' | 'FAILED'>('ALL');
  const listReady = query.data !== undefined;
  const limit = query.data?.limit ?? 3;
  const items = query.data?.items ?? [];
  const atLimit = listReady && items.length >= limit;
  const formLocked = !listReady || query.isError;
  const filteredItems = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    return items.filter((project) => {
      const matchesState = stateFilter === 'ALL' || project.state === stateFilter;
      const matchesQuery =
        normalized.length === 0 ||
        project.name.toLowerCase().includes(normalized) ||
        project.id.toLowerCase().includes(normalized);
      return matchesState && matchesQuery;
    });
  }, [items, searchQuery, stateFilter]);

  useGSAP(
    () => {
      const root = pageRef.current;
      if (root === null) {
        return;
      }
      const reduceMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const createPanel = root.querySelector<HTMLElement>('.project-create-panel');
      const cards = root.querySelectorAll<HTMLElement>('.project-card');
      const emptyState = root.querySelector<HTMLElement>('.project-empty');
      const timeline = gsap.timeline({
        defaults: { ease: 'power3.out' },
      });

      if (createPanel !== null) {
        timeline.fromTo(
          createPanel,
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: reduceMotion ? 0 : 0.65 },
          0.05,
        );
      }
      if (cards.length > 0) {
        timeline.fromTo(
          cards,
          { opacity: 0, y: 26 },
          {
            opacity: 1,
            y: 0,
            duration: reduceMotion ? 0 : 0.58,
            stagger: reduceMotion ? 0 : 0.08,
          },
          0.18,
        );
      }
      if (emptyState !== null) {
        timeline.fromTo(
          emptyState,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: reduceMotion ? 0 : 0.55 },
          0.2,
        );
      }
    },
    {
      scope: pageRef,
      dependencies: [filteredItems.length, searchQuery, stateFilter],
      revertOnUpdate: true,
    },
  );

  return (
    <AppChrome title="实验控制台">
      <div ref={pageRef} className="flex flex-col gap-5">
        <CreateProjectForm locked={formLocked} limitReached={atLimit} />
        {query.data && query.data.items.length > 0 ? (
          <div className="project-search flex flex-col gap-3 rounded-lg border border-white/12 bg-[#202a26] p-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/34"
                aria-hidden="true"
              />
              <input
                value={searchQuery}
                aria-label="搜索实验"
                placeholder="搜索实验名称或编号"
                className="h-10 w-full rounded-md border border-white/12 bg-[#171e1c] pl-9 pr-9 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#dfff82]/45 focus:ring-2 focus:ring-[#dfff82]/10"
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery.length > 0 ? (
                <button
                  type="button"
                  aria-label="清空实验搜索"
                  className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-white/34 hover:bg-white/8 hover:text-white"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <select
              value={stateFilter}
              aria-label="筛选实验状态"
              className="h-10 rounded-md border border-white/12 bg-[#171e1c] px-3 text-sm text-white/72 outline-none focus:border-[#dfff82]/45"
              onChange={(event) =>
                setStateFilter(event.target.value as typeof stateFilter)
              }
            >
              <option value="ALL">全部状态</option>
              <option value="READY">READY</option>
              <option value="CREATING">CREATING</option>
              <option value="FAILED">FAILED</option>
            </select>
            <span className="shrink-0 font-mono text-[10px] uppercase text-white/34">
              {filteredItems.length} / {items.length}
            </span>
          </div>
        ) : null}
        {query.isPending ? <LoadingState label="Loading projects" /> : null}
        {query.isError ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-red-300/25 bg-red-400/10 p-5">
            <InlineAlert>
              {isNetworkError(query.error) ? 'Network request failed' : 'Unable to load projects'}
            </InlineAlert>
            <Button
              type="button"
              variant="outline"
              className="border-white/16 bg-white/6 text-white hover:bg-white/10"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : null}
        {query.data && query.data.items.length === 0 ? (
          <div className="project-empty flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-white/18 bg-[#27312d] px-6 text-center shadow-[0_18px_48px_rgba(0,0,0,0.2)]">
            <FolderCode className="size-8 text-[#dfff82]" aria-hidden="true" />
            <p className="mt-4 text-sm font-medium text-white">
              还没有实验工作区
              <span className="sr-only">No projects yet.</span>
            </p>
            <p className="mt-1 text-sm text-white/56">创建你的第一个可复现实验工作区。</p>
          </div>
        ) : null}
        {query.data && query.data.items.length > 0 && filteredItems.length === 0 ? (
          <div className="project-empty flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-white/18 bg-[#27312d] px-6 text-center">
            <Search className="size-7 text-[#dfff82]" aria-hidden="true" />
            <p className="mt-3 text-sm text-white/64">没有匹配的实验</p>
          </div>
        ) : null}
        {query.data && filteredItems.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((project) => (
              <li className="project-card" key={project.id}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </AppChrome>
  );
}
