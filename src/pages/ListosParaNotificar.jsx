import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formatDate, waLink } from '../lib/utils'

function normalizarTelefono(telefono) {
  return (telefono || '').replace(/\D/g, '')
}

export default function ListosParaNotificar({ onChange }) {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('pedidos')
      .select('*, grados(nombre)')
      .eq('estado', 'listo')
      .order('notificado', { ascending: true })
      .order('fecha_entrega', { ascending: true })
    setPedidos(data || [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  async function marcarVarios(ids, patch) {
    const idsSet = new Set(ids)
    setPedidos((prev) => prev.map((p) => (idsSet.has(p.id) ? { ...p, ...patch } : p)))
    await Promise.all(ids.map((id) => supabase.from('pedidos').update(patch).eq('id', id)))
    onChange?.()
    if (patch.estado === 'entregado') {
      setTimeout(() => setPedidos((prev) => prev.filter((p) => !idsSet.has(p.id))), 400)
    }
  }

  async function marcar(id, patch) {
    await marcarVarios([id], patch)
  }

  function mensajeParaGrupo(grupo) {
    const nombres = grupo.pedidos.map((p) => `${p.alumno_nombre} (${p.grados?.nombre})`)
    const nombresTexto =
      nombres.length > 1
        ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
        : nombres[0]
    const lugar =
      grupo.pedidos.every((p) => p.tipo_entrega === 'domicilio')
        ? 'ya salimos / saldremos con ellos a domicilio'
        : grupo.pedidos.every((p) => p.tipo_entrega !== 'domicilio')
          ? 'ya puedes pasar a recogerlo '
          : 'ya los tenemos listos para entregarlos'
    const intro =
      grupo.pedidos.length > 1
        ? `¡Hola! Los pedidos de ${nombresTexto} ya están listos`
        : `¡Hola! El pedido de ${nombresTexto} ya está listo`

    return `${intro}, ${lugar}. 😊 Nos ubicamos en San Luis Gonzaga 4509-A(planta alta) en los horarios de Lun-Vie 9:00am-8:00pm y los Sabados 10:00am-4:00pm. Muchas gracias, bonito dia.`
  }

  const gruposAgrupados = useMemo(() => {
    const grupos = pedidos.reduce((acc, pedido) => {
      const key = normalizarTelefono(pedido.telefono) || `sin-telefono-${pedido.id}`
      if (!acc.has(key)) {
        acc.set(key, {
          telefono: pedido.telefono,
          pedidos: [],
          ids: [],
        })
      }

      const grupo = acc.get(key)
      grupo.pedidos.push(pedido)
      grupo.ids.push(pedido.id)
      return acc
    }, new Map())

    return Array.from(grupos.values()).sort((a, b) => {
      const primerA = a.pedidos[0]?.id ?? 0
      const primerB = b.pedidos[0]?.id ?? 0
      return primerA - primerB
    })
  }, [pedidos])

  if (loading) {
    return <div className="soft-card p-6 text-sm text-ink-muted">Cargando pedidos listos…</div>
  }

  if (pedidos.length === 0) {
    return (
      <div className="soft-card p-10 text-center text-ink-muted">
        <p className="text-3xl mb-2">✅</p>
        <p className="text-sm">No hay pedidos listos pendientes de avisar en este momento.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <section className="soft-card p-4 panel-enter">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">Avisos para entregar</p>
            <p className="text-sm text-ink-muted mt-1">
              Estos pedidos ya están marcados como <strong>Listos</strong>. Manda el WhatsApp y luego
              confirma la entrega cuando el cliente pase o se le lleve.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-primary-soft px-3 py-2 text-sm text-primary font-semibold">
            {gruposAgrupados.length} grupos para avisar
          </div>
        </div>
      </section>
      {gruposAgrupados.map((grupo) => {
        const pedidoPrincipal = grupo.pedidos[0]
        const yaAvisado = grupo.pedidos.every((p) => p.notificado)

        return (
          <div
            key={grupo.ids.join('-')}
            className="soft-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 panel-enter"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-sm">
                  {grupo.pedidos.length > 1 ? `${grupo.pedidos.length} pedidos` : pedidoPrincipal.alumno_nombre}
                </p>
                {yaAvisado && (
                  <span className="rounded-full border border-teal/20 bg-teal-soft px-2.5 py-1 text-[11px] font-semibold text-teal">
                    ya avisado
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-muted mt-1">
                {grupo.pedidos.length > 1 ? (
                  grupo.pedidos.map((p) => `${p.alumno_nombre} (${p.grados?.nombre})`).join(' · ')
                ) : (
                  <>
                    {pedidoPrincipal.grados?.nombre} ·{' '}
                    {pedidoPrincipal.tipo_entrega === 'domicilio' ? 'A domicilio' : 'Recoge en tienda'}
                    {pedidoPrincipal.fecha_entrega
                      ? ` · prometido: ${formatDate(pedidoPrincipal.fecha_entrega)}`
                      : ''}
                  </>
                )}
              </p>
              {(grupo.pedidos.some((pedido) => pedido.fecha_entrega && pedido.fecha_entrega < new Date().toISOString().slice(0, 10))) && (
                <p className="mt-2 text-xs font-semibold text-coral">
                  ⚠️ Hay una fecha de entrega pasada sin completar el pedido.
                </p>
              )}
              {grupo.pedidos.length > 1 && (
                <p className="text-xs text-ink-muted mt-1">
                  {grupo.telefono ? `Teléfono: ${grupo.telefono}` : 'Sin teléfono'}
                </p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <a
                href={waLink(grupo.telefono, mensajeParaGrupo(grupo))}
                target="_blank"
                rel="noreferrer"
                onClick={() => marcarVarios(grupo.ids, { notificado: true })}
                className="rounded-lg bg-teal px-3 py-2 text-xs font-bold text-white transition-all hover:-translate-y-0.5"
              >
                WhatsApp
              </a>
              <button
                onClick={() => marcarVarios(grupo.ids, { estado: 'entregado' })}
                className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink-muted transition-all hover:-translate-y-0.5 hover:bg-bg"
              >
                Marcar entregado
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
