import type { SupabaseClient } from "@supabase/supabase-js";
import { registerCloudLink } from "./cloudLinkApi.js";

export async function reportCloudLinkToBot(supabase: SupabaseClient): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user.id) {
    await registerCloudLink({ supabaseUserId: null });
    return;
  }
  await registerCloudLink({
    supabaseUserId: data.session.user.id,
    cloudEmail: data.session.user.email ?? null,
  });
}