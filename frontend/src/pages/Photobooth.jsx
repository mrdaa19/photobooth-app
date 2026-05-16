import { useState, useRef, useEffect, useCallback } from 'react'
import '../App.css'
import CameraView from '../components/CameraView'

const getSettings = () => { try { return JSON.parse(localStorage.getItem('pb_settings') || '{}'); } catch { return {}; } };

const LAYOUTS = {
  strip:           { label: 'Digital Strip',    count: 3, desc: '3 foto vertikal' },
  strip_double:    { label: 'Double Strip',      count: 3, desc: '3 foto ×2 (print ready)' },
  '6_grid':        { label: 'Classic Grid',      count: 6, desc: '6 foto grid 2×3' },
  '6_grid_double': { label: 'Double Strip 6',    count: 6, desc: '6 foto → 2 strip (3+3)' },
};

function drawBackground(ctx, w, h, theme, cc) {
  const c = cc?.[theme] || {};
  ctx.clearRect(0, 0, w, h);
  if (theme === 'theme_01') {
    ctx.fillStyle = c.bg||'#164e63'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = c.accent||'#ef4444'; ctx.beginPath(); ctx.arc(w,0,300,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = c.accent2||'#eab308'; ctx.beginPath(); ctx.arc(0,h-300,250,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = c.accent3||'#f97316'; ctx.save(); ctx.translate(w/2,h/2); ctx.rotate(15*Math.PI/180); ctx.fillRect(-150,-400,300,800); ctx.restore();
  } else if (theme === 'theme_02') {
    ctx.fillStyle = c.bg||'#ffedd5'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = c.accent||'#1e3a8a'; ctx.beginPath(); ctx.arc(w*.2,h*.2,350,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = c.accent2||'#f97316'; ctx.beginPath(); ctx.arc(w*.8,h*.7,400,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ec4899'; ctx.beginPath(); ctx.arc(w*.9,h*.3,150,0,Math.PI*2); ctx.fill();
  } else {
    const pc = theme==='theme_03'?(c.bg||'#1d4ed8'):(c.bg||'#16a34a'), sz=60;
    for(let y=0;y<h;y+=sz) for(let x=0;x<w;x+=sz){ ctx.fillStyle=((x/sz+y/sz)%2===0)?pc:'#fff'; ctx.fillRect(x,y,sz,sz); }
  }
}

function drawFrame(ctx, img, x, y, w, h, theme, cc) {
  const c=cc?.[theme]||{}, pad=20;
  ctx.shadowBlur=0; ctx.shadowOffsetY=0;
  if(theme==='theme_01'){ctx.fillStyle='#fff';ctx.strokeStyle=c.accent||'#ef4444';ctx.lineWidth=10;ctx.fillRect(x-pad,y-pad,w+pad*2,h+pad*2);ctx.strokeRect(x-pad,y-pad,w+pad*2,h+pad*2);}
  else if(theme==='theme_02'){ctx.fillStyle='#fff';ctx.strokeStyle=c.accent||'#1e3a8a';ctx.lineWidth=8;ctx.fillRect(x-pad,y-pad,w+pad*2,h+pad*2);ctx.strokeRect(x-pad,y-pad,w+pad*2,h+pad*2);}
  else{ctx.fillStyle='#fff';ctx.shadowColor='rgba(0,0,0,0.5)';ctx.shadowBlur=20;ctx.shadowOffsetY=10;ctx.fillRect(x-pad,y-pad,w+pad*2,h+pad*2);ctx.shadowBlur=0;ctx.shadowOffsetY=0;}
  const ir=img.width/img.height,br=w/h;
  let sx=0,sy=0,sw=img.width,sh=img.height;
  if(ir>br){sw=img.height*br;sx=(img.width-sw)/2;}else{sh=img.width/br;sy=(img.height-sh)/2;}
  ctx.save(); ctx.translate(x+w,y); ctx.scale(-1,1); ctx.drawImage(img,sx,sy,sw,sh,0,0,w,h); ctx.restore();
}

function drawBrand(ctx,cx,y,theme,text,cc){
  const c=cc?.[theme]||{};ctx.textAlign='center';ctx.shadowBlur=0;
  if(theme==='theme_01'){ctx.fillStyle=c.accent||'#ef4444';ctx.font="900 52px 'Outfit',sans-serif";ctx.fillText(text||'TAKE IT EASY',cx,y+40);}
  else if(theme==='theme_02'){ctx.fillStyle=c.accent||'#1e3a8a';ctx.font="900 52px 'Outfit',sans-serif";ctx.fillText(text||'DAYS',cx,y+50);}
  else{const col=theme==='theme_03'?(c.bg||'#1d4ed8'):(c.bg||'#16a34a');ctx.fillStyle=col;ctx.fillRect(cx-160,y,320,75);ctx.fillStyle='#fff';ctx.font="900 40px 'Outfit',sans-serif";ctx.fillText(text||'MOMENT',cx,y+52);}
}

async function generateCanvas(photos, layout, theme, brandText, cc) {
  const wide = layout!=='strip';
  const cW=wide?1200:600, cH=1800;
  const canvas=document.createElement('canvas'); canvas.width=cW; canvas.height=cH;
  const ctx=canvas.getContext('2d');
  drawBackground(ctx,cW,cH,theme,cc);
  const imgs=await Promise.all(photos.map(src=>new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.src=src;})));
  const W=500,H=460,GAP=40,TOP=80,FY=1620;
  if(layout==='strip'){
    imgs.forEach((img,i)=>drawFrame(ctx,img,50,TOP+i*(H+GAP),W,H,theme,cc));
    drawBrand(ctx,300,FY,theme,brandText,cc);
  } else if(layout==='6_grid'){
    imgs.forEach((img,i)=>{const col=i%2,row=Math.floor(i/2);drawFrame(ctx,img,70+col*(W+60),TOP+row*(H+60),W,H,theme,cc);});
    drawBrand(ctx,600,FY,theme,brandText,cc);
  } else if(layout==='strip_double'){
    ctx.strokeStyle='rgba(0,0,0,0.4)';ctx.setLineDash([20,20]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(600,0);ctx.lineTo(600,cH);ctx.stroke();ctx.setLineDash([]);
    imgs.forEach((img,i)=>{const y=TOP+i*(H+GAP);drawFrame(ctx,img,50,y,W,H,theme,cc);drawFrame(ctx,img,650,y,W,H,theme,cc);});
    drawBrand(ctx,300,FY,theme,brandText,cc);drawBrand(ctx,900,FY,theme,brandText,cc);
  } else if(layout==='6_grid_double'){
    // Left strip: photos 0,1,2 | Right strip: photos 3,4,5
    ctx.strokeStyle='rgba(0,0,0,0.4)';ctx.setLineDash([20,20]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(600,0);ctx.lineTo(600,cH);ctx.stroke();ctx.setLineDash([]);
    [0,1,2].forEach(i=>drawFrame(ctx,imgs[i],50,TOP+i*(H+GAP),W,H,theme,cc));
    [3,4,5].forEach(i=>drawFrame(ctx,imgs[i],650,TOP+(i-3)*(H+GAP),W,H,theme,cc));
    drawBrand(ctx,300,FY,theme,brandText,cc);drawBrand(ctx,900,FY,theme,brandText,cc);
  }
  return canvas.toDataURL('image/jpeg',0.92);
}

function Photobooth(){
  const cameraRef=useRef(null);
  const [selectedLayout,setSelectedLayout]=useState('strip');
  const [selectedTheme,setSelectedTheme]=useState('theme_01');
  const [sessionConfig,setSessionConfig]=useState({total:3,retakes:1});
  const [photos,setPhotos]=useState([]);
  const [retakesLeft,setRetakesLeft]=useState(0);
  const [countdown,setCountdown]=useState(null);
  const [isCapturing,setIsCapturing]=useState(false);
  const [phase,setPhase]=useState('idle');
  const [retakeIndex,setRetakeIndex]=useState(null);
  const [selectedPhotosIndices,setSelectedPhotosIndices]=useState([]);
  const [customText,setCustomText]=useState('');
  const [makeGif,setMakeGif]=useState(false);
  const [makeFrame,setMakeFrame]=useState(true);
  const [isUploading,setIsUploading]=useState(false);
  const [finalImage,setFinalImage]=useState(null);
  const [gifFrameIndex,setGifFrameIndex]=useState(0);
  const [cloudQrUrl,setCloudQrUrl]=useState(null);
  const [isUploadingCloud,setIsUploadingCloud]=useState(false);

  const startCapture=useCallback(()=>{
    if(isCapturing)return;
    setIsCapturing(true);let count=3;setCountdown(count);
    const t=setInterval(()=>{count-=1;if(count>0)setCountdown(count);else{clearInterval(t);setCountdown(null);cameraRef.current?.takePhoto();}},1000);
  },[isCapturing]);

  useEffect(()=>{
    if(phase==='session'&&!isCapturing&&countdown===null){
      if(retakeIndex!==null){const t=setTimeout(()=>startCapture(),1000);return()=>clearTimeout(t);}
      else if(photos.length<sessionConfig.total){const t=setTimeout(()=>startCapture(),1500);return()=>clearTimeout(t);}
      else if(photos.length===sessionConfig.total){setPhase('review');}}
  },[phase,photos.length,sessionConfig.total,isCapturing,countdown,retakeIndex,startCapture]);

  useEffect(()=>{
    if(phase==='result'&&makeGif&&selectedPhotosIndices.length>0){
      const iv=setInterval(()=>setGifFrameIndex(p=>(p+1)%selectedPhotosIndices.length),500);
      return()=>clearInterval(iv);
    }
  },[phase,makeGif,selectedPhotosIndices.length]);

  const handlePhotoTaken=url=>{
    setIsCapturing(false);
    if(retakeIndex!==null){setPhotos(p=>{const n=[...p];n[retakeIndex]=url;return n;});setRetakeIndex(null);setPhase('review');}
    else setPhotos(p=>[...p,url]);
  };

  const startSession=layout=>{
    const s=getSettings();
    const total=LAYOUTS[layout].count;
    setSelectedLayout(layout);setSessionConfig({total,retakes:total===6?3:1});
    setRetakesLeft(total===6?3:1);setPhotos([]);setRetakeIndex(null);setPhase('session');
    setSelectedPhotosIndices([]);setCustomText(s.defaultText||'');
    setSelectedTheme(s.defaultTheme||'theme_01');setMakeGif(false);setMakeFrame(true);
    setFinalImage(null);setCloudQrUrl(null);
  };

  const handleRetake=idx=>{if(retakesLeft>0){setRetakesLeft(p=>p-1);setRetakeIndex(idx);setPhase('session');}};
  const togglePhoto=idx=>setSelectedPhotosIndices(p=>p.includes(idx)?p.filter(i=>i!==idx):[...p,idx]);

  const handleGenerate=async()=>{
    if(selectedPhotosIndices.length===0)return alert('Pilih minimal 1 foto!');
    if(!makeFrame&&!makeGif)return alert('Pilih minimal 1 jenis hasil!');
    setIsUploading(true);
    try{
      const s=getSettings();const cc=s.themeColors||{};
      const photosList=selectedPhotosIndices.map(i=>photos[i]);
      if(makeFrame){const d=await generateCanvas(photosList,selectedLayout,selectedTheme,customText,cc);setFinalImage(d);}
      else setFinalImage(null);
      setPhase('result');
    }catch(e){console.error(e);alert('Gagal memproses gambar.');}
    setIsUploading(false);
  };

  const handleUpload=async()=>{
    setIsUploadingCloud(true);
    try{
      const res=await fetch('http://localhost:3001/api/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:finalImage,type:'frame'})});
      const r=await res.json();
      if(r.success&&r.data.webViewLink)setCloudQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(r.data.webViewLink)}`);
      else alert('Gagal upload.');
    }catch(e){console.error(e);alert('Error saat upload.');}
    setIsUploadingCloud(false);
  };

  const THEME_INFO={theme_01:{label:'01·Retro',bg:'#164e63'},theme_02:{label:'02·Pastel',bg:'#ffedd5'},theme_03:{label:'03·Blue',bg:'#1d4ed8'},theme_04:{label:'04·Green',bg:'#16a34a'}};

  const renderIdle=()=>(
    <div className="controls-panel">
      <h2 style={{color:'var(--neon-cyan)',textShadow:'var(--glow-cyan)'}}>Pilih Layout Frame</h2>
      <p style={{color:'var(--text-muted)',marginBottom:'1rem'}}>Sesuaikan dengan gayamu.</p>
      <div style={{display:'flex',gap:'14px',flexWrap:'wrap',justifyContent:'center'}}>
        {Object.entries(LAYOUTS).map(([key,info])=>(
          <button key={key} onClick={()=>startSession(key)} style={{background:'#1a1a24',border:'2px solid rgba(0,243,255,0.3)',borderRadius:'16px',padding:'20px 16px',cursor:'pointer',color:'#fff',width:'180px',textAlign:'left',transition:'all 0.3s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor='var(--neon-cyan)'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(0,243,255,0.3)'}>
            <div style={{fontWeight:'800',fontSize:'1rem',marginBottom:'6px'}}>{info.label}</div>
            <div style={{color:'var(--text-muted)',fontSize:'0.8rem',marginBottom:'8px'}}>{info.desc}</div>
            <div style={{fontSize:'0.75rem',color:'var(--neon-pink)'}}>{info.count} foto · {info.count===6?'3':'1'} retake</div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderSession=()=>(
    <div className="controls-panel">
      <div className="status-bar">
        <div className="status-item"><span className="status-label">Foto Ke</span>
          <span className="status-value">{retakeIndex!==null?retakeIndex+1:Math.min(photos.length+1,sessionConfig.total)}/{sessionConfig.total}</span></div>
        {retakeIndex!==null&&<div className="status-item"><span className="status-label">Mode</span><span className="status-value pink">RETAKE</span></div>}
      </div>
      <div className="photo-strip-preview">
        {photos.map((p,i)=><img key={i} src={p} className={`preview-thumbnail${i===photos.length-1&&retakeIndex===null?' latest':''}`} alt={`Shot ${i+1}`}/>)}
      </div>
    </div>
  );

  const renderReview=()=>(
    <div className="controls-panel">
      <h2 style={{color:'var(--neon-cyan)',textShadow:'var(--glow-cyan)'}}>Review Hasil Foto</h2>
      <div className="status-bar" style={{marginBottom:'1rem',width:'auto',padding:'10px 20px'}}>
        <div className="status-item"><span className="status-label">Sisa Retake</span><span className="status-value pink">{retakesLeft}</span></div>
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:'20px',justifyContent:'center',marginBottom:'20px'}}>
        {photos.map((p,i)=>(
          <div key={i} style={{position:'relative'}}>
            <img src={p} className="preview-thumbnail" style={{width:'120px',height:'90px',border:'3px solid var(--text-muted)'}} alt={`Shot ${i+1}`}/>
            {retakesLeft>0&&<button onClick={()=>handleRetake(i)} style={{position:'absolute',bottom:'-15px',left:'50%',transform:'translateX(-50%)',background:'var(--neon-pink)',color:'#fff',border:'none',borderRadius:'20px',padding:'5px 12px',fontSize:'0.8rem',cursor:'pointer',fontWeight:'bold'}}>Retake</button>}
          </div>
        ))}
      </div>
      <button className="btn-neon" onClick={()=>{setSelectedPhotosIndices(photos.map((_,i)=>i));setPhase('edit');}}>LANJUT KE PEMILIHAN FRAME</button>
    </div>
  );

  const renderEdit=()=>{
    const s=getSettings();const cc=s.themeColors||{};
    return(
      <div className="controls-panel">
        <h2 style={{color:'var(--neon-cyan)',marginBottom:'0.5rem',textShadow:'var(--glow-cyan)'}}>Pilih & Edit Frame</h2>
        <div style={{width:'100%',background:'var(--panel-bg)',padding:'20px',borderRadius:'12px',border:'1px solid rgba(255,0,234,0.3)',boxShadow:'var(--glow-pink)'}}>

          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',marginBottom:'10px',color:'var(--neon-cyan)',fontWeight:'600'}}>1. Pilih Foto ({selectedPhotosIndices.length} terpilih):</label>
            <div style={{display:'flex',gap:'10px',flexWrap:'wrap',justifyContent:'center'}}>
              {photos.map((p,i)=>{const sel=selectedPhotosIndices.includes(i);return(
                <div key={i} onClick={()=>togglePhoto(i)} style={{position:'relative',cursor:'pointer',border:sel?'3px solid var(--neon-cyan)':'3px solid transparent',borderRadius:'8px',padding:'2px',transition:'all 0.2s'}}>
                  <img src={p} style={{width:'80px',height:'60px',borderRadius:'4px',objectFit:'cover',opacity:sel?1:0.5}} alt={`Select ${i}`}/>
                  {sel&&<div style={{position:'absolute',top:'-8px',right:'-8px',background:'var(--neon-cyan)',color:'#000',borderRadius:'50%',width:'24px',height:'24px',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'bold',fontSize:'12px'}}>✓</div>}
                </div>
              );})}
            </div>
          </div>

          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',marginBottom:'10px',color:'var(--neon-cyan)',fontWeight:'600'}}>2. Pilih Tema Frame:</label>
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
              {Object.entries(THEME_INFO).map(([key,info])=>{
                const bg=(cc[key]?.bg)||info.bg;
                return(
                  <div key={key} onClick={()=>setSelectedTheme(key)} style={{cursor:'pointer',borderRadius:'10px',overflow:'hidden',border:selectedTheme===key?'3px solid var(--neon-cyan)':'3px solid transparent',transition:'all 0.2s',textAlign:'center'}}>
                    <div style={{width:'65px',height:'100px',background:bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'4px',padding:'6px'}}>
                      {[0,1,2].map(j=><div key={j} style={{width:'100%',flex:1,background:'rgba(255,255,255,0.85)',borderRadius:'2px'}}/>)}
                    </div>
                    <div style={{fontSize:'0.65rem',padding:'3px',color:selectedTheme===key?'var(--neon-cyan)':'var(--text-muted)'}}>{info.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',marginBottom:'10px',color:'var(--neon-cyan)',fontWeight:'600'}}>3. Teks Kustom (Opsional):</label>
            <input type="text" value={customText} onChange={e=>setCustomText(e.target.value)} placeholder={s.defaultText||'Misal: MPLS 2026!'}
              style={{width:'100%',padding:'12px',borderRadius:'8px',background:'#000',color:'#fff',border:'1px solid var(--text-muted)',outline:'none',fontFamily:'Outfit',fontSize:'1rem'}}/>
          </div>

          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',marginBottom:'10px',color:'var(--neon-cyan)',fontWeight:'600'}}>4. Jenis Hasil:</label>
            <div style={{display:'flex',gap:'20px',flexWrap:'wrap'}}>
              <label style={{display:'flex',alignItems:'center',gap:'12px',cursor:'pointer',padding:'10px 15px',background:'#000',borderRadius:'8px',border:makeFrame?'1px solid var(--neon-cyan)':'1px solid transparent'}}>
                <input type="checkbox" checked={makeFrame} onChange={e=>setMakeFrame(e.target.checked)} style={{width:'20px',height:'20px',accentColor:'var(--neon-cyan)',cursor:'pointer'}}/>
                <span>Cetak Frame Foto</span>
              </label>
              <label style={{display:'flex',alignItems:'center',gap:'12px',cursor:'pointer',padding:'10px 15px',background:'#000',borderRadius:'8px',border:makeGif?'1px solid var(--neon-pink)':'1px solid transparent'}}>
                <input type="checkbox" checked={makeGif} onChange={e=>setMakeGif(e.target.checked)} style={{width:'20px',height:'20px',accentColor:'var(--neon-pink)',cursor:'pointer'}}/>
                <span>Buat Animasi GIF</span>
              </label>
            </div>
          </div>

          <div className="action-buttons" style={{marginTop:'20px',justifyContent:'space-between'}}>
            <button className="btn-neon" style={{borderColor:'var(--text-muted)',color:'var(--text-muted)',boxShadow:'none'}} onClick={()=>setPhase('review')}>KEMBALI</button>
            <button className="btn-neon" onClick={handleGenerate} disabled={isUploading||selectedPhotosIndices.length===0||(!makeFrame&&!makeGif)}>
              {isUploading?'MEMPROSES...':'SELESAI & LIHAT HASIL'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderResult=()=>{
    const photosList=selectedPhotosIndices.map(i=>photos[i]);
    return(
      <div className="controls-panel" style={{textAlign:'center',width:'100%',maxWidth:'1000px'}}>
        <h2 style={{color:'var(--neon-cyan)',textShadow:'var(--glow-cyan)',marginBottom:'20px'}}>Hasil Anda Sudah Siap!</h2>
        <div style={{display:'flex',flexWrap:'wrap',gap:'40px',justifyContent:'center',alignItems:'flex-start'}}>
          {makeFrame&&finalImage&&(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'15px'}}>
              <h3 style={{color:'var(--text-muted)'}}>Photostrip</h3>
              <img src={finalImage} alt="Final Frame" style={{height:'350px',objectFit:'contain',border:'2px solid var(--neon-cyan)',borderRadius:'8px',boxShadow:'var(--glow-cyan)'}}/>
              <a href={finalImage} download="photobooth-frame.jpg" className="btn-neon" style={{fontSize:'0.9rem',padding:'10px 20px',textDecoration:'none'}}>DOWNLOAD FOTO</a>
            </div>
          )}
          {makeGif&&photosList.length>0&&(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'15px'}}>
              <h3 style={{color:'var(--text-muted)'}}>Animasi GIF</h3>
              <img src={photosList[gifFrameIndex]} alt="GIF Preview" style={{width:'200px',height:'267px',objectFit:'cover',border:'2px solid var(--neon-pink)',borderRadius:'8px',boxShadow:'var(--glow-pink)'}}/>
              <a href={photosList[0]} download="photobooth-gif.jpg" className="btn-neon btn-neon-pink" style={{fontSize:'0.9rem',padding:'10px 20px',textDecoration:'none'}}
                onClick={e=>{e.preventDefault();alert('GIF asli akan digenerate saat backend selesai.');}}>DOWNLOAD GIF</a>
            </div>
          )}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'15px',background:'var(--panel-bg)',padding:'25px',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.1)'}}>
            <h3 style={{color:'var(--neon-cyan)'}}>Simpan ke HP</h3>
            {!cloudQrUrl?(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'10px'}}>
                <p style={{fontSize:'0.9rem',color:'var(--text-muted)',maxWidth:'200px',lineHeight:'1.4'}}>Upload ke Google Drive & dapatkan QR Code.</p>
                <button className="btn-neon" onClick={handleUpload} disabled={isUploadingCloud}>{isUploadingCloud?'MENGUPLOAD...':'UPLOAD & BUAT QR'}</button>
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'10px'}}>
                <img src={cloudQrUrl} alt="QR" style={{width:'180px',height:'180px',background:'#fff',padding:'15px',borderRadius:'8px'}}/>
                <p style={{fontSize:'0.85rem',color:'var(--text-muted)',maxWidth:'200px',lineHeight:'1.4'}}>Scan QR untuk download.</p>
              </div>
            )}
          </div>
        </div>
        <div className="action-buttons" style={{marginTop:'40px',justifyContent:'center'}}>
          <button className="btn-neon" onClick={()=>{setPhase('idle');setPhotos([]);}}>SELESAI & KEMBALI KE AWAL</button>
        </div>
      </div>
    );
  };

  return(
    <div className="app-container">
      <header className="header"><h1>NEON BOOTH</h1><p>Tangkap Momen Terbaikmu</p></header>
      <div style={{position:'relative',width:'100%',display:(phase==='idle'||phase==='session')?'flex':'none',justifyContent:'center'}}>
        <CameraView ref={cameraRef} onPhotoTaken={handlePhotoTaken} showGuide={selectedLayout==='strip_double'||selectedLayout==='6_grid_double'}/>
        {countdown!==null&&<div className="countdown-display">{countdown}</div>}
      </div>
      {phase==='idle'&&renderIdle()}
      {phase==='session'&&renderSession()}
      {phase==='review'&&renderReview()}
      {phase==='edit'&&renderEdit()}
      {phase==='result'&&renderResult()}
    </div>
  );
}

export default Photobooth;
