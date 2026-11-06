-- =========================================================
-- Papelería El Ángel — esquema + datos iniciales (ciclo 2026-2027)
-- Instituto Anahuacalli
-- Ejecutar completo una sola vez en el SQL Editor de Supabase
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- TABLAS ----------

create table ciclos_escolares (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true
);

create table grados (
  id uuid primary key default gen_random_uuid(),
  ciclo_id uuid not null references ciclos_escolares(id) on delete cascade,
  nombre text not null,
  nivel text not null,
  notas_no_incluye text,
  orden int not null default 0
);

create table items_plantilla (
  id uuid primary key default gen_random_uuid(),
  grado_id uuid not null references grados(id) on delete cascade,
  descripcion text not null,
  categoria text not null check (categoria in ('utiles','material_adicional','etiquetas_forrado','opcional')),
  orden int not null default 0,
  cantidad_default int not null default 0,
  precio_unitario numeric(10,2) not null,
  precio_descuento numeric(10,2) not null,
  cuenta_para_forrado boolean not null default false
);

create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol text not null default 'ventas' check (rol in ('ventas','surtido','admin'))
);

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  grado_id uuid not null references grados(id),
  alumno_nombre text not null,
  fecha_entrega date,
  tipo_entrega text not null default 'recoge' check (tipo_entrega in ('domicilio','recoge')),
  domicilio text,
  colonia text,
  telefono text not null,
  estado text not null default 'registrado' check (estado in ('registrado','surtiendo','listo','entregado')),
  quiere_etiquetas boolean not null default false,
  etiquetas_nombre_alumno text,
  etiquetas_personaje text,
  etiquetas_estado text check (etiquetas_estado in ('pendiente_diseno','enviada','recibida')),
  pago_estado text not null default 'pendiente' check (pago_estado in ('pendiente','parcial','pagado')),
  pago_fecha date,
  notificado boolean not null default false,
  tomado_por uuid references perfiles(id),
  notas text,
  created_at timestamptz not null default now()
);

create table pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  item_plantilla_id uuid references items_plantilla(id) on delete set null,
  descripcion text not null,
  categoria text not null,
  cantidad int not null default 0,
  precio_descuento numeric(10,2) not null,
  subtotal numeric(10,2) not null default 0,
  cuenta_para_forrado boolean not null default false
);

create index on grados (ciclo_id);
create index on items_plantilla (grado_id);
create index on pedidos (grado_id);
create index on pedidos (estado);
create index on pedido_items (pedido_id);

-- ---------- SEGURIDAD (solo usuarios con sesión iniciada pueden usar la app) ----------

alter table ciclos_escolares enable row level security;
alter table grados enable row level security;
alter table items_plantilla enable row level security;
alter table perfiles enable row level security;
alter table pedidos enable row level security;
alter table pedido_items enable row level security;

create policy "auth read ciclos" on ciclos_escolares for select using (auth.uid() is not null);
create policy "auth read grados" on grados for select using (auth.uid() is not null);
create policy "auth read items_plantilla" on items_plantilla for select using (auth.uid() is not null);
create policy "auth read perfiles" on perfiles for select using (auth.uid() is not null);

create policy "auth all pedidos" on pedidos for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "auth all pedido_items" on pedido_items for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Cuando alguien crea una cuenta en Supabase Auth, se le crea automáticamente
-- un perfil (nombre = lo que esté antes de la @ del correo, editable después).
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.perfiles (id, nombre, rol)
  values (new.id, split_part(new.email, '@', 1), 'ventas');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- DATOS INICIALES: ciclo 2026-2027, Instituto Anahuacalli ----------

insert into ciclos_escolares (id, nombre, activo) values
  ('00000000-0000-0000-0000-000000000001', '2026-2027', true);

insert into grados (id, ciclo_id, nombre, nivel, notas_no_incluye, orden) values ('10000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', '1ro. Kinder', 'kinder', 'BATA DE PINTURA, CAMBIO DE ROPA, FOLDER AZUL CON ESCUDO, Y CUENTO EN INGLÉS.', 0);
insert into grados (id, ciclo_id, nombre, nivel, notas_no_incluye, orden) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2do. Kinder', 'kinder', 'BATA DE PI NTURA, ESTUCHE DE TELA CON DOBLE CIERRE, FOLDER AZUL CON ESCUDO Y CUENTO EN INGLÉS.', 1);
insert into grados (id, ciclo_id, nombre, nivel, notas_no_incluye, orden) values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '3ro. Kinder', 'kinder', 'BATA PARA PINTURA, FOLDER AZUL CON ESCUDO, Y CUENTO EN INGLES.', 2);
insert into grados (id, ciclo_id, nombre, nivel, notas_no_incluye, orden) values ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Pre-First', 'preescolar', 'BATA PARA PINTURA, FOLDER AZUL CON ESCUDO, CUENTO EN INGLÉS, CUENTO EN ESPAÑOL', 3);
insert into grados (id, ciclo_id, nombre, nivel, notas_no_incluye, orden) values ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '1ro. Prim.', 'primaria', 'BATA DE LABORATORIO Y FOLDER BLANCO CON ESCUDO DE LA ESCUELA', 4);
insert into grados (id, ciclo_id, nombre, nivel, notas_no_incluye, orden) values ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '2o. Prim.', 'primaria', 'LIBRO DE ESPAÑOL (100 PÁGS), BATA DE LABORATORIO Y FOLDER BLANCO CON ESCUDO DE LA ESCUELA', 5);
insert into grados (id, ciclo_id, nombre, nivel, notas_no_incluye, orden) values ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '3o. Prim.', 'primaria', 'LIBRO DE LECTURA EN ESPAÑOL, BATA DE LABORATORIO Y FOLDER BLANCO CON ESCUDO', 6);
insert into grados (id, ciclo_id, nombre, nivel, notas_no_incluye, orden) values ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '4o. Prim.', 'primaria', 'LIBRO DE LECTURA EN ESPAÑOL (150 PÁGS), BATA DE LABORATORIO Y FOLDER BLANCO CON ESCUDO DE LA ESCUELA', 7);
insert into grados (id, ciclo_id, nombre, nivel, notas_no_incluye, orden) values ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '5o. Prim.', 'primaria', 'LIBRO DE LECTURA EN ESPAÑOL (200 PÁGS), BATA DE LABORATORIO Y FOLDER BLANCO CON ESCUDO DE LA ESCUELA', 8);
insert into grados (id, ciclo_id, nombre, nivel, notas_no_incluye, orden) values ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '6o. Prim.', 'primaria', 'LIBRO DE LECTURA EN ESPAÑOL (200 PÁGS), BATA DE LABORATORIO Y FOLDER BLANCO CON ESCUDO DE LA ESCUELA', 9);
insert into grados (id, ciclo_id, nombre, nivel, notas_no_incluye, orden) values ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '1ro. Sec.', 'secundaria', 'BATA DE LABORATORIO Y FOLDER VERDE INSTITUCIONAL', 10);
insert into grados (id, ciclo_id, nombre, nivel, notas_no_incluye, orden) values ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '2do. Sec.', 'secundaria', 'BATA DE LABORATORIO Y FOLDER VERDE INSTITUCIONAL', 11);
insert into grados (id, ciclo_id, nombre, nivel, notas_no_incluye, orden) values ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', '3ro. Sec.', 'secundaria', 'BATA DE LABORATORIO Y FOLDER VERDE INSTITUCIONAL', 12);

