-- Add RLS DELETE policy for generations table
-- Users can delete their own generations

CREATE POLICY "Users can delete own generations"
  ON public.generations
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can delete any generation (for moderation)
CREATE POLICY "Admins can delete any generation"
  ON public.generations
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));
