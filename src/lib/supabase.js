import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

// Returns a Supabase client that authenticates as the current Clerk user.
// Pass the Clerk session JWT so RLS policies can identify the user via auth.jwt() ->> 'sub'.
export function authedSupabase(clerkToken) {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    { global: { headers: { Authorization: `Bearer ${clerkToken}` } } }
  );
}
