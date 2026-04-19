import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import AuthShell from './AuthShell'

interface Props {
  onLoginSuccess: () => void
  onGoToRegister: () => void
}

export default function LoginView({ onLoginSuccess, onGoToRegister }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Completá todos los campos')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : error.message)
      return
    }
    onLoginSuccess()
  }

  const handleGoogle = async () => {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  return (
    <AuthShell>
      <div className="mb-7">
        <h1
          className="text-[36px] font-normal tracking-[-0.028em] text-text m-0 leading-[1.1]"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Iniciar sesión.
        </h1>
        <p className="text-[13px] text-text-muted mt-2">Bienvenida de nuevo.</p>
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full px-3.5 py-[11px] rounded-[10px] border border-gray-border-2 bg-surface text-[13px] font-medium text-text flex items-center justify-center gap-2.5 cursor-pointer hover:bg-surface-2 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2a10 10 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92a8.8 8.8 0 0 0 2.68-6.61z"/><path fill="#34A853" d="M9 18a8.58 8.58 0 0 0 5.96-2.18l-2.92-2.26a5.44 5.44 0 0 1-8.07-2.85H.92v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9a5.4 5.4 0 0 1 .29-1.71V4.96H.92a9 9 0 0 0 0 8.08l3.05-2.33z"/><path fill="#EA4335" d="M9 3.58a4.9 4.9 0 0 1 3.46 1.35l2.58-2.58A8.64 8.64 0 0 0 9 0 9 9 0 0 0 .92 4.96l3.05 2.33A5.36 5.36 0 0 1 9 3.58z"/></svg>
        Continuar con Google
      </button>

      <div
        className="flex items-center gap-3 my-5 text-text-hint text-[11px] uppercase tracking-[0.12em]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <div className="flex-1 h-px bg-gray-border" />
        <span>o con email</span>
        <div className="flex-1 h-px bg-gray-border" />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="text-[12px] text-text-muted font-medium mb-1.5 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dra.carrizo@medibot.ar"
            className="w-full px-3.5 py-[11px] rounded-[10px] border border-gray-border-2 bg-surface text-[14px] text-text focus:border-primary-mid"
          />
        </div>

        <div className="mb-5">
          <div className="flex items-baseline justify-between mb-1.5">
            <label className="text-[12px] text-text-muted font-medium">Contraseña</label>
            <a
              className="text-[11px] text-primary cursor-pointer"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              ¿Olvidaste?
            </a>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-[11px] rounded-[10px] border border-gray-border-2 bg-surface text-[14px] text-text focus:border-primary-mid"
          />
        </div>

        {error && (
          <div className="text-[12px] text-coral mb-4 bg-coral-light rounded-[8px] px-3 py-2">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-[12px] rounded-[10px] text-[14px] font-medium cursor-pointer bg-primary text-surface hover:bg-[#2F3C2D] disabled:opacity-60 transition-colors"
        >
          {loading ? 'Ingresando…' : 'Entrar'}
        </button>
      </form>

      <div className="text-[12px] text-text-muted mt-6 text-center">
        ¿Primera vez?{' '}
        <button
          type="button"
          onClick={onGoToRegister}
          className="text-primary font-medium cursor-pointer bg-transparent border-none hover:underline"
        >
          Creá tu cuenta
        </button>
      </div>
    </AuthShell>
  )
}
