import { useState, useRef } from 'react';

export default function Home() {
  const [techName, setTechName]           = useState('');
  const [conversation, setConversation]   = useState([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  // First-message form state
  const [firstText, setFirstText]         = useState('');
  const [firstImage, setFirstImage]       = useState(null);   // base64 string
  const [firstImageType, setFirstImageType] = useState('image/jpeg');
  const [firstPreview, setFirstPreview]   = useState('');

  // Reply form state
  const [replyText, setReplyText]         = useState('');
  const [replyImage, setReplyImage]       = useState(null);
  const [replyImageType, setReplyImageType] = useState('image/jpeg');
  const [replyPreview, setReplyPreview]   = useState('');

  const bottomRef = useRef(null);
  const hasConversation = conversation.length > 0;

  function handleImageChange(file, setImg, setType, setPreview) {
    if (!file) return;
    setType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = (e) => {
      setImg(e.target.result);
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  async function callAPI(messages) {
    const res = await fetch('/api/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, techName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API error ' + res.status);
    if (!data.reply) throw new Error('Empty reply from server. Check Vercel logs.');
    return data.reply;
  }

  async function handleFirstSubmit(e) {
    e.preventDefault();
    if (!firstText && !firstImage) return;
    setError('');
    setLoading(true);

    const userMsg = {
      role: 'user',
      text: firstText,
      imageBase64: firstImage || undefined,
      imageMediaType: firstImage ? firstImageType : undefined,
    };

    try {
      const reply = await callAPI([userMsg]);
      setConversation([userMsg, { role: 'assistant', text: reply }]);
      setFirstText('');
      setFirstImage(null);
      setFirstPreview('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReply(e) {
    e.preventDefault();
    if (!replyText && !replyImage) return;
    setError('');
    setLoading(true);

    const userMsg = {
      role: 'user',
      text: replyText,
      imageBase64: replyImage || undefined,
      imageMediaType: replyImage ? replyImageType : undefined,
    };
    const updatedConversation = [...conversation, userMsg];

    try {
      const reply = await callAPI(updatedConversation);
      setConversation([...updatedConversation, { role: 'assistant', text: reply }]);
      setReplyText('');
      setReplyImage(null);
      setReplyPreview('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleNewJob() {
    setConversation([]);
    setFirstText('');
    setFirstImage(null);
    setFirstPreview('');
    setReplyText('');
    setReplyImage(null);
    setReplyPreview('');
    setError('');
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '1rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>🔧 Pipewise Diagnostic</h1>

      {/* Tech name */}
      <input
        type="text"
        placeholder="Your name"
        value={techName}
        onChange={e => setTechName(e.target.value)}
        style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', fontSize: '1rem', boxSizing: 'border-box' }}
      />

      {/* Conversation */}
      {hasConversation && (
        <div style={{ marginBottom: '1rem' }}>
          {conversation.map((msg, i) => (
            <div key={i} style={{
              marginBottom: '0.75rem',
              textAlign: msg.role === 'user' ? 'right' : 'left',
            }}>
              {msg.imageBase64 && (
                <img src={msg.imageBase64} alt="uploaded" style={{ maxWidth: 200, display: 'block', marginLeft: msg.role === 'user' ? 'auto' : 0, borderRadius: 8, marginBottom: 4 }} />
              )}
              <div style={{
                display: 'inline-block',
                background: msg.role === 'user' ? '#0071e3' : '#f0f0f0',
                color: msg.role === 'user' ? '#fff' : '#000',
                padding: '0.6rem 0.9rem',
                borderRadius: 12,
                maxWidth: '85%',
                whiteSpace: 'pre-wrap',
                textAlign: 'left',
                fontSize: '0.95rem',
              }}>
                {msg.text || '(photo)'}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {error && (
        <div style={{ color: 'red', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div style={{ color: '#666', marginBottom: '0.75rem' }}>Thinking…</div>
      )}

      {/* First-message form */}
      {!hasConversation && (
        <form onSubmit={handleFirstSubmit}>
          <textarea
            placeholder="Describe the fixture or issue…"
            value={firstText}
            onChange={e => setFirstText(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', boxSizing: 'border-box', marginBottom: '0.5rem' }}
          />
          {firstPreview && <img src={firstPreview} alt="preview" style={{ maxWidth: 200, marginBottom: '0.5rem', borderRadius: 8 }} />}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <label style={{ cursor: 'pointer', background: '#eee', padding: '0.4rem 0.8rem', borderRadius: 8 }}>
              📷 Photo
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => handleImageChange(e.target.files[0], setFirstImage, setFirstImageType, setFirstPreview)} />
            </label>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '0.5rem', fontSize: '1rem', background: '#0071e3', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              Send
            </button>
          </div>
        </form>
      )}

      {/* Reply form */}
      {hasConversation && !loading && (
        <form onSubmit={handleReply}>
          {replyPreview && <img src={replyPreview} alt="preview" style={{ maxWidth: 200, marginBottom: '0.5rem', borderRadius: 8 }} />}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <label style={{ cursor: 'pointer', background: '#eee', padding: '0.5rem 0.8rem', borderRadius: 8, fontSize: '1.2rem' }}>
              📷
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => handleImageChange(e.target.files[0], setReplyImage, setReplyImageType, setReplyPreview)} />
            </label>
            <textarea
              placeholder="Follow-up…"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              rows={2}
              style={{ flex: 1, padding: '0.5rem', fontSize: '1rem', resize: 'vertical' }}
            />
            <button type="submit" style={{ padding: '0.5rem 0.9rem', background: '#0071e3', color: '#fff', border: 'none', borderRadius: 8, fontSize: '1.2rem', cursor: 'pointer' }}>
              ➤
            </button>
          </div>
        </form>
      )}

      {/* New Job */}
      {hasConversation && (
        <button onClick={handleNewJob} style={{ marginTop: '1rem', width: '100%', padding: '0.5rem', background: '#555', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          + New Job
        </button>
      )}
    </div>
  );
}
