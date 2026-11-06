import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import {
  formatMoney,
  formatDate,
  getDateOnly,
  waLink,
  ESTADO_LABELS,
  ESTADO_ORDER,
  PAGO_LABELS,
  ETIQUETA_ESTADO_LABELS,
  ENTREGA_FEE,
} from '../lib/utils'

const ESTADO_COLORS = {
  registrado: 'bg-ink-muted/10 text-ink-muted',
  surtiendo: 'bg-accent-soft text-accent',
  listo: 'bg-teal-soft text-teal',
  entregado: 'bg-primary-soft text-primary',
}

export default function Pedidos({ onChange }) {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState('recientes')
  const [gradoFiltro, setGradoFiltro] = useState('todos')
  const [abierto, setAbierto] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  async function cargar() {
    setLoading(true)
    if (!supabase) {
      setPedidos([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('pedidos')
      .select('*, grados(nombre)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setPedidos([])
      setLoading(false)
      return
    }

    setPedidos(data || [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const filtrados = useMemo(() => {
    const base = pedidos.filter((p) => {
      if (filtro !== 'todos' && p.estado !== filtro) return false
      if (gradoFiltro !== 'todos' && p.grado_id !== gradoFiltro) return false
      if (busqueda) {
        const q = busqueda.toLowerCase()
        if (!p.alumno_nombre.toLowerCase().includes(q) && !p.telefono.includes(q)) return false
      }
      return true
    })

    return [...base].sort((a, b) => {
      if (orden === 'alfa') {
        return (a.alumno_nombre || '').localeCompare(b.alumno_nombre || '')
      }
      if (orden === 'fecha') {
        const dateA = a.fecha_entrega ? new Date(`${a.fecha_entrega}T00:00:00`) : new Date(8640000000000000)
        const dateB = b.fecha_entrega ? new Date(`${b.fecha_entrega}T00:00:00`) : new Date(8640000000000000)
        return dateA - dateB
      }
      if (orden === 'entrega') {
        const dateA = a.fecha_entrega ? new Date(`${a.fecha_entrega}T00:00:00`) : new Date(8640000000000000)
        const dateB = b.fecha_entrega ? new Date(`${b.fecha_entrega}T00:00:00`) : new Date(8640000000000000)
        return dateA - dateB
      }
      return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    })
  }, [pedidos, filtro, busqueda, gradoFiltro, orden])

  const counts = useMemo(() => {
    const c = { todos: pedidos.length }
    for (const e of ESTADO_ORDER) c[e] = pedidos.filter((p) => p.estado === e).length
    return c
  }, [pedidos])

  const gradosDisponibles = useMemo(() => {
    const seen = new Set()
    return (pedidos
      .map((p) => p.grados?.nombre)
      .filter(Boolean)
      .filter((nombre) => {
        if (seen.has(nombre)) return false
        seen.add(nombre)
        return true
      }) || [])
  }, [pedidos])

  async function actualizarPedido(id, patch) {
    const pedidoPrevio = pedidos.find((p) => p.id === id)
    const normalizedPatch = { ...patch }

    // Si se está tocando el estado de pago, registra (o limpia) la fecha real de pago.
    if ('pago_estado' in normalizedPatch) {
      normalizedPatch.pago_fecha =
        normalizedPatch.pago_estado === 'pagado' ? getDateOnly(new Date()) : null
    }

    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, ...normalizedPatch } : p)))

    try {
      if (!supabase) {
        onChange?.()
        return
      }

      const { data: updatedPedido, error } = await supabase
        .from('pedidos')
        .update(normalizedPatch)
        .eq('id', id)
        .select('*, grados(nombre)')
        .single()

      if (error) throw error

      if (updatedPedido) {
        setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, ...updatedPedido } : p)))
      }

      onChange?.()
    } catch (error) {
      console.error('Error actualizando pedido:', error)
      if (pedidoPrevio) {
        setPedidos((prev) => prev.map((p) => (p.id === id ? pedidoPrevio : p)))
      }
      throw error
    }
  }

  async function eliminarPedido(id) {
    if (!window.confirm('¿Seguro que quieres eliminar este pedido?')) return
    setDeletingId(id)
    try {
      await supabase.from('pedido_items').delete().eq('pedido_id', id)
      await supabase.from('pedidos').delete().eq('id', id)
      setPedidos((prev) => prev.filter((pedido) => pedido.id !== id))
      setAbierto(null)
      onChange?.()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-border/70 bg-white/70 p-1.5 backdrop-blur-sm">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {['todos', ...ESTADO_ORDER].map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all duration-200 ${
                  filtro === f
                    ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                    : 'border-transparent text-ink-muted bg-transparent hover:bg-slate-100'
                }`}
              >
                {f === 'todos' ? 'Todos' : ESTADO_LABELS[f]} · {counts[f] ?? 0}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={gradoFiltro}
            onChange={(e) => setGradoFiltro(e.target.value)}
            className="rounded-xl border border-border/70 bg-white/90 px-3 py-2.5 text-sm w-full sm:w-48 shadow-sm"
          >
            <option value="todos">Todos los grados</option>
            {gradosDisponibles.map((grado) => (
              <option key={grado} value={pedidos.find((p) => p.grados?.nombre === grado)?.grado_id || grado}>
                {grado}
              </option>
            ))}
          </select>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            className="rounded-xl border border-border/70 bg-white/90 px-3 py-2.5 text-sm w-full sm:w-44 shadow-sm"
          >
            <option value="recientes">Más recientes</option>
            <option value="fecha">Por fecha de entrega</option>
            <option value="alfa">Alfabético</option>
          </select>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar alumno o teléfono…"
            className="rounded-xl border border-border/70 bg-white/90 px-3 py-2.5 text-sm w-full sm:flex-1 shadow-sm"
          />
        </div>
      </div>

      {loading && <p className="text-sm text-ink-muted">Cargando pedidos…</p>}
      {!loading && filtrados.length === 0 && (
        <p className="text-sm text-ink-muted py-8 text-center">No hay pedidos que coincidan.</p>
      )}

      <div className="space-y-2">
        {filtrados.map((p) => (
          <PedidoCard
            key={p.id}
            pedido={p}
            abierto={abierto === p.id}
            onToggle={() => setAbierto(abierto === p.id ? null : p.id)}
            onUpdate={(patch) => actualizarPedido(p.id, patch)}
            onDelete={() => eliminarPedido(p.id)}
            deleting={deletingId === p.id}
          />
        ))}
      </div>
    </div>
  )
}

function isCustomExtraItem(it) {
  return it?.item_plantilla_id === null && it?.categoria === 'opcional'
}

function PedidoCard({ pedido: p, abierto, onToggle, onUpdate, onDelete, deleting }) {
  const [items, setItems] = useState(null)
  const [editItems, setEditItems] = useState([])
  const [customExtraName, setCustomExtraName] = useState('')
  const [customExtraPrice, setCustomExtraPrice] = useState('')
  const [savingList, setSavingList] = useState(false)
  const [editError, setEditError] = useState('')
  const [editingDatos, setEditingDatos] = useState(false)
  const [draftDatos, setDraftDatos] = useState({
    alumno_nombre: p.alumno_nombre || '',
    telefono: p.telefono || '',
    fecha_entrega: p.fecha_entrega || '',
    tipo_entrega: p.tipo_entrega || 'recoge',
    domicilio: p.domicilio || '',
    colonia: p.colonia || '',
    notas: p.notas || '',
  })
  const [savingDatos, setSavingDatos] = useState(false)
  const [datosError, setDatosError] = useState('')

  async function cargarItems() {
    const [{ data: rowsData }, { data: plantillaData }] = await Promise.all([
      supabase.from('pedido_items').select('*').eq('pedido_id', p.id),
      supabase.from('items_plantilla').select('*').eq('grado_id', p.grado_id).order('orden'),
    ])

    const rows = rowsData || []
    const regularRows = rows.filter((it) => !isCustomExtraItem(it))
    const customRow = rows.find((it) => isCustomExtraItem(it))

    const mergedItems = (plantillaData || []).map((templateItem) => {
      const existing = regularRows.find((it) => it.item_plantilla_id === templateItem.id)
      return {
        id: existing?.id || `template-${templateItem.id}`,
        pedido_id: p.id,
        item_plantilla_id: templateItem.id,
        descripcion: templateItem.descripcion,
        categoria: templateItem.categoria,
        cantidad: existing ? Number(existing.cantidad) || 0 : 0,
        precio_descuento: existing?.precio_descuento ?? templateItem.precio_descuento,
        subtotal: existing ? Number(existing.subtotal) || 0 : 0,
        cuenta_para_forrado: templateItem.cuenta_para_forrado,
        is_template_item: true,
      }
    })

    if (customRow) {
      mergedItems.push({
        id: customRow.id,
        pedido_id: p.id,
        item_plantilla_id: null,
        descripcion: customRow.descripcion,
        categoria: 'opcional',
        cantidad: Number(customRow.cantidad) || 1,
        precio_descuento: Number(customRow.precio_descuento || 0),
        subtotal: Number(customRow.subtotal || 0),
        cuenta_para_forrado: false,
        is_custom_extra: true,
      })
    }

    setItems(rows)
    setEditItems(mergedItems)
    setCustomExtraName(customRow?.descripcion || '')
    setCustomExtraPrice(customRow ? String(Number(customRow.precio_descuento || 0)) : '')
    setEditError('')
  }

  function imprimirPedido(pedido, itemsList) {
    if (!itemsList?.length) return

    const subtotal = itemsList.reduce((s, it) => s + Number(it.subtotal), 0)
    const total = subtotal + (pedido.tipo_entrega === 'domicilio' ? ENTREGA_FEE : 0)
    const domicilio = pedido.tipo_entrega === 'domicilio' ? `${pedido.domicilio}, ${pedido.colonia}` : null
    const fechaEntrega = pedido.fecha_entrega ? formatDate(pedido.fecha_entrega) : 'Sin fecha'

    const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Pedido - ${pedido.alumno_nombre}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
      h1 { font-size: 20px; margin-bottom: 8px; }
      .muted { color: #6b7280; }
      .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-top: 16px; }
      .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
      .row:last-child { border-bottom: 0; }
      .strong { font-weight: 700; }
      @media print { body { padding: 0; } }
    </style>
  </head>
  <body>
    <h1>Lista de ${pedido.alumno_nombre}</h1>
    <p class="muted">Grado: ${pedido.grados?.nombre || '-'}</p>
    <p class="muted">Teléfono: ${pedido.telefono}</p>
    <p class="muted">Fecha de entrega: ${fechaEntrega}</p>
    ${domicilio ? `<p class="muted">Domicilio: ${domicilio}</p>` : ''}
    ${pedido.notas ? `<p class="muted">Notas: ${pedido.notas}</p>` : ''}

    <div class="card">
      <div class="row"><span>Artículo</span><span>Total</span></div>
      ${itemsList
        .map((it) => `<div class="row"><span>${it.cantidad} × ${it.descripcion}</span><span>${formatMoney(it.subtotal)}</span></div>`)
        .join('')}
      <div class="row strong"><span>Subtotal</span><span>${formatMoney(subtotal)}</span></div>
      ${pedido.tipo_entrega === 'domicilio' ? `<div class="row"><span>Entrega a domicilio</span><span>${formatMoney(ENTREGA_FEE)}</span></div>` : ''}
      <div class="row strong"><span>Total</span><span>${formatMoney(total)}</span></div>
    </div>
  </body>
</html>`

    const printWindow = window.open('', '_blank', 'width=900,height=900')
    if (!printWindow) return

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 250)
  }

  useEffect(() => {
    if (abierto && items === null) {
      cargarItems()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, p.id, p.grado_id])

  useEffect(() => {
    if (!abierto) {
      setItems(null)
      setEditItems([])
      setCustomExtraName('')
      setCustomExtraPrice('')
      setEditError('')
      setSavingList(false)
    }
  }, [abierto])

  useEffect(() => {
    if (abierto) {
      setDraftDatos({
        alumno_nombre: p.alumno_nombre || '',
        telefono: p.telefono || '',
        fecha_entrega: p.fecha_entrega || '',
        tipo_entrega: p.tipo_entrega || 'recoge',
        domicilio: p.domicilio || '',
        colonia: p.colonia || '',
        notas: p.notas || '',
      })
      setEditingDatos(false)
      setDatosError('')
    }
  }, [abierto, p.alumno_nombre, p.telefono, p.fecha_entrega, p.tipo_entrega, p.domicilio, p.colonia, p.notas])

  async function guardarDatosPedido() {
    if (!draftDatos.alumno_nombre.trim() || !draftDatos.telefono.trim()) {
      setDatosError('Completa el nombre del alumno y el teléfono.')
      return
    }

    setSavingDatos(true)
    setDatosError('')

    try {
      await onUpdate({
        alumno_nombre: draftDatos.alumno_nombre.trim(),
        telefono: draftDatos.telefono.trim(),
        fecha_entrega: draftDatos.fecha_entrega || null,
        tipo_entrega: draftDatos.tipo_entrega,
        domicilio: draftDatos.tipo_entrega === 'domicilio' ? draftDatos.domicilio.trim() : null,
        colonia: draftDatos.tipo_entrega === 'domicilio' ? draftDatos.colonia.trim() : null,
        notas: draftDatos.notas.trim() || null,
      })
      setEditingDatos(false)
    } catch (err) {
      setDatosError(err.message || 'No se pudo actualizar el pedido.')
    } finally {
      setSavingDatos(false)
    }
  }

  async function guardarLista() {
    if (!items) return

    setSavingList(true)
    setEditError('')

    try {
      const rows = items || []
      const existingRegular = rows.filter((it) => !isCustomExtraItem(it))
      const existingCustom = rows.find((it) => isCustomExtraItem(it))

      const updates = []
      const inserts = []
      const deletes = []

      const existingByTemplateId = new Map(
        existingRegular.filter((it) => it.item_plantilla_id).map((it) => [it.item_plantilla_id, it])
      )

      for (const current of editItems.filter((it) => it.is_template_item)) {
        const existingRow = existingByTemplateId.get(current.item_plantilla_id)
        const cantidad = Number(current.cantidad) || 0
        if (cantidad <= 0) {
          if (existingRow) deletes.push(supabase.from('pedido_items').delete().eq('id', existingRow.id))
          continue
        }

        const subtotal = Number(cantidad) * Number(current.precio_descuento || 0)
        if (existingRow) {
          updates.push(
            supabase
              .from('pedido_items')
              .update({
                cantidad,
                subtotal,
                precio_descuento: Number(current.precio_descuento || 0),
              })
              .eq('id', existingRow.id)
          )
        } else {
          inserts.push(
            supabase.from('pedido_items').insert({
              pedido_id: p.id,
              item_plantilla_id: current.item_plantilla_id,
              descripcion: current.descripcion,
              categoria: current.categoria,
              cantidad,
              precio_descuento: Number(current.precio_descuento || 0),
              subtotal,
              cuenta_para_forrado: current.cuenta_para_forrado,
            })
          )
        }
      }

      const nombre = customExtraName.trim()
      const precio = Number(customExtraPrice)
      if (nombre && precio > 0) {
        if (existingCustom) {
          updates.push(
            supabase
              .from('pedido_items')
              .update({
                descripcion: nombre,
                precio_descuento: precio,
                subtotal: precio,
                cantidad: 1,
              })
              .eq('id', existingCustom.id)
          )
        } else {
          inserts.push(
            supabase.from('pedido_items').insert({
              pedido_id: p.id,
              item_plantilla_id: null,
              descripcion: nombre,
              categoria: 'opcional',
              cantidad: 1,
              precio_descuento: precio,
              subtotal: precio,
              cuenta_para_forrado: false,
            })
          )
        }
      } else if (existingCustom) {
        deletes.push(supabase.from('pedido_items').delete().eq('id', existingCustom.id))
      }

      await Promise.all([...updates, ...inserts, ...deletes])
      await cargarItems()
    } catch (err) {
      setEditError(err.message || 'No se pudo guardar la lista.')
    } finally {
      setSavingList(false)
    }
  }

  function actualizarCantidad(id, cantidad) {
    setEditItems((prev) => prev.map((it) => (it.id === id ? { ...it, cantidad } : it)))
  }

  const subtotal = items ? items.reduce((s, it) => s + Number(it.subtotal), 0) : null
  const total = subtotal === null ? null : subtotal + (p.tipo_entrega === 'domicilio' ? ENTREGA_FEE : 0)
  const hoy = new Date().toISOString().slice(0, 10)
  const fechaVencida = p.fecha_entrega && p.estado !== 'entregado' && p.fecha_entrega < hoy

  return (
    <div className="soft-card overflow-hidden fade-in group">
      <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-center gap-3 transition-all duration-300 hover:bg-slate-50/70">
        <span
          className={`shrink-0 text-[11px] font-bold px-2 py-1 rounded-full ${ESTADO_COLORS[p.estado]}`}
        >
          {ESTADO_LABELS[p.estado]}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-sm truncate">{p.alumno_nombre}</p>
            {fechaVencida && (
              <span className="rounded-full border border-coral/20 bg-coral-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-coral">
                Vencido
              </span>
            )}
          </div>
          <p className="text-xs text-ink-muted truncate">
            {p.grados?.nombre} · {p.tipo_entrega === 'domicilio' ? 'A domicilio' : 'Recoge en tienda'}
            {p.fecha_entrega ? ` · ${formatDate(p.fecha_entrega)}` : ''}
          </p>
        </div>
        {p.quiere_etiquetas && <span className="shrink-0 text-base" title="Quiere etiquetas">🏷️</span>}
        <span className="shrink-0 text-ink-muted text-xs">{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div className="panel-enter border-t border-border/70 px-4 py-4 space-y-4 bg-gradient-to-br from-white via-[#f8fbff] to-[#f3f7ff]">
          <div className="rounded-2xl border border-border/70 bg-white/80 p-4 space-y-3 shadow-[0_12px_28px_-22px_rgba(36,59,107,0.35)]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">Datos del pedido</p>
                <p className="text-sm font-semibold text-ink">{p.alumno_nombre}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingDatos((prev) => !prev)}
                className="rounded-full border border-border/70 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:-translate-y-0.5"
              >
                {editingDatos ? 'Cancelar' : 'Editar datos'}
              </button>
            </div>

            {editingDatos ? (
              <div className="space-y-3 rounded-2xl border border-border/70 bg-white/90 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-ink-muted">
                    <span className="mb-1 block">Nombre del alumno</span>
                    <input
                      value={draftDatos.alumno_nombre}
                      onChange={(e) => setDraftDatos((prev) => ({ ...prev, alumno_nombre: e.target.value }))}
                      className="input-shell w-full px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm text-ink-muted">
                    <span className="mb-1 block">Teléfono</span>
                    <input
                      value={draftDatos.telefono}
                      onChange={(e) => setDraftDatos((prev) => ({ ...prev, telefono: e.target.value }))}
                      className="input-shell w-full px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm text-ink-muted">
                    <span className="mb-1 block">Fecha de entrega</span>
                    <input
                      type="date"
                      value={draftDatos.fecha_entrega}
                      onChange={(e) => setDraftDatos((prev) => ({ ...prev, fecha_entrega: e.target.value }))}
                      className="input-shell w-full px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm text-ink-muted">
                    <span className="mb-1 block">Entrega</span>
                    <select
                      value={draftDatos.tipo_entrega}
                      onChange={(e) => setDraftDatos((prev) => ({ ...prev, tipo_entrega: e.target.value }))}
                      className="input-shell w-full px-3 py-2 text-sm"
                    >
                      <option value="recoge">Recoge</option>
                      <option value="domicilio">Domicilio</option>
                    </select>
                  </label>
                  {draftDatos.tipo_entrega === 'domicilio' && (
                    <>
                      <label className="text-sm text-ink-muted">
                        <span className="mb-1 block">Domicilio</span>
                        <input
                          value={draftDatos.domicilio}
                          onChange={(e) => setDraftDatos((prev) => ({ ...prev, domicilio: e.target.value }))}
                          className="input-shell w-full px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="text-sm text-ink-muted">
                        <span className="mb-1 block">Colonia</span>
                        <input
                          value={draftDatos.colonia}
                          onChange={(e) => setDraftDatos((prev) => ({ ...prev, colonia: e.target.value }))}
                          className="input-shell w-full px-3 py-2 text-sm"
                        />
                      </label>
                    </>
                  )}
                </div>
                <label className="text-sm text-ink-muted block">
                  <span className="mb-1 block">Notas</span>
                  <textarea
                    value={draftDatos.notas}
                    onChange={(e) => setDraftDatos((prev) => ({ ...prev, notas: e.target.value }))}
                    rows={2}
                    className="input-shell w-full px-3 py-2 text-sm"
                  />
                </label>
                {datosError && <p className="text-sm text-coral">{datosError}</p>}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={guardarDatosPedido}
                    disabled={savingDatos}
                    className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    {savingDatos ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingDatos(false)}
                    className="rounded-lg border border-border/70 px-3 py-2 text-xs font-semibold text-ink-muted"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="glass-pill rounded-2xl p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">Teléfono</p>
                  <a href={waLink(p.telefono)} target="_blank" rel="noreferrer" className="mt-1 block font-semibold text-primary underline">
                    {p.telefono}
                  </a>
                </div>
                <div className="glass-pill rounded-2xl p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">Entrega</p>
                  <p className="mt-1 font-semibold text-ink">{p.tipo_entrega === 'domicilio' ? 'A domicilio' : 'Recoger en tienda'}</p>
                </div>
                {p.fecha_entrega && (
                  <div className="glass-pill rounded-2xl p-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">Fecha</p>
                    <p className="mt-1 font-semibold text-ink">{formatDate(p.fecha_entrega)}</p>
                  </div>
                )}
                {p.tipo_entrega === 'domicilio' && (p.domicilio || p.colonia) ? (
                  <div className="glass-pill rounded-2xl p-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">Dirección</p>
                    <p className="mt-1 font-semibold text-ink">{[p.domicilio, p.colonia].filter(Boolean).join(', ')}</p>
                  </div>
                ) : null}
                {p.notas && (
                  <div className="glass-pill rounded-2xl p-3 sm:col-span-2">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">Notas</p>
                    <p className="mt-1 font-semibold text-ink">{p.notas}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/70 bg-white/80 p-3 shadow-[0_12px_28px_-22px_rgba(36,59,107,0.35)]">
            <div className="flex flex-wrap gap-4">
            <Field label="Estado del pedido">
              <select
                value={p.estado}
                onChange={(e) => onUpdate({ estado: e.target.value })}
                className="rounded-lg border border-border px-2 py-1.5 text-sm bg-white"
              >
                {ESTADO_ORDER.map((e) => (
                  <option key={e} value={e}>
                    {ESTADO_LABELS[e]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Pago">
              <select
                value={p.pago_estado}
                onChange={(e) => onUpdate({ pago_estado: e.target.value })}
                className="rounded-lg border border-border px-2 py-1.5 text-sm bg-white"
              >
                {Object.entries(PAGO_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>

            {p.quiere_etiquetas && (
              <Field label="Etiquetas">
                <select
                  value={p.etiquetas_estado || 'pendiente_diseno'}
                  onChange={(e) => onUpdate({ etiquetas_estado: e.target.value })}
                  className="rounded-lg border border-border px-2 py-1.5 text-sm bg-white"
                >
                  {Object.entries(ETIQUETA_ESTADO_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          {p.quiere_etiquetas && (
            <p className="text-sm bg-accent-soft text-accent rounded-lg px-3 py-2">
              🏷️ Nombre: <strong>{p.etiquetas_nombre_alumno}</strong>
              {p.etiquetas_personaje ? ` · Diseño: ${p.etiquetas_personaje}` : ''}
            </p>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">
                Artículos del pedido
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={guardarLista}
                  disabled={items === null || savingList}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {savingList ? 'Guardando…' : 'Guardar cambios'}
                </button>
                <button
                  type="button"
                  onClick={() => imprimirPedido(p, items || [])}
                  disabled={items === null || items.length === 0}
                  className="rounded-lg border border-border/70 px-3 py-2 text-xs font-semibold text-ink-muted transition-all hover:-translate-y-0.5 disabled:opacity-60"
                >
                  🖨️ Imprimir lista
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={deleting}
                  className="rounded-lg border border-coral/30 px-3 py-2 text-xs font-semibold text-coral transition-all hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {deleting ? 'Eliminando…' : '🗑️ Eliminar'}
                </button>
              </div>
            </div>
            {editError && <p className="text-sm text-coral">{editError}</p>}
            {items === null && <p className="text-sm text-ink-muted">Cargando…</p>}
            {items && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-border/70 overflow-hidden bg-white shadow-[0_12px_24px_-18px_rgba(36,59,107,0.28)]">
                  {editItems.map((it) => (
                    <div key={it.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <input
                        type="number"
                        min="0"
                        value={it.cantidad}
                        onChange={(e) => actualizarCantidad(it.id, e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-16 shrink-0 rounded-md border border-border px-2 py-1 text-center"
                      />
                      <div className="flex-1 min-w-0">
                        <p>{it.descripcion}</p>
                      </div>
                      <div className="text-right shrink-0 text-ink-muted">
                        {formatMoney(Number(it.cantidad || 0) * Number(it.precio_descuento || 0))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-border/70 bg-white p-3 space-y-2 shadow-[0_12px_24px_-18px_rgba(36,59,107,0.28)]">
                  <p className="text-sm font-semibold">Cargo extra personalizado</p>
                  <div className="grid sm:grid-cols-[1.3fr_140px] gap-2">
                    <input
                      value={customExtraName}
                      onChange={(e) => setCustomExtraName(e.target.value)}
                      className="rounded-lg border border-border px-3 py-2 text-sm"
                      placeholder="Ej. Costo extra por material"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={customExtraPrice}
                      onChange={(e) => setCustomExtraPrice(e.target.value)}
                      className="rounded-lg border border-border px-3 py-2 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="divide-y divide-border rounded-2xl border border-border/70 overflow-hidden bg-white shadow-[0_12px_24px_-18px_rgba(36,59,107,0.28)]">
                  <div className="flex justify-between px-3 py-2 text-sm bg-bg">
                    <span className="text-ink-muted">Subtotal</span>
                    <span>{formatMoney(subtotal)}</span>
                  </div>
                  {p.tipo_entrega === 'domicilio' && (
                    <div className="flex justify-between px-3 py-2 text-sm bg-bg">
                      <span className="text-ink-muted">Entrega a domicilio</span>
                      <span>{formatMoney(ENTREGA_FEE)}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-3 py-2 text-sm font-bold bg-bg">
                    <span>Total</span>
                    <span>{formatMoney(total)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="text-xs text-ink-muted flex flex-col gap-1">
      {label}
      {children}
    </label>
  )
}