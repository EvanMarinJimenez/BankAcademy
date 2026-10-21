-- ============================================================
-- MIGRACIÓN 003: Columna de parámetros para simulaciones (HUL04)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE public.simulacion
  ADD COLUMN IF NOT EXISTS parametros JSONB DEFAULT '{
    "duracion_minutos": 10,
    "dificultad": "media",
    "intentos_max": 2,
    "umbral_aprobacion": 70,
    "tono_cliente": "normal"
  }'::jsonb;
