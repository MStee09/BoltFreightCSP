/*
  # Optimize RLS Policies - Part 3d
  
  Optimizes RLS policies by wrapping auth.uid() calls in SELECT subqueries.
  
  This part covers: ai_chatbot_settings, knowledge_base_documents, field_mappings,
  user_gmail_credentials, email_templates
*/

-- AI_CHATBOT_SETTINGS
DROP POLICY IF EXISTS "Users can read own AI settings" ON public.ai_chatbot_settings;
DROP POLICY IF EXISTS "Users can insert own AI settings" ON public.ai_chatbot_settings;
DROP POLICY IF EXISTS "Users can update own AI settings" ON public.ai_chatbot_settings;
DROP POLICY IF EXISTS "Users can delete own AI settings" ON public.ai_chatbot_settings;

CREATE POLICY "Users can read own AI settings"
  ON public.ai_chatbot_settings FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own AI settings"
  ON public.ai_chatbot_settings FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own AI settings"
  ON public.ai_chatbot_settings FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own AI settings"
  ON public.ai_chatbot_settings FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- KNOWLEDGE_BASE_DOCUMENTS
DROP POLICY IF EXISTS "Authenticated users can create knowledge base documents" ON public.knowledge_base_documents;

CREATE POLICY "Authenticated users can create knowledge base documents"
  ON public.knowledge_base_documents FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = (SELECT auth.uid()));

-- FIELD_MAPPINGS
DROP POLICY IF EXISTS "Users can view own field mappings" ON public.field_mappings;
DROP POLICY IF EXISTS "Users can insert own field mappings" ON public.field_mappings;
DROP POLICY IF EXISTS "Users can update own field mappings" ON public.field_mappings;
DROP POLICY IF EXISTS "Users can delete own field mappings" ON public.field_mappings;

CREATE POLICY "Users can view own field mappings"
  ON public.field_mappings FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own field mappings"
  ON public.field_mappings FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own field mappings"
  ON public.field_mappings FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own field mappings"
  ON public.field_mappings FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- USER_GMAIL_CREDENTIALS
DROP POLICY IF EXISTS "Users can view own Gmail credentials" ON public.user_gmail_credentials;
DROP POLICY IF EXISTS "Users can insert own Gmail credentials" ON public.user_gmail_credentials;
DROP POLICY IF EXISTS "Users can update own Gmail credentials" ON public.user_gmail_credentials;
DROP POLICY IF EXISTS "Users can delete own Gmail credentials" ON public.user_gmail_credentials;

CREATE POLICY "Users can view own Gmail credentials"
  ON public.user_gmail_credentials FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own Gmail credentials"
  ON public.user_gmail_credentials FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own Gmail credentials"
  ON public.user_gmail_credentials FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own Gmail credentials"
  ON public.user_gmail_credentials FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- EMAIL_TEMPLATES
DROP POLICY IF EXISTS "Admin and elite can insert email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admin and elite can update email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admin and elite can delete non-system templates" ON public.email_templates;

CREATE POLICY "Admin and elite can insert email templates"
  ON public.email_templates FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'elite')
    )
  );

CREATE POLICY "Admin and elite can update email templates"
  ON public.email_templates FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'elite')
    )
  );

CREATE POLICY "Admin and elite can delete non-system templates"
  ON public.email_templates FOR DELETE TO authenticated
  USING (
    NOT is_system AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'elite')
    )
  );
