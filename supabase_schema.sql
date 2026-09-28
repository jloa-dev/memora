-- ============================================================================
-- Memora — Esquema de Base de Datos Permanente en Supabase PostgreSQL
-- Proyecto Supabase: rzdzsvbthtvashksixzk (https://rzdzsvbthtvashksixzk.supabase.co)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.memora_notes (
  workspace_id TEXT NOT NULL DEFAULT 'default_workspace',
  id TEXT NOT NULL,
  user_email TEXT,
  title TEXT NOT NULL DEFAULT 'Nota sin título',
  title_html TEXT,
  title_color TEXT DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  type TEXT NOT NULL DEFAULT 'idea',
  color TEXT NOT NULL DEFAULT 'amber',
  cover TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id)
);

CREATE INDEX IF NOT EXISTS idx_memora_notes_workspace_updated
  ON public.memora_notes (workspace_id, updated_at DESC);

ALTER TABLE public.memora_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memora_notes_all_access" ON public.memora_notes;
CREATE POLICY "memora_notes_all_access"
  ON public.memora_notes
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE public.memora_notes TO anon, authenticated, service_role;

-- Habilitar sincronización en tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.memora_notes;
NOTIFY pgrst, 'reload schema';
