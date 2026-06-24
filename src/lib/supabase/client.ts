"use client";

import { createBrowserClient as _createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createBrowserClient() {
  const { url, publishableKey } = getSupabaseEnv();

  return _createBrowserClient(url, publishableKey);
}
