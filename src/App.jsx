import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase, supabaseConfigured } from './supabaseClient'
import Login from './components/Login'
import NuevoPedido from './pages/NuevoPedido'
import Pedidos from './pages/Pedidos'
import ListosParaNotificar from './pages/ListosParaNotificar'
import ResumenVentas from './pages/ResumenVentas'
import Etiquetas from './pages/Etiquetas'
import { formatDate } from './lib/utils'

const TABS = [
  { key: 'nuevo', label: 'Nuevo pedido', icon: '📝' },
  { key: 'pedidos', label: 'Pedidos', icon: '📋' },
  { key: 'etiquetas', label: 'Etiquetas', icon: '🏷️' },
  { key: 'listos', label: 'Listos para notificar', icon: '📣' },
  { key: 'resumen', label: 'Resumen de ventas', icon: '💰' },
]

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading, null = signed out
  const [perfil, setPerfil] = useState(null)
  const [tab, setTab] = useState('nuevo')
  const [listosCount, setListosCount] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [dashboardPedidos, setDashboardPedidos] = useState([])

  useEffect(() => {
    if (!supabaseConfigured) {
      setSession(null)
      return
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    supabase
      .from('perfiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setPerfil(data))
  }, [session])

  const refreshListosCount = useCallback(() => {
    if (!session) return
    supabase
      .from('pedidos')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'listo')
      .then(({ count }) => setListosCount(count || 0))
  }, [session])

  useEffect(() => {
    if (!session) return
    supabase
      .from('pedidos')
      .select('*, grados(nombre)')
      .order('fecha_entrega', { ascending: true, nullsFirst: true })
      .then(({ data }) => setDashboardPedidos(data || []))
  }, [session, refreshKey, tab])

  useEffect(() => {
    refreshListosCount()
  }, [refreshListosCount, refreshKey, tab])

  const resumen = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10)
    const pendientesPago = dashboardPedidos.filter((pedido) => pedido.pago_estado !== 'pagado').length
    const listos = dashboardPedidos.filter((pedido) => pedido.estado === 'listo').length
    const atrasados = dashboardPedidos.filter((pedido) => {
      if (!pedido.fecha_entrega || pedido.estado === 'entregado') return false
      return pedido.fecha_entrega < hoy && pedido.estado !== 'listo'
    })
    const proximo = dashboardPedidos.find((pedido) => pedido.fecha_entrega && pedido.estado !== 'entregado')

    return {
      pendientesPago,
      listos,
      atrasados,
      proximo,
      total: dashboardPedidos.length,
    }
  }, [dashboardPedidos])

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-ink-muted text-sm">
        Cargando…
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 border-b border-white/15 bg-[linear-gradient(135deg,#182646_0%,#243b6b_40%,#2f4f8f_100%)] text-white shadow-[0_16px_40px_-18px_rgba(17,26,49,0.55)] backdrop-blur-2xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 rounded-2xl bg-gradient-to-br from-accent via-[#7db4ff] to-[#dceeff] text-primary-dark font-display font-extrabold flex items-center justify-center shadow-[0_12px_30px_-10px_rgba(79,140,255,0.7)]">
              <span className="drop-shadow-sm text-[1.05rem]">A</span>
            </div>
            <div>
              <h1 className="font-display font-bold leading-tight text-[1.03rem]">Papelería El Ángel</h1>
              <p className="text-xs text-white/75 leading-tight">
                {perfil ? `Hola, ${perfil.nombre}` : 'Control de pedidos'}
              </p>
            </div>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm transition-all duration-200 hover:bg-white/20 hover:text-white"
          >
            Salir
          </button>
        </div>
        <nav className="max-w-5xl mx-auto px-2 sm:px-6 pb-3 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                tab === t.key
                  ? 'bg-white text-primary shadow-[0_12px_36px_-12px_rgba(255,255,255,0.5)] scale-[1.02]'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.label}
              {t.key === 'listos' && listosCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-accent text-white text-[11px] font-bold shadow-lg shadow-accent/20">
                  {listosCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <section className="soft-card p-4 sm:p-5 panel-enter">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-muted">Panel de control</p>
              <h2 className="mt-1 font-display text-xl font-bold text-primary">Resumen rápido del día</h2>
              <p className="mt-1 text-sm text-ink-muted">Todo lo importante de tus pedidos en un solo vistazo.</p>
            </div>
            <div className="rounded-2xl border border-border bg-primary-soft px-3 py-2 text-sm font-semibold text-primary">
              {resumen.total} pedidos activos
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-border bg-bg/70 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Listos</p>
              <p className="mt-1 text-2xl font-bold text-teal">{resumen.listos}</p>
            </div>
            <div className="rounded-2xl border border-border bg-coral-soft p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Pendientes de pago</p>
              <p className="mt-1 text-2xl font-bold text-coral">{resumen.pendientesPago}</p>
            </div>
            <div className="rounded-2xl border border-border bg-accent-soft p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Vencidos</p>
              <p className="mt-1 text-2xl font-bold text-accent">{resumen.atrasados.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-white/80 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Próxima entrega</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {resumen.proximo ? `${resumen.proximo.alumno_nombre} · ${formatDate(resumen.proximo.fecha_entrega)}` : 'Sin pendientes'}
              </p>
            </div>
          </div>
          {resumen.atrasados.length > 0 && (
            <div className="mt-4 rounded-2xl border border-coral/20 bg-coral-soft p-3 text-sm text-coral">
              <p className="font-semibold">⚠️ Atención: hay {resumen.atrasados.length} pedido(s) con fecha de entrega vencida.</p>
              <p className="mt-1 text-coral/80">Revisa los pedidos en la pestaña de Pedidos o Listos para notificar.</p>
            </div>
          )}
        </section>

        {tab === 'nuevo' && <NuevoPedido perfil={perfil} />}
        {tab === 'pedidos' && <Pedidos onChange={() => setRefreshKey((k) => k + 1)} />}
        {tab === 'etiquetas' && <Etiquetas />}
        {tab === 'listos' && <ListosParaNotificar onChange={() => setRefreshKey((k) => k + 1)} />}
        {tab === 'resumen' && <ResumenVentas refreshKey={refreshKey} />}
      </main>
    </div>
  )
}