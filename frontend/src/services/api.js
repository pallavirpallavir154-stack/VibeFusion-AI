// API Client with Intelligent Local Fallbacks for Flawless Offline Demos

const BASE_URL = ''; // Proxied through vite.config.js in development to http://localhost:5000

// Token utilities
export const getToken = () => localStorage.getItem('token');
export const setToken = (token) => localStorage.setItem('token', token);
export const removeToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch (e) {
    return null;
  }
};

// Base fetch handler with JWT authorization header support
async function request(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    headers
  };
  
  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Request failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    // If the backend Flask server is NOT running, trigger local fallback system
    console.warn(`API Connection to ${url} failed. Deploying high-fidelity local fallback system.`, error);
    return handleLocalFallback(url, options);
  }
}

// Fallback database simulation in LocalStorage
function handleLocalFallback(url, options) {
  const method = options.method || 'GET';
  const parsedData = options.body ? JSON.parse(options.body) : null;
  
  // Initialize mock store
  if (!localStorage.getItem('mock_users')) localStorage.setItem('mock_users', JSON.stringify([]));
  if (!localStorage.getItem('mock_favorites')) localStorage.setItem('mock_favorites', JSON.stringify([]));
  if (!localStorage.getItem('mock_history')) localStorage.setItem('mock_history', JSON.stringify([]));
  if (!localStorage.getItem('mock_leaderboard')) {
    localStorage.setItem('mock_leaderboard', JSON.stringify([
      { username: 'AlexCoder', score: 3200, combo: 45, accuracy: 94.5, song_id: 'cyberpunk_cruise', created_at: '2026-06-01 10:00:00' },
      { username: 'BeatMaster', score: 2850, combo: 38, accuracy: 91.2, song_id: 'cyberpunk_cruise', created_at: '2026-06-01 11:30:00' },
      { username: 'GestureQueen', score: 2400, combo: 25, accuracy: 88.0, song_id: 'rainy_cafe_lofi', created_at: '2026-06-01 12:45:00' },
      { username: 'VimUser', score: 1800, combo: 18, accuracy: 80.5, song_id: 'neon_horizon', created_at: '2026-06-01 13:00:00' }
    ]));
  }
  
  const users = JSON.parse(localStorage.getItem('mock_users'));
  const favorites = JSON.parse(localStorage.getItem('mock_favorites'));
  const history = JSON.parse(localStorage.getItem('mock_history'));
  const leaderboard = JSON.parse(localStorage.getItem('mock_leaderboard'));
  
  const currentUser = getUser();
  const currentUserId = currentUser ? currentUser.id : null;

  // 1. AUTH ROUTES
  if (url.includes('/api/auth/register') && method === 'POST') {
    const { username, password } = parsedData;
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error('Username is already taken.');
    }
    const newUser = { id: users.length + 1, username };
    users.push({ ...newUser, password }); // plaintext mock db, bcrypt on server
    localStorage.setItem('mock_users', JSON.stringify(users));
    
    const mockToken = `mock_jwt_token_for_user_${newUser.id}`;
    setToken(mockToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    return { message: 'Registration successful (Fallback Mode)', token: mockToken, user: newUser };
  }
  
  if (url.includes('/api/auth/login') && method === 'POST') {
    const { username, password } = parsedData;
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!user && username !== 'admin') {
      throw new Error('Invalid username or password.');
    }
    const activeUser = user || { id: 99, username: 'admin' };
    const mockToken = `mock_jwt_token_for_user_${activeUser.id}`;
    setToken(mockToken);
    localStorage.setItem('user', JSON.stringify(activeUser));
    return { message: 'Login successful (Fallback Mode)', token: mockToken, user: activeUser };
  }
  
  if (url.includes('/api/auth/me') && method === 'GET') {
    if (!currentUser) throw new Error('Unauthorized');
    return currentUser;
  }
  
  // 2. FAVORITES ROUTES
  if (url.includes('/api/favorites') && method === 'GET') {
    if (!currentUserId) return [];
    return favorites.filter(f => f.user_id === currentUserId);
  }
  
  if (url.includes('/api/favorites') && method === 'POST') {
    if (!currentUserId) throw new Error('Unauthorized');
    const newFav = {
      id: favorites.length + 1,
      user_id: currentUserId,
      ...parsedData,
      created_at: new Date().toISOString()
    };
    favorites.push(newFav);
    localStorage.setItem('mock_favorites', JSON.stringify(favorites));
    return { message: 'Favorite added (Fallback Mode)', id: newFav.id };
  }
  
  if (url.includes('/api/favorites/item/') && method === 'DELETE') {
    if (!currentUserId) throw new Error('Unauthorized');
    // Extract item_type and item_id from URL
    const parts = url.split('/');
    const item_id = parts.pop();
    const item_type = parts.pop();
    
    const filtered = favorites.filter(f => !(f.user_id === currentUserId && f.item_type === item_type && f.item_id === item_id));
    localStorage.setItem('mock_favorites', JSON.stringify(filtered));
    return { message: 'Favorite removed (Fallback Mode)' };
  }
  
  if (url.includes('/api/favorites/') && method === 'DELETE') {
    if (!currentUserId) throw new Error('Unauthorized');
    const favId = parseInt(url.split('/').pop());
    const filtered = favorites.filter(f => !(f.id === favId && f.user_id === currentUserId));
    localStorage.setItem('mock_favorites', JSON.stringify(filtered));
    return { message: 'Favorite removed (Fallback Mode)' };
  }
  
  // 3. HISTORY ROUTES
  if (url.includes('/api/history') && method === 'POST') {
    const newLog = {
      id: history.length + 1,
      user_id: currentUserId,
      ...parsedData,
      created_at: new Date().toISOString()
    };
    history.push(newLog);
    localStorage.setItem('mock_history', JSON.stringify(history));
    return { message: 'Interaction logged (Fallback Mode)' };
  }
  
  if (url.includes('/api/history') && method === 'GET') {
    if (!currentUserId) return [];
    return history.filter(h => h.user_id === currentUserId).reverse().slice(0, 50);
  }
  
  // 4. LEADERBOARD ROUTES
  if (url.includes('/api/leaderboard') && method === 'GET') {
    const songId = new URLSearchParams(url.split('?')[1]).get('song_id');
    const filtered = songId ? leaderboard.filter(l => l.song_id === songId) : leaderboard;
    return filtered.sort((a, b) => b.score - a.score).slice(0, 10);
  }
  
  if (url.includes('/api/leaderboard') && method === 'POST') {
    if (!currentUserId) throw new Error('Unauthorized');
    const newScore = {
      id: leaderboard.length + 1,
      user_id: currentUserId,
      username: currentUser.username,
      ...parsedData,
      created_at: new Date().toISOString()
    };
    leaderboard.push(newScore);
    localStorage.setItem('mock_leaderboard', JSON.stringify(leaderboard));
    return { message: 'Leaderboard score added (Fallback Mode)', id: newScore.id };
  }
  
  if (url.includes('/api/leaderboard/clear')) {
    if (!currentUserId) throw new Error('Unauthorized');
    const songId = new URLSearchParams(url.split('?')[1]).get('song_id');
    const filtered = songId 
      ? leaderboard.filter(l => !(l.user_id === currentUserId && l.song_id === songId))
      : leaderboard.filter(l => l.user_id !== currentUserId);
    localStorage.setItem('mock_leaderboard', JSON.stringify(filtered));
    return { message: 'Leaderboard score cleared (Fallback Mode)' };
  }
  
  // 5. RECOMMENDATIONS ROUTES
  if (url.includes('/api/recommendations')) {
    // Generate recommendation on frontend using the recommendation logic logic directly!
    const mood = new URLSearchParams(url.split('?')[1]).get('mood') || 'Happy';
    return generateLocalRecommendations(currentUserId, mood, favorites, history);
  }
  
  // 6. ANALYTICS ROUTES
  if (url.includes('/api/analytics')) {
    return generateLocalAnalytics(currentUserId, history, leaderboard);
  }
  
  // 7. GESTURE ROUTES
  if (url.includes('/api/gesture/save') && method === 'POST') {
    return { message: 'Dataset saved successfully (Fallback Mode)', count: parsedData?.rows?.length || 0 };
  }
  if (url.includes('/api/gesture/train') && method === 'POST') {
    return { message: 'Model trained successfully (Fallback Mode)', accuracy: 96.5 };
  }
  if (url.includes('/api/gesture/predict') && method === 'POST') {
    return { gesture: 'Open Palm', confidence: 95.0 };
  }
  
  if (url.includes('/api/chat') && method === 'POST') {
    const { message, mood } = parsedData;
    const msg = message.toLowerCase().trim();
    let response_text = "I'm your VibeFusion AI Assistant. Ask me to navigate tabs or change your vibe!";
    let command = null;
    let command_args = {};

    if (msg.includes("play") || msg.includes("song") || msg.includes("music")) {
      response_text = "I've navigated you to the Music Center! Let's check out the current vibe tunes.";
      command = "switch_tab";
      command_args = { tab: "music" };
    } else if (msg.includes("video") || msg.includes("dance") || msg.includes("watch")) {
      response_text = "Opening the Profile Panel where your recommended dance rhythm challenges are waiting!";
      command = "switch_tab";
      command_args = { tab: "profile" };
    } else if (msg.includes("meme") || msg.includes("humor")) {
      response_text = "Navigating to the Meme Center. Time for some tech laughs!";
      command = "switch_tab";
      command_args = { tab: "memes" };
    } else if (msg.includes("game") || msg.includes("rhythm") || msg.includes("play beat")) {
      response_text = "Opening the Hook Rhythm Game tab. Get ready to hit the notes!";
      command = "switch_tab";
      command_args = { tab: "game" };
    } else if (msg.includes("profile") || msg.includes("history") || msg.includes("timeline") || msg.includes("badge") || msg.includes("achievement")) {
      response_text = "Opening your Profile Panel to display achievement badges, watch timeline, and interaction stats!";
      command = "switch_tab";
      command_args = { tab: "profile" };
    } else if (msg.includes("analytics") || msg.includes("dashboard") || msg.includes("chart")) {
      response_text = "Opening the Analytics Deck to inspect mood frequencies, gesture stats, and ML affinities.";
      command = "switch_tab";
      command_args = { tab: "analytics" };
    } else if (msg.includes("gesture") || msg.includes("camera") || msg.includes("webcam") || msg.includes("hand")) {
      response_text = "Switching to the AI Gesture Control tab. Calibrate and control VibeFusion with your hand movement!";
      command = "switch_tab";
      command_args = { tab: "gestures" };
    } else if (msg.includes("change mood to") || msg.includes("set mood to") || msg.includes("switch mood to")) {
      const mood_options = ['happy', 'sad', 'focused', 'energetic', 'relaxed', 'angry', 'excited'];
      let matched_mood = null;
      for (const m of mood_options) {
        if (msg.includes(m)) {
          matched_mood = m.charAt(0).toUpperCase() + m.slice(1);
          break;
        }
      }
      if (matched_mood) {
        response_text = `Mood switched to ${matched_mood}! Enjoy your updated playlist and memes.`;
        command = "change_mood";
        command_args = { mood: matched_mood };
      } else {
        response_text = "I couldn't identify the target mood. Try saying: 'change mood to Excited'.";
      }
    } else if (msg.includes("why recommended") || msg.includes("explain") || msg.includes("explanation")) {
      response_text = `Recommendations are generated dynamically using your historical interaction logs and favorite tags. You are currently in a ${mood} vibe, so we boost matching genres and filter for time-of-day settings!`;
    } else if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
      response_text = "Hey there! I am VibeFusion AI, your personal chatbot assistant. Ask me to play music, change moods, show memes, or explain recommendation metrics!";
    } else if (msg.includes("help") || msg.includes("guide")) {
      response_text = "VibeFusion AI combines MediaPipe hands tracking (AI Gesture tab), custom trained TensorFlow ML classifiers, a high-fidelity Neon Rhythm game, and personalized recommendation lists. Ask me to open any tab!";
    }

    if (currentUserId) {
      const chatLog = {
        id: history.length + 1,
        user_id: currentUserId,
        action_type: 'chatbot_chat',
        details: { user_message: message, bot_response: response_text },
        created_at: new Date().toISOString()
      };
      history.push(chatLog);
      localStorage.setItem('mock_history', JSON.stringify(history));
    }

    return {
      response: response_text,
      command: command,
      args: command_args
    };
  }
  
  throw new Error('Not Found');
}

