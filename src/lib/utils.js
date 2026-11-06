export function formatMoney(n) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(n ?? 0)
}

export function formatDate(d) {
  if (!d) return 'Sin fecha'
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function getDateOnly(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const normalized = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return normalized.toISOString().slice(0, 10)
}

export function getPagoDate(pedido) {
  if (pedido?.pago_fecha) return getDateOnly(pedido?.pago_fecha)
  if (pedido?.pago_estado === 'pagado') return getDateOnly(pedido?.created_at)
  return null
}

// Normaliza un teléfono mexicano a formato E.164 para wa.me (asume MX +52)
export function waLink(telefono, mensaje) {
  const digits = (telefono || '').replace(/\D/g, '')
  const withCountry = digits.length === 10 ? `52${digits}` : digits
  const text = encodeURIComponent(mensaje || '')
  return `https://wa.me/${withCountry}${text ? `?text=${text}` : ''}`
}

export const CATEGORIA_LABELS = {
  utiles: 'Útiles escolares',
  material_adicional: 'Material adicional',
  etiquetas_forrado: 'Etiquetas y forrado',
  opcional: 'Opcional (preguntar)',
}

export const ESTADO_LABELS = {
  registrado: 'Registrado',
  surtiendo: 'Surtiendo y empacando',
  listo: 'Listo',
  entregado: 'Entregado',
}

export const ESTADO_ORDER = ['registrado', 'surtiendo', 'listo', 'entregado']

export const PAGO_LABELS = {
  pendiente: 'Pendiente',
  parcial: 'Pago parcial',
  pagado: 'Pagado',
}

export const ETIQUETA_ESTADO_LABELS = {
  pendiente_diseno: 'Falta nombre/diseño',
  enviada: 'Enviada a hacer',
  recibida: 'Recibida',
}

// Suma cuántos "forrados" sugerir según los items forrables (cuadernos/tablas)
// que el cliente realmente se queda (cantidad > 0) en este pedido.
export function forradoSugerido(items) {
  return items
    .filter((it) => it.cuenta_para_forrado && it.categoria !== 'etiquetas_forrado')
    .reduce((sum, it) => sum + (Number(it.cantidad) || 0), 0)
}

export const ENTREGA_FEE = 80

export function calcularTotal(items, tipoEntrega = 'recoge') {
  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.cantidad) || 0) * Number(it.precio_descuento),
    0
  )

  return subtotal + (tipoEntrega === 'domicilio' ? ENTREGA_FEE : 0)
}
