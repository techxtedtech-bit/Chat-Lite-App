// --- SHARED SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://gtxcqxjuxymiibkggiky.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_swbZv75BIDV5J8tp6KrO2A_rbhE3_sj';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
