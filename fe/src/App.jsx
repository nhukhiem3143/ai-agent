import { useState } from 'react';

export default function App() {
  const [prompt, setPrompt] = useState('Tạo web bán cà phê');
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState('');

  const handleGenerate = async () => {
    setLoading(true); setError(''); setRunId(null); setPreviewUrl(null);
    setStep('AI đang sinh code (1-2 phút)...');

    try {
      // Gọi sinh code
      const res = await fetch('http://localhost:5000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setRunId(data.data.run_id);
      setStep('Đang build và khởi chạy Docker (Đợi 15-30s)...');

      // Tự động gọi API để bật Docker
      const previewRes = await fetch(`http://localhost:5000/api/preview/${data.data.run_id}`, {
        method: 'POST'
      });
      const previewData = await previewRes.json();

      if (previewData.success) {
        setPreviewUrl(previewData.url);
        setStep('');
      } else {
        throw new Error(previewData.error);
      }

    } catch (err) {
      setError(err.message);
      setStep('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 20, height: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Thanh Công Cụ */}
      <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.1)', marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 15px 0' }}>🎨 Ecom Generator Studio</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{ flex: 1, padding: 12, border: '1px solid #ccc', borderRadius: 6, fontSize: 16 }}
          />
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{ padding: '12px 24px', background: loading ? '#ccc' : '#8B5CF6', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
          >
            {loading ? 'Đang tạo...' : 'Generate & Preview'}
          </button>
        </div>
        {step && <p style={{ color: '#8B5CF6', marginTop: 10 }}>{step}</p>}
        {error && <p style={{ color: 'red', marginTop: 10 }}>❌ {error}</p>}
      </div>

      {/* Vùng Preview */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.1)', overflow: 'hidden', position: 'relative' }}>
        {previewUrl ? (
          <iframe
            src={previewUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Website Preview"
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
            Chưa có dự án nào được tạo. Hãy nhập prompt và bấm Generate.
          </div>
        )}
      </div>

    </div>
  );
}