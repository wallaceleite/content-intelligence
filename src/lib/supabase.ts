import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client-side (browser) - with auth session support
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Server-side (API routes) - full access
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
