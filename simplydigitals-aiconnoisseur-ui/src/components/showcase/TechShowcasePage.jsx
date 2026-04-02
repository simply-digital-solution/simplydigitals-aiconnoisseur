import { useState, useEffect, useRef } from 'react'
import {
  GitBranch,
  Server, Globe, Database, Shield, Zap, Box,
  Activity, Code2, Cloud, Package,
  TestTube2, ArrowDown, Check,
  Rocket, Terminal, Network,
  Lock, RefreshCw, BrainCircuit, MonitorCheck, Timer,
  Upload,
} from 'lucide-react'

// ── Overview Tab Data ─────────────────────────────────────────────

const HERO_STATS = [
  { to: 70,  suffix: '%',   label: 'API Test Coverage',   sub: 'CI-enforced gate — no merge permitted below',    color: 'purple' },
  { to: 10,  suffix: 'min', label: 'Deploy Lead Time',    sub: 'DORA Elite · commit → live in production',       color: 'violet' },
  { to: 100, suffix: '%',   label: 'Release Automation',  sub: 'zero human steps from merge to production',      color: 'amber'  },
  { to: 6,   suffix: '',    label: 'Live Production E2E', sub: 'Playwright Chromium · real endpoints · no mocks', color: 'rose'   },
  { to: 17,  suffix: '+',   label: 'Security Controls',   sub: 'OWASP · JWT · bcrypt · gitleaks · trivy · SAST',              color: 'purple' },
  { to: 5,   suffix: '',    label: 'Quality Gate Layers', sub: 'pre-commit · CVE scan · SAST · CI test suite · post-deploy E2E', color: 'violet' },
]

const DORA_METRICS = [
  {
    level: 'Elite',
    levelColor: '#34d399',
    metric: 'Deployment Frequency',
    value: 'On every merge',
    detail: 'Automated push to Lambda + CloudFront on every merge to main — no human intervention required.',
    icon: Rocket,
    color: 'purple',
  },
  {
    level: 'Elite',
    levelColor: '#34d399',
    metric: 'Lead Time for Changes',
    value: '< 10 minutes',
    detail: 'From git push to live production: lint → unit tests → build → deploy → post-deploy validation.',
    icon: Timer,
    color: 'violet',
  },
  {
    level: 'High',
    levelColor: '#60a5fa',
    metric: 'Change Failure Rate',
    value: '3-layer quality gate',
    detail: 'Pre-commit hooks → CI test suite → live E2E browser tests catch failures before users do.',
    icon: Shield,
    color: 'amber',
  },
  {
    level: 'High',
    levelColor: '#60a5fa',
    metric: 'Mean Time to Restore',
    value: '< 15 minutes',
    detail: 'Post-deploy tests auto-detect regressions immediately after each deployment.',
    icon: RefreshCw,
    color: 'rose',
  },
]

const SECURITY_CHECKS = [
  'bcrypt password hashing (never plain-text)',
  'JWT access + refresh token pair',
  'Google & Facebook OAuth 2.0',
  'Rate limiting — slowapi (30 req/min)',
  'Full OWASP header suite (HSTS, CSP, X-Frame)',
  'SQLAlchemy ORM — no raw SQL injection surface',
  'CORS policy enforced at middleware',
  'MIME type validation on file uploads',
  'Gitleaks — secret & token scanning on every commit',
  'Bandit SAST — Python code security analysis (pre-commit + CI)',
  'pip-audit — Python CVE dependency scan',
  'npm audit — JS CVE dependency scan (HIGH+ threshold)',
  'Trivy — filesystem & container CVE scan in CI (HIGH/CRITICAL)',
  'Zero secrets in source — GitHub Secrets → Lambda env',
  'Multi-tenant row-level data isolation',
  'HTTPS only — CloudFront TLS termination',
  '3 transitive CVEs patched (cryptography · ecdsa · requests)',
]

const TECH_DECISIONS = [
  {
    chose: 'FastAPI',
    over: 'Flask / Django',
    reason: 'Async-first, Pydantic v2 validation, auto OpenAPI docs, 3× faster throughput in benchmarks.',
    color: 'purple',
  },
  {
    chose: 'Lambda Container',
    over: 'EC2 / ECS',
    reason: 'Zero server management, auto-scaling to zero, pay-per-request, full VPC isolation for the DB.',
    color: 'violet',
  },
  {
    chose: 'Zustand',
    over: 'Redux / Context',
    reason: '1/10th the boilerplate of Redux, React 18 concurrent-safe, zero provider wrapping needed.',
    color: 'amber',
  },
  {
    chose: 'Vite',
    over: 'CRA / Webpack',
    reason: 'ES module native dev server (instant HMR), 10–100× faster cold build, tree-shaking out of the box.',
    color: 'rose',
  },
  {
    chose: 'Playwright',
    over: 'Cypress / Selenium',
    reason: 'Runs real Chromium against live production — catches wrong API URL in bundle, CORS, CloudFront gaps.',
    color: 'purple',
  },
  {
    chose: 'Ruff',
    over: 'Flake8 + Black + isort',
    reason: '10–100× faster than legacy Python linters, single config, fixes and formats in one pass.',
    color: 'violet',
  },
]

const QUALITY_GATES = [
  { label: 'Pre-commit',   desc: 'Ruff lint + format\nBandit SAST · gitleaks\npip-audit · npm audit\npytest + 70% cov', icon: Terminal, color: 'purple' },
  { label: 'CI Lint',      desc: 'ESLint (UI)\nRuff (API)\nfeature branches',            icon: Code2,    color: 'violet' },
  { label: 'CI Tests',     desc: 'pytest + asyncio\nVitest + jsdom\nMSW mocks',          icon: TestTube2,color: 'amber'  },
  { label: 'Deploy',       desc: 'Docker → ECR\nLambda update\nS3 + CloudFront',         icon: Rocket,   color: 'rose'   },
  { label: 'Post-Deploy',  desc: 'Smoke tests\nAuth E2E\nPlaywright browser',            icon: MonitorCheck, color: 'purple' },
  { label: 'LIVE',         desc: 'Zero-downtime\nAuto-rollback\nMonitored',              icon: Activity, color: 'violet' },
]

