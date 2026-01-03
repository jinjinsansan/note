"use client";

import { useState } from "react";

import { StyleProfileForm } from "@/components/style-profiles/style-profile-form";
import { StyleProfileList } from "@/components/style-profiles/style-profile-list";
import { StyleLearningLab } from "@/components/style-profiles/style-learning-lab";
import type { StyleProfileSummary } from "@/types/style-profile";

type Props = {
  initialProfiles: StyleProfileSummary[];
};

export function StyleProfileManager({ initialProfiles }: Props) {
  const [profiles, setProfiles] = useState(initialProfiles);

  const handleCreated = (profile: StyleProfileSummary) => {
    setProfiles((prev) => [profile, ...prev]);
  };

  return (
    <div className="space-y-8">
      <StyleLearningLab onProfileCreated={handleCreated} />
      <StyleProfileForm onCreated={handleCreated} />
      <StyleProfileList profiles={profiles} />
    </div>
  );
}
