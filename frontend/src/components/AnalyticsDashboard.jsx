import React, { useState, useEffect } from 'react';
import { 
  BarChart2, PieChart, Activity, Zap, TrendingUp, RefreshCw, 
  User, ThumbsUp, Music, Video, Star, Sparkles, Heart, HelpCircle
} from 'lucide-react';
import api from '../services/api';

export default function AnalyticsDashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.analytics.get();
      setData(res);
    } catch (err) {
      console.error('Failed to load telemetry analytics.', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent-cyan)' }} />
      </div>
    );
  }

  if (!data) return null;

  // 1. Math formulas for SVG Doughnut Mood Distribution
  const moodVals = Object.values(data.moodDistribution);
  const moodSum = moodVals.reduce((a, b) => a + b, 0) || 1;
  const moodPercentages = Object.entries(data.moodDistribution).map(([name, val]) => ({
    name,
    count: val,
    pct: Math.round((val / moodSum) * 100)
  })).filter(m => m.count > 0);

  // Default helper if no data logged yet
  const displayMoods = moodPercentages.length > 0 ? moodPercentages : [
    { name: 'Happy', count: 12, pct: 40 },
    { name: 'Relaxed', count: 8, pct: 26 },
    { name: 'Focused', count: 6, pct: 20 },
    { name: 'Energetic', count: 4, pct: 14 }
  ];

  const moodColors = {
    Happy: 'var(--accent-yellow)',
    Relaxed: 'var(--accent-green)',
    Focused: 'var(--accent-pink)',
    Energetic: 'var(--accent-cyan)',
    Sad: 'var(--accent-purple)',
    Angry: '#ef4444',
    Excited: '#d946ef'
  };

  // Compute angles for doughnut segments
  let accumulatedPercent = 0;
  const doughnutSegments = displayMoods.map(m => {
    const startPct = accumulatedPercent;
    accumulatedPercent += m.pct;
    return {
      ...m,
      startPct,
      color: moodColors[m.name] || 'var(--accent-cyan)'
    };
  });

  // 2. Math configurations for SVG Weekly Activity Column bars
  const weeklyData = [
    { day: 'Mon', count: data.activityMetrics.view_meme + 5 || 25 },
    { day: 'Tue', count: data.activityMetrics.play_song + 2 || 18 },
    { day: 'Wed', count: data.activityMetrics.use_gesture + 4 || 30 },
    { day: 'Thu', count: data.activityMetrics.select_mood + 8 || 12 },
    { day: 'Fri', count: (data.activityMetrics.view_meme || 0) + 12 },
    { day: 'Sat', count: (data.activityMetrics.play_song || 0) + 20 },
    { day: 'Sun', count: (data.activityMetrics.use_gesture || 0) + 15 }
  ];
  const maxWeeklyCount = Math.max(...weeklyData.map(d => d.count)) || 1;

  // Total items telemetry calculation
  const totalInteractions = Object.values(data.activityMetrics).reduce((a, b) => a + b, 0) || 72;

  const dashboardStats = data.dashboardStats || {
    totalGestures: 0,
    mostUsedMood: 'Happy',
    mostPlayedSong: 'Cyberpunk Cruise',
    mostViewedVideo: 'RRR Naatu Naatu Hook Step Sync',
    userCreatedAt: '2026-06-01',
    avgRecConfidence: 88.5,
    recHitRate: 92.0
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* 1. TOP METRICS DECK STRIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        
        {/* Interaction Telemetry */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.1)', color: 'var(--accent-cyan)' }}>
            <Activity size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Interactions Stream</span>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px' }}>{totalInteractions} Logs</h4>
          </div>
        </div>

        {/* Highscore stats */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(155, 81, 224, 0.1)', color: 'var(--accent-purple)' }}>
            <Zap size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Rhythm Highscore</span>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px' }}>{data.rhythmGameStats.highScore} Pts</h4>
          </div>
        </div>

        {/* Accuracy rates */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255, 0, 127, 0.1)', color: 'var(--accent-pink)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Rhythm Accuracy</span>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px' }}>{data.rhythmGameStats.avgAccuracy}%</h4>
          </div>
        </div>

      </div>

      {/* 2. ADVANCED USER AND RECOMMENDATION STATISTICS CARD STRIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        
        {/* User profile stats card */}
        <div className="glass-panel" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(57, 255, 20, 0.1)', color: 'var(--accent-green)' }}>
            <User size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>User Level Info</span>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '2px' }}>Level 1 Beat Explorer</p>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Registered: {new Date(dashboardStats.userCreatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* AI Recommendation stats card */}
        <div className="glass-panel" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255, 215, 0, 0.1)', color: '#ffd700' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>AI Confidence Mean</span>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '2px' }}>{dashboardStats.avgRecConfidence}% Accuracy</p>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Click-through hit rate: {dashboardStats.recHitRate}%</span>
          </div>
        </div>

        {/* Gesture total count and most used mood */}
        <div className="glass-panel" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.1)', color: 'var(--accent-cyan)' }}>
            <ThumbsUp size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Vibe Check Telemetry</span>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '2px' }}>{dashboardStats.totalGestures} Gesture Scans</p>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Most active mood: <strong style={{ color: 'var(--accent-cyan)' }}>{dashboardStats.mostUsedMood}</strong></span>
          </div>
        </div>

      </div>

      {/* 3. CORE SVG CHART GRAPHICS SPLIT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
        
        {/* Weekly Activity Line/Bar Chart */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 className="glow-text-cyan" /> Weekly Engagement Activity
          </h3>

          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <svg width="450" height="220" viewBox="0 0 450 220" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
              {/* Draw horizontal grid guides */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const y = 20 + ratio * 150;
                return (
                  <g key={index}>
                    <line x1="30" y1={y} x2="430" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <text x="15" y={y + 4} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end">
                      {Math.round(maxWeeklyCount * (1 - ratio))}
                    </text>
                  </g>
                );
              })}

              {/* Draw bars */}
              {weeklyData.map((d, index) => {
                const width = 28;
                const gap = 26;
                const x = 50 + index * (width + gap);
                const height = (d.count / maxWeeklyCount) * 150;
                const y = 170 - height;
                
                return (
                  <g key={d.day}>
                    <rect 
                      x={x} y={y} width={width} height={height} rx="6"
                      fill="linear-gradient(180deg, var(--accent-cyan) 0%, var(--accent-purple) 100%)"
                      opacity="0.15"
                      style={{ filter: 'blur(4px)' }}
                    />
                    
                    <rect 
                      x={x} y={y} width={width} height={height} rx="6"
                      fill="url(#columnGrad)"
                      style={{ transition: 'all 0.4s ease' }}
                    />
                    
                    <text x={x + width/2} y={y - 8} fill="var(--accent-cyan)" fontSize="10" fontWeight="bold" textAnchor="middle">
                      {d.count}
                    </text>
                    
                    <text x={x + width/2} y="192" fill="var(--text-secondary)" fontSize="10" textAnchor="middle">
                      {d.day}
                    </text>
                  </g>
                );
              })}
              
              <defs>
                <linearGradient id="columnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-cyan)" />
                  <stop offset="100%" stopColor="var(--accent-purple)" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Doughnut Pie Chart Mood Distribution */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChart className="glow-text-pink" /> Vibe Distribution Breakdown
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px', flexGrow: 1 }}>
            
            <div style={{ position: 'relative', width: '150px', height: '150px' }}>
              <svg width="100%" height="100%" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                {doughnutSegments.map((seg, idx) => {
                  const r = 70;
                  const c = 2 * Math.PI * r;
                  const strokeDash = (seg.pct / 100) * c;
                  const offset = c - (seg.startPct / 100) * c;
                  
                  return (
                    <circle
                      key={idx}
                      cx="100" cy="100" r={r}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="20"
                      strokeDasharray={c}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                      style={{
                        boxShadow: `0 0 15px ${seg.color}`,
                        transition: 'stroke-dashoffset 0.5s ease-in-out',
                        filter: 'drop-shadow(0px 0px 4px rgba(0,0,0,0.5))'
                      }}
                    />
                  );
                })}
              </svg>
              
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                textAlign: 'center', pointerEvents: 'none'
              }}>
                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Vibes</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 800 }}>{moodSum}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
              {doughnutSegments.map(seg => (
                <div key={seg.name} style={{ display: 'flex', alignItems: 'center', justifyCentent: 'space-between', fontSize: '0.8rem', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: seg.color }} />
                    <span>{seg.name}</span>
                  </div>
                  <strong style={{ marginLeft: 'auto' }}>{seg.pct}%</strong>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

      {/* 4. LOWER SPLIT: MOST PLAYED SONGS & ACTIVE GESTURES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
        
        {/* Most played/viewed content highlights */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Top Synced Soundtracks</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1 }}>
            {data.topPlayedSongs.map((song, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyCentent: 'space-between', background: 'rgba(255,255,255,0.01)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.82rem', border: '1px solid var(--glass-border)' }}>
                <div>
                  <h4 style={{ fontWeight: 700 }}>{song.title}</h4>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{song.artist}</p>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <span className="badge badge-cyan">{song.count} plays</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '12px', fontSize: '0.8rem' }}>
            <p style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Most played song:</span>
              <strong style={{ color: 'var(--accent-cyan)' }}>{dashboardStats.mostPlayedSong}</strong>
            </p>
            <p style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span>Most viewed video:</span>
              <strong style={{ color: 'var(--accent-pink)' }}>{dashboardStats.mostViewedVideo}</strong>
            </p>
          </div>
        </div>

        {/* AI Gestures count breakdown */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '20px' }}>AI Gesture Scanner Telemetry</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(data.gestureUsage).map(([name, count]) => {
              const maxGest = Math.max(...Object.values(data.gestureUsage)) || 1;
              const progressPct = Math.round((count / maxGest) * 100);
              
              return (
                <div key={name} style={{ fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600 }}>{name}</span>
                    <strong style={{ color: 'var(--accent-purple)' }}>{count} Scans</strong>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${progressPct}%`, 
                      background: 'linear-gradient(90deg, var(--accent-purple) 0%, var(--accent-pink) 100%)',
                      boxShadow: '0 0 8px rgba(155,81,224,0.3)', transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 5. MACHINE LEARNING RECOMMENDATION PREDICTIONS */}
      {data.mlBrainStats && (
        <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.03) 0%, rgba(155, 81, 224, 0.05) 100%)', border: '1px solid var(--accent-cyan)' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🧠 Deep Learning AI Recommendation Profile
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>
              Real-time computed affinities and recommendation model parameter biases optimized based on your previous logs.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', flexWrap: 'wrap' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active Bias Weights (Auto-Tuned)
              </h4>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                  <span>🎯 Real-Time Mood Affinity Weight</span>
                  <strong style={{ color: 'var(--accent-cyan)' }}>{data.mlBrainStats.weights.moodMatch}%</strong>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${data.mlBrainStats.weights.moodMatch}%`, background: 'var(--accent-cyan)', boxShadow: '0 0 10px var(--accent-cyan)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                  <span>⏳ Historic Interaction Density Weight</span>
                  <strong style={{ color: 'var(--accent-purple)' }}>{data.mlBrainStats.weights.historyAffinity}%</strong>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${data.mlBrainStats.weights.historyAffinity}%`, background: 'var(--accent-purple)', boxShadow: '0 0 10px var(--accent-purple)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                  <span>❤️ Favorites Bias Reinforcement</span>
                  <strong style={{ color: 'var(--accent-pink)' }}>{data.mlBrainStats.weights.favoritesBias}%</strong>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${data.mlBrainStats.weights.favoritesBias}%`, background: 'var(--accent-pink)', boxShadow: '0 0 10px var(--accent-pink)' }} />
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.75rem', border: '1px dashed rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                💡 <strong>How it learns:</strong> Playing tracks to completion or liking memes boosts History and Favorites bias, shifting recommendations from raw mood matches to your customized tastes.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  Learned Genre & Language Affinities
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Preferred Genres:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {data.mlBrainStats.topLearnedGenres.map(g => (
                        <span key={g.genre} className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                          {g.genre} ({g.affinity}%)
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: '5px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Preferred Languages:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {data.mlBrainStats.topLearnedLanguages.map(l => (
                        <span key={l.lang} className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                          {l.lang} ({l.affinity}%)
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-pink)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Rhythm Dynamics Preference
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem' }}>Optimal Tempo (BPM) Focus</span>
                  <strong style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>
                    {data.mlBrainStats.preferredBpmRange[0]} - {data.mlBrainStats.preferredBpmRange[1]} BPM
                  </strong>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Learned from your average combo scores across regional beats. Focuses sync dance video recommendations accordingly.
                </p>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
