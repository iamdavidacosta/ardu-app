import { useState, type FormEvent } from 'react'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { useAuth } from './auth-context'
import { SquirrelMark } from '../components/SquirrelMark'

export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [registering, setRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (registering) await signUp(email, password)
      else await signIn(email, password)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible iniciar sesión.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <div className="ambient-orb ambient-orb--one" />
      <div className="ambient-orb ambient-orb--two" />
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true"><SquirrelMark size={31} /></div>
        <p className="eyebrow">ARDU · memoria de compras</p>
        <h1 id="login-title">La ardilla lo recuerda.</h1>
        <p className="login-intro">Tus compras, productos y precios históricos permanecen privados en tu cuenta.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Correo
            <input
              autoComplete="email"
              inputMode="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Contraseña
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={submitting}>
            <LockKeyhole size={18} />
            {submitting ? 'Entrando…' : 'Entrar'}
            {!submitting && <ArrowRight size={18} />}
          </button>
        </form>
        <button type="button" className="text-link auth-switch" onClick={() => { setRegistering((value) => !value); setError('') }}>
          {registering ? '¿Ya tienes una cuenta? Entrar' : '¿Aún no tienes cuenta? Crear una'}
        </button>
      </section>
    </main>
  )
}
