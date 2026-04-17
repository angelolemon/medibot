import { useState } from 'react'
import { supabase } from '../../lib/supabase'

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

  return (
    <div className="min-h-screen bg-gray-bg flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="text-2xl font-semibold text-primary mb-1">MediBot</div>
          <div className="text-sm text-text-hint">Panel profesional</div>
        </div>

        <div className="bg-white border border-gray-border rounded-[10px] p-6">
          <div className="text-lg font-semibold mb-1">Iniciar sesión</div>
          <div className="text-sm text-text-muted mb-6">Ingresá a tu panel médico</div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-3 py-2.5 rounded-md border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid"
              />
            </div>

            <div className="mb-4">
              <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2.5 rounded-md border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid"
              />
            </div>

            {error && (
              <div className="text-xs text-coral mb-4 bg-coral-light rounded-md px-3 py-2">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-md text-sm font-medium cursor-pointer border border-primary bg-primary text-white hover:bg-[#534AB7] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        <div className="text-center mt-4">
          <span className="text-sm text-text-muted">¿No tenés cuenta? </span>
          <button
            onClick={onGoToRegister}
            className="text-sm text-primary font-medium cursor-pointer hover:underline bg-transparent border-none"
          >
            Crear cuenta
          </button>
        </div>
      </div>
    </div>
  )
}
