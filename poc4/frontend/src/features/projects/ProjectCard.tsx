import { Link, useNavigate } from 'react-router';
import { ArrowUpRight, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { ProjectSummary } from '../../contracts/project';

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const titleId = `project-${project.id}-name`;
  const navigate = useNavigate();
  const projectPath = `/projects/${encodeURIComponent(project.id)}`;

  return (
    <article
      aria-labelledby={titleId}
      className="group relative h-full overflow-hidden rounded-lg border border-white/16 bg-[#27312d] p-5 shadow-[0_22px_58px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.045)] transition duration-300 hover:-translate-y-1 hover:border-[#dfff82]/40 hover:bg-[#303c36]"
      onDoubleClick={() => {
        if (project.state === 'READY') {
          void navigate(projectPath);
        }
      }}
    >
      <span className="absolute right-0 top-0 h-px w-32 bg-[linear-gradient(90deg,transparent,rgba(223,255,130,0.72))]" />
      <div className="flex h-full items-start justify-between gap-5">
        <div className="flex min-w-0 flex-col">
          <span className="mb-4 grid size-9 place-items-center rounded-md border border-white/14 bg-white/[0.06] font-mono text-xs text-[#dfff82]">
            &lt;/&gt;
          </span>
          <h2 id={titleId} className="truncate text-base font-semibold text-white">
            {project.name}
          </h2>
          <p className="mt-2 font-mono text-[10px] uppercase text-white/52">
            编号 / {project.id}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span
              className={
                project.state === 'READY'
                  ? 'size-1.5 rounded-full bg-[#dfff82] shadow-[0_0_10px_rgba(223,255,130,0.7)]'
                  : project.state === 'CREATING'
                    ? 'size-1.5 rounded-full bg-amber-300'
                    : 'size-1.5 rounded-full bg-red-400'
              }
            />
            <p className="font-mono text-[10px] uppercase text-white/64">{project.state}</p>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-white/48">
            <Clock3 className="size-3.5" aria-hidden="true" />
            {new Date(project.createdAt).toLocaleDateString('zh-CN')}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 font-mono text-[9px] uppercase text-white/48">
            <span className="rounded border border-white/10 bg-white/[0.035] px-2 py-1">
              Java 17
            </span>
            <span className="rounded border border-white/10 bg-white/[0.035] px-2 py-1">
              Maven 测试
            </span>
            <span className="rounded border border-white/10 bg-white/[0.035] px-2 py-1">
              运行证据
            </span>
          </div>
          {project.state === 'FAILED' && project.failureReason ? (
            <p className="mt-3 text-sm text-red-200">{project.failureReason}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3">
          {project.state === 'CREATING' ? <Spinner className="text-amber-300" /> : null}
          {project.state === 'READY' ? (
            <Button
              render={
                <Link
                  to={projectPath}
                  aria-label="Open"
                />
              }
              className="border-[#dfff82]/35 bg-[#dfff82]/8 text-[#dfff82] hover:bg-[#dfff82]/16"
            >
              打开
              <ArrowUpRight className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Button>
          ) : null}
          {project.state === 'CREATING' ? (
            <Button
              type="button"
              disabled
              aria-label="Open"
              className="border-white/12 bg-white/[0.035] text-white/38"
            >
              打开
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
