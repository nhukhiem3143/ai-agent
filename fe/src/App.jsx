import { useState, useEffect, useRef } from 'react';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState(() => localStorage.getItem('chat_conv_id') || null);

  const [isReady, setIsReady] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [buildTime, setBuildTime] = useState(0);

  const host = window.location.hostname;
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isReady, isGenerating]);

  const authFetch = (url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: { ...options.headers, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
  };

  // TỰ ĐỘNG LOAD LẠI LỊCH SỬ CHAT KHI F5 VÀ KHÔI PHỤC KHUNG XÁC NHẬN NẾU CÓ
  useEffect(() => {
    if (token) {
      const savedConvId = localStorage.getItem('chat_conv_id');
      if (savedConvId) {
        setConvId(savedConvId);
        authFetch(`http://${host}:5000/api/generate/history/${savedConvId}`)
          .then(res => res.json())
          .then(data => {
            if (data.messages && data.messages.length > 0) {
              setMessages(data.messages);

              // KIỂM TRA XEM TIN NHẮN CUỐI CÙNG CÓ PHẢI LÀ [READY] KHÔNG
              const lastMsg = data.messages[data.messages.length - 1];
              if (lastMsg.role === 'assistant' && lastMsg.content.includes('[READY]')) {
                const summary = lastMsg.content.split('[READY]')[1].split('[/READY]')[0].trim();
                setSummaryText(summary);
                setIsReady(true);
              }
            } else {
              setMessages([{ role: 'assistant', content: 'Xin chào! Bạn muốn tạo web gì?' }]);
            }
          }).catch(() => {
            setMessages([{ role: 'assistant', content: 'Xin chào! Bạn muốn tạo web gì?' }]);
          });
      } else {
        setMessages([{ role: 'assistant', content: 'Xin chào! Bạn muốn tạo web gì?' }]);
      }
    }
  }, [token]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = isLoginView ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(`http://${host}:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      localStorage.setItem('token', data.token);
      setToken(data.token);
    } catch (err) { setAuthError(err.message); }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setConvId(null);
    setIsReady(false);
    setPreviewUrl(null);
    setMessages([{ role: 'assistant', content: 'Xin chào! Bạn muốn tạo web gì?' }]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || isGenerating) return;

    // Nếu đang ở trạng thái chờ xác nhận mà người dùng chat tiếp -> Tắt khung xác nhận cũ
    if (isReady) {
      setIsReady(false);
    }

    const userText = input;
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setInput('');
    setLoading(true);

    try {
      const res = await authFetch(`http://${host}:5000/api/generate/chat`, {
        method: 'POST',
        body: JSON.stringify({ conversationId: convId, message: userText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message);

      if (data.conversationId) {
        setConvId(data.conversationId);
        localStorage.setItem('chat_conv_id', data.conversationId);
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);

      if (data.status === 'ready_to_confirm') {
        setSummaryText(data.summary);
        setIsReady(true);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Lỗi: " + err.message }]);
    } finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    setIsReady(false);
    setIsGenerating(true);
    setBuildTime(0);

    try {
      const res = await authFetch(`http://${host}:5000/api/generate/confirm/${convId}`, {
        method: 'POST',
        body: JSON.stringify({ summaryText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message);

      const checkInterval = setInterval(async () => {
        setBuildTime(prev => prev + 3);
        try {
          const statusRes = await fetch(`http://${host}:5000/api/generate/status/${data.run_id}?t=${Date.now()}`);
          const statusData = await statusRes.json();

          if (statusData.status === 'ready') {
            clearInterval(checkInterval);
            setIsGenerating(false);
            setPreviewUrl(`http://${host}:8888`);
            setMessages((prev) => [...prev, { role: 'assistant', content: '🎉 Tuyệt vời! Tôi đã tạo xong website cho bạn.' }]);
          }
          else if (statusData.status === 'failed') {
            clearInterval(checkInterval);
            setIsGenerating(false);
            setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ Lỗi: ${statusData.error}` }]);
          }
          else if (buildTime > 150) {
            clearInterval(checkInterval);
            setIsGenerating(false);
            setMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ Quá trình tạo web quá lâu (quá 2.5 phút). Vui lòng thử lại.' }]);
          }
        } catch (e) { console.error("Lỗi check status:", e); }
      }, 3000);
    } catch (err) {
      alert("Lỗi khi tạo web: " + err.message);
      setIsGenerating(false);
    }
  };

  if (!token) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f3f4f6' }}>
        <form onSubmit={handleAuth} style={{ background: '#fff', padding: 40, borderRadius: 12, boxShadow: '0 4px 15px rgba(0,0,0,0.1)', width: 350 }}>
          <h2 style={{ textAlign: 'center', marginBottom: 20 }}>{isLoginView ? '🔑 Đăng Nhập' : '📝 Đăng Ký'}</h2>
          {authError && <p style={{ color: 'red', fontSize: 14, marginBottom: 10 }}>{authError}</p>}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: 12, marginBottom: 15, border: '1px solid #ccc', borderRadius: 6 }} />
          <input type="password" placeholder="Mật khẩu" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: 12, marginBottom: 20, border: '1px solid #ccc', borderRadius: 6 }} />
          <button type="submit" style={{ width: '100%', padding: 12, background: '#8B5CF6', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}>
            {isLoginView ? 'Đăng Nhập' : 'Tạo Tài Khoản'}
          </button>
          <p style={{ textAlign: 'center', marginTop: 15, fontSize: 14, color: '#007bff', cursor: 'pointer' }} onClick={() => setIsLoginView(!isLoginView)}>
            {isLoginView ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
          </p>
        </form>
      </div>
    );
  }

  // CHỈ CHIA ĐÔI KHI CÓ PREVIEW URL
  const isFullScreenChat = !previewUrl;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif' }}>

      {/* KHUNG CHAT */}
      <div style={{ width: isFullScreenChat ? '100%' : '40%', borderRight: isFullScreenChat ? 'none' : '1px solid #ddd', display: 'flex', flexDirection: 'column', background: '#f9f9f9', transition: 'width 0.3s' }}>

        <div style={{ padding: '15px 20px', background: '#fff', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>🤖 AI Web Builder</span>
          <button onClick={handleLogout} style={{ padding: '5px 10px', background: '#ef4444', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer' }}>Đăng xuất</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', maxWidth: isFullScreenChat ? '800px' : '100%' }}>

            {/* TIN NHẮN */}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', marginBottom: '15px', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '80%', padding: '12px 16px', borderRadius: '12px', background: m.role === 'user' ? '#8B5CF6' : '#fff', color: m.role === 'user' ? '#fff' : '#333', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', whiteSpace: 'pre-wrap' }}>
                  {String(m.content).replace('[READY]', '').replace('[/READY]', '')}
                </div>
              </div>
            ))}
            {loading && <div style={{ color: '#888', fontStyle: 'italic', marginBottom: '15px' }}>AI đang gõ...</div>}

            {/* KHUNG XÁC NHẬN (HIỂN THỊ TRỰC TIẾP TRONG CHAT) */}
            {isReady && !isGenerating && (
              <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginTop: '10px', width: '100%', border: '1px solid #e5e7eb' }}>
                <h3 style={{ marginBottom: '15px', color: '#333', fontSize: '18px' }}>📋 Xác Nhận Yêu Cầu</h3>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>Bạn có thể sửa trực tiếp nội dung bên dưới:</p>
                <textarea
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  style={{ width: '100%', minHeight: '120px', background: '#f9fafb', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ccc', fontFamily: 'inherit', fontSize: '15px', resize: 'vertical', outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleConfirm} style={{ flex: 2, padding: '15px', background: '#10B981', color: '#fff', border: 0, borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                    ✅ Xác Nhận & Tạo Web
                  </button>
                  <button onClick={() => setIsReady(false)} style={{ flex: 1, padding: '15px', background: '#e5e7eb', color: '#374151', border: 0, borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Hủy / Sửa lại
                  </button>
                </div>
              </div>
            )}

            {/* KHUNG LOADING (HIỂN THỊ TRỰC TIẾP TRONG CHAT) */}
            {isGenerating && (
              <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginTop: '10px', width: '100%', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                <h3 style={{ marginBottom: '10px', fontSize: '18px' }}>⏳ AI Đang Xây Dựng Website...</h3>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>Đang cài đặt Database và cấu hình Docker...</p>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#8B5CF6', margin: 0 }}>{buildTime} giây</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div style={{ padding: '20px', background: '#fff', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: isFullScreenChat ? '800px' : '100%', display: 'flex', gap: '10px' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } }}
              placeholder={isReady ? "Nhập thêm để sửa yêu cầu..." : "Nhập tin nhắn..."}
              style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}
              disabled={isGenerating}
            />
            <button onClick={sendMessage} disabled={loading || isGenerating} style={{ padding: '0 20px', background: '#8B5CF6', color: '#fff', border: 0, borderRadius: '8px', cursor: (loading || isGenerating) ? 'not-allowed' : 'pointer', opacity: (loading || isGenerating) ? 0.5 : 1 }}>Gửi</button>
          </div>
        </div>
      </div>

      {/* KHUNG PREVIEW (CHỈ HIỆN KHI ĐÃ TẠO XONG) */}
      {previewUrl && (
        <div style={{ flex: 1, background: '#eee', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#fff', padding: '10px 20px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', color: '#10B981' }}>✅ Web đã sẵn sàng!</span>
            <a href={previewUrl} target="_blank" rel="noreferrer" style={{ padding: '8px 15px', background: '#3B82F6', color: '#fff', textDecoration: 'none', borderRadius: '5px', fontSize: '14px' }}>Mở trong tab mới ↗</a>
          </div>
          <iframe src={previewUrl} style={{ width: '100%', flex: 1, border: 'none' }} title="Preview" />
        </div>
      )}
    </div>
  );
}