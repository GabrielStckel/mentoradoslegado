import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const userId = url.searchParams.get("state");

    if (!code || !userId) {
      return new Response("Missing code or state", { status: 400 });
    }

    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", tokenData);
      return new Response(`Token exchange failed: ${JSON.stringify(tokenData)}`, { status: 400 });
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Store tokens using service role
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { error: upsertError } = await supabase
      .from("google_calendar_tokens")
      .upsert({
        user_id: userId,
        access_token,
        refresh_token,
        token_expires_at: tokenExpiresAt,
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(`Failed to store tokens: ${upsertError.message}`, { status: 500 });
    }

    // Return success HTML that closes the popup
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Google Calendar conectado com sucesso!</h2>
          <p>Você pode fechar esta janela.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_CALENDAR_CONNECTED' }, '*');
              setTimeout(() => window.close(), 1500);
            }
          </script>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("Callback error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
