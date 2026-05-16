import { useState, useEffect } from 'react';
import '../App.css';
import { Link } from 'react-router-dom';

const ADMIN_PASSWORD = 'admin123@#';

const DEFAULT_SETTINGS = {
  defaultText: 'MOMENT',
  defaultTheme: 'theme_01',
  themeColors: {
    theme_01: { bg: '#164e63', accent: '#ef4444', accent2: '#eab308', accent3: '#f97316' },
    theme_02: { bg: '#ffedd5', accent: '#1e3a8a', accent2: '#f97316' },
    theme_03: { bg: '#1d4ed8' },
    theme_04: { bg: '#16a34a' },
  }
};

function getSettings() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('pb_settings') || '{}') }; }
  catch { return DEFAULT_SETTINGS; }
}

function saveSettings(s) {
  localStorage.setItem('pb_settings', JSON.stringify(s));
}

// --- LOGIN SCREEN ---
function LoginScreen({ onLogin }) {
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pass === ADMIN_PASSWORD) { onLogin(); }
    else { setError('Password salah. Coba lagi.'); setPass(''); }
  };

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'radial-gradient(circle at top, #1a1a24 0%, #050505 100%)'
    }}>
      <div style={{background:'#111',borderRadius:'20px',padding:'40px',width:'100%',maxWidth:'400px',border:'1px solid rgba(0,243,255,0.2)',boxShadow:'0 0 40px rgba(0,243,255,0.1)'}}>
        <h1 style={{textAlign:'center',fontSize:'1.8rem',fontWeight:'900',marginBottom:'8px',
          background:'linear-gradient(to right,#00f3ff,#ff00ea)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          ADMIN PANEL
        </h1>
        <p style={{textAlign:'center',color:'#888',marginBottom:'30px',fontSize:'0.9rem'}}>Masukkan password untuk melanjutkan</p>

        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:'16px',position:'relative'}}>
            <input
              type={show ? 'text' : 'password'}
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="Password Admin"
              style={{width:'100%',padding:'14px 44px 14px 16px',borderRadius:'10px',
                background:'#000',color:'#fff',border:`1px solid ${error?'#ef4444':'#444'}`,
                fontFamily:'Outfit',fontSize:'1rem',outline:'none',boxSizing:'border-box'}}
            />
            <button type="button" onClick={() => setShow(s=>!s)}
              style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',
                background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:'1.1rem'}}>
              {show ? '🙈' : '👁️'}
            </button>
          </div>

          {error && <p style={{color:'#ef4444',fontSize:'0.85rem',marginBottom:'12px',textAlign:'center'}}>{error}</p>}

          <button type="submit" className="btn-neon" style={{width:'100%',padding:'14px',fontSize:'1rem'}}>
            MASUK
          </button>
        </form>

        <Link to="/" style={{display:'block',textAlign:'center',marginTop:'20px',color:'#888',fontSize:'0.85rem',textDecoration:'none'}}>
          ← Kembali ke Aplikasi
        </Link>
      </div>
    </div>
  );
}