-- items de cada plantilla
insert into items_plantilla (grado_id, descripcion, categoria, orden, cantidad_default, precio_unitario, precio_descuento, cuenta_para_forrado) values
('10000000-0000-0000-0000-000000000000', 'CUADERNO DE DIBUJO CON PROTECTORES 20 H.', 'utiles', 0, 1, 60.0, 45.0, true),
('10000000-0000-0000-0000-000000000000', 'TIJERA PUNTA REDONDA CON APOYO', 'utiles', 1, 1, 45.0, 33.75, false),
('10000000-0000-0000-0000-000000000000', 'CAJA DE CRAYOLA GRUESAS TRIANGULARES C/12 MARCA PELIKAN JUMBO', 'utiles', 2, 2, 63.0, 47.25, false),
('10000000-0000-0000-0000-000000000000', 'LAPIZ ADHESIVO 22 G', 'utiles', 3, 2, 35.0, 26.25, false),
('10000000-0000-0000-0000-000000000000', 'LAPIZ ENTRENADOR JUMBO PELIKAN 2HB', 'utiles', 4, 1, 20.0, 15.0, false),
('10000000-0000-0000-0000-000000000000', 'SOBRE PLASTICO TAMAÑO CARTA CON BROCHE COLOR AMARILLO', 'utiles', 5, 2, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000000', 'ESTUCHE DE ACUARELA PELIKAN JR. C/12', 'utiles', 6, 1, 97.0, 72.75, false),
('10000000-0000-0000-0000-000000000000', 'BARRA DE PLASTILINA COLORES PASTELES (AZUL, ROSA, AMARILLO)', 'utiles', 7, 1, 17.0, 12.75, false),
('10000000-0000-0000-0000-000000000000', 'TABLA DE FIBRACEL DE 30X30 (FORRADA)', 'utiles', 8, 1, 12.0, 9.0, true),
('10000000-0000-0000-0000-000000000000', 'PINCEL REDONDO MEDIANO PARA ACUARELAS', 'utiles', 9, 1, 30.0, 22.5, false),
('10000000-0000-0000-0000-000000000000', 'PLUMON AQUACOLOR (AZUL CL, VDE. CL, AMARILLO, ROJO, NJA, MORADO O ROSA)', 'utiles', 10, 3, 20.0, 15.0, false),
('10000000-0000-0000-0000-000000000000', 'PAQUETE DE 500 HOJAS BLANCAS T/CARTA FACIA BOND', 'utiles', 11, 1, 144.0, 108.0, false),
('10000000-0000-0000-0000-000000000000', 'MICA PARA CALIFICACIONES MEDIA CARTA', 'utiles', 12, 1, 12.0, 9.0, false),
('10000000-0000-0000-0000-000000000000', 'MARCADOR PARA PINTARRÓN (AZUL, NEGRO, ROJO)', 'utiles', 13, 2, 34.0, 25.5, false),
('10000000-0000-0000-0000-000000000000', 'MASA PLASTI KIDS 120 G AZUL, AMARILLO, ROJO, VERDE', 'utiles', 14, 3, 42.0, 31.5, false),
('10000000-0000-0000-0000-000000000000', 'BOTE DE PINTURA PARA DEDOS VINCI 237ML AZUL, VERDE, AMARILLO, ROSA', 'utiles', 15, 1, 74.0, 55.5, false),
('10000000-0000-0000-0000-000000000000', 'PAPEL LUSTRE AZUL REY PARA FORRADO', 'utiles', 16, 1, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000000', 'TABLETA MÁGICA 8.5 LCD', 'material_adicional', 17, 1, 43.0, 43.0, false),
('10000000-0000-0000-0000-000000000000', 'BOTE DE ARENA MÁGICA', 'material_adicional', 18, 1, 40.0, 40.0, false),
('10000000-0000-0000-0000-000000000000', 'ESTUCHE DE TELA CON CIERRE PARA CRAYOLAS', 'material_adicional', 19, 1, 46.0, 46.0, false),
('10000000-0000-0000-0000-000000000000', 'ROMPECABEZAS DE MADERA 12 PIEZAS', 'material_adicional', 20, 1, 20.0, 20.0, false),
('10000000-0000-0000-0000-000000000000', 'PAQUETE DE TOALLAS HUMEDAS', 'material_adicional', 21, 2, 30.0, 30.0, false),
('10000000-0000-0000-0000-000000000000', 'LIBRO PARA COLOREAR 100 H.', 'material_adicional', 22, 1, 64.0, 64.0, false),
('10000000-0000-0000-0000-000000000000', 'CAJA DE PLÁSTICO CON TAPA (TIPO ZAPATERA)', 'material_adicional', 23, 1, 80.0, 80.0, false),
('10000000-0000-0000-0000-000000000000', 'ESPUMA DE NIEVE AEROSOL', 'material_adicional', 24, 1, 42.0, 42.0, false),
('10000000-0000-0000-0000-000000000000', 'KLEENEX', 'material_adicional', 25, 1, 27.0, 27.0, false),
('10000000-0000-0000-0000-000000000000', 'ESPUMA DE AFEITAR', 'material_adicional', 26, 1, 44.0, 44.0, false),
('10000000-0000-0000-0000-000000000000', 'BOLSAS ZIPLOC GRANDES (BATA Y CAMBIO DE ROPA)', 'material_adicional', 27, 2, 5.0, 5.0, false),
('10000000-0000-0000-0000-000000000000', 'PAQUETE DE 21 ETIQUETAS 7X4, 22 ETIQUETAS 5X2.8 Y 75 DE 3.5X1', 'etiquetas_forrado', 28, 1, 160.0, 160.0, false),
('10000000-0000-0000-0000-000000000000', 'FORRADO DE TABLA FIBRACEL', 'etiquetas_forrado', 29, 1, 22.0, 22.0, false),
('10000000-0000-0000-0000-000000000000', 'FORRADO DE CUADERNO', 'etiquetas_forrado', 30, 1, 28.0, 28.0, false),
('10000000-0000-0000-0000-000000000001', 'CUADERNO DE DIBUJO CON PROTECTORES 20 H.', 'utiles', 0, 1, 60.0, 45.0, true),
('10000000-0000-0000-0000-000000000001', 'TIJERA PUNTA REDONDA', 'utiles', 1, 1, 30.0, 22.5, false),
('10000000-0000-0000-0000-000000000001', 'CAJA DE CRAYOLA GRUESAS TRIANGULARES C/12 MARCA CRAYOLA', 'utiles', 2, 1, 84.0, 63.0, false),
('10000000-0000-0000-0000-000000000001', 'CAJA DE COLORES TRIANGULARES JUMBO C/12 MAPED, PELIKAN, NORMA', 'utiles', 3, 2, 193.0, 144.75, false),
('10000000-0000-0000-0000-000000000001', 'LAPIZ ENTRENADOR JUMBO PELIKAN 2HB', 'utiles', 4, 1, 20.0, 15.0, false),
('10000000-0000-0000-0000-000000000001', 'LAPIZ No. 2 TRIANGULAR', 'utiles', 5, 2, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000001', 'SACAPUNTAS DE DOBLE ORIFICIO CON DEPÓSITO', 'utiles', 6, 1, 14.0, 10.5, false),
('10000000-0000-0000-0000-000000000001', 'LAPIZ ADHESIVO 22 GRS.', 'utiles', 7, 2, 35.0, 26.25, false),
('10000000-0000-0000-0000-000000000001', 'GOMAS DE BORRAR DE MIGAJON', 'utiles', 8, 2, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000001', 'SOBRES DE PLASTICO TAMAÑO CARTA CON BROCHE AZUL', 'utiles', 9, 2, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000001', 'ESTUCHE DE ACUARELA PELIKAN JR. C/12', 'utiles', 10, 1, 97.0, 72.75, false),
('10000000-0000-0000-0000-000000000001', 'MASA PLASTI KIDS 120 G AZUL, AMARILLO, ROJO, VERDE', 'utiles', 11, 2, 42.0, 31.5, false),
('10000000-0000-0000-0000-000000000001', 'TABLA DE FIBRACEL DE 30X30 (UNA FORRADA)', 'utiles', 12, 1, 12.0, 9.0, true),
('10000000-0000-0000-0000-000000000001', 'PAQUETE DE 500 HOJAS BLANCAS T/CARTA FACIA BOND', 'utiles', 13, 1, 144.0, 108.0, false),
('10000000-0000-0000-0000-000000000001', 'PINCEL GRUESO REDONDO 2cms BARRILITO', 'utiles', 14, 1, 36.0, 27.0, false),
('10000000-0000-0000-0000-000000000001', 'MICA PARA CALIFICACIONES MEDIA CARTA', 'utiles', 15, 1, 12.0, 9.0, false),
('10000000-0000-0000-0000-000000000001', 'PAPEL LUSTRE NARANJA PARA FORRAR', 'utiles', 16, 1, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000001', 'TABLETA MÁGICA 8.5" LCD', 'material_adicional', 17, 1, 43.0, 43.0, false),
('10000000-0000-0000-0000-000000000001', 'ROMPECABEZAS DE 24 PZA.', 'material_adicional', 18, 1, 48.0, 48.0, false),
('10000000-0000-0000-0000-000000000001', 'BOLSA ZIPLOC GRANDE (ROMPECABEZAS Y BATA)', 'material_adicional', 19, 6, 5.0, 5.0, false),
('10000000-0000-0000-0000-000000000001', 'LIBRO PARA COLOREAR DE 100 HOJAS JUMBO', 'material_adicional', 20, 1, 64.0, 64.0, false),
('10000000-0000-0000-0000-000000000001', 'PAR DE PALILLOS RITMICOS MADERA', 'material_adicional', 21, 1, 80.0, 80.0, false),
('10000000-0000-0000-0000-000000000001', 'BOLSA DE 30 POMPONES CHICO DE VARIOS COLORES', 'material_adicional', 22, 1, 26.0, 26.0, false),
('10000000-0000-0000-0000-000000000001', 'KLEENEX', 'material_adicional', 23, 1, 27.0, 27.0, false),
('10000000-0000-0000-0000-000000000001', 'PAQUETE DE TOALLAS HUMEDAS', 'material_adicional', 24, 2, 30.0, 30.0, false),
('10000000-0000-0000-0000-000000000001', 'PAQUETE DE 21 ETIQUETAS 7X4, 22 ETIQUETAS 5X2.8 Y 75 DE 3.5X1', 'etiquetas_forrado', 25, 1, 160.0, 160.0, false),
('10000000-0000-0000-0000-000000000001', 'FORRADO DE TABLA DE FIBRACEL', 'etiquetas_forrado', 26, 1, 22.0, 22.0, false),
('10000000-0000-0000-0000-000000000001', 'FORRADO DE CUADERNO', 'etiquetas_forrado', 27, 1, 28.0, 28.0, false),
('10000000-0000-0000-0000-000000000001', 'BLOCK DE DIBUJO ESPIRAL 30 HOJAS (SOLO ALUMNOS DE ARTES VISUALES)', 'opcional', 28, 0, 65.0, 65.0, false),
('10000000-0000-0000-0000-000000000002', 'CUADERNO DE DIBUJO CON PROTECTORES 20 H.', 'utiles', 0, 1, 60.0, 45.0, true),
('10000000-0000-0000-0000-000000000002', 'CUADERNO COSIDO NORMA CUADRITOS C F/ITALIANA CUADRO GRANDE 100 H', 'utiles', 1, 1, 113.0, 84.75, true),
('10000000-0000-0000-0000-000000000002', 'TIJERA PUNTA REDONDA', 'utiles', 2, 1, 30.0, 22.5, false),
('10000000-0000-0000-0000-000000000002', 'SACAPUNTAS CON DOBLE ORIFICIO CON DEPOSITO', 'utiles', 3, 2, 14.0, 10.5, false),
('10000000-0000-0000-0000-000000000002', 'LAPIZ ADHESIVO 20 GRS.', 'utiles', 4, 2, 35.0, 26.25, false),
('10000000-0000-0000-0000-000000000002', 'LAPIZ NO. 2 TRIANGULAR', 'utiles', 5, 6, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000002', 'LAPIZ ROJO', 'utiles', 6, 6, 8.0, 6.0, false),
('10000000-0000-0000-0000-000000000002', 'GOMA DE BORRAR DE MIGAJON', 'utiles', 7, 2, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000002', 'CAJA DE COLORES MAPED', 'utiles', 8, 2, 68.0, 51.0, false),
('10000000-0000-0000-0000-000000000002', 'PINCEL REDONDO MEDIANO PARA ACUARELAS', 'utiles', 9, 1, 30.0, 22.5, false),
('10000000-0000-0000-0000-000000000002', 'MASA PLASTI KIDS 120 G AZUL, AMARILLO, VERDE, ROJO', 'utiles', 10, 2, 42.0, 31.5, false),
('10000000-0000-0000-0000-000000000002', 'SOBRE DE PLÁSTICO T/ CARTA VERDE CON BROCHE', 'utiles', 11, 2, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000002', 'BROCHA DE CERDA NATURAL DE 1/2" (1 cm APROX)', 'utiles', 12, 1, 20.0, 15.0, false),
('10000000-0000-0000-0000-000000000002', 'ACUARELA PELIKAN JR. CON 12', 'utiles', 13, 1, 97.0, 72.75, false),
('10000000-0000-0000-0000-000000000002', 'TABLA DE FIBRACEL DE 30X30 (FORRADA)', 'utiles', 14, 1, 12.0, 9.0, true),
('10000000-0000-0000-0000-000000000002', 'PAQUETE DE 500 HOJAS BLANCAS T/CARTA FACIA BOND', 'utiles', 15, 1, 144.0, 108.0, false),
('10000000-0000-0000-0000-000000000002', 'MICA PARA CALIFICACIONES MEDIA CARTA', 'utiles', 16, 1, 12.0, 9.0, false),
('10000000-0000-0000-0000-000000000002', 'PAPEL LUSTRE VERDE CLARO PARA EL FORRADO', 'utiles', 17, 1, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000002', 'ESTUCHE DE TELA', 'material_adicional', 18, 1, 46.0, 46.0, false),
('10000000-0000-0000-0000-000000000002', 'BOLSA ZIPLOC GRANDE (ROMPECABEZAS, BATA)', 'material_adicional', 19, 6, 5.0, 5.0, false),
('10000000-0000-0000-0000-000000000002', 'ABACO GRANDE C/100 CUENTAS', 'material_adicional', 20, 1, 63.0, 63.0, false),
('10000000-0000-0000-0000-000000000002', 'ROMPECABEZAS DE 48 PZS', 'material_adicional', 21, 1, 48.0, 48.0, false),
('10000000-0000-0000-0000-000000000002', 'LIBRO JUMBO PARA COLOREAR GRÁFICOS GRANDES', 'material_adicional', 22, 1, 64.0, 64.0, false),
('10000000-0000-0000-0000-000000000002', 'TABLETA MÁGICA 8.5" LCD', 'material_adicional', 23, 1, 43.0, 43.0, false),
('10000000-0000-0000-0000-000000000002', 'PAQUETE DE TOALLAS HUMEDAS', 'material_adicional', 24, 2, 30.0, 30.0, false),
('10000000-0000-0000-0000-000000000002', 'GOTERO (PIPETA DE SILICÓN CUENTA GOTAS PARA NIÑOS)', 'material_adicional', 25, 1, 25.0, 25.0, false),
('10000000-0000-0000-0000-000000000002', 'KLEENEX', 'material_adicional', 26, 1, 27.0, 27.0, false),
('10000000-0000-0000-0000-000000000002', 'MARCADOR NEGRO PARA PERSONALIZAR', 'material_adicional', 27, 1, 20.0, 20.0, false),
('10000000-0000-0000-0000-000000000002', 'PAQUETE DE 28 ETIQUETAS 7X4 Y 30 ETIQUETAS 5X2.8', 'etiquetas_forrado', 28, 1, 150.0, 150.0, false),
('10000000-0000-0000-0000-000000000002', 'FORRADO CUADERNO ESPIRAL', 'etiquetas_forrado', 29, 1, 28.0, 28.0, false),
('10000000-0000-0000-0000-000000000002', 'FORRADO CUADERNO COSIDO', 'etiquetas_forrado', 30, 1, 20.0, 20.0, false),
('10000000-0000-0000-0000-000000000002', 'FORRADO DE TABLA', 'etiquetas_forrado', 31, 1, 22.0, 22.0, false),
('10000000-0000-0000-0000-000000000003', 'CUADERNO COSIDO SCRIBE KIDS PREESCOLAR CUADRO GRANDE (3 VERDES, 2 AZUL CIELO Y 1 AMARILLO)', 'utiles', 0, 6, 111.0, 83.25, true),
('10000000-0000-0000-0000-000000000003', 'TIJERA PUNTA REDONDA', 'utiles', 1, 1, 30.0, 22.5, false),
('10000000-0000-0000-0000-000000000003', 'LAPIZ TRIANGULAR', 'utiles', 2, 10, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000003', 'LAPIZ ROJO', 'utiles', 3, 5, 8.0, 6.0, false),
('10000000-0000-0000-0000-000000000003', 'REGLA DE PLASTICO 20 CM.', 'utiles', 4, 1, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000003', 'COLORES C/12 MAPED', 'utiles', 5, 1, 68.0, 51.0, false),
('10000000-0000-0000-0000-000000000003', 'LAPIZ ADHESIVO 20 GRS.', 'utiles', 6, 4, 35.0, 26.25, false),
('10000000-0000-0000-0000-000000000003', 'GOMAS DE BORRAR PELIKAN BLANCO', 'utiles', 7, 2, 3.0, 2.25, false),
('10000000-0000-0000-0000-000000000003', 'SACAPUNTAS CON DOBLE ORIFICIO CON DEPOSITO', 'utiles', 8, 2, 14.0, 10.5, false),
('10000000-0000-0000-0000-000000000003', 'MASA PLASTI KIDS 120 G AZUL, AMARILLO, ROJO, VERDE', 'utiles', 9, 1, 42.0, 31.5, false),
('10000000-0000-0000-0000-000000000003', 'TABLA DE FIBRACEL 30X30 FORRADA', 'utiles', 10, 1, 12.0, 9.0, true),
('10000000-0000-0000-0000-000000000003', 'PINCEL REDONDO GRUESO DE 1/2" (1 cm APROX)', 'utiles', 11, 1, 36.0, 27.0, false),
('10000000-0000-0000-0000-000000000003', 'PAQUETE DE 500 HOJAS BLANCAS T/CARTA FACIA BOND', 'utiles', 12, 1, 144.0, 108.0, false),
('10000000-0000-0000-0000-000000000003', 'SOBRE DE PLASTICO T/CARTA ROJO CON BROCHE', 'utiles', 13, 1, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000003', 'PLUMON NEGRO PARA PINTARRÓN NEGRO, VERDE, ROJO, AZUL', 'utiles', 14, 2, 34.0, 25.5, false),
('10000000-0000-0000-0000-000000000003', 'PAQ. MARCADORES LAVABLES TIPS C/12 MARCA CRAYOLA', 'utiles', 15, 1, 147.0, 110.25, false),
('10000000-0000-0000-0000-000000000003', 'MICA PARA CALIFICACIONES MEDIA CARTA', 'utiles', 16, 1, 12.0, 9.0, false),
('10000000-0000-0000-0000-000000000003', 'MICA TAMAÑO CARTA', 'utiles', 17, 1, 12.0, 9.0, false),
('10000000-0000-0000-0000-000000000003', 'ESTUCHE PARA LAPICES DE TELA', 'material_adicional', 18, 1, 46.0, 46.0, false),
('10000000-0000-0000-0000-000000000003', 'TABLETA MÁGICA 8.5" LCD', 'material_adicional', 19, 1, 43.0, 43.0, false),
('10000000-0000-0000-0000-000000000003', 'BOLSA ZIPLOC GRANDE ( BATA, ROMPECABEZAS Y PARA EL MATERIAL)', 'material_adicional', 20, 6, 5.0, 5.0, false),
('10000000-0000-0000-0000-000000000003', 'BOLSA ZIPLOC SANDWICH', 'material_adicional', 21, 3, 3.0, 3.0, false),
('10000000-0000-0000-0000-000000000003', 'BLOCK DE STICKERS', 'material_adicional', 22, 1, 27.0, 27.0, false),
('10000000-0000-0000-0000-000000000003', 'LIBRO PARA COLOREAR ECONÓMICO', 'material_adicional', 23, 1, 30.0, 30.0, false),
('10000000-0000-0000-0000-000000000003', 'PAQUETE DE TOALLAS HUMEDAS', 'material_adicional', 24, 2, 30.0, 30.0, false),
('10000000-0000-0000-0000-000000000003', 'ROMPECABEZAS 48 PIEZAS EN BOLSA ZIPLOC', 'material_adicional', 25, 1, 48.0, 48.0, false),
('10000000-0000-0000-0000-000000000003', 'KLEENEX', 'material_adicional', 26, 1, 30.0, 30.0, false),
('10000000-0000-0000-0000-000000000003', 'MARCADOR NEGRO PARA PERSONALIZAR', 'material_adicional', 27, 1, 20.0, 20.0, false),
('10000000-0000-0000-0000-000000000003', 'PAQUETE DE 28 ETIQUETAS 7X4 Y 30 ETIQUETAS 5X2.8', 'etiquetas_forrado', 28, 1, 150.0, 150.0, false),
('10000000-0000-0000-0000-000000000003', 'FORRADO DE CUADERNO', 'etiquetas_forrado', 29, 6, 20.0, 20.0, false),
('10000000-0000-0000-0000-000000000003', 'FORRADO TABLA', 'etiquetas_forrado', 30, 1, 22.0, 22.0, false),
('10000000-0000-0000-0000-000000000004', 'CUADERNO COSIDO PROFESIONAL 100 H CUADRO GRANDE CON PUNTOS GUÍA (3 azul y 4 verde)', 'utiles', 0, 7, 111.0, 83.25, true),
('10000000-0000-0000-0000-000000000004', 'CAJA DE COLORES C/12', 'utiles', 1, 1, 44.0, 33.0, false),
('10000000-0000-0000-0000-000000000004', 'TIJERAS PUNTA REDONDA', 'utiles', 2, 1, 30.0, 22.5, false),
('10000000-0000-0000-0000-000000000004', 'GOMAS DE BORRAR MIGAJON', 'utiles', 3, 3, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000004', 'SACAPUNTAS CON DEPOSITO', 'utiles', 4, 3, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000004', 'LAPIZ DIXON No. 2', 'utiles', 5, 5, 4.0, 3.0, false),
('10000000-0000-0000-0000-000000000004', 'LAPIZ ROJO', 'utiles', 6, 5, 8.0, 6.0, false),
('10000000-0000-0000-0000-000000000004', 'LAPIZ ADHESIVO 20 GR.', 'utiles', 7, 3, 35.0, 26.25, false),
('10000000-0000-0000-0000-000000000004', 'REGLAS DE PLASTICO DE 20 cm.', 'utiles', 8, 1, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000004', 'TABLA DE PLASTILINA 30X30', 'utiles', 9, 1, 12.0, 9.0, false),
('10000000-0000-0000-0000-000000000004', 'CAJA DE PLASTILINA C/10', 'utiles', 10, 1, 24.0, 18.0, false),
('10000000-0000-0000-0000-000000000004', 'SOBRE DE PLASTICO T/CARTA CON BROCHE', 'utiles', 11, 1, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000004', 'PAQUETE DE 500 HOJAS BLANCAS T/CARTA FACIA BOND', 'utiles', 12, 1, 144.0, 108.0, false),
('10000000-0000-0000-0000-000000000004', 'BOTE DE PLASTICO 1/2 LITRO', 'material_adicional', 13, 1, 6.0, 6.0, false),
('10000000-0000-0000-0000-000000000004', 'ESTUCHE DE TELA CON CIERRE', 'material_adicional', 14, 1, 46.0, 46.0, false),
('10000000-0000-0000-0000-000000000004', 'PAQ. TOALLAS HÚMEDAS', 'material_adicional', 15, 1, 30.0, 30.0, false),
('10000000-0000-0000-0000-000000000004', 'LIBRO DE LECTURA EN ESPAÑOL 100 PAGS', 'material_adicional', 16, 1, 75.0, 75.0, false),
('10000000-0000-0000-0000-000000000004', 'LIBRO DE SOPAS EN INGLÉS', 'material_adicional', 17, 1, 30.0, 30.0, false),
('10000000-0000-0000-0000-000000000004', 'BOLSA ZIPLOC GRANDE', 'material_adicional', 18, 2, 5.0, 5.0, false),
('10000000-0000-0000-0000-000000000004', 'KLEENEX', 'material_adicional', 19, 1, 27.0, 27.0, false),
('10000000-0000-0000-0000-000000000004', 'AUDIFONOS DE CHICARO CON ESTUCHE', 'material_adicional', 20, 1, 60.0, 60.0, false),
('10000000-0000-0000-0000-000000000004', 'PAQUETE DE 21 ETIQUETAS 7X4, 22 ETIQUETAS 5X2.8 Y 75 DE 3.5X1', 'etiquetas_forrado', 21, 1, 160.0, 160.0, false),
('10000000-0000-0000-0000-000000000004', 'FORRADO DE CUADERNOS', 'etiquetas_forrado', 22, 7, 20.0, 20.0, false),
('10000000-0000-0000-0000-000000000005', 'CUADERNO COSIDO PROFESIONAL 100 H CUADRO GRANDE CON PUNTOS GUÍA (4 azul y 3 verde)', 'utiles', 0, 7, 111.0, 83.25, true),
('10000000-0000-0000-0000-000000000005', 'CAJA DE COLORES C/12', 'utiles', 1, 1, 44.0, 33.0, false),
('10000000-0000-0000-0000-000000000005', 'TIJERAS PUNTA REDONDA', 'utiles', 2, 1, 30.0, 22.5, false),
('10000000-0000-0000-0000-000000000005', 'GOMAS DE BORRAR MIGAJON', 'utiles', 3, 2, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000005', 'SACAPUNTAS CON DEPÓSITO', 'utiles', 4, 2, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000005', 'LAPIZ DIXON NO. 2', 'utiles', 5, 5, 4.0, 3.0, false),
('10000000-0000-0000-0000-000000000005', 'LAPIZ ROJO', 'utiles', 6, 3, 8.0, 6.0, false),
('10000000-0000-0000-0000-000000000005', 'LAPIZ ADHESIVO 20 GR.', 'utiles', 7, 2, 35.0, 26.25, false),
('10000000-0000-0000-0000-000000000005', 'REGLAS DE PLASTICO DE 20 cm.', 'utiles', 8, 1, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000005', 'TABLA DE PLASTILINA 30X30', 'utiles', 9, 1, 12.0, 9.0, false),
('10000000-0000-0000-0000-000000000005', 'SOBRE DE PLASTICO T/CARTA', 'utiles', 10, 1, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000005', 'MICA VINIL T/ CARTA', 'utiles', 11, 1, 12.0, 9.0, false),
('10000000-0000-0000-0000-000000000005', 'PAQUETE DE 500 HOJAS BLANCAS T/CARTA FACIA BOND', 'utiles', 12, 1, 144.0, 108.0, false),
('10000000-0000-0000-0000-000000000005', 'MARCADOR P/PINTARRON EXPO SANFORD NEGRO', 'utiles', 13, 2, 34.0, 25.5, false),
('10000000-0000-0000-0000-000000000005', 'ESTUCHE DE TELA CON CIERRE', 'material_adicional', 14, 1, 46.0, 46.0, false),
('10000000-0000-0000-0000-000000000005', 'BOLSA ZIPLOC GRANDE', 'material_adicional', 15, 2, 5.0, 5.0, false),
('10000000-0000-0000-0000-000000000005', 'PAQ. TOALLAS HÚMEDAS', 'material_adicional', 16, 1, 30.0, 30.0, false),
('10000000-0000-0000-0000-000000000005', 'KLEENEX', 'material_adicional', 17, 1, 27.0, 27.0, false),
('10000000-0000-0000-0000-000000000005', 'LIBRO DE SOPAS EN INGLÉS', 'material_adicional', 18, 1, 30.0, 30.0, false),
('10000000-0000-0000-0000-000000000005', 'BOTE DE PLASTILINA PLAYDOH', 'material_adicional', 19, 2, 28.0, 28.0, false),
('10000000-0000-0000-0000-000000000005', 'AUDIFONOS DE CHICHARO CON ESTUCHE', 'material_adicional', 20, 1, 60.0, 60.0, false),
('10000000-0000-0000-0000-000000000005', 'PAQUETE DE 21 ETIQUETAS 7X4, 22 ETIQUETAS 5X2.8 Y 75 DE 3.5X1', 'etiquetas_forrado', 21, 1, 160.0, 160.0, false),
('10000000-0000-0000-0000-000000000005', 'FORRADO DE CUADERNOS', 'etiquetas_forrado', 22, 7, 20.0, 20.0, false),
('10000000-0000-0000-0000-000000000005', 'BLOCK DE DIBUJO ESPIRAL 30 HOJAS (SOLO ALUMNOS DE ARTES VISUALES)', 'opcional', 23, 0, 65.0, 65.0, false),
('10000000-0000-0000-0000-000000000006', 'CUADERNO COSIDO PROF. 100 H. CUADRO CHICO ( 2 azul y 3 verde)', 'utiles', 0, 5, 62.0, 46.5, true),
('10000000-0000-0000-0000-000000000006', 'CUADERNO COSIDO PROF. 100 H. RAYA ( 3 azul )', 'utiles', 1, 3, 62.0, 46.5, true),
('10000000-0000-0000-0000-000000000006', 'CAJA DE COLORES C/12', 'utiles', 2, 1, 44.0, 33.0, false),
('10000000-0000-0000-0000-000000000006', 'TIJERAS PUNTA REDONDA', 'utiles', 3, 1, 30.0, 22.5, false),
('10000000-0000-0000-0000-000000000006', 'GOMAS DE BORRAR MIGAJON', 'utiles', 4, 2, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000006', 'SACAPUNTAS CON DEPÓSITO', 'utiles', 5, 2, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000006', 'LAPIZ DIXON No. 2', 'utiles', 6, 5, 4.0, 3.0, false),
('10000000-0000-0000-0000-000000000006', 'LAPIZ ROJO', 'utiles', 7, 5, 8.0, 6.0, false),
('10000000-0000-0000-0000-000000000006', 'LAPIZ ADHESIVO 20 GR.', 'utiles', 8, 2, 35.0, 26.25, false),
('10000000-0000-0000-0000-000000000006', 'REGLAS DE PLASTICO DE 20 cm.', 'utiles', 9, 1, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000006', 'SOBRE DE PLASTICO T/CARTA CON HILO O CON BROCHE', 'utiles', 10, 1, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000006', 'PAQUETE DE 500 HOJAS BLANCAS T/CARTA FACIA BOND', 'utiles', 11, 1, 144.0, 108.0, false),
('10000000-0000-0000-0000-000000000006', 'JUEGO DE GEOMETRIA', 'utiles', 12, 1, 58.0, 43.5, false),
('10000000-0000-0000-0000-000000000006', 'PLIEGOS LUSTRE (2 AZUL MARINO Y 2 VERDE BANDERA) PARA EL FORRADO', 'utiles', 13, 4, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000006', 'ESTUCHE DE TELA CON CIERRE', 'material_adicional', 14, 1, 46.0, 46.0, false),
('10000000-0000-0000-0000-000000000006', 'PAQ. TOALLAS HÚMEDAS', 'material_adicional', 15, 1, 30.0, 30.0, false),
('10000000-0000-0000-0000-000000000006', 'AUDIFONOS DE CHICARO CON ESTUCHE', 'material_adicional', 16, 1, 60.0, 60.0, false),
('10000000-0000-0000-0000-000000000006', 'KLEENEX', 'material_adicional', 17, 1, 27.0, 27.0, false),
('10000000-0000-0000-0000-000000000006', 'BOLSA ZIPLOC GRANDE', 'material_adicional', 18, 2, 5.0, 5.0, false),
('10000000-0000-0000-0000-000000000006', 'PAQUETE DE 21 ETIQUETAS 7X4, 22 ETIQUETAS 5X2.8 Y 75 DE 3.5X1', 'etiquetas_forrado', 19, 1, 160.0, 160.0, false),
('10000000-0000-0000-0000-000000000006', 'FORRADO DE CUADERNOS', 'etiquetas_forrado', 20, 6, 28.0, 28.0, false),
('10000000-0000-0000-0000-000000000006', 'BLOCK DE DIBUJO ESPIRAL 30 HOJAS (SOLO ALUMNOS DE ARTES VISUALES)', 'opcional', 21, 0, 65.0, 65.0, false),
('10000000-0000-0000-0000-000000000007', 'CUADERNO ESPIRAL PROF. 100 H. CUADRO CHICO (2 azul y 3 verde)', 'utiles', 0, 5, 54.0, 40.5, true),
('10000000-0000-0000-0000-000000000007', 'CUADERNO ESPIRAL PROF. 100 H. RAYA (3 azul)', 'utiles', 1, 3, 54.0, 40.5, true),
('10000000-0000-0000-0000-000000000007', 'CAJA DE COLORES C/12', 'utiles', 2, 1, 44.0, 33.0, false),
('10000000-0000-0000-0000-000000000007', 'TIJERAS PUNTA REDONDA', 'utiles', 3, 1, 30.0, 22.5, false),
('10000000-0000-0000-0000-000000000007', 'GOMAS DE BORRAR MIGAJON', 'utiles', 4, 2, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000007', 'SACAPUNTAS CON DEPÓSITO', 'utiles', 5, 2, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000007', 'LAPIZ DIXON NO. 2', 'utiles', 6, 5, 4.0, 3.0, false),
('10000000-0000-0000-0000-000000000007', 'LAPIZ ROJO', 'utiles', 7, 5, 8.0, 6.0, false),
('10000000-0000-0000-0000-000000000007', 'LAPIZ ADHESIVO 20 GR.', 'utiles', 8, 2, 35.0, 26.25, false),
('10000000-0000-0000-0000-000000000007', 'REGLAS DE PLASTICO DE 20 cm.', 'utiles', 9, 1, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000007', 'PAQUETE DE 500 HOJAS BLANCAS T/CARTA FACIA BOND', 'utiles', 10, 1, 144.0, 108.0, false),
('10000000-0000-0000-0000-000000000007', 'COMPÁS DE PRECISIÓN', 'utiles', 11, 1, 36.0, 27.0, false),
('10000000-0000-0000-0000-000000000007', 'TRANSPORTADOR', 'utiles', 12, 1, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000007', 'ESTUCHE DE TELA CON CIERRE', 'material_adicional', 13, 1, 46.0, 46.0, false),
('10000000-0000-0000-0000-000000000007', 'AUDIFONOS DE CHICARO CON ESTUCHE', 'material_adicional', 14, 1, 60.0, 60.0, false),
('10000000-0000-0000-0000-000000000007', 'PAQ. TOALLAS HÚMEDAS', 'material_adicional', 15, 1, 30.0, 30.0, false),
('10000000-0000-0000-0000-000000000007', 'KLEENEX', 'material_adicional', 16, 1, 27.0, 27.0, false),
('10000000-0000-0000-0000-000000000007', 'BOLSA ZIPLOC GRANDE PARA MATERIAL Y BATA DE LABORATORIO', 'material_adicional', 17, 2, 5.0, 5.0, false),
('10000000-0000-0000-0000-000000000007', 'PAQUETE DE 21 ETIQUETAS 7X4, 22 ETIQUETAS 5X2.8 Y 75 DE 3.5X1', 'etiquetas_forrado', 18, 1, 160.0, 160.0, false),
('10000000-0000-0000-0000-000000000007', 'FORRADO DE CUADERNOS', 'etiquetas_forrado', 19, 8, 20.0, 20.0, false),
('10000000-0000-0000-0000-000000000007', 'BLOCK DE DIBUJO ESPIRAL 30 HOJAS (SOLO ALUMNOS DE ARTES VISUALES)', 'opcional', 20, 0, 65.0, 65.0, false),
('10000000-0000-0000-0000-000000000008', 'CUADERNO ESPIRAL PROF. 100 H. RAYA (3 azul y 3 verde)', 'utiles', 0, 6, 54.0, 40.5, true),
('10000000-0000-0000-0000-000000000008', 'CUADERNO ESPIRAL PROF. 100 H. CUADRO CHICO ( azul )', 'utiles', 1, 2, 54.0, 40.5, true),
('10000000-0000-0000-0000-000000000008', 'CAJA DE COLORES C/12', 'utiles', 2, 1, 44.0, 33.0, false),
('10000000-0000-0000-0000-000000000008', 'TIJERAS PUNTA REDONDA', 'utiles', 3, 1, 30.0, 22.5, false),
('10000000-0000-0000-0000-000000000008', 'GOMAS DE BORRAR MIGAJON', 'utiles', 4, 2, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000008', 'SACAPUNTAS CON DEPÓSITO', 'utiles', 5, 2, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000008', 'PLUMAS: NEGRA, ROJA, AZUL PAPERMATE KILOMETRICO', 'utiles', 6, 6, 8.0, 6.0, false),
('10000000-0000-0000-0000-000000000008', 'LAPIZ DIXON NO. 2', 'utiles', 7, 3, 4.0, 3.0, false),
('10000000-0000-0000-0000-000000000008', 'LAPIZ ADHESIVO 20 GR.', 'utiles', 8, 1, 35.0, 26.25, false),
('10000000-0000-0000-0000-000000000008', 'CORRECTOR DE CINTA', 'utiles', 9, 2, 37.0, 27.75, false),
('10000000-0000-0000-0000-000000000008', 'REGLA DE PLASTICO DE 20 cm.', 'utiles', 10, 1, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000008', 'PAQUETE DE 500 HOJAS BLANCAS T/CARTA FACIA BOND', 'utiles', 11, 1, 144.0, 108.0, false),
('10000000-0000-0000-0000-000000000008', 'COMPÁS DE PRECISIÓN', 'utiles', 12, 1, 36.0, 27.0, false),
('10000000-0000-0000-0000-000000000008', 'TRANSPORTADOR', 'utiles', 13, 1, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000008', 'MARCATEXTOS', 'utiles', 14, 2, 14.0, 10.5, false),
('10000000-0000-0000-0000-000000000008', 'ESTUCHE DE TELA CON CIERRE', 'material_adicional', 15, 1, 46.0, 46.0, false),
('10000000-0000-0000-0000-000000000008', 'AUDIFONOS DE CHICARO CON ESTUCHE', 'material_adicional', 16, 1, 60.0, 60.0, false),
('10000000-0000-0000-0000-000000000008', 'PAQ. TOALLAS HÚMEDAS', 'material_adicional', 17, 1, 30.0, 30.0, false),
('10000000-0000-0000-0000-000000000008', 'KLEENEX', 'material_adicional', 18, 1, 27.0, 27.0, false),
('10000000-0000-0000-0000-000000000008', 'BOLSA ZIPLOC GRANDE PARA MATERIAL Y BATA DE LABORATORIO', 'material_adicional', 19, 2, 5.0, 5.0, false),
('10000000-0000-0000-0000-000000000008', 'PAQUETE DE 21 ETIQUETAS 7X4, 22 ETIQUETAS 5X2.8 Y 75 DE 3.5X1', 'etiquetas_forrado', 20, 1, 160.0, 160.0, false),
('10000000-0000-0000-0000-000000000008', 'FORRADO DE CUADERNOS', 'etiquetas_forrado', 21, 8, 20.0, 20.0, false),
('10000000-0000-0000-0000-000000000008', 'BLOCK DE DIBUJO ESPIRAL 30 HOJAS (SOLO ALUMNOS DE ARTES VISUALES)', 'opcional', 22, 0, 65.0, 65.0, false),
('10000000-0000-0000-0000-000000000009', 'CUADERNO ESPIRAL PROF. 100 H. RAYA ( 3 azul y 3 verde)', 'utiles', 0, 6, 54.0, 40.5, true),
('10000000-0000-0000-0000-000000000009', 'CUADERNO ESPIRAL PROF. 100 H. CUADRO CHICO ( azul )', 'utiles', 1, 2, 54.0, 40.5, true),
('10000000-0000-0000-0000-000000000009', 'CAJA DE COLORES C/12', 'utiles', 2, 1, 44.0, 33.0, false),
('10000000-0000-0000-0000-000000000009', 'TIJERAS PUNTA REDONDA', 'utiles', 3, 1, 30.0, 22.5, false),
('10000000-0000-0000-0000-000000000009', 'GOMAS DE BORRAR MIGAJON', 'utiles', 4, 2, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000009', 'SACAPUNTAS CON DEPÓSITO', 'utiles', 5, 2, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000009', 'PLUMAS: 2 NEGRAS, 2 AZULES Y 2 ROJAS PAPERMATE KILOMETRICO', 'utiles', 6, 6, 8.0, 6.0, false),
('10000000-0000-0000-0000-000000000009', 'LAPIZ DIXON NO. 2', 'utiles', 7, 2, 4.0, 3.0, false),
('10000000-0000-0000-0000-000000000009', 'LAPIZ ADHESIVO 20 GR.', 'utiles', 8, 1, 35.0, 26.25, false),
('10000000-0000-0000-0000-000000000009', 'CORRECTORES DE CINTA', 'utiles', 9, 2, 37.0, 27.75, false),
('10000000-0000-0000-0000-000000000009', 'REGLAS DE PLASTICO DE 20 cm.', 'utiles', 10, 1, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000009', 'PAQUETE DE 500 HOJAS BLANCAS T/CARTA FACIA BOND', 'utiles', 11, 1, 144.0, 108.0, false),
('10000000-0000-0000-0000-000000000009', 'JUEGO DE GEOMETRIA', 'utiles', 12, 1, 58.0, 43.5, false),
('10000000-0000-0000-0000-000000000009', 'ESTUCHE DE TELA CON CIERRE', 'material_adicional', 13, 1, 46.0, 46.0, false),
('10000000-0000-0000-0000-000000000009', 'AUDIFONOS DE CHICARO CON ESTUCHE', 'material_adicional', 14, 1, 60.0, 60.0, false),
('10000000-0000-0000-0000-000000000009', 'PAQ. TOALLAS HÚMEDAS', 'material_adicional', 15, 1, 30.0, 30.0, false),
('10000000-0000-0000-0000-000000000009', 'KLEENEX', 'material_adicional', 16, 1, 27.0, 27.0, false),
('10000000-0000-0000-0000-000000000009', 'BOLSA GRANDE ZIPLOC PARA MATERIAL Y BATA DE LABORATORIO', 'material_adicional', 17, 2, 5.0, 5.0, false),
('10000000-0000-0000-0000-000000000009', 'PAQUETE DE 21 ETIQUETAS 7X4, 22 ETIQUETAS 5X2.8 Y 75 DE 3.5X1', 'etiquetas_forrado', 18, 1, 160.0, 160.0, false),
('10000000-0000-0000-0000-000000000009', 'FORRADO DE CUADERNOS', 'etiquetas_forrado', 19, 8, 20.0, 20.0, false),
('10000000-0000-0000-0000-000000000009', 'BLOCK DE DIBUJO ESPIRAL 30 HOJAS (SOLO ALUMNOS DE ARTES VISUALES)', 'opcional', 20, 0, 65.0, 65.0, false),
('10000000-0000-0000-0000-000000000010', 'CUADERNO ESPIRAL PASTA GRUESA PROF. 100 H. RAYA', 'utiles', 0, 6, 116.0, 87.0, true),
('10000000-0000-0000-0000-000000000010', 'CUADERNO ESPIRAL PASTA GRUESA PROF. 100 H. CUADRO GRANDE', 'utiles', 1, 1, 116.0, 87.0, true),
('10000000-0000-0000-0000-000000000010', 'CUADERNO ESPIRAL PASTA GRUESA PROF. 100 H. CUADRO CHICO', 'utiles', 2, 1, 116.0, 87.0, true),
('10000000-0000-0000-0000-000000000010', 'BORRADOR DE MIGAJON', 'utiles', 3, 1, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000010', 'CORRECTOR DE CINTA', 'utiles', 4, 1, 37.0, 27.75, false),
('10000000-0000-0000-0000-000000000010', 'CAJA DE COLORES C/24', 'utiles', 5, 1, 80.0, 60.0, false),
('10000000-0000-0000-0000-000000000010', 'PLUMAS PAPERMATE KILOMETRICO AZUL ROJO VERDE Y NEGRO', 'utiles', 6, 4, 8.0, 6.0, false),
('10000000-0000-0000-0000-000000000010', 'LAPIZ No. 2', 'utiles', 7, 3, 4.0, 3.0, false),
('10000000-0000-0000-0000-000000000010', 'SACAPUNTAS CON DEPÓSITO', 'utiles', 8, 1, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000010', 'MARCATEXTO AMARILLO ROSA VERDE O NARANJA', 'utiles', 9, 1, 14.0, 10.5, false),
('10000000-0000-0000-0000-000000000010', 'JUEGO DE GEOMETRIA', 'utiles', 10, 1, 58.0, 43.5, false),
('10000000-0000-0000-0000-000000000010', 'TIJERAS', 'utiles', 11, 1, 30.0, 22.5, false),
('10000000-0000-0000-0000-000000000010', 'PAQ. DE PLUMONES DELGADOS', 'utiles', 12, 1, 131.0, 98.25, false),
('10000000-0000-0000-0000-000000000010', 'LAPIZ ADHESIVO 21 GRS.', 'utiles', 13, 1, 35.0, 26.25, false),
('10000000-0000-0000-0000-000000000010', 'CARPETA TAMAÑO CARTA ROSA FUERTE CON BROCHE BACO Y FORRADO', 'utiles', 14, 1, 36.0, 27.0, false),
('10000000-0000-0000-0000-000000000010', 'PAQ. DE PESTAÑAS ADHESIVAS VARIOS COLORES', 'utiles', 15, 1, 40.0, 30.0, false),
('10000000-0000-0000-0000-000000000010', 'REGLA DE PLÁSTICO 20 cm', 'utiles', 16, 1, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000010', 'SOBRE DE PLÁSTICO TAMAÑO CARTA', 'utiles', 17, 1, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000010', 'PAQUETE DE 21 ETIQUETAS 7X4', 'etiquetas_forrado', 18, 1, 80.0, 80.0, false),
('10000000-0000-0000-0000-000000000011', 'CUADERNO ESPIRAL PASTA GRUESA PROF. 100 H. RAYA', 'utiles', 0, 6, 116.0, 87.0, true),
('10000000-0000-0000-0000-000000000011', 'CUADERNO ESPIRAL PASTA GRUESA PROF. 100 H. CUADRO CHICO', 'utiles', 1, 1, 116.0, 87.0, true),
('10000000-0000-0000-0000-000000000011', 'CUADERNO ESPIRAL PASTA GRUESA PROF. 100 H. CUADRO GRANDE', 'utiles', 2, 1, 116.0, 87.0, true),
('10000000-0000-0000-0000-000000000011', 'BORRADOR DE MIGAJON', 'utiles', 3, 1, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000011', 'CORRECTOR DE CINTA', 'utiles', 4, 1, 37.0, 27.75, false),
('10000000-0000-0000-0000-000000000011', 'CAJA DE COLORES C/24', 'utiles', 5, 1, 80.0, 60.0, false),
('10000000-0000-0000-0000-000000000011', 'PLUMAS PAPERMATE KILOMETRICO AZUL ROJO VERDE Y NEGRO', 'utiles', 6, 4, 8.0, 6.0, false),
('10000000-0000-0000-0000-000000000011', 'LAPIZ No. 2', 'utiles', 7, 3, 4.0, 3.0, false),
('10000000-0000-0000-0000-000000000011', 'SACAPUNTAS CON DEPÓSITO', 'utiles', 8, 1, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000011', 'MARCATEXTO AMARILLO, ROSA, VERDE O NARANJA', 'utiles', 9, 1, 14.0, 10.5, false),
('10000000-0000-0000-0000-000000000011', 'JUEGO DE GEOMETRIA', 'utiles', 10, 1, 58.0, 43.5, false),
('10000000-0000-0000-0000-000000000011', 'TIJERAS', 'utiles', 11, 1, 30.0, 22.5, false),
('10000000-0000-0000-0000-000000000011', 'LAPIZ ADHESIVO 21 GRS.', 'utiles', 12, 1, 35.0, 26.25, false),
('10000000-0000-0000-0000-000000000011', 'PAQ. DE PLUMONES DELGADOS', 'utiles', 13, 1, 131.0, 98.25, false),
('10000000-0000-0000-0000-000000000011', 'SOBRE DE PLÁSTICO TAMAÑO CARTA', 'utiles', 14, 1, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000011', 'REGLA DE PLÁSTICO 20 cm', 'utiles', 15, 1, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000011', 'PAQ. DE PESTAÑAS ADHESIVAS VARIOS COLORES', 'utiles', 16, 1, 40.0, 30.0, false),
('10000000-0000-0000-0000-000000000011', 'CALCULADORA CIENTIFICA CASIO O CÉLICA', 'utiles', 17, 1, 387.0, 290.25, false),
('10000000-0000-0000-0000-000000000011', 'PAQUETE DE 21 ETIQUETAS 7X4', 'etiquetas_forrado', 18, 1, 80.0, 80.0, false),
('10000000-0000-0000-0000-000000000012', 'CUADERNO ESPIRAL PASTA GRUESA PROF. 100 H. RAYA', 'utiles', 0, 6, 116.0, 87.0, true),
('10000000-0000-0000-0000-000000000012', 'CUADERNO ESPIRAL PASTA GRUESA PROF. 100 H. CUADRO GRANDE', 'utiles', 1, 1, 116.0, 87.0, true),
('10000000-0000-0000-0000-000000000012', 'BORRADOR DE MIGAJON', 'utiles', 2, 1, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000012', 'CORRECTOR DE CINTA', 'utiles', 3, 1, 37.0, 27.75, false),
('10000000-0000-0000-0000-000000000012', 'CAJA DE COLORES C/24', 'utiles', 4, 1, 80.0, 60.0, false),
('10000000-0000-0000-0000-000000000012', 'PLUMAS PAPERMATE KILOMETRICO AZUL ROJO VERDE Y NEGRO', 'utiles', 5, 4, 8.0, 6.0, false),
('10000000-0000-0000-0000-000000000012', 'LAPIZ No. 2', 'utiles', 6, 3, 4.0, 3.0, false),
('10000000-0000-0000-0000-000000000012', 'SACAPUNTAS CON DEPÓSITO', 'utiles', 7, 1, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000012', 'MARCATEXTO AMARILLO, ROSA, VERDE O NARANJA', 'utiles', 8, 1, 14.0, 10.5, false),
('10000000-0000-0000-0000-000000000012', 'JUEGO DE GEOMETRIA', 'utiles', 9, 1, 58.0, 43.5, false),
('10000000-0000-0000-0000-000000000012', 'TIJERAS', 'utiles', 10, 1, 30.0, 22.5, false),
('10000000-0000-0000-0000-000000000012', 'LAPIZ ADHESIVO 21 GRS.', 'utiles', 11, 1, 35.0, 26.25, false),
('10000000-0000-0000-0000-000000000012', 'PAQ. DE PLUMONES DELGADOS', 'utiles', 12, 1, 131.0, 98.25, false),
('10000000-0000-0000-0000-000000000012', 'SOBRE DE PLÁSTICO TAMAÑO CARTA', 'utiles', 13, 1, 16.0, 12.0, false),
('10000000-0000-0000-0000-000000000012', 'REGLA DE PLÁSTICO 20 cm', 'utiles', 14, 1, 6.0, 4.5, false),
('10000000-0000-0000-0000-000000000012', 'CALCULADORA CIENTIFICA CASIO O CÉLICA', 'utiles', 15, 1, 387.0, 290.25, false),
('10000000-0000-0000-0000-000000000012', 'PAQ. DE PESTAÑAS ADHESIVAS VARIOS COLORES', 'utiles', 16, 1, 40.0, 30.0, false),
('10000000-0000-0000-0000-000000000012', 'PAQUETE DE 21 ETIQUETAS 7X4', 'etiquetas_forrado', 17, 1, 80.0, 80.0, false);
