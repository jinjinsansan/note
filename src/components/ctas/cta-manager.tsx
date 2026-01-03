"use client";

import { useState } from "react";

import { CtaForm } from "@/components/ctas/cta-form";
import { CtaList } from "@/components/ctas/cta-list";
import type { CtaSummary } from "@/types/cta";

type Props = {
  initialCtas: CtaSummary[];
};

export function CtaManager({ initialCtas }: Props) {
  const [ctas, setCtas] = useState(initialCtas);

  const handleCreated = (cta: CtaSummary) => {
    setCtas((prev) => [cta, ...prev]);
  };

  const handleRemoved = (id: string) => {
    setCtas((prev) => prev.filter((cta) => cta.id !== id));
  };

  return (
    <div className="space-y-8">
      <CtaForm onCreated={handleCreated} />
      <CtaList ctas={ctas} onRemoved={handleRemoved} />
    </div>
  );
}
