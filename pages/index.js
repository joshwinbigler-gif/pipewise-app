import { useState, useRef } from 'react';
import Head from 'next/head';

export default function Home() {
  const [imageBase64, setImageBase64] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [description, setDescription] = useState('');
  const [techName, setTechName] = useState('');

  const [conversation, setConversation] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [replyImageBase64, setReplyImageBase64] = useState(null);
  const [replyImagePreview, setReplyImagePreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const replyFileInputRef = useRef(null);

  const compressImage = (file) =>
    new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = () => {
          const MAX = 1400;
          let { width, height } = img;
          if (width > height && width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
          else if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX; }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });

  const handleFile = async (file, isReply = false) => {
    if (!file || !file.type.startsWith('image/')) return;
    const compressed = await compressImage(file);
    if (isReply) {
      setReplyImageBase64(compressed);
      setReplyImagePreview(compressed);
    } else {
      setImageBase64(compressed);
      setImagePreview(compressed);
      setConversation([]);
      setError(null);
    }
  };

  const handleImageChange = (e) => handleFile(e.target.files[0]);
  const handleReplyImageChange = (e) => handleFile(e.target.files[0], true);

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const callAPI = async (msgs) => {
    const res = await fetch('/api/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: msgs.map(m => ({ role: m.role, text: m.text || '', imageBase64: m.imageBase64 || null })),
        techName,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data.result;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageBase64) { setError('Please attach a photo first.'); return; }
    const userMsg = { role: 'user', text: description, imageBase64, imagePreview };
    const msgs = [userMsg];
    setLoading(true);
    setError(null);
    try {
      const result = await callAPI(msgs);
      setConversation([userMsg, { role: 'assistant', text: result }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() && !replyImageBase64) return;
    const userMsg = { role: 'user', text: replyText, imageBase64: replyImageBase64, imagePreview: replyImagePreview };
    const msgs = [...conversation, userMsg];
    setConversation(msgs);
    setReplyText('');
    setReplyImageBase64(null);
    setReplyImagePreview(null);
    if (replyFileInputRef.current) replyFileInputRef.current.value = '';
    setLoading(true);
    setError(null);
    try {
      const result = await callAPI(msgs);
      setConversation([...msgs, { role: 'assistant', text: result }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImageBase64(null);
    setImagePreview(null);
    setDescription('');
    setConversation([]);
    setReplyText('');
    setReplyImageBase64(null);
    setReplyImagePreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (replyFileInputRef.current) replyFileInputRef.current.value = '';
  };

  const hasConversation = conversation.length > 0;

  return (
    <>
      <Head>
        <title>Pipewise Diagnostic</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1a56db" />
        <link rel="manifest" href="/manifest.json" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f4f8; color: #1a202c; min-height: 100vh; }
        .shell { max-width: 540px; margin: 0 auto; padding: 0 0 40px; }
        header { background: #1a56db; color: #fff; padding: 18px 20px 14px; display: flex; justify-content: space-between; align-items: center; }
        header h1 { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.01em; }
        header p { font-size: 0.8rem; opacity: 0.8; margin-top: 2px; }
        .card { background: #fff; border-radius: 12px; margin: 16px 12px 0; padding: 18px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
        label { display: block; font-size: 0.78rem; font-weight: 600; color: #4a5568; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .04em; }
        .drop-zone { border: 2px dashed #cbd5e0; border-radius: 10px; padding: 24px 16px; text-align: center; cursor: pointer; transition: border-color .2s, background .2s; background: #f7fafc; }
        .drop-zone:hover, .drop-zone.over { border-color: #1a56db; background: #ebf4ff; }
        .drop-zone img { max-height: 220px; border-radius: 8px; object-fit: cover; width: 100%; }
        .drop-zone p { color: #718096; font-size: 0.88rem; margin-top: 8px; }
        .drop-zone .cam-icon { font-size: 2.5rem; }
        input[type=text], textarea { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; font-family: inherit; transition: border-color .2s; }
        input[type=text]:focus, textarea:focus { outline: none; border-color: #1a56db; }
        textarea { resize: vertical; min-height: 90px; }
        .submit-btn { display: block; width: 100%; padding: 14px; background: #1a56db; color: #fff; border: none; border-radius: 10px; font-size: 1rem; font-weight: 700; cursor: pointer; margin-top: 4px; transition: background .2s; }
        .submit-btn:hover { background: #1e429f; }
        .submit-btn:disabled { background: #a0aec0; cursor: not-allowed; }
        .spinner { width: 20px; height: 20px; border: 2px solid rgba(0,0,0,.1); border-top-color: #1a56db; border-radius: 50%; animation: spin .7s linear infinite; }
        .spinner.lg { width: 36px; height: 36px; border-width: 3px; margin: 0 auto 12px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error { background: #fff5f5; border: 1.5px solid #fc8181; border-radius: 8px; padding: 12px 14px; color: #c53030; font-size: 0.88rem; margin-top: 4px; }
        .gap { margin-top: 14px; }
        input[type=file] { display: none; }
        .new-btn { background: none; border: 1.5px solid rgba(255,255,255,0.7); color: #fff; border-radius: 8px; padding: 6px 14px; font-size: 0.82rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .new-btn:hover { background: rgba(255,255,255,0.15); }

        /* Chat thread */
        .thread { margin: 16px 12px 0; display: flex; flex-direction: column; gap: 12px; }
        .bubble-wrap { display: flex; flex-direction: column; }
        .bubble-wrap.user { align-items: flex-end; }
        .bubble-wrap.assistant { align-items: flex-start; }
        .bubble-label { font-size: 0.72rem; font-weight: 600; color: #718096; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .04em; padding: 0 4px; }
        .bubble { max-width: 88%; border-radius: 16px; padding: 12px 14px; font-size: 0.93rem; line-height: 1.65; }
        .bubble.user { background: #1a56db; color: #fff; border-bottom-right-radius: 4px; }
        .bubble.assistant { background: #fff; color: #2d3748; border-bottom-left-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,.08); white-space: pre-wrap; }
        .bubble img { width: 100%; max-height: 180px; object-fit: cover; border-radius: 8px; margin-bottom: 8px; display: block; }
        .bubble-thinking { display: flex; gap: 4px; align-items: center; padding: 4px 0; }
        .bubble-thinking span { width: 8px; height: 8px; background: #a0aec0; border-radius: 50%; animation: blink 1.2s infinite; }
        .bubble-thinking span:nth-child(2) { animation-delay: .2s; }
        .bubble-thinking span:nth-child(3) { animation-delay: .4s; }
        @keyframes blink { 0%,80%,100% { opacity: 0.3; } 40% { opacity: 1; } }

        /* Reply box */
        .reply-card { background: #fff; border-radius: 12px; margin: 10px 12px 0; padding: 12px 14px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
        .reply-preview { margin-bottom: 10px; position: relative; display: inline-block; }
        .reply-preview img { height: 72px; border-radius: 8px; display: block; }
        .reply-preview-remove { position: absolute; top: -6px; right: -6px; background: #e53e3e; color: #fff; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; }
        .reply-row { display: flex; gap: 8px; align-items: flex-end; }
        .reply-input { flex: 1; border: 1.5px solid #e2e8f0; border-radius: 20px; padding: 10px 14px; font-size: 0.93rem; font-family: inherit; resize: none; min-height: 42px; max-height: 120px; overflow-y: auto; transition: border-color .2s; }
        .reply-input:focus { outline: none; border-color: #1a56db; }
        .reply-photo-btn { background: #f0f4f8; border: 1.5px solid #e2e8f0; border-radius: 50%; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.1rem; flex-shrink: 0; transition: background .2s, border-color .2s; }
        .reply-photo-btn:hover { background: #ebf4ff; border-color: #1a56db; }
        .reply-send-btn { background: #1a56db; color: #fff; border: none; border-radius: 50%; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.1rem; flex-shrink: 0; transition: background .2s; }
        .reply-send-btn:hover { background: #1e429f; }
        .reply-send-btn:disabled { background: #a0aec0; cursor: not-allowed; }
      `}</style>

      <div className="shell">
        <header>
          <div>
            <h1>🔧 Pipewise Diagnostic</h1>
            <p>Faucet &amp; part identification</p>
          </div>
          {hasConversation && (
            <button className="new-btn" onClick={reset}>New Job</button>
          )}
        </header>

        {/* Initial form */}
        {!hasConversation && (
          <form onSubmit={handleSubmit}>
            <div className="card">
              <label>Photo</label>
              <div
                className="drop-zone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('over'); }}
                onDragLeave={(e) => e.currentTarget.classList.remove('over')}
                onDrop={(e) => { e.currentTarget.classList.remove('over'); handleDrop(e); }}
              >
                {imagePreview
                  ? <img src={imagePreview} alt="preview" />
                  : <>
                      <div className="cam-icon">📷</div>
                      <p>Tap to take photo or choose from library</p>
                    </>
                }
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} />
            </div>

            <div className="card">
              <label>What&apos;s the issue?</label>
              <textarea
                placeholder="e.g. Customer says cold water side is dripping, looks like a two-handle kitchen faucet, Moen style…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="gap">
                <label>Tech name (optional)</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                />
              </div>
              {error && <div className="error">{error}</div>}
              <div className="gap">
                <button type="submit" className="submit-btn" disabled={loading || !imageBase64}>
                  {loading ? 'Analyzing…' : 'Identify Part'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Conversation thread */}
        {hasConversation && (
          <div className="thread">
            {conversation.map((msg, i) => (
              <div key={i} className={`bubble-wrap ${msg.role}`}>
                <div className="bubble-label">{msg.role === 'user' ? (techName || 'You') : 'Pipewise'}</div>
                <div className={`bubble ${msg.role}`}>
                  {msg.imagePreview && <img src={msg.imagePreview} alt="attached photo" />}
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="bubble-wrap assistant">
                <div className="bubble-label">Pipewise</div>
                <div className="bubble assistant">
                  <div className="bubble-thinking">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reply box */}
        {hasConversation && !loading && (
          <div className="reply-card">
            {replyImagePreview && (
              <div className="reply-preview">
                <img src={replyImagePreview} alt="reply attachment" />
                <button
                  className="reply-preview-remove"
                  onClick={() => { setReplyImageBase64(null); setReplyImagePreview(null); }}
                  title="Remove photo"
                >✕</button>
              </div>
            )}
            {error && <div className="error" style={{ marginBottom: 10 }}>{error}</div>}
            <form onSubmit={handleReply}>
              <div className="reply-row">
                <button
                  type="button"
                  className="reply-photo-btn"
                  onClick={() => replyFileInputRef.current?.click()}
                  title="Attach photo"
                >📷</button>
                <textarea
                  className="reply-input"
                  placeholder="Reply or send another photo…"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(e); }
                  }}
                  rows={1}
                />
                <button
                  type="submit"
                  className="reply-send-btn"
                  disabled={!replyText.trim() && !replyImageBase64}
                  title="Send"
                >➤</button>
              </div>
            </form>
            <input ref={replyFileInputRef} type="file" accept="image/*" onChange={handleReplyImageChange} />
          </div>
        )}
      </div>
    </>
  );
}