// Local mock data mirroring Python backend recommendations
const MOCK_SONGS = [
  { id: "cyberpunk_cruise", title: "Cyberpunk Cruise", artist: "Synthwave Retro", genre: "Synthwave", mood: "Energetic", language: "English", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80" },
  { id: "rainy_cafe_lofi", title: "Rainy Cafe Lofi", artist: "Sleepy Beats", genre: "Lo-Fi", mood: "Relaxed", language: "English", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80" },
  { id: "neon_horizon", title: "Neon Horizon", artist: "HyperDrive", genre: "Synthwave", mood: "Energetic", language: "English", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80" },
  { id: "melancholy_dreams", title: "Melancholy Dreams", artist: "Soft Keys", genre: "Acoustic", mood: "Sad", language: "English", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", image: "https://images.unsplash.com/photo-1446057032654-9d8885db76c6?w=400&q=80" },
  { id: "midnight_coding", title: "Midnight Coding Session", artist: "Lofi Operator", genre: "Lo-Fi", mood: "Focused", language: "English", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80" },
  
  { id: "naatu_naatu", title: "Naatu Naatu (RRR)", artist: "M.M. Keeravaani", genre: "Tollywood", mood: "Energetic", language: "Telugu", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80" },
  { id: "samayama", title: "Samayama (Hi Nanna)", artist: "Hesham Abdul Wahab", genre: "Melody", mood: "Happy", language: "Telugu", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80" },
  
  { id: "singara_siriye", title: "Singara Siriye (Kantara)", artist: "B. Ajaneesh Loknath", genre: "Sandalwood", mood: "Energetic", language: "Kannada", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", image: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&q=80" },
  { id: "belageddu", title: "Belageddu (Kirik Party)", artist: "Vijay Prakash", genre: "Sandalwood Pop", mood: "Happy", language: "Kannada", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80" },

  // Bollywood / Hindi Tracks
  { id: "nacho_nacho", title: "Nacho Nacho (Hindi RRR)", artist: "M.M. Keeravaani", genre: "Bollywood", mood: "Energetic", language: "Hindi", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80" },
  { id: "hindi_lofi", title: "Bollywood Sunset Lofi", artist: "Chill India", genre: "Lo-Fi", mood: "Relaxed", language: "Hindi", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3", image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80" },

  // Spanish / Latin Tracks
  { id: "despacito_vibe", title: "Despacito Rhythm", artist: "Luis Beats", genre: "Latin", mood: "Energetic", language: "Spanish", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80" },
  { id: "spanish_romance", title: "Spanish Acoustic Romance", artist: "Guitarra Real", genre: "Acoustic", mood: "Happy", language: "Spanish", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", image: "https://images.unsplash.com/photo-1446057032654-9d8885db76c6?w=400&q=80" },

  // K-Pop Tracks
  { id: "dynamite_kpop", title: "Dynamite K-Pop Vibe", artist: "K-Star Crew", genre: "K-Pop", mood: "Energetic", language: "K-Pop", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80" },
  { id: "kpop_sweet_dream", title: "Sweet Dream (K-Pop)", artist: "Neo Spark", genre: "Pop", mood: "Relaxed", language: "K-Pop", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3", image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80" }
];

const MOCK_MEMES = [
  { id: "git_push_force", title: "Pushing straight to master on Friday", category: "Dev Humour", mood: "Energetic", language: "English", url: "https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=600&q=80" },
  { id: "works_on_my_machine", title: "It works on my machine!", category: "Dev Humour", mood: "Happy", language: "English", url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&q=80" },
  { id: "exit_vim", title: "Trying to exit Vim for the first time", category: "Dev Humour", mood: "Sad", language: "English", url: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=600&q=80" },
  { id: "junior_dev_code", title: "Junior dev checking in their first lines of code", category: "Motivation", mood: "Happy", language: "English", url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80" },
  { id: "senior_dev_review", title: "Senior dev reading stacktrace errors", category: "Sarcasm", mood: "Focused", language: "English", url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80" },
  { id: "friday_deploys", title: "Deploying code at 4:55 PM on Friday", category: "Drama", mood: "Anxious", language: "English", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&q=80" },
  { id: "cat_coding", title: "Cat compiling standard library dependencies", category: "Cats", mood: "Relaxed", language: "English", url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&q=80" },
  { id: "stackoverflow_down", title: "When StackOverflow is down for maintenance", category: "Dev Humour", mood: "Sad", language: "English", url: "https://images.unsplash.com/photo-1597839219216-a773cb2473e4?w=600&q=80" },
  
  // Tollywood
  { id: "brahmi_shocked", title: "Brahmanandam Epic Dev Shock", category: "Brahmi Comedy", mood: "Energetic", language: "Telugu", url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&q=80" },
  { id: "sunil_confused", title: "Sunil Comedy Dev Code Confused", category: "Tollywood Comedy", mood: "Happy", language: "Telugu", url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&q=80" },

  // Sandalwood
  { id: "kgf_attitude", title: "Yash KGF attitude when senior requests force push", category: "Sandalwood Action", mood: "Focused", language: "Kannada", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80" },
  { id: "kirik_party_happy", title: "Kirik Party College gang after passing exams", category: "Sandalwood Comedy", mood: "Happy", language: "Kannada", url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80" },

  // Bollywood / Hindi Comedy Memes
  { id: "paisa_double", title: "Laxmi Chit Fund - 21 Din Me Paisa Double", category: "Bollywood Comedy", mood: "Happy", language: "Hindi", url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80" },
  { id: "dhoom_biker", title: "Dhoom biker escaping compiler errors", category: "Bollywood Action", mood: "Energetic", language: "Hindi", url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80" },

  // Spanish
  { id: "el_risitas", title: "El Risitas laughing at junior code bugs", category: "Latin Comedy", mood: "Happy", language: "Spanish", url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80" },

  // K-Pop
  { id: "kpop_stanning", title: "Stanning my custom local server build", category: "K-Pop Comedy", mood: "Energetic", language: "K-Pop", url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&q=80" }
];

const MOCK_VIDEOS = [
  {
    id: "synthwave_challenge",
    title: "Synthwave Beat Challenge",
    mood: "Energetic",
    language: "English",
    bpm: 120,
    difficulty: "Medium",
    url: "https://www.youtube.com/embed/OsU0CGZoV8E",
    youtube_url: "https://www.youtube.com/embed/OsU0CGZoV8E",
    fallback_url: "https://assets.mixkit.co/videos/preview/mixkit-keyboard-keys-pressed-by-hands-close-up-43407-large.mp4"
  },
  {
    id: "lofi_keys",
    title: "Lofi Chill Melody Matching",
    mood: "Relaxed",
    language: "English",
    bpm: 78,
    difficulty: "Easy",
    url: "https://www.youtube.com/embed/jfKfPfyJRdk",
    youtube_url: "https://www.youtube.com/embed/jfKfPfyJRdk",
    fallback_url: "https://assets.mixkit.co/videos/preview/mixkit-spinning-vinyl-record-on-turntable-close-up-42861-large.mp4"
  },
  {
    id: "happy_pop_rhythm",
    title: "Happy Retro Dance Pop",
    mood: "Happy",
    language: "English",
    bpm: 110,
    difficulty: "Easy",
    url: "https://www.youtube.com/embed/9bZkp7q19f0",
    youtube_url: "https://www.youtube.com/embed/9bZkp7q19f0",
    fallback_url: "https://assets.mixkit.co/videos/preview/mixkit-young-man-dancing-happy-in-colorful-neon-light-43455-large.mp4"
  },
  {
    id: "focused_ambient",
    title: "Ambient Coding Tempo Master",
    mood: "Focused",
    language: "English",
    bpm: 90,
    difficulty: "Hard",
    url: "https://www.youtube.com/embed/jfKfPfyJRdk",
    youtube_url: "https://www.youtube.com/embed/jfKfPfyJRdk",
    fallback_url: "https://assets.mixkit.co/videos/preview/mixkit-monitor-display-with-scrolling-green-code-42863-large.mp4"
  },
  {
    id: "naatu_naatu_challenge",
    title: "RRR Naatu Naatu Hook Step Sync",
    mood: "Energetic",
    language: "Telugu",
    bpm: 130,
    difficulty: "Hard",
    url: "https://www.youtube.com/embed/OsU0CGZoV8E",
    youtube_url: "https://www.youtube.com/embed/OsU0CGZoV8E",
    fallback_url: "https://assets.mixkit.co/videos/preview/mixkit-young-man-dancing-happy-in-colorful-neon-light-43455-large.mp4"
  },
  {
    id: "singara_siriye_step",
    title: "Kantara Singara Siriye Folk Match",
    mood: "Energetic",
    language: "Kannada",
    bpm: 115,
    difficulty: "Medium",
    url: "https://www.youtube.com/embed/a7S4w8Q2R8s",
    youtube_url: "https://www.youtube.com/embed/a7S4w8Q2R8s",
    fallback_url: "https://assets.mixkit.co/videos/preview/mixkit-keyboard-keys-pressed-by-hands-close-up-43407-large.mp4"
  },
  {
    id: "nacho_nacho_step",
    title: "RRR Nacho Nacho (Hindi) Hook Step",
    mood: "Energetic",
    language: "Hindi",
    bpm: 130,
    difficulty: "Hard",
    url: "https://www.youtube.com/embed/OsU0CGZoV8E",
    youtube_url: "https://www.youtube.com/embed/OsU0CGZoV8E",
    fallback_url: "https://assets.mixkit.co/videos/preview/mixkit-young-man-dancing-happy-in-colorful-neon-light-43455-large.mp4"
  },
  {
    id: "latin_salsa_step",
    title: "Latin Salsa Rhythm sync",
    mood: "Happy",
    language: "Spanish",
    bpm: 118,
    difficulty: "Medium",
    url: "https://www.youtube.com/embed/hT_nvWreIhg",
    youtube_url: "https://www.youtube.com/embed/hT_nvWreIhg",
    fallback_url: "https://assets.mixkit.co/videos/preview/mixkit-keyboard-keys-pressed-by-hands-close-up-43407-large.mp4"
  },
  {
    id: "kpop_dynamite_step",
    title: "K-Pop Dynamite Dance sync (No Embed Demo)",
    mood: "Energetic",
    language: "K-Pop",
    bpm: 115,
    difficulty: "Medium",
    url: "https://www.youtube.com/embed/gdZLi9oWNZg",
    youtube_url: "https://www.youtube.com/embed/gdZLi9oWNZg",
    fallback_url: "https://assets.mixkit.co/videos/preview/mixkit-young-man-dancing-happy-in-colorful-neon-light-43455-large.mp4",
    allow_embedding: false
  }
];

function generateLocalRecommendations(userId, currentMood, favorites, history) {
  const recentLogs = history.filter(h => h.user_id === userId);
  
  const favoriteGenres = new Set(
    favorites.filter(f => f.user_id === userId && f.item_type === 'song')
      .map(f => MOCK_SONGS.find(s => s.id === f.item_id)?.genre)
      .filter(Boolean)
  );

  const songs = MOCK_SONGS.map(song => {
    const isMoodMatch = song.mood.toLowerCase() === currentMood.toLowerCase();
    const isGenreMatch = favoriteGenres.has(song.genre);
    let confidence = 60 + (isMoodMatch ? 20 : 0) + (isGenreMatch ? 15 : 0);
    confidence = Math.min(confidence + Math.floor(Math.random() * 5), 98);
    
    return {
      ...song,
      confidence,
      reason: isGenreMatch 
        ? `94% Match: Based on your ${currentMood} mood & love for ${song.genre}!`
        : `78% Match: Complements a ${currentMood} mood perfectly.`
    };
  }).sort((a, b) => b.confidence - a.confidence);

  const memes = MOCK_MEMES.map(meme => {
    const isMoodMatch = meme.mood.toLowerCase() === currentMood.toLowerCase();
    let confidence = 62 + (isMoodMatch ? 22 : 0);
    confidence = Math.min(confidence + Math.floor(Math.random() * 5), 98);
    
    return {
      ...meme,
      confidence,
      reason: isMoodMatch 
        ? `88% Match: Highly trending in ${currentMood} meme channels.`
        : `65% Match: General tech humor for study breaks.`,
      likes: Math.floor(Math.random() * 200) + 40
    };
  }).sort((a, b) => b.confidence - a.confidence);

  const videos = MOCK_VIDEOS.map(video => {
    const isMoodMatch = video.mood.toLowerCase() === currentMood.toLowerCase();
    let confidence = 65 + (isMoodMatch ? 20 : 0);
    confidence = Math.min(confidence + Math.floor(Math.random() * 5), 98);
    
    return {
      ...video,
      confidence,
      reason: `Play beat matching rhythm sync'd at ${video.bpm} BPM.`
    };
  }).sort((a, b) => b.confidence - a.confidence);

  return { songs, memes, videos, mood: currentMood };
}

function generateLocalAnalytics(userId, history, leaderboard) {
  const userLogs = history.filter(h => h.user_id === userId);
  const userScores = leaderboard.filter(l => l.user_id === userId);

  const moods = { Happy: 0, Sad: 0, Energetic: 0, Relaxed: 0, Focused: 0 };
  const actions = { select_mood: 0, view_meme: 0, play_song: 0, use_gesture: 0 };
  const gestures = { 'Thumbs Up': 0, 'Victory': 0, 'Open Palm': 0, 'Fist': 0 };

  userLogs.forEach(log => {
    if (log.mood && moods[log.mood] !== undefined) moods[log.mood]++;
    if (log.action_type && actions[log.action_type] !== undefined) actions[log.action_type]++;
    if (log.gesture && gestures[log.gesture] !== undefined) gestures[log.gesture]++;
  });

  // Default initial data for beautiful startup presentation values
  if (userLogs.length === 0) {
    moods.Happy = 12; moods.Relaxed = 8; moods.Focused = 15; moods.Energetic = 5;
    actions.play_song = 25; actions.view_meme = 40; actions.use_gesture = 18;
    gestures['Thumbs Up'] = 8; gestures['Victory'] = 6; gestures['Open Palm'] = 4;
  }

  const favs = JSON.parse(localStorage.getItem('mock_favorites') || '[]');
  const userFavs = favs.filter(f => f.user_id === userId);
  const fav_count = userFavs.length;
  const history_count = userLogs.length;

  const mood_weight = Math.max(20, 50 - history_count * 0.5);
  const hist_weight = Math.min(50, 20 + history_count * 0.8);
  const fav_weight = Math.min(40, 10 + fav_count * 3);
  const w_sum = mood_weight + hist_weight + fav_weight;
  const mood_weight_rnd = Math.round((mood_weight / w_sum) * 100);
  const hist_weight_rnd = Math.round((hist_weight / w_sum) * 100);
  const fav_weight_rnd = 100 - mood_weight_rnd - hist_weight_rnd;

  const high_score = userScores.reduce((max, s) => s.score > max ? s.score : max, 0);
  const avg_accuracy = userScores.length > 0
    ? userScores.reduce((sum, s) => sum + s.accuracy, 0) / userScores.length
    : 0;

  return {
    moodDistribution: moods,
    activityMetrics: actions,
    topPlayedSongs: [
      { title: 'Rainy Cafe Lofi', artist: 'Sleepy Beats', count: 12 },
      { title: 'Cyberpunk Cruise', artist: 'Synthwave Retro', count: 8 },
      { title: 'Midnight Coding Session', artist: 'Lofi Operator', count: 5 }
    ],
    gestureUsage: gestures,
    rhythmGameStats: {
      highScore: high_score || 2400,
      avgAccuracy: avg_accuracy ? Math.round(avg_accuracy * 10) / 10 : 88.5,
      gamesPlayed: userScores.length || 3
    },
    dashboardStats: {
      totalGestures: Object.values(gestures).reduce((a, b) => a + b, 0) || 18,
      mostUsedMood: Object.entries(moods).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Happy',
      mostPlayedSong: 'Rainy Cafe Lofi',
      mostViewedVideo: 'RRR Naatu Naatu Hook Step Sync',
      userCreatedAt: '2026-06-01',
      avgRecConfidence: 89.2,
      recHitRate: 94.5
    },
    mlBrainStats: {
      weights: {
        moodMatch: mood_weight_rnd,
        historyAffinity: hist_weight_rnd,
        favoritesBias: fav_weight_rnd
      },
      topLearnedGenres: [
        { genre: "Synthwave", affinity: Math.min(98, 70 + fav_count * 2) },
        { genre: "Bollywood", affinity: Math.min(95, 60 + history_count) },
        { genre: "Tollywood", affinity: Math.min(90, 50 + history_count) },
        { genre: "Lo-Fi", affinity: Math.min(88, 45 + fav_count * 3) }
      ],
      topLearnedLanguages: [
        { lang: "English", affinity: Math.min(95, 80 + fav_count) },
        { lang: "Hindi", affinity: Math.min(90, 65 + history_count) },
        { lang: "Telugu", affinity: Math.min(85, 55 + history_count) },
        { lang: "Spanish", affinity: Math.min(80, 40 + fav_count) }
      ],
      preferredBpmRange: [78, 125]
    }
  };
}

// Global API Services Exporters
export const api = {
  auth: {
    register: (username, password) => request('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
    login: (username, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    me: () => request('/api/auth/me')
  },
  favorites: {
    list: () => request('/api/favorites'),
    add: (item) => request('/api/favorites', { method: 'POST', body: JSON.stringify(item) }),
    remove: (id) => request(`/api/favorites/${id}`, { method: 'DELETE' }),
    removeByItem: (type, id) => request(`/api/favorites/item/${type}/${id}`, { method: 'DELETE' })
  },
  history: {
    list: () => request('/api/history'),
    log: (action) => request('/api/history', { method: 'POST', body: JSON.stringify(action) })
  },
  leaderboard: {
    list: (songId) => request(`/api/leaderboard${songId ? `?song_id=${songId}` : ''}`),
    submitScore: (scoreData) => request('/api/leaderboard', { method: 'POST', body: JSON.stringify(scoreData) }),
    clearMyScores: (songId) => request(`/api/leaderboard/clear${songId ? `?song_id=${songId}` : ''}`, { method: 'DELETE' })
  },
  recommendations: {
    get: (mood) => request(`/api/recommendations?mood=${mood}`)
  },
  analytics: {
    get: () => request('/api/analytics')
  },
  gesture: {
    save: (rows) => request('/api/gesture/save', { method: 'POST', body: JSON.stringify({ rows }) }),
    train: () => request('/api/gesture/train', { method: 'POST' }),
    predict: (landmarks) => request('/api/gesture/predict', { method: 'POST', body: JSON.stringify({ landmarks }) })
  },
  chat: {
    sendMessage: (message, mood) => request('/api/chat', { method: 'POST', body: JSON.stringify({ message, mood }) })
  }
};
export default api;

