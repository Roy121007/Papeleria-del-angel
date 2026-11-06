# Papelería El Ángel — Sistema de pedidos

App web para capturar, surtir y avisar pedidos de listas escolares. Reemplaza las
hojas de papel por un pedido digital que todo el equipo ve en tiempo real.

Ya incluye cargadas las **13 listas del Instituto Anahuacalli, ciclo 2026-2027**
(313 artículos), extraídas directo del PDF que compartiste.

## Qué resuelve

- **Se acabó lo de "no sé si quitó las etiquetas"**: cada pedido guarda exactamente
  qué se quedó el cliente, y el forrado se sugiere solo según cuántos cuadernos/tablas
  realmente lleva (editable si hace falta ajustarlo).
- **Se acabó buscar pedido por pedido**: la pestaña "Listos para notificar" junta
  automáticamente todo lo que ya se puede avisar, con un botón directo a WhatsApp.
- Todo el equipo ve el mismo estado del pedido en tiempo real, desde su celular o
  computadora, sin instalar nada (es una página web).

## Cómo está hecho (gratis)

- **Frontend:** React + Vite → se hostea gratis en Netlify.
- **Base de datos:** Supabase (Postgres) → plan gratis, de sobra para 400-500 pedidos/temporada.
- **Login:** Supabase Auth (correo + contraseña) — cada quien entra con su cuenta,
  así el sistema sabe quién "tomó" cada pedido.

Esto es más seguro que un PIN compartido: los datos incluyen teléfonos y nombres
de niños, así que vale la pena el paso extra de login real (tarda lo mismo en
configurarse).

---

## Puesta en marcha (≈20 minutos, una sola vez)

### 1. Crear el proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → crea cuenta gratis → **New project**.
2. Cuando esté listo, entra a **SQL Editor** → pega **todo** el contenido de
   [`supabase/schema.sql`](./supabase/schema.sql) → **Run**. Esto crea las tablas,
   la seguridad, y carga las 13 listas completas.

### 2. Dar de alta a tu equipo

1. En Supabase, ve a **Authentication → Users → Add user**. Crea una cuenta
   (correo + contraseña) por cada persona que va a usar el sistema.
2. Eso les crea automáticamente un perfil. Si quieres poner su nombre real (no
   solo lo que traiga el correo), ve a **Table Editor → perfiles** y edita la
   columna `nombre`.

### 3. Conectar la app a tu proyecto

1. En Supabase: **Project Settings → API**. Copia la **Project URL** y la
   llave **anon public**.
2. En este proyecto, duplica `.env.example` como `.env` y pega ahí esos dos valores:
   ```
   VITE_SUPABASE_URL=https://tuproyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-llave-anon
   ```

### 4. Probarlo localmente (opcional pero recomendado)

```bash
npm install
npm run dev
```
Abre lo que te muestre en consola (normalmente `http://localhost:5173`) y entra
con uno de los usuarios que creaste.

### 5. Publicarlo gratis en Netlify

**Opción rápida (sin GitHub):**
```bash
npm run build
```
Ve a [app.netlify.com/drop](https://app.netlify.com/drop) y arrastra la carpeta
`dist` que se generó. Netlify te da un link público al instante. (Nota: con esta
opción, cada vez que cambies algo tienes que volver a arrastrar `dist`.)

**Opción recomendada (deploys automáticos):**
1. Sube este proyecto a un repositorio de GitHub.
2. En Netlify: **Add new site → Import an existing project** → conecta el repo.
3. Build command: `npm run build` — Publish directory: `dist` (ya viene
   configurado en `netlify.toml`).
4. En **Site settings → Environment variables**, agrega `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY` con los mismos valores de tu `.env`.
5. Deploy. Cada vez que subas cambios al repo, Netlify actualiza el sitio solo.

---

## Un dato a revisar

Al extraer los datos encontré una sola inconsistencia en el PDF original: en
**1ro. Primaria**, "LIBRO DE LECTURA EN ESPAÑOL 100 PAGS" trae precio 75 pero
total 114 (no cuadra 1×75). Lo dejé tal como está en tu lista original — revísalo
tú para saber cuál de los dos números es el correcto, y lo ajustas directo en
**Table Editor → items_plantilla** en Supabase.

## Qué quedó fuera de esta primera versión (a propósito, para no atrasarte)

- **Editor visual de listas**: por ahora, si cambian precios o artículos de un
  grado (o agregan otra escuela), se edita directo en Supabase (**Table Editor →
  items_plantilla**), no hay pantalla para eso todavía.
- **WhatsApp automático**: el botón abre WhatsApp con el mensaje ya escrito, pero
  tú das clic en enviar — no hay bot todavía (como platicamos, es la opción rápida
  antes de meterse a la complejidad de la API de WhatsApp).
- **Pagos con montos/anticipos**: por ahora solo es un estado (pendiente/parcial/pagado),
  sin manejar cantidades.
- **Reportes entre temporadas**: los datos ya quedan guardados por ciclo escolar
  para cuando los quieras explotar, pero todavía no hay una pantalla de reportes.

Cualquiera de estos se puede agregar después sin rehacer nada de lo ya construido.
