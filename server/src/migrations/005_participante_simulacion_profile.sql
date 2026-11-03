-- ============================================================
-- MIGRACIÓN 005: Completar participante_simulacion → profiles
-- Ejecutar en Supabase SQL Editor
-- ============================================================
-- La migración 002 no quedó aplicada en esta tabla.
-- Elimina id_usuario: ejecutar solo si la tabla no tiene asignaciones que conservar.

ALTER TABLE public.participante_simulacion
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.participante_simulacion
  DROP COLUMN IF EXISTS id_usuario;

CREATE INDEX IF NOT EXISTS idx_part_sim_profile_id
  ON public.participante_simulacion(profile_id);

-- Un participante no puede asignarse dos veces al mismo escenario.
CREATE UNIQUE INDEX IF NOT EXISTS uq_part_sim_simulacion_profile
  ON public.participante_simulacion(id_simulacion, profile_id);

NOTIFY pgrst, 'reload schema';
