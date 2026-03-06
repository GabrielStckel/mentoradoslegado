import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getValidAccessToken(
  tokens: { access_token: string; refresh_token: string; token_expires_at: string; user_id: string },
  supabaseAdmin: any
) {
  const expiresAt = new Date(tokens.token_expires_at);
  if (expiresAt > new Date(Date.now() + 60000)) {
    return tokens.access_token;
  }

  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);

  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  await supabaseAdmin
    .from("google_calendar_tokens")
    .update({ access_token: data.access_token, token_expires_at: newExpiresAt })
    .eq("user_id", tokens.user_id);

  return data.access_token;
}

async function importEventsForUser(
  tokens: any,
  supabaseAdmin: any
) {
  const accessToken = await getValidAccessToken(tokens, supabaseAdmin);
  const calendarId = tokens.calendar_id || "primary";
  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 6, 0).toISOString();

  let allEvents: any[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      timeMin, timeMax, singleEvents: "true", orderBy: "startTime", maxResults: "250",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(`Google API error: ${JSON.stringify(data)}`);
    if (data.items) allEvents.push(...data.items);
    pageToken = data.nextPageToken;
  } while (pageToken);

  // Get existing google_event_ids to avoid duplicates
  const { data: existingEncontros } = await supabaseAdmin
    .from("encontros")
    .select("google_event_id")
    .not("google_event_id", "is", null);

  const existingIds = new Set((existingEncontros || []).map((e: any) => e.google_event_id));

  // Get or create default mentor
  let { data: defaultMentor } = await supabaseAdmin
    .from("mentores").select("id").limit(1).single();

  if (!defaultMentor) {
    const { data: created } = await supabaseAdmin
      .from("mentores")
      .insert({ nome: "Importado", email: "importado@sistema.local", user_id: tokens.user_id })
      .select("id").single();
    defaultMentor = created;
  }

  // Get or create placeholder mentorado
  let { data: defaultMentorado } = await supabaseAdmin
    .from("mentorados").select("id").eq("nome", "Importado do Google Calendar").single();

  if (!defaultMentorado) {
    const { data: created } = await supabaseAdmin
      .from("mentorados")
      .insert({ nome: "Importado do Google Calendar", mentor_id: defaultMentor?.id })
      .select("id").single();
    defaultMentorado = created;
  }

  if (!defaultMentor?.id || !defaultMentorado?.id) {
    throw new Error("Could not create default mentor/mentorado for import");
  }

  const newEvents = allEvents
    .filter(evt => evt.id && !existingIds.has(evt.id) && evt.start?.dateTime)
    .map(evt => ({
      titulo: evt.summary || "Evento importado",
      inicio: evt.start.dateTime || evt.start.date,
      fim: evt.end?.dateTime || evt.end?.date || evt.start.dateTime,
      google_event_id: evt.id,
      sincronizado_google: true,
      status: "Agendado",
      local: evt.location || "Online",
      link_reuniao: evt.hangoutLink || "",
      notas_operacionais: evt.description || "",
      mentor_id: defaultMentor!.id,
      mentorado_id: defaultMentorado!.id,
    }));

  let imported = 0;
  const BATCH = 100;
  for (let i = 0; i < newEvents.length; i += BATCH) {
    const batch = newEvents.slice(i, i + BATCH);
    const { error: insertErr } = await supabaseAdmin.from("encontros").insert(batch);
    if (!insertErr) imported += batch.length;
    else console.error("Batch insert error:", insertErr);
  }

  return { imported, total: allEvents.length, userId: tokens.user_id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const { action, encontro } = body;

    // ── CRON: auto-import for ALL connected users (no auth needed) ──
    if (action === "cron-import") {
      const { data: allTokens, error: tokensErr } = await supabaseAdmin
        .from("google_calendar_tokens").select("*");

      if (tokensErr || !allTokens?.length) {
        return new Response(JSON.stringify({ success: true, message: "No connected users", synced: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];
      for (const tokens of allTokens) {
        try {
          const result = await importEventsForUser(tokens, supabaseAdmin);
          results.push(result);
        } catch (err) {
          console.error(`Import failed for user ${tokens.user_id}:`, err);
          results.push({ userId: tokens.user_id, error: String(err) });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── All other actions require user auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData?.user) throw new Error("Not authenticated");
    const user = { id: userData.user.id };

    // Get user's Google tokens
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from("google_calendar_tokens").select("*").eq("user_id", user.id).single();

    if (action === "check") {
      return new Response(JSON.stringify({ connected: !tokensError && !!tokens }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (tokensError || !tokens) {
      return new Response(JSON.stringify({ error: "Google Calendar not connected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getValidAccessToken(tokens, supabaseAdmin);

    if (action === "import") {
      const result = await importEventsForUser(tokens, supabaseAdmin);
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create") {
      const { data: mentorado } = await supabaseAdmin
        .from("mentorados").select("nome").eq("id", encontro.mentorado_id).single();

      const event = {
        summary: encontro.titulo || `Mentoria - ${mentorado?.nome || ""}`,
        description: `Tipo: ${encontro.tipo}\nLocal: ${encontro.local}\nLink: ${encontro.link_reuniao || ""}`,
        start: { dateTime: encontro.inicio, timeZone: "America/Sao_Paulo" },
        end: { dateTime: encontro.fim, timeZone: "America/Sao_Paulo" },
        reminders: { useDefault: false, overrides: [
          { method: "popup", minutes: 1440 },
          { method: "popup", minutes: 180 },
          { method: "popup", minutes: 10 },
        ]},
      };

      const calendarId = tokens.calendar_id || "primary";
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(event) }
      );
      const eventData = await res.json();
      if (!res.ok) throw new Error(`Google Calendar API error: ${JSON.stringify(eventData)}`);

      await supabaseAdmin.from("encontros")
        .update({ google_event_id: eventData.id, sincronizado_google: true })
        .eq("id", encontro.id);

      return new Response(JSON.stringify({ success: true, eventId: eventData.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update" && encontro.google_event_id) {
      const { data: mentorado } = await supabaseAdmin
        .from("mentorados").select("nome").eq("id", encontro.mentorado_id).single();

      const event = {
        summary: encontro.titulo || `Mentoria - ${mentorado?.nome || ""}`,
        description: `Tipo: ${encontro.tipo}\nLocal: ${encontro.local}\nLink: ${encontro.link_reuniao || ""}`,
        start: { dateTime: encontro.inicio, timeZone: "America/Sao_Paulo" },
        end: { dateTime: encontro.fim, timeZone: "America/Sao_Paulo" },
      };

      const calendarId = tokens.calendar_id || "primary";
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encontro.google_event_id}`,
        { method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(event) }
      );
      if (!res.ok) { const errData = await res.json(); throw new Error(`Update failed: ${JSON.stringify(errData)}`); }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete" && encontro.google_event_id) {
      const calendarId = tokens.calendar_id || "primary";
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encontro.google_event_id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Sync error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
