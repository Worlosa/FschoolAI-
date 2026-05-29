import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://pedhxfdhacmhrghbvsxi.supabase.co';
const SUPABASE_ANON = 'sb_publishable_i1IiynLjPRSNQYwYwLP3Ow_qG6KsLhV';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
