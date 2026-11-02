const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL || "https://pklqumlzpklzroafmtrs.supabase.co"
).replace(/\/$/, "");
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbHF1bWx6cGtsenJvYWZtdHJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMTcxNTIsImV4cCI6MjA2NzY5MzE1Mn0.eyzqg0hBZ5ZoPJKwGXPSKL96TJaPOX_p08dxt4FOn8g";

const TABLE = "clearaer_downloads";
const REST = `${SUPABASE_URL}/rest/v1/${TABLE}`;

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

const totalFromContentRange = (response: Response): number | null => {
  const range = response.headers.get("content-range");
  if (!range) return null;
  const total = range.split("/")[1];
  if (!total || total === "*") return null;
  return asTotal(total);
};

async function fetchSharedCount(): Promise<number | null> {
  const counted = await fetch(`${REST}?select=id`, {
    headers: {
      ...supabaseHeaders,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  if (counted.ok) {
    const fromHeader = totalFromContentRange(counted);
    if (fromHeader != null) return fromHeader;
  }

  const listed = await fetch(`${REST}?select=id`, { headers: supabaseHeaders });
  if (!listed.ok) return null;
  const rows = await listed.json();
  return Array.isArray(rows) ? rows.length : null;
}

export async function getSharedDownloadCount(): Promise<number | null> {
  try {
    return await fetchSharedCount();
  } catch {
    return null;
  }
}

export async function bumpSharedDownloadCount(): Promise<number | null> {
  try {
    const recorded = await fetch(REST, {
      method: "POST",
      headers: {
        ...supabaseHeaders,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ created_at: new Date().toISOString() }),
    });
    if (!recorded.ok) return null;
    return await fetchSharedCount();
  } catch {
    return null;
  }
}
