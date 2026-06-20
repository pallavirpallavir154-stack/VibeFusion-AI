import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, ExternalLink, RefreshCw, AlertTriangle, Film } from 'lucide-react';

export default function VideoPlayer({ video, onPlay }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const iframeRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [useFallback, setUseFallback] = useState(video.allow_embedding === false);
  const [showPoster, setShowPoster] = useState(true);

  // Extract YouTube ID
  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYouTubeId(video.youtube_url || video.url);

  // Reset state when video changes
  useEffect(() => {
    setIsPlaying(false);
    setHasError(false);
    setUseFallback(video.allow_embedding === false);
    setShowPoster(true);
    setIsLoading(false);
  }, [video]);

  const handlePlayToggle = () => {
    if (showPoster) {
      setShowPoster(false);
      setIsPlaying(true);
      setIsLoading(true);
      if (onPlay) onPlay(video);
      return;
    }

    if (useFallback) {
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
        } else {
          videoRef.current.play().then(() => {
            setIsPlaying(true);
          }).catch(err => {
            console.error("Local MP4 Playback error:", err);
            setHasError(true);
          });
        }
      }
    } else {
      // YouTube Playback Toggle using postMessage command API
      const command = isPlaying ? 'pauseVideo' : 'playVideo';
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: command, args: [] }),
          '*'
        );
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);

    if (useFallback) {
      if (videoRef.current) {
        videoRef.current.muted = nextMute;
      }
    } else {
      const command = nextMute ? 'mute' : 'unMute';
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: command, args: [] }),
          '*'
        );
      }
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen().catch(err => {
          console.error("Error attempting to enable full-screen mode:", err);
        });
      }
    }
  };

  const handleVideoLoaded = () => {
    setIsLoading(false);
  };

  const handleVideoError = (e) => {
    console.error(`VibeFusion AI Video Playback Error on video '${video.title}':`, e);
    setHasError(true);
    setIsLoading(false);
    // Auto fallback to direct MP4 if YouTube embed fails
    if (!useFallback && video.fallback_url) {
      console.warn("YouTube player failed. Automatically engaging direct local MP4 fallback video.");
      setUseFallback(true);
      setShowPoster(false);
      setIsPlaying(true);
      setIsLoading(true);
    }
  };

  // Determine thumbnail image
  const getThumbnailUrl = () => {
    if (videoId && !useFallback) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    // High-quality mood-matching background placeholders for local MP4 files
    const moodImages = {
      Happy: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80',
      Sad: 'https://images.unsplash.com/photo-1446057032654-9d8885db76c6?w=600&q=80',
      Energetic: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
      Relaxed: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80',
      Focused: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80',
      Angry: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80',
      Excited: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&q=80'
    };
    return moodImages[video.mood] || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80';
  };

  return (
    <div 
      ref={containerRef}
      className="glass-panel" 
      style={{ 
        position: 'relative', width: '100%', padding: '0', 
        borderRadius: '16px', overflow: 'hidden', background: '#020108',
        border: '1px solid var(--glass-border)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
      }}
    >
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
        {showPoster ? (
          <div style={{ position: 'relative', width: '100%', height: '100%', cursor: 'pointer' }} onClick={handlePlayToggle}>
            <img 
              src={getThumbnailUrl()} 
              alt={video.title} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            {/* Play Button Overlay */}
            <div style={{ 
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s ease'
            }}
            className="play-overlay"
            >
              <div style={{ 
                width: '64px', height: '64px', borderRadius: '50%', 
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                boxShadow: '0 0 20px rgba(0, 242, 254, 0.6)', transition: 'all 0.2s ease'
              }}>
                <Play size={28} fill="#fff" style={{ marginLeft: '4px' }} />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Loading Spinner */}
            {isLoading && (
              <div style={{ 
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 
              }}>
                <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent-cyan)' }} />
              </div>
            )}

            {/* Error Message Display */}
            {hasError && (
              <div style={{ 
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                background: '#0d0707', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                zIndex: 6, padding: '20px', textAlign: 'center' 
              }}>
                <AlertTriangle size={40} style={{ color: 'var(--accent-pink)', marginBottom: '12px' }} />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px' }}>Playback Error</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                  This video failed to stream. Embedding permissions may have been restricted by the owner.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {video.fallback_url && (
                    <button 
                      onClick={() => { setUseFallback(true); setHasError(false); setIsLoading(true); }}
                      className="btn-neon"
                      style={{ padding: '8px 16px', fontSize: '0.75rem', borderRadius: '8px' }}
                    >
                      Play Local Fallback
                    </button>
                  )}
                  {videoId && (
                    <a 
                      href={`https://www.youtube.com/watch?v=${videoId}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-neon-outline"
                      style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}
                    >
                      Watch on YouTube <ExternalLink size={12} style={{ marginLeft: '4px' }} />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Render Iframe or Native Video tag */}
            {useFallback ? (
              <video
                ref={videoRef}
                src={video.fallback_url}
                autoPlay
                playsInline
                onLoadedData={handleVideoLoaded}
                onError={handleVideoError}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <iframe
                ref={iframeRef}
                src={`${video.youtube_url || video.url}?enablejsapi=1&autoplay=1&controls=1&mute=${isMuted ? 1 : 0}&origin=${window.location.origin}`}
                title={video.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onLoad={handleVideoLoaded}
                onError={handleVideoError}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            )}
          </>
        )}
      </div>

      {/* Premium custom control bar (Only shown when not showing poster and when it's not YouTube - or overlay controls if preferred) */}
      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
        padding: '12px 18px', background: 'rgba(5, 4, 15, 0.85)', backdropFilter: 'blur(5px)',
        borderTop: '1px solid var(--glass-border)', gap: '15px', flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={handlePlayToggle}
            style={{ 
              background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={20} fill="#fff" /> : <Play size={20} fill="#fff" />}
          </button>

          <button 
            onClick={handleMuteToggle}
            style={{ 
              background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          {/* Toggle buttons to switch sources manually if desired */}
          {video.fallback_url && (
            <button
              onClick={() => {
                const nextFallback = !useFallback;
                setUseFallback(nextFallback);
                setShowPoster(false);
                setIsPlaying(true);
                setIsLoading(true);
                setHasError(false);
              }}
              className="badge"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', 
                border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer',
                fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px'
              }}
              title="Manual source switch"
            >
              <Film size={10} /> {useFallback ? "Switch to YouTube" : "Switch to Local MP4"}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Watch on YouTube button link */}
          {videoId && (
            <a 
              href={`https://www.youtube.com/watch?v=${videoId}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="badge badge-purple"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem' }}
            >
              Watch on YouTube <ExternalLink size={10} />
            </a>
          )}

          <button 
            onClick={handleFullscreen}
            style={{ 
              background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="Fullscreen"
          >
            <Maximize size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
