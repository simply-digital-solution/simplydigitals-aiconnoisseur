import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

const STATS = [
  { value: '100', unit: '%',  label: 'Cloud Native' },
  { value: '70',  unit: '%+', label: 'Test Coverage' },
  { value: '0',   unit: 'ms', label: 'Downtime Deploys' },
  { value: 'AI',  unit: '↗',  label: 'First Engineering' },
]

const ABOUT_CARDS = [
  { icon: '🧠', color: 'bg-purple-500/10', title: 'AI-Native Development',      body: 'Every product we build is engineered from the ground up with AI at its core — not bolted on. From architecture decisions to deployment pipelines, intelligence is embedded at every layer.' },
  { icon: '☁️', color: 'bg-cyan-400/10',   title: 'Cloud-First Infrastructure', body: 'Our platforms run on AWS with serverless compute, private VPC databases, and CDN-accelerated frontends — designed for scale, resilience, and cost efficiency from day one.' },
  { icon: '🔬', color: 'bg-amber-400/10',  title: 'ML Analytics at Scale',      body: 'AIConnoisseur — our flagship product — delivers end-to-end ML analytics: data ingestion, preprocessing, A/B testing, visualisation, and model evaluation in a single unified platform.' },
  { icon: '🛡️', color: 'bg-green-400/10',  title: 'Production-Grade Quality',   body: 'We enforce automated testing, 70% coverage thresholds, linting, and security scanning at commit time — not as an afterthought. Every release is audit-ready and stakeholder-reportable.' },
]

const DIFFERENTIATORS = [
  { n: '01', title: 'AI-Prompted Engineering',    body: 'We leverage Claude Code and AI-assisted development to deliver production-ready platforms at a fraction of traditional timelines — without sacrificing quality or security.' },
  { n: '02', title: 'End-to-End Ownership',       body: 'From VPC networking and database migrations to React UI animations and CloudFront routing — we own the full stack. No handoffs. No integration gaps.' },
  { n: '03', title: 'Quality Enforced at Source', body: 'Pre-commit hooks, 70% test coverage thresholds, Codecov trend tracking, and weekly Slack reports mean quality is measured — not assumed.' },
  { n: '04', title: 'Serverless by Default',      body: 'AWS Lambda + API Gateway means zero server management, automatic scaling, and pay-per-request pricing — right-sized infrastructure from day one.' },
  { n: '05', title: 'Infrastructure as Code',     body: 'Every AWS resource is version-controlled and reproducible. Staging environments, disaster recovery, and audit trails are built into the process — not retrofitted.' },
  { n: '06', title: 'Stakeholder Transparency',   body: 'Automated coverage reports to Slack, Codecov trend graphs, and deployment summaries keep management informed without anyone manually pulling data.' },
]

