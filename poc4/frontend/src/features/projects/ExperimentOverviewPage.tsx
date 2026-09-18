import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Cpu,
  FileCode2,
  FileText,
  FlaskConical,
  GitCompareArrows,
  GitBranch,
  Play,
  ShieldCheck,
  TerminalSquare,
} from 'lucide-react';
import { Link } from 'react-router';
import { Spinner } from '@/components/ui/spinner';
import type { ProjectSummary } from '@/contracts/project';
import {
  flattenRunHistoryPages,
  useRunHistoryQuery,
} from '@/features/runs/runQueries';
import { parseProjectDirectoryPath } from '@/features/files/pathPolicy';
import { useDirectoryTreeQuery } from '@/features/files/fileQueries';

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
}

function runStateLabel(state: string): string {
  if (state === 'SUCCEEDED') return '运行成功';
  if (state === 'FAILED') return '运行失败';
  if (state === 'RUNNING') return '运行中';
  if (state === 'STARTING') return '环境准备中';
  if (state === 'STOPPING') return '停止中';
  if (state === 'TIMED_OUT') return '已超时';
  if (state === 'CANCELLED') return '已取消';
  return state;
}

export function ExperimentOverviewPage({ project }: { project: ProjectSummary }) {
  const workbenchPath = `/projects/${encodeURIComponent(project.id)}/workbench`;
  const runPath = `${workbenchPath}?panel=run`;
  const treeQuery = useDirectoryTreeQuery(project.id, parseProjectDirectoryPath(''));
  const historyQuery = useRunHistoryQuery(project.id);
  const latestRun = flattenRunHistoryPages(historyQuery.data?.pages ?? [])[0] ?? null;
  const files = treeQuery.data?.entries.slice(0, 6) ?? [];

  return (
    <div className="min-h-full bg-[#151d1a] text-white">
      <header className="flex h-14 items-center gap-3 border-b border-white/12 bg-[#1b2420]/96 px-5 sm:px-8">
        <Link
          to="/projects"
          aria-label="Back to projects"
          className="grid size-8 place-items-center rounded-md text-white/48 hover:bg-white/8 hover:text-white"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <span className="grid size-7 place-items-center rounded-md border border-[#dfff82]/24 bg-[#dfff82]/6 font-mono text-[10px] font-bold text-[#dfff82]">
          码
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{project.name}</p>
          <p className="mt-0.5 font-mono text-[9px] uppercase text-white/28">Experiment overview</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.035] px-2.5 py-1 font-mono text-[10px] uppercase text-white/58">
          <span className="size-1.5 rounded-full bg-[#dfff82] shadow-[0_0_10px_rgba(223,255,130,0.7)]" />
          {project.state}
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <section className="relative overflow-hidden rounded-lg border border-white/14 bg-[#202a26] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.28)] sm:p-8">
          <div className="absolute right-0 top-0 h-px w-72 bg-[linear-gradient(90deg,transparent,rgba(223,255,130,0.72))]" />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:items-end">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-[#dfff82]">
                <FlaskConical className="size-4" aria-hidden="true" />
                Reproducible experiment
              </div>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[0] sm:text-5xl">
                {project.name}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/58">
                标准化 Java 实验环境，包含代码工作区、Maven 测试命令、运行日志和复现证据。
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to={workbenchPath}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-[#dfff82] bg-[#dfff82] px-4 text-sm font-semibold text-[#10140d] hover:bg-[#edffb2]"
                >
                  进入实验工作台
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  to={runPath}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-white/16 bg-white/[0.045] px-4 text-sm text-white/78 hover:bg-white/[0.075] hover:text-white"
                >
                  <Play className="size-4 text-[#dfff82]" aria-hidden="true" />
                  查看运行与诊断
                </Link>
                <Link
                  to={`/projects/${encodeURIComponent(project.id)}/compare`}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-white/16 bg-white/[0.045] px-4 text-sm text-white/78 hover:bg-white/[0.075] hover:text-white"
                >
                  <GitCompareArrows className="size-4 text-sky-300" aria-hidden="true" />
                  运行对比
                </Link>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-white/10 bg-black/14 p-3">
                <dt className="font-mono text-[9px] uppercase text-white/32">Runtime</dt>
                <dd className="mt-2 flex items-center gap-2 text-sm text-white/78">
                  <Cpu className="size-4 text-sky-300" aria-hidden="true" />
                  Java 17
                </dd>
              </div>
              <div className="rounded-md border border-white/10 bg-black/14 p-3">
                <dt className="font-mono text-[9px] uppercase text-white/32">Build</dt>
                <dd className="mt-2 flex items-center gap-2 text-sm text-white/78">
                  <TerminalSquare className="size-4 text-[#dfff82]" aria-hidden="true" />
                  Maven 3
                </dd>
              </div>
              <div className="col-span-2 rounded-md border border-white/10 bg-black/14 p-3">
                <dt className="font-mono text-[9px] uppercase text-white/32">Run command</dt>
                <dd className="mt-2 font-mono text-xs text-[#dfff82]">mvn clean test</dd>
              </div>
            </dl>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <section className="rounded-lg border border-white/12 bg-[#202a26] p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <GitBranch className="size-4 text-[#dfff82]" aria-hidden="true" />
              <h2 className="text-base font-semibold">实验蓝图</h2>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ['环境', 'Java 17 + Maven 3', ShieldCheck],
                ['执行', 'mvn clean test', TerminalSquare],
                ['证据', 'Revision + Log + Exit', FileCode2],
              ].map(([label, value, Icon]) => (
                <div className="rounded-md border border-white/10 bg-white/[0.035] p-3" key={String(label)}>
                  <Icon className="size-4 text-[#dfff82]" aria-hidden="true" />
                  <p className="mt-3 font-mono text-[9px] uppercase text-white/32">{label as string}</p>
                  <p className="mt-1 text-sm text-white/72">{value as string}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-medium text-white/82">初始文件</h3>
                <span className="font-mono text-[9px] uppercase text-white/28">
                  Workspace root
                </span>
              </div>
              {treeQuery.isPending ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-white/42">
                  <Spinner className="text-white/42" />
                  正在读取文件
                </div>
              ) : (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {files.map((entry) => (
                    <li
                      className="flex items-center gap-2 rounded-md border border-white/8 bg-black/12 px-3 py-2 font-mono text-xs text-white/62"
                      key={entry.path}
                    >
                      {entry.kind === 'directory' ? (
                        <GitBranch className="size-3.5 text-amber-300" aria-hidden="true" />
                      ) : (
                        <FileText className="size-3.5 text-sky-300" aria-hidden="true" />
                      )}
                      <span className="truncate">{entry.path}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <aside className="rounded-lg border border-white/12 bg-[#202a26] p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Clock3 className="size-4 text-[#dfff82]" aria-hidden="true" />
              <h2 className="text-base font-semibold">最近运行</h2>
            </div>
            {historyQuery.isPending ? (
              <div className="mt-5 flex items-center gap-2 text-sm text-white/42">
                <Spinner className="text-white/42" />
                正在读取运行记录
              </div>
            ) : latestRun === null ? (
              <div className="mt-5 rounded-md border border-dashed border-white/14 bg-black/10 px-4 py-8 text-center">
                <p className="text-sm text-white/58">暂无运行记录</p>
                <p className="mt-2 text-xs text-white/34">进入工作台后可以启动第一次实验。</p>
              </div>
            ) : (
              <div className="mt-5 rounded-md border border-white/10 bg-black/14 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-white">
                    {runStateLabel(latestRun.state)}
                  </span>
                  <span className="font-mono text-[9px] uppercase text-white/30">
                    {latestRun.id}
                  </span>
                </div>
                <dl className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/34">创建时间</dt>
                    <dd className="text-right text-white/64">{formatDate(latestRun.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/34">退出码</dt>
                    <dd className="font-mono text-white/64">{latestRun.exitCode ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/34">Workspace revision</dt>
                    <dd className="max-w-[170px] truncate font-mono text-white/64">
                      {latestRun.requestedWorkspaceRevision}
                    </dd>
                  </div>
                </dl>
                <Link
                  to={runPath}
                  className="mt-4 inline-flex items-center gap-2 text-xs text-[#dfff82] hover:underline"
                >
                  查看运行证据
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
