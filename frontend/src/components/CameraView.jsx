import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

const CameraView = forwardRef(({ onPhotoTaken }, ref) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [flash, setFlash] = useState(false);

  useImperativeHandle(ref, () => ({
    takePhoto: () => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        // Mirror the image horizontally
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        setFlash(true);
        setTimeout(() => setFlash(false), 500);
        
        onPhotoTaken(photoDataUrl);
      }
    }
  }));

  useEffect(() => {
    let activeStream = null;
    const startCamera = async () => {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: 'user'
          }, 
          audio: false 
        });
        setStream(activeStream);
        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Tidak dapat mengakses kamera. Pastikan Anda telah memberikan izin.");
      }
    };

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="camera-container">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="camera-video"
      />
      <div className="camera-overlay"></div>
      <div className={`flash-effect ${flash ? 'active' : ''}`}></div>
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
});

export default CameraView;
