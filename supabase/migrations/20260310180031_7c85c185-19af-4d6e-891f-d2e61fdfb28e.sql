
-- Drop all restrictive policies on mentorados
DROP POLICY IF EXISTS "Admins can do all on mentorados" ON public.mentorados;
DROP POLICY IF EXISTS "Admins can delete mentorados" ON public.mentorados;
DROP POLICY IF EXISTS "Mentors see own mentorados" ON public.mentorados;
DROP POLICY IF EXISTS "Operacao can delete mentorados" ON public.mentorados;
DROP POLICY IF EXISTS "Operacao can insert mentorados" ON public.mentorados;
DROP POLICY IF EXISTS "Operacao can view mentorados" ON public.mentorados;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Admins can do all on mentorados" ON public.mentorados
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Mentors see own mentorados" ON public.mentorados
  FOR SELECT TO public USING (mentor_id = get_user_mentor_id(auth.uid()));

CREATE POLICY "Operacao can view mentorados" ON public.mentorados
  FOR SELECT TO public USING (has_role(auth.uid(), 'operacao'::app_role));

CREATE POLICY "Operacao can insert mentorados" ON public.mentorados
  FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'operacao'::app_role));

CREATE POLICY "Operacao can delete mentorados" ON public.mentorados
  FOR DELETE TO public USING (has_role(auth.uid(), 'operacao'::app_role));

CREATE POLICY "Operacao can update mentorados" ON public.mentorados
  FOR UPDATE TO public USING (has_role(auth.uid(), 'operacao'::app_role)) WITH CHECK (has_role(auth.uid(), 'operacao'::app_role));
