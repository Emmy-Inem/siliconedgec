import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DRIVE_GATEWAY = "https://connector-gateway.lovable.dev/google_drive/drive/v3";
const DRIVE_UPLOAD = "https://connector-gateway.lovable.dev/google_drive/upload/drive/v3/files?uploadType=multipart";
const FOLDER_NAME = "Silicon Edge Backups";

// Tables to back up. Excludes auth.* (managed) and high-volume log tables.
const BACKUP_TABLES = [
  "profiles", "user_roles", "courses", "course_categories", "course_tags",
  "course_modules", "course_lessons", "lesson_resources", "instructors",
  "enrollments", "lesson_progress", "certificates", "reviews", "bookmarks",
  "quizzes", "quiz_questions", "quiz_attempts", "assignments",
  "blog_posts", "pages", "site_content", "site_settings", "home_content",
  "promo_codes", "influencer_referrals", "lead_sources",
  "orders", "cart_items", "registrations", "business_leads",
  "jobs", "job_applications", "live_classes", "live_class_registrations",
  "testimonials", "brands", "notifications", "course_announcements",
  "chat_conversations", "chat_messages", "qna_questions", "qna_answers",
  "learning_paths", "learning_path_courses", "wishlist_insights",
  "email_templates", "blocked_ips",
];

async function driveFetch(path: string, init: RequestInit = {}) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const driveKey = Deno.env.get("GOOGLE_DRIVE_API_KEY");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");
  if (!driveKey) throw new Error("GOOGLE_DRIVE_API_KEY not configured (Google Drive connector not linked)");
  const url = path.startsWith("http") ? path : `${DRIVE_GATEWAY}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": driveKey,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive API ${res.status}: ${body}`);
  }
  return res;
}

async function ensureFolder(): Promise<string> {
  const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const res = await driveFetch(`/files?q=${q}&fields=files(id,name)`);
  const data = await res.json();
  if (data.files && data.files.length > 0) return data.files[0].id;
  const create = await driveFetch(`/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  const folder = await create.json();
  return folder.id;
}

async function uploadJson(folderId: string, filename: string, content: string) {
  const boundary = "lovable_boundary_" + crypto.randomUUID();
  const metadata = { name: filename, parents: [folderId], mimeType: "application/json" };
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) + `\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    content + `\r\n` +
    `--${boundary}--`;
  const res = await driveFetch(DRIVE_UPLOAD + "&fields=id,webViewLink,size", {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  let triggeredBy = "manual";
  // Validate caller: either service-role bearer (cron) or an authenticated admin user.
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  const isServiceRole = token === serviceKey;
  if (!isServiceRole) {
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    triggeredBy = "cron";
  }

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.triggered_by) triggeredBy = String(body.triggered_by);
  } catch (_) { /* ignore */ }

  const { data: backupRow, error: insertErr } = await admin
    .from("site_backups")
    .insert({ status: "running", triggered_by: triggeredBy })
    .select()
    .single();
  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Snapshot every table
    const snapshot: Record<string, unknown[]> = {};
    let totalRows = 0;
    let okTables = 0;
    for (const table of BACKUP_TABLES) {
      const { data, error } = await admin.from(table).select("*").limit(50000);
      if (error) {
        // Skip tables that don't exist or aren't accessible
        snapshot[table] = [{ __backup_error: error.message }];
        continue;
      }
      snapshot[table] = data ?? [];
      totalRows += (data?.length ?? 0);
      okTables++;
    }

    const payload = JSON.stringify({
      project: "silicon-edge-consulting",
      created_at: new Date().toISOString(),
      table_count: okTables,
      row_count: totalRows,
      tables: snapshot,
    });
    const sizeBytes = new TextEncoder().encode(payload).length;

    // Upload to Drive
    const folderId = await ensureFolder();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `siliconedge-backup-${stamp}.json`;
    const file = await uploadJson(folderId, filename, payload);

    await admin.from("site_backups").update({
      status: "completed",
      drive_file_id: file.id,
      drive_file_url: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
      drive_folder_id: folderId,
      size_bytes: sizeBytes,
      table_count: okTables,
      row_count: totalRows,
    }).eq("id", backupRow.id);

    return new Response(JSON.stringify({
      success: true,
      backup_id: backupRow.id,
      drive_file_id: file.id,
      drive_file_url: file.webViewLink,
      table_count: okTables,
      row_count: totalRows,
      size_bytes: sizeBytes,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin.from("site_backups").update({ status: "failed", error: msg }).eq("id", backupRow.id);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});