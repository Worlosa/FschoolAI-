import { createClient } from '@supabase/supabase-js';

// App academic + tutor data lives in the isolated `neuroagi` schema (NOT public.* —
// those are Vincent's incompatible bigint tables). Default all queries to neuroagi.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { db: { schema: 'neuroagi' } }
);
