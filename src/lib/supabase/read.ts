import { getSupabaseBrowserClient } from "./client";
import { isSupabaseConfigured } from "./config";
import type { Persona, ReadRecord } from "@/lib/types";

function sb() {
  const client = getSupabaseBrowserClient();
  if (!client || !isSupabaseConfigured()) return null;
  return client;
}

export async function getReadUserId(): Promise<string | null> {
  const client = sb();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data?.user?.id ?? null;
}

export function rowToReadRecord(r: any): ReadRecord {
  return {
    id: r.id,
    word: r.word,
    definition: r.definition ?? "",
    partOfSpeech: r.part_of_speech ?? "",
    myDefinition: r.my_definition ?? "",
    synonyms: r.synonyms ?? [],
    allDefinitions: r.all_definitions ?? [],
    allSynonyms: r.all_synonyms ?? [],
    sourceType: r.source_type,
    bookId: r.book_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function fetchReadRecords(userId: string, persona: Persona): Promise<ReadRecord[] | null> {
  const client = sb();
  if (!client) return null;
  const { data, error } = await client
    .from("read_records")
    .select("*")
    .eq("user_id", userId)
    .eq("persona", persona)
    .order("created_at", { ascending: false });
  if (error) return null;
  return (data ?? []).map(rowToReadRecord);
}

export async function sbCreateReadRecord(userId: string, persona: Persona, record: ReadRecord) {
  const client = sb();
  if (!client) return;
  await client.from("read_records").upsert({
    id: record.id,
    user_id: userId,
    persona,
    word: record.word,
    definition: record.definition,
    part_of_speech: record.partOfSpeech,
    my_definition: record.myDefinition,
    synonyms: record.synonyms,
    all_definitions: record.allDefinitions,
    all_synonyms: record.allSynonyms,
    source_type: record.sourceType,
    book_id: record.bookId ?? null,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  });
}

export async function sbUpdateReadRecord(
  userId: string,
  persona: Persona,
  id: string,
  updates: Partial<ReadRecord>,
) {
  const client = sb();
  if (!client) return;
  const patch: Record<string, unknown> = {
    word: updates.word,
    definition: updates.definition,
    part_of_speech: updates.partOfSpeech,
    my_definition: updates.myDefinition,
    synonyms: updates.synonyms,
    source_type: updates.sourceType,
    updated_at: updates.updatedAt,
  };
  if ("bookId" in updates) patch.book_id = updates.bookId ?? null;
  if ("allDefinitions" in updates) patch.all_definitions = updates.allDefinitions;
  if ("allSynonyms" in updates) patch.all_synonyms = updates.allSynonyms;
  await client.from("read_records").update(patch).eq("user_id", userId).eq("persona", persona).eq("id", id);
}

export async function sbDeleteReadRecord(userId: string, persona: Persona, id: string) {
  const client = sb();
  if (!client) return;
  await client.from("read_records").delete().eq("user_id", userId).eq("persona", persona).eq("id", id);
}
