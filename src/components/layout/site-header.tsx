"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";

type NavLink = {
  href: string;
  label: string;
  active?: boolean;
};

const NAV_LINKS: NavLink[] = [
  { href: "/articles", label: "記事生成" },
  { href: "/seo", label: "SEOラボ" },
  { href: "/style-profiles", label: "スタイル学習" },
  { href: "/ctas", label: "CTA管理" },
  { href: "/note-accounts", label: "noteアカウント管理" },
  { href: "/articles/bulk", label: "一括投稿" },
  { href: "/billing", label: "料金" },
  { href: "/logs", label: "APIログ" },
];

export function SiteHeader() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navLinks = useMemo<NavLink[]>(() => {
    if (!pathname) return NAV_LINKS;
    return NAV_LINKS.map((link) => ({
      ...link,
      active: pathname === link.href || pathname.startsWith(`${link.href}/`),
    }));
  }, [pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await refresh();
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold text-zinc-900">
          Note Auto Post AI
        </Link>
        <div className="flex items-center gap-5">
          {user && (
            <nav className="hidden items-center gap-4 text-sm text-zinc-600 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`hover:text-zinc-900 ${link.active ? "text-zinc-900 font-medium" : ""}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
          {loading ? (
            <span className="text-sm text-zinc-500">読込中...</span>
          ) : user ? (
            <>
              <span className="text-sm text-zinc-700">{user.email}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "ログアウト中" : "ログアウト"}
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  ログイン
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">無料で始める</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
