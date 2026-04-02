import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Cpu } from 'lucide-react'
import toast from 'react-hot-toast'
import { GoogleLogin } from '@react-oauth/google'
import { authApi } from '../../utils/api'
import { useStore } from '../../store'

export default function LoginPage() {
  const navigate = useNavigate()
  const setToken = useStore((s) => s.setToken)
  const [mode, setMode] = useState('login')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleGoogleSuccess(credentialResponse) {
    setLoading(true)
    try {
      const { data } = await authApi.googleLogin(credentialResponse.credential)
      setToken(data.access_token)
      toast.success('Welcome!')
      navigate('/app')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'register') {
        await authApi.register(form)
        toast.success('Account created — please log in')
        setMode('login')
      } else {
        const { data } = await authApi.login({ email: form.email, password: form.password })
        setToken(data.access_token)
        toast.success('Welcome back')
        navigate('/app')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-ink-950"
      style={{
        backgroundImage: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(147,51,234,0.10) 0%, transparent 70%)',
      }}>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid-ink bg-grid opacity-40 pointer-events-none" />

      <div className="relative w-full max-w-md animate-fade-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 mb-4 animate-pulse-purple">
            <Cpu className="w-7 h-7 text-purple-400" />
          </div>
          <h1 className="font-display text-3xl font-700 text-ink-50">
            AI<span className="text-gradient-purple">Connoisseur</span>
          </h1>
          <p className="text-ink-200 text-sm mt-1 font-body">ML Analytics Platform by Simply Digital Solutions</p>
        </div>

        <div className="card p-8">
          {/* Google Sign-In */}
          <div className="flex justify-center mb-5" data-testid="google-signin-container">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google sign-in failed')}
              theme="filled_black"
              size="large"
              shape="rectangular"
              width="368"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-ink-700" />
            <span className="text-ink-500 text-xs font-body">or sign in with email</span>
            <div className="flex-1 h-px bg-ink-700" />
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-ink-800 rounded-xl mb-8">
            {['login', 'register'].map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-display font-500 rounded-lg transition-all duration-200 capitalize
                  ${mode === m ? 'bg-ink-600 text-ink-50 shadow-sm' : 'text-ink-200 hover:text-ink-50'}`}>
                {m}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label">Full name</label>
                <input className="input" placeholder="Jane Smith" value={form.full_name} onChange={set('full_name')} required />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password} onChange={set('password')} required minLength={8} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2 py-3 text-base">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-ink-950/30 border-t-ink-950 rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

        </div>

        <p className="text-center text-ink-600 text-xs mt-6">
          aiconnoisseur-api · simplydigitalsolutions
        </p>
      </div>
    </div>
  )
}
