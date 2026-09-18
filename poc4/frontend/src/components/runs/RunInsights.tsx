import {
  Ban,
  BrainCircuit,
  CircleCheck,
  CircleX,
  Fingerprint,
  Loader2,
  Minus,
  Route,
} from 'lucide-react';
import { useSyncExternalStore, type CSSProperties } from 'react';
import type { RunSummary } from '@/contracts/run';
import {
  EMPTY_LOG_WINDOW,
  RunLogStore,
  type RunLogSnapshot,
} from '@/features/logs/RunLogStore';
import { cn } from '@/lib/utils';

type StageStatus = 'done' | 'active' | 'pending' | 'failed' | 'stopped';

type Stage = {
  label: string;
  detail: string;
  status: StageStatus;
};

type Diagnosis = {
  title: string;
  evidence: string;
  nextStep: string;
};

const EMPTY_SNAPSHOT: RunLogSnapshot = {
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

function getEmptySnapshot(): RunLogSnapshot {
  return EMPTY_SNAPSHOT;
}

function statusStage(
  status: StageStatus,
  label: string,
  detail: string,
): Stage {
  return { status, label, detail };
}

function runStages(run: RunSummary | null): Stage[] {
  if (run === null) {
    return [
      statusStage('pending', '环境准备', '等待实验启动'),
      statusStage('pending', '依赖与编译', '等待运行策略'),
      statusStage('pending', '执行测试', '等待代码执行'),
      statusStage('pending', '归档证据', '等待运行结果'),
    ];
  }

  if (run.state === 'STARTING') {
    return [
      statusStage('active', '环境准备', '正在分配隔离运行环境'),
      statusStage('pending', '依赖与编译', '等待环境就绪'),
      statusStage('pending', '执行测试', '等待编译结果'),
      statusStage('pending', '归档证据', '等待运行结果'),
    ];
  }

  if (run.state === 'RUNNING') {
    return [
      statusStage('done', '环境准备', '隔离环境已就绪'),
      statusStage('active', '依赖与编译', '正在执行 Maven 流程'),
      statusStage('pending', '执行测试', '等待测试输出'),
      statusStage('pending', '归档证据', '等待运行结果'),
    ];
  }

  if (run.state === 'SUCCEEDED') {
    return [
      statusStage('done', '环境准备', '隔离环境已就绪'),
      statusStage('done', '依赖与编译', '编译完成'),
      statusStage('done', '执行测试', '测试通过'),
      statusStage('done', '归档证据', '证据已记录'),
    ];
  }

  if (run.state === 'FAILED') {
    const failureIndex =
      run.terminationReason === 'START_FAILED'
        ? 0
        : run.terminationReason === 'RECOVERY_FAILED'
          ? 3
          : 1;
    return [
      statusStage(failureIndex > 0 ? 'done' : 'failed', '环境准备', '环境准备阶段'),
      statusStage(
        failureIndex === 1 ? 'failed' : failureIndex > 1 ? 'done' : 'pending',
        '依赖与编译',
        '编译与依赖阶段',
      ),
      statusStage(
        failureIndex > 2 ? 'done' : 'pending',
        '执行测试',
        '代码执行阶段',
      ),
      statusStage(failureIndex === 3 ? 'failed' : 'pending', '归档证据', '证据归档阶段'),
    ];
  }

  if (run.state === 'TIMED_OUT') {
    return [
      statusStage('done', '环境准备', '隔离环境已就绪'),
      statusStage('done', '依赖与编译', '编译完成'),
      statusStage('failed', '执行测试', '超过最长运行时间'),
      statusStage('pending', '归档证据', '等待终止结果'),
    ];
  }

  if (run.state === 'CANCELLED') {
    return [
      statusStage('done', '环境准备', '隔离环境已就绪'),
      statusStage('stopped', '依赖与编译', '用户终止运行'),
      statusStage('pending', '执行测试', '未执行'),
      statusStage('pending', '归档证据', '等待终止结果'),
    ];
  }

  return [
    statusStage('active', '环境准备', '正在恢复运行状态'),
    statusStage('pending', '依赖与编译', '等待恢复完成'),
    statusStage('pending', '执行测试', '等待代码执行'),
    statusStage('pending', '归档证据', '等待运行结果'),
  ];
}

function evidenceLine(logText: string): string | null {
  const lines = logText
    .split(/\r?\n/)
    .map((line) => line.replace(/[\u0000-\u001f\u007f]/g, '').trim())
    .filter((line) => line.length > 0);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (/fail|error|exception|timed out/i.test(line)) {
      return line.slice(0, 240);
    }
  }
  return lines.at(-1)?.slice(0, 240) ?? null;
}

