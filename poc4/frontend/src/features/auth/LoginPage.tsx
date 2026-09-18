import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ArrowUpRight, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { login } from '../../api/authApi';
import { ApiRequestError } from '../../api/ApiRequestError';
import { useAuth } from './AuthProvider';

gsap.registerPlugin(useGSAP);

const DEFAULT_POST_LOGIN_PATH = '/projects';
const HERO_VIDEO =
  'https://videos.pexels.com/video-files/3130284/3130284-hd_1920_1080_30fps.mp4';
const HERO_POSTER =
  'https://images.pexels.com/videos/3130284/free-video-3130284.jpg?auto=compress&cs=tinysrgb&w=1920';

type ViewTransitionDocument = Document & {
  startViewTransition?: (
    update: () => void | Promise<void>,
  ) => { finished: Promise<void> };
};

function resolvePostLoginPath(from: unknown): string {
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) {
    return DEFAULT_POST_LOGIN_PATH;
  }
  return from;
}

function LoginView({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = '码瑙 | 可复现云端实验平台';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useGSAP(
    () => {
      const reduceMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = (value: number) => (reduceMotion ? 0 : value);
      const timeline = gsap.timeline({
        defaults: {
          ease: 'power3.out',
        },
      });

      timeline
        .fromTo(
          '.nexa-video',
          { opacity: 0.48, scale: 1.12, xPercent: -1.5 },
          { opacity: 1, scale: 1, xPercent: 0, duration: duration(2.2), ease: 'power3.out' },
          0,
        )
        .fromTo(
          '.nexa-watermark',
          { opacity: 0, x: -60 },
          { opacity: 0.055, x: 0, duration: duration(1.5) },
          0.12,
        )
        .fromTo(
          '.nexa-nav',
          { opacity: 0, y: -18 },
          { opacity: 1, y: 0, duration: duration(0.7) },
          0.15,
        )
        .fromTo(
          '.nexa-kicker',
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: duration(0.65) },
          0.3,
        )
        .fromTo(
          '.nexa-headline-line',
          { opacity: 0, yPercent: 125 },
          {
            opacity: 1,
            yPercent: 0,
            duration: duration(1.05),
            stagger: reduceMotion ? 0 : 0.12,
          },
          0.38,
        )
        .fromTo(
          '.nexa-copy',
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: duration(0.7) },
          0.72,
        )
        .fromTo(
          '.nexa-runtime-row',
          { opacity: 0, x: -28 },
          {
            opacity: 1,
            x: 0,
            duration: duration(0.72),
            stagger: reduceMotion ? 0 : 0.08,
          },
          0.9,
        )
        .fromTo(
          '.nexa-form-panel',
          { opacity: 0, x: 72, scale: 0.98 },
          { opacity: 1, x: 0, scale: 1, duration: duration(1) },
          0.58,
        )
        .fromTo(
          '.nexa-field',
          { opacity: 0, y: 14 },
          {
            opacity: 1,
            y: 0,
            duration: duration(0.55),
            stagger: reduceMotion ? 0 : 0.08,
          },
          0.82,
        )
        .fromTo(
          '.nexa-footer',
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: duration(0.6) },
          1,
        );

      if (reduceMotion) {
        return;
      }

      gsap.to('.nexa-scan', {
        yPercent: 900,
        duration: 5.5,
        repeat: -1,
        ease: 'none',
      });
      gsap.to('.nexa-cursor', {
        opacity: 0,
        duration: 0.48,
        repeat: -1,
        yoyo: true,
        ease: 'steps(1)',
      });

      const moveVideoX = gsap.quickTo('.nexa-video', 'x', {
        duration: 1.1,
        ease: 'power3.out',
      });
      const moveVideoY = gsap.quickTo('.nexa-video', 'y', {
        duration: 1.1,
        ease: 'power3.out',
      });
      const handlePointerMove = (event: PointerEvent) => {
        const x = (event.clientX / window.innerWidth - 0.5) * -22;
        const y = (event.clientY / window.innerHeight - 0.5) * -14;
        moveVideoX(x);
        moveVideoY(y);
      };

      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
      };
    },
    { scope: containerRef },
  );

  return (
    <main
      ref={containerRef}
      className="nexa-login relative isolate min-h-[100svh] overflow-hidden bg-[#0a0d0c] text-white"
    >
      {children}
    </main>
  );
}

