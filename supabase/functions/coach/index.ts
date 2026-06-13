// Optional LLM coach. Runs as a Supabase Edge Function so the API key NEVER
// lives on the device. Deploy with: `supabase functions deploy coach`.
// Set the key with: `supabase secrets set OPENAI_API_KEY=sk-...`.
//
// The coach only COMMENTS on the pot. It never decides who wins or loses —
// that is owned entirely by transaction data (recordTransaction / resolveWindowEnd).
//
// Returns JSON: { headline, stake_risk, insights[], suggested_action, goal_projection }

// deno-lint-ignore-file no-explicit-any
declare const Deno: any;

interface CoachRequest {
  goal_label: string;
  category: string;
  threshold_pence: number;
  members: { name: string; spent_pence: number; stake_pence: number; status: string }[];
  days_left: number;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = (await req.json()) as CoachRequest;
  const apiKey = Deno.env.get('OPENAI_API_KEY');

  // Graceful fallback when no key is configured: deterministic rule-based JSON.
  if (!apiKey) {
    return Response.json(ruleBased(body));
  }

  const prompt = `You are a budgeting coach for a social betting app. You ONLY comment;
you never decide who wins or loses. Given this pot state, return strict JSON with keys
headline, stake_risk, insights (array of strings), suggested_action, goal_projection.
Pot: ${JSON.stringify(body)}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    return Response.json(content ? JSON.parse(content) : ruleBased(body));
  } catch {
    return Response.json(ruleBased(body));
  }
});

function ruleBased(b: CoachRequest) {
  const atRisk = b.members.filter(
    (m) => m.status === 'active' && m.spent_pence / b.threshold_pence >= 0.8
  );
  const headline = atRisk.length
    ? `${atRisk[0].name}'s stake is on the line`
    : 'Everyone is holding the line';
  return {
    headline,
    stake_risk: atRisk.map((m) => m.name),
    insights: b.members.map(
      (m) =>
        `${m.name}: ${Math.round((m.spent_pence / b.threshold_pence) * 100)}% of the ${b.category} budget used.`
    ),
    suggested_action: atRisk.length ? 'Ease off the category for a few days.' : 'Keep checking in.',
    goal_projection: `${b.days_left} days left in the window.`,
  };
}
