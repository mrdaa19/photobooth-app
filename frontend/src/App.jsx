import { useState, useRef } from 'react'
import './App.css'
import CameraView from './components/CameraView'

function App() {
  const TOTAL_PHOTOS = 6;
  const MAX_RETAKES = 3;
  
  const cameraRef = useRef(null);
  
  const [sessionActive, setSessionActive] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [retakesLeft, setRetakesLeft] = useState(MAX_RETAKES);
  const [countdown, setCountdown] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle, session, edit

  // Phase 3 Edit States
  const [selectedTemplate, setSelectedTemplate] = useState('3-frame');
  const [customText, setCustomText] = useState('');
  const [makeGif, setMakeGif] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const startSession = () => {
    setPhotos([]);
    setRetakesLeft(MAX_RETAKES);
    setSessionActive(true);
    setPhase('session');
    
    // Reset Edit states
    setSelectedTemplate('3-frame');
    setCustomText('');
    setMakeGif(false);
  };

  const takeNextPhoto = () => {
    if (isCapturing) return;
    setIsCapturing(true);
    
    let count = 3;
    setCountdown(count);
    
    const timer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(timer);
        setCountdown(null);
        if (cameraRef.current) {
          cameraRef.current.takePhoto();
        }
        setIsCapturing(false);
      }
    }, 1000);
  };

  const handlePhotoTaken = (photoDataUrl) => {
    const newPhotos = [...photos, photoDataUrl];
    setPhotos(newPhotos);
    
    if (newPhotos.length >= TOTAL_PHOTOS) {
      setTimeout(() => {
        setPhase('edit');
        setSessionActive(false);
      }, 1500);
    }
  };

  const handleRetakeLast = () => {
    if (retakesLeft > 0 && photos.length > 0) {
      setRetakesLeft(prev => prev - 1);
      setPhotos(prev => prev.slice(0, -1));
    }
  };

  const handleUpload = () => {
    setIsUploading(true);
    // Placeholder for Phase 4: Send to backend
    setTimeout(() => {
      alert("Simulasi Upload Selesai! Template: " + selectedTemplate + " | Teks: " + customText + " | GIF: " + makeGif);
      setIsUploading(false);
      setPhase('idle');
      setPhotos([]);
    }, 2000);
  };

  const renderIdle = () => (
    <div className="controls-panel">
      <button className="btn-neon" onClick={startSession}>
        MULAI SESI FOTO
      </button>
      <p style={{marginTop: '0.5rem', color: 'var(--text-muted)'}}>
        6 Foto • 3 Kesempatan Ulang
      </p>
    </div>
  );

  const renderSession = () => (
    <div className="controls-panel">
      <div className="status-bar">
        <div className="status-item">
          <span className="status-label">Foto Ke</span>
          <span className="status-value">{Math.min(photos.length + 1, TOTAL_PHOTOS)} / {TOTAL_PHOTOS}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Sisa Retake</span>
          <span className="status-value pink">{retakesLeft}</span>
        </div>
      </div>
      
      <div className="action-buttons">
        <button 
          className="btn-neon" 
          onClick={takeNextPhoto} 
          disabled={isCapturing || photos.length >= TOTAL_PHOTOS}
        >
          {isCapturing ? 'BERSIAP...' : 'JEPRET FOTO'}
        </button>
        
        {photos.length > 0 && (
          <button 
            className="btn-neon btn-neon-pink" 
            onClick={handleRetakeLast}
            disabled={isCapturing || retakesLeft <= 0}
          >
            ULANG FOTO TERAKHIR
          </button>
        )}
      </div>

      <div className="photo-strip-preview">
        {photos.length === 0 ? (
           <span style={{color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px'}}>Belum ada foto</span>
        ) : (
          photos.map((p, idx) => (
            <img 
              key={idx} 
              src={p} 
              className={`preview-thumbnail ${idx === photos.length - 1 ? 'latest' : ''}`} 
              alt={`Shot ${idx+1}`} 
            />
          ))
        )}
      </div>
    </div>
  );

  const renderEdit = () => (
    <div className="controls-panel">
      <h2 style={{color: 'var(--neon-cyan)', marginBottom: '0.5rem', textShadow: 'var(--glow-cyan)'}}>Sesi Selesai!</h2>
      <p style={{marginBottom: '1rem', color: 'var(--text-muted)'}}>Atur gaya cetak untuk foto Anda.</p>
      
      <div style={{width: '100%', textAlign: 'left', background: 'var(--panel-bg)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,0,234,0.3)', boxShadow: 'var(--glow-pink)'}}>
        
        <div style={{marginBottom: '20px'}}>
          <label style={{display: 'block', marginBottom: '10px', color: 'var(--neon-cyan)', fontWeight: '600'}}>Pilih Template Frame:</label>
          <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
            {['3-frame', '6-frame', '12-frame'].map(tpl => (
              <button 
                key={tpl}
                className={`btn-neon ${selectedTemplate === tpl ? 'btn-neon-pink' : ''}`}
                style={{padding: '10px 15px', fontSize: '0.9rem', flex: 1, minWidth: '120px'}}
                onClick={() => setSelectedTemplate(tpl)}
              >
                {tpl === '3-frame' ? '1 Strip (3 Foto)' : tpl === '6-frame' ? '2 Strip (6 Foto)' : '4 Strip (12 Foto)'}
              </button>
            ))}
          </div>
        </div>

        <div style={{marginBottom: '20px'}}>
          <label style={{display: 'block', marginBottom: '10px', color: 'var(--neon-cyan)', fontWeight: '600'}}>Tambahkan Teks di Foto (Opsional):</label>
          <input 
            type="text" 
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Misal: Wedding Party 2026!"
            style={{
              width: '100%', padding: '12px', borderRadius: '8px', 
              background: '#000', color: '#fff', border: '1px solid var(--text-muted)',
              outline: 'none', fontFamily: 'Outfit', fontSize: '1rem'
            }}
          />
        </div>

        <div style={{marginBottom: '20px'}}>
          <label style={{display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '10px', background: '#000', borderRadius: '8px'}}>
            <input 
              type="checkbox" 
              checked={makeGif}
              onChange={(e) => setMakeGif(e.target.checked)}
              style={{width: '24px', height: '24px', accentColor: 'var(--neon-pink)', cursor: 'pointer'}}
            />
            <span style={{fontSize: '1rem'}}>Buat juga versi Video Animasi GIF</span>
          </label>
        </div>

        <div className="action-buttons" style={{marginTop: '20px', justifyContent: 'space-between'}}>
          <button className="btn-neon" style={{borderColor: 'var(--text-muted)', color: 'var(--text-muted)', boxShadow: 'none'}} onClick={() => { setPhase('idle'); setPhotos([]); }}>
            BATAL
          </button>
          <button className="btn-neon" onClick={handleUpload} disabled={isUploading}>
            {isUploading ? 'MEMPROSES...' : 'SELESAI & SIMPAN'}
          </button>
        </div>
      </div>

      <div className="photo-strip-preview" style={{ flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
        {photos.map((p, idx) => (
          <img key={idx} src={p} className="preview-thumbnail" style={{width: '80px', height: '60px'}} alt={`Shot ${idx+1}`} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <header className="header">
        <h1>NEON BOOTH</h1>
        <p>Tangkap Momen Terbaikmu</p>
      </header>
      
      <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <CameraView ref={cameraRef} onPhotoTaken={handlePhotoTaken} />
        {countdown !== null && (
          <div className="countdown-display">{countdown}</div>
        )}
      </div>

      {phase === 'idle' && renderIdle()}
      {phase === 'session' && renderSession()}
      {phase === 'edit' && renderEdit()}
      
    </div>
  );
}

export default App;
