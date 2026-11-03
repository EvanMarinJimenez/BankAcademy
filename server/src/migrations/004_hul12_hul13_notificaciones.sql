-- ============================================================
-- MIGRACIÓN 004: Notificaciones dentro de la app (HUL12, HUL13)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notificacion (
  id_notificacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  id_simulacion BIGINT NOT NULL REFERENCES public.simulacion(id_simulacion) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('recordatorio', 'cancelacion')),
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  -- Misma convención que simulacion.fecha_inicio. Permite un nuevo aviso si se reprograma.
  fecha_objetivo TIMESTAMP NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Evita duplicados aunque el proceso de recordatorios corra cada minuto.
  CONSTRAINT notificacion_unica UNIQUE (profile_id, id_simulacion, tipo, fecha_objetivo)
);

CREATE INDEX IF NOT EXISTS idx_notificacion_profile_fecha
  ON public.notificacion(profile_id, created_at DESC);

-- Cada usuario solo ve sus notificaciones y solo puede marcarlas como leídas.
-- Las crea el servidor con la service role key.
ALTER TABLE public.notificacion ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.notificacion FROM anon, authenticated;
GRANT SELECT ON public.notificacion TO authenticated;
GRANT UPDATE (leida) ON public.notificacion TO authenticated;

DROP POLICY IF EXISTS "Notificacion select propia" ON public.notificacion;
CREATE POLICY "Notificacion select propia"
  ON public.notificacion FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Notificacion update propia" ON public.notificacion;
CREATE POLICY "Notificacion update propia"
  ON public.notificacion FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);
