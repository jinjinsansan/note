import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footerText: string;
  footerHref: string;
  footerLinkLabel: string;
};

export function AuthShell({
  title,
  description,
  children,
  footerHref,
  footerLinkLabel,
  footerText,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-100 px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image src="/next.svg" alt="Logo" width={100} height={20} />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              {title}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">{description}</p>
          </div>
        </div>
        <Card>{children}</Card>
        <p className="mt-6 text-center text-sm text-zinc-500">
          {footerText}{" "}
          <Link
            href={footerHref}
            className="font-medium text-zinc-900 underline-offset-4 hover:underline"
          >
            {footerLinkLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