function LoginTransition({ onComplete }: { onComplete: () => void }) {
  const transitionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduceMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const timeline = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete,
      });

      if (reduceMotion) {
        timeline.set(transitionRef.current, { opacity: 1 });
        timeline.progress(1);
        return;
      }

      timeline
        .fromTo(
          '.manao-transition-backdrop',
          { scaleY: 0, transformOrigin: 'bottom center' },
          { scaleY: 1, duration: 0.42 },
          0,
        )
        .fromTo(
          '.manao-transition-logo',
          { opacity: 0, scale: 0.78 },
          { opacity: 1, scale: 1, duration: 0.42 },
          0.12,
        )
        .fromTo(
          '.manao-transition-status',
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.3, stagger: 0.08 },
          0.2,
        )
        .fromTo(
          '.manao-transition-progress',
          { scaleX: 0 },
          { scaleX: 1, duration: 0.62, ease: 'power2.inOut' },
          0.18,
        );
    },
    { scope: transitionRef },
  );

  return (
    <div
      ref={transitionRef}
      className="fixed inset-0 z-[100] overflow-hidden bg-[#050807] text-white"
      role="status"
      aria-live="polite"
      aria-label="正在进入码瑙工作台"
    >
      <div className="manao-transition-backdrop absolute inset-0 bg-[#050807]" />
      <video
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-18 blur-[2px]"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      >
        <source src={HERO_VIDEO} type="video/mp4" />
      </video>
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(223,255,130,0.08),transparent_34%),linear-gradient(180deg,rgba(5,8,7,0.72),rgba(5,8,7,0.96))]"
        aria-hidden="true"
      />

      <div className="relative flex min-h-full items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="manao-transition-logo mx-auto grid size-16 place-items-center rounded-md border border-[#dfff82]/45 bg-[#dfff82]/8 font-mono text-2xl font-bold text-[#dfff82] shadow-[0_0_50px_rgba(223,255,130,0.16)]">
            码
          </div>
          <p className="mt-6 text-center font-mono text-[11px] uppercase text-[#dfff82]">
            正在初始化码瑙工作区
          </p>
          <h2 className="mt-2 text-center text-2xl font-semibold">进入云端开发实验室</h2>

          <div className="mt-8 h-px overflow-hidden bg-white/12">
            <div className="manao-transition-progress h-full w-full origin-left bg-[#dfff82] shadow-[0_0_18px_rgba(223,255,130,0.7)]" />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 font-mono text-[10px] uppercase text-white/44">
            <span className="manao-transition-status">认证完成</span>
            <span className="manao-transition-status text-center">环境就绪</span>
            <span className="manao-transition-status text-right">实验室在线</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { snapshot, authenticate } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const redirectAfterLoginRef = useRef<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const transitionResolveRef = useRef<(() => void) | null>(null);

  if (snapshot.status === 'authenticated') {
    return <Navigate to={redirectAfterLoginRef.current ?? DEFAULT_POST_LOGIN_PATH} replace />;
  }

  const submitDisabled = pending || username.length === 0 || password.length === 0;
  const sessionExpired =
    snapshot.reason === 'unauthorized' || snapshot.reason === 'expired';
  const alertMessage =
    error ?? (sessionExpired ? 'Your session has expired. Please sign in again.' : null);
  const displayAlertMessage =
    error === 'Invalid username or password'
      ? '用户名或密码错误'
      : error === 'Network request failed'
        ? '网络请求失败'
        : error === 'Unable to sign in'
          ? '登录失败'
          : sessionExpired
            ? '登录会话已过期，请重新登录'
            : null;

  function beginTransition(): Promise<void> {
    setTransitioning(true);
    return new Promise((resolve) => {
      transitionResolveRef.current = resolve;
    });
  }

  function completeTransition(): void {
    transitionResolveRef.current?.();
    transitionResolveRef.current = null;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending || username.length === 0 || password.length === 0) {
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await login({ username, password });
      const target = resolvePostLoginPath(
        (location.state as { from?: unknown } | null)?.from,
      );
      redirectAfterLoginRef.current = target;
      await beginTransition();

      const viewTransitionDocument = document as ViewTransitionDocument;
      if (viewTransitionDocument.startViewTransition) {
        await viewTransitionDocument
          .startViewTransition(async () => {
            authenticate(response);
            await navigate(target, { replace: true });
          })
          .finished;
      } else {
        authenticate(response);
        await navigate(target, { replace: true });
      }
    } catch (reason) {
      if (reason instanceof ApiRequestError && reason.status === 401) {
        setError('Invalid username or password');
      } else if (reason instanceof Error && /network request failed/i.test(reason.message)) {
        setError('Network request failed');
      } else {
        setError('Unable to sign in');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <LoginView>
      <video
        className="nexa-video absolute inset-0 -z-20 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        poster={HERO_POSTER}
        preload="metadata"
        aria-hidden="true"
      >
        <source src={HERO_VIDEO} type="video/mp4" />
      </video>
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(3,7,6,0.92)_0%,rgba(3,7,6,0.68)_46%,rgba(3,7,6,0.86)_100%),linear-gradient(180deg,rgba(3,7,6,0.42)_0%,rgba(3,7,6,0.18)_38%,rgba(3,7,6,0.92)_100%)]"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <span className="nexa-scan absolute left-0 top-[-22%] h-[18%] w-full bg-[linear-gradient(180deg,transparent,rgba(223,255,130,0.08),transparent)]" />
      </div>

      <div className="relative flex min-h-[100svh] flex-col px-5 py-5 sm:px-8 lg:px-12">
        <header className="nexa-nav flex items-center justify-between border-b border-white/15 pb-4">
          <a
            href="/login"
            className="flex items-center gap-3 text-sm font-semibold text-white"
            aria-label="码瑙首页"
          >
            <span className="grid size-8 place-items-center rounded-md border border-white/25 bg-white/10 text-xs">
              码
            </span>
            <span className="flex items-baseline gap-2">
              码瑙
              <span className="font-mono text-[10px] font-normal uppercase text-white/42">
                Manao
              </span>
            </span>
          </a>
          <div className="hidden items-center gap-7 text-xs text-white/62 md:flex">
            <span>实验环境</span>
            <span>运行证据</span>
            <span>AI 诊断</span>
          </div>
          <span className="flex items-center gap-2 rounded-md border border-[#dfff82]/35 bg-[#dfff82]/8 px-3 py-1.5 font-mono text-[10px] uppercase text-[#dfff82]">
            <span className="size-1.5 rounded-full bg-[#dfff82] shadow-[0_0_12px_rgba(223,255,130,0.8)]" />
            实验环境在线
          </span>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] lg:gap-16 lg:py-12">
          <section className="relative isolate max-w-5xl">
            <span
              className="nexa-watermark pointer-events-none absolute -left-5 top-14 -z-10 select-none font-mono text-[11rem] font-bold leading-none tracking-[0] text-white sm:text-[15rem] lg:text-[18rem]"
              aria-hidden="true"
            >
              码瑙
            </span>
            <div className="nexa-kicker mb-7 flex items-center gap-3 text-xs font-medium uppercase text-[#dfff82]">
              <span className="h-px w-8 bg-[#dfff82]" aria-hidden="true" />
              Manao / Reproducible cloud lab
            </div>
            <h1 className="max-w-5xl text-[3.35rem] font-semibold leading-[0.9] tracking-[0] sm:text-7xl lg:text-[5.8rem] xl:text-[7.2rem]">
              <span className="block overflow-hidden pb-1">
                <span className="nexa-headline-line block">代码写下去，</span>
              </span>
              <span className="block overflow-hidden pb-1">
                <span className="nexa-headline-line block text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.62)]">
                  环境自己就绪。
                </span>
              </span>
            </h1>
            <p className="nexa-copy mt-7 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
              码瑙把可复现实验环境、运行证据与 AI 诊断收进同一个工作台。
            </p>

            <div className="mt-9 grid max-w-3xl grid-cols-1 gap-4 border-t border-white/15 pt-5 sm:grid-cols-3">
              {[
                ['K8S', 'POD_RUNNING', '运行环境正在分配'],
                ['AI', 'CONTEXT_LINKED', '代码与日志已绑定'],
                ['WS', 'STREAM_OPEN', '实时输出保持在线'],
              ].map(([group, state, label]) => (
                <div className="nexa-runtime-row flex items-start gap-3" key={group}>
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#dfff82] shadow-[0_0_14px_rgba(223,255,130,0.72)]" />
                  <div>
                    <p className="font-mono text-xs uppercase text-[#dfff82]">
                      {group} / {state}
                      <span className="nexa-cursor ml-1 inline-block text-white">_</span>
                    </p>
                    <p className="mt-1 text-xs text-white/46">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="access-title"
            className="nexa-form-panel w-full max-w-md justify-self-start rounded-lg border border-white/20 bg-black/50 p-5 shadow-[0_32px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-6 lg:justify-self-end"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="font-mono text-[11px] uppercase text-[#dfff82]">
                  码瑙工作区
                </p>
                <h2 id="access-title" className="mt-2 text-2xl font-semibold text-white">
                  登录开发实验室
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/58">
                  进入你的云端项目、文件与 AI 辅助工作台。
                </p>
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-md border border-white/18 bg-white/8">
                <ShieldCheck className="size-5 text-white/78" aria-hidden="true" />
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between border-y border-white/12 py-2 font-mono text-[10px] uppercase text-white/34">
              <span>访问_01</span>
              <span>安全会话</span>
            </div>

            <form method="post" onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="nexa-field">
                <label
                  htmlFor="username"
                  className="mb-2 block text-xs font-medium uppercase text-white/58"
                >
                  用户名
                </label>
                <input
                  id="username"
                  name="username"
                  aria-label="Username"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="h-12 w-full rounded-md border border-white/18 bg-white/8 px-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-white/55 focus:bg-white/12 focus-visible:ring-2 focus-visible:ring-white/20"
                  placeholder="alice"
                />
              </div>

              <div className="nexa-field">
                <label
                  htmlFor="password"
                  className="mb-2 block text-xs font-medium uppercase text-white/58"
                >
                  密码
                </label>
                <input
                  id="password"
                  name="password"
                  aria-label="Password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 w-full rounded-md border border-white/18 bg-white/8 px-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-white/55 focus:bg-white/12 focus-visible:ring-2 focus-visible:ring-white/20"
                  placeholder="demo-pass"
                />
              </div>

              {alertMessage ? (
                <p
                  role="alert"
                  className="rounded-md border border-red-300/25 bg-red-400/10 px-3 py-2 text-sm text-red-100"
                >
                  {displayAlertMessage}
                  <span className="sr-only">{alertMessage}</span>
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitDisabled}
                aria-label="Sign in"
                className="nexa-field group flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-[#dfff82] bg-[#dfff82] px-4 text-sm font-semibold text-[#10140d] shadow-[0_12px_30px_rgba(223,255,130,0.18)] transition hover:bg-[#edffb2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-default disabled:opacity-55"
              >
                {pending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    Opening workspace
                  </>
                ) : (
                  <>
                    进入实验工作台
                    <ArrowUpRight
                      className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </>
                )}
              </button>
            </form>

            <div className="nexa-field mt-5 flex items-center justify-between gap-4 border-t border-white/12 pt-4 text-xs text-white/48">
              <span>演示账号：alice / demo-pass</span>
              <span className="font-mono uppercase">演示环境</span>
            </div>
          </section>
        </div>

        <footer className="nexa-footer flex flex-col gap-3 border-t border-white/15 pt-4 text-xs text-white/44 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono uppercase">码瑙 / 可复现云端实验平台</span>
          <span className="font-mono uppercase">代码 / 运行 / 证据 / AI</span>
        </footer>
      </div>
      </LoginView>
      {transitioning ? <LoginTransition onComplete={completeTransition} /> : null}
    </>
  );
}
