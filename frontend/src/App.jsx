import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Camera, Image, Music, Video, BarChart2, 
  User, Sun, Moon, LogIn, LogOut, Heart, Activity,
  MessageSquare, Send, Mic, MicOff
} from 'lucide-react';
import api, { removeToken, getUser } from './services/api';
import AuthModal from './components/AuthModal';
import GestureController from './components/GestureController';
import MemeCenter from './components/MemeCenter';
import MusicCenter from './components/MusicCenter';
import RhythmGame from './components/RhythmGame';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ProfilePanel from './components/ProfilePanel';

export default function App() {
  const [currentMood, setCurrentMood] = useState('Happy');
  const [activeTab, setActiveTab] = useState('gestures');
  const [theme, setTheme] = useState('dark');
  const [user, setUser] = useState(getUser());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [recommendations, setRecommendations] = useState({ songs: [], memes: [], videos: [] });
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTrackId, setActiveTrackId] = useState(null);

  // Telemetry & Assistant States
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hello! I am VibeFusion AI, your workspace assistant. How can I help you today?', timestamp: new Date() }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sessionStartTime] = useState(Date.now());

  // Sync design theme class on document body
  useEffect(() => {
    const body = document.body;
    if (theme === 'light') {
      body.classList.add('light-theme');
    } else {
      body.classList.remove('light-theme');
    }
  }, [theme]);

  // Sync dynamic mood themes to document body
  useEffect(() => {
    const body = document.body;
    body.classList.remove(
      'mood-happy', 'mood-relaxed', 'mood-focused', 
      'mood-energetic', 'mood-sad', 'mood-angry', 'mood-excited'
    );
    body.classList.add(`mood-${currentMood.toLowerCase()}`);
  }, [currentMood]);

  // Session Duration tracking
  useEffect(() => {
    // Log initial session start
    api.history.log({
      action_type: 'session_start',
      details: { timestamp: new Date().toISOString() }
    }).catch(err => console.error('Error logging session start:', err));

    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
      api.history.log({
        action_type: 'session_duration',
        details: { elapsed_seconds: elapsedSeconds }
      }).catch(err => console.error('Error logging session duration:', err));
    }, 30000); // periodically log active duration

    return () => {
      clearInterval(interval);
      const elapsedSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
      api.history.log({
        action_type: 'session_end',
        details: { total_seconds: elapsedSeconds }
      }).catch(err => console.error('Error logging session end:', err));
    };
  }, [user]);

  // Load recommendations and user favorites
  const loadContent = async (mood) => {
    setIsLoading(true);
    try {
      const data = await api.recommendations.get(mood);
      setRecommendations(data);
      if (user) {
        const favs = await api.favorites.list();
        setFavorites(favs);
      }
    } catch (err) {
      console.error('Failed to load recommendation stack.', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContent(currentMood);
  }, [currentMood, user]);

  // Global Trigger: Automatically updates mood state, logs it to history, and plays Speech Synthesis
  const handleMoodChange = async (newMood, triggerSource = 'Manual Selector') => {
    if (newMood === currentMood) return;
    setCurrentMood(newMood);
    
    // 1. Log telemetry to backend immediately
    try {
      await api.history.log({
        action_type: 'select_mood',
        mood: newMood,
        details: { source: triggerSource }
      });
    } catch (err) {
      console.error('Failed to log telemetry history.', err);
    }

    // 2. Play Web Speech synthesised audio voice feedback
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // stop current utterance
      const text = `Vibe check updated. Setting mood state to ${newMood} via ${triggerSource}.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      // Find a premium clean voice if possible
      const voices = window.speechSynthesis.getVoices();
      const premiumVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural'));
      if (premiumVoice) utterance.voice = premiumVoice;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Chatbot message sender
  const sendChatbotMessage = async (messageText) => {
    if (!messageText.trim()) return;
    const userMsg = { sender: 'user', text: messageText, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    setUserInput('');
    setIsTyping(true);

    try {
      // Log search history if it contains "search"
      if (messageText.toLowerCase().includes("search") || messageText.toLowerCase().includes("find")) {
        await api.history.log({
          action_type: 'search',
          details: { query: messageText }
        });
      }

      const res = await api.chat.sendMessage(messageText, currentMood);
      setIsTyping(false);
      const botMsg = { sender: 'bot', text: res.response, timestamp: new Date() };
      setChatMessages(prev => [...prev, botMsg]);

      // Speak bot response
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(res.response);
        window.speechSynthesis.speak(utterance);
      }

      // Handle command triggers
      if (res.command === 'switch_tab' && res.args?.tab) {
        setActiveTab(res.args.tab);
      } else if (res.command === 'change_mood' && res.args?.mood) {
        handleMoodChange(res.args.mood, 'Chatbot Assistant');
      }
    } catch (err) {
      setIsTyping(false);
      console.error("Chat error", err);
      setChatMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I had trouble connecting to the backend. Let me handle this locally: ' + err.message, timestamp: new Date() }]);
    }
  };

  // Voice Assistant recognition
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onerror = (event) => {
      console.error("Voice recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript.toLowerCase().trim();
      console.log("Voice Command recognized:", speechToText);
      handleVoiceCommand(speechToText);
    };

    recognition.start();
  };

  const handleVoiceCommand = (commandText) => {
    if (commandText.includes("play music") || commandText.includes("open music") || commandText.includes("go to music") || commandText.includes("switch to music")) {
      setActiveTab('music');
      playVoiceFeedback("Opening Music Center");
    } else if (commandText.includes("open profile") || commandText.includes("go to profile") || commandText.includes("switch to profile") || commandText.includes("show profile")) {
      setActiveTab('profile');
      playVoiceFeedback("Opening Profile Panel");
    } else if (commandText.includes("open meme") || commandText.includes("open memes") || commandText.includes("go to memes") || commandText.includes("switch to memes")) {
      setActiveTab('memes');
      playVoiceFeedback("Opening Meme Center");
    } else if (commandText.includes("open game") || commandText.includes("open rhythm") || commandText.includes("play beat") || commandText.includes("go to game")) {
      setActiveTab('game');
      playVoiceFeedback("Opening Rhythm Game");
    } else if (commandText.includes("open gestures") || commandText.includes("go to gestures") || commandText.includes("switch to gestures") || commandText.includes("open gesture control")) {
      setActiveTab('gestures');
      playVoiceFeedback("Opening AI Gesture Control");
    } else if (commandText.includes("open analytics") || commandText.includes("go to analytics") || commandText.includes("switch to analytics") || commandText.includes("open dashboard")) {
      setActiveTab('analytics');
      playVoiceFeedback("Opening Analytics Deck");
    } else if (commandText.includes("change mood to") || commandText.includes("set mood to") || commandText.includes("switch mood to") || commandText.includes("mood to")) {
      const mood_options = ['happy', 'sad', 'focused', 'energetic', 'relaxed', 'angry', 'excited'];
      let matched_mood = null;
      for (const m of mood_options) {
        if (commandText.includes(m)) {
          matched_mood = m.charAt(0).toUpperCase() + m.slice(1);
          break;
        }
      }
      if (matched_mood) {
        handleMoodChange(matched_mood, 'Voice Assistant');
      } else {
        playVoiceFeedback("I could not identify the target mood.");
      }
    } else {
      // Treat as chatbot chat message
      sendChatbotMessage(commandText);
    }
  };

  const playVoiceFeedback = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Auth operations
  const handleLogout = () => {
    removeToken();
    setUser(null);
    setFavorites([]);
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setShowAuthModal(false);
  };

  return (
    <div className="dashboard-grid">
      {/* 1. SIDE NAVIGATION BAR */}
      <aside className="sidebar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', padding: '0 10px' }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
              padding: '10px', borderRadius: '12px', color: '#fff', boxShadow: '0 0 15px rgba(0,242,254,0.4)'
            }}>
              <Sparkles size={24} className="animate-beat" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
                VibeFusion <span className="glow-text-cyan">Ai</span>
              </h1>
              <span style={{ fontSize: '0.7rem', opacity: 0.6, letterSpacing: '1px', textTransform: 'uppercase' }}>
                Startup Edition
              </span>
            </div>
          </div>

          <nav>
            <div 
              className={`nav-link ${activeTab === 'gestures' ? 'active' : ''}`}
              onClick={() => setActiveTab('gestures')}
            >
              <Camera size={20} />
              <span>AI Gesture Control</span>
            </div>
            <div 
              className={`nav-link ${activeTab === 'memes' ? 'active' : ''}`}
              onClick={() => setActiveTab('memes')}
            >
              <Image size={20} />
              <span>Meme Center</span>
            </div>
            <div 
              className={`nav-link ${activeTab === 'music' ? 'active' : ''}`}
              onClick={() => setActiveTab('music')}
            >
              <Music size={20} />
              <span>Music Center</span>
            </div>
            <div 
              className={`nav-link ${activeTab === 'game' ? 'active' : ''}`}
              onClick={() => setActiveTab('game')}
            >
              <Video size={20} />
              <span>Hook Rhythm Game</span>
            </div>
            <div 
              className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <BarChart2 size={20} />
              <span>Analytics Deck</span>
            </div>
            <div 
              className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={20} />
              <span>Profile Panel</span>
            </div>
          </nav>
        </div>

        {/* ACCOUNT STATUS AND THEME SWITCH PANEL */}
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', padding: '0 10px' }}>
            <button 
              className="btn-neon-outline" 
              style={{ flex: 1, padding: '8px', borderRadius: '10px', justifyContent: 'center' }}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle Color Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            {user ? (
              <button 
                className="btn-neon-outline" 
                style={{ flex: 1, padding: '8px', border: '2px solid var(--accent-pink)', color: 'var(--accent-pink)', borderRadius: '10px', justifyContent: 'center' }}
                onClick={handleLogout}
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            ) : (
              <button 
                className="btn-neon" 
                style={{ flex: 2, padding: '8px 12px', borderRadius: '10px', fontSize: '0.85rem', justifyContent: 'center' }}
                onClick={() => setShowAuthModal(true)}
              >
                <LogIn size={16} /> Login
              </button>
            )}
          </div>
          
          {user && (
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', 
              background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' 
            }}>
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', 
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.85rem', fontWeight: 'bold'
              }}>
                {user.username[0].toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.username}</p>
                <p style={{ fontSize: '0.65rem', opacity: 0.5 }}>Level 1 Beat Explorer</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 2. DYNAMIC WORKSPACE PANEL SCREEN */}
      <main style={{ padding: '40px', overflowY: 'auto', maxHeight: '100vh' }}>
        {/* Top Header Vibe Deck */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Welcome to VibeFusion <span className="glow-text-cyan">Ai</span></h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
              Your smart AI-powered entertainment hub. Switch vibes, unlock rhythm, and create memes.
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Voice Assistant Microphone Button */}
            <button
              onClick={startListening}
              style={{
                background: isListening ? 'var(--accent-pink)' : 'rgba(255, 255, 255, 0.05)',
                color: isListening ? '#fff' : 'var(--text-primary)',
                width: '45px',
                height: '45px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'var(--transition)',
                border: isListening ? '1px solid var(--accent-pink)' : '1px solid var(--glass-border)',
                boxShadow: isListening ? '0 0 20px var(--accent-pink)' : 'none',
                position: 'relative'
              }}
              title="Voice Assistant (Click & Speak)"
            >
              <Mic size={20} className={isListening ? 'animate-beat' : ''} />
              {isListening && (
                <span style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#39ff14',
                  boxShadow: '0 0 10px #39ff14'
                }} />
              )}
            </button>

            {/* Active Mood selector */}
            <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '16px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Current Vibe:
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['Happy', 'Relaxed', 'Focused', 'Energetic', 'Sad', 'Angry', 'Excited'].map(m => (
                  <button
                    key={m}
                    onClick={() => handleMoodChange(m, 'Mood Panel')}
                    style={{
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      backgroundColor: currentMood === m ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                      color: currentMood === m ? '#080711' : 'var(--text-primary)',
                      boxShadow: currentMood === m ? '0 0 10px rgba(0,242,254,0.4)' : 'none'
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Profile Icon Portal Link */}
            <button
              onClick={() => setActiveTab('profile')}
              style={{
                background: activeTab === 'profile' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === 'profile' ? '#080711' : 'var(--text-primary)',
                width: '45px',
                height: '45px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'var(--transition)',
                border: '1px solid var(--glass-border)',
                boxShadow: activeTab === 'profile' ? '0 0 15px var(--accent-cyan)' : 'none'
              }}
              title="Open Profile Page"
            >
              <User size={20} />
            </button>
          </div>
        </header>

        {/* Panel Routing logic */}
        <div style={{ position: 'relative' }}>
          {activeTab === 'gestures' && (
            <GestureController 
              currentMood={currentMood} 
              onMoodTrigger={(mood) => handleMoodChange(mood, 'MediaPipe AI Gestures')} 
              onSongTrigger={setActiveTrackId}
              onTabSwitch={setActiveTab}
            />
          )}
          {activeTab === 'memes' && (
            <MemeCenter 
              recommendations={recommendations.memes} 
              user={user} 
              favorites={favorites} 
              onRefresh={() => loadContent(currentMood)} 
            />
          )}
          {activeTab === 'music' && (
            <MusicCenter 
              recommendations={recommendations.songs} 
              user={user} 
              favorites={favorites} 
              onRefresh={() => loadContent(currentMood)} 
              activeTrackId={activeTrackId}
              setActiveTrackId={setActiveTrackId}
            />
          )}
          {activeTab === 'game' && (
            <RhythmGame 
              songs={recommendations.songs} 
              user={user} 
              onAuthPrompt={() => setShowAuthModal(true)} 
            />
          )}
          {activeTab === 'analytics' && (
            <AnalyticsDashboard user={user} />
          )}
          {activeTab === 'profile' && (
            <ProfilePanel 
              user={user} 
              favorites={favorites} 
              onRefresh={() => loadContent(currentMood)} 
              onAuthPrompt={() => setShowAuthModal(true)} 
              currentMood={currentMood}
            />
          )}
        </div>
      </main>

      {/* 3. FLOAT AUTHENTICATION FORM DIALOG */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onSuccess={handleAuthSuccess} 
        />
      )}

      {/* FLOATING CHATBOT ASSISTANT */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        fontFamily: 'var(--font-body)'
      }}>
        {chatOpen ? (
          <div className="glass-panel" style={{
            width: '350px',
            height: '450px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '16px',
            gap: '12px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 30px var(--glass-glow)',
            border: '1px solid var(--accent-cyan)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#39ff14', boxShadow: '0 0 10px #39ff14' }} />
                <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>VibeFusion AI Assistant</span>
              </div>
              <button 
                onClick={() => setChatOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px' }}
              >
                ×
              </button>
            </div>
            
            {/* Messages body */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', padding: '5px' }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))' : 'rgba(255, 255, 255, 0.05)',
                  padding: '10px 14px',
                  borderRadius: msg.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  fontSize: '0.85rem',
                  lineHeight: '1.4',
                  boxShadow: msg.sender === 'user' ? '0 4px 10px rgba(0, 242, 254, 0.2)' : 'none'
                }}>
                  {msg.text}
                </div>
              ))}
              {isTyping && (
                <div style={{ alignSelf: 'flex-start', background: 'rgba(255, 255, 255, 0.05)', padding: '10px 14px', borderRadius: '16px 16px 16px 2px', fontSize: '0.85rem' }}>
                  <span className="animate-beat" style={{ display: 'inline-block' }}>Thinking...</span>
                </div>
              )}
            </div>

            {/* Input field */}
            <form onSubmit={(e) => { e.preventDefault(); sendChatbotMessage(userInput); }} style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--glass-border)', paddingTop: '10px' }}>
              <input 
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask me to switch tabs or change vibe..."
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
              <button 
                type="submit"
                className="btn-neon"
                style={{ padding: '8px 12px', borderRadius: '10px' }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        ) : (
          <button 
            onClick={() => setChatOpen(true)}
            className="btn-neon"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(0, 242, 254, 0.4)'
            }}
          >
            <MessageSquare size={24} />
          </button>
        )}
      </div>
    </div>
  );
}