const TECH_CARDS = [
  {
    icon: '🎨', color: 'bg-purple-500/10', title: 'Frontend',      sub: 'React · Vite · Tailwind CSS',
    tags: [
      { label: 'React 18',     cls: 'bg-purple-500/10 border-purple-500/25 text-purple-300' },
      { label: 'Vite 5',       cls: 'bg-purple-500/10 border-purple-500/25 text-purple-300' },
      { label: 'Tailwind CSS', cls: 'bg-purple-500/10 border-purple-500/25 text-purple-300' },
      { label: 'React Router', cls: 'bg-purple-500/10 border-purple-500/25 text-purple-300' },
      { label: 'Zustand',      cls: 'bg-purple-500/10 border-purple-500/25 text-purple-300' },
      { label: 'Vitest',       cls: 'bg-purple-500/10 border-purple-500/25 text-purple-300' },
    ],
  },
  {
    icon: '🐍', color: 'bg-cyan-400/10', title: 'Backend',       sub: 'Python · FastAPI · Lambda',
    tags: [
      { label: 'FastAPI',      cls: 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400' },
      { label: 'Python 3.12',  cls: 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400' },
      { label: 'Pydantic v2',  cls: 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400' },
      { label: 'SQLAlchemy',   cls: 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400' },
      { label: 'Alembic',      cls: 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400' },
      { label: 'Pytest',       cls: 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400' },
    ],
  },
  {
    icon: '☁️', color: 'bg-amber-400/10', title: 'Infrastructure', sub: 'AWS · Serverless · VPC',
    tags: [
      { label: 'AWS Lambda',   cls: 'bg-amber-400/10 border-amber-400/20 text-amber-400' },
      { label: 'API Gateway',  cls: 'bg-amber-400/10 border-amber-400/20 text-amber-400' },
      { label: 'S3 + CloudFront', cls: 'bg-amber-400/10 border-amber-400/20 text-amber-400' },
      { label: 'RDS PostgreSQL',  cls: 'bg-amber-400/10 border-amber-400/20 text-amber-400' },
      { label: 'Private VPC',  cls: 'bg-amber-400/10 border-amber-400/20 text-amber-400' },
      { label: 'IAM OIDC',     cls: 'bg-amber-400/10 border-amber-400/20 text-amber-400' },
    ],
  },
  {
    icon: '⚙️', color: 'bg-green-400/10', title: 'CI/CD & Quality', sub: 'GitHub Actions · Codecov · Slack',
    tags: [
      { label: 'GitHub Actions',   cls: 'bg-green-400/10 border-green-400/20 text-green-400' },
      { label: 'Pre-commit Hooks', cls: 'bg-green-400/10 border-green-400/20 text-green-400' },
      { label: 'Codecov',          cls: 'bg-green-400/10 border-green-400/20 text-green-400' },
      { label: 'Ruff',             cls: 'bg-green-400/10 border-green-400/20 text-green-400' },
      { label: 'ESLint 9',         cls: 'bg-green-400/10 border-green-400/20 text-green-400' },
      { label: 'Docker',           cls: 'bg-green-400/10 border-green-400/20 text-green-400' },
    ],
  },
]

const PIPELINE_STEPS = [
  { icon: '🔀', label: 'Git Push' },
  { icon: '🔍', label: 'Lint' },
  { icon: '🧪', label: 'Tests' },
  { icon: '📊', label: 'Coverage' },
  { icon: '🐳', label: 'Build' },
  { icon: '🚀', label: 'Deploy' },
  { icon: '✅', label: 'Post-Deploy' },
]

function Divider() {
  return (
    <div className="max-w-5xl mx-auto px-8">
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.3), transparent)' }} />
    </div>
  )
}

function SectionLabel({ children }) {
  return <span className="text-xs font-display font-700 tracking-widest uppercase text-purple-400 mb-3 block">{children}</span>
}

function RevealSection({ children, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('opacity-100', 'translate-y-0'); obs.unobserve(el) }
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={`opacity-0 translate-y-6 transition-all duration-700 ease-out ${className}`}>
      {children}
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100 overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ backdropFilter: 'blur(16px)', background: 'rgba(10,10,15,0.75)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="font-display font-800 text-ink-50 tracking-tight">
          Simply<span className="text-purple-400">Digital</span>
        </span>
        <div className="hidden md:flex items-center gap-8">
          {[['#about','About'],['#vision','Vision'],['#differentiators','Why Us'],['#tech','Tech']].map(([href, label]) => (
            <a key={href} href={href} className="text-sm text-ink-300 hover:text-ink-50 transition-colors font-500">{label}</a>
          ))}
          <Link to="/login" className="btn-primary text-sm px-4 py-2">
            Launch App ↗
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section id="hero" className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-32 pb-24 max-w-5xl mx-auto">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/8 text-purple-300 text-xs font-700 tracking-widest uppercase mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            AI-Native Engineering · Singapore
          </div>

          <h1 className="font-display font-800 text-ink-50 leading-none tracking-tight mb-6"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>
            Engineering Intelligence<br />
            <span style={{ background: 'linear-gradient(135deg, #c084fc 0%, #22d3ee 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Into Every Layer
            </span>
          </h1>

          <p className="text-ink-300 text-lg max-w-xl mx-auto mb-10">
            Simply Digital Solutions builds production-ready, cloud-native AI platforms that turn raw data into strategic decisions — shipped fast, built to last.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/login" className="btn-primary">
              ⚡ View Live Platform
            </Link>
            <Link to="/showcase"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-ink-600 bg-ink-800/50 text-ink-100 font-display font-600 text-base transition-all duration-200 hover:border-purple-500/40 hover:bg-purple-500/8">
              🏗️ Tech Architecture
            </Link>
            <a href="https://github.com/simply-digital-solution/simplydigitals-aiconnoisseur" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-ink-600 bg-ink-800/50 text-ink-100 font-display font-600 text-base transition-all duration-200 hover:border-purple-500/40 hover:bg-purple-500/8">
              ⭐ GitHub
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-12 justify-center mt-20 animate-fade-up">
          {STATS.map(({ value, unit, label }) => (
            <div key={label} className="text-center">
              <div className="font-display font-800 text-ink-50 leading-none" style={{ fontSize: '2rem' }}>
                {value}<span className="text-purple-400">{unit}</span>
              </div>
              <div className="text-xs text-ink-500 uppercase tracking-widest mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── ABOUT ── */}
      <section id="about" className="max-w-5xl mx-auto px-6 py-24">
        <RevealSection>
          <SectionLabel>Who We Are</SectionLabel>
          <h2 className="font-display font-800 text-ink-50 tracking-tight mb-3" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
            Built on Precision.<br />Driven by Intelligence.
          </h2>
          <p className="text-ink-300 max-w-lg mb-12">
            We are a Singapore-based technology company specialising in AI-powered analytics platforms, cloud infrastructure, and AI-native software engineering practices.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {ABOUT_CARDS.map(({ icon, color, title, body }) => (
              <div key={title} className="card p-6 flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-200">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${color}`}>{icon}</div>
                <h3 className="font-display font-700 text-ink-50 text-lg">{title}</h3>
                <p className="text-ink-300 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </RevealSection>
      </section>

      <Divider />

      {/* ── VISION & MISSION ── */}
      <section id="vision" className="max-w-5xl mx-auto px-6 py-24">
        <RevealSection>
          <SectionLabel>Purpose</SectionLabel>
          <h2 className="font-display font-800 text-ink-50 tracking-tight mb-3" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
            Vision &amp; Mission
          </h2>
          <p className="text-ink-300 max-w-lg mb-12">The principles that guide every line of code we ship.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl p-8 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(147,51,234,0.08), rgba(21,24,38,0.9))', border: '1px solid rgba(168,85,247,0.2)' }}>
              <div className="text-xs font-700 tracking-widest uppercase text-purple-400 mb-4">Vision</div>
              <h3 className="font-display font-800 text-ink-50 text-xl leading-snug mb-4">
                A world where every business decision is powered by real intelligence.
              </h3>
              <p className="text-ink-300 text-sm leading-relaxed">
                We envision a future where AI is not a privilege of large enterprises — but an accessible, production-grade capability for every organisation that needs to compete on data. Simply Digital Solutions exists to build the bridge between cutting-edge AI research and practical, deployable business value.
              </p>
            </div>
            <div className="rounded-2xl p-8 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.06), rgba(21,24,38,0.9))', border: '1px solid rgba(34,211,238,0.15)' }}>
              <div className="text-xs font-700 tracking-widest uppercase text-cyan-400 mb-4">Mission</div>
              <h3 className="font-display font-800 text-ink-50 text-xl leading-snug mb-4">
                To engineer AI platforms that are fast to deploy, trusted in production, and built to scale.
              </h3>
              <p className="text-ink-300 text-sm leading-relaxed">
                Our mission is to deliver cloud-native AI solutions with the engineering rigour of a world-class software team — automated quality gates, zero-downtime deployments, transparent observability, and stakeholder-ready reporting — so our clients can move fast without breaking things.
              </p>
            </div>
          </div>
        </RevealSection>
      </section>

      <Divider />

      {/* ── DIFFERENTIATORS ── */}
      <section id="differentiators" className="max-w-5xl mx-auto px-6 py-24">
        <RevealSection>
          <SectionLabel>Why Simply Digital</SectionLabel>
          <h2 className="font-display font-800 text-ink-50 tracking-tight mb-3" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
            What Sets Us Apart
          </h2>
          <p className="text-ink-300 max-w-lg mb-12">Six reasons engineering teams and businesses choose us over the alternatives.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DIFFERENTIATORS.map(({ n, title, body }) => (
              <div key={n} className="card p-6 hover:-translate-y-1 transition-transform duration-200">
                <div className="font-display font-800 text-4xl mb-3"
                  style={{ background: 'linear-gradient(135deg, #c084fc, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {n}
                </div>
                <h3 className="font-display font-700 text-ink-50 mb-2">{title}</h3>
                <p className="text-ink-300 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </RevealSection>
      </section>

      <Divider />

      {/* ── TECH STACK ── */}
      <section id="tech" className="max-w-5xl mx-auto px-6 py-24">
        <RevealSection>
          <SectionLabel>Technical Superiority</SectionLabel>
          <h2 className="font-display font-800 text-ink-50 tracking-tight mb-3" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
            State-of-the-Art.<br />Every Layer.
          </h2>
          <p className="text-ink-300 max-w-lg mb-12">
            Our stack is not a collection of trendy tools — it is a deliberate architecture chosen for production reliability, developer velocity, and long-term maintainability.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {TECH_CARDS.map(({ icon, color, title, sub, tags }) => (
              <div key={title} className="card p-6 hover:-translate-y-1 transition-transform duration-200">
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${color}`}>{icon}</div>
                  <div>
                    <div className="font-display font-700 text-ink-50">{title}</div>
                    <div className="text-xs text-ink-500">{sub}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map(({ label, cls }) => (
                    <span key={label} className={`px-3 py-1 rounded-full text-xs font-600 border ${cls}`}>{label}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pipeline strip */}
          <div className="mt-10 rounded-xl overflow-hidden border border-ink-700 bg-ink-900/60 flex flex-wrap">
            {PIPELINE_STEPS.map(({ icon, label }, i) => (
              <div key={label} className={`flex-1 min-w-[90px] py-4 text-center ${i < PIPELINE_STEPS.length - 1 ? 'border-r border-ink-700/60' : ''}`}>
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-xs font-600 text-ink-300 uppercase tracking-widest">{label}</div>
              </div>
            ))}
          </div>
          <p className="text-center mt-3 text-xs text-ink-500">
            Explore the full animated pipeline →{' '}
            <Link to="/showcase" className="text-purple-400 hover:text-purple-300 transition-colors">
              View Architecture
            </Link>
          </p>
        </RevealSection>
      </section>

      <Divider />

      {/* ── CTA ── */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <RevealSection>
          <div className="rounded-2xl p-16 text-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(147,51,234,0.1), rgba(34,211,238,0.05))', border: '1px solid rgba(168,85,247,0.2)' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(147,51,234,0.15) 0%, transparent 70%)', top: '-60px' }} />
            <h2 className="font-display font-800 text-ink-50 tracking-tight mb-4" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)' }}>
              Ready to See It Live?
            </h2>
            <p className="text-ink-300 max-w-md mx-auto mb-10">
              Explore the platform, walk through the technical architecture, or dive into the source code on GitHub.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/login" className="btn-primary">
                ⚡ Launch AIConnoisseur
              </Link>
              <Link to="/showcase"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-ink-600 bg-ink-800/50 text-ink-100 font-display font-600 text-base transition-all duration-200 hover:border-purple-500/40 hover:bg-purple-500/8">
                🏗️ Tech Architecture
              </Link>
              <a href="https://github.com/simply-digital-solution/simplydigitals-aiconnoisseur" target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-ink-600 bg-ink-800/50 text-ink-100 font-display font-600 text-base transition-all duration-200 hover:border-purple-500/40 hover:bg-purple-500/8">
                ⭐ View on GitHub
              </a>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-ink-800 px-6 py-6 flex flex-wrap items-center justify-between gap-4 max-w-5xl mx-auto">
        <span className="font-display font-800 text-ink-50">
          Simply<span className="text-purple-400">Digital</span> Solutions
        </span>
        <p className="text-xs text-ink-500">© 2026 Simply Digital Solutions · Singapore</p>
        <div className="flex gap-6">
          {[
            ['https://www.simplydigitals.com.sg', 'Product'],
            ['/showcase', 'Architecture', true],
            ['https://github.com/simply-digital-solution/simplydigitals-aiconnoisseur', 'GitHub'],
          ].map(([href, label, internal]) =>
            internal
              ? <Link key={label} to={href} className="text-xs text-ink-500 hover:text-purple-400 transition-colors">{label}</Link>
              : <a key={label} href={href} target="_blank" rel="noreferrer" className="text-xs text-ink-500 hover:text-purple-400 transition-colors">{label}</a>
          )}
        </div>
      </footer>
    </div>
  )
}
