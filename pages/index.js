import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [techName, setTechName] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [firstText, setFirstText] = useState('');
  const [firstImage, setFirstImage] = useState(null);
  const [firstImageType, setFirstImageType] = useState('image/jpeg');
  const [firstPreview, setFirstPreview] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState(null);
  const [replyImageType, setReplyImageType] = useState('image/jpeg');
  const [replyPreview, setReplyPreview] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  function handleImageChange(file, setImg, setType, setPreview) {
    if (!file) return;
    setType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = (e) => { setImg(e.target.result); setPreview(e.target.result); };
    reader.readAsDataURL(file);
  }

  async function callAPI(messages) {
    const res = await fetch('/api/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, techName }),
    });
    const data = await res.json();
    console.log('[Pipewise] status:', res.status, 'data:', JSON.stringify(data).slice(0, 300));
    if (!res.ok) throw new Error(data.error || 'API error ' + res.status);
    if (!data.reply) throw new Error('Empty reply. Server returned: ' + JSON.stringify(data));
    return data.reply;
  }

  async function handleFirstSubmit() {
    if (loading || (!firstText && !firstImage)) return;
    setLoading(true);
    setError('');
    const userMsg = {
      role: 'user',
      text: firstText || 'What is this fixture?',
      ...(firstImage && { imageBase64: firstImage, imageMediaType: firstImageType }),
    };
    try {
      const reply = await callAPI([userMsg]);
      setConversation([userMsg, { role: 'assistant', text: reply }]);
      setFirstText('');
      setFirstImage(null);
      setFirstPreview('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReply() {
    if (loading || (!replyText && !replyImage)) return;
    setLoading(true);
    setError('');
    const userMsg = {
      role: 'user',
      text: replyText || 'Can you clarify?',
      ...(replyImage && { imageBase64: replyImage, imageMediaType: replyImageType }),
    };
    const updated = [...conversation, userMsg];
    try {
      const reply = await callAPI(updated);
      setConversation([...updated, { role: 'assistant', text: reply }]);
      setReplyText('');
      setReplyImage(null);
      setReplyPreview('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return <div style={{ minHeight: '100vh' }} />;

  const hasConversation = conversation.length > 0;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
        Brad&apos;s Plumbing — Fixture ID
      </h1>

      {!hasConversation && (
        <div>
          <input
            placeholder="Your name"
            value={techName}
            onChange={(e) => setTechName(e.target.value)}
            style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box', marginBottom: 8 }}
          />
          <textarea
            placeholder="Describe the fixture or ask a question..."
            value={firstText}
            onChange={(e) => setFirstText(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box', marginBottom: 8 }}
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleImageChange(e.target.files[0], setFirstImage, setFirstImageType, setFirstPreview)}
            style={{ marginBottom: 8, display: 'block' }}
          />
          {firstPreview && (
            <img src={firstPreview} alt="preview" style={{ maxWidth: '100%', maxHeight: 200, marginBottom: 8 }} />
          )}
          <button
            type="button"
            onClick={handleFirstSubmit}
            disabled={loading || (!firstText && !firstImage)}
            style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            {loading ? 'Thinking...' : 'Send'}
          </button>
        </div>
      )}

      {hasConversation && (
        <div>
          <div style={{ marginBottom: 16 }}>
            {conversation.map((msg, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 8,
                  background: msg.role === 'user' ? '#eff6ff' : '#f0fdf4',
                  borderLeft: msg.role === 'user' ? '4px solid #2563eb' : '4px solid #16a34a',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 13 }}>
                  {msg.role === 'user' ? (techName || 'Tech') : 'Claude'}
                </div>
                {msg.imageBase64 && (
                  <img src={msg.imageBase64} alt="sent" style={{ maxWidth: '100%', maxHeight: 200, marginBottom: 4, borderRadius: 4 }} />
                )}
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{msg.text}</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <textarea
            placeholder="Follow-up question..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box', marginBottom: 8 }}
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleImageChange(e.target.files[0], setReplyImage, setReplyImageType, setReplyPreview)}
            style={{ marginBottom: 8, display: 'block' }}
          />
          {replyPreview && (
            <img src={replyPreview} alt="preview" style={{ maxWidth: '100%', maxHeight: 200, marginBottom: 8 }} />
          )}
          <button
            type="button"
            onClick={handleReply}
            disabled={loading || (!replyText && !replyImage)}
            style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            {loading ? 'Thinking...' : 'Send Reply'}
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 12, padding: 12, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 4, color: '#dc2626', whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      )}
    </div>
  );
}
