-- ============================================================
-- MIGRACIÓN 002: Migrar FKs de usuario.id_usuario → profiles.id
-- Ejecutar en Supabase SQL Editor
-- ============================================================
-- Contexto: Las tablas del sprint 2+ (simulacion, llamada, etc.)
-- fueron diseñadas con un sistema legacy de usuarios (tabla `usuario`
-- con PK integer). El código de la app usa `profiles` (UUID de
-- Supabase Auth). Esta migración unifica ambos sistemas.
-- ============================================================

-- 1. TABLA simulacion
--    creado_por (integer → FK usuario) → creado_por (UUID → FK profiles)
ALTER TABLE public.simulacion
  ADD COLUMN IF NOT EXISTS creado_por_profile UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Si existe la FK vieja, la eliminamos de forma segura
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'simulacion'
      AND column_name = 'creado_por'
  ) THEN
    ALTER TABLE public.simulacion DROP COLUMN creado_por;
  END IF;
END $$;

ALTER TABLE public.simulacion RENAME COLUMN creado_por_profile TO creado_por;


-- 2. TABLA participante_simulacion
--    id_usuario (integer → FK usuario) → profile_id (UUID → FK profiles)
ALTER TABLE public.participante_simulacion
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'participante_simulacion'
      AND column_name = 'id_usuario'
  ) THEN
    ALTER TABLE public.participante_simulacion DROP COLUMN id_usuario;
  END IF;
END $$;


-- 3. TABLA participante_llamada
--    id_usuario (integer → FK usuario) → profile_id (UUID → FK profiles)
ALTER TABLE public.participante_llamada
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'participante_llamada'
      AND column_name = 'id_usuario'
  ) THEN
    ALTER TABLE public.participante_llamada DROP COLUMN id_usuario;
  END IF;
END $$;


-- 4. TABLA participante_chat
--    id_usuario (integer → FK usuario) → profile_id (UUID → FK profiles)
ALTER TABLE public.participante_chat
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'participante_chat'
      AND column_name = 'id_usuario'
  ) THEN
    ALTER TABLE public.participante_chat DROP COLUMN id_usuario;
  END IF;
END $$;


-- 5. TABLA mensaje
--    id_emisor (integer → FK usuario) → profile_id (UUID → FK profiles)
ALTER TABLE public.mensaje
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mensaje'
      AND column_name = 'id_emisor'
  ) THEN
    ALTER TABLE public.mensaje DROP COLUMN id_emisor;
  END IF;
END $$;


-- 6. TABLA evaluacion
--    id_evaluador (integer → FK usuario) → evaluador_id (UUID → FK profiles)
ALTER TABLE public.evaluacion
  ADD COLUMN IF NOT EXISTS evaluador_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'evaluacion'
      AND column_name = 'id_evaluador'
  ) THEN
    ALTER TABLE public.evaluacion DROP COLUMN id_evaluador;
  END IF;
END $$;


-- 7. Índices útiles para las nuevas columnas UUID
CREATE INDEX IF NOT EXISTS idx_simulacion_creado_por       ON public.simulacion(creado_por);
CREATE INDEX IF NOT EXISTS idx_part_sim_profile_id         ON public.participante_simulacion(profile_id);
CREATE INDEX IF NOT EXISTS idx_part_llamada_profile_id     ON public.participante_llamada(profile_id);
CREATE INDEX IF NOT EXISTS idx_part_chat_profile_id        ON public.participante_chat(profile_id);
CREATE INDEX IF NOT EXISTS idx_mensaje_profile_id          ON public.mensaje(profile_id);
CREATE INDEX IF NOT EXISTS idx_evaluacion_evaluador_id     ON public.evaluacion(evaluador_id);


-- 8. RLS básico para simulacion (solo lectura propia y admin puede todo)
ALTER TABLE public.simulacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Simulacion select policy" ON public.simulacion;
DROP POLICY IF EXISTS "Simulacion insert policy" ON public.simulacion;
DROP POLICY IF EXISTS "Simulacion update policy" ON public.simulacion;
DROP POLICY IF EXISTS "Simulacion delete policy" ON public.simulacion;

CREATE POLICY "Simulacion select policy"
  ON public.simulacion FOR SELECT
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.participante_simulacion ps
    WHERE ps.id_simulacion = simulacion.id_simulacion
      AND ps.profile_id = auth.uid()
  ));

CREATE POLICY "Simulacion insert policy"
  ON public.simulacion FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Simulacion update policy"
  ON public.simulacion FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Simulacion delete policy"
  ON public.simulacion FOR DELETE
  USING (public.is_admin());


-- 9. RLS para participante_simulacion
ALTER TABLE public.participante_simulacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Part sim select policy" ON public.participante_simulacion;
DROP POLICY IF EXISTS "Part sim insert policy" ON public.participante_simulacion;
DROP POLICY IF EXISTS "Part sim delete policy" ON public.participante_simulacion;

CREATE POLICY "Part sim select policy"
  ON public.participante_simulacion FOR SELECT
  USING (public.is_admin() OR profile_id = auth.uid());

CREATE POLICY "Part sim insert policy"
  ON public.participante_simulacion FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Part sim delete policy"
  ON public.participante_simulacion FOR DELETE
  USING (public.is_admin());
