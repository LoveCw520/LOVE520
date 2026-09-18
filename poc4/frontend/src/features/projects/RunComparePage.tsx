import { ArrowLeft, ArrowRight, GitCompareArrows, Play } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Spinner } from '@/components/ui/spinner';
import type { ProjectSummary } from '@/contracts/project';
import type { RunId, RunSummary } from '@/contracts/run';
import {
  flattenRunHistoryPages,
  useRunHistoryQuery,
} from '@/features/runs/runQueries';

function formatTime(value: string | null): string {
  if (value === null) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
}

function durationLabel(run: RunSummary): string {
  if (run.startedAt === null || run.finishedAt === null) return '—';
  const seconds = Math.max(0, Math.round((Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1000));
  return `${seconds}s`;
}

function compareRow(
  label: string,
  left: string,
  right: string,
): { label: string; left: string; right: string; changed: boolean } {
  return { label, left, right, changed: left !== right };
}

export function RunComparePage({ project }: { project: ProjectSummary }) {
  const historyQuery = useRunHistoryQuery(project.id);
  const runs = useMemo(
    () => flattenRunHistoryPages(historyQuery.data?.pages ?? []).slice(0, 20),
    [historyQuery.data],
  );
  const [leftId, setLeftId] = useState<RunId | null>(null);
  const [rightId, setRightId] = useState<RunId | null>(null);

  useEffect(() => {
    if (runs.length === 0) {
      setLeftId(null);
      setRightId(null);
      return;
    }
    setLeftId((current) =>
      current !== null && runs.some((run) => run.id === current) ? current : runs[1]?.id ?? runs[0].id,
    );
    setRightId((current) =>
      current !== null && runs.some((run) => run.id === current) ? current : runs[0].id,
    );
  }, [runs]);

  const left = runs.find((run) => run.id === leftId) ?? null;
  const right = runs.find((run) => run.id === rightId) ?? null;
  const rows =
    left === null || right === null
      ? []
      : [
          compareRow('状态', left.state, right.state),
          compareRow('退出码', String(left.exitCode ?? '—'), String(right.exitCode ?? '—')),
          compareRow(
            '终止原因',
            left.terminationReason ?? '—',
            right.terminationReason ?? '—',
          ),
          compareRow(
            'Workspace revision',
            left.requestedWorkspaceRevision,
            right.requestedWorkspaceRevision,
          ),
          compareRow('耗时', durationLabel(left), durationLabel(right)),
          compareRow('开始时间', formatTime(left.startedAt), formatTime(right.startedAt)),
          compareRow('结束时间', formatTime(left.finishedAt), formatTime(right.finishedAt)),
          compareRow(
            '日志截断',
            left.logTruncated ? `是 · ${left.logEvictedBytes} bytes` : '否',
            right.logTruncated ? `是 · ${right.logEvictedBytes} bytes` : '否',
          ),
        ];
  const changedCount = rows.filter((row) => row.changed).length;

  return (
    <div className="min-h-full bg-[#151d1a] text-white">
      <header className="flex h-14 items-center gap-3 border-b border-white/12 bg-[#1b2420]/96 px-5 sm:px-8">
        <Link
          to={`/projects/${encodeURIComponent(project.id)}`}
          aria-label="返回实验概览"
          className="grid size-8 place-items-center rounded-md text-white/48 hover:bg-white/8 hover:text-white"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <GitCompareArrows className="size-4 text-[#dfff82]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{project.name}</p>
          <p className="mt-0.5 font-mono text-[9px] uppercase text-white/28">Run comparison</p>
        </div>
        <Link
          to={`/projects/${encodeURIComponent(project.id)}/workbench?panel=run`}
          className="inline-flex h-8 items-center gap-2 rounded-md border border-[#dfff82]/28 bg-[#dfff82]/8 px-3 text-xs text-[#dfff82] hover:bg-[#dfff82]/14"
        >
          <Play className="size-3.5" aria-hidden="true" />
          打开运行面板
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <section className="rounded-lg border border-white/14 bg-[#202a26] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase text-[#dfff82]">Metadata diff</p>
              <h1 className="mt-2 text-3xl font-semibold">运行对比</h1>
              <p className="mt-2 text-sm text-white/48">
                对比两次运行的状态、退出码、revision、耗时和日志窗口。
              </p>
            </div>
            <span className="rounded-md border border-white/10 bg-black/14 px-3 py-2 font-mono text-[10px] uppercase text-white/48">
              {changedCount} differences
            </span>
          </div>

          {historyQuery.isPending ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-white/48">
              <Spinner className="text-white/42" />
              正在读取运行历史
            </div>
          ) : runs.length === 0 ? (
            <div className="mt-6 rounded-md border border-dashed border-white/14 p-8 text-center text-sm text-white/48">
              暂无可对比的运行记录。
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <label className="rounded-md border border-white/10 bg-black/14 p-3">
                  <span className="font-mono text-[9px] uppercase text-white/34">左侧运行</span>
                  <select
                    value={leftId ?? ''}
                    className="mt-2 h-9 w-full rounded-md border border-white/12 bg-[#111715] px-3 text-sm text-white outline-none focus:border-[#dfff82]/45"
                    onChange={(event) => setLeftId(event.target.value as RunId)}
                  >
                    {runs.map((run) => (
                      <option key={run.id} value={run.id}>
                        {run.id} · {run.state}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rounded-md border border-white/10 bg-black/14 p-3">
                  <span className="font-mono text-[9px] uppercase text-white/34">右侧运行</span>
                  <select
                    value={rightId ?? ''}
                    className="mt-2 h-9 w-full rounded-md border border-white/12 bg-[#111715] px-3 text-sm text-white outline-none focus:border-[#dfff82]/45"
                    onChange={(event) => setRightId(event.target.value as RunId)}
                  >
                    {runs.map((run) => (
                      <option key={run.id} value={run.id}>
                        {run.id} · {run.state}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-5 overflow-hidden rounded-md border border-white/10">
                <div className="grid grid-cols-[140px_1fr_1fr] bg-[#18201d] px-4 py-3 font-mono text-[9px] uppercase text-white/34">
                  <span>字段</span>
                  <span>{leftId}</span>
                  <span className="flex items-center gap-1.5">
                    {rightId}
                    <ArrowRight className="size-3" aria-hidden="true" />
                  </span>
                </div>
                {rows.map((row) => (
                  <div
                    className="grid grid-cols-[140px_1fr_1fr] border-t border-white/8 px-4 py-3 text-xs"
                    key={row.label}
                  >
                    <span className="text-white/38">{row.label}</span>
                    <span className={row.changed ? 'text-amber-200' : 'text-white/68'}>
                      {row.left}
                    </span>
                    <span className={row.changed ? 'text-[#dfff82]' : 'text-white/68'}>
                      {row.right}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
