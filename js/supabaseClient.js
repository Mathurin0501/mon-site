import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = "https://vsigtlphbamxkdvqgfef.supabase.co";
const SUPABASE_KEY = "sb_publishable_h6pKn2TbozXHcBJJAtH3tg_8h7SFT5t";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
