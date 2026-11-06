-- ==============================================================================
-- Migration: Kid-Friendly Educational Resource Portal
-- Description: Profiles, Classes, Subjects, Units, Resources, Activity Logs,
--              Automated User Profile Trigger, and Complete Row-Level Security.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('teacher', 'student');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE resource_file_type AS ENUM ('pdf', 'html', 'image', 'docx', 'video', 'audio', 'other');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE student_action_type AS ENUM ('view', 'download', 'interactive_launch', 'complete');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ==============================================================================
-- 3. TABLES DEFINITION
-- ==============================================================================

-- 3.1 Classes
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    grade_level TEXT DEFAULT 'Grade 1',
    icon TEXT DEFAULT '🎒',
    color TEXT DEFAULT '#38bdf8',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3.2 Profiles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    role user_role NOT NULL DEFAULT 'student',
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    avatar TEXT DEFAULT '🦊',
    stars INTEGER DEFAULT 0,
    pin TEXT DEFAULT '1234',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3.3 Subjects
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color_code TEXT DEFAULT '#38bdf8',
    icon TEXT DEFAULT '📚',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3.4 Units (Topics / Chapters)
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3.5 Resources (Files & Interactive Packages)
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type resource_file_type NOT NULL DEFAULT 'other',
    file_size BIGINT DEFAULT 0,
    mime_type TEXT DEFAULT 'application/octet-stream',
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3.6 Activity / Access Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    resource_title TEXT NOT NULL,
    class_name TEXT DEFAULT '',
    subject_name TEXT DEFAULT '',
    unit_name TEXT DEFAULT '',
    action_type student_action_type NOT NULL DEFAULT 'view',
    accessed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Compatibility view for access_logs alias
CREATE OR REPLACE VIEW public.access_logs AS SELECT * FROM public.activity_logs;

