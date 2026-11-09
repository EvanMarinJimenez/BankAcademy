-- ============================================================
-- MIGRACIÓN 006: Tabla y columnas de llamadas para HUL06 y HUL07
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Crear tabla llamada si no existe
CREATE TABLE IF NOT EXISTS public.llamada (
  id_llamada      BIGSERIAL PRIMARY KEY,
  id_simulacion   BIGINT REFERENCES public.simulacion(id_simulacion) ON DELETE SET NULL,
  profile_id      UUID   REFERENCES public.profiles(id) ON DELETE CASCADE,
  iniciada_por    UUID   REFERENCES public.profiles(id) ON DELETE SET NULL,
  estado          TEXT   NOT NULL DEFAULT 'en_curso'
                    CHECK (estado IN ('en_curso', 'finalizada', 'perdida', 'rechazada')),
  inicio_en       TIMESTAMPTZ DEFAULT now(),
  fin_en          TIMESTAMPTZ,
  notas_admin     TEXT
);

-- 2. Si la tabla ya existía de esquemas previos, asegurar las columnas nuevas
ALTER TABLE public.llamada
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.llamada
  ADD COLUMN IF NOT EXISTS iniciada_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.llamada
  ADD COLUMN IF NOT EXISTS notas_admin TEXT;

-- 3. Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_llamada_profile_id
  ON public.llamada(profile_id);

CREATE INDEX IF NOT EXISTS idx_llamada_estado
  ON public.llamada(estado);

CREATE INDEX IF NOT EXISTS idx_llamada_id_simulacion
  ON public.llamada(id_simulacion);

-- 4. Recargar caché del schema en Supabase API
NOTIFY pgrst, 'reload schema';
