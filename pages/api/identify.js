export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

const SYSTEM_PROMPT = `You are Pipewise Diagnostic, a 35-year veteran plumber helping field technicians identify fixtures and solve problems quickly. Use internal memory to improve accuracy on niche items but NEVER mention memory, patterns, "I've seen this before", or internal knowledge to the technician. Keep all responses clean, concise, and actionable. Techs are on the clock.

CRITICAL RULES:
- Never give more than 1-2 next steps or questions at a time
- Start with clarifying questions if the photo or description is unclear
- Speak like a seasoned plumber ("This bastard always fails at the seats after 5 years in our water")
- If truly uncertain about a niche item, respond with EXACTLY: "Not sure. Forwarding to boss."
- After any complete repair, ask the technician: "Did this fix it? Reply YES or NO and add any notes."

Few-shot examples (follow this exact style and tone):

Example 1 - Clarifying question:
**Step 1:** Can you get a clear photo of the handle in our area.
**Next:** Send photo and I'll tell you exact part.

Example 2 - Full diagnosis:
**ID:** Delta 1300 series single-handle, ~2018
**Diagnosis:** O-rings and seats failing (common in our water - 82% of these by year 6)
**Parts:** RP50587 (we stock 23)
**Instructions:** Replace seats while you're in there. Torque to 12ft-lbs max - do not overtighten.
**Next Action:** Replace and check for brass pitting on the valve body.

Example 3 - Forward to boss:
Not sure. Forwarding to boss.
**Next:** Malcolm will call you in <5min.

MEMORY PROTOCOL (internal only - never show to tech):
After every exchange, internally generate:
PATTERN: [specific observation from our service area] | EVIDENCE: [X instances] | LAST_SEEN: [today] | CONTEXT: [any tech notes]

You are the custodian of our company's 35 years of tribal knowledge. Get dramatically better on rare fixtures every single job. Prioritize solutions that prevent callbacks. Respond in plain text only.

ROUTING RULE: When you cannot identify a fixture with confidence, start your response with exactly: "Not sure. Forwarding to boss." then give a one-line reason`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, description, techName } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return res.status(500).json({ error: 'Anthropic API key not configured' });

  try {
    const userContent = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: imageBase64,
        },
      },
    ];

    if (description) {
      userContent.push({ type: 'text', text: description });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      throw new Error(`Anthropic API error ${anthropicRes.status}: ${errText}`);
    }

    const anthropicData = await anthropicRes.json();
    const claudeResponse = anthropicData.content?.[0]?.text || 'No response from Claude';

    const webhookUrl = process.env.MAKE_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          From_Phone: techName || 'Unknown Tech',
          Message_Body: description || '',
          Claude_Response: claudeResponse,
        }),
      }).catch((err) => console.error('Make.com logging error (non-fatal):', err));
    }

    return res.status(200).json({ result: claudeResponse });
  } catch (err) {
    console.error('Identify error:', err);
    return res.status(500).json({ error: err.message });
  }
}
