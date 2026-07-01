export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, description, techName } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) return res.status(500).json({ error: 'Webhook URL not configured' });

  try {
    const makeRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, description, techName }),
    });

    if (!makeRes.ok) {
      const text = await makeRes.text();
      throw new Error(`Make.com returned ${makeRes.status}: ${text}`);
    }

    const data = await makeRes.json();
    return res.status(200).json({ result: data.result || data.response || JSON.stringify(data) });
  } catch (err) {
    console.error('Make.com proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