function diagnosisFor(run: RunSummary | null, logText: string): Diagnosis {
  if (run === null) {
    return {
      title: '等待第一次运行',
      evidence: '当前没有可分析的运行记录。',
      nextStep: '启动实验后，这里会绑定实际日志、退出码和运行阶段。',
    };
  }

  if (run.state === 'STARTING') {
    return {
      title: '正在准备实验环境',
      evidence: `Run ${run.id} 已创建，等待隔离环境就绪。`,
      nextStep: '环境就绪后将自动进入 Maven 执行阶段。',
    };
  }

  if (run.state === 'RUNNING') {
    return {
      title: '正在收集运行证据',
      evidence: '代码、日志、退出码和资源上下文会绑定到同一次 Run。',
      nextStep: '失败时优先查看运行图谱中标记的阶段。',
    };
  }

  if (run.state === 'SUCCEEDED') {
    return {
      title: '实验执行通过',
      evidence: `退出码 ${run.exitCode ?? 0}，运行 revision 已记录。`,
      nextStep: '可保留本次证据用于结果复现或版本对比。',
    };
  }

  if (run.state === 'FAILED') {
    const line = evidenceLine(logText);
    const title =
      run.terminationReason === 'START_FAILED'
        ? '环境准备失败'
        : run.terminationReason === 'RECOVERY_FAILED'
          ? '运行状态恢复失败'
          : '编译或测试阶段失败';
    return {
      title,
      evidence: line ?? `运行以退出码 ${run.exitCode ?? 1} 失败。`,
      nextStep:
        run.terminationReason === 'START_FAILED'
          ? '检查运行环境、镜像拉取和调度状态。'
          : '优先定位最后一条错误日志和对应测试方法。',
    };
  }

  if (run.state === 'TIMED_OUT') {
    return {
      title: '实验超过时间限制',
      evidence: `最长运行时间为 ${run.policy.timeoutSeconds} 秒。`,
      nextStep: '检查死循环、阻塞调用或测试中的无限等待。',
    };
  }

  return {
    title: '实验已手动停止',
    evidence: `Run ${run.id} 由用户终止。`,
    nextStep: '重新运行不会复用旧日志，会创建新的证据记录。',
  };
}

function stageIcon(status: StageStatus) {
  if (status === 'done') {
    return <CircleCheck className="size-4 text-[#dfff82]" aria-hidden="true" />;
  }
  if (status === 'active') {
    return <Loader2 className="size-4 animate-spin text-sky-300" aria-hidden="true" />;
  }
  if (status === 'failed') {
    return <CircleX className="size-4 text-red-300" aria-hidden="true" />;
  }
  if (status === 'stopped') {
    return <Ban className="size-4 text-amber-300" aria-hidden="true" />;
  }
  return <Minus className="size-4 text-white/24" aria-hidden="true" />;
}

function compactRevision(value: string): string {
  return value.length > 20 ? `${value.slice(0, 12)}…${value.slice(-6)}` : value;
}

export function RunInsights({
  run,
  store,
  logText: providedLogText,
  style,
}: {
  run: RunSummary | null;
  store: RunLogStore | null;
  logText?: string;
  style?: CSSProperties;
}) {
  const snapshot = useSyncExternalStore(
    store === null ? subscribeNone : store.subscribe,
    store === null ? getEmptySnapshot : store.getSnapshot,
    store === null ? getEmptySnapshot : store.getSnapshot,
  );
  const logText = providedLogText ?? snapshot.chunks.map((chunk) => chunk.text).join('');
  const stages = runStages(run);
  const diagnosis = diagnosisFor(run, logText);

  return (
    <aside
      aria-label="Run insights"
      className="w-[320px] min-w-[320px] max-w-[320px] shrink-0 overflow-auto border-l border-white/12 bg-[#111715]"
      style={style}
    >
      <div className="border-b border-white/12 px-4 py-4">
        <p className="font-mono text-[10px] uppercase text-[#dfff82]">实验证据</p>
        <h2 className="mt-1 text-base font-semibold text-white">运行洞察</h2>
      </div>

      <section className="border-b border-white/12 p-4">
        <div className="flex items-center gap-2">
          <Route className="size-4 text-[#dfff82]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-white">运行图谱</h3>
        </div>
        <ol className="mt-4 space-y-3" aria-label="Run stages">
          {stages.map((stage) => (
            <li className="flex gap-3" key={stage.label}>
              <span className="mt-0.5">{stageIcon(stage.status)}</span>
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-sm',
                    stage.status === 'pending' ? 'text-white/42' : 'text-white',
                  )}
                >
                  {stage.label}
                </p>
                <p className="mt-0.5 text-xs text-white/34">{stage.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-b border-white/12 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BrainCircuit className="size-4 text-sky-300" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-white">AI 诊断预览</h3>
          </div>
          <span className="rounded border border-sky-300/20 bg-sky-300/8 px-2 py-0.5 font-mono text-[9px] uppercase text-sky-200">
            上下文
          </span>
        </div>
        <div className="mt-3 rounded-md border border-white/10 bg-black/16 p-3">
          <p className="text-sm font-medium text-white">{diagnosis.title}</p>
          <p className="mt-2 break-words text-xs leading-5 text-white/52">{diagnosis.evidence}</p>
          <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 text-[#dfff82]/86">
            {diagnosis.nextStep}
          </p>
        </div>
        <p className="mt-2 text-[10px] leading-4 text-white/28">
          预览基于本次运行状态与日志生成，接入后端 AI 服务后升级为正式诊断。
        </p>
      </section>

      <section className="p-4">
        <div className="flex items-center gap-2">
          <Fingerprint className="size-4 text-[#dfff82]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-white">复现证据</h3>
        </div>
        <dl className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-xs text-white/38">工作区版本</dt>
            <dd className="font-mono text-[10px] text-white/72">
              {run === null ? '—' : compactRevision(run.requestedWorkspaceRevision)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-xs text-white/38">运行环境</dt>
            <dd className="font-mono text-[10px] text-white/72">
              {run === null ? '—' : `Java ${run.policy.runtime.javaMajor} / Maven ${run.policy.runtime.mavenMajor}`}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-xs text-white/38">运行命令</dt>
            <dd className="font-mono text-[10px] text-white/72">
              {run === null ? '—' : run.policy.command.toUpperCase()}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-xs text-white/38">退出码</dt>
            <dd className="font-mono text-[10px] text-white/72">
              {run?.exitCode ?? '—'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-xs text-white/38">日志序号</dt>
            <dd className="font-mono text-[10px] text-white/72">
              {run?.lastLogSeq ?? '—'}
            </dd>
          </div>
        </dl>
      </section>
    </aside>
  );
}
