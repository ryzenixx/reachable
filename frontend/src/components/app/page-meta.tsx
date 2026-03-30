"use client";

import { useEffect } from "react";

type PageMetaProps = {
  title: string;
  description: string;
};

function ensureDescriptionMeta(): HTMLMetaElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  const existing = document.querySelector('meta[name="description"]');
  if (existing instanceof HTMLMetaElement) {
    return existing;
  }

  const created = document.createElement("meta");
  created.name = "description";
  document.head.appendChild(created);
  return created;
}

export function PageMeta({ title, description }: PageMetaProps): null {
  useEffect(() => {
    document.title = title;
    const descriptionMeta = ensureDescriptionMeta();
    if (descriptionMeta) {
      descriptionMeta.content = description;
    }
  }, [description, title]);

  return null;
}
