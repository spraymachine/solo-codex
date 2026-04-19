"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface AnchorRedirectProps {
  href: `/#${string}`;
}

export function AnchorRedirect({ href }: AnchorRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    router.replace(href);
  }, [href, router]);

  return null;
}
