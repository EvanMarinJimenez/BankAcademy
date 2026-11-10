-- ============================================================
-- MIGRACIÓN 007: Impedir que un usuario se asigne el rol de admin
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. El registro público siempre crea participantes. El rol que envíe el navegador
--    se ignora; los admins se crean desde el servidor (POST /api/users).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name, phone, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        'participant'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Solo un admin puede cambiar el rol o el estado de una cuenta desde el navegador.
--    El servidor (service role) y el SQL Editor no se ven afectados.
CREATE OR REPLACE FUNCTION public.proteger_rol_y_estado()
RETURNS TRIGGER AS $$
BEGIN
    IF current_user IN ('anon', 'authenticated')
       AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active)
       AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo un administrador puede cambiar el rol o el estado de una cuenta.'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS on_profiles_proteger_rol ON public.profiles;
CREATE TRIGGER on_profiles_proteger_rol
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.proteger_rol_y_estado();

-- 3. Los perfiles los crean el trigger de registro y el servidor; el navegador no
--    necesita insertarlos.
DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;
