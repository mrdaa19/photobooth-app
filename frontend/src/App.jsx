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

  const startSession = () => {
    setPhotos([]);
    setRetakesLeft(MAX_RETAKES);
    setSessionActive(true);
    setPhase('session');
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
      <h2 style={{color: 'var(--neon-cyan)', marginBottom: '1rem', textShadow: 'var(--glow-cyan)'}}>Sesi Selesai!</h2>
      <p>Masuk ke tahap pengeditan & pemilihan frame (Fase 3)...</p>
      
      <div className="photo-strip-preview" style={{ flexWrap: 'wrap', justifyContent: 'center', minHeight: 'auto' }}>
        {photos.map((p, idx) => (
          <img key={idx} src={p} className="preview-thumbnail" style={{width: '120px', height: '90px'}} alt={`Shot ${idx+1}`} />
        ))}
      </div>
      
      <button className="btn-neon" style={{marginTop: '2rem'}} onClick={() => { setPhase('idle'); setPhotos([]); }}>
        SELESAI / MULAI BARU
      </button>
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
