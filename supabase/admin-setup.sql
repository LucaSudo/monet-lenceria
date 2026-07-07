-- ============================================================
--  Monet Lencería · Configuración del panel de administración
--  Pegá TODO en: Supabase → SQL Editor → New query → Run
--
--  Habilita escritura para usuarios autenticados (el admin logueado)
--  y crea el bucket de imágenes con sus políticas.
-- ============================================================

-- 1) Productos: acceso total para usuarios AUTENTICADOS -----------------
--    (la política pública de solo-lectura de activos sigue vigente para
--     la tienda; esta se SUMA y solo aplica a quien inició sesión).
drop policy if exists "Acceso total autenticados" on public.productos;
create policy "Acceso total autenticados"
  on public.productos
  for all
  to authenticated
  using (true)
  with check (true);

-- 2) Storage: bucket público para las imágenes de productos -------------
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;

-- Lectura pública de las imágenes (para que la tienda las muestre)
drop policy if exists "Imagenes lectura publica" on storage.objects;
create policy "Imagenes lectura publica"
  on storage.objects
  for select
  using (bucket_id = 'productos');

-- Subir / reemplazar / borrar imágenes: solo autenticados
drop policy if exists "Imagenes escritura autenticados" on storage.objects;
create policy "Imagenes escritura autenticados"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'productos')
  with check (bucket_id = 'productos');
