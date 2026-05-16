import { useState, useRef, useEffect, useCallback } from 'react'
import '../App.css'
import CameraView from '../components/CameraView'

// Read settings from localStorage (set by Admin)
const getSettings = () => {
  try {
    return JSON.parse(localStorage.getItem('pb_settings') || '{}');
  } catch { return {}; }
};

const LAYOUTS = {
  strip:        { label: 'Digital Strip',  count: 3, icon: '▌▌▌', desc: '3 foto vertikal' },
  '6_grid':     { label: 'Classic Grid',   count: 6, icon: '⊞',   desc: '6 foto grid 2×3' },
  strip_double: { label: 'Double Strip',   count: 3, icon: '⧉',   desc: '3 foto × 2 (print ready)' },
};

const THEMES = {
  theme_01: { label: '01 · Retro',       bg: '#164e63', accent: '#ef4444' },
  theme_02: { label: '02 · Pastel',      bg: '#ffedd5', accent: '#1e3a8a' },
  theme_03: { label: '03 · Blue Check',  bg: '#1d4ed8', accent: '#1d4ed8' },
  theme_04: { label: '04 · Green Check', bg: '#16a34a', accent: '#16a34a' },
};

function drawBackground(ctx, w, h, themeKey, customColors) {
  const colors = customColors?.[themeKey] || {};
  ctx.clearRect(0, 0, w, h);

  if (themeKey === 'theme_01') {
    const bg = colors.bg || '#164e63';
    const c1 = colors.accent || '#ef4444';
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(w, 0, 300, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = colors.accent2 || '#eab308'; ctx.beginPath(); ctx.arc(0, h-300, 250, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = colors.accent3 || '#f97316';
    ctx.save(); ctx.translate(w/2, h/2); ctx.rotate(15*Math.PI/180); ctx.fillRect(-150, -400, 300, 800); ctx.restore();
  } else if (themeKey === 'theme_02') {
    ctx.fillStyle = colors.bg || '#ffedd5'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = colors.accent || '#1e3a8a'; ctx.beginPath(); ctx.arc(w*0.2, h*0.2, 350, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = colors.accent2 || '#f97316'; ctx.beginPath(); ctx.arc(w*0.8, h*0.7, 400, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ec4899'; ctx.beginPath(); ctx.arc(w*0.9, h*0.3, 150, 0, Math.PI*2); ctx.fill();
  } else {
    const primary = themeKey === 'theme_03' ? (colors.bg || '#1d4ed8') : (colors.bg || '#16a34a');
    const size = 60;
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        ctx.fillStyle = ((x/size + y/size) % 2 === 0) ? primary : '#ffffff';
        ctx.fillRect(x, y, size, size);
      }
    }
  }
}

function drawPhotoFrame(ctx, img, x, y, w, h, themeKey, customColors) {
  const colors = customColors?.[themeKey] || {};
  const pad = 20;
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  if (themeKey === 'theme_01') {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = colors.accent || '#ef4444';
    ctx.lineWidth = 10;
    ctx.fillRect(x-pad, y-pad, w+pad*2, h+pad*2);
    ctx.strokeRect(x-pad, y-pad, w+pad*2, h+pad*2);
  } else if (themeKey === 'theme_02') {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = colors.accent || '#1e3a8a';
    ctx.lineWidth = 8;
    ctx.fillRect(x-pad, y-pad, w+pad*2, h+pad*2);
    ctx.strokeRect(x-pad, y-pad, w+pad*2, h+pad*2);
  } else {
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 10;
    ctx.fillRect(x-pad, y-pad, w+pad*2, h+pad*2);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  }

  // Draw image with cover crop + mirror
  const ir = img.width/img.height, br = w/h;
  let sx=0, sy=0, sw=img.width, sh=img.height;
  if (ir > br) { sw = img.height*br; sx = (img.width-sw)/2; }
  else { sh = img.width/br; sy = (img.height-sh)/2; }

  ctx.save();
  ctx.translate(x+w, y); ctx.scale(-1, 1);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  ctx.restore();
}

function drawBranding(ctx, cx, y, themeKey, text, customColors) {
  const colors = customColors?.[themeKey] || {};
  ctx.textAlign = 'center';
  ctx.shadowBlur = 0;

  if (themeKey === 'theme_01') {
    ctx.fillStyle = colors.accent || '#ef4444';
    ctx.font = "900 55px 'Outfit', sans-serif";
    ctx.fillText(text || 'TAKE IT EASY', cx, y + 40);
  } else if (themeKey === 'theme_02') {
    ctx.fillStyle = colors.accent || '#1e3a8a';
    ctx.font = "900 55px 'Outfit', sans-serif";
    ctx.fillText(text || 'DAYS', cx, y + 50);
  } else {
    const color = themeKey === 'theme_03' ? (colors.bg || '#1d4ed8') : (colors.bg || '#16a34a');
    ctx.fillStyle = color;
    ctx.fillRect(cx-180, y, 360, 80);
    ctx.fillStyle = '#fff';
    ctx.font = "900 42px 'Outfit', sans-serif";
    ctx.fillText(text || 'MOMENT', cx, y + 55);
  }
}

async function generateCanvas(photos, layout, themeKey, brandingText, customColors) {
  const isStrip = layout === 'strip';
  const cW = isStrip ? 600 : 1200;
  const cH = 1800;
  const canvas = document.createElement('canvas');
  canvas.width = cW; canvas.height = cH;
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, cW, cH, themeKey, customColors);

  const imgs = await Promise.all(photos.map(src => new Promise(res => {
    const img = new Image(); img.onload = () => res(img); img.src = src;
  })));

  const W=500, H=460, GAP=40, TOP=80, FOOTER_Y=1620;

  if (layout === 'strip') {
    imgs.forEach((img, i) => drawPhotoFrame(ctx, img, 50, TOP + i*(H+GAP), W, H, themeKey, customColors));
    drawBranding(ctx, 300, FOOTER_Y, themeKey, brandingText, customColors);
  } else if (layout === '6_grid') {
    imgs.forEach((img, i) => {
      const col = i%2, row = Math.floor(i/2);
      drawPhotoFrame(ctx, img, 70 + col*(W+60), TOP + row*(H+60), W, H, themeKey, customColors);
    });
    drawBranding(ctx, 600, FOOTER_Y, themeKey, brandingText, customColors);
  } else if (layout === 'strip_double') {
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.setLineDash([20,20]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(600, 0); ctx.lineTo(600, cH); ctx.stroke();
    ctx.setLineDash([]);
    imgs.forEach((img, i) => {
      const y = TOP + i*(H+GAP);
      drawPhotoFrame(ctx, img, 50, y, W, H, themeKey, customColors);
      drawPhotoFrame(ctx, img, 650, y, W, H, themeKey, customColors);
    });
    drawBranding(ctx, 300, FOOTER_Y, themeKey, brandingText, customColors);
    drawBranding(ctx, 900, FOOTER_Y, themeKey, brandingText, customColors);
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}

function Photobooth() {
  const cameraRef = useRef(null);
  const settings = getSettings();

  const [selectedLayout, setSelectedLayout] = useState('strip');
  const [selectedTheme, setSelectedTheme] = useState('theme_01');
  const [sessionConfig, setSessionConfig] = useState({ total: 3, retakes: 1 });
  const [sessionActive, setSessionActive] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [retakesLeft, setRetakesLeft] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [phase, setPhase] = useState('idle');
  const [retakeIndex, setRetakeIndex] = useState(null);
  const [customText, setCustomText] = useState(settings.defaultText || '');
  const [isUploading, setIsUploading] = useState(false);
  const [finalImage, setFinalImage] = useState(null);
  const [cloudQrUrl, setCloudQrUrl] = useState(null);
  const [isUploadingCloud, setIsUploadingCloud] = useState(false);

  const startCaptureSequence = useCallback(() => {
    if (isCapturing) return;
    setIsCapturing(true);
    let count = 3;
    setCountdown(count);
    const timer = setInterval(() => {
      count -= 1;
      if (count > 0) setCountdown(count);
      else {
        clearInterval(timer);
        setCountdown(null);
        cameraRef.current?.takePhoto();
      }
    }, 1000);
  }, [isCapturing]);

  useEffect(() => {
    if (phase === 'session' && !isCapturing && countdown === null) {
      if (retakeIndex !== null) {
        const t = setTimeout(() => startCaptureSequence(), 1000);
        return () => clearTimeout(t);
      } else if (photos.length < sessionConfig.total) {
        const t = setTimeout(() => startCaptureSequence(), 1500);
        return () => clearTimeout(t);
      } else if (photos.length === sessionConfig.total) {
        setPhase('review'); setSessionActive(false);
      }
    }
  }, [phase, photos.length, sessionConfig.total, isCapturing, countdown, retakeIndex, startCaptureSequence]);

  const handlePhotoTaken = (url) => {
    setIsCapturing(false);
    if (retakeIndex !== null) {
      setPhotos(prev => { const n=[...prev]; n[retakeIndex]=url; return n; });
      setRetakeIndex(null); setPhase('review');
    } else {
      setPhotos(prev => [...prev, url]);
    }
  };

  const startSession = (layout) => {
    const total = LAYOUTS[layout].count;
    setSelectedLayout(layout);
    setSessionConfig({ total, retakes: total === 6 ? 3 : 1 });
    setRetakesLeft(total === 6 ? 3 : 1);
    setPhotos([]); setRetakeIndex(null);
    setSessionActive(true); setPhase('session');
    setFinalImage(null); setCloudQrUrl(null);
    const s = getSettings();
    setCustomText(s.defaultText || '');
    setSelectedTheme(s.defaultTheme || 'theme_01');
  };

  const handleRetake = (idx) => {
    if (retakesLeft > 0) {
      setRetakesLeft(p => p-1); setRetakeIndex(idx); setPhase('session');
    }
  };

  const handleGenerate = async () => {
    if (photos.length === 0) return alert('Belum ada foto!');
    setIsUploading(true);
    try {
      const s = getSettings();
      const customColors = s.themeColors || {};
      const data = await generateCanvas(photos, selectedLayout, selectedTheme, customText, customColors);
      setFinalImage(data);
      setPhase('result');
    } catch(e) { console.error(e); alert('Gagal memproses gambar.'); }
    setIsUploading(false);
  };

  const handleUploadToCloud = async () => {
    setIsUploadingCloud(true);
    try {
      const res = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: finalImage, type: 'frame' })
      });
      const result = await res.json();
      if (result.success && result.data.webViewLink) {
        setCloudQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(result.data.webViewLink)}`);
      } else { alert('Gagal upload ke Cloud.'); }
    } catch(e) { console.error(e); alert('Error saat upload.'); }
    setIsUploadingCloud(false);
  };

  // --- RENDER PHASES ---
  const renderIdle = () => (
    <div className="controls-panel">
      <h2 style={{color:'var(--neon-cyan)',textShadow:'var(--glow-cyan)'}}>Pilih Layout Frame</h2>
      <p style={{color:'var(--text-muted)',marginBottom:'1rem'}}>Sesuaikan dengan gayamu.</p>
      <div style={{display:'flex',gap:'16px',flexWrap:'wrap',justifyContent:'center'}}>
        {Object.entries(LAYOUTS).map(([key, info]) => (
          <button key={key} onClick={() => startSession(key)} style={{
            background:'#1a1a24', border:'2px solid rgba(0,243,255,0.3)',
            borderRadius:'16px', padding:'24px 20px', cursor:'pointer',
            color:'#fff', width:'200px', textAlign:'left', transition:'all 0.3s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor='var(--neon-cyan)'}
          onMouseLeave={e => e.currentTarget.style.borderColor='rgba(0,243,255,0.3)'}
          >
            <div style={{fontSize:'2rem',marginBottom:'8px'}}>{info.icon}</div>
            <div style={{fontWeight:'800',fontSize:'1.1rem',marginBottom:'4px'}}>{info.label}</div>
            <div style={{color:'var(--text-muted)',fontSize:'0.85rem'}}>{info.desc}</div>
            <div style={{marginTop:'10px',fontSize:'0.8rem',color:'var(--neon-pink)'}}>
              {info.count} foto · {info.count === 6 ? '3' : '1'} retake
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderSession = () => (
    <div className="controls-panel">
      <div className="status-bar">
        <div className="status-item">
          <span className="status-label">Foto Ke</span>
          <span className="status-value">
            {retakeIndex !== null ? retakeIndex+1 : Math.min(photos.length+1, sessionConfig.total)} / {sessionConfig.total}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Layout</span>
          <span className="status-value" style={{fontSize:'1rem'}}>{LAYOUTS[selectedLayout].label}</span>
        </div>
        {retakeIndex !== null && (
          <div className="status-item">
            <span className="status-label">Mode</span>
            <span className="status-value pink" style={{fontSize:'1.2rem'}}>RETAKE</span>
          </div>
        )}
      </div>
      <div className="photo-strip-preview">
        {photos.map((p, idx) => (
          <img key={idx} src={p} className={`preview-thumbnail ${idx===photos.length-1&&retakeIndex===null?'latest':''}`} alt={`Shot ${idx+1}`} />
        ))}
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="controls-panel">
      <h2 style={{color:'var(--neon-cyan)',textShadow:'var(--glow-cyan)'}}>Review Hasil Foto</h2>
      <div className="status-bar" style={{marginBottom:'1rem',width:'auto',padding:'10px 20px'}}>
        <div className="status-item">
          <span className="status-label">Sisa Retake</span>
          <span className="status-value pink">{retakesLeft}</span>
        </div>
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:'20px',justifyContent:'center',marginBottom:'20px'}}>
        {photos.map((p, idx) => (
          <div key={idx} style={{position:'relative'}}>
            <img src={p} className="preview-thumbnail" style={{width:'120px',height:'90px',border:'3px solid var(--text-muted)'}} alt={`Shot ${idx+1}`}/>
            {retakesLeft > 0 && (
              <button onClick={() => handleRetake(idx)} style={{
                position:'absolute',bottom:'-15px',left:'50%',transform:'translateX(-50%)',
                background:'var(--neon-pink)',color:'#fff',border:'none',borderRadius:'20px',
                padding:'5px 12px',fontSize:'0.8rem',cursor:'pointer',fontWeight:'bold',
              }}>Retake</button>
            )}
          </div>
        ))}
      </div>
      <button className="btn-neon" onClick={() => setPhase('edit')}>LANJUT KE EDIT FRAME</button>
    </div>
  );

  const renderEdit = () => {
    const s = getSettings();
    const customColors = s.themeColors || {};
    return (
      <div className="controls-panel">
        <h2 style={{color:'var(--neon-cyan)',textShadow:'var(--glow-cyan)',marginBottom:'0.5rem'}}>Edit Frame</h2>
        <div style={{width:'100%',background:'var(--panel-bg)',padding:'20px',borderRadius:'12px',border:'1px solid rgba(0,243,255,0.3)'}}>

          {/* Theme Selection */}
          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',marginBottom:'10px',color:'var(--neon-cyan)',fontWeight:'600'}}>1. Pilih Tema:</label>
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
              {Object.entries(THEMES).map(([key, info]) => {
                const colors = customColors[key] || {};
                const bgColor = colors.bg || info.bg;
                return (
                  <div key={key} onClick={() => setSelectedTheme(key)} style={{
                    cursor:'pointer', borderRadius:'12px', overflow:'hidden',
                    border: selectedTheme===key ? '3px solid var(--neon-cyan)' : '3px solid transparent',
                    transition:'all 0.2s', textAlign:'center',
                  }}>
                    <div style={{width:'70px',height:'110px',background:bgColor,position:'relative',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'4px',padding:'6px'}}>
                      {[0,1,2].map(i => <div key={i} style={{width:'100%',flex:1,background:'rgba(255,255,255,0.85)',borderRadius:'2px'}}/>)}
                    </div>
                    <div style={{fontSize:'0.7rem',padding:'4px',color:selectedTheme===key?'var(--neon-cyan)':'var(--text-muted)'}}>{info.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Branding Text */}
          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',marginBottom:'10px',color:'var(--neon-cyan)',fontWeight:'600'}}>2. Teks Branding:</label>
            <input type="text" value={customText} onChange={e=>setCustomText(e.target.value)}
              placeholder={s.defaultText || 'Contoh: MPLS 2026'}
              style={{width:'100%',padding:'12px',borderRadius:'8px',background:'#000',color:'#fff',border:'1px solid var(--text-muted)',fontFamily:'Outfit',fontSize:'1rem',outline:'none'}}
            />
          </div>

          <div className="action-buttons" style={{justifyContent:'space-between'}}>
            <button className="btn-neon" style={{borderColor:'var(--text-muted)',color:'var(--text-muted)',boxShadow:'none'}} onClick={()=>setPhase('review')}>KEMBALI</button>
            <button className="btn-neon" onClick={handleGenerate} disabled={isUploading}>
              {isUploading ? 'MEMPROSES...' : 'GENERATE FRAME'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderResult = () => (
    <div className="controls-panel" style={{textAlign:'center',width:'100%',maxWidth:'1000px'}}>
      <h2 style={{color:'var(--neon-cyan)',textShadow:'var(--glow-cyan)',marginBottom:'20px'}}>Hasil Siap!</h2>
      <div style={{display:'flex',flexWrap:'wrap',gap:'40px',justifyContent:'center',alignItems:'flex-start'}}>
        {finalImage && (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'15px'}}>
            <h3 style={{color:'var(--text-muted)'}}>Preview Frame</h3>
            <img src={finalImage} alt="Final" style={{height:'380px',objectFit:'contain',border:'2px solid var(--neon-cyan)',borderRadius:'8px',boxShadow:'var(--glow-cyan)'}}/>
            <a href={finalImage} download="photobooth-frame.jpg" className="btn-neon" style={{fontSize:'0.9rem',padding:'10px 20px',textDecoration:'none'}}>DOWNLOAD FOTO</a>
          </div>
        )}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'15px',background:'var(--panel-bg)',padding:'25px',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.1)'}}>
          <h3 style={{color:'var(--neon-cyan)'}}>Simpan ke HP</h3>
          {!cloudQrUrl ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'10px'}}>
              <p style={{fontSize:'0.9rem',color:'var(--text-muted)',maxWidth:'200px',lineHeight:'1.4'}}>Upload ke Google Drive & dapatkan QR Code.</p>
              <button className="btn-neon" onClick={handleUploadToCloud} disabled={isUploadingCloud}>
                {isUploadingCloud ? 'MENGUPLOAD...' : 'UPLOAD & BUAT QR'}
              </button>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'10px'}}>
              <img src={cloudQrUrl} alt="QR" style={{width:'180px',height:'180px',background:'#fff',padding:'15px',borderRadius:'8px'}}/>
              <p style={{fontSize:'0.85rem',color:'var(--text-muted)',maxWidth:'200px',lineHeight:'1.4'}}>Scan QR dengan kamera HP untuk download.</p>
            </div>
          )}
        </div>
      </div>
      <div className="action-buttons" style={{marginTop:'40px',justifyContent:'center'}}>
        <button className="btn-neon" onClick={()=>{setPhase('idle');setPhotos([]);}}>SELESAI & KEMBALI</button>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <header className="header">
        <h1>NEON BOOTH</h1>
        <p>Tangkap Momen Terbaikmu</p>
      </header>

      <div style={{position:'relative',width:'100%',display:(phase==='idle'||phase==='session')?'flex':'none',justifyContent:'center'}}>
        <CameraView ref={cameraRef} onPhotoTaken={handlePhotoTaken} showGuide={selectedLayout==='strip_double'} />
        {countdown !== null && <div className="countdown-display">{countdown}</div>}
      </div>

      {phase === 'idle'    && renderIdle()}
      {phase === 'session' && renderSession()}
      {phase === 'review'  && renderReview()}
      {phase === 'edit'    && renderEdit()}
      {phase === 'result'  && renderResult()}
    </div>
  );
}

export default Photobooth;
