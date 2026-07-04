export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8mb',
    },
  },
};

const APPS_SCRIPT_URL = process.env.MAKE_WEBHOOK_URL;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, techName } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // 1. Fetch tribal knowledge
  let tribalKnowledge = '';
  try {
    const tkRes = await fetch(APPS_SCRIPT_URL, { method: 'GET' });
    const tkData = await tkRes.json();
    tribalKnowledge = tkData.knowledge || '';
  } catch (tkErr) {
    console.warn('Tribal knowledge fetch failed:', tkErr.message);
  }

  // 2. Build system prompt
  const techLabel = techName || 'the technician';
  const tribalSection = tribalKnowledge
    ? '\n\nTRIBAL KNOWLEDGE (patterns learned from past jobs):\n' + tribalKnowledge
    : '';

  const systemPrompt =
    "You are a plumbing fixture identification assistant for Brad's Plumbing.\n" +
    "Help technicians identify faucets, fixtures, and parts from photos and descriptions.\n\n" +
    "When you CAN identify the fixture:\n" +
    "- State the manufacturer, product line, and model if possible\n" +
    "- Provide relevant repair/replacement guidance\n" +
    "- Note common issues or gotchas\n" +
    "- Include part numbers if known\n\n" +
    "When you CANNOT identify the fixture:\n" +
    '- Start with exactly: "Not sure. Forwarding to boss."\n' +
    "- Describe what you can see and what additional info would help\n\n" +
    "Be concise and practical.\n\n" +
    "At the END of every response output one of these on its own line:\n" +
    "LEARN: [a short tip that would help ID this fixture type in the future]\n" +
    "LEARN: none\n\n" +
    "Tech name: " + techLabel + "." + tribalSection;

  // 3. Build Anthropic messages array
  const anthropicMessages = messages.map((msg) => {
    if (msg.role === 'user' && msg.imageBase64) {
      const rawBase64 = msg.imageBase64.replace(/^data:[^;]+;base64,/, '');
      return {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: msg.imageMediaType || 'image/jpeg',
              data: rawBase64,
            },
          },
          { type: 'text', text: msg.text || 'What is this fixture?' },
        ],
      };
    }
    return { role: msg.role, content: msg.text || msg.content || '' };
  });

  // 4. Call Claude
  let claudeResponse = '';
  let rawContentTypes = [];
  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 4096,
        system: systemPrompt,
        messages: anthropicMessages,
      }),
    });

    const apiData = await apiRes.json();

    if (!apiRes.ok) {
      const errMsg = apiData.error?.message || JSON.stringify(apiData);
      console.error('Anthropic API error:', errMsg);
      return res.status(500).json({ error: 'Claude API error: ' + errMsg });
    }

    rawContentTypes = Array.isArray(apiData.content)
      ? apiData.content.map((b) => b.type)
      : [];
    console.log('content_types:', JSON.stringify(rawContentTypes));

    const textBlock = Array.isArray(apiData.content)
      ? apiData.content.find((b) => b.type === 'text')
      : null;

    claudeResponse = textBlock?.text || '';
    console.log('claude_raw_length:', claudeResponse.length);
    console.log('claude_raw_start:', claudeResponse.slice(0, 150));

  } catch (apiErr) {
    console.error('Fetch/parse error:', apiErr.message);
    return res.status(500).json({ error: 'Claude API error: ' + apiErr.message });
  }

  if (!claudeResponse) {
    console.error('Empty response. content_types:', JSON.stringify(rawContentTypes));
    return res.status(500).json({ error: 'Claude returned empty response. Check Vercel logs.' });
  }

  // 5. Extract LEARN: line and strip from visible response
  let pattern = 'none';
  const learnMatch = claudeResponse.match(/\nLEARN:\s*(.+)$|^LEARN:\s*(.+)$/m);
  if (learnMatch) {
    pattern = (learnMatch[1] || learnMatch[2] || 'none').trim();
    claudeResponse = claudeResponse.replace(/\n?LEARN:[^\n]*/m, '').trim();
  }

  console.log('reply_length:', claudeResponse.length);

  // 6. Log to Apps Script (fire-and-forget)
  const firstUserMsg = messages.find((m) => m.role === 'user');
  const msgBody = firstUserMsg?.text || '(image only)';

  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      From_Phone: techName || 'Unknown Tech',
      Message_Body: msgBody,
      Claude_Response: claudeResponse,
      Pattern: pattern,
    }),
  }).catch((logErr) => {
    console.warn('Apps Script POST failed:', logErr.message);
  });

  return res.status(200).json({ reply: claudeResponse });
}
