import { authedSupabase } from "./supabase";

export async function saveEvaluation({ clerkToken, userId, filename, score, staticScore, result, staticResult }) {
  const client = authedSupabase(clerkToken);
  const { data, error } = await client
    .from("evaluations")
    .insert({
      user_id:      userId,
      filename:     filename || "pasted",
      score:        score ?? null,
      static_score: staticScore ?? null,
      result:       result ?? null,
      static_result: staticResult ?? null,
    })
    .select("id, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function loadHistory({ clerkToken }) {
  const client = authedSupabase(clerkToken);
  const { data, error } = await client
    .from("evaluations")
    .select("id, filename, score, static_score, result, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}

export async function deleteEvaluation({ clerkToken, id }) {
  const client = authedSupabase(clerkToken);
  const { error } = await client
    .from("evaluations")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function deleteAllEvaluations({ clerkToken, userId }) {
  const client = authedSupabase(clerkToken);
  const { error } = await client
    .from("evaluations")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}
