import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { ETIQUETA_ESTADO_LABELS, ESTADO_LABELS, formatDate } from '../lib/utils'

const ETIQUETA_FILTROS = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendiente_diseno', label: 'Falta' },
  { key: 'enviada', label: 'En proceso' },
  { key: 'recibida', label: 'Recibidas' },
]

export default function Etiquetas() {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('todos')

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('pedidos')
      .select('*, grados(nombre)')
      .eq('quiere_etiquetas', true)
      .order('fecha_entrega', { ascending: true, nullsFirst: true })
    setPedidos(data || [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  async function actualizarEstado(id, value) {
    setPedidos((prev) => prev.map((pedido) => (pedido.id === id ? { ...pedido, etiquetas_estado: value } : pedido)))
    await supabase.from('pedidos').update({ etiquetas_estado: value }).eq('id', id)
  }

  const summary = useMemo(() => {
    const counts = {
      pendiente_diseno: 0,
      enviada: 0,
      recibida: 0,
    }

    pedidos.forEach((pedido) => {
      const estado = pedido.etiquetas_estado || 'pendiente_diseno'
      counts[estado] = (counts[estado] || 0) + 1
    })

    return {
      total: pedidos.length,
      pendiente: counts.pendiente_diseno,
      enviada: counts.enviada,
      recibida: counts.recibida,
    }
  }, [pedidos])

  const filtrados = useMemo(() => {
    if (filtroEtiqueta === 'todos') return pedidos
    return pedidos.filter((pedido) => (pedido.etiquetas_estado || 'pendiente_diseno') === filtroEtiqueta)
  }, [pedidos, filtroEtiqueta])

  return (
    <div className="space-y-4">
      <section className="soft-card p-4 sm:p-5 space-y-4 float-soft">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">Resumen de etiquetas</p>
            <h2 className="font-display font-bold text-lg text-primary">Lo que hay que mandar a hacer</h2>
          </div>
          <p className="text-sm text-ink-muted">Filtra por falta, en proceso o recibidas para trabajar con más claridad.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-bg/60 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Total</p>
            <p className="mt-1 text-2xl font-bold text-primary">{summary.total}</p>
          </div>
          <div className="rounded-2xl border border-border bg-coral-soft p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Falta</p>
            <p className="mt-1 text-2xl font-bold text-coral">{summary.pendiente}</p>
          </div>
          <div className="rounded-2xl border border-border bg-accent-soft p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">En proceso</p>
            <p className="mt-1 text-2xl font-bold text-accent">{summary.enviada}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {ETIQUETA_FILTROS.map((filtro) => {
            const activo = filtroEtiqueta === filtro.key
            return (
              <button
                key={filtro.key}
                type="button"
                onClick={() => setFiltroEtiqueta(filtro.key)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  activo
                    ? 'border-primary bg-primary text-white shadow-sm'
                    : 'border-border bg-white/80 text-ink-muted hover:border-primary/30 hover:text-primary'
                }`}
              >
                {filtro.label}
              </button>
            )
          })}
        </div>
      </section>

      {loading && <p className="text-sm text-ink-muted">Cargando etiquetas…</p>}
      {!loading && filtrados.length === 0 && (
        <p className="text-sm text-ink-muted py-8 text-center">No hay pedidos con etiquetas en este filtro.</p>
      )}

      <div className="space-y-2">
        {filtrados.map((pedido) => {
          const estadoActual = pedido.etiquetas_estado || 'pendiente_diseno'
          const estadoClasses = {
            pendiente_diseno: 'border-coral/20 bg-coral-soft text-coral',
            enviada: 'border-accent/20 bg-accent-soft text-accent',
            recibida: 'border-teal/20 bg-teal-soft text-teal',
          }

          return (
            <article key={pedido.id} className="soft-card p-4 panel-enter">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-ink">{pedido.alumno_nombre}</p>
                  <p className="text-sm text-ink-muted">
                    {pedido.grados?.nombre || 'Sin grado'} · {pedido.tipo_entrega === 'domicilio' ? 'A domicilio' : 'Recoge en tienda'}
                    {pedido.fecha_entrega ? ` · ${formatDate(pedido.fecha_entrega)}` : ''}
                  </p>
                  <p className="mt-2 text-sm">
                    <span className="text-ink-muted">Nombre:</span> {pedido.etiquetas_nombre_alumno || '—'}
                    {pedido.etiquetas_personaje ? ` · Diseño: ${pedido.etiquetas_personaje}` : ''}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${estadoClasses[estadoActual] || 'border-border bg-bg/70 text-ink-muted'}`}>
                    {ETIQUETA_ESTADO_LABELS[estadoActual] || estadoActual}
                  </span>
                  <select
                    value={estadoActual}
                    onChange={(event) => actualizarEstado(pedido.id, event.target.value)}
                    className="rounded-lg border border-border px-3 py-2 text-sm bg-white shadow-sm"
                  >
                    {Object.entries(ETIQUETA_ESTADO_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
