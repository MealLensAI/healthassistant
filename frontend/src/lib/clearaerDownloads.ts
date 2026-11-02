const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL || "https://pklqumlzpklzroafmtrs.supabase.co"
).replace(/\/$/, "");
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbHF1bWx6cGtsenJvYWZtdHJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMTcxNTIsImV4cCI6MjA2NzY5MzE1Mn0.eyzqg0hBZ5ZoPJKwGXPSKL96TJaPOX_p08dxt4FOn8g";

const supabaseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const asTotal = (value: unknown): number | null => {
  const total = Number(value);
  return Number.isFinite(total) && total >= 0 ? total : null;
};

async function supabaseCount(): Promise<number | null> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/clearaer_download_count?id=eq.1&select=total`,
    { headers: supabaseHeaders },
  );
  if (!response.ok) return null;
  const rows = await response.json();
  const row = Array.isArray(rows) ? rows[0] : rows;
  return asTotal(row?.total);
}

async function supabaseBump(): Promise<number | null> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/bump_clearaer_downloads`, {
    method: "POST",
    headers: supabaseHeaders,
    body: "{}",
  });
  if (!response.ok) return null;
  return asTotal(await response.json());
}

export async function getSharedDownloadCount(): Promise<number | null> {
  try {
    const fromSupabase = await supabaseCount();
    if (fromSupabase != null) return fromSupabase;
  } catch {
    // Fall through to the API.
  }
  try {
    const { api } = await import("@/lib/api");
    const stats = await api.getClearaerDownloadStats();
    if (stats.status === "success") return asTotal(stats.total);
  } catch {
    // No shared count available.
  }
  return null;
}

export async function bumpSharedDownloadCount(): Promise<number | null> {
  try {
    const fromSupabase = await supabaseBump();
    if (fromSupabase != null) return fromSupabase;
  } catch {
    // Fall through to the API.
  }
  try {
    const { api } = await import("@/lib/api");
    const result = await api.recordClearaerDownload();
    if (result.status === "success") return asTotal(result.total);
  } catch {
    // Download should still start even if counting fails.
  }
  return getSharedDownloadCount();
}
