// Google Calendar Sync v2 - with proper unique constraint
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

function getSyncWindow() {
  // Use São Paulo timezone to get correct local date
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;

  // Start from the 1st of the current month (São Paulo time)
  const timeMin = `${year}-${month}-01T00:00:00-03:00`;

  // End 180 days from today
  const future = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
  const fParts = formatter.formatToParts(future);
  const fYear = fParts.find(p => p.type === 'year')!.value;
  const fMonth = fParts.find(p => p.type === 'month')!.value;
  const fDay = fParts.find(p => p.type === 'day')!.value;
  const timeMax = `${fYear}-${fMonth}-${fDay}T23:59:59-03:00`;

  return { timeMin, timeMax };
}

async function getUserMentorIds(supabaseAdmin: any, userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("mentores")
    .select("id")
    .eq("user_id", userId);

  if (error) throw error;
  return (data || []).map((m: any) => m.id).filter(Boolean);
}

async function getOrCreateDefaults(supabaseAdmin: any, userId: string) {
  let { data: defaultMentor } = await supabaseAdmin
    .from("mentores")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!defaultMentor) {
    const { data: created } = await supabaseAdmin
      .from("mentores")
      .insert({ nome: "Importado", email: "importado@sistema.local", user_id: userId })
      .select("id")
      .single();
    defaultMentor = created;
  }

  let { data: defaultMentorado } = await supabaseAdmin
    .from("mentorados")
    .select("id")
    .eq("mentor_id", defaultMentor?.id)
    .limit(1)
    .maybeSingle();

  if (!defaultMentorado) {
    const { data: created } = await supabaseAdmin
      .from("mentorados")
      .insert({ nome: "Mentorado Geral", mentor_id: defaultMentor.id })
      .select("id")
      .single();
    defaultMentorado = created;
  }

  if (!defaultMentor?.id || !defaultMentorado?.id) {
    throw new Error("Could not create defaults for import");
  }

  return { mentorId: defaultMentor.id, mentoradoId: defaultMentorado.id };
}

