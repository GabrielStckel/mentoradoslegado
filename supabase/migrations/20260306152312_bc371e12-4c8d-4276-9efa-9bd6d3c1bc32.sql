CREATE POLICY "Admins can delete mentorados" ON public.mentorados FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Operacao can delete mentorados" ON public.mentorados FOR DELETE USING (has_role(auth.uid(), 'operacao'::app_role));