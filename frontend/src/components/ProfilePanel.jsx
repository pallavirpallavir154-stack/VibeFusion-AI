import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, Calendar, Trash2, ShieldAlert, 
  Sparkles, Music, Play, Pause, History, Award, Video, PlayCircle, Eye, Activity, User
} from 'lucide-react';
import api from '../services/api';
import VideoPlayer from './VideoPlayer';

export default function ProfilePanel({ user, favorites, onRefresh, onAuthPrompt, currentMood }) {
  const [activeFavType, setActiveFavType] = useState('meme');
  const [historyLogs, setHistoryLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  // Custom video recommendations
  const [recVideos, setRecVideos] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [playingCustomMemeId, setPlayingCustomMemeId] = useState(null);
  
  const audioRef = useRef(null);

  const calculateBadges = () => {
    const gamePlays = historyLogs.filter(log => log.action_type === 'submit_game_score' || log.action_type === 'submit_leaderboard_score').length || (analytics?.rhythmGameStats?.gamesPlayed || 0);
    const songPlays = historyLogs.filter(log => log.action_type === 'play_song' || log.action_type === 'complete_song').length;
    const memeFavorites = favorites.filter(f => f.item_type === 'meme').length;
    const moodChanges = historyLogs.filter(log => log.action_type === 'select_mood').length;
    const gestureUses = historyLogs.filter(log => log.action_type === 'use_gesture').length || (analytics?.dashboardStats?.totalGestures || 0);
    const chatbotInteractions = historyLogs.filter(log => log.action_type === 'chatbot_chat').length;

    return [
      {
        id: 'beat_explorer',
        title: 'Beat Explorer',
        description: 'Play at least 1 Rhythm Game challenge',
        requirement: `Progress: ${gamePlays}/1`,
        unlocked: gamePlays >= 1,
        icon: '🎮'
      },
      {
        id: 'music_master',
        title: 'Music Master',
        description: 'Listen to at least 5 vibe tracks',
        requirement: `Progress: ${songPlays}/5`,
        unlocked: songPlays >= 5,
        icon: '🎵'
      },
      {
        id: 'meme_king',
        title: 'Meme King',
        description: 'Save at least 3 memes to favorites',
        requirement: `Progress: ${memeFavorites}/3`,
        unlocked: memeFavorites >= 3,
        icon: '👑'
      },
      {
        id: 'vibe_expert',
        title: 'Vibe Expert',
        description: 'Switch mood states at least 5 times',
        requirement: `Progress: ${moodChanges}/5`,
        unlocked: moodChanges >= 5,
        icon: '✨'
      },
      {
        id: 'gesture_ninja',
        title: 'Gesture Ninja',
        description: 'Execute gesture controls at least 10 times',
        requirement: `Progress: ${gestureUses}/10`,
        unlocked: gestureUses >= 10,
        icon: '🥷'
      },
      {
        id: 'recommendation_guru',
        title: 'Recommendation Guru',
        description: 'Interact with AI Chatbot assistant at least 3 times',
        requirement: `Progress: ${chatbotInteractions}/3`,
        unlocked: chatbotInteractions >= 3,
        icon: '🧠'
      }
    ];
  };

  useEffect(() => {
    if (user) {
      loadUserData();
    }
    return () => {
      stopProfileAudio();
    };
  }, [user, favorites, currentMood]);

  const loadUserData = async () => {
    setLoadingLogs(true);
    try {
      // 1. Fetch user analytics telemetry
      const analRes = await api.analytics.get();
      setAnalytics(analRes);
      
      // 2. Fetch history log records
      const logs = await api.history.list();
      setHistoryLogs(logs);
      
      // 3. Fetch recommended videos synced to the active mood parameter prop
      const recs = await api.recommendations.get(currentMood || 'Happy');
      setRecVideos(recs.videos || []);
    } catch (err) {
      console.error('Failed to load user profile dataset.', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleRemoveFavorite = async (favId) => {
    try {
      await api.favorites.remove(favId);
      onRefresh(); // trigger reload on parent
      alert('Favorite removed successfully.');
    } catch (err) {
      console.error('Failed to delete favorite item.', err);
    }
  };

  const handleToggleMemeSoundtrack = (favMeme) => {
    if (playingCustomMemeId === favMeme.id) {
      stopProfileAudio();
    } else {
      stopProfileAudio();
      
      const songId = favMeme.item_extra?.songId;
      if (!songId) {
        alert('No soundtrack attached to this meme.');
        return;
      }
      
      const songUrls = {
        cyberpunk_cruise: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        rainy_cafe_lofi: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        sunny_breeze: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
        melancholy_dreams: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
        naatu_naatu: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
        samayama: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
        singara_siriye: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
        belageddu: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3'
      };

      const targetUrl = songUrls[songId];
      if (targetUrl) {
        audioRef.current = new Audio(targetUrl);
        audioRef.current.volume = 0.7;
        audioRef.current.loop = true;
        audioRef.current.play().catch(e => console.warn(e));
        setPlayingCustomMemeId(favMeme.id);
      }
    }
  };

  const stopProfileAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingCustomMemeId(null);
  };

  // Log video plays to build watch history automatically!
  const handleWatchVideo = async (video) => {
    try {
      await api.history.log({
        action_type: 'watch_video',
        item_id: video.id,
        mood: video.mood,
        details: { title: video.title }
      });
      // Fetch logs and update watch history immediately
      const logs = await api.history.list();
      setHistoryLogs(logs);
    } catch (e) {
      console.warn(e);
    }
  };

  const favSongs = favorites.filter(f => f.item_type === 'song');
  const favMemes = favorites.filter(f => f.item_type === 'meme');

  // Categorize log timelines
  const watchHistory = historyLogs.filter(log => log.action_type === 'watch_video');
  const moodHistory = historyLogs.filter(log => log.action_type === 'select_mood' || log.action_type === 'use_gesture');
  const totalInteractionsCount = historyLogs.length;

  if (!user) {
    return (
      <div className="glass-panel" style={{
        maxWidth: '550px', margin: '40px auto', padding: '40px 30px', 
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
      }}>
        <div style={{
          padding: '16px', borderRadius: '50%', background: 'rgba(255, 0, 127, 0.05)', 
          border: '1px dashed var(--accent-pink)', color: 'var(--accent-pink)', marginBottom: '24px'
        }}>
          <ShieldAlert size={44} className="animate-float" />
        </div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>Vibe Profile Locked</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '25px', maxWidth: '380px' }}>
          Connect an account to unlock regional favorites saving, high-score leaderboards, and personalized recommendation metrics!
        </p>
        <button onClick={onAuthPrompt} className="btn-neon" style={{ padding: '14px 28px' }}>
          Connect Vibe Identity
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* 1. IDENTITY & TELEMETRY SUMMARY HEADER */}
      <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr', gap: '30px', alignItems: 'center', flexWrap: 'wrap' }}>
        
        {/* User Card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderRight: '1px solid var(--glass-border)', paddingRight: '20px' }}>
          <div style={{ 
            width: '75px', height: '75px', borderRadius: '50%', 
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '2rem', fontWeight: 'bold',
            boxShadow: '0 0 20px var(--accent-cyan)'
          }}>
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 850 }}>{user.username}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <User size={12} /> Level 1 Beat Explorer
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Joined: {analytics?.dashboardStats?.userCreatedAt ? new Date(analytics.dashboardStats.userCreatedAt).toLocaleDateString() : 'June 2026'}
            </p>
          </div>
        </div>

        {/* Global Statistics metrics grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
            <Activity size={18} style={{ color: 'var(--accent-cyan)', marginBottom: '6px' }} />
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Interactions</span>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px' }}>{totalInteractionsCount}</p>
          </div>
          
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
            <Award size={18} style={{ color: 'var(--accent-pink)', marginBottom: '6px' }} />
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>High Score</span>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px' }}>{analytics?.rhythmGameStats?.highScore || 0} Pts</p>
          </div>

          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
            <Eye size={18} style={{ color: 'var(--accent-purple)', marginBottom: '6px' }} />
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Gestures Logged</span>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px' }}>{analytics?.dashboardStats?.totalGestures || 0}</p>
          </div>
        </div>
        
      </div>

      {/* 1.5 ACHIEVEMENT BADGES DECK */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award className="glow-text-cyan" /> Achievement Badges
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
          {calculateBadges().map(badge => (
            <div
              key={badge.id}
              style={{
                background: badge.unlocked 
                  ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.15), rgba(155, 81, 224, 0.15))' 
                  : 'rgba(255, 255, 255, 0.02)',
                border: badge.unlocked 
                  ? '1px solid var(--accent-cyan)' 
                  : '1px solid var(--glass-border)',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center',
                opacity: badge.unlocked ? 1 : 0.7,
                transition: 'var(--transition)',
                boxShadow: badge.unlocked ? '0 0 15px rgba(0, 242, 254, 0.15)' : 'none'
              }}
              className="hover:scale-105"
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{badge.icon}</div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: badge.unlocked ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                {badge.title}
              </h4>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', minHeight: '30px' }}>
                {badge.description}
              </p>
              <div 
                className={`badge ${badge.unlocked ? 'badge-cyan' : 'badge-purple'}`} 
                style={{ marginTop: '10px', fontSize: '0.6rem', display: 'inline-block' }}
              >
                {badge.unlocked ? 'Unlocked' : badge.requirement}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. MAIN CORE LAYOUT SPLIT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', alignItems: 'start' }}>
        
        {/* Saved Favorites Column */}
        <div className="glass-panel" style={{ minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Heart className="glow-text-pink" fill="var(--accent-pink)" /> Vibe Favorites Vault
            </h3>

            <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
              <button
                onClick={() => { setActiveFavType('meme'); stopProfileAudio(); }}
                style={{
                  border: 'none', padding: '6px 12px', borderRadius: '7px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                  backgroundColor: activeFavType === 'meme' ? 'var(--accent-pink)' : 'transparent',
                  color: activeFavType === 'meme' ? '#fff' : 'var(--text-secondary)',
                  transition: 'var(--transition)'
                }}
              >
                🖼️ Memes ({favMemes.length})
              </button>
              <button
                onClick={() => { setActiveFavType('song'); stopProfileAudio(); }}
                style={{
                  border: 'none', padding: '6px 12px', borderRadius: '7px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                  backgroundColor: activeFavType === 'song' ? 'var(--accent-cyan)' : 'transparent',
                  color: activeFavType === 'song' ? '#fff' : 'var(--text-secondary)',
                  transition: 'var(--transition)'
                }}
              >
                🎵 Songs ({favSongs.length})
              </button>
            </div>
          </div>

          {activeFavType === 'meme' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', overflowY: 'auto', flexGrow: 1, maxHeight: '400px' }}>
              {favMemes.length > 0 ? (
                favMemes.map(meme => {
                  const isPlayingSoundtrack = playingCustomMemeId === meme.id;
                  return (
                    <div key={meme.id} className="glass-panel" style={{
                      padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: 'fit-content',
                      border: isPlayingSoundtrack ? '2px solid var(--accent-cyan)' : '1px solid var(--glass-border)',
                      boxShadow: isPlayingSoundtrack ? '0 0 20px rgba(0, 242, 254, 0.4)' : 'none',
                      animation: isPlayingSoundtrack ? 'beat 1.5s infinite alternate' : 'none'
                    }}>
                      <div style={{ position: 'relative', width: '100%', height: '140px', background: '#090815' }}>
                        <img src={meme.item_url} alt={meme.item_title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {meme.item_extra?.isCustom && (
                          <div style={{ position: 'absolute', top: '8px', left: '8px' }}>
                            <span className="badge badge-purple" style={{ fontSize: '0.55rem' }}>Custom</span>
                          </div>
                        )}
                      </div>

                      <div style={{ padding: '12px' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {meme.item_title}
                        </h4>
                        {meme.item_extra?.songTitle && (
                          <p style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                            <Music size={10} /> {meme.item_extra.songTitle}
                          </p>
                        )}

                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                          {meme.item_extra?.songId && (
                            <button
                              onClick={() => handleToggleMemeSoundtrack(meme)}
                              className="btn-neon"
                              style={{ flex: 3, padding: '6px', fontSize: '0.75rem', borderRadius: '7px', justifyContent: 'center' }}
                            >
                              {isPlayingSoundtrack ? <Pause size={12} /> : <Play size={12} />} {isPlayingSoundtrack ? 'Pause' : 'Play Soundtrack'}
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveFavorite(meme.id)}
                            style={{
                              flex: 1, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                              borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'var(--accent-pink)'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No saved memes in favorites.
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flexGrow: 1, maxHeight: '400px' }}>
              {favSongs.length > 0 ? (
                favSongs.map(song => (
                  <div key={song.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
                    <img src={song.item_extra?.image || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=100&q=80'} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                    <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {song.item_title}
                      </h4>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {song.item_extra?.artist || 'Unknown Artist'} • <span className="glow-text-cyan">{song.item_extra?.genre || 'Melody'}</span>
                      </p>
                    </div>
                    <button 
                      onClick={() => handleRemoveFavorite(song.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-pink)', cursor: 'pointer', padding: '6px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No saved songs in favorites.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Unified Activity Timeline Column */}
        <div className="glass-panel" style={{ height: '550px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History className="glow-text-cyan" /> Unified Activity Timeline
          </h3>
          
          <div style={{ overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '15px', paddingRight: '6px' }}>
            {[...historyLogs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).length > 0 ? (
              [...historyLogs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((log) => {
                let icon = '⚡';
                let actionText = '';
                let colorClass = 'var(--accent-cyan)';

                if (log.action_type === 'play_song') {
                  icon = '🎵';
                  actionText = `Played track: ${log.item_id?.replace('_', ' ') || 'vibe track'}`;
                  colorClass = 'var(--accent-cyan)';
                } else if (log.action_type === 'watch_video') {
                  icon = '🎥';
                  actionText = `Watched video challenge: ${log.details?.title || log.item_id}`;
                  colorClass = 'var(--accent-cyan)';
                } else if (log.action_type === 'select_mood') {
                  icon = '✨';
                  actionText = `Set mood vibe to: ${log.mood}`;
                  colorClass = 'var(--accent-yellow)';
                } else if (log.action_type === 'use_gesture') {
                  icon = '🖐️';
                  actionText = `AI Gesture '${log.gesture}' triggered ${log.mood || 'interaction'}`;
                  colorClass = 'var(--accent-green)';
                } else if (log.action_type === 'chatbot_chat') {
                  icon = '💬';
                  actionText = `Chatbot: "${log.details?.user_message || 'Hello'}"`;
                  colorClass = 'var(--accent-purple)';
                } else if (log.action_type === 'session_start') {
                  icon = '🚀';
                  actionText = 'New workspace session initialized';
                  colorClass = 'var(--accent-pink)';
                } else if (log.action_type === 'session_duration') {
                  icon = '⏱️';
                  actionText = `Session duration update: ${Math.floor((log.details?.elapsed_seconds || 0) / 60)} min active`;
                  colorClass = 'var(--text-secondary)';
                } else if (log.action_type === 'search') {
                  icon = '🔍';
                  actionText = `Searched: "${log.details?.query || ''}"`;
                  colorClass = 'var(--accent-cyan)';
                } else if (log.action_type === 'submit_game_score' || log.action_type === 'submit_leaderboard_score') {
                  icon = '🎮';
                  actionText = `Rhythm Game score: ${log.details?.score || 0} pts`;
                  colorClass = 'var(--accent-pink)';
                } else {
                  actionText = `${log.action_type.replace('_', ' ')}`;
                }

                return (
                  <div key={log.id} style={{ display: 'flex', gap: '12px', borderLeft: '2px solid rgba(255,255,255,0.05)', paddingLeft: '16px', marginLeft: '8px', position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: '-13px',
                      top: '2px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--bg-secondary)',
                      border: `1.5px solid ${colorClass}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      boxShadow: `0 0 8px ${colorClass}`
                    }}>
                      {icon}
                    </div>
                    <div>
                      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                        {actionText}
                      </p>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
                        {new Date(log.created_at).toLocaleDateString()} at {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0', fontSize: '0.85rem' }}>
                No telemetry activity logs logged in this workspace session yet.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 3. INTERACTIVE RECOMMENDED VIDEOS GRID */}
      <div className="glass-panel">
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Video className="glow-text-cyan" /> Intelligent Recommendation Dance & Rhythm Video Challenges
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {recVideos.length > 0 ? (
            recVideos.map(vid => (
              <div key={vid.id} className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <VideoPlayer 
                  video={vid} 
                  onPlay={handleWatchVideo} 
                />
                
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                      {vid.title}
                    </h4>
                    <span className="badge badge-cyan" style={{ fontSize: '0.6rem' }}>{vid.confidence}% Match</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <PlayCircle size={12} className="glow-text-cyan" /> {vid.reason}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    BPM: <strong style={{ color: 'var(--accent-purple)' }}>{vid.bpm}</strong> | Difficulty: <span className="badge badge-cyan" style={{ fontSize: '0.55rem', padding: '1px 3px' }}>{vid.difficulty}</span> | Lang: <span className="badge badge-purple" style={{ fontSize: '0.55rem', padding: '1px 3px' }}>{vid.language}</span>
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0', fontSize: '0.85rem' }}>
              Select a mood vibe to generate custom video challenges.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