async function importEventsBatchForUser(
  tokens: any,
  supabaseAdmin: any,
  options?: { cursor?: string | null; batchSize?: number }
) {
  const accessToken = await getValidAccessToken(tokens, supabaseAdmin);
  const calendarId = tokens.calendar_id || "primary";
  const { timeMin, timeMax } = getSyncWindow();
  const batchSize = Math.max(50, Math.min(options?.batchSize ?? 150, 250));

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(batchSize),
  });

  if (options?.cursor) params.set("pageToken", options.cursor);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(`Google API error: ${JSON.stringify(data)}`);

  const validEvents = (data.items || []).filter(
    (evt: any) => evt?.id && (evt?.start?.dateTime || evt?.start?.date)
  );
  const batchEventIds = validEvents.map((evt: any) => evt.id);

  const { mentorId, mentoradoId } = await getOrCreateDefaults(supabaseAdmin, tokens.user_id);

  const mentorIds = await getUserMentorIds(supabaseAdmin, tokens.user_id);
  if (!mentorIds.includes(mentorId)) mentorIds.push(mentorId);

  let existingRows: any[] = [];
  if (batchEventIds.length > 0) {
    const { data: rows } = await supabaseAdmin
      .from("encontros")
      .select("id, google_event_id, titulo, inicio, fim, local, link_reuniao, notas_operacionais")
      .in("google_event_id", batchEventIds)
      .in("mentor_id", mentorIds);

    existingRows = rows || [];
  }

  const existingMap = new Map<string, any>();
  existingRows.forEach((e: any) => {
    if (e?.google_event_id && !existingMap.has(e.google_event_id)) {
      existingMap.set(e.google_event_id, e);
    }
  });

  const newEvents = validEvents
    .filter((evt: any) => !existingMap.has(evt.id))
    .map((evt: any) => ({
      titulo: evt.summary || "Evento importado",
      inicio: evt.start.dateTime || evt.start.date,
      fim: evt.end?.dateTime || evt.end?.date || evt.start.dateTime || evt.start.date,
      google_event_id: evt.id,
      sincronizado_google: true,
      status: "Agendado",
      local: evt.location || "Online",
      link_reuniao: evt.hangoutLink || "",
      notas_operacionais: evt.description || "",
      mentor_id: mentorId,
      mentorado_id: mentoradoId,
    }));

  let batchImported = 0;
  const INSERT_BATCH = 50;
  for (let i = 0; i < newEvents.length; i += INSERT_BATCH) {
    const chunk = newEvents.slice(i, i + INSERT_BATCH);
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("encontros")
      .upsert(chunk, { onConflict: "google_event_id", ignoreDuplicates: false })
      .select("id");
    if (!insertErr) {
      batchImported += (inserted?.length || chunk.length);
    } else {
      console.error("Batch upsert error:", JSON.stringify(insertErr));
      // Fallback: insert one by one
      for (const evt of chunk) {
        const { error: singleErr } = await supabaseAdmin.from("encontros").upsert(evt, { onConflict: "google_event_id", ignoreDuplicates: false });
        if (!singleErr) batchImported++;
        else console.error("Single upsert error:", JSON.stringify(singleErr), "event:", evt.google_event_id);
      }
    }
  }

  let batchUpdated = 0;
  for (const gEvt of validEvents) {
    const existing = existingMap.get(gEvt.id);
    if (!existing) continue;

    const gStart = gEvt.start?.dateTime || gEvt.start?.date || "";
    const gEnd = gEvt.end?.dateTime || gEvt.end?.date || "";
    const gTitle = gEvt.summary || "Evento importado";
    const gLocation = gEvt.location || "Online";

    const needsUpdate =
      gTitle !== existing.titulo ||
      new Date(gStart).getTime() !== new Date(existing.inicio).getTime() ||
      new Date(gEnd).getTime() !== new Date(existing.fim).getTime() ||
      gLocation !== existing.local;

    if (needsUpdate) {
      await supabaseAdmin
        .from("encontros")
        .update({
          titulo: gTitle,
          inicio: gStart,
          fim: gEnd,
          local: gLocation,
          link_reuniao: gEvt.hangoutLink || existing.link_reuniao,
          notas_operacionais: gEvt.description || existing.notas_operacionais,
        })
        .eq("id", existing.id);
      batchUpdated++;
    }
  }

  console.log(
    `Batch import user=${tokens.user_id} processed=${validEvents.length} imported=${batchImported} updated=${batchUpdated} next=${data.nextPageToken ? "yes" : "no"}`
  );

  return {
    batchProcessed: validEvents.length,
    batchImported,
    batchUpdated,
    batchEventIds,
    nextPageToken: data.nextPageToken || null,
    done: !data.nextPageToken,
  };
}

async function finalizeImportForUser(tokens: any, supabaseAdmin: any, seenEventIds: string[]) {
  const mentorIds = await getUserMentorIds(supabaseAdmin, tokens.user_id);
  if (!mentorIds.length) return { deleted: 0 };

  const seenSet = new Set((seenEventIds || []).filter(Boolean));
  const { timeMin, timeMax } = getSyncWindow();

  const idsToDelete: string[] = [];
  let from = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data: page } = await supabaseAdmin
      .from("encontros")
      .select("id, google_event_id, inicio")
      .in("mentor_id", mentorIds)
      .not("google_event_id", "is", null)
      .range(from, from + PAGE_SIZE - 1);

    if (!page || page.length === 0) break;

    for (const encontro of page) {
      const googleId = encontro.google_event_id;
      if (!googleId) continue;

      const encontroStart = new Date(encontro.inicio);
      const withinWindow = encontroStart >= new Date(timeMin) && encontroStart <= new Date(timeMax);
      if (withinWindow && !seenSet.has(googleId)) {
        idsToDelete.push(encontro.id);
      }
    }

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  let deleted = 0;
  const DELETE_BATCH = 100;
  for (let i = 0; i < idsToDelete.length; i += DELETE_BATCH) {
    const chunk = idsToDelete.slice(i, i + DELETE_BATCH);
    const { error } = await supabaseAdmin.from("encontros").delete().in("id", chunk);
    if (!error) deleted += chunk.length;
  }

  return { deleted };
}

