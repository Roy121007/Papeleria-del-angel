import { useState } from 'react'
import { supabase, supabaseConfigured } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Correo o contraseña incorrectos.')
    setLoading(false)
  }

  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-6">
        <div className="max-w-md bg-surface border border-border rounded-2xl p-6">
          <h1 className="font-display text-lg font-bold text-primary mb-2">Falta configurar Supabase</h1>
          <p className="text-sm text-ink-muted">
            No encontré <code className="bg-primary-soft px-1 rounded">VITE_SUPABASE_URL</code> y{' '}
            <code className="bg-primary-soft px-1 rounded">VITE_SUPABASE_ANON_KEY</code>. Revisa el
            archivo <code className="bg-primary-soft px-1 rounded">.env</code> — instrucciones en el README.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-accent font-display text-2xl font-extrabold mb-3">
            A
          </div>
          <h1 className="font-display text-2xl font-extrabold text-primary">Papelería El Ángel</h1>
          <p className="text-ink-muted text-sm mt-1">Control de pedidos de temporada</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="tu@correo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-coral text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-semibold rounded-lg py-2.5 text-sm hover:bg-primary-dark transition-colors disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="text-center text-xs text-ink-muted mt-4">
          ¿No tienes cuenta? Pídele al administrador que te dé de alta desde Supabase.
        </p>
      </div>
    </div>
  )
}