// --- MAIN DASHBOARD ---
function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('gallery');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(getSettings());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem('pb_admin_auth');
    if (auth === '1') setIsAuthenticated(true);
  }, []);

  const handleLogin = () => {
    sessionStorage.setItem('pb_admin_auth', '1');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('pb_admin_auth');
    setIsAuthenticated(false);
  };

  useEffect(() => {
    if (activeTab === 'gallery' && isAuthenticated) {
      setLoading(true);
      fetch('http://localhost:3001/api/history')
        .then(r => r.json()).then(d => { setHistory(d); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [activeTab, isAuthenticated]);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateThemeColor = (themeKey, colorKey, value) => {
    setSettings(prev => ({
      ...prev,
      themeColors: {
        ...prev.themeColors,
        [themeKey]: { ...prev.themeColors?.[themeKey], [colorKey]: value }
      }
    }));
  };

  if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} />;

  const sidebarBtn = (tab, label) => (
    <button onClick={() => setActiveTab(tab)} style={{
      background: activeTab===tab ? 'var(--neon-pink)' : 'transparent',
      color: activeTab===tab ? '#000' : '#fff', border:'none', padding:'15px',
      borderRadius:'8px', marginBottom:'10px', cursor:'pointer',
      textAlign:'left', fontWeight:'bold', width:'100%', transition:'all 0.3s'
    }}>{label}</button>
  );

  const THEME_META = {
    theme_01: { label:'01 · Retro',       colorKeys:['bg','accent','accent2','accent3'], colorLabels:['Background','Warna 1 (Merah)','Warna 2 (Kuning)','Warna 3 (Oranye)'] },
    theme_02: { label:'02 · Pastel',      colorKeys:['bg','accent','accent2'],           colorLabels:['Background (Krem)','Warna Blob 1 (Biru)','Warna Blob 2 (Oranye)'] },
    theme_03: { label:'03 · Blue Check',  colorKeys:['bg'],                              colorLabels:['Warna Kotak Primer'] },
    theme_04: { label:'04 · Green Check', colorKeys:['bg'],                              colorLabels:['Warna Kotak Primer'] },
  };

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <h2 style={{color:'var(--neon-cyan)',textShadow:'var(--glow-cyan)',marginBottom:'30px',fontSize:'1.4rem',textAlign:'center'}}>
          ADMIN PANEL
        </h2>
        {sidebarBtn('gallery', '📸 Galeri Foto')}
        {sidebarBtn('settings', '⚙️ Pengaturan')}
        {sidebarBtn('themes', '🎨 Kustomisasi Tema')}

        <div style={{marginTop:'auto',display:'flex',flexDirection:'column',gap:'8px'}}>
          <Link to="/" style={{textDecoration:'none'}}>
            <button style={{width:'100%',background:'#1a1a24',color:'#fff',border:'1px solid #333',padding:'12px',borderRadius:'8px',cursor:'pointer'}}>
              ← Ke Aplikasi
            </button>
          </Link>
          <button onClick={handleLogout} style={{width:'100%',background:'transparent',color:'#ef4444',border:'1px solid #ef4444',padding:'12px',borderRadius:'8px',cursor:'pointer',fontWeight:'bold'}}>
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="admin-content">

        {/* === GALLERY === */}
        {activeTab === 'gallery' && (
          <div>
            <h2 style={{fontSize:'2rem',marginBottom:'10px'}}>Galeri Hasil Foto</h2>
            <p style={{color:'var(--text-muted)',marginBottom:'30px'}}>Histori foto yang telah diunggah ke Google Drive.</p>
            {loading ? <p>Memuat data...</p> : history.length === 0 ? (
              <p style={{color:'#666'}}>Belum ada foto yang diunggah.</p>
            ) : (
              <div style={{display:'flex',flexWrap:'wrap',gap:'20px'}}>
                {history.map((item, idx) => (
                  <div key={item.id||idx} style={{background:'#1a1a24',padding:'15px',borderRadius:'12px',border:'1px solid #333'}}>
                    <div style={{width:'150px',height:'200px',background:'#333',borderRadius:'8px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'center',color:'#666'}}>
                      {item.type==='gif'?'🎞️ GIF':'🖼️ FRAME'}
                    </div>
                    <div style={{fontSize:'0.9rem',marginBottom:'5px'}}>
                      {new Date(item.date).toLocaleString('id-ID')}
                    </div>
                    <a href={item.webViewLink} target="_blank" rel="noreferrer" style={{fontSize:'0.8rem',color:'var(--neon-cyan)',textDecoration:'none'}}>
                      Lihat di GDrive
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === SETTINGS === */}
        {activeTab === 'settings' && (
          <div>
            <h2 style={{fontSize:'2rem',marginBottom:'10px'}}>Pengaturan Umum</h2>
            <p style={{color:'var(--text-muted)',marginBottom:'30px'}}>Konfigurasi default photobooth.</p>
            <div style={{background:'#1a1a24',padding:'30px',borderRadius:'12px',border:'1px solid #333',maxWidth:'600px'}}>

              <div style={{marginBottom:'24px'}}>
                <label style={{display:'block',marginBottom:'10px',fontWeight:'bold',color:'var(--neon-cyan)'}}>
                  Teks Branding Default
                </label>
                <input type="text" value={settings.defaultText||''}
                  onChange={e => setSettings(p=>({...p,defaultText:e.target.value}))}
                  placeholder="Contoh: MPLS SMK 2026"
                  style={{width:'100%',padding:'12px',borderRadius:'8px',background:'#000',color:'#fff',border:'1px solid #444',fontFamily:'Outfit',fontSize:'1rem',outline:'none'}}
                />
                <small style={{color:'var(--text-muted)'}}>Teks ini muncul di bagian bawah hasil foto sebagai teks default.</small>
              </div>

              <div style={{marginBottom:'24px'}}>
                <label style={{display:'block',marginBottom:'10px',fontWeight:'bold',color:'var(--neon-cyan)'}}>
                  Tema Default
                </label>
                <select value={settings.defaultTheme||'theme_01'}
                  onChange={e => setSettings(p=>({...p,defaultTheme:e.target.value}))}
                  style={{width:'100%',padding:'12px',borderRadius:'8px',background:'#000',color:'#fff',border:'1px solid #444',fontFamily:'Outfit',fontSize:'1rem',outline:'none'}}>
                  <option value="theme_01">01 · Retro</option>
                  <option value="theme_02">02 · Pastel</option>
                  <option value="theme_03">03 · Blue Check</option>
                  <option value="theme_04">04 · Green Check</option>
                </select>
              </div>

              <button className="btn-neon" onClick={handleSave} style={{marginTop:'10px'}}>
                {saved ? '✅ TERSIMPAN!' : 'SIMPAN PENGATURAN'}
              </button>
            </div>
          </div>
        )}

        {/* === THEME COLORS === */}
        {activeTab === 'themes' && (
          <div>
            <h2 style={{fontSize:'2rem',marginBottom:'10px'}}>Kustomisasi Warna Tema</h2>
            <p style={{color:'var(--text-muted)',marginBottom:'30px'}}>Ubah warna tiap tema frame foto.</p>

            <div style={{display:'flex',flexDirection:'column',gap:'24px',maxWidth:'700px'}}>
              {Object.entries(THEME_META).map(([themeKey, meta]) => (
                <div key={themeKey} style={{background:'#1a1a24',padding:'24px',borderRadius:'12px',border:'1px solid #333'}}>
                  <h3 style={{color:'var(--neon-cyan)',marginBottom:'16px',fontSize:'1.2rem'}}>{meta.label}</h3>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'16px'}}>
                    {meta.colorKeys.map((ck, i) => (
                      <div key={ck} style={{display:'flex',flexDirection:'column',gap:'6px',minWidth:'140px'}}>
                        <label style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>{meta.colorLabels[i]}</label>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <input type="color"
                            value={settings.themeColors?.[themeKey]?.[ck] || DEFAULT_SETTINGS.themeColors[themeKey]?.[ck] || '#000000'}
                            onChange={e => updateThemeColor(themeKey, ck, e.target.value)}
                            style={{width:'40px',height:'40px',borderRadius:'8px',border:'none',cursor:'pointer',background:'none'}}
                          />
                          <input type="text"
                            value={settings.themeColors?.[themeKey]?.[ck] || DEFAULT_SETTINGS.themeColors[themeKey]?.[ck] || '#000000'}
                            onChange={e => updateThemeColor(themeKey, ck, e.target.value)}
                            style={{flex:1,padding:'8px',borderRadius:'6px',background:'#000',color:'#fff',border:'1px solid #444',fontFamily:'monospace',fontSize:'0.9rem',outline:'none'}}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button className="btn-neon" onClick={handleSave} style={{marginTop:'24px'}}>
              {saved ? '✅ TERSIMPAN!' : 'SIMPAN SEMUA WARNA'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default AdminDashboard;