// ── Overview Sub-components ───────────────────────────────────────

function AnimCounter({ to, suffix = '', prefix = '' }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const duration = 1800
    const started = performance.now()
    function frame(now) {
      const p = Math.min((now - started) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(to * eased))
      if (p < 1) requestAnimationFrame(frame)
    }
    const raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <span>{prefix}{val}{suffix}</span>
}

function OverviewTab() {
  return (
    <div className="space-y-8">

      {/* ── Hero ── */}
      <div className="relative rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/8 via-ink-900 to-violet-500/5 p-8 overflow-hidden">
        <div className="absolute inset-0 bg-grid-ink bg-grid opacity-30 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-xs font-mono uppercase tracking-widest">Production Live · AWS ap-southeast-2</span>
          </div>
          <h2 className="text-3xl font-display font-600 text-ink-50 leading-tight mb-3">
            Built for production.<br />
            <span className="text-gradient-purple">Engineered for scale.</span>
          </h2>
          <p className="text-ink-300 text-base max-w-2xl leading-relaxed">
            AI Connoisseur is a cloud-native ML analytics platform with end-to-end automated delivery,
            zero-trust security, and a fully observable serverless runtime — built on the same
            engineering practices used by elite software teams.
          </p>
        </div>
      </div>

      {/* ── Animated Stats ── */}
      <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
        {HERO_STATS.map((s) => {
          const c = COLOR[s.color]
          return (
            <div key={s.label} className={`rounded-2xl border p-4 text-center ${c.bg} ${c.border}`}>
              <div className={`text-3xl font-display font-600 ${c.text} tabular-nums`}>
                <AnimCounter to={s.to} suffix={s.suffix} />
              </div>
              <div className="text-ink-100 text-xs font-display font-600 mt-1 leading-tight">{s.label}</div>
              <div className="text-ink-500 text-[10px] font-mono mt-0.5">{s.sub}</div>
            </div>
          )
        })}
      </div>

      {/* ── DORA Metrics + Security ── */}
      <div className="grid grid-cols-5 gap-5">

        {/* DORA — 3 cols */}
        <div className="col-span-3 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="text-ink-200 text-sm font-display font-600">DORA Metrics</span>
            <span className="text-ink-600 text-xs font-mono ml-1">— industry standard for delivery performance</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {DORA_METRICS.map((d) => {
              const c = COLOR[d.color]
              const Icon = d.icon
              return (
                <div key={d.metric} className={`rounded-xl border p-4 space-y-2 ${c.bg} ${c.border}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${c.icon}`} />
                      <span className="text-ink-400 text-[10px] font-mono uppercase tracking-wider">{d.metric}</span>
                    </div>
                    <span className="text-[10px] font-mono font-600 px-1.5 py-0.5 rounded"
                      style={{ color: d.levelColor, background: d.levelColor + '18', border: `1px solid ${d.levelColor}40` }}>
                      {d.level}
                    </span>
                  </div>
                  <div className={`text-sm font-display font-600 ${c.text}`}>{d.value}</div>
                  <div className="text-ink-500 text-xs leading-snug">{d.detail}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Security — 2 cols */}
        <div className="col-span-2 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-ink-200 text-sm font-display font-600">Security Posture</span>
            <span className="ml-auto text-emerald-400 text-xs font-mono">17 / 17</span>
          </div>
          <div className="card p-4 space-y-2">
            {SECURITY_CHECKS.map((check) => (
              <div key={check} className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-2.5 h-2.5 text-emerald-400" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-ink-300 text-xs leading-snug">{check}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quality Gates ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <MonitorCheck className="w-4 h-4 text-purple-400" />
          <span className="text-ink-200 text-sm font-display font-600">Quality Gates</span>
          <span className="text-ink-600 text-xs font-mono ml-1">— every commit passes through all 5 before reaching users</span>
        </div>
        <div className="flex items-stretch gap-0">
          {QUALITY_GATES.map((gate, i) => {
            const c = COLOR[gate.color]
            const Icon = gate.icon
            const isLast = i === QUALITY_GATES.length - 1
            return (
              <div key={gate.label} className="flex items-center flex-1 min-w-0">
                <div className={`flex-1 rounded-xl border p-3.5 ${c.bg} ${c.border} ${isLast ? 'ring-1 ring-emerald-500/40' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${c.bg} border ${c.border}`}>
                      <Icon className={`w-3.5 h-3.5 ${c.icon}`} />
                    </div>
                    <span className={`text-xs font-display font-600 ${c.text}`}>{gate.label}</span>
                  </div>
                  <div className="text-ink-500 text-[10px] font-mono leading-snug whitespace-pre-line">{gate.desc}</div>
                </div>
                {!isLast && (
                  <div className="flex items-center px-1 flex-shrink-0">
                    <svg width="20" height="20" viewBox="0 0 20 20">
                      <path d="M4 10h12M12 6l4 4-4 4" stroke="#4a4a68" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Technology Decisions ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BrainCircuit className="w-4 h-4 text-purple-400" />
          <span className="text-ink-200 text-sm font-display font-600">Technology Decisions</span>
          <span className="text-ink-600 text-xs font-mono ml-1">— chosen for production-grade reasons, not trends</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {TECH_DECISIONS.map((t) => {
            const c = COLOR[t.color]
            return (
              <div key={t.chose} className={`rounded-xl border p-4 space-y-2 ${c.bg} ${c.border}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-display font-600 ${c.text}`}>{t.chose}</span>
                  <span className="text-ink-600 text-[10px] font-mono">over {t.over}</span>
                </div>
                <div className="w-full h-px bg-ink-700/50" />
                <p className="text-ink-300 text-xs leading-relaxed">{t.reason}</p>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

// ── Tech Stack ────────────────────────────────────────────────────

const TECH_STACK = [
  {
    category: 'Backend',
    icon: Server,
    color: 'purple',
    items: ['Python 3.11', 'FastAPI 0.111', 'SQLAlchemy 2.0', 'Alembic', 'Pydantic v2', 'asyncpg', 'Mangum'],
  },
  {
    category: 'ML / Data',
    icon: BrainCircuit,
    color: 'violet',
    items: ['scikit-learn', 'pandas', 'numpy', 'scipy', 'joblib'],
  },
  {
    category: 'Frontend',
    icon: Globe,
    color: 'amber',
    items: ['React 18.3', 'Vite 5.4', 'React Router v6', 'Zustand', 'Tailwind CSS 3.4', 'Axios', 'Recharts'],
  },
  {
    category: 'Testing',
    icon: TestTube2,
    color: 'rose',
    items: ['pytest + asyncio', 'Vitest + jsdom', 'Playwright (E2E)', 'MSW (mocks)', 'factory-boy', 'Behave (BDD)'],
  },
  {
    category: 'Infrastructure',
    icon: Cloud,
    color: 'purple',
    items: ['AWS Lambda (container)', 'API Gateway HTTP', 'Amazon ECR', 'S3 + CloudFront', 'RDS PostgreSQL 16', 'Docker multi-stage'],
  },
  {
    category: 'Security & Auth',
    icon: Shield,
    color: 'violet',
    items: ['JWT access + refresh', 'bcrypt hashing', 'Google OAuth', 'Facebook OAuth', 'slowapi rate limiting', 'OWASP headers'],
  },
  {
    category: 'Tooling',
    icon: Terminal,
    color: 'amber',
    items: ['Ruff (lint + format)', 'ESLint 9', 'pre-commit hooks', 'mypy', 'bandit', 'gitleaks', 'pip-audit', 'trivy', 'structlog + Prometheus'],
  },
  {
    category: 'CI/CD',
    icon: Rocket,
    color: 'rose',
    items: ['Change detection (paths-filter)', 'Semantic versioning', 'ECR image push', 'Lambda live deploy', 'S3 sync + invalidation', 'Post-deploy gate'],
  },
]

// ── Color helpers ─────────────────────────────────────────────────

const COLOR = {
  purple: {
    bg:     'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon:   'text-purple-400',
    badge:  'bg-purple-500/20 text-purple-200 border-purple-400/40',
    dot:    'bg-purple-400',
    text:   'text-purple-300',
  },
  violet: {
    bg:     'bg-violet-500/10',
    border: 'border-violet-500/30',
    icon:   'text-violet-400',
    badge:  'bg-violet-500/20 text-violet-200 border-violet-400/40',
    dot:    'bg-violet-400',
    text:   'text-violet-300',
  },
  amber: {
    bg:     'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon:   'text-amber-400',
    badge:  'bg-amber-500/20 text-amber-200 border-amber-400/40',
    dot:    'bg-amber-400',
    text:   'text-amber-300',
  },
  rose: {
    bg:     'bg-rose-500/10',
    border: 'border-rose-500/30',
    icon:   'text-rose-400',
    badge:  'bg-rose-500/20 text-rose-200 border-rose-400/40',
    dot:    'bg-rose-400',
    text:   'text-rose-300',
  },
}

// ── Sub-components ────────────────────────────────────────────────

// status: 'idle' | 'running' | 'done'
function StageNode({ icon: Icon, label, sublabel, steps = [], status = 'idle' }) {
  const running = status === 'running'
  const done    = status === 'done'
  return (
    <div className={`h-full rounded-xl border p-4 flex flex-col gap-3 relative overflow-hidden transition-all duration-500
      ${done    ? 'border-emerald-500/40 bg-emerald-500/5' :
        running ? 'border-amber-400/50 bg-amber-500/5 stage-running' :
                  'border-ink-700/40 bg-ink-900/20 opacity-35'}`}>
      {running && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/5 via-transparent to-transparent pointer-events-none" />
      )}
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border transition-all duration-500
          ${done    ? 'bg-emerald-500/15 border-emerald-500/40' :
            running ? 'bg-amber-500/15  border-amber-400/40' :
                      'bg-ink-800/60    border-ink-700/50'}`}>
          {done    ? <Check     className="w-4 h-4 text-emerald-400" /> :
           running ? <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" /> :
                     <Icon      className="w-4 h-4 text-ink-700" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-display font-600 leading-tight transition-colors duration-500
            ${done ? 'text-emerald-200' : running ? 'text-amber-100' : 'text-ink-600'}`}>
            {label}
          </div>
          {sublabel && (
            <div className={`text-xs font-mono transition-colors duration-500
              ${done ? 'text-emerald-700' : running ? 'text-amber-600' : 'text-ink-700'}`}>
              {sublabel}
            </div>
          )}
        </div>
        {done && (
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5 flex-shrink-0">
            PASSED
          </span>
        )}
        {running && (
          <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5 flex-shrink-0 animate-pulse">
            RUNNING
          </span>
        )}
      </div>
      {steps.length > 0 && (
        <div className="space-y-1.5">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 transition-colors duration-300
                ${done ? 'bg-emerald-500' : running ? 'bg-amber-400' : 'bg-ink-700'}`} />
              <span className={`text-xs leading-snug transition-colors duration-300
                ${done ? 'text-ink-300' : running ? 'text-ink-400' : 'text-ink-700'}`}>
                {step}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// status: 'idle' | 'active' | 'done'
function FlowLine({ status = 'idle' }) {
  const isActive = status === 'active'
  const isDone   = status === 'done'
  return (
    <div className="flex justify-center py-1">
      <div className="flex flex-col items-center relative">
        <div className={`w-px h-6 transition-colors duration-500
          ${isDone ? 'bg-emerald-600/50' : isActive ? 'bg-amber-500/50' : 'bg-ink-700/50'}`} />
        <ArrowDown className={`w-3 h-3 mt-0.5 transition-colors duration-500
          ${isDone ? 'text-emerald-600' : isActive ? 'text-amber-500' : 'text-ink-700'}`} />
        {isActive && (
          <div className="absolute top-0 rounded-full bg-amber-400"
            style={{ width: 7, height: 7, left: '50%', animation: 'travel-down 0.65s ease-in infinite' }} />
        )}
      </div>
    </div>
  )
}

function TechBadge({ text, color }) {
  const c = COLOR[color]
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono border ${c.badge}`}>
      {text}
    </span>
  )
}

// ── Pipeline Tab ──────────────────────────────────────────────────

// Step indices: 0=trigger 1=orchestrate 2=lint 3=test 4=build 5=push/sync 6=release 7=postdeploy 8=all-done
const STEP_DURATIONS = [700, 1000, 1400, 2400, 1300, 1100, 1600, 2000]

function PipelineView() {
  const [step, setStep]             = useState(-1)
  const [autoScroll, setAutoScroll] = useState(true)
  const [replayKey, setReplayKey]   = useState(0)
  const cardRef       = useRef(null)
  const triggerRef    = useRef(null)
  const orchRef       = useRef(null)
  const parallelRef   = useRef(null)
  const postDeployRef = useRef(null)

  // Pipeline animation loop (always runs, independent of scroll)
  useEffect(() => {
    let current = 0
    let t
    function advance() {
      setStep(current)
      t = setTimeout(() => {
        current++
        if (current < STEP_DURATIONS.length) {
          advance()
        } else {
          setStep(STEP_DURATIONS.length)          // all-done — stop here
        }
      }, STEP_DURATIONS[current])
    }
    const init = setTimeout(advance, 600)
    return () => { clearTimeout(t); clearTimeout(init) }
  }, [replayKey])

  // Stop auto-scroll when post-deploy stage is reached
  useEffect(() => {
    if (step === STEP_DURATIONS.length) setAutoScroll(false)
  }, [step])

  // Detect user wheel / touch → stop auto-scroll
  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const stop = () => setAutoScroll(false)
    card.addEventListener('wheel',      stop, { passive: true })
    card.addEventListener('touchstart', stop, { passive: true })
    return () => {
      card.removeEventListener('wheel',      stop)
      card.removeEventListener('touchstart', stop)
    }
  }, [])

  // Scroll active stage into view within the card
  useEffect(() => {
    if (!autoScroll) return
    const refMap = { 0: triggerRef, 1: orchRef }
    for (let i = 2; i <= 6; i++) refMap[i] = parallelRef
    refMap[7] = postDeployRef
    const card = cardRef.current
    const el   = refMap[step]?.current
    if (!card || !el) return
    // compute element's top relative to the scrollable card
    const scrollTarget = el.getBoundingClientRect().top
                       - card.getBoundingClientRect().top
                       + card.scrollTop - 16
    card.scrollTo({ top: scrollTarget, behavior: 'smooth' })
  }, [step, autoScroll])

  function handleReplay() {
    setStep(-1)
    cardRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => {
      setAutoScroll(true)
      setReplayKey(k => k + 1)
    }, 300)
  }


  function ss(forStep) {
    if (step < 0) return 'idle'
    if (step === STEP_DURATIONS.length) return 'done'
    if (forStep < step)  return 'done'
    if (forStep === step) return 'running'
    return 'idle'
  }

  function cs(activeAtStep) {
    if (step === STEP_DURATIONS.length) return 'done'
    if (step === activeAtStep) return 'active'
    if (step > activeAtStep)  return 'done'
    return 'idle'
  }

  const allDone = step === STEP_DURATIONS.length

  const arrowColor = cs(2) !== 'idle' ? 'text-amber-500' : 'text-ink-700'
  const mergeArrow = cs(7) !== 'idle' ? 'text-amber-500' : 'text-ink-700'

  return (
    <div className="space-y-8">
      <style>{`
        @keyframes travel-down {
          0%   { transform: translate(-50%, 0px);   opacity: 1; }
          75%  { transform: translate(-50%, 18px);  opacity: 1; }
          100% { transform: translate(-50%, 22px);  opacity: 0; }
        }
        @keyframes glow-amber {
          0%, 100% { box-shadow: 0 0 6px rgba(251,191,36,0.15), 0 0 0 1px rgba(251,191,36,0.08); }
          50%       { box-shadow: 0 0 22px rgba(251,191,36,0.35), 0 0 0 1px rgba(251,191,36,0.2); }
        }
        .stage-running { animation: glow-amber 1.8s ease-in-out infinite; }
      `}</style>

      <div ref={cardRef} className="card p-6 overflow-y-auto" style={{ maxHeight: '72vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-ink-200 text-sm font-display font-600 uppercase tracking-wider">
            GitHub Actions Workflow
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleReplay} disabled={autoScroll}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono transition-colors
                ${autoScroll
                  ? 'bg-ink-800 border-ink-700 text-ink-600 cursor-not-allowed'
                  : 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20 text-purple-300 cursor-pointer'}`}>
              <RefreshCw className="w-3 h-3" /> Replay scroll
            </button>
            {allDone ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300 text-xs font-mono font-600">ALL CHECKS PASSED</span>
              </div>
            ) : step >= 0 ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-300 text-xs font-mono">pipeline running</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-ink-800 border border-ink-700">
                <div className="w-1.5 h-1.5 rounded-full bg-ink-600" />
                <span className="text-ink-500 text-xs font-mono">waiting for push</span>
              </div>
            )}
          </div>
        </div>

        {/* Trigger — top of the flow */}
        <div className="max-w-xs mx-auto" ref={triggerRef}>
          <StageNode icon={GitBranch} label="Git Event" sublabel="push · pull_request · workflow_call"
            status={ss(0)}
            steps={['Feature push → lint only', 'Pull request → lint + tests', 'Merge to main → full deploy pipeline']} />
        </div>

        <FlowLine status={cs(1)} />

        {/* Orchestrator */}
        <div className="max-w-xs mx-auto" ref={orchRef}>
          <StageNode icon={Network} label="orchestrator.yml" sublabel="dorny/paths-filter change detection"
            status={ss(1)}
            steps={['Detects API vs UI file changes', 'Runs pipelines conditionally', 'Cancels stale in-progress runs']} />
        </div>

        {/* Fan-out: orchestrator fans downward into two parallel columns */}
        <div className="relative flex justify-center my-3" style={{ minHeight: 40 }}>
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-px h-3 transition-colors duration-500 ${cs(2) !== 'idle' ? 'bg-amber-500/40' : 'bg-ink-700/40'}`} />
          <div className={`absolute top-3 w-1/2 border-t transition-colors duration-500 ${cs(2) !== 'idle' ? 'border-amber-500/40' : 'border-ink-700/40'}`} />
          {['left-[25%]', 'right-[25%]'].map((pos) => (
            <div key={pos} className={`absolute top-3 ${pos} flex flex-col items-center`}>
              <div className={`w-px h-3 transition-colors duration-500 ${cs(2) !== 'idle' ? 'bg-amber-500/50' : 'bg-ink-700/50'}`} />
              <ArrowDown className={`w-3 h-3 transition-colors duration-500 ${arrowColor}`} />
            </div>
          ))}
        </div>

        {/* Parallel pipelines — row-by-row grid so each stage pair shares height */}
        <div className="space-y-0" ref={parallelRef}>
          {/* Column labels */}
          <div className="grid grid-cols-2 gap-4 mb-2">
            {[['API Pipeline', 2], ['UI Pipeline', 2]].map(([label, s]) => (
              <div key={label} className={`text-xs font-mono text-center uppercase tracking-wider transition-colors duration-500
                ${ss(s) === 'done' ? 'text-emerald-600' : ss(s) === 'running' ? 'text-amber-500' : 'text-ink-600'}`}>
                {label}
              </div>
            ))}
          </div>
          {/* Lint */}
          <div className="grid grid-cols-2 gap-4 items-stretch">
            <StageNode icon={Code2}     label="Lint"       sublabel="Ruff · feature branches"          status={ss(2)} steps={['ruff check --fix', 'ruff-format', 'pre-commit hooks']} />
            <StageNode icon={Code2}     label="Lint"       sublabel="ESLint 9 · feature branches"       status={ss(2)} steps={['ESLint React/Hooks rules', 'JS/JSX validation', 'pre-commit hooks']} />
          </div>
          <div className="grid grid-cols-2 gap-4"><FlowLine status={cs(3)} /><FlowLine status={cs(3)} /></div>
          {/* Unit Tests */}
          <div className="grid grid-cols-2 gap-4 items-stretch">
            <StageNode icon={TestTube2} label="Unit Tests" sublabel="pytest · 70% coverage enforced"   status={ss(3)} steps={['25+ test files', 'pytest-asyncio', 'SQLite in-memory DB', 'factory-boy fixtures']} />
            <StageNode icon={TestTube2} label="Unit Tests" sublabel="Vitest · 70% threshold"            status={ss(3)} steps={['4 test suites', 'jsdom environment', 'MSW API mocking', '@testing-library/react']} />
          </div>
          <div className="grid grid-cols-2 gap-4"><FlowLine status={cs(4)} /><FlowLine status={cs(4)} /></div>
          {/* Build */}
          <div className="grid grid-cols-2 gap-4 items-stretch">
            <StageNode icon={Terminal}  label="Build"      sublabel="Docker multi-stage · layer cache" status={ss(4)} steps={['docker build --target production', 'Layer caching enabled', 'Image size optimised']} />
            <StageNode icon={Code2}     label="Build"      sublabel="Vite production · env injected"    status={ss(4)} steps={['vite build --mode production', 'VITE_API_BASE_URL baked in', 'Tree-shaking + minify']} />
          </div>
          <div className="grid grid-cols-2 gap-4"><FlowLine status={cs(5)} /><FlowLine status={cs(5)} /></div>
          {/* Push / Sync */}
          <div className="grid grid-cols-2 gap-4 items-stretch">
            <StageNode icon={Package}   label="ECR Push"   sublabel="digest-pinned image tag"          status={ss(5)} steps={['docker tag + push to ECR', 'SHA digest pinned', 'Image vulnerability scan']} />
            <StageNode icon={Upload}    label="S3 Sync"    sublabel="versioned assets · cache headers"  status={ss(5)} steps={['aws s3 sync dist/ s3://…', 'Cache-Control: max-age=31536000', 'Content-hash filenames']} />
          </div>
          <div className="grid grid-cols-2 gap-4"><FlowLine status={cs(6)} /><FlowLine status={cs(6)} /></div>
          {/* Deploy */}
          <div className="grid grid-cols-2 gap-4 items-stretch">
            <StageNode icon={Zap}       label="Lambda Deploy" sublabel="zero-downtime function update" status={ss(6)} steps={['update-function-code', 'Alembic DB migration', 'Health check gate']} />
            <StageNode icon={Cloud}     label="CloudFront"    sublabel="global edge invalidation"       status={ss(6)} steps={['create-invalidation /*', 'Edge propagation ~30s', 'Atomic — no stale state']} />
          </div>
        </div>

        {/* Fan-in: two deploy columns converge downward into post-deploy */}
        <div className="relative flex justify-center my-3" style={{ minHeight: 40 }}>
          {['left-[25%]', 'right-[25%]'].map((pos) => (
            <div key={pos} className={`absolute top-0 ${pos}`}>
              <div className={`w-px h-3 transition-colors duration-500 ${cs(7) !== 'idle' ? 'bg-amber-500/50' : 'bg-ink-700/50'}`} />
            </div>
          ))}
          <div className={`absolute top-3 w-1/2 border-t transition-colors duration-500 ${cs(7) !== 'idle' ? 'border-amber-500/40' : 'border-ink-700/40'}`} />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className={`w-px h-3 transition-colors duration-500 ${cs(7) !== 'idle' ? 'bg-amber-500/50' : 'bg-ink-700/50'}`} />
            <ArrowDown className={`w-3 h-3 transition-colors duration-500 ${mergeArrow}`} />
          </div>
        </div>

        {/* Post-Deploy — bottom of the flow */}
        <div ref={postDeployRef} className={`rounded-xl border p-4 space-y-3 transition-all duration-500
          ${ss(7) === 'done'    ? 'border-emerald-500/30 bg-emerald-500/5' :
            ss(7) === 'running' ? 'border-amber-400/40 bg-amber-500/5 stage-running' :
                                  'border-ink-700/40 opacity-35'}`}>
          <div className="flex items-center gap-2 mb-3">
            {ss(7) === 'done'    ? <Check        className="w-4 h-4 text-emerald-400" /> :
             ss(7) === 'running' ? <RefreshCw    className="w-4 h-4 text-amber-400 animate-spin" /> :
                                   <MonitorCheck className="w-4 h-4 text-ink-600" />}
            <span className={`text-sm font-display font-600 transition-colors duration-500
              ${ss(7) === 'done' ? 'text-emerald-200' : ss(7) === 'running' ? 'text-amber-100' : 'text-ink-600'}`}>
              Post-Deploy Tests
            </span>
            <span className={`text-xs font-mono ml-auto transition-colors duration-500
              ${ss(7) === 'done' ? 'text-emerald-700' : ss(7) === 'running' ? 'text-amber-700' : 'text-ink-700'}`}>
              main only · after both deploys
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StageNode icon={Activity} label="API Integration Tests" sublabel="httpx · live production"
              status={ss(7)}
              steps={['Health + version smoke test', 'Full auth E2E (register → login → refresh)', 'Duplicate user (409), invalid input (422)', 'Wrong password (401)']} />
            <StageNode icon={Globe} label="Browser E2E" sublabel="Playwright · Chromium headless"
              status={ss(7)}
              steps={['CloudFront serves React app', 'Login page shown to anon users', 'API calls route to API Gateway (not S3)', 'Registration 201 + login error handling']} />
          </div>
        </div>
      </div>

      {/* Tech stack */}
      <div>
        <div className="text-ink-200 text-sm font-display font-600 uppercase tracking-wider mb-4">
          Technology Stack
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {TECH_STACK.map(({ category, icon: Icon, color, items }) => {
            const c = COLOR[color]
            return (
              <div key={category} className={`rounded-2xl border p-4 space-y-3 ${c.bg} ${c.border}`}>
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${c.icon}`} />
                  <span className={`text-sm font-display font-600 ${c.text}`}>{category}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((item) => (
                    <TechBadge key={item} text={item} color={color} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}


// ── System Design Data ────────────────────────────────────────────

const SD_ZONES = [
  { id: 'client',  label: 'CLIENT',     y: 10,  h: 120, color: '#7c3aed' },
  { id: 'edge',    label: 'EDGE / CDN', y: 150, h: 90,  color: '#2563eb' },
  { id: 'compute', label: 'COMPUTE',    y: 260, h: 130, color: '#d97706' },
  { id: 'data',    label: 'DATA LAYER', y: 410, h: 100, color: '#059669' },
  { id: 'ciops',   label: 'CI / OPS',  y: 530, h: 100, color: '#dc2626' },
]

const SD_NODES = {
  browser:   { x: 150, y: 70,  icon: Globe,        label: 'React SPA',       sub: 'Vite · Zustand'      },
  goauth:    { x: 640, y: 70,  icon: Shield,        label: 'Google OAuth',    sub: 'OpenID Connect'      },
  fbauth:    { x: 850, y: 70,  icon: Shield,        label: 'Facebook OAuth',  sub: 'OAuth 2.0'           },
  cdn:       { x: 240, y: 195, icon: Globe,         label: 'CloudFront',      sub: 'CDN · edge cache'    },
  dns:       { x: 640, y: 195, icon: Network,       label: 'Route 53',        sub: 'DNS · health checks' },
  lambda:    { x: 240, y: 325, icon: Zap,           label: 'AWS Lambda',      sub: 'FastAPI container'   },
  authmw:    { x: 530, y: 325, icon: Lock,          label: 'Auth Middleware', sub: 'JWT · bcrypt'        },
  ml:        { x: 820, y: 325, icon: BrainCircuit,  label: 'ML Engine',       sub: 'sklearn · joblib'    },
  db:        { x: 240, y: 460, icon: Database,      label: 'PostgreSQL',      sub: 'RDS · SQLAlchemy'    },
  s3models:  { x: 530, y: 460, icon: Box,           label: 'Model Store',     sub: 'S3 artefacts'        },
  s3data:    { x: 820, y: 460, icon: Upload,        label: 'Dataset Store',   sub: 'S3 CSV / Parquet'    },
  ghactions: { x: 160, y: 580, icon: GitBranch,     label: 'GitHub Actions',  sub: '4 workflows'         },
  ecr:       { x: 450, y: 580, icon: Package,       label: 'Amazon ECR',      sub: 'container registry'  },
  cwatch:    { x: 740, y: 580, icon: MonitorCheck,  label: 'CloudWatch',      sub: 'logs · metrics'      },
}

const SD_ARROWS = [
  ['browser',   'cdn',      'HTTPS / TLS',    false, 'purple'],
  ['cdn',       'lambda',   'proxy fwd',      false, 'blue'  ],
  ['lambda',    'authmw',   'JWT verify',     true,  'purple'],
  ['lambda',    'db',       'ORM query',      true,  'amber' ],
  ['lambda',    'ml',       'train / infer',  false, 'amber' ],
  ['lambda',    's3data',   'dataset r/w',    true,  'teal'  ],
  ['ml',        's3models', 'model store',    true,  'teal'  ],
  ['browser',   'goauth',   'OAuth redirect', false, 'rose'  ],
  ['goauth',    'lambda',   'token callback', false, 'rose'  ],
  ['ghactions', 'ecr',      'push image',     false, 'ci'    ],
  ['ecr',       'lambda',   'deploy fn',      false, 'ci'    ],
  ['lambda',    'cwatch',   'telemetry',      false, 'blue'  ],
]

const SD_COLORS = {
  purple: { stroke: '#a78bfa', resp: '#c4b5fd', dash: '8 5' },
  blue:   { stroke: '#60a5fa', resp: '#93c5fd', dash: '7 4' },
  amber:  { stroke: '#fbbf24', resp: '#fcd34d', dash: '8 5' },
  teal:   { stroke: '#34d399', resp: '#6ee7b7', dash: '7 4' },
  rose:   { stroke: '#fb7185', resp: null,       dash: '7 4' },
  ci:     { stroke: '#94a3b8', resp: null,       dash: '5 6' },
}

const SD_PRINCIPLES = [
  { title: 'Stateless API',        body: 'JWT tokens carry all identity — no server-side sessions. Any Lambda instance handles any request, enabling true horizontal scaling.',    color: 'purple' },
  { title: 'Serverless-first',     body: 'Lambda containers scale to zero between requests. No idle EC2 cost. Provisioned concurrency warms critical paths to eliminate cold starts.', color: 'violet' },
  { title: 'Multi-tenant Isolation',body: 'Every dataset and model is scoped to user_id at the ORM layer. Cross-tenant data leakage is structurally impossible at the query level.', color: 'amber'  },
  { title: 'Edge-cached SPA',      body: 'CloudFront serves the Vite bundle from 400+ PoPs globally. Only API calls reach Lambda — static asset delivery cost is near-zero.',     color: 'rose'   },
  { title: 'Immutable Deployments',body: 'ECR image tags are SHA-pinned. Each deploy points Lambda at a new image digest — rollback is a single function alias swap.',             color: 'purple' },
  { title: 'Observable by Default',body: 'Structured JSON logs via structlog, Prometheus counters on every endpoint, and CloudWatch alarms on P95 latency and error rate.',        color: 'violet' },
]

// ── System Design View ────────────────────────────────────────────

function SystemDesignView() {
  const HW = 65, HH = 30  // node half-width, half-height

  function nodeEdge(cx, cy, ux, uy) {
    const tx = ux !== 0 ? HW / Math.abs(ux) : Infinity
    const ty = uy !== 0 ? HH / Math.abs(uy) : Infinity
    const t = Math.min(tx, ty) - 2
    return { x: cx + ux * t, y: cy + uy * t }
  }

  function arrowPoints(fromId, toId) {
    const a = SD_NODES[fromId], b = SD_NODES[toId]
    const dx = b.x - a.x, dy = b.y - a.y
    const len = Math.sqrt(dx * dx + dy * dy)
    const ux = dx / len, uy = dy / len
    const start = nodeEdge(a.x, a.y,  ux,  uy)
    const end   = nodeEdge(b.x, b.y, -ux, -uy)
    return {
      x1: start.x, y1: start.y,
      x2: end.x,   y2: end.y,
      mx: (a.x + b.x) / 2,
      my: (a.y + b.y) / 2,
      ux, uy,
    }
  }

  return (
    <div className="space-y-5">

      {/* SVG topology diagram */}
      <div className="card p-4">
        <div className="text-ink-400 text-xs font-mono uppercase tracking-wider mb-4">
          Infrastructure topology · layered system design
        </div>
        <div className="w-full overflow-x-auto">
          <svg
            viewBox="0 0 980 650"
            className="w-full"
            style={{ minWidth: 720, fontFamily: 'inherit' }}
          >
            <defs>
              <marker id="sdarr" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="context-stroke" />
              </marker>
            </defs>

            {/* Zone bands */}
            {SD_ZONES.map((z) => (
              <g key={z.id}>
                <rect
                  x={0} y={z.y} width={980} height={z.h}
                  rx="10"
                  fill={z.color} fillOpacity="0.06"
                  stroke={z.color} strokeWidth="1" strokeOpacity="0.25"
                  strokeDasharray="5 4"
                />
                <text
                  x={14} y={z.y + 16}
                  fill={z.color} fontSize="9" fontWeight="700"
                  fontFamily="monospace" letterSpacing="1.5" opacity="0.7"
                >
                  {z.label}
                </text>
              </g>
            ))}

            {/* Arrows */}
            {SD_ARROWS.map(([from, to, label, bidir, colorKey], i) => {
              const p = arrowPoints(from, to)
              const c = SD_COLORS[colorKey]
              const { x1, y1, x2, y2, mx, my } = p
              const dx = x2 - x1, dy = y2 - y1
              const len = Math.sqrt(dx * dx + dy * dy)
              const nx = -dy / len, ny = dx / len
              const OFF = bidir ? 5 : 0
              const dur = (1.5 + i * 0.18).toFixed(2)
              const [dl, gl] = c.dash.split(' ').map(Number)
              const period = dl + gl
              const fwd = `M${(x1 + nx * OFF).toFixed(1)},${(y1 + ny * OFF).toFixed(1)} L${(x2 + nx * OFF).toFixed(1)},${(y2 + ny * OFF).toFixed(1)}`
              const rev = `M${(x2 - nx * OFF).toFixed(1)},${(y2 - ny * OFF).toFixed(1)} L${(x1 - nx * OFF).toFixed(1)},${(y1 - ny * OFF).toFixed(1)}`
              const lx = (mx + nx * (bidir ? 14 : 10)).toFixed(1)
              const ly = (my + ny * (bidir ? 14 : 10)).toFixed(1)

              return (
                <g key={i}>
                  <path d={fwd} fill="none" stroke={c.stroke} strokeWidth="1.5"
                    strokeDasharray={c.dash} markerEnd="url(#sdarr)">
                    <animate attributeName="stroke-dashoffset"
                      from={period} to="0" dur={`${dur}s`} repeatCount="indefinite" />
                  </path>
                  {bidir && c.resp && (
                    <path d={rev} fill="none" stroke={c.resp} strokeWidth="1.5"
                      strokeDasharray={c.dash} markerEnd="url(#sdarr)">
                      <animate attributeName="stroke-dashoffset"
                        from={period} to="0"
                        dur={`${(parseFloat(dur) * 1.25).toFixed(2)}s`}
                        begin={`${(parseFloat(dur) * 0.4).toFixed(2)}s`}
                        repeatCount="indefinite" />
                    </path>
                  )}
                  <text x={lx} y={ly} textAnchor="middle"
                    fill="#5e5e7e" fontSize="8" fontFamily="monospace">
                    {label}
                  </text>
                </g>
              )
            })}

            {/* Nodes */}
            {Object.entries(SD_NODES).map(([id, { x, y, icon: Icon, label, sub }]) => {
              const zone = SD_ZONES.find(z => y >= z.y && y <= z.y + z.h)
              const nodeColor = zone?.color ?? '#7c3aed'
              return (
                <g key={id}>
                  <rect x={x - HW - 4} y={y - HH - 4} width={(HW + 4) * 2} height={(HH + 4) * 2}
                    rx="10" fill={nodeColor} fillOpacity="0.07" />
                  <rect x={x - HW} y={y - HH} width={HW * 2} height={HH * 2}
                    rx="8" fill="#14141f" stroke={nodeColor} strokeWidth="1.5" strokeOpacity="0.6" />
                  <foreignObject x={x - HW + 8} y={y - 11} width="22" height="22">
                    <div
                      xmlns="http://www.w3.org/1999/xhtml"
                      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon style={{ width: 14, height: 14, color: nodeColor }} />
                    </div>
                  </foreignObject>
                  <text x={x - HW + 34} y={y - 6}
                    fill="#e8e8f8" fontSize="10" fontWeight="600" fontFamily="sans-serif">
                    {label}
                  </text>
                  {sub && (
                    <text x={x - HW + 34} y={y + 9}
                      fill="#64648a" fontSize="8" fontFamily="monospace">
                      {sub}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-5 mt-4 pt-4 border-t border-ink-700/50">
          {SD_ZONES.map((z) => (
            <div key={z.id} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border" style={{ borderColor: z.color, background: z.color + '22' }} />
              <span className="text-ink-500 text-xs font-mono">{z.label}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-4">
            {[
              { color: '#a78bfa', label: 'request'  },
              { color: '#c4b5fd', label: 'response' },
              { color: '#94a3b8', label: 'CI / deploy' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <svg width="20" height="6">
                  <line x1="0" y1="3" x2="20" y2="3" stroke={color} strokeWidth="1.5" strokeDasharray="4 3" />
                </svg>
                <span className="text-ink-600 text-xs font-mono">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Architecture decisions */}
      <div>
        <div className="text-ink-400 text-xs font-mono uppercase tracking-wider mb-3">Architecture decisions</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SD_PRINCIPLES.map((p) => {
            const c = COLOR[p.color]
            return (
              <div key={p.title} className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
                <div className={`text-sm font-display font-600 mb-1.5 ${c.text}`}>{p.title}</div>
                <div className="text-ink-400 text-xs leading-relaxed">{p.body}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────

export default function TechShowcasePage() {
  const [tab, setTab] = useState('overview')

  return (
    <div className="min-h-screen bg-ink-950 overflow-y-auto">
    <div className="max-w-5xl mx-auto p-8 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-600 text-ink-50">Technical Overview</h1>
          <p className="text-ink-400 text-sm mt-1">CI/CD pipeline, system architecture, and technology stack</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-purple-300 text-xs font-mono">production live</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-ink-700 pb-0">
        {[
          { id: 'overview',      label: 'Overview',       icon: Activity },
          { id: 'sysdesign',     label: 'System Design',  icon: Network  },
          { id: 'pipeline',      label: 'CI/CD Pipeline', icon: Rocket   },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-display font-600 rounded-t-lg border-b-2 transition-all duration-200 -mb-px
              ${tab === id
                ? 'text-purple-200 border-purple-400 bg-purple-500/10'
                : 'text-ink-400 border-transparent hover:text-ink-200 hover:border-ink-600'
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {tab === 'overview'     && <OverviewTab />}
        {tab === 'pipeline'     && <PipelineView />}
        {tab === 'sysdesign'    && <SystemDesignView />}
      </div>
    </div>
    </div>
  )
}
