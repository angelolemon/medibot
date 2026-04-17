import { useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Props {
  onRegisterSuccess: () => void
  onGoToLogin: () => void
}

export default function RegisterView({ onRegisterSuccess, onGoToLogin }: Props) {
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError('Completá todos los campos')
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Ingresá un email válido')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }
    setStep('verify')
  }

  return (
    <div className="min-h-screen bg-gray-bg flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="text-2xl font-semibold text-primary mb-1">MediBot</div>
          <div className="text-sm text-text-hint">Panel profesional</div>
        </div>

        {step === 'form' ? (
          <>
            <div className="bg-white border border-gray-border rounded-[10px] p-6">
              <div className="text-lg font-semibold mb-1">Crear cuenta</div>
              <div className="text-sm text-text-muted mb-6">Registrate para acceder al panel</div>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">Nombre</label>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Laura" className="w-full px-3 py-2.5 rounded-md border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid" />
                  </div>
                  <div>
                    <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">Apellido</label>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Pérez" className="w-full px-3 py-2.5 rounded-md border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid" />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="w-full px-3 py-2.5 rounded-md border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid" />
                </div>

                <div className="mb-4">
                  <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">Contraseña</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full px-3 py-2.5 rounded-md border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid" />
                </div>

                <div className="mb-4">
                  <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">Confirmar contraseña</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repetí tu contraseña" className="w-full px-3 py-2.5 rounded-md border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid" />
                </div>

                {error && (
                  <div className="text-xs text-coral mb-4 bg-coral-light rounded-md px-3 py-2">{error}</div>
                )}

                <button type="submit" disabled={loading} className="w-full py-2.5 rounded-md text-sm font-medium cursor-pointer border border-primary bg-primary text-white hover:bg-[#534AB7] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
              </form>
            </div>

            <div className="text-center mt-4">
              <span className="text-sm text-text-muted">¿Ya tenés cuenta? </span>
              <button onClick={onGoToLogin} className="text-sm text-primary font-medium cursor-pointer hover:underline bg-transparent border-none">
                Iniciar sesión
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white border border-gray-border rounded-[10px] p-6 text-center">
            <div className="text-4xl mb-4">📧</div>
            <div className="text-lg font-semibold mb-2">Verificá tu email</div>
            <div className="text-sm text-text-muted mb-2">Enviamos un link de verificación a:</div>
            <div className="text-sm font-medium text-primary mb-6">{email}</div>
            <div className="text-xs text-text-hint mb-6">
              Revisá tu bandeja de entrada (y spam) y hacé clic en el link para activar tu cuenta. Luego volvé acá e iniciá sesión.
            </div>

            <button
              onClick={onGoToLogin}
              className="w-full py-2.5 rounded-md text-sm font-medium cursor-pointer border border-primary bg-primary text-white hover:bg-[#534AB7] transition-colors mb-3"
            >
              Ir a iniciar sesión
            </button>
            <button
              onClick={() => setStep('form')}
              className="w-full py-2.5 rounded-md text-sm cursor-pointer border border-gray-border bg-white text-text-muted hover:bg-gray-bg transition-colors"
            >
              Volver al formulario
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
