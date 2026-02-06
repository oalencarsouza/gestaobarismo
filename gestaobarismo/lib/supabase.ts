import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wvpybectejgsntendblq.supabase.co';
const supabaseAnonKey = 'sb_publishable_oVSNsiNoErRoKR6kzTRVCA_V3EMzT5q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
