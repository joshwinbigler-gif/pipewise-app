const APPS_SCRIPT_URL = process.env.MAKE_WEBHOOK_URL;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, techName } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // 1. Fetch tribal knowledge
  let tribalKnowledge = '';
  try {
    const tkRes = await fetch(APPS_SCRIPT_URL, { method: 'GET' });
    const tkData = await tkRes.json();
    tribalKnowledge = tkData.knowledge || '';
  } catch (err) {
    console.warn('Tribal knowledge fetch failed:', err.message);
  }

  const tribalSection = tribalKnowledge
    ? '\n\nTRIBAL KNOWLEDGE (patterns learned from past jobs):\n' + tribalKnowledge
    : '';

  // 2. Build system prompt
  const systemPrompt = 'You are a plumbing fixture identification assistant for Brad\'s Plumbing. Your job is to help plumbing technicians identify faucets, fixtures, and parts from photos and descriptions.\n\nWhen you can identify the fixture:\n- State the manufacturer, product line, and model if possible\n- Provide relevant repair/replacement guidance\n- Note any common issues or gotchas for that fixture\n- Include part numbers if you know them\n\nWhen you cannot identify the fixture:\n- Start your response with exactly: \"Not sure. Forwarding to boss.\"\n- Then describe what you can see and what additional info would help\n\nAlways be concise and practical.\n\nAt the END of every response (on its own line), output exactly one of:\nLEARN: [a short pattern or tip that would help identify this type of fixture in the future]\nor\nLEARN: none\n\nThe tech\'s name is ' + (techName || 'the technician') + '.' + tribalSection;

  // 3. Build Anthropic messages array
  const anthropicMessages = messages.map((msg) => {
    if (msg.role === 'user' && msg.imageBase64) {
      return {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: msg.imageMediaType || 'image/jpeg',
              data: msg.imageBase64,
            },
          },
          { type: 'text', text: msg.text || 'What is this fixture?' },
        ],
      };
    }
    return { role: msg.role, content: msg.text || msg.content || '' };
  });

  // 4. Call Claude
  let claudeResponse;
  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'interleaved-thinking-2025-05-14',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 16000,
        thinking: { type: 'enabled', budget_tokens: 10000 },
        system: systemPrompt,
        messages: anthropicMessages,
      }),
    });

    const data = await apiRes.json();
    if (!apiRes.ok) throw new Error(data.error?.message || JSON.stringify(data));

    const textBlock = data.content?.find(b => b.type === 'text');
    claudeResponse = textBlock?.text || '';
  } catch (err) {
    console.error('Anthropic error:', err);
    return res.status(500).json({ error: 'Claude API error: ' + err.message });
  }

  // 5. Extract LEARN: pattern and strip from visible response
  let pattern = 'none';
  const learnMatch = claudeResponse.match(/^LEARN:[\s]*(.*)/m);
  if (learnMatch) {
    pattern = learnMatch[1].trim() || 'none';
    claudeResponse = claudeResponse.replace(/[\n]*LEARN:[^\n]*/m, '').trim();
  }

  // 6. Log to Apps Script
  const firstUserMsg = messages.find(m => m.role === 'user');
  const msgBody = firstUserMsg?.text || '(image only)';

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From_Phone: techName || 'Unknown Tech',
        Message_Body: msgBody,
        Claude_Response: claudeResponse,
        Pattern: pattern,
      }),
    });
  } catch (err) {
    console.warn('Apps Script POST failed:', err.message);
  }

  return res.status(200).json({ reply: claudeResponse });
}
