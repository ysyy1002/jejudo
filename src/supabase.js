import { createClient } from '@supabase/supabase-js';

// Vite가 빌드할 때 .env / Vercel 환경변수의 VITE_* 값을 채워 넣는다.
const env = import.meta.env ?? {};

export const configured = Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY);
export const supabase = configured ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY) : null;
