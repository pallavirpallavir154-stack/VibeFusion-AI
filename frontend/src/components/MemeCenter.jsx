import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Heart, Download, Music, RefreshCw, Search } from 'lucide-react';
import api from '../services/api';

const TEMPLATES = [
  { id: 'distracted_dev', name: 'Distracted Boyfriend (Dev Edition)', url: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&q=80' },
  { id: 'brahmi_shocked', name: 'Brahmanandam Epic Shock (Tollywood)', url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&q=80' },
  { id: 'sunil_confused', name: 'Sunil Confused Comedy (Tollywood)', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&q=80' },
  { id: 'kgf_attitude', name: 'Yash KGF Attitude (Sandalwood)', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80' },
  { id: 'kirik_party', name: 'Kirik Party College Vibe (Sandalwood)', url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80' }
];

const MOCK_SOUNDTRACKS = [
  // Global
  { id: 'cyberpunk_cruise', title: 'Cyberpunk Cruise (Synthwave)' },
  { id: 'rainy_cafe_lofi', title: 'Rainy Cafe Lofi Beat' },
  // Telugu
  { id: 'naatu_naatu', title: 'Naatu Naatu (RRR)' },
  { id: 'samayama', title: 'Samayama (Hi Nanna)' },
  // Kannada
  { id: 'singara_siriye', title: 'Singara Siriye (Kantara)' },
  { id: 'belageddu', title: 'Belageddu (Kirik Party)' },
  // Hindi
  { id: 'nacho_nacho', title: 'Nacho Nacho (RRR)' },
  { id: 'hindi_lofi', title: 'Bollywood Sunset Lofi' },
  // Spanish
  { id: 'despacito_vibe', title: 'Despacito Rhythm' },
  // K-Pop
  { id: 'dynamite_kpop', title: 'Dynamite K-Pop Vibe' }
];

export default function MemeCenter({ recommendations, user, favorites, onRefresh }) {
  const canvasRef = useRef(null);
  
  const [activeSubTab, setActiveSubTab] = useState('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('All'); // All, English, Telugu, Kannada
  
  // Meme Creator states
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [topText, setTopText] = useState('WRITE AMAZING CODE');
  const [bottomText, setBottomText] = useState('IT WORKS ON MY MACHINE');
  const [linkedSongId, setLinkedSongId] = useState(MOCK_SOUNDTRACKS[0].id);
  const [canvasLoading, setCanvasLoading] = useState(false);

  useEffect(() => {
    if (activeSubTab === 'creator') {
      drawMeme();
    }
  }, [selectedTemplate, topText, bottomText, activeSubTab]);

  const drawMeme = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    setCanvasLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = selectedTemplate.url;
    
    img.onload = () => {
      canvas.width = 600;
      canvas.height = 450;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Draw text settings (Standard bold meme font)
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.textAlign = 'center';
      ctx.font = '900 34px "Space Grotesk", Impact, Arial';
      
      ctx.textBaseline = 'top';
      ctx.strokeText(topText.toUpperCase(), canvas.width / 2, 20);
      ctx.fillText(topText.toUpperCase(), canvas.width / 2, 20);
      
      ctx.textBaseline = 'bottom';
      ctx.strokeText(bottomText.toUpperCase(), canvas.width / 2, canvas.height - 20);
      ctx.fillText(bottomText.toUpperCase(), canvas.width / 2, canvas.height - 20);
      
      setCanvasLoading(false);
    };

    img.onerror = () => {
      console.error('Failed to pre-load image template.');
      setCanvasLoading(false);
    };
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `memebeatai_${selectedTemplate.id}.png`;
    link.href = url;
    link.click();
    
    api.history.log({
      action_type: 'view_meme',
      item_id: selectedTemplate.id,
      details: { action: 'download_meme_creator' }
    }).catch(() => {});
  };

  const handleToggleFavoriteMeme = async (meme) => {
    if (!user) {
      alert('Please login first to save memes to your favorites.');
      return;
    }

    const isFav = favorites.find(f => f.item_id === meme.id && f.item_type === 'meme');

    try {
      if (isFav) {
        await api.favorites.removeByItem('meme', meme.id);
      } else {
        await api.favorites.add({
          item_type: 'meme',
          item_id: meme.id,
          item_title: meme.title,
          item_url: meme.url,
          item_extra: { category: meme.category, mood: meme.mood, language: meme.language }
        });
      }
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle favorite.', err);
    }
  };

  const handleSaveCreatorMeme = async () => {
    if (!user) {
      alert('Please login first to save your custom memes!');
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    
    try {
      const songTitle = MOCK_SOUNDTRACKS.find(s => s.id === linkedSongId)?.title || 'No Audio';
      
      await api.favorites.add({
        item_type: 'meme',
        item_id: `custom_${Date.now()}`,
        item_title: `${topText} | ${bottomText}`,
        item_url: dataUrl,
        item_extra: {
          template: selectedTemplate.name,
          songId: linkedSongId,
          songTitle: songTitle,
          isCustom: true
        }
      });
      alert('Custom Meme with soundtrack saved to Profile Favorites successfully!');
      onRefresh();
    } catch (err) {
      console.error('Failed to save customized meme.', err);
    }
  };

  // Perform search AND language filtering simultaneously!
  const filteredMemes = recommendations.filter(meme => {
    const matchesSearch = meme.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          meme.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLanguage = selectedLanguage === 'All' || meme.language === selectedLanguage;
    
    return matchesSearch && matchesLanguage;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button 
            className={`btn-neon-outline ${activeSubTab === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('feed')}
            style={{
              backgroundColor: activeSubTab === 'feed' ? 'rgba(0, 242, 254, 0.1)' : 'transparent',
              borderColor: activeSubTab === 'feed' ? 'var(--accent-cyan)' : 'var(--glass-border)'
            }}
          >
            🔥 AI Recommended Queue
          </button>
          
          <button 
            className={`btn-neon-outline ${activeSubTab === 'liked' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('liked')}
            style={{
              backgroundColor: activeSubTab === 'liked' ? 'rgba(255, 0, 127, 0.1)' : 'transparent',
              borderColor: activeSubTab === 'liked' ? 'var(--accent-pink)' : 'var(--glass-border)'
            }}
          >
            ❤️ My Liked Memes ({favorites.filter(f => f.item_type === 'meme').length})
          </button>

          <button 
            className={`btn-neon-outline ${activeSubTab === 'creator' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('creator')}
            style={{
              backgroundColor: activeSubTab === 'creator' ? 'rgba(155, 81, 224, 0.1)' : 'transparent',
              borderColor: activeSubTab === 'creator' ? 'var(--accent-purple)' : 'var(--glass-border)'
            }}
          >
            🎨 Soundtrack Meme Studio
          </button>
        </div>

        {activeSubTab === 'feed' && (
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            
            {/* Language filter toolbar */}
            <div className="glass-panel" style={{ padding: '6px 12px', display: 'flex', gap: '6px', borderRadius: '12px' }}>
              {['All', ...new Set(recommendations.map(m => m.language).filter(Boolean))].map(lang => (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  style={{
                    border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                    backgroundColor: selectedLanguage === lang ? 'var(--accent-cyan)' : 'transparent',
                    color: selectedLanguage === lang ? '#080711' : 'var(--text-primary)'
                  }}
                >
                  {lang}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Search comedy..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {activeSubTab === 'feed' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' }}>
          {filteredMemes.length > 0 ? (
            filteredMemes.map(meme => {
              const isFav = favorites.some(f => f.item_id === meme.id && f.item_type === 'meme');
              return (
                <div key={meme.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0', overflow: 'hidden' }}>
                  <div style={{ position: 'relative', width: '100%', height: '220px', background: '#0b0a1a' }}>
                    <img 
                      src={meme.url} 
                      alt={meme.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                      <span className="badge badge-cyan">{meme.confidence}% AI Match</span>
                      <span className="badge badge-purple" style={{ textTransform: 'uppercase' }}>{meme.language}</span>
                    </div>
                    <button 
                      onClick={() => handleToggleFavoriteMeme(meme)}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(5, 4, 15, 0.65)',
                        backdropFilter: 'blur(5px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isFav ? 'var(--accent-pink)' : '#fff',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      <Heart fill={isFav ? 'var(--accent-pink)' : 'none'} size={18} />
                    </button>
                  </div>
                  
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexGrow: 1 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>{meme.category}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--accent-pink)', fontWeight: 700 }}>
                          <Heart size={12} fill="var(--accent-pink)" /> {isFav ? (meme.likes || 128) + 1 : (meme.likes || 128)}
                        </div>
                      </div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '8px 0', lineHeight: 1.4 }}>
                        {meme.title}
                      </h4>
                    </div>
                    
                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '12px', marginTop: '12px' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sparkles size={12} className="glow-text-cyan" /> {meme.reason}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', color: 'var(--text-secondary)', padding: '60px 0', fontSize: '0.9rem' }}>
              No memes match this language filter or search query. Try another tab!
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'liked' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' }}>
          {favorites.filter(f => f.item_type === 'meme').length > 0 ? (
            favorites.filter(f => f.item_type === 'meme').map(favMeme => {
              const memeRepresentation = {
                id: favMeme.item_id,
                title: favMeme.item_title,
                url: favMeme.item_url,
                category: favMeme.item_extra?.category || 'Custom Meme',
                language: favMeme.item_extra?.language || 'Global',
                confidence: 95,
                reason: 'Added to your favorited Vibe Vault!'
              };
              return (
                <div key={favMeme.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0', overflow: 'hidden', border: '1px solid var(--accent-pink)' }}>
                  <div style={{ position: 'relative', width: '100%', height: '220px', background: '#0b0a1a' }}>
                    <img 
                      src={memeRepresentation.url} 
                      alt={memeRepresentation.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                      <span className="badge badge-pink">Liked</span>
                      <span className="badge badge-purple" style={{ textTransform: 'uppercase' }}>{memeRepresentation.language}</span>
                    </div>
                    <button 
                      onClick={() => handleToggleFavoriteMeme(memeRepresentation)}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(5, 4, 15, 0.65)',
                        backdropFilter: 'blur(5px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-pink)',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      <Heart fill="var(--accent-pink)" size={18} />
                    </button>
                  </div>
                  
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexGrow: 1 }}>
                    <div>
                      <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>{memeRepresentation.category}</span>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '8px 0', lineHeight: 1.4 }}>
                        {memeRepresentation.title}
                      </h4>
                    </div>
                    
                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '12px', marginTop: '12px' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sparkles size={12} className="glow-text-cyan" /> {memeRepresentation.reason}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', color: 'var(--text-secondary)', padding: '60px 0', fontSize: '0.9rem' }}>
              No liked memes yet! Tap the ❤️ button on memes in the Recommended Queue to populate your liked deck.
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'creator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', alignItems: 'start' }}>
          
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, alignSelf: 'flex-start', marginBottom: '16px' }}>
              Preview Output Canvas
            </h3>
            
            <div style={{ position: 'relative', width: '100%', maxWidth: '600px', aspectRatio: '4/3', background: '#050410', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
              <canvas 
                ref={canvasRef} 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              
              {canvasLoading && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5, 4, 10, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--accent-cyan)' }} />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', width: '100%', gap: '15px', marginTop: '20px' }}>
              <button onClick={handleDownload} className="btn-neon-outline" style={{ flex: 1, justifyContent: 'center' }}>
                <Download size={16} /> Save PNG to Disk
              </button>
              
              <button onClick={handleSaveCreatorMeme} className="btn-neon" style={{ flex: 1, justifyContent: 'center' }}>
                <Heart size={16} /> Save to Vibe Favorites
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Creator Control Deck</h3>
            
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Select Image Template (Tollywood/Sandalwood/Global)
              </label>
              <select
                value={selectedTemplate.id}
                onChange={(e) => setSelectedTemplate(TEMPLATES.find(t => t.id === e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '0.85rem'
                }}
              >
                {TEMPLATES.map(t => (
                  <option key={t.id} value={t.id} style={{ background: 'var(--bg-secondary)', color: '#fff' }}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Top Heading Text
              </label>
              <input 
                type="text" 
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                maxLength={40}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Bottom Caption Text
              </label>
              <input 
                type="text" 
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                maxLength={40}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Attach Vibe Background Soundtrack (Tollywood/Sandalwood/Global)
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Music size={18} className="glow-text-cyan" />
                <select
                  value={linkedSongId}
                  onChange={(e) => setLinkedSongId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '10px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.85rem'
                  }}
                >
                  {MOCK_SOUNDTRACKS.map(s => (
                    <option key={s.id} value={s.id} style={{ background: 'var(--bg-secondary)', color: '#fff' }}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
