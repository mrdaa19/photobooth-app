import { useState, useEffect } from 'react';
import '../App.css'; // Reusing some CSS
import { Link } from 'react-router-dom';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('gallery');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'gallery') {
      setLoading(true);
      fetch('http://localhost:3001/api/history')
        .then(res => res.json())
        .then(data => {
          setHistory(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [activeTab]);

  return (
    <div className="admin-container">
      
      {/* Sidebar */}
      <div className="admin-sidebar">
        <h2 style={{ color: 'var(--neon-cyan)', textShadow: 'var(--glow-cyan)', marginBottom: '30px', fontSize: '1.5rem', textAlign: 'center' }}>ADMIN PANEL</h2>
        
        <button 
          onClick={() => setActiveTab('gallery')}
          style={{ 
            background: activeTab === 'gallery' ? 'var(--neon-pink)' : 'transparent', 
            color: '#fff', border: 'none', padding: '15px', borderRadius: '8px', 
            marginBottom: '10px', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold',
            transition: 'all 0.3s'
          }}>
          📸 Galeri Foto
        </button>
        
        <button 
          onClick={() => setActiveTab('settings')}
          style={{ 
            background: activeTab === 'settings' ? 'var(--neon-cyan)' : 'transparent', 
            color: activeTab === 'settings' ? '#000' : '#fff', border: 'none', padding: '15px', borderRadius: '8px', 
            marginBottom: 'auto', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold',
            transition: 'all 0.3s'
          }}>
          ⚙️ Pengaturan
        </button>

        <Link to="/" style={{ textDecoration: 'none' }}>
          <button style={{ 
              width: '100%', background: '#333', color: '#fff', border: 'none', 
              padding: '15px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center'
            }}>
            Kembali ke Aplikasi
          </button>
        </Link>
      </div>

      {/* Main Content */}
      <div className="admin-content">
        {activeTab === 'gallery' && (
          <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Galeri Hasil</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Histori foto yang telah terunggah ke Google Drive.</p>
            
            {loading ? (
              <p>Memuat data...</p>
            ) : history.length === 0 ? (
              <p style={{ color: '#666' }}>Belum ada foto yang diunggah.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                {history.map((item, idx) => (
                  <div key={item.id || idx} style={{ background: '#1a1a24', padding: '15px', borderRadius: '12px', border: '1px solid #333' }}>
                    <div style={{ width: '150px', height: '200px', background: '#333', borderRadius: '8px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                       {item.type === 'gif' ? '🎞️ GIF' : '🖼️ FRAME'}
                    </div>
                    <div style={{ fontSize: '0.9rem', marginBottom: '5px' }}>{new Date(item.date).toLocaleDateString('id-ID')} {new Date(item.date).toLocaleTimeString('id-ID')}</div>
                    <a href={item.webViewLink} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--neon-cyan)', textDecoration: 'none', display: 'inline-block' }}>Lihat di GDrive</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Pengaturan Aplikasi</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Konfigurasi umum photobooth.</p>
            
            <div style={{ background: '#1a1a24', padding: '30px', borderRadius: '12px', border: '1px solid #333', maxWidth: '600px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Pesan Footer Default</label>
                <input type="text" defaultValue="Thanks for coming!" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#000', color: '#fff', border: '1px solid #444' }} />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Warna Tema Frame</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', background: '#111', borderRadius: '50%', border: '2px solid var(--neon-cyan)', cursor: 'pointer' }}></div>
                  <div style={{ width: '40px', height: '40px', background: '#fff', borderRadius: '50%', cursor: 'pointer' }}></div>
                  <div style={{ width: '40px', height: '40px', background: '#ec4899', borderRadius: '50%', cursor: 'pointer' }}></div>
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', accentColor: 'var(--neon-pink)' }} />
                  Kirim Otomatis ke Cloud (Opsi Global)
                </label>
              </div>

              <button className="btn-neon" style={{ marginTop: '20px' }} onClick={() => alert("Pengaturan disimpan (Dummy)")}>
                SIMPAN PENGATURAN
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default AdminDashboard;
