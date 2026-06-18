"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { WordPage } from "@/components/word/word-page";

function WordRoute() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  return <WordPage id={id} />;
}

export default function WordRoutePage() {
  return (
    <Suspense>
      <WordRoute />
    </Suspense>
  );
}
