
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-- ⛔ PARE! LEIA ISTO ANTES DE EXECUTAR ⛔
--
-- ESTE SCRIPT É EXCLUSIVO PARA BANCOS DE DADOS POSTGRESQL (SUPABASE).
--
-- SE VOCÊ ESTÁ USANDO HOSTINGER (MYSQL), NÃO USE ESTE ARQUIVO.
-- O USO DESTE ARQUIVO NO MYSQL CAUSARÁ O ERRO #1064 (SINTAXE).
--
-- ✅ PARA HOSTINGER/MYSQL: USE O ARQUIVO 'hostinger_schema.sql'
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

-- ====================================================================================
-- SCRIPT POSTGRESQL (SUPABASE APENAS)
-- ====================================================================================

-- 1. TABELA DE TURMAS (classes)
CREATE TABLE IF NOT EXISTS public.classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    grade TEXT,
    year NUMERIC,
    shift TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS is_remediation BOOLEAN DEFAULT false;
-- teacher_id mantido para compatibilidade legado, mas o sistema usará teacher_ids
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS teacher_id TEXT; 
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS teacher_ids TEXT[]; -- Array de IDs (TEXT[])
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS focus_skills JSONB DEFAULT '[]'::jsonb;

-- MIGRAÇÃO DE DADOS (Se teacher_id existir e teacher_ids estiver vazio, copia o valor)
UPDATE public.classes 
SET teacher_ids = ARRAY[teacher_id] 
WHERE teacher_id IS NOT NULL AND (teacher_ids IS NULL OR teacher_ids = '{}');

-- 2. TABELA DE ALUNOS (students)
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    class_id TEXT REFERENCES public.classes(id),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS remediation_entry_date TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS remediation_exit_date TEXT;
-- Novos campos para Educação Inclusiva
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS has_specificities BOOLEAN DEFAULT false;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS specificity_description TEXT;

-- 3. TABELA DE USUÁRIOS (users)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT,
    role TEXT NOT NULL DEFAULT 'professor',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE HABILIDADES (skills)
CREATE TABLE IF NOT EXISTS public.skills (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    description TEXT,
    subject TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS year TEXT;

-- 5. TABELA DE AVALIAÇÕES (assessments)
CREATE TABLE IF NOT EXISTS public.assessments (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES public.students(id),
    skill_id TEXT REFERENCES public.skills(id),
    date TEXT NOT NULL,
    status TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS term TEXT;
-- Novos campos unificados
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS participation_score NUMERIC;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS behavior_score NUMERIC;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS exam_score NUMERIC;
-- Novo campo para avaliação por disciplina (sem habilidade específica)
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS subject_id TEXT;

-- 6. TABELA DE DISCIPLINAS (subjects)
CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABELA DE DIÁRIO DE CLASSE (class_daily_logs)
CREATE TABLE IF NOT EXISTS public.class_daily_logs (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    content TEXT NOT NULL,
    attendance JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABELA DE AVISOS (notices)
CREATE TABLE IF NOT EXISTS public.notices (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT DEFAULT 'general',
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABELA DE MATERIAIS (materials)
CREATE TABLE IF NOT EXISTS public.materials (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, /* planning, exam, activity, administrative */
    subject_id TEXT,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABELA DE PLANOS DE AULA (lesson_plans)
CREATE TABLE IF NOT EXISTS public.lesson_plans (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    class_id TEXT REFERENCES public.classes(id),
    subject_id TEXT,
    duration TEXT,
    objectives TEXT,
    content TEXT,
    methodology TEXT,
    resources TEXT,
    evaluation TEXT,
    bncc_skill_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. TABELA DE CONFIGURAÇÕES (settings)
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- 12. DADOS PADRÃO: DISCIPLINAS E CONFIGS
INSERT INTO public.subjects (id, name)
VALUES 
  ('sub-lp', 'Língua Portuguesa'),
  ('sub-mat', 'Matemática'),
  ('sub-cie', 'Ciências'),
  ('sub-his', 'História'),
  ('sub-geo', 'Geografia'),
  ('sub-art', 'Arte'),
  ('sub-ing', 'Inglês'),
  ('sub-edfis', 'Educação Física'),
  ('sub-ensrel', 'Ensino Religioso')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.settings (id, value) VALUES ('school_name', 'Escola Olavo Bilac') ON CONFLICT (id) DO NOTHING;

-- 13. POLÍTICAS DE SEGURANÇA (RLS)
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable access for all users" ON public.classes;
DROP POLICY IF EXISTS "Enable access for all users" ON public.students;
DROP POLICY IF EXISTS "Enable access for all users" ON public.skills;
DROP POLICY IF EXISTS "Enable access for all users" ON public.assessments;
DROP POLICY IF EXISTS "Enable access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable access for all users" ON public.subjects;
DROP POLICY IF EXISTS "Enable access for all users" ON public.class_daily_logs;
DROP POLICY IF EXISTS "Enable access for all users" ON public.notices;
DROP POLICY IF EXISTS "Enable access for all users" ON public.materials;
DROP POLICY IF EXISTS "Enable access for all users" ON public.lesson_plans;
DROP POLICY IF EXISTS "Enable access for all users" ON public.settings;

CREATE POLICY "Enable access for all users" ON public.classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable access for all users" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable access for all users" ON public.skills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable access for all users" ON public.assessments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable access for all users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable access for all users" ON public.subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable access for all users" ON public.class_daily_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable access for all users" ON public.notices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable access for all users" ON public.materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable access for all users" ON public.lesson_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable access for all users" ON public.settings FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload config';
