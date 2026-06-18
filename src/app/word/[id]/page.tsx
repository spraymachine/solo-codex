import { WordPage } from "@/components/word/word-page";

export default async function WordRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WordPage id={id} />;
}
