import { useState, useRef, useEffect, useCallback } from 'react'
import '../App.css'
import CameraView from '../components/CameraView'

function Photobooth() {
  const cameraRef = useRef(null);
  
  const [sessionConfig, setSessionConfig] = useState({ total: 3, retakes: 1 });
  const [sessionActive, setSessionActive] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [retakesLeft, setRetakesLeft] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle, session, review, edit
  const [retakeIndex, setRetakeIndex] = useState(null);

  // Edit States
  const [selectedPhotosIndices, setSelectedPhotosIndices] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('3-frame');
  const [customText, setCustomText] = useState('');
  const [makeGif, setMakeGif] = useState(false);
  const [makeFrame, setMakeFrame] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Result States
  const [finalImage, setFinalImage] = useState(null);
  const [gifFrameIndex, setGifFrameIndex] = useState(0);
  const [cloudQrUrl, setCloudQrUrl] = useState(null);
  const [isUploadingCloud, setIsUploadingCloud] = useState(false);

  const startCaptureSequence = useCallback(() => {
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
      }
    }, 1000);
  }, [isCapturing]);

  useEffect(() => {
    if (phase === 'session' && !isCapturing && countdown === null) {
      if (retakeIndex !== null) {
        const delayTimer = setTimeout(() => startCaptureSequence(), 1000);
        return () => clearTimeout(delayTimer);
      } else if (photos.length < sessionConfig.total) {
        const delayTimer = setTimeout(() => startCaptureSequence(), 1500);
        return () => clearTimeout(delayTimer);
      } else if (photos.length === sessionConfig.total) {
        setPhase('review');
        setSessionActive(false);
      }
    }
  }, [phase, photos.length, sessionConfig.total, isCapturing, countdown, retakeIndex, startCaptureSequence]);

  useEffect(() => {
    if (phase === 'result' && makeGif && selectedPhotosIndices.length > 0) {
      const interval = setInterval(() => {
        setGifFrameIndex(prev => (prev + 1) % selectedPhotosIndices.length);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [phase, makeGif, selectedPhotosIndices.length]);

  const handlePhotoTaken = (photoDataUrl) => {
    setIsCapturing(false);
    if (retakeIndex !== null) {
      setPhotos(prev => {
        const newPhotos = [...prev];
        newPhotos[retakeIndex] = photoDataUrl;
        return newPhotos;
      });
      setRetakeIndex(null);
      setPhase('review');
    } else {
      setPhotos(prev => [...prev, photoDataUrl]);
    }
  };

  const startSession = (total, retakes) => {
    setSessionConfig({ total, retakes });
    setRetakesLeft(retakes);
    setPhotos([]);
    setRetakeIndex(null);
    setSessionActive(true);
    setPhase('session');
    
    setSelectedPhotosIndices([]);
    setSelectedTemplate('3-frame');
    setCustomText('');
    setMakeGif(false);
    setMakeFrame(true);
    setFinalImage(null);
    setCloudQrUrl(null);
  };

  const handleRetake = (index) => {
    if (retakesLeft > 0) {
      setRetakesLeft(prev => prev - 1);
      setRetakeIndex(index);
      setPhase('session');
    }
  };

  const togglePhotoSelection = (index) => {
    setSelectedPhotosIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const generateCanvas = async (photosList, template, text) => {
    const numColumns = template === '6-frame' ? 2 : template === '12-frame' ? 4 : 1;
    const numRows = 3; 
    const colWidth = 400;
    const padding = 20;
    const imgWidth = colWidth - (padding * 2);
    const imgHeight = Math.round(imgWidth * 0.75);
    const textSpace = text ? 80 : 40;
    
    const canvasWidth = (colWidth * numColumns) + (padding * (numColumns - 1));
    const canvasHeight = padding + (imgHeight + padding) * numRows + textSpace;
    
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    let photoIndex = 0;
    for (let col = 0; col < numColumns; col++) {
      const startX = col * (colWidth + padding);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(startX, 0, colWidth, canvasHeight);
      
      for (let row = 0; row < numRows; row++) {
        const x = startX + padding;
        const y = padding + row * (imgHeight + padding);
        
        const img = new Image();
        const pSrc = photosList[photoIndex % photosList.length];
        img.src = pSrc;
        await new Promise(r => { img.onload = r; });
        
        // Object-fit: cover logic
        const imgRatio = img.width / img.height;
        const targetRatio = imgWidth / imgHeight;
        
        let sourceX = 0, sourceY = 0, sourceW = img.width, sourceH = img.height;
        
        if (imgRatio > targetRatio) {
          sourceW = img.height * targetRatio;
          sourceX = (img.width - sourceW) / 2;
        } else {
          sourceH = img.width / targetRatio;
          sourceY = (img.height - sourceH) / 2;
        }
        
        ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, x, y, imgWidth, imgHeight);
        photoIndex++;
      }
      
      if (text) {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 30px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        const textX = startX + (colWidth / 2);
        const textY = canvasHeight - 30;
        ctx.fillText(text, textX, textY);
      }
    }
    
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleGenerate = async () => {
    if (selectedPhotosIndices.length === 0) {
      alert("Pilih minimal 1 foto untuk diproses!");
      return;
    }
    if (!makeFrame && !makeGif) {
      alert("Pilih minimal 1 jenis hasil (Frame atau GIF)!");
      return;
    }
    setIsUploading(true);
    try {
      const photosList = selectedPhotosIndices.map(i => photos[i]);
      if (makeFrame) {
        const dataUrl = await generateCanvas(photosList, selectedTemplate, customText);
        setFinalImage(dataUrl);
      } else {
        setFinalImage(null);
      }
      setPhase('result');
    } catch (e) {
      console.error(e);
      alert("Gagal memproses gambar.");
    }
    setIsUploading(false);
  };

  const handleUploadToCloud = async (type) => {
    setIsUploadingCloud(true);
    try {
      const payload = {
        image: type === 'frame' ? finalImage : photos[selectedPhotosIndices[0]],
        type: type
      };

      const res = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      if (result.success && result.data.webViewLink) {
        // Generate QR Code that points to the Google Drive link
        const generatedQr = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(result.data.webViewLink)}`;
        setCloudQrUrl(generatedQr);
      } else {
        alert("Gagal mengupload ke Cloud.");
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan saat upload.");
    }
    setIsUploadingCloud(false);
  };

  const renderIdle = () => (
    <div className="controls-panel">
      <h2 style={{color: 'var(--neon-cyan)', textShadow: 'var(--glow-cyan)'}}>Pilih Paket Foto</h2>
      <div className="action-buttons" style={{marginTop: '1rem'}}>
        <button className="btn-neon" onClick={() => startSession(3, 1)}>
          3 FOTO (1 RETAKE)
        </button>
        <button className="btn-neon btn-neon-pink" onClick={() => startSession(6, 3)}>
          6 FOTO (3 RETAKE)
        </button>
      </div>
    </div>
  );

  const renderSession = () => (
    <div className="controls-panel">
      <div className="status-bar">
        <div className="status-item">
          <span className="status-label">Foto Ke</span>
          <span className="status-value">
            {retakeIndex !== null ? retakeIndex + 1 : Math.min(photos.length + 1, sessionConfig.total)} / {sessionConfig.total}
          </span>
        </div>
        {retakeIndex !== null && (
          <div className="status-item">
            <span className="status-label">Mode</span>
            <span className="status-value pink" style={{fontSize: '1.2rem'}}>RETAKE</span>
          </div>
        )}
      </div>

      <div className="photo-strip-preview">
        {photos.map((p, idx) => (
          <img 
            key={idx} 
            src={p} 
            className={`preview-thumbnail ${idx === photos.length - 1 && retakeIndex === null ? 'latest' : ''}`} 
            alt={`Shot ${idx+1}`} 
          />
        ))}
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="controls-panel">
      <h2 style={{color: 'var(--neon-cyan)', textShadow: 'var(--glow-cyan)'}}>Review Hasil Foto</h2>
      <div className="status-bar" style={{marginBottom: '1rem', width: 'auto', padding: '10px 20px'}}>
        <div className="status-item">
          <span className="status-label">Sisa Kesempatan Retake</span>
          <span className="status-value pink">{retakesLeft}</span>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', marginBottom: '20px' }}>
        {photos.map((p, idx) => (
          <div key={idx} style={{ position: 'relative' }}>
            <img 
              src={p} 
              className="preview-thumbnail" 
              style={{width: '120px', height: '90px', border: '3px solid var(--text-muted)'}} 
              alt={`Shot ${idx+1}`} 
            />
            {retakesLeft > 0 && (
              <button 
                onClick={() => handleRetake(idx)}
                style={{
                  position: 'absolute', bottom: '-15px', left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--neon-pink)', color: '#fff', border: 'none', borderRadius: '20px',
                  padding: '5px 12px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold',
                  boxShadow: '0 0 10px var(--neon-pink)'
                }}
              >
                Retake
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="action-buttons">
        <button className="btn-neon" onClick={() => {
            // By default, select all photos
            setSelectedPhotosIndices(photos.map((_, i) => i));
            setPhase('edit');
        }}>
          LANJUT KE PEMILIHAN FRAME
        </button>
      </div>
    </div>
  );

  const renderEdit = () => (
    <div className="controls-panel">
      <h2 style={{color: 'var(--neon-cyan)', marginBottom: '0.5rem', textShadow: 'var(--glow-cyan)'}}>Pilih & Edit Frame</h2>
      <p style={{marginBottom: '1rem', color: 'var(--text-muted)'}}>Pilih foto mana saja yang ingin dimasukkan ke frame.</p>
      
      <div style={{width: '100%', textAlign: 'left', background: 'var(--panel-bg)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,0,234,0.3)', boxShadow: 'var(--glow-pink)'}}>
        
        {/* Photo Selection */}
        <div style={{marginBottom: '20px'}}>
          <label style={{display: 'block', marginBottom: '10px', color: 'var(--neon-cyan)', fontWeight: '600'}}>1. Pilih Foto ({selectedPhotosIndices.length} terpilih):</label>
          <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center'}}>
            {photos.map((p, idx) => {
              const isSelected = selectedPhotosIndices.includes(idx);
              return (
                <div 
                  key={idx} 
                  onClick={() => togglePhotoSelection(idx)}
                  style={{
                    position: 'relative', cursor: 'pointer',
                    border: isSelected ? '3px solid var(--neon-cyan)' : '3px solid transparent',
                    borderRadius: '8px', padding: '2px', transition: 'all 0.2s'
                  }}
                >
                  <img src={p} style={{width: '80px', height: '60px', borderRadius: '4px', objectFit: 'cover', opacity: isSelected ? 1 : 0.5}} alt={`Select ${idx}`} />
                  {isSelected && (
                    <div style={{position: 'absolute', top: '-8px', right: '-8px', background: 'var(--neon-cyan)', color: '#000', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px'}}>
                      ✓
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Template Selection */}
        <div style={{marginBottom: '20px'}}>
          <label style={{display: 'block', marginBottom: '10px', color: 'var(--neon-cyan)', fontWeight: '600'}}>2. Pilih Layout Frame:</label>
          <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
            {['3-frame', '6-frame', '12-frame'].map(tpl => (
              <button 
                key={tpl}
                className={`btn-neon ${selectedTemplate === tpl ? 'btn-neon-pink' : ''}`}
                style={{padding: '10px 15px', fontSize: '0.9rem', flex: 1, minWidth: '100px'}}
                onClick={() => setSelectedTemplate(tpl)}
              >
                {tpl === '3-frame' ? '3 Frame' : tpl === '6-frame' ? '6 Frame' : '12 Frame'}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Text */}
        <div style={{marginBottom: '20px'}}>
          <label style={{display: 'block', marginBottom: '10px', color: 'var(--neon-cyan)', fontWeight: '600'}}>3. Teks Kustom (Opsional):</label>
          <input 
            type="text" 
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Misal: Graduation 2026!"
            style={{
              width: '100%', padding: '12px', borderRadius: '8px', 
              background: '#000', color: '#fff', border: '1px solid var(--text-muted)',
              outline: 'none', fontFamily: 'Outfit', fontSize: '1rem'
            }}
          />
        </div>

        {/* Output Toggle */}
        <div style={{marginBottom: '20px'}}>
          <label style={{display: 'block', marginBottom: '10px', color: 'var(--neon-cyan)', fontWeight: '600'}}>4. Jenis Hasil:</label>
          <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
            <label style={{display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '10px 15px', background: '#000', borderRadius: '8px', border: makeFrame ? '1px solid var(--neon-cyan)' : '1px solid transparent'}}>
              <input 
                type="checkbox" 
                checked={makeFrame}
                onChange={(e) => setMakeFrame(e.target.checked)}
                style={{width: '20px', height: '20px', accentColor: 'var(--neon-cyan)', cursor: 'pointer'}}
              />
              <span style={{fontSize: '1rem'}}>Cetak Frame Foto</span>
            </label>
            <label style={{display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '10px 15px', background: '#000', borderRadius: '8px', border: makeGif ? '1px solid var(--neon-pink)' : '1px solid transparent'}}>
              <input 
                type="checkbox" 
                checked={makeGif}
                onChange={(e) => setMakeGif(e.target.checked)}
                style={{width: '20px', height: '20px', accentColor: 'var(--neon-pink)', cursor: 'pointer'}}
              />
              <span style={{fontSize: '1rem'}}>Buat Animasi GIF</span>
            </label>
          </div>
        </div>

        <div className="action-buttons" style={{marginTop: '20px', justifyContent: 'space-between'}}>
          <button className="btn-neon" style={{borderColor: 'var(--text-muted)', color: 'var(--text-muted)', boxShadow: 'none'}} onClick={() => { setPhase('review'); }}>
            KEMBALI
          </button>
          <button className="btn-neon" onClick={handleGenerate} disabled={isUploading || selectedPhotosIndices.length === 0 || (!makeFrame && !makeGif)}>
            {isUploading ? 'MEMPROSES...' : 'SELESAI & LIHAT HASIL'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderResult = () => {
    const photosList = selectedPhotosIndices.map(i => photos[i]);

    return (
      <div className="controls-panel" style={{textAlign: 'center', width: '100%', maxWidth: '1000px'}}>
        <h2 style={{color: 'var(--neon-cyan)', textShadow: 'var(--glow-cyan)', marginBottom: '20px'}}>Hasil Anda Sudah Siap!</h2>
        
        <div style={{display: 'flex', flexWrap: 'wrap', gap: '40px', justifyContent: 'center', alignItems: 'flex-start'}}>
          {makeFrame && finalImage && (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px'}}>
              <h3 style={{color: 'var(--text-muted)'}}>Photostrip</h3>
              <img src={finalImage} alt="Final Frame" style={{height: '350px', objectFit: 'contain', border: '2px solid var(--neon-cyan)', borderRadius: '8px', boxShadow: 'var(--glow-cyan)'}} />
              <a href={finalImage} download="photobooth-frame.jpg" className="btn-neon" style={{fontSize: '0.9rem', padding: '10px 20px', textDecoration: 'none'}}>
                DOWNLOAD FOTO
              </a>
            </div>
          )}
          
          {makeGif && photosList.length > 0 && (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px'}}>
              <h3 style={{color: 'var(--text-muted)'}}>Animasi GIF</h3>
              <img src={photosList[gifFrameIndex]} alt="GIF Preview" style={{width: '262px', height: '350px', objectFit: 'cover', border: '2px solid var(--neon-pink)', borderRadius: '8px', boxShadow: 'var(--glow-pink)'}} />
              <a href={photosList[0]} download="photobooth-gif-placeholder.jpg" className="btn-neon btn-neon-pink" style={{fontSize: '0.9rem', padding: '10px 20px', textDecoration: 'none'}} onClick={(e) => {
                  alert("Untuk saat ini (Frontend Test), tombol Download GIF hanya mengunduh 1 gambar. Animasi GIF asli akan digenerate saat Backend di Fase 4 selesai.");
              }}>
                DOWNLOAD GIF
              </a>
            </div>
          )}

          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', background: 'var(--panel-bg)', padding: '25px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)'}}>
             <h3 style={{color: 'var(--neon-cyan)'}}>Simpan ke HP</h3>
             
             {!cloudQrUrl ? (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                 <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '200px', lineHeight: '1.4', marginBottom: '10px'}}>
                   Upload foto Anda ke Google Drive dan dapatkan QR Code untuk di-scan.
                 </p>
                 <button 
                    className="btn-neon" 
                    onClick={() => handleUploadToCloud(makeFrame ? 'frame' : 'gif')}
                    disabled={isUploadingCloud}
                 >
                   {isUploadingCloud ? 'MENGUPLOAD...' : 'UPLOAD & BUAT QR'}
                 </button>
               </div>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                 <img src={cloudQrUrl} alt="QR Code" style={{width: '180px', height: '180px', background: '#fff', padding: '15px', borderRadius: '8px'}} />
                 <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '200px', lineHeight: '1.4'}}>Scan QR ini dengan kamera HP Anda untuk mengunduh hasil.</p>
               </div>
             )}
          </div>
        </div>

        <div className="action-buttons" style={{marginTop: '40px', justifyContent: 'center'}}>
          <button className="btn-neon" onClick={() => { setPhase('idle'); setPhotos([]); }}>
            SELESAI & KEMBALI KE AWAL
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>NEON BOOTH</h1>
        <p>Tangkap Momen Terbaikmu</p>
      </header>
      
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        display: (phase === 'idle' || phase === 'session') ? 'flex' : 'none', 
        justifyContent: 'center' 
      }}>
        <CameraView ref={cameraRef} onPhotoTaken={handlePhotoTaken} />
        {countdown !== null && (
          <div className="countdown-display">{countdown}</div>
        )}
      </div>

      {phase === 'idle' && renderIdle()}
      {phase === 'session' && renderSession()}
      {phase === 'review' && renderReview()}
      {phase === 'edit' && renderEdit()}
      {phase === 'result' && renderResult()}
      
    </div>
  );
}

export default Photobooth;
