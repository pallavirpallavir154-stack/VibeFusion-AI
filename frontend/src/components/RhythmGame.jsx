import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Award, Star, Volume2, Sparkles, AlertCircle, HelpCircle } from 'lucide-react';
import api from '../services/api';

const LANES = [
  { key: 'Left', label: '←', char: 'A', color: '#00f2fe', shadow: 'rgba(0, 242, 254, 0.5)' },
  { key: 'Up', label: '↑', char: 'W', color: '#9b51e0', shadow: 'rgba(155, 81, 224, 0.5)' },
  { key: 'Down', label: '↓', char: 'S', color: '#ff007f', shadow: 'rgba(255, 0, 127, 0.5)' },
  { key: 'Right', label: '→', char: 'D', color: '#39ff14', shadow: 'rgba(57, 255, 20, 0.5)' }
];

const LOCALIZED_GAME_SONGS = [
  { id: 'naatu_naatu', title: 'Naatu Naatu Hook Step (Tollywood)', bpm: 130, difficulty: 'Hard', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
  { id: 'singara_siriye', title: 'Singara Siriye Folk Beat (Sandalwood)', bpm: 115, difficulty: 'Medium', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' },
  { id: 'lofi_keys', title: 'Rainy Cafe Lofi Vibe (Global)', bpm: 78, difficulty: 'Easy', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' }
];

export default function RhythmGame({ user, onAuthPrompt }) {
  const [selectedSong, setSelectedSong] = useState(LOCALIZED_GAME_SONGS[0]);
  const [gameState, setGameState] = useState('idle'); // 'idle' | 'countdown' | 'playing' | 'ended'
  const [isPaused, setIsPaused] = useState(false);
  
  // Scoring & Stats
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [notesHit, setNotesHit] = useState(0);
  const [notesMissed, setNotesMissed] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  
  // Timer States
  const [startCountdown, setStartCountdown] = useState(3);
  const [gameTimeLeft, setGameTimeLeft] = useState(30); // 30s game duration
  
  const [notes, setNotes] = useState([]);
  const [feedback, setFeedback] = useState({ text: '', color: '', key: Date.now() });
  const [activeKeys, setActiveKeys] = useState({ Left: false, Up: false, Down: false, Right: false });
  const [leaderboard, setLeaderboard] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaderboardSearchQuery, setLeaderboardSearchQuery] = useState('');
  const [leaderboardScope, setLeaderboardScope] = useState('current');

  // Refs for loop controls
  const gameIntervalRef = useRef(null);
  const animationFrameRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const audioRef = useRef(null);
  const notesRef = useRef([]);
  const isPausedRef = useRef(false);

  const targetY = 460;
  const speed = 4.5; // Smooth falling speed

  useEffect(() => {
    loadLeaderboard();
    return () => {
      stopGame();
    };
  }, [selectedSong, leaderboardScope]);

  // Sync ref with React state to let requestAnimationFrame read latest pause state
  useEffect(() => {
    isPausedRef.current = isPaused;
    if (!isPaused && gameState === 'playing' && audioRef.current) {
      audioRef.current.play().catch(e => console.warn(e));
    } else if (isPaused && audioRef.current) {
      audioRef.current.pause();
    }
  }, [isPaused, gameState]);

  const loadLeaderboard = async () => {
    try {
      const data = await api.leaderboard.list(leaderboardScope === 'current' ? selectedSong.id : null);
      setLeaderboard(data);
    } catch (err) {
      console.error('Failed to load rhythm high scores.', err);
    }
  };

  const handleClearScores = async () => {
    if (!user) return;
    if (confirm(`Are you sure you want to clear your highscores?`)) {
      try {
        await api.leaderboard.clearMyScores(leaderboardScope === 'current' ? selectedSong.id : null);
        loadLeaderboard();
        alert('Highscores cleared successfully!');
      } catch (err) {
        console.error('Failed to clear highscores.', err);
      }
    }
  };

  // Synthesize sound effects using Web Audio API
  const playSynthBeep = (type) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'perfect') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } else if (type === 'good') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440.00, audioCtx.currentTime); // A4 note
        gainNode.gain.setValueAtTime(0.10, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } else if (type === 'miss') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110.00, audioCtx.currentTime); // Low buzz note
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.22);
      } else if (type === 'bonus') {
        // Glowing double chime for 5-hit combo bonus!
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880.00, audioCtx.currentTime); // A5 note
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn('Audio Context blocked or not supported.', e);
    }
  };

  const handleStartGameClick = () => {
    setGameState('countdown');
    setStartCountdown(3);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setNotesHit(0);
    setNotesMissed(0);
    setAccuracy(100);
    setGameTimeLeft(30);
    setNotes([]);
    notesRef.current = [];
    setIsPaused(false);

    // Startup 3s countdown ticker
    countdownIntervalRef.current = setInterval(() => {
      setStartCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          launchGameplay();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const launchGameplay = () => {
    setGameState('playing');
    
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 0.8;
      audioRef.current.play().catch(e => console.warn(e));
    }

    // Spawn notes based on BPM spacing
    const spawnInterval = Math.round((60 / selectedSong.bpm) * 1000);
    gameIntervalRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      spawnNote();
    }, spawnInterval);

    // Time countdown ticker
    timerIntervalRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      setGameTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    animationFrameRef.current = requestAnimationFrame(updateGame);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  };

  const handlePauseToggle = () => {
    setIsPaused(prev => !prev);
  };

  const handleRestart = () => {
    stopGame();
    handleStartGameClick();
  };

  const stopGame = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };

  const endGame = () => {
    stopGame();
    setGameState('ended');
    
    // Log play history
    api.history.log({
      action_type: 'submit_game_score',
      item_id: selectedSong.id,
      details: { score, bpm: selectedSong.bpm, accuracy: calculateRealAccuracy() }
    }).catch(() => {});

    if (user) {
      submitScore();
    }
  };

  const submitScore = async () => {
    setIsSubmitting(true);
    try {
      await api.leaderboard.submitScore({
        song_id: selectedSong.id,
        score: score,
        combo: maxCombo,
        accuracy: calculateRealAccuracy()
      });
      loadLeaderboard();
    } catch (err) {
      console.error('Failed to submit leaderboard score.', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const spawnNote = () => {
    const laneIndex = Math.floor(Math.random() * 4);
    const newNote = {
      id: Date.now() + Math.random(),
      lane: laneIndex,
      y: 0,
      color: LANES[laneIndex].color,
      shadow: LANES[laneIndex].shadow
    };
    
    notesRef.current = [...notesRef.current, newNote];
    setNotes([...notesRef.current]);
  };

  const updateGame = () => {
    if (isPausedRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateGame);
      return;
    }

    let missedCount = 0;
    
    notesRef.current = notesRef.current.map(note => {
      return { ...note, y: note.y + speed };
    }).filter(note => {
      if (note.y > targetY + 40) {
        missedCount++;
        return false;
      }
      return true;
    });

    if (missedCount > 0) {
      setNotesMissed(prev => prev + missedCount);
      setCombo(0);
      triggerFeedback('MISS', 'var(--accent-pink)');
      playSynthBeep('miss');
    }

    setNotes([...notesRef.current]);
    animationFrameRef.current = requestAnimationFrame(updateGame);
  };

  const triggerFeedback = (text, color) => {
    setFeedback({
      text,
      color,
      key: Date.now()
    });
  };

  const handleKeyDown = (e) => {
    if (isPausedRef.current || gameState !== 'playing') return;

    let laneKey = null;
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') laneKey = 'Left';
    else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') laneKey = 'Up';
    else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') laneKey = 'Down';
    else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') laneKey = 'Right';

    if (laneKey) {
      e.preventDefault();
      setActiveKeys(prev => ({ ...prev, [laneKey]: true }));
      checkHit(laneKey);
    }
  };

  const handleKeyUp = (e) => {
    let laneKey = null;
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') laneKey = 'Left';
    else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') laneKey = 'Up';
    else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') laneKey = 'Down';
    else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') laneKey = 'Right';

    if (laneKey) {
      setActiveKeys(prev => ({ ...prev, [laneKey]: false }));
    }
  };

  const checkHit = (laneKey) => {
    const laneIndex = LANES.findIndex(l => l.key === laneKey);
    const targetNotes = notesRef.current.filter(n => n.lane === laneIndex);
    if (targetNotes.length === 0) return;

    // Find note closest to target Y
    let closestNote = targetNotes[0];
    let minDelta = Math.abs(closestNote.y - targetY);
    for (let i = 1; i < targetNotes.length; i++) {
      const d = Math.abs(targetNotes[i].y - targetY);
      if (d < minDelta) {
        minDelta = d;
        closestNote = targetNotes[i];
      }
    }

    if (minDelta > 65) return; // Ignore if too far

    // Perfect hit window
    if (minDelta < 22) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setMaxCombo(prev => Math.max(prev, nextCombo));
      setNotesHit(prev => prev + 1);

      // 5-hit combo bonus points!
      let bonusPts = 0;
      let multiplier = 1 + Math.floor(nextCombo / 5);
      multiplier = Math.min(5, multiplier); // Cap multiplier at 5x

      if (nextCombo > 0 && nextCombo % 5 === 0) {
        bonusPts = 50;
        playSynthBeep('bonus');
        triggerFeedback(`COMBO BONUS! +50 Pts (x${multiplier})`, '#ffd700');
      } else {
        playSynthBeep('perfect');
        triggerFeedback(`PERFECT x${multiplier}!`, 'var(--accent-green)');
      }

      setScore(prev => prev + (100 * multiplier) + bonusPts);
      notesRef.current = notesRef.current.filter(n => n.id !== closestNote.id);
    } 
    // Good hit window
    else if (minDelta >= 22 && minDelta < 65) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setMaxCombo(prev => Math.max(prev, nextCombo));
      setNotesHit(prev => prev + 1);

      let bonusPts = 0;
      let multiplier = 1 + Math.floor(nextCombo / 5);
      multiplier = Math.min(5, multiplier);

      if (nextCombo > 0 && nextCombo % 5 === 0) {
        bonusPts = 50;
        playSynthBeep('bonus');
        triggerFeedback(`COMBO BONUS! +50 Pts (x${multiplier})`, '#ffd700');
      } else {
        playSynthBeep('good');
        triggerFeedback('GOOD!', 'var(--accent-cyan)');
      }

      setScore(prev => prev + (50 * multiplier) + bonusPts);
      notesRef.current = notesRef.current.filter(n => n.id !== closestNote.id);
    }
  };

  const calculateRealAccuracy = () => {
    const total = notesHit + notesMissed;
    if (total === 0) return 100;
    return Math.round((notesHit / total) * 100);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', alignItems: 'start' }}>
      
      {/* 1. INTERACTIVE GAME BOARD */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid var(--glass-border)' }}>
        
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🎵 VibeFusion Neon Challenge
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Song: <strong style={{ color: '#fff' }}>{selectedSong.title}</strong> • BPM: {selectedSong.bpm}
            </span>
          </div>

          {gameState === 'playing' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={handlePauseToggle} 
                className="btn-neon-outline" 
                style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem' }}
              >
                {isPaused ? '▶️ Resume' : '⏸️ Pause'}
              </button>
              <button 
                onClick={handleRestart} 
                className="btn-neon-outline" 
                style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', borderColor: 'var(--accent-pink)', color: 'var(--accent-pink)' }}
              >
                🔄 Restart
              </button>
            </div>
          )}

          {gameState === 'idle' && (
            <select
              value={selectedSong.id}
              onChange={(e) => setSelectedSong(LOCALIZED_GAME_SONGS.find(s => s.id === e.target.value))}
              style={{
                padding: '8px 12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.8rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {LOCALIZED_GAME_SONGS.map(s => (
                <option key={s.id} value={s.id} style={{ background: 'var(--bg-secondary)', color: '#fff' }}>
                  {s.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Dynamic audio link node */}
        <audio ref={audioRef} src={selectedSong.url} />

        <div style={{ width: '100%', position: 'relative' }}>
          
          {/* Game Lanes View Panel */}
          <div className="rhythm-container" style={{ border: '2px solid var(--glass-border)', background: '#03020b', height: '62vh' }}>
            
            {/* Countdown overlay (3, 2, 1, GO) */}
            {gameState === 'countdown' && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(5, 4, 15, 0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
                <span style={{
                  fontSize: '5rem', fontWeight: 900, color: 'var(--accent-cyan)',
                  textShadow: '0 0 25px var(--accent-cyan)', animation: 'beat 0.9s infinite'
                }}>
                  {startCountdown > 0 ? startCountdown : 'START'}
                </span>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '10px' }}>Calibrating keyboard sync channels...</p>
              </div>
            )}

            {/* Pause Modal Overlay */}
            {isPaused && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(5, 4, 15, 0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 35 }}>
                <h4 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--accent-cyan)', textShadow: '0 0 15px var(--accent-cyan)', marginBottom: '8px' }}>Vibe Paused</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>Press Resume to return to rhythm matching.</p>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <button onClick={handlePauseToggle} className="btn-neon" style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '0.85rem' }}>
                    ▶️ Resume Vibe
                  </button>
                  <button onClick={handleRestart} className="btn-neon-outline" style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '0.85rem', borderColor: 'var(--accent-pink)', color: 'var(--accent-pink)' }}>
                    🔄 Restart
                  </button>
                </div>
              </div>
            )}

            {/* Floating popups overlay */}
            {feedback.text && (
              <div 
                key={feedback.key}
                style={{
                  position: 'absolute', top: '150px', left: '50%', transform: 'translateX(-50%)',
                  fontSize: '1.8rem', fontWeight: 950, color: feedback.color, textShadow: `0 0 20px ${feedback.color}`,
                  animation: 'float 0.8s ease-out forwards', pointerEvents: 'none', zIndex: 10
                }}
              >
                {feedback.text}
              </div>
            )}

            {LANES.map((lane, index) => {
              const laneNotes = notes.filter(n => n.lane === index);
              return (
                <div key={lane.key} className="rhythm-lane" style={{ left: `${index * 25}%`, borderRight: '1px solid rgba(255, 255, 255, 0.03)' }}>
                  
                  {/* Draw falling beat circles */}
                  {laneNotes.map(note => (
                    <div 
                      key={note.id} 
                      className="falling-note animate-pulse"
                      style={{ 
                        transform: `translateY(${note.y}px)`, 
                        background: `radial-gradient(circle at 35% 35%, #ffffff 5%, ${lane.color} 80%)`,
                        boxShadow: `0 0 20px ${lane.shadow}`,
                        width: '46px',
                        height: '46px',
                        color: '#000'
                      }}
                    >
                      {lane.label}
                    </div>
                  ))}

                  <span style={{ position: 'absolute', bottom: '130px', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 800 }}>
                    {lane.char}
                  </span>

                  <div 
                    className={`rhythm-arrow-target ${activeKeys[lane.key] ? 'active' : ''}`}
                    style={{ 
                      position: 'absolute', top: `${targetY}px`,
                      borderColor: activeKeys[lane.key] ? lane.color : 'rgba(255,255,255,0.15)',
                      boxShadow: activeKeys[lane.key] ? `0 0 25px ${lane.shadow}` : 'none',
                      color: activeKeys[lane.key] ? lane.color : 'rgba(255,255,255,0.3)',
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.02)'
                    }}
                  >
                    {lane.label}
                  </div>
                </div>
              );
            })}

            {/* Start State screen */}
            {gameState === 'idle' && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(5, 4, 15, 0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                <span className="animate-beat" style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🎮</span>
                <h4 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '8px' }}>Press start to sync</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '25px', textAlign: 'center', maxWidth: '300px' }}>
                  Tap arrows or keys <strong>(A, W, S, D)</strong> to hit matching beats! Every 5 hits triggers a score combo bonus.
                </p>
                <button onClick={handleStartGameClick} className="btn-neon" style={{ padding: '12px 28px' }}>
                  <Play size={16} fill="white" /> Launch Challenge
                </button>
              </div>
            )}

            {/* End State screen */}
            {gameState === 'ended' && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(5, 4, 15, 0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20, padding: '30px' }}>
                <Star className="glow-text-cyan animate-float" size={44} fill="currentColor" style={{ marginBottom: '15px', color: '#ffd700' }} />
                <h4 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '6px' }}>Vibe Challenge Completed!</h4>
                <p style={{ color: '#39ff14', fontWeight: 800, fontSize: '1.25rem', marginBottom: '20px', textShadow: '0 0 10px rgba(57,255,20,0.4)' }}>
                  Final Score: {score} Pts
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', width: '100%', maxWidth: '280px', marginBottom: '25px', fontSize: '0.85rem' }}>
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Max Combo</p>
                    <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>{maxCombo}x</p>
                  </div>
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Accuracy</p>
                    <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>{calculateRealAccuracy()}%</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                  <button onClick={handleStartGameClick} className="btn-neon" style={{ padding: '10px 20px', borderRadius: '8px' }}>
                    <RotateCcw size={16} /> Replay Track
                  </button>
                  <button onClick={() => setGameState('idle')} className="btn-neon-outline" style={{ padding: '10px 20px', borderRadius: '8px' }}>
                    Change Song
                  </button>
                </div>

                {!user && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px', padding: '10px 14px', background: 'rgba(255, 0, 127, 0.05)', border: '1px dashed var(--accent-pink)', borderRadius: '10px', width: '100%', maxWidth: '320px' }}>
                    <AlertCircle size={16} style={{ color: 'var(--accent-pink)' }} />
                    <p style={{ fontSize: '0.75rem', color: 'var(--accent-pink)', textAlign: 'left' }}>
                      <span onClick={onAuthPrompt} style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}>Login</span> to save this score to leaderboards!
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Gameplay Scoreboard overlay HUD */}
          {gameState === 'playing' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginTop: '16px', fontSize: '0.85rem' }}>
              <div className="glass-panel" style={{ padding: '8px 12px', textAlign: 'center', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Time Left</span>
                <p style={{ fontSize: '1.15rem', fontWeight: 800, color: gameTimeLeft <= 5 ? 'var(--accent-pink)' : '#fff' }}>{gameTimeLeft}s</p>
              </div>
              <div className="glass-panel" style={{ padding: '8px 12px', textAlign: 'center', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Score</span>
                <p style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{score}</p>
              </div>
              <div className="glass-panel" style={{ padding: '8px 12px', textAlign: 'center', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Combo</span>
                <p style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-pink)' }}>{combo}x</p>
              </div>
              <div className="glass-panel" style={{ padding: '8px 12px', textAlign: 'center', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Accuracy</span>
                <p style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-green)' }}>{calculateRealAccuracy()}%</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 2. LEADERBOARD CARD */}
      <div className="glass-panel" style={{ height: '620px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award className="glow-text-pink" /> Leaderboard Rankings
          </h3>
          {user && (
            <button 
              onClick={handleClearScores}
              className="btn-neon-outline"
              style={{ fontSize: '0.65rem', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--accent-pink)', color: 'var(--accent-pink)' }}
            >
              Reset My Score
            </button>
          )}
        </div>

        {/* Leaderboard Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <select
              value={leaderboardScope}
              onChange={(e) => setLeaderboardScope(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.75rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="current" style={{ background: 'var(--bg-secondary)', color: '#fff' }}>Selected Song Only</option>
              <option value="all" style={{ background: 'var(--bg-secondary)', color: '#fff' }}>All Songs Combined</option>
            </select>

            <input 
              type="text"
              placeholder="Search user..."
              value={leaderboardSearchQuery}
              onChange={(e) => setLeaderboardSearchQuery(e.target.value)}
              style={{
                flex: 1.2,
                padding: '6px 10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.75rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {isSubmitting && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(0, 242, 254, 0.08)', borderRadius: '8px', border: '1px solid var(--accent-cyan)', marginBottom: '15px', color: 'var(--accent-cyan)', fontSize: '0.8rem' }}>
            <RotateCcw className="animate-spin" size={14} /> Submitting high score...
          </div>
        )}

        <div style={{ overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {leaderboard.filter(item => item.username.toLowerCase().includes(leaderboardSearchQuery.toLowerCase())).length > 0 ? (
            leaderboard
              .filter(item => item.username.toLowerCase().includes(leaderboardSearchQuery.toLowerCase()))
              .map((item, index) => {
                const isUser = user && item.username === user.username;
                const getRankBadge = (idx) => {
                  if (idx === 0) return '🥇';
                  if (idx === 1) return '🥈';
                  if (idx === 2) return '🥉';
                  return `#${idx + 1}`;
                };
                
                return (
                  <div
                    key={item.id || index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: isUser ? 'rgba(155, 81, 224, 0.08)' : 'rgba(255,255,255,0.02)',
                      border: isUser ? '1px solid var(--accent-purple)' : '1px solid transparent',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ 
                        fontSize: '0.9rem', fontWeight: 800, width: '28px',
                        color: index === 0 ? '#ffd700' : index === 1 ? '#00f2fe' : index === 2 ? '#ff007f' : 'var(--text-secondary)' 
                      }}>
                        {getRankBadge(index)}
                      </span>
                      <div>
                        <span style={{ fontWeight: 700, color: isUser ? 'var(--accent-purple)' : '#fff' }}>
                          {item.username}
                        </span>
                        {leaderboardScope === 'all' && (
                          <p style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>Song: {item.song_id}</p>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>Combo</p>
                        <p style={{ fontWeight: 700, fontSize: '0.75rem' }}>{item.combo}x</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>Accuracy</p>
                        <p style={{ fontWeight: 700, fontSize: '0.75rem' }}>{item.accuracy}%</p>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '50px' }}>
                        <p style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>Score</p>
                        <p style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>{item.score}</p>
                      </div>
                    </div>
                  </div>
                );
              })
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0', fontSize: '0.85rem' }}>
              No scores recorded yet. Tap Launch Challenge to play!
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
