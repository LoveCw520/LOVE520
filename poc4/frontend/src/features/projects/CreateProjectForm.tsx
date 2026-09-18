import { useState, type FormEvent } from 'react';
import { Braces, Check, Coffee, FolderPlus, ServerCog } from 'lucide-react';
import { ApiRequestError } from '../../api/ApiRequestError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { pushActivity } from '@/features/activity/activityStore';
import { cn } from '@/lib/utils';
import { useCreateProject } from './projectQueries';

const NAME_MAX = 64;
const templates = [
  {
    id: 'java-maven',
    name: 'Java + Maven',
    description: 'Java 17 · mvn clean test',
    icon: Coffee,
    available: true,
  },
  {
    id: 'python-pytest',
    name: 'Python + pytest',
    description: 'Python · pytest',
    icon: Braces,
    available: false,
  },
  {
    id: 'node-npm',
    name: 'Node.js + npm',
    description: 'Node.js · npm test',
    icon: ServerCog,
    available: false,
  },
] as const;

export function CreateProjectForm({
  locked,
  limitReached,
}: {
  locked: boolean;
  limitReached: boolean;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const create = useCreateProject();
  const trimmed = name.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= NAME_MAX;
  const submitDisabled = locked || limitReached || !valid || create.isPending;

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (locked || limitReached || !valid || create.isPending) {
      return;
    }
    setError(null);
    try {
      const created = await create.mutateAsync({ name: trimmed });
      pushActivity({
        kind: 'success',
        title: '实验工作区已创建',
        message: created.name,
      });
      setName('');
    } catch (reason) {
      if (reason instanceof ApiRequestError && reason.body?.code === 'PROJECT_LIMIT_REACHED') {
        setError('Project limit reached');
      } else if (reason instanceof Error && /network request failed/i.test(reason.message)) {
        setError('Network request failed');
      } else {
        setError('Unable to create project');
      }
    }
  }

  return (
    <div className="project-create-panel rounded-lg border border-white/16 bg-[#27312d] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.045)] sm:p-6">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="font-mono text-[10px] uppercase text-[#dfff82]">新建实验</p>
          <h2 className="mt-2 text-xl font-semibold text-white">创建实验工作区</h2>
          <p className="mt-2 text-sm text-white/58">
            工作区会绑定环境、运行命令、日志证据与 AI 诊断上下文。
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-md border border-[#dfff82]/25 bg-[#dfff82]/8">
          <FolderPlus className="size-5 text-[#dfff82]" aria-hidden="true" />
        </span>
      </div>

      <fieldset className="mt-5">
        <legend className="mb-3 font-mono text-[10px] uppercase text-white/48">实验模板</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {templates.map((template) => {
            const Icon = template.icon;
            const selected = template.available;
            return (
              <button
                type="button"
                key={template.id}
                disabled={!template.available}
                aria-pressed={selected}
                className={cn(
                  'relative rounded-md border p-3 text-left transition',
                  selected
                    ? 'border-[#dfff82]/45 bg-[#dfff82]/8'
                    : 'cursor-not-allowed border-white/10 bg-black/12 opacity-48',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <Icon
                    className={cn('size-4', selected ? 'text-[#dfff82]' : 'text-white/36')}
                    aria-hidden="true"
                  />
                  {selected ? (
                    <Check className="size-3.5 text-[#dfff82]" aria-hidden="true" />
                  ) : (
                    <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[8px] uppercase text-white/34">
                      待接入
                    </span>
                  )}
                </div>
                <p className="mt-3 text-xs font-medium text-white/82">{template.name}</p>
                <p className="mt-1 font-mono text-[9px] uppercase text-white/34">
                  {template.description}
                </p>
              </button>
            );
          })}
        </div>
      </fieldset>

      <form className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={onSubmit}>
        <div className="w-full max-w-xl">
          <label
            htmlFor="project-name"
            className="mb-2 block font-mono text-[10px] uppercase text-white/62"
          >
            实验名称
          </label>
          <Input
            id="project-name"
            name="project-name"
            aria-label="Project name"
            value={name}
            maxLength={NAME_MAX}
            disabled={locked || limitReached || create.isPending}
            className="h-11 border-white/16 bg-[#171e1c] text-white placeholder:text-white/38 focus-visible:border-[#dfff82]/60 focus-visible:ring-[#dfff82]/18"
            placeholder="例如：数据结构实验"
            onChange={(event) => {
              setName(event.target.value);
              if (error) {
                setError(null);
              }
            }}
          />
        </div>
        <Button
          type="submit"
          disabled={submitDisabled}
          aria-label="Create project"
          className="h-11 border-[#dfff82] bg-[#dfff82] px-5 text-[#10140d] shadow-[0_12px_28px_rgba(223,255,130,0.14)] hover:bg-[#edffb2]"
        >
          创建项目
        </Button>
      </form>

      <div className="mt-3 flex flex-col gap-2 text-xs text-white/48 sm:flex-row sm:items-center sm:justify-between">
        {limitReached ? (
          <span>已达到项目数量上限</span>
        ) : (
          <span>1–64 个字符，仅显示名称。</span>
        )}
        <span className="font-mono uppercase">环境 / 工作区 / AI</span>
      </div>

      {error ? <div className="mt-4"><InlineAlert>{error}</InlineAlert></div> : null}
    </div>
  );
}
