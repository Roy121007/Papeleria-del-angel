import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formatMoney, formatDate, getDateOnly, getPagoDate } from '../lib/utils'

export default function ResumenVentas({ refreshKey = 0 }) {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [grados, setGrados] = useState([])
  const [openGrupo, setOpenGrupo] = useState(null)
  const [corteFecha, setCorteFecha] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      const [{ data: pedidosData }, { data: gradosData }, { data: itemsData }] = await Promise.all([
        supabase.from('pedidos').select('*, grados(nombre)').order('created_at', { ascending: false }),
        supabase.from('grados').select('*').order('orden'),
        supabase.from('pedido_items').select('*'),
      ])

      const itemsPorPedido = new Map()
      for (const item of itemsData || []) {
        if (!itemsPorPedido.has(item.pedido_id)) itemsPorPedido.set(item.pedido_id, [])
        itemsPorPedido.get(item.pedido_id).push(item)
      }

      const pedidosConItems = (pedidosData || []).map((pedido) => ({
        ...pedido,
        items: itemsPorPedido.get(pedido.id) || [],
      }))

      setPedidos(pedidosConItems)
      setGrados(gradosData || [])
      setLoading(false)
    }

    cargar()
  }, [refreshKey])

  const resumen = useMemo(() => {
    const grupos = new Map()
    let total = 0
    let pedidosActivos = 0

    for (const pedido of pedidos) {
      const gradoNombre = pedido.grados?.nombre || 'Sin grado'
      const items = pedido.items || []
      const subtotal = items.reduce((sum, it) => sum + Number(it.subtotal || 0), 0)
      const totalPedido = subtotal + (pedido.tipo_entrega === 'domicilio' ? 80 : 0)
      total += totalPedido
      pedidosActivos += 1

      if (!grupos.has(gradoNombre)) {
        grupos.set(gradoNombre, { grado: gradoNombre, pedidos: [], total: 0 })
      }
      const grupo = grupos.get(gradoNombre)
      grupo.pedidos.push({ ...pedido, totalPedido })
      grupo.total += totalPedido
    }

    const gruposArray = Array.from(grupos.values()).sort((a, b) => {
      const gradoA = a.grado || ''
      const gradoB = b.grado || ''
      return gradoA.localeCompare(gradoB, 'es', { sensitivity: 'base' })
    })

    const max = Math.max(...gruposArray.map((grupo) => grupo.total || 0), 1)

    const fechaCorte = getDateOnly(corteFecha)

    const corte = pedidos.filter((pedido) => {
      if (pedido.pago_estado !== 'pagado') return false
      const fechaPago = getPagoDate(pedido)
      return Boolean(fechaPago && fechaPago === fechaCorte)
    })

    const corteTotal = corte.reduce((sum, pedido) => {
      const items = pedido.items || []
      const subtotal = items.reduce((acc, it) => acc + Number(it.subtotal || 0), 0)
      return sum + subtotal + (pedido.tipo_entrega === 'domicilio' ? 80 : 0)
    }, 0)

    const historial = pedidos.reduce((acc, pedido) => {
      if (pedido.pago_estado !== 'pagado') return acc
      const fecha = getPagoDate(pedido) || getDateOnly(pedido.created_at)
      if (!fecha) return acc
      if (!acc[fecha]) acc[fecha] = { fecha, total: 0, pedidos: 0 }
      const items = pedido.items || []
      const subtotal = items.reduce((sum, it) => sum + Number(it.subtotal || 0), 0)
      acc[fecha].total += subtotal + (pedido.tipo_entrega === 'domicilio' ? 80 : 0)
      acc[fecha].pedidos += 1
      return acc
    }, {})

    const pagadosTotal = pedidos.reduce((sum, pedido) => {
      if (pedido.pago_estado !== 'pagado') return sum
      const items = pedido.items || []
      const subtotal = items.reduce((acc, it) => acc + Number(it.subtotal || 0), 0)
      return sum + subtotal + (pedido.tipo_entrega === 'domicilio' ? 80 : 0)
    }, 0)

    return {
      total,
      pedidosActivos,
      corteTotal,
      cortePedidos: corte.length,
      pendientesPago: pedidos.filter((pedido) => pedido.pago_estado !== 'pagado').length,
      pagados: pedidos.filter((pedido) => pedido.pago_estado === 'pagado').length,
      pagadosTotal,
      historial: Object.values(historial).sort((a, b) => b.fecha.localeCompare(a.fecha)),
      grupos: gruposArray.map((grupo) => ({ ...grupo, share: (grupo.total / max) * 100 })),
    }
  }, [corteFecha, pedidos])

  const chartSegments = useMemo(() => {
    const colors = ['#243b6b', '#4f8cff', '#22a06b', '#e06b4e', '#8c6df2']
    const total = Math.max(resumen.total, 1)
    let offset = 0

    return resumen.grupos.map((grupo, index) => {
      const value = (grupo.total / total) * 100
      const segment = {
        ...grupo,
        value,
        offset,
        color: colors[index % colors.length],
      }
      offset += value
      return segment
    })
  }, [resumen])

  if (loading) return <p className="text-sm text-ink-muted">Cargando resumen…</p>

  return (
    <div className="space-y-4">
      <div className="soft-card p-5 glow-ring">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-ink-muted">Ventas acumuladas</p>
            <p className="text-3xl font-display font-extrabold text-primary mt-1">{formatMoney(resumen.total)}</p>
            <p className="text-sm text-ink-muted mt-2">
              {resumen.pedidosActivos} pedidos registrados hasta el momento.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-border bg-primary-soft p-3 min-w-[140px]">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Pedidos</p>
              <p className="text-xl font-bold text-primary">{resumen.pedidosActivos}</p>
            </div>
            <div className="rounded-2xl border border-border bg-accent-soft p-3 min-w-[140px]">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Grupos</p>
              <p className="text-xl font-bold text-accent">{resumen.grupos.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="soft-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-ink-muted">Corte del día</p>
            <p className="text-2xl font-display font-bold text-primary">{formatMoney(resumen.corteTotal)}</p>
            <p className="text-sm text-ink-muted">Solo cuenta los pedidos marcados como pagados en la fecha seleccionada.</p>
          </div>
          <label className="text-sm text-ink-muted">
            <span className="mb-1 block">Selecciona una fecha</span>
            <input
              type="date"
              value={corteFecha}
              onChange={(event) => setCorteFecha(event.target.value)}
              className="rounded-xl border border-border bg-white px-3 py-2 shadow-sm"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-bg/60 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Total del corte</p>
            <p className="mt-1 text-xl font-bold text-primary">{formatMoney(resumen.corteTotal)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-teal-soft p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Pagados</p>
            <p className="mt-1 text-xl font-bold text-teal">{resumen.cortePedidos}</p>
          </div>
          <div className="rounded-2xl border border-border bg-indigo-soft p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Total pagado</p>
            <p className="mt-1 text-xl font-bold text-indigo">{formatMoney(resumen.pagadosTotal)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-coral-soft p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Pendientes</p>
            <p className="mt-1 text-xl font-bold text-coral">{resumen.pendientesPago}</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-ink-muted">Registro reciente</p>
          <div className="mt-2 space-y-2">
            {resumen.historial.slice(0, 6).map((entry) => (
              <div key={entry.fecha} className="flex items-center justify-between rounded-2xl border border-border bg-white/80 px-3 py-2 text-sm">
                <span className="text-ink-muted">{entry.fecha}</span>
                <span className="font-semibold text-ink">{formatMoney(entry.total)} · {entry.pedidos} pedidos</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="soft-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-ink-muted">Distribución</p>
              <p className="text-sm font-semibold text-ink">Por grado</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center">
            <div className="relative h-52 w-52 rounded-full border border-border/70 bg-[conic-gradient(#243b6b_0_30%,#4f8cff_30%_56%,#22a06b_56%_78%,#e06b4e_78%_92%,#8c6df2_92%_100%)] p-3 shadow-[0_20px_60px_-24px_rgba(36,59,107,0.55)]">
              <div className="chart-slice flex h-full w-full items-center justify-center rounded-full bg-white text-center shadow-inner">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Total</p>
                  <p className="text-xl font-bold text-primary">{formatMoney(resumen.total)}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {chartSegments.map((segment) => (
              <div key={segment.grado} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="text-ink-muted">{segment.grado}</span>
                </div>
                <span className="font-semibold text-ink">{Math.round(segment.value)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {resumen.grupos.map((grupo) => (
            <div key={grupo.grado} className="soft-card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenGrupo(openGrupo === grupo.grado ? null : grupo.grado)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <p className="font-semibold text-sm">{grupo.grado}</p>
                  <p className="text-xs text-ink-muted">{grupo.pedidos.length} pedidos</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{formatMoney(grupo.total)}</p>
                  <p className="text-xs text-ink-muted">{openGrupo === grupo.grado ? 'Ocultar' : 'Ver detalle'}</p>
                </div>
              </button>
              {openGrupo === grupo.grado && (
                <div className="border-t border-border px-4 py-3 space-y-2 bg-bg/50">
                  {grupo.pedidos.map((pedido) => (
                    <div key={pedido.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{pedido.alumno_nombre}</p>
                        <p className="text-xs text-ink-muted">
                          {pedido.tipo_entrega === 'domicilio' ? 'A domicilio' : 'Recoge en tienda'}
                          {pedido.fecha_entrega ? ` · ${formatDate(pedido.fecha_entrega)}` : ''}
                        </p>
                      </div>
                      <p className="font-semibold">{formatMoney(pedido.totalPedido)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {grados.length > 0 && (
        <div className="soft-card p-5 text-sm text-ink-muted">
          <p className="font-semibold text-ink mb-2">Grados disponibles</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {grados.map((grado) => (
              <li key={grado.id} className="rounded-xl border border-border bg-bg/50 px-3 py-2">• {grado.nombre}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
