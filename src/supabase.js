import { createClient } from '@supabase/supabase-js';

// App academic + tutor data lives in the isolated `neuroagi` schema (NOT public.* —
// those are Vincent's incompatible bigint tables w/ a source check). Default all
// queries to neuroagi. The leaderboard + token_events tables live ONLY in public,
// so those call sites opt out explicitly via .schema('public').
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { db: { schema: 'neuroagi' } }
);