-- 3.7 High-Performance Query Indexes
CREATE INDEX IF NOT EXISTS idx_classes_created_by ON public.classes(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_class ON public.profiles(class_id);
CREATE INDEX IF NOT EXISTS idx_subjects_class ON public.subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_units_subject ON public.units(subject_id);
CREATE INDEX IF NOT EXISTS idx_resources_unit ON public.resources(unit_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_student ON public.activity_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON public.activity_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_accessed_at ON public.activity_logs(accessed_at DESC);

-- ==============================================================================
-- 4. HELPER SECURITY DEFINER FUNCTIONS (Prevents Infinite RLS Recursion)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_teacher(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'teacher'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_class_id(user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT class_id FROM public.profiles WHERE id = user_id;
$$;

-- ==============================================================================
-- 5. ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ----------------- 5.1 PROFILES POLICIES -----------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Teachers can view student profiles" ON public.profiles;
CREATE POLICY "Teachers can view student profiles"
    ON public.profiles FOR SELECT
    USING (public.is_teacher(auth.uid()) = true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Teachers can insert student profiles" ON public.profiles;
CREATE POLICY "Teachers can insert student profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (public.is_teacher(auth.uid()) = true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Teachers can update student profiles" ON public.profiles;
CREATE POLICY "Teachers can update student profiles"
    ON public.profiles FOR UPDATE
    USING (public.is_teacher(auth.uid()) = true);

DROP POLICY IF EXISTS "Teachers can delete student profiles" ON public.profiles;
CREATE POLICY "Teachers can delete student profiles"
    ON public.profiles FOR DELETE
    USING (public.is_teacher(auth.uid()) = true);

-- ----------------- 5.2 CLASSES POLICIES -----------------
DROP POLICY IF EXISTS "Teachers can manage classes" ON public.classes;
CREATE POLICY "Teachers can manage classes"
    ON public.classes FOR ALL
    USING (public.is_teacher(auth.uid()) = true OR created_by = auth.uid())
    WITH CHECK (public.is_teacher(auth.uid()) = true OR created_by = auth.uid());

DROP POLICY IF EXISTS "Students can view assigned class" ON public.classes;
CREATE POLICY "Students can view assigned class"
    ON public.classes FOR SELECT
    USING (
        id = public.get_user_class_id(auth.uid())
        OR public.is_teacher(auth.uid()) = true
        OR auth.role() = 'anon'
    );

-- ----------------- 5.3 SUBJECTS POLICIES -----------------
DROP POLICY IF EXISTS "Teachers can manage subjects" ON public.subjects;
CREATE POLICY "Teachers can manage subjects"
    ON public.subjects FOR ALL
    USING (public.is_teacher(auth.uid()) = true)
    WITH CHECK (public.is_teacher(auth.uid()) = true);

DROP POLICY IF EXISTS "Students can view subjects for their class" ON public.subjects;
CREATE POLICY "Students can view subjects for their class"
    ON public.subjects FOR SELECT
    USING (
        class_id = public.get_user_class_id(auth.uid())
        OR public.is_teacher(auth.uid()) = true
        OR auth.role() = 'anon'
    );

-- ----------------- 5.4 UNITS POLICIES -----------------
DROP POLICY IF EXISTS "Teachers can manage units" ON public.units;
CREATE POLICY "Teachers can manage units"
    ON public.units FOR ALL
    USING (public.is_teacher(auth.uid()) = true)
    WITH CHECK (public.is_teacher(auth.uid()) = true);

DROP POLICY IF EXISTS "Students can view units for their subjects" ON public.units;
CREATE POLICY "Students can view units for their subjects"
    ON public.units FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.subjects s
            WHERE s.id = units.subject_id
            AND (s.class_id = public.get_user_class_id(auth.uid()) OR public.is_teacher(auth.uid()) = true)
        )
        OR auth.role() = 'anon'
    );

-- ----------------- 5.5 RESOURCES POLICIES -----------------
DROP POLICY IF EXISTS "Teachers can manage resources" ON public.resources;
CREATE POLICY "Teachers can manage resources"
    ON public.resources FOR ALL
    USING (public.is_teacher(auth.uid()) = true)
    WITH CHECK (public.is_teacher(auth.uid()) = true);

DROP POLICY IF EXISTS "Students can view resources for their class units" ON public.resources;
CREATE POLICY "Students can view resources for their class units"
    ON public.resources FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.units u
            JOIN public.subjects s ON u.subject_id = s.id
            WHERE u.id = resources.unit_id
            AND (s.class_id = public.get_user_class_id(auth.uid()) OR public.is_teacher(auth.uid()) = true)
        )
        OR auth.role() = 'anon'
    );

-- ----------------- 5.6 ACTIVITY LOGS POLICIES -----------------
DROP POLICY IF EXISTS "Students can record activity logs" ON public.activity_logs;
CREATE POLICY "Students can record activity logs"
    ON public.activity_logs FOR INSERT
    WITH CHECK (
        student_id = auth.uid()
        OR public.is_teacher(auth.uid()) = true
        OR auth.role() = 'anon'
    );

DROP POLICY IF EXISTS "Students can view own activity logs" ON public.activity_logs;
CREATE POLICY "Students can view own activity logs"
    ON public.activity_logs FOR SELECT
    USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can view all activity logs" ON public.activity_logs;
CREATE POLICY "Teachers can view all activity logs"
    ON public.activity_logs FOR SELECT
    USING (public.is_teacher(auth.uid()) = true);

-- ==============================================================================
-- 6. AUTOMATED USER PROFILE TRIGGER ON AUTH.USERS SIGNUP
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    assigned_role user_role := 'student';
BEGIN
    IF (NEW.raw_user_meta_data->>'role') = 'teacher' THEN
        assigned_role := 'teacher';
    END IF;

    INSERT INTO public.profiles (id, name, email, role, avatar, class_id)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.email,
        assigned_role,
        COALESCE(NEW.raw_user_meta_data->>'avatar', CASE WHEN assigned_role = 'teacher' THEN '👩‍🏫' ELSE '🦊' END),
        CASE 
            WHEN NEW.raw_user_meta_data->>'class_id' IS NOT NULL 
            THEN (NEW.raw_user_meta_data->>'class_id')::UUID 
            ELSE NULL 
        END
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 7. SUPABASE STORAGE BUCKET: `class-resources` & POLICIES
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'class-resources',
    'class-resources',
    true,
    104857600, -- 100MB
    ARRAY[
        'application/pdf',
        'text/html',
        'application/zip',
        'application/x-zip-compressed',
        'image/jpeg',
        'image/png',
        'image/svg+xml',
        'image/gif',
        'image/webp',
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'video/mp4',
        'video/webm',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 104857600;

DROP POLICY IF EXISTS "Public can view class resources" ON storage.objects;
CREATE POLICY "Public can view class resources"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'class-resources');

DROP POLICY IF EXISTS "Teachers can upload class resources" ON storage.objects;
CREATE POLICY "Teachers can upload class resources"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'class-resources'
        AND (public.is_teacher(auth.uid()) = true OR auth.role() = 'authenticated')
    );

DROP POLICY IF EXISTS "Teachers can update class resources" ON storage.objects;
CREATE POLICY "Teachers can update class resources"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'class-resources'
        AND (public.is_teacher(auth.uid()) = true OR auth.role() = 'authenticated')
    );

DROP POLICY IF EXISTS "Teachers can delete class resources" ON storage.objects;
CREATE POLICY "Teachers can delete class resources"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'class-resources'
        AND (public.is_teacher(auth.uid()) = true OR auth.role() = 'authenticated')
    );
