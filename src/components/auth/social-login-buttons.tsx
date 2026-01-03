"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const providers = [
  { id: "google", label: "Googleで続行" },
  { id: "github", label: "GitHubで続行" },
] as const;

type ProviderId = (typeof providers)[number]["id"];

type Props = {
  redirectPath?: string;
};

export function SocialLoginButtons({ redirectPath = "/" }: Props) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loadingProvider, setLoadingProvider] = useState<ProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOAuth = async (provider: ProviderId) => {
    setError(null);
    setLoadingProvider(provider);
    try {
      const origin = window.location.origin;
      const redirectTo = `${origin}/api/auth/callback?next=${encodeURIComponent(redirectPath)}`;
      const { error: supabaseError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          ...(provider === "google"
            ? { queryParams: { access_type: "offline", prompt: "consent" } }
            : {}),
        },
      });
      if (supabaseError) {
        throw supabaseError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ソーシャルログインに失敗しました");
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <Button
          key={provider.id}
          type="button"
          variant="outline"
          className="w-full justify-center"
          onClick={() => handleOAuth(provider.id)}
          disabled={loadingProvider !== null}
        >
          {loadingProvider === provider.id ? "処理中..." : provider.label}
        </Button>
      ))}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
