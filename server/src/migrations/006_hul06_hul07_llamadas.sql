-- ============================================================
-- MIGRACIÓN 006: Columnas de llamadas para HUL06 y HUL07
-- Ejecutar en Supabase SQL Editor
-- ============================================================
-- Requiere las tablas llamada y participante_llamada del esquema base,
-- que no se crean en estas migraciones. Es seguro ejecutarla de nuevo.

-- 1. llamada: quién inició la llamada y notas del admin
ALTER TABLE public.llamada
  ADD COLUMN IF NOT EXISTS iniciada_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.llamada
  ADD COLUMN IF NOT EXISTS notas_admin TEXT;

-- 2. participante_llamada: vincular participantes con profiles
--    (id_usuario se conserva, pero el código deja ese campo en NULL)
ALTER TABLE public.participante_llamada
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_llamada_estado
  ON public.llamada(estado);

CREATE INDEX IF NOT EXISTS idx_llamada_iniciada_por
  ON public.llamada(iniciada_por);

CREATE INDEX IF NOT EXISTS idx_part_llamada_profile_id
  ON public.participante_llamada(profile_id);

-- 4. Recargar caché del schema en Supabase API
NOTIFY pgrst, 'reload schema';
