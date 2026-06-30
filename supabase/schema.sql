-- ============================================================
--  Monet Lencería · Esquema de base de datos (Supabase / Postgres)
--  Pegá TODO este archivo en: Supabase → SQL Editor → New query → Run
--
--  Crea SOLO la estructura. Los productos los cargará el dueño de la
--  tienda más adelante desde el panel de administración.
-- ============================================================

-- 1) Tabla de productos -------------------------------------------------
--    Una sola tabla. El "tipo de producto" es un dato (categoria /
--    subcategoria), no una tabla aparte: así el admin sube cualquier
--    producto con un solo formulario y se pueden agregar categorías
--    nuevas sin tocar la base ni el código.
create table if not exists public.productos (
  id            bigint generated always as identity primary key,
  nombre        text        not null,
  precio        integer     not null check (precio >= 0),
  categoria     text        not null,            -- ej: 'ropa-interior', 'bodys', 'pijamas'
  subcategoria  text        not null,            -- ej: 'corpinos', 'bombachas', 'medias'
  img           text,                            -- URL de la imagen del producto
  colores       jsonb       not null default '[]'::jsonb,  -- ej: ["#e5b9b1","#111827"]
  activo        boolean     not null default true,         -- false = oculto en la tienda
  creado        timestamptz not null default now()
);

-- Índice para filtrar rápido por categoría / subcategoría
create index if not exists productos_cat_idx
  on public.productos (categoria, subcategoria);

-- 2) Row Level Security -------------------------------------------------
--    Lectura pública SOLO de productos activos (la tienda usa la anon key).
--    No se crea ninguna política de escritura: con RLS activo, insertar /
--    editar / borrar queda bloqueado para el público. El panel de admin
--    escribirá con un usuario autenticado o la service_role key (server),
--    y ahí se agregarán las políticas de escritura correspondientes.
alter table public.productos enable row level security;

drop policy if exists "Lectura publica de productos activos" on public.productos;
create policy "Lectura publica de productos activos"
  on public.productos
  for select
  using (activo = true);
