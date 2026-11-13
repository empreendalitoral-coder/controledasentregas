import { supabase } from "@/integrations/supabase/client";

/** Fetch with the caller's session and RLS; never issue transferable bearer links. */
export async function downloadPrivatePhoto(bucket: "feed-photos" | "community-photos", path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw new Error("Não foi possível carregar esta foto.");
  if (!data) throw new Error("Foto indisponível.");
  return data;
}