async function importEventsForUser(tokens: any, supabaseAdmin: any) {
  const allSeenIds: string[] = [];
  let imported = 0;
  let updated = 0;
  let total = 0;
  let cursor: string | null = null;

  while (true) {
    const batch = await importEventsBatchForUser(tokens, supabaseAdmin, { cursor, batchSize: 200 });
    imported += batch.batchImported;
    updated += batch.batchUpdated;
    total += batch.batchProcessed;
    allSeenIds.push(...batch.batchEventIds);

    if (!batch.nextPageToken) break;
    cursor = batch.nextPageToken;
  }

  const { deleted } = await finalizeImportForUser(tokens, supabaseAdmin, allSeenIds);

  console.log(
    `Imported ${imported} new, updated ${updated}, deleted ${deleted}, total processed ${total} for user ${tokens.user_id}`
  );

  return { imported, updated, deleted, total, userId: tokens.user_id };
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

    // ── CRON: auto-import for ALL connected users ──
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

    if (action === "quick-sync") {
      // Lightweight sync: only fetch events updated since last sync
      const lastSynced = tokens.last_synced_at;
      const syncStartTime = new Date().toISOString();
      const accessToken2 = await getValidAccessToken(tokens, supabaseAdmin);
      const calendarId = tokens.calendar_id || "primary";
      const { timeMin, timeMax } = getSyncWindow();

      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "2500",
      });
      if (lastSynced) {
        params.set("updatedMin", lastSynced);
      }

      // Fetch all changed events (paginated)
      const allChangedEvents: any[] = [];
      let pageToken: string | null = null;
      do {
        if (pageToken) params.set("pageToken", pageToken);
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
          { headers: { Authorization: `Bearer ${accessToken2}` } }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(`Google API error: ${JSON.stringify(data)}`);
        allChangedEvents.push(...(data.items || []));
        pageToken = data.nextPageToken || null;
      } while (pageToken);

      if (allChangedEvents.length === 0) {
        // Nothing changed, just update timestamp
        await supabaseAdmin.from("google_calendar_tokens").update({ last_synced_at: syncStartTime }).eq("user_id", user.id);
        return new Response(JSON.stringify({ success: true, imported: 0, updated: 0, deleted: 0, checked: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { mentorId, mentoradoId } = await getOrCreateDefaults(supabaseAdmin, user.id);
      const mentorIds = await getUserMentorIds(supabaseAdmin, user.id);
      if (!mentorIds.includes(mentorId)) mentorIds.push(mentorId);

      // Separate cancelled/deleted events from active ones
      const cancelledIds = allChangedEvents.filter(e => e.status === "cancelled").map(e => e.id).filter(Boolean);
      const activeEvents = allChangedEvents.filter(e => e.status !== "cancelled" && e.id && (e.start?.dateTime || e.start?.date));

      // Delete cancelled events
      let deleted = 0;
      if (cancelledIds.length > 0) {
        for (let i = 0; i < cancelledIds.length; i += 100) {
          const chunk = cancelledIds.slice(i, i + 100);
          const { data: toDelete } = await supabaseAdmin
            .from("encontros")
            .select("id")
            .in("google_event_id", chunk)
            .in("mentor_id", mentorIds);
          if (toDelete?.length) {
            await supabaseAdmin.from("encontros").delete().in("id", toDelete.map((r: any) => r.id));
            deleted += toDelete.length;
          }
        }
      }

      // Upsert active events
      const eventGoogleIds = activeEvents.map((e: any) => e.id);
      let existingRows: any[] = [];
      if (eventGoogleIds.length > 0) {
        const { data: rows } = await supabaseAdmin
          .from("encontros").select("id, google_event_id, titulo, inicio, fim, local")
          .in("google_event_id", eventGoogleIds).in("mentor_id", mentorIds);
        existingRows = rows || [];
      }
      const existingMap = new Map<string, any>();
      existingRows.forEach((e: any) => { if (e.google_event_id) existingMap.set(e.google_event_id, e); });

      let imported = 0;
      let updated = 0;

      const newEvents = activeEvents.filter((e: any) => !existingMap.has(e.id)).map((evt: any) => ({
          titulo: evt.summary || "Evento importado",
          inicio: evt.start.dateTime || evt.start.date,
          fim: evt.end?.dateTime || evt.end?.date || evt.start.dateTime || evt.start.date,
          google_event_id: evt.id,
          sincronizado_google: true,
          status: "Agendado",
          local: evt.location || "Online",
          link_reuniao: evt.hangoutLink || "",
          notas_operacionais: evt.description || "",
          mentor_id: mentorId,
          mentorado_id: mentoradoId,
        }));

        if (newEvents.length > 0) {
          for (let i = 0; i < newEvents.length; i += 50) {
            const chunk = newEvents.slice(i, i + 50);
            const { data: ins } = await supabaseAdmin.from("encontros").upsert(chunk, { onConflict: "google_event_id", ignoreDuplicates: false }).select("id");
            imported += ins?.length || chunk.length;
          }
        }

      for (const gEvt of activeEvents) {
        const existing = existingMap.get(gEvt.id);
        if (!existing) continue;
        const gTitle = gEvt.summary || "Evento importado";
        const gStart = gEvt.start?.dateTime || gEvt.start?.date || "";
        const gEnd = gEvt.end?.dateTime || gEvt.end?.date || "";
        const gLocation = gEvt.location || "Online";
        if (gTitle !== existing.titulo || new Date(gStart).getTime() !== new Date(existing.inicio).getTime() || new Date(gEnd).getTime() !== new Date(existing.fim).getTime() || gLocation !== existing.local) {
          await supabaseAdmin.from("encontros").update({ titulo: gTitle, inicio: gStart, fim: gEnd, local: gLocation, link_reuniao: gEvt.hangoutLink || "", notas_operacionais: gEvt.description || "" }).eq("id", existing.id);
          updated++;
        }
      }

      await supabaseAdmin.from("google_calendar_tokens").update({ last_synced_at: syncStartTime }).eq("user_id", user.id);

      console.log(`Quick-sync user=${user.id} checked=${allChangedEvents.length} imported=${imported} updated=${updated} deleted=${deleted}`);

      return new Response(JSON.stringify({ success: true, imported, updated, deleted, checked: allChangedEvents.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "import") {
      const result = await importEventsForUser(tokens, supabaseAdmin);
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "import-batch") {
      const result = await importEventsBatchForUser(tokens, supabaseAdmin, {
        cursor: body?.cursor ?? null,
        batchSize: body?.batchSize,
      });

      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "finalize-import") {
      const seenEventIds = Array.isArray(body?.seenEventIds) ? body.seenEventIds : [];
      const result = await finalizeImportForUser(tokens, supabaseAdmin, seenEventIds);

      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getValidAccessToken(tokens, supabaseAdmin);

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

    if (action === "update") {
      if (encontro.google_event_id) {
        // Update existing Google event
        const { data: mentorado } = await supabaseAdmin
          .from("mentorados").select("nome").eq("id", encontro.mentorado_id).single();

        const event = {
          summary: encontro.titulo || `Mentoria - ${mentorado?.nome || ""}`,
          description: `Status: ${encontro.status || "Agendado"}\nTipo: ${encontro.tipo}\nLocal: ${encontro.local}\nLink: ${encontro.link_reuniao || ""}`,
          start: { dateTime: encontro.inicio, timeZone: "America/Sao_Paulo" },
          end: { dateTime: encontro.fim, timeZone: "America/Sao_Paulo" },
        };

        const calendarId = tokens.calendar_id || "primary";
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encontro.google_event_id}`,
          { method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(event) }
        );
        if (!res.ok) { const errData = await res.json(); throw new Error(`Update failed: ${JSON.stringify(errData)}`); }
      } else {
        // No google_event_id — create new event in Google
        const { data: mentorado } = await supabaseAdmin
          .from("mentorados").select("nome").eq("id", encontro.mentorado_id).single();

        const event = {
          summary: encontro.titulo || `Mentoria - ${mentorado?.nome || ""}`,
          description: `Status: ${encontro.status || "Agendado"}\nTipo: ${encontro.tipo}\nLocal: ${encontro.local}\nLink: ${encontro.link_reuniao || ""}`,
          start: { dateTime: encontro.inicio, timeZone: "America/Sao_Paulo" },
          end: { dateTime: encontro.fim, timeZone: "America/Sao_Paulo" },
        };

        const calendarId = tokens.calendar_id || "primary";
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
          { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(event) }
        );
        const eventData = await res.json();
        if (!res.ok) throw new Error(`Create failed: ${JSON.stringify(eventData)}`);

        await supabaseAdmin.from("encontros")
          .update({ google_event_id: eventData.id, sincronizado_google: true })
          .eq("id", encontro.id);
      }

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
