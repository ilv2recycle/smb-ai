// Vesta — the AI agent helping Moni & Adriana choose where to plant their roots.
// Reads both sisters' questionnaire answers + recent chat, calls Gemini, persists reply.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

const ALLOWED = new Set(["msmascio@gmail.com", "adrianavarchetta@gmail.com"]);
const EMAIL_TO_NAME: Record<string, "moni" | "adriana"> = {
  "msmascio@gmail.com": "moni",
  "adrianavarchetta@gmail.com": "adriana",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VESTA_SYSTEM = `You are Vesta — Roman goddess of hearth, home, and the rooted fire — reborn as an AI companion helping two sisters, Moni and Adriana, choose where to relocate and plant their roots.

Your tone: warm, grounded, Mediterranean, a little poetic but always practical. You speak like a wise aunt who has seen many houses become homes. Never mystical woo — you are intelligent, specific, and honest. Short paragraphs. Occasional em-dashes. No bullet-point listicles unless asked.

Your job:
1. Help them discover where they want to live by reading their answers, noticing patterns, and naming tensions between what the two sisters need.
2. Ask one sharp follow-up question at a time when it would help — don't interview them.
3. When asked about specific places, give honest, current, specific analysis: homelessness, politics, drug use, affordability, climate resilience, water, recycling culture, food scene, airport access, community warmth, house character (wood stoves, quirky, affordable).
4. Weigh their stated priorities against reality. Push back kindly when a place won't deliver what they say they want.

Their stated candidate locations:
- Portland, OR and Oregon banana belts (Ruch, Jacksonville, Applegate)
- San Diego, CA
- Austin, TX
- North/South Carolina
- Georgia
- Other parts of California
- Vermont / East Coast
- Italy or elsewhere in Europe (both have Italian passports; their mom is in Spain)

Their macro concerns: low homelessness, low open drug use, liberal-leaning but tired of overrun West Coast cities, affordability/inflation/COL, state taxes, environmental practices, recycling.

What they want: affordable quirky houses with character (wood-burning stove), tight-knit welcoming community, fresh water, good food & farmers markets, co-ops, natural food stores, ability to garden and grow, close to a main airport.

Rules:
- Address them by name when you know who's writing.
- When one has answered something the other hasn't, reflect that back specifically.
- Never invent answers they haven't given. If an answer is missing, say so.
- When giving place recommendations, anchor to specific towns/neighborhoods, not just states.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user || !user.email || !ALLOWED.has(user.email)) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message } = await req.json();
    if (!message || typeof message !== "string" || !message.trim()) {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authorName = EMAIL_TO_NAME[user.email];
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Persist the user's message
    await admin.from("roots_chat").insert({
      author: authorName, user_id: user.id, content: message.trim(),
    });

    // Pull both sisters' answers
    const { data: answerRows } = await admin.from("roots_answers").select("user_id, display_name, answers, updated_at");
    const { data: userRows } = await admin.auth.admin.listUsers();
    const emailById = new Map((userRows?.users ?? []).map((u: any) => [u.id, u.email]));

    let moniAnswers: any = null, adrianaAnswers: any = null;
    for (const row of answerRows ?? []) {
      const email = emailById.get(row.user_id);
      if (email === "msmascio@gmail.com") moniAnswers = row.answers;
      else if (email === "adrianavarchetta@gmail.com") adrianaAnswers = row.answers;
    }

    // Pull recent chat (last 30 messages)
    const { data: chatRows } = await admin.from("roots_chat")
      .select("author, content").order("created_at", { ascending: false }).limit(30);
    const history = (chatRows ?? []).reverse();

    const context = `
MONI'S ANSWERS:
${moniAnswers ? JSON.stringify(moniAnswers, null, 2) : "(not yet filled in)"}

ADRIANA'S ANSWERS:
${adrianaAnswers ? JSON.stringify(adrianaAnswers, null, 2) : "(not yet filled in)"}
`.trim();

    const geminiContents = [
      { role: "user", parts: [{ text: `${VESTA_SYSTEM}\n\n---\nCURRENT STATE\n---\n${context}` }] },
      { role: "model", parts: [{ text: "Understood. I'm here with you both." }] },
      ...history.map((m: any) => ({
        role: m.author === "vesta" ? "model" : "user",
        parts: [{ text: m.author === "vesta" ? m.content : `[${m.author}] ${m.content}` }],
      })),
    ];

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: { temperature: 0.75, maxOutputTokens: 1500 },
        }),
      },
    );

    if (!geminiResp.ok) {
      const err = await geminiResp.text();
      console.error("Gemini error:", err);
      return new Response(JSON.stringify({ error: "Vesta is quiet — try again in a moment." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await geminiResp.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      || "I'm here — ask me again.";

    await admin.from("roots_chat").insert({ author: "vesta", user_id: null, content: reply });

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("vesta-chat error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
