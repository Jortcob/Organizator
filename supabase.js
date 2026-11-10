import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '') || 'https://gbvgtnjzoyazabexrxuc.supabase.co';
const supabaseAnonKey = rawKey || 'sb_publishable_wiV32ExGgwbzD80mp8lrtw_wy-w1Zbe';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
    },
});
