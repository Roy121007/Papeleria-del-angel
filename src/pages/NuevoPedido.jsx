import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formatMoney, CATEGORIA_LABELS, forradoSugerido, calcularTotal, ENTREGA_FEE } from '../lib/utils'

const CATEGORIA_ORDER = ['utiles', 'material_adicional', 'etiquetas_forrado', 'opcional']

export default function NuevoPedido({ perfil }) {
  const [grados, setGrados] = useState([])
  const [gradoId, setGradoId] = useState('')
  const [items, setItems] = useState([])
  const [manualForrado, setManualForrado] = useState(new Set())
  const [loadingItems, setLoadingItems] = useState(false)

  const [alumno, setAlumno] = useState('')
  const [telefono, setTelefono] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [tipoEntrega, setTipoEntrega] = useState('recoge')
  const [domicilio, setDomicilio] = useState('')
  const [colonia, setColonia] = useState('')
  const [quiereEtiquetas, setQuiereEtiquetas] = useState(false)
  const [etiquetaNombre, setEtiquetaNombre] = useState('')
  const [etiquetaPersonaje, setEtiquetaPersonaje] = useState('')
  const [notas, setNotas] = useState('')
  const [cargoExtraNombre, setCargoExtraNombre] = useState('')
  const [cargoExtraPrecio, setCargoExtraPrecio] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('grados')
      .select('*')
      .order('orden')
      .then(({ data }) => setGrados(data || []))
  }, [])

  useEffect(() => {
    if (!gradoId) {
      setItems([])
      return
    }
    setLoadingItems(true)
    supabase
      .from('items_plantilla')
      .select('*')
      .eq('grado_id', gradoId)
      .order('orden')
      .then(({ data }) => {
        setItems(
          (data || []).map((it) => ({
            ...it,
            cantidad: it.cantidad_default,
          }))
        )
        setManualForrado(new Set())
        setLoadingItems(false)
      })
  }, [gradoId])

  const sugerido = useMemo(() => forradoSugerido(items), [items])

  // Mantiene sincronizados los renglones de "forrado" con el # de cuadernos/tablas
  // que el cliente realmente se está quedando, a menos que alguien lo edite a mano.
  useEffect(() => {
    setItems((prev) =>
      prev.map((it) => {
        const esForrado =
          it.categoria === 'etiquetas_forrado' && /forrad/i.test(it.descripcion)
        if (esForrado && !manualForrado.has(it.id)) {
          return { ...it, cantidad: sugerido }
        }
        return it
      })
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sugerido])

  function updateCantidad(id, cantidad, isForrado) {
    if (isForrado) setManualForrado((prev) => new Set(prev).add(id))
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, cantidad } : it)))
  }

  const grouped = useMemo(() => {
    const g = {}
    for (const it of items) {
      if (!g[it.categoria]) g[it.categoria] = []
      g[it.categoria].push(it)
    }
    return g
  }, [items])

  const total = useMemo(() => calcularTotal(items, tipoEntrega), [items, tipoEntrega])
  const gradoSel = grados.find((g) => g.id === gradoId)
  const cargoExtraActual = items.find((it) => it.is_custom_extra)

  function resetForm() {
    setGradoId('')
    setAlumno('')
    setTelefono('')
    setFechaEntrega('')
    setTipoEntrega('recoge')
    setDomicilio('')
    setColonia('')
    setQuiereEtiquetas(false)
    setEtiquetaNombre('')
    setEtiquetaPersonaje('')
    setNotas('')
    setCargoExtraNombre('')
    setCargoExtraPrecio('')
  }

  function agregarCargoExtra() {
    const precio = Number(cargoExtraPrecio)
    if (!cargoExtraNombre.trim() || Number.isNaN(precio) || precio <= 0) return

    setItems((prev) => {
      const existente = prev.find((it) => it.is_custom_extra)
      if (existente) {
        return prev.map((it) =>
          it.is_custom_extra
            ? {
                ...it,
                descripcion: cargoExtraNombre.trim(),
                precio_descuento: precio,
                subtotal: precio,
                cantidad: 1,
              }
            : it
        )
      }

      return [
        ...prev,
        {
          id: `custom-${Date.now()}`,
          descripcion: cargoExtraNombre.trim(),
          categoria: 'opcional',
          cantidad: 1,
          precio_descuento: precio,
          subtotal: precio,
          cuenta_para_forrado: false,
          is_custom_extra: true,
        },
      ]
    })
  }

  function quitarCargoExtra() {
    setItems((prev) => prev.filter((it) => !it.is_custom_extra))
    setCargoExtraNombre('')
    setCargoExtraPrecio('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!gradoId || !alumno || !telefono) {
      setError('Falta grado, nombre del alumno o teléfono.')
      return
    }
    setSaving(true)
    try {
      const { data: pedido, error: err1 } = await supabase
        .from('pedidos')
        .insert({
          grado_id: gradoId,
          alumno_nombre: alumno,
          telefono,
          fecha_entrega: fechaEntrega || null,
          tipo_entrega: tipoEntrega,
          domicilio: tipoEntrega === 'domicilio' ? domicilio : null,
          colonia: tipoEntrega === 'domicilio' ? colonia : null,
          quiere_etiquetas: quiereEtiquetas,
          etiquetas_nombre_alumno: quiereEtiquetas ? etiquetaNombre || alumno : null,
          etiquetas_personaje: quiereEtiquetas ? etiquetaPersonaje : null,
          etiquetas_estado: quiereEtiquetas ? 'pendiente_diseno' : null,
          notas: notas || null,
          tomado_por: perfil?.id || null,
        })
        .select()
        .single()
      if (err1) throw err1

      const itemsToInsert = items
        .filter((it) => Number(it.cantidad) > 0)
        .map((it) => ({
          pedido_id: pedido.id,
          item_plantilla_id: it.is_custom_extra ? null : it.id,
          descripcion: it.descripcion,
          categoria: it.categoria,
          cantidad: Number(it.cantidad),
          precio_descuento: it.precio_descuento,
          subtotal: Number(it.cantidad) * Number(it.precio_descuento),
          cuenta_para_forrado: it.cuenta_para_forrado,
        }))

      if (itemsToInsert.length) {
        const { error: err2 } = await supabase.from('pedido_items').insert(itemsToInsert)
        if (err2) throw err2
      }

      setDone({ alumno, total })
      resetForm()
    } catch (err) {
      setError(err.message || 'Ocurrió un error al guardar el pedido.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
      {done && (
        <div className="bg-teal-soft border border-teal/30 text-teal-900 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm">
            <strong>Pedido de {done.alumno} guardado</strong> — total {formatMoney(done.total)}.
          </p>
          <button
            type="button"
            onClick={() => setDone(null)}
            className="text-xs underline shrink-0 ml-3"
          >
            Cerrar
          </button>
        </div>
      )}
      {error && (
        <div className="bg-coral-soft border border-coral/30 text-coral rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      <section className="soft-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary-soft text-primary flex items-center justify-center font-semibold">1</div>
          <h2 className="font-display font-bold text-primary">Datos del pedido</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Grado</label>
            <select
              required
              value={gradoId}
              onChange={(e) => setGradoId(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-white"
            >
              <option value="">Selecciona un grado…</option>
              {grados.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nombre del alumno</label>
            <input
              required
              value={alumno}
              onChange={(e) => setAlumno(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="Nombre completo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Teléfono / celular</label>
            <input
              required
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="33 1234 5678"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha de entrega</label>
            <input
              type="date"
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Entrega</label>
            <div className="flex gap-2">
              {[
                ['recoge', 'Pasa a recoger'],
                ['domicilio', 'A domicilio'],
              ].map(([val, label]) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setTipoEntrega(val)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                    tipoEntrega === val
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-ink-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {tipoEntrega === 'domicilio' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Domicilio</label>
                <input
                  value={domicilio}
                  onChange={(e) => setDomicilio(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Colonia</label>
                <input
                  value={colonia}
                  onChange={(e) => setColonia(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
            </>
          )}
        </div>
      </section>

      <section className="soft-card p-5">
        <div className="mb-1 flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-accent-soft text-accent flex items-center justify-center font-semibold">2</div>
          <h2 className="font-display font-bold text-primary">Etiquetas</h2>
        </div>
        <p className="text-xs text-ink-muted mb-3">
          El costo de las etiquetas y el forrado ya está incluido abajo en la lista, según lo que
          el cliente se quede.
        </p>
        <label className="flex items-center gap-2 text-sm font-medium mb-3">
          <input
            type="checkbox"
            checked={quiereEtiquetas}
            onChange={(e) => setQuiereEtiquetas(e.target.checked)}
            className="h-4 w-4"
          />
          El cliente quiere etiquetas
        </label>
        {quiereEtiquetas && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre para la etiqueta</label>
              <input
                value={etiquetaNombre}
                onChange={(e) => setEtiquetaNombre(e.target.value)}
                placeholder={alumno || 'Nombre completo del alumno'}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Diseño / personaje</label>
              <input
                value={etiquetaPersonaje}
                onChange={(e) => setEtiquetaPersonaje(e.target.value)}
                placeholder="Ej. Spiderman, Frozen…"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </section>

      {gradoId && (
        <section className="soft-card p-5">
          <div className="mb-1 flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-teal-soft text-teal flex items-center justify-center font-semibold">3</div>
            <h2 className="font-display font-bold text-primary">Lista de {gradoSel?.nombre}</h2>
          </div>
          <p className="text-xs text-ink-muted mb-4">
            Ajusta cantidades o pon 0 en lo que el cliente no quiera. El forrado se sugiere solo
            según los cuadernos y tablas que queden.
          </p>
          {loadingItems && <p className="text-sm text-ink-muted">Cargando lista…</p>}
          <div className="space-y-6">
            {CATEGORIA_ORDER.filter((c) => grouped[c]?.length).map((cat) => (
              <div key={cat}>
                <h3 className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-2">
                  {CATEGORIA_LABELS[cat]}
                </h3>
                <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {grouped[cat].map((it) => {
                    const esForrado = cat === 'etiquetas_forrado' && /forrad/i.test(it.descripcion)
                    return (
                      <div
                        key={it.id}
                        className="flex items-center gap-3 px-3 py-2 bg-white text-sm"
                      >
                        <input
                          type="number"
                          min="0"
                          value={it.cantidad}
                          onChange={(e) =>
                            updateCantidad(it.id, e.target.value === '' ? 0 : Number(e.target.value), esForrado)
                          }
                          className="w-16 shrink-0 rounded-md border border-border px-2 py-1 text-center"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={it.cantidad > 0 ? 'text-ink' : 'text-ink-muted line-through'}>
                            {it.descripcion}
                          </p>
                          {esForrado && !manualForrado.has(it.id) && (
                            <p className="text-[11px] text-teal">sugerido automáticamente</p>
                          )}
                        </div>
                        <div className="text-right shrink-0 w-20 text-ink-muted">
                          {formatMoney(it.precio_descuento)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-white p-4 space-y-3 mt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Cargo extra personalizado</p>
                <p className="text-xs text-ink-muted">
                  Agrega un concepto adicional y se sumará al total del pedido.
                </p>
              </div>
              {cargoExtraActual && (
                <button
                  type="button"
                  onClick={quitarCargoExtra}
                  className="text-xs font-semibold text-coral"
                >
                  Quitar
                </button>
              )}
            </div>
            <div className="grid sm:grid-cols-[1.4fr_140px_auto] gap-2">
              <input
                value={cargoExtraNombre}
                onChange={(e) => setCargoExtraNombre(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="Ej. Cargo por entrega especial"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={cargoExtraPrecio}
                onChange={(e) => setCargoExtraPrecio(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="0.00"
              />
              <button
                type="button"
                onClick={agregarCargoExtra}
                className="rounded-lg bg-primary text-white px-3 py-2 text-sm font-semibold"
              >
                {cargoExtraActual ? 'Actualizar cargo' : 'Agregar cargo'}
              </button>
            </div>
            {cargoExtraActual && (
              <p className="text-xs text-ink-muted">
                Se añadirá: <strong>{cargoExtraActual.descripcion}</strong> por{' '}
                <strong>{formatMoney(cargoExtraActual.precio_descuento)}</strong>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mt-6 mb-1">Notas del pedido</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="Cualquier detalle extra que deba saber quien surte…"
            />
          </div>
        </section>
      )}

      {gradoId && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-white/50 bg-white/80 backdrop-blur-xl shadow-[0_-20px_60px_-30px_rgba(36,59,107,0.35)]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-ink-muted">Total del pedido</p>
              <p className="font-display font-extrabold text-lg text-primary">
                {formatMoney(total)}
              </p>
              {tipoEntrega === 'domicilio' && (
                <p className="text-[11px] text-ink-muted mt-1">
                  Incluye {formatMoney(ENTREGA_FEE)} por entrega a domicilio
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-accent to-[#6aa6ff] text-white font-bold rounded-xl px-6 py-3 text-sm shadow-lg shadow-accent/25 hover:scale-[1.01] transition-transform disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar pedido'}
            </button>
          </div>
        </div>
      )}
    </form>
  )
}
