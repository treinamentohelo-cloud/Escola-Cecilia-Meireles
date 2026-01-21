import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ixdpehjacyedaovmkgye.supabase.co';
const supabaseKey = 'sb_publishable_JnHqWDmtjUXJTIybCk5BEg_7T-FUA_m';

export const supabase = createClient(supabaseUrl, supabaseKey);