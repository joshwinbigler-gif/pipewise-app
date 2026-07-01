import { useState, useRef } from 'react';
import Head from 'next/head';

const styles = {
  body: {
    margin: 0,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: '#f0f4f8',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '16px',
    boxSizing: 'border-box',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    padding: '28px 24px',
    width: '100%',
    maxWidth: '480px',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '22px',
  },
  logo: {
    width: '36px',
    height: '36px',
    background: '#1a56db',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: '700',
    fontSize: '18px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1a202c',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: '#718096',
    margin: 0,
  },
  dropZone: {
    border: '2px dashed #cbd5e0',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    cursor: 'pointer',
    background: '#f7fafc',
    marginBottom: '16px',
    transition: 'border-color 0.2s, background 0.2s',
  },
  dropZoneActive: {
    borderColor: '#1a56db',
    background: '#ebf4ff',
  },
  dropZoneImg: {
    width: '100%',
    maxHeight: '220px',
    objectFit: 'contain',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  dropZoneText: {
    color: '#718096',
    fontSize: '14px',
    margin: 0,
  },
  cameraBtn: {
    display: 'block',
    width: '100%',
    padding: '11px',
    marginBottom: '12px',
    background: '#1a56db',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '5px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid #cbd5e0',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '12px',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'inherit',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid #cbd5e0',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
    boxSizing: 'border-box',
    resize: 'vertical',
    minHeight: '80px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  submitBtn: {
    display: 'block',
    width: '100%',
    padding: '13px',
    background: '#1a56db',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    letterSpacing: '0.01em',
  },
  submitBtnDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
  },
  result: {
    marginTop: '20px',
    background: '#f0f7ff',
    border: '1.5px solid #bee3f8',
    borderRadius: '10px',
    padding: '16px',
    fontSize: '14px',
    color: '#2d3748',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
  },
  error: {
    marginTop: '20px',
    background: '#fff5f5',
    border: '1.5px solid #fed7d7',
    borderRadius: '10px',
    padding: '16px',
    fontSize: '14px',
    color: '#c53030',
  },
  spinner: {
    display: 'inline-block',
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255,255,255,0.4)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    verticalAlign: 'middle',
    marginRight: '8px',
  },
};

async function compressImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1400;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = dataUrl;
  });
}

export default function Home() {
  const [image, setImage] = useState(null);
  const [description, setDescription] = useState('');
  const [techName, setTechName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();
  const cameraRef = useRef();

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const compressed = await compressImage(e.target.result);
      setImage(compressed);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: image.split(',')[1],
          description,
          techName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unknown error');
      setResult(data.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Pipewise Diagnostic</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#1a56db" />
        <meta name="description" content="AI-powered plumbing parts identification" />
        <link rel="manifest" href="/manifest.json" />
        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; background: #f0f4f8; }
          @keyframes spin { to { transform: rotate(360deg); } }
          button:active { opacity: 0.85; }
        `}</style>
      </Head>
      <div style={styles.body}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.logo}>P</div>
            <div>
              <p style={styles.title}>Pipewise Diagnostic</p>
              <p style={styles.subtitle}>AI faucet & parts identification</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Drop zone / image preview */}
            <div
              style={{ ...styles.dropZone, ...(dragging ? styles.dropZoneActive : {}) }}
              onClick={() => fileRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {image ? (
                <>
                  <img src={image} alt="Preview" style={styles.dropZoneImg} />
                  <p style={{ ...styles.dropZoneText, fontSize: '12px' }}>Tap to change photo</p>
                </>
              ) : (
                <>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="1.5" style={{ marginBottom: '8px' }}>
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <p style={styles.dropZoneText}>Tap to select a photo<br />or drag & drop here</p>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
            </div>

            {/* Camera capture button */}
            <button type="button" style={styles.cameraBtn} onClick={() => cameraRef.current.click()}>
              📷 Take Photo
            </button>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />

            {/* Tech name */}
            <label style={styles.label}>Your Name</label>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. Mike T."
              value={techName}
              onChange={(e) => setTechName(e.target.value)}
            />

            {/* Description */}
            <label style={styles.label}>Description / Issue</label>
            <textarea
              style={styles.textarea}
              placeholder="Describe the faucet, part, or issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <button
              type="submit"
              style={{ ...styles.submitBtn, ...(loading || !image ? styles.submitBtnDisabled : {}) }}
              disabled={loading || !image}
            >
              {loading ? <><span style={styles.spinner} />Identifying...</> : 'Identify Part'}
            </button>
          </form>

          {result && (
            <div style={styles.result}>
              <strong style={{ display: 'block', marginBottom: '8px', color: '#1a56db' }}>AI Identification Result</strong>
              {result}
            </div>
          )}
          {error && (
            <div style={styles.error}>
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
