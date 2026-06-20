import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Heart, 
  Volume2, ListMusic, Sparkles, RefreshCw 
} from 'lucide-react';
import api from '../services/api';

export default function MusicCenter({ recommendations, user, favorites, onRefresh, activeTrackId, setActiveTrackId }) {
  const audioRef = useRef(null);
  const visualizerCanvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [trackProgress, setTrackProgress] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [selectedLanguage, setSelectedLanguage] = useState('All'); // All, English, Telugu, Kannada

  // Recently & Most Played state trackers
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [mostPlayed, setMostPlayed] = useState([]);
  const [activeTabSub, setActiveTabSub] = useState('queue'); // 'queue', 'recent', 'most_played'
  const [explainOpen, setExplainOpen] = useState(false);

  // Handle active filters dynamically
  const filteredRecommendations = recommendations.filter(song => 
    selectedLanguage === 'All' || song.language === selectedLanguage
  );

  const activeTrack = filteredRecommendations[currentTrackIndex] || null;

  // Track listening metrics for telemetry
  useEffect(() => {
    if (activeTrack && isPlaying) {
      setRecentlyPlayed(prev => {
        const filtered = prev.filter(t => t.id !== activeTrack.id);
        return [activeTrack, ...filtered].slice(0, 8);
      });
      setMostPlayed(prev => {
        const existing = prev.find(t => t.id === activeTrack.id);
        if (existing) {
          const updated = prev.map(t => t.id === activeTrack.id ? { ...t, count: t.count + 1 } : t);
          return updated.sort((a, b) => b.count - a.count);
        } else {
          return [...prev, { ...activeTrack, count: 1 }].sort((a, b) => b.count - a.count);
        }
      });
    }
  }, [activeTrack?.id, isPlaying]);

  // ML Gesture Trigger: auto play song mapped from hook steps
  useEffect(() => {
    if (activeTrackId && recommendations.length > 0) {
      const index = filteredRecommendations.findIndex(s => s.id === activeTrackId);
      if (index !== -1) {
        setCurrentTrackIndex(index);
        setIsPlaying(true);
      } else {
        // Fallback: search whole list if filtered recommendations didn't have it
        const idxAll = recommendations.findIndex(s => s.id === activeTrackId);
        if (idxAll !== -1) {
          setSelectedLanguage('All');
          setTimeout(() => {
            setCurrentTrackIndex(idxAll);
            setIsPlaying(true);
          }, 50);
        }
      }
      if (setActiveTrackId) setActiveTrackId(null);
    }
  }, [activeTrackId, recommendations]);

  useEffect(() => {
    // Reset track index if recommendation filters trigger
    setCurrentTrackIndex(0);
    setIsPlaying(false);
  }, [selectedLanguage, recommendations]);

  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.play().catch((e) => {
        console.warn('Audio play request blocked.', e);
        setIsPlaying(false);
      });
      startVisualizer();
    } else {
      audioRef.current.pause();
      stopVisualizer();
    }
  }, [isPlaying, currentTrackIndex, activeTrack]);

  useEffect(() => {
    return () => {
      stopVisualizer();
    };
  }, []);

  const handlePlayPause = () => {
    if (!activeTrack) return;
    setIsPlaying(!isPlaying);
    
    if (!isPlaying) {
      api.history.log({
        action_type: 'play_song',
        item_id: activeTrack.id,
        mood: activeTrack.mood
      }).catch(() => {});
    }
  };

  const handleNext = () => {
    if (filteredRecommendations.length === 0) return;
    setCurrentTrackIndex((currentTrackIndex + 1) % filteredRecommendations.length);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (filteredRecommendations.length === 0) return;
    setCurrentTrackIndex((currentTrackIndex - 1 + filteredRecommendations.length) % filteredRecommendations.length);
    setIsPlaying(true);
  };

  const handleProgressChange = (e) => {
    const newTime = parseFloat(e.target.value);
    setTrackProgress(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setTrackProgress(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setTrackDuration(audioRef.current.duration);
    }
  };

  const handleToggleFavoriteSong = async (song) => {
    if (!user) {
      alert('Please login first to save songs to your favorites.');
      return;
    }

    const isFav = favorites.find(f => f.item_id === song.id && f.item_type === 'song');

    try {
      if (isFav) {
        await api.favorites.removeByItem('song', song.id);
      } else {
        await api.favorites.add({
          item_type: 'song',
          item_id: song.id,
          item_title: song.title,
          item_url: song.url,
          item_extra: { artist: song.artist, genre: song.genre, mood: song.mood, image: song.image }
        });
      }
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle favorite.', err);
    }
  };

  const startVisualizer = () => {
    if (!visualizerCanvasRef.current) return;
    const canvas = visualizerCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let phase = 0;
    
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const bars = 36;
      const spacing = 4;
      const barWidth = (canvas.width - (bars * spacing)) / bars;
      
      phase += 0.08;
      
      for (let i = 0; i < bars; i++) {
        const amplitude = 30 + Math.sin(i * 0.15 + phase) * 20;
        const noise = Math.random() * 15;
        const height = isPlaying ? amplitude + noise : 4;
        
        const x = i * (barWidth + spacing);
        const y = canvas.height - height;
        
        const gradient = ctx.createLinearGradient(x, y, x, canvas.height);
        gradient.addColorStop(0, '#00f2fe');
        gradient.addColorStop(1, '#9b51e0');
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = isPlaying ? 12 : 0;
        ctx.shadowColor = '#00f2fe';
        
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, [4, 4, 0, 0]);
        ctx.fill();
      }
      
      animationFrameRef.current = requestAnimationFrame(render);
    };
    
    render();
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (visualizerCanvasRef.current) {
      const canvas = visualizerCanvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      const bars = 36;
      const spacing = 4;
      const barWidth = (canvas.width - (bars * spacing)) / bars;
      for (let i = 0; i < bars; i++) {
        ctx.fillRect(i * (barWidth + spacing), canvas.height - 4, barWidth, 4);
      }
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', alignItems: 'start' }}>
      
      {/* 1. CORE PLAYER CARD */}
      <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Vibe Sound Deck</h3>
          {activeTrack && (
            <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={10} /> {activeTrack.confidence}% Match
            </span>
          )}
        </div>

        {activeTrack && (
          <audio 
            ref={audioRef}
            src={activeTrack.url}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onEnded={handleNext}
          />
        )}

        <div style={{ position: 'relative', width: '220px', height: '220px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 15px 35px rgba(0,0,0,0.5)', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.1)' }}>
          {activeTrack ? (
            <img 
              src={activeTrack.image} 
              alt={activeTrack.title} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#0e0d20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw className="animate-spin" size={32} />
            </div>
          )}
          
          {isPlaying && (
            <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--accent-cyan)', borderRadius: '24px', animation: 'beat 1.5s infinite alternate' }} />
          )}
        </div>

        {activeTrack ? (
          <div style={{ textAlign: 'center', marginBottom: '20px', width: '100%' }}>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeTrack.title}
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              {activeTrack.artist} • <span className="glow-text-cyan">{activeTrack.genre}</span>
            </p>
          </div>
        ) : (
          <div style={{ height: '50px', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            No tracks in localized queue.
          </div>
        )}

        <div style={{ width: '100%', height: '70px', marginBottom: '25px' }}>
          <canvas 
            ref={visualizerCanvasRef} 
            width={340} 
            height={70} 
            style={{ width: '100%', height: '100%', background: 'transparent' }} 
          />
        </div>

        <div style={{ width: '100%', marginBottom: '24px' }}>
          <input 
            type="range" 
            min={0}
            max={trackDuration || 100}
            value={trackProgress}
            onChange={handleProgressChange}
            style={{
              width: '100%',
              height: '5px',
              borderRadius: '3px',
              background: 'rgba(255,255,255,0.08)',
              outline: 'none',
              cursor: 'pointer',
              accentColor: 'var(--accent-cyan)'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            <span>{formatTime(trackProgress)}</span>
            <span>{formatTime(trackDuration)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '25px', marginBottom: '25px' }}>
          <button 
            onClick={handlePrev}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', transition: 'var(--transition)' }}
            className="hover:scale-110"
          >
            <SkipBack size={24} />
          </button>
          
          <button 
            onClick={handlePlayPause}
            style={{
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
              border: 'none',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(0,242,254,0.4)',
              transition: 'var(--transition)'
            }}
            className="hover:scale-105"
          >
            {isPlaying ? <Pause size={28} fill="white" /> : <Play size={28} fill="white" style={{ marginLeft: '4px' }} />}
          </button>

          <button 
            onClick={handleNext}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', transition: 'var(--transition)' }}
            className="hover:scale-110"
          >
            <SkipForward size={24} />
          </button>
        </div>

        <div style={{ width: '100%', borderTop: '1px solid var(--glass-border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '60%' }}>
            <Volume2 size={16} style={{ color: 'var(--text-secondary)' }} />
            <input 
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolumeChange}
              style={{
                width: '100%',
                height: '4px',
                accentColor: 'var(--accent-purple)',
                background: 'rgba(255,255,255,0.08)'
              }}
            />
          </div>

          {activeTrack && (
            <button
              onClick={() => handleToggleFavoriteSong(activeTrack)}
              className="btn-neon-outline"
              style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.8rem' }}
            >
              <Heart 
                size={14} 
                fill={favorites.some(f => f.item_id === activeTrack.id && f.item_type === 'song') ? 'var(--accent-pink)' : 'none'} 
                style={{ color: favorites.some(f => f.item_id === activeTrack.id && f.item_type === 'song') ? 'var(--accent-pink)' : 'currentColor' }}
              /> Favorite
            </button>
          )}
        </div>

        {/* Collapsible AI Explanation Panel */}
        {activeTrack && (
          <div style={{ width: '100%', marginTop: '20px', borderTop: '1px dashed var(--glass-border)', paddingTop: '15px' }}>
            <button
              onClick={() => setExplainOpen(!explainOpen)}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--glass-border)',
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                color: 'var(--accent-cyan)',
                fontFamily: 'var(--font-heading)',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={12} /> AI Vibe Recommendation Analysis
              </span>
              <span>{explainOpen ? '▲' : '▼'}</span>
            </button>
            {explainOpen && (
              <div style={{
                background: 'rgba(0, 242, 254, 0.03)',
                border: '1px solid rgba(0, 242, 254, 0.1)',
                padding: '12px',
                borderRadius: '10px',
                marginTop: '8px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.4'
              }}>
                <ul style={{ paddingLeft: '14px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {activeTrack.reasons && activeTrack.reasons.length > 0 ? (
                    activeTrack.reasons.map((r, i) => <li key={i}>{r}</li>)
                  ) : (
                    <li>{activeTrack.reason || "Matches your current mood vibe perfectly."}</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

      </div>

      {/* 2. DYNAMIC REGIONAL PLAYLIST QUEUE */}
      <div className="glass-panel" style={{ height: '640px', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ListMusic className="glow-text-cyan" /> Music Queue & Playlists
          </h3>

          {/* Sub-Playlist Navigation */}
          <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--glass-border)', width: '100%', paddingBottom: '8px' }}>
            <button
              onClick={() => setActiveTabSub('queue')}
              style={{
                background: 'none', border: 'none', color: activeTabSub === 'queue' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', paddingBottom: '4px',
                borderBottom: activeTabSub === 'queue' ? '2px solid var(--accent-cyan)' : 'none'
              }}
            >
              Vibe Queue
            </button>
            <button
              onClick={() => setActiveTabSub('recent')}
              style={{
                background: 'none', border: 'none', color: activeTabSub === 'recent' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', paddingBottom: '4px',
                borderBottom: activeTabSub === 'recent' ? '2px solid var(--accent-cyan)' : 'none'
              }}
            >
              Recently Played
            </button>
            <button
              onClick={() => setActiveTabSub('most_played')}
              style={{
                background: 'none', border: 'none', color: activeTabSub === 'most_played' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', paddingBottom: '4px',
                borderBottom: activeTabSub === 'most_played' ? '2px solid var(--accent-cyan)' : 'none'
              }}
            >
              Most Played
            </button>
          </div>
          
          {/* Language filter tab bar (Only for main queue) */}
          {activeTabSub === 'queue' && (
            <div className="glass-panel" style={{ padding: '4px 8px', display: 'flex', gap: '4px', borderRadius: '10px', border: '1px solid var(--glass-border)', width: '100%', overflowX: 'auto' }}>
              {['All', ...new Set(recommendations.map(song => song.language).filter(Boolean))].map(lang => (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  style={{
                    flex: '1 0 auto', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                    backgroundColor: selectedLanguage === lang ? 'var(--accent-cyan)' : 'transparent',
                    color: selectedLanguage === lang ? '#080711' : 'var(--text-secondary)'
                  }}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
          
          {/* QUEUE TAB */}
          {activeTabSub === 'queue' && (
            filteredRecommendations.length > 0 ? (
              filteredRecommendations.map((song, idx) => {
                const isCurrent = song.id === activeTrack?.id;
                return (
                  <div
                    key={song.id}
                    onClick={() => {
                      const realIdx = filteredRecommendations.findIndex(s => s.id === song.id);
                      if (realIdx !== -1) {
                        setCurrentTrackIndex(realIdx);
                        setIsPlaying(true);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '12px',
                      background: isCurrent ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255,255,255,0.02)',
                      border: isCurrent ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                    className="hover:bg-white/5"
                  >
                    <img 
                      src={song.image} 
                      alt={song.title} 
                      style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }} 
                    />
                    <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isCurrent ? 'var(--accent-cyan)' : '#fff' }}>
                        {song.title}
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {song.artist} • <span className="badge badge-purple" style={{ fontSize: '0.5rem', padding: '1px 3px' }}>{song.language}</span>
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-purple)' }}>{song.confidence}%</span>
                      <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Match</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                No tracks available in this queue.
              </div>
            )
          )}

          {/* RECENTLY PLAYED TAB */}
          {activeTabSub === 'recent' && (
            recentlyPlayed.length > 0 ? (
              recentlyPlayed.map((song) => {
                const isCurrent = song.id === activeTrack?.id;
                return (
                  <div
                    key={`recent-${song.id}`}
                    onClick={() => {
                      const idx = filteredRecommendations.findIndex(s => s.id === song.id);
                      if (idx !== -1) {
                        setCurrentTrackIndex(idx);
                        setIsPlaying(true);
                      } else {
                        setSelectedLanguage('All');
                        setTimeout(() => {
                          const idxAll = recommendations.findIndex(s => s.id === song.id);
                          if (idxAll !== -1) {
                            setCurrentTrackIndex(idxAll);
                            setIsPlaying(true);
                          }
                        }, 50);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '12px',
                      background: isCurrent ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255,255,255,0.02)',
                      border: isCurrent ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                    className="hover:bg-white/5"
                  >
                    <img 
                      src={song.image} 
                      alt={song.title} 
                      style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }} 
                    />
                    <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isCurrent ? 'var(--accent-cyan)' : '#fff' }}>
                        {song.title}
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {song.artist} • <span className="badge badge-purple" style={{ fontSize: '0.5rem', padding: '1px 3px' }}>{song.language}</span>
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                No recently played tracks in this session.
              </div>
            )
          )}

          {/* MOST PLAYED TAB */}
          {activeTabSub === 'most_played' && (
            mostPlayed.length > 0 ? (
              mostPlayed.map((song) => {
                const isCurrent = song.id === activeTrack?.id;
                return (
                  <div
                    key={`most-${song.id}`}
                    onClick={() => {
                      const idx = filteredRecommendations.findIndex(s => s.id === song.id);
                      if (idx !== -1) {
                        setCurrentTrackIndex(idx);
                        setIsPlaying(true);
                      } else {
                        setSelectedLanguage('All');
                        setTimeout(() => {
                          const idxAll = recommendations.findIndex(s => s.id === song.id);
                          if (idxAll !== -1) {
                            setCurrentTrackIndex(idxAll);
                            setIsPlaying(true);
                          }
                        }, 50);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '12px',
                      background: isCurrent ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255,255,255,0.02)',
                      border: isCurrent ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                    className="hover:bg-white/5"
                  >
                    <img 
                      src={song.image} 
                      alt={song.title} 
                      style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }} 
                    />
                    <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isCurrent ? 'var(--accent-cyan)' : '#fff' }}>
                        {song.title}
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {song.artist} • <span className="badge badge-purple" style={{ fontSize: '0.5rem', padding: '1px 3px' }}>{song.language}</span>
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{song.count} plays</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Play some tracks to build your preferences list!
              </div>
            )
          )}

        </div>
      </div>

    </div>
  );
}
