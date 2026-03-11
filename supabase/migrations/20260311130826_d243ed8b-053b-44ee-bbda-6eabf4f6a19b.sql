
-- Add total_encontros column to mentorados
ALTER TABLE public.mentorados ADD COLUMN total_encontros integer NOT NULL DEFAULT 0;

-- Drop ALL restrictive policies on mentorados
DROP POLICY IF EXISTS "Admins can do all on mentorados" ON public.mentorados;
DROP POLICY IF EXISTS "Mentors see own mentorados" ON public.mentorados;
DROP POLICY IF EXISTS "Operacao can delete mentorados" ON public.mentorados;
DROP POLICY IF EXISTS "Operacao can insert mentorados" ON public.mentorados;
DROP POLICY IF EXISTS "Operacao can update mentorados" ON public.mentorados;
DROP POLICY IF EXISTS "Operacao can view mentorados" ON public.mentorados;

-- Create single permissive policy for all authenticated users
CREATE POLICY "Authenticated users full access mentorados" ON public.mentorados
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Drop ALL restrictive policies on encontros
DROP POLICY IF EXISTS "Admins can do all on encontros" ON public.encontros;
DROP POLICY IF EXISTS "Mentors can manage own encontros" ON public.encontros;
DROP POLICY IF EXISTS "Mentors can update own encontros" ON public.encontros;
DROP POLICY IF EXISTS "Mentors see own encontros" ON public.encontros;
DROP POLICY IF EXISTS "Operacao can insert encontros" ON public.encontros;
DROP POLICY IF EXISTS "Operacao can view encontros" ON public.encontros;

CREATE POLICY "Authenticated users full access encontros" ON public.encontros
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Drop ALL restrictive policies on historicos
DROP POLICY IF EXISTS "Admins can do all on historicos" ON public.historicos;
DROP POLICY IF EXISTS "Mentors can insert historicos" ON public.historicos;
DROP POLICY IF EXISTS "Mentors see own historicos" ON public.historicos;
DROP POLICY IF EXISTS "Operacao can view non-private historicos" ON public.historicos;

CREATE POLICY "Authenticated users full access historicos" ON public.historicos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Drop ALL restrictive policies on origens
DROP POLICY IF EXISTS "Admins can manage origens" ON public.origens;
DROP POLICY IF EXISTS "Authenticated users can view origens" ON public.origens;
DROP POLICY IF EXISTS "Operacao can manage origens" ON public.origens;

CREATE POLICY "Authenticated users full access origens" ON public.origens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Drop ALL restrictive policies on especialidades
DROP POLICY IF EXISTS "Admins can manage especialidades" ON public.especialidades;
DROP POLICY IF EXISTS "Authenticated users can view especialidades" ON public.especialidades;
DROP POLICY IF EXISTS "Operacao can manage especialidades" ON public.especialidades;

CREATE POLICY "Authenticated users full access especialidades" ON public.especialidades
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Drop ALL restrictive policies on mentores
DROP POLICY IF EXISTS "Admins can insert mentores" ON public.mentores;
DROP POLICY IF EXISTS "Admins can manage mentores" ON public.mentores;
DROP POLICY IF EXISTS "Authenticated users can view mentores" ON public.mentores;

CREATE POLICY "Authenticated users full access mentores" ON public.mentores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
