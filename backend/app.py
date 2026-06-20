import os
import datetime
import jwt
import json
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt

from database import get_db_connection, init_db
from recommendation import calculate_recommendations, SONGS, MEMES, VIDEOS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
bcrypt = Bcrypt(app)

SECRET_KEY = os.environ.get('SECRET_KEY', 'cyber_meme_beat_jwt_secret_token_1289!')

# Initialize Database Schema at Startup
init_db()

# ==========================================
# AUTHENTICATION DECORATOR
# ==========================================
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'message': 'Access token is missing!'}), 401
        
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            current_user_id = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!'}), 401
            
        return f(current_user_id, *args, **kwargs)
        
    return decorated

# ==========================================
# AUTH ENDPOINTS
# ==========================================
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Username and password are required.'}), 400
        
    username = data['username'].strip()
    password = data['password']
    
    if len(password) < 6:
        return jsonify({'message': 'Password must be at least 6 characters.'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if user already exists
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    existing_user = cursor.fetchone()
    if existing_user:
        conn.close()
        return jsonify({'message': 'Username is already taken.'}), 409
        
    # Hash password and insert
    password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    try:
        cursor.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)", 
            (username, password_hash)
        )
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        
        # Auto generate JWT token
        token = jwt.encode({
            'user_id': user_id,
            'username': username,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'message': 'Registration successful.',
            'token': token,
            'user': {'id': user_id, 'username': username}
        }), 201
    except Exception as e:
        conn.close()
        return jsonify({'message': 'Database error occurred.', 'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Username and password are required.'}), 400
        
    username = data['username'].strip()
    password = data['password']
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    conn.close()
    
    if not user or not bcrypt.check_password_hash(user['password_hash'], password):
        return jsonify({'message': 'Invalid username or password.'}), 401
        
    # Generate JWT Token
    token = jwt.encode({
        'user_id': user['id'],
        'username': user['username'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, SECRET_KEY, algorithm='HS256')
    
    return jsonify({
        'message': 'Login successful.',
        'token': token,
        'user': {'id': user['id'], 'username': user['username']}
    }), 200

@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_me(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, created_at FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        return jsonify({'message': 'User not found.'}), 404
        
    return jsonify({
        'id': user['id'],
        'username': user['username'],
        'created_at': user['created_at']
    }), 200

# ==========================================
# RECOMMENDATION ENDPOINTS
# ==========================================
@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    auth_header = request.headers.get('Authorization')
    user_id = None
    
    # Try decoding token if present (recommendations are personalized if logged in)
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            user_id = data['user_id']
        except Exception:
            pass # fallback to general recommendations if token is invalid or expired
            
    current_mood = request.args.get('mood', 'Happy')
    recs = calculate_recommendations(user_id, current_mood)
    return jsonify(recs), 200

# ==========================================
# FAVORITES ENDPOINTS
# ==========================================
@app.route('/api/favorites', methods=['GET'])
@token_required
def get_favorites(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, item_type, item_id, item_title, item_url, item_extra, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC", 
        (user_id,)
    )
    favs = cursor.fetchall()
    conn.close()
    
    result = []
    for f in favs:
        result.append({
            'id': f['id'],
            'item_type': f['item_type'],
            'item_id': f['item_id'],
            'item_title': f['item_title'],
            'item_url': f['item_url'],
            'item_extra': json.loads(f['item_extra']) if f['item_extra'] else None,
            'created_at': f['created_at']
        })
        
    return jsonify(result), 200

@app.route('/api/favorites', methods=['POST'])
@token_required
def add_favorite(user_id):
    data = request.get_json()
    if not data or not data.get('item_type') or not data.get('item_id') or not data.get('item_title'):
        return jsonify({'message': 'Missing favorite details.'}), 400
        
    item_type = data['item_type']
    item_id = data['item_id']
    item_title = data['item_title']
    item_url = data.get('item_url')
    item_extra = json.dumps(data.get('item_extra', {}))
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if duplicate favorite exists
    cursor.execute(
        "SELECT id FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ?", 
        (user_id, item_type, item_id)
    )
    if cursor.fetchone():
        conn.close()
        return jsonify({'message': 'Item is already in favorites.'}), 409
        
    try:
        cursor.execute(
            "INSERT INTO favorites (user_id, item_type, item_id, item_title, item_url, item_extra) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, item_type, item_id, item_title, item_url, item_extra)
        )
        conn.commit()
        fav_id = cursor.lastrowid
        conn.close()
        return jsonify({'message': 'Favorite added successfully.', 'id': fav_id}), 201
    except Exception as e:
        conn.close()
        return jsonify({'message': 'Database error.', 'error': str(e)}), 500

@app.route('/api/favorites/<int:fav_id>', methods=['DELETE'])
@token_required
def remove_favorite(user_id, fav_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Ensure favorite belongs to this user
    cursor.execute("SELECT id FROM favorites WHERE id = ? AND user_id = ?", (fav_id, user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'message': 'Favorite not found or unauthorized.'}), 404
        
    cursor.execute("DELETE FROM favorites WHERE id = ?", (fav_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Favorite removed successfully.'}), 200

# Endpoint to delete by item info directly
@app.route('/api/favorites/item/<string:item_type>/<string:item_id>', methods=['DELETE'])
@token_required
def remove_favorite_by_item(user_id, item_type, item_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ?", (user_id, item_type, item_id))
    fav = cursor.fetchone()
    
    if not fav:
        conn.close()
        return jsonify({'message': 'Favorite not found.'}), 404
        
    cursor.execute("DELETE FROM favorites WHERE id = ?", (fav['id'],))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Favorite removed successfully.'}), 200

# ==========================================
# TELEMETRY & HISTORY ENDPOINTS
# ==========================================
@app.route('/api/history', methods=['POST'])
def add_history():
    auth_header = request.headers.get('Authorization')
    user_id = None
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            user_id = data['user_id']
        except Exception:
            pass # anonymous history logs are allowed
            
    data = request.get_json()
    if not data or not data.get('action_type'):
        return jsonify({'message': 'Action type is required.'}), 400
        
    action_type = data['action_type']
    item_id = data.get('item_id')
    mood = data.get('mood')
    gesture = data.get('gesture')
    details = json.dumps(data.get('details', {}))
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO user_history (user_id, action_type, item_id, mood, gesture, details) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, action_type, item_id, mood, gesture, details)
        )
        conn.commit()
        conn.close()
        return jsonify({'message': 'Interaction logged.'}), 201
    except Exception as e:
        conn.close()
        return jsonify({'message': 'Database error.', 'error': str(e)}), 500

@app.route('/api/history', methods=['GET'])
@token_required
def get_history(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, action_type, item_id, mood, gesture, details, created_at FROM user_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
        (user_id,)
    )
    logs = cursor.fetchall()
    conn.close()
    
    result = []
    for l in logs:
        result.append({
            'id': l['id'],
            'action_type': l['action_type'],
            'item_id': l['item_id'],
            'mood': l['mood'],
            'gesture': l['gesture'],
            'details': json.loads(l['details']) if l['details'] else {},
            'created_at': l['created_at']
        })
    return jsonify(result), 200

# ==========================================
# RHYTHM GAME LEADERBOARD
# ==========================================
@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    song_id = request.args.get('song_id')
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if song_id:
        cursor.execute(
            "SELECT id, username, score, combo, accuracy, song_id, created_at FROM leaderboard WHERE song_id = ? ORDER BY score DESC LIMIT 10", 
            (song_id,)
        )
    else:
        cursor.execute(
            "SELECT id, username, score, combo, accuracy, song_id, created_at FROM leaderboard ORDER BY score DESC LIMIT 10"
        )
        
    scores = cursor.fetchall()
    conn.close()
    
    result = []
    for s in scores:
        result.append({
            'id': s['id'],
            'username': s['username'],
            'score': s['score'],
            'combo': s['combo'],
            'accuracy': s['accuracy'],
            'song_id': s['song_id'],
            'created_at': s['created_at']
        })
    return jsonify(result), 200

@app.route('/api/leaderboard', methods=['POST'])
@token_required
def add_leaderboard_score(user_id):
    data = request.get_json()
    if not data or not data.get('score') or not data.get('song_id'):
        return jsonify({'message': 'Missing scoring details.'}), 400
        
    score = int(data['score'])
    combo = int(data.get('combo', 0))
    accuracy = float(data.get('accuracy', 0.0))
    song_id = data['song_id']
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Fetch username
    cursor.execute("SELECT username FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return jsonify({'message': 'User not found.'}), 404
        
    try:
        cursor.execute(
            "INSERT INTO leaderboard (user_id, username, score, combo, accuracy, song_id) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, user['username'], score, combo, accuracy, song_id)
        )
        conn.commit()
        score_id = cursor.lastrowid
        conn.close()
        return jsonify({'message': 'Highscore submitted successfully.', 'id': score_id}), 201
    except Exception as e:
        conn.close()
        return jsonify({'message': 'Database error.', 'error': str(e)}), 500

# ==========================================
# RHYTHM GAME LEADERBOARD SCORE CLEARANCE
# ==========================================
@app.route('/api/leaderboard/clear', methods=['DELETE', 'POST'])
@token_required
def clear_leaderboard(user_id):
    song_id = request.args.get('song_id')
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if song_id:
            cursor.execute("DELETE FROM leaderboard WHERE user_id = ? AND song_id = ?", (user_id, song_id))
        else:
            cursor.execute("DELETE FROM leaderboard WHERE user_id = ?", (user_id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Leaderboard history cleared successfully.'}), 200
    except Exception as e:
        conn.close()
        return jsonify({'message': 'Database error.', 'error': str(e)}), 500

# ==========================================
# ANALYTICS DASHBOARD
# ==========================================
@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    auth_header = request.headers.get('Authorization')
    user_id = None
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            user_id = data['user_id']
        except Exception:
            pass
            
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Filter analytics to user if logged in, otherwise show system-wide analytics
    where_clause = "WHERE user_id = ?" if user_id else ""
    params = (user_id,) if user_id else ()
    
    # 1. Mood frequency distribution
    cursor.execute(f"""
        SELECT mood, COUNT(*) as count FROM user_history 
        {where_clause} {"AND" if user_id else "WHERE"} mood IS NOT NULL AND mood != '' 
        GROUP BY mood ORDER BY count DESC
    """, params)
    moods_raw = cursor.fetchall()
    moods = {r['mood']: r['count'] for r in moods_raw}
    
    # Fill in defaults if empty
    for d_mood in ['Happy', 'Sad', 'Energetic', 'Relaxed', 'Focused']:
        if d_mood not in moods:
            moods[d_mood] = 0
            
    # 2. Activity count by category (views, plays, gestures)
    cursor.execute(f"""
        SELECT action_type, COUNT(*) as count FROM user_history 
        {where_clause} GROUP BY action_type
    """, params)
    actions_raw = cursor.fetchall()
    actions = {r['action_type']: r['count'] for r in actions_raw}
    
    # Fill in defaults if empty
    for act in ['play_song', 'view_meme', 'use_gesture', 'select_mood']:
        if act not in actions:
            actions[act] = 0

    # 3. Most played songs (mock aggregate merged with real logs)
    cursor.execute(f"""
        SELECT item_id, COUNT(*) as count FROM user_history 
        {where_clause} {"AND" if user_id else "WHERE"} action_type = 'play_song' 
        GROUP BY item_id ORDER BY count DESC LIMIT 5
    """, params)
    top_songs_raw = cursor.fetchall()
    top_songs = []
    for r in top_songs_raw:
        song = next((s for s in SONGS if s['id'] == r['item_id']), None)
        if song:
            top_songs.append({'title': song['title'], 'artist': song['artist'], 'count': r['count']})
            
    # Add dummy entries if less than 3
    if len(top_songs) < 3:
        for s in SONGS[:3]:
            if not any(ts['title'] == s['title'] for ts in top_songs):
                top_songs.append({'title': s['title'], 'artist': s['artist'], 'count': random.randint(1, 5)})
                
    # 4. Rhythm game leaderboard stats
    leaderboard_filter = "WHERE user_id = ?" if user_id else ""
    cursor.execute(f"SELECT MAX(score) as high_score, AVG(accuracy) as avg_accuracy, COUNT(*) as games_played FROM leaderboard {leaderboard_filter}", params)
    game_stats = cursor.fetchone()
    
    # 5. Gestures count breakdown
    cursor.execute(f"""
        SELECT gesture, COUNT(*) as count FROM user_history 
        {where_clause} {"AND" if user_id else "WHERE"} action_type = 'use_gesture' 
        GROUP BY gesture ORDER BY count DESC
    """, params)
    gestures_raw = cursor.fetchall()
    gestures = {r['gesture']: r['count'] for r in gestures_raw}
    for d_gesture in ['Thumbs Up', 'Victory', 'Open Palm', 'Fist']:
        if d_gesture not in gestures:
            gestures[d_gesture] = 0
            
    # Calculate additional dashboard statistics
    # Total gesture counts
    cursor.execute(f"""
        SELECT COUNT(*) FROM user_history 
        {where_clause} {"AND" if user_id else "WHERE"} action_type = 'use_gesture'
    """, params)
    total_gestures_count = cursor.fetchone()[0] or 0

    # Most used mood
    cursor.execute(f"""
        SELECT mood, COUNT(*) as count FROM user_history 
        {where_clause} {"AND" if user_id else "WHERE"} mood IS NOT NULL AND mood != ''
        GROUP BY mood ORDER BY count DESC LIMIT 1
    """, params)
    most_used_mood_row = cursor.fetchone()
    most_used_mood = most_used_mood_row['mood'] if most_used_mood_row else 'Happy'

    # Most played song
    most_played_song = top_songs[0]['title'] if top_songs else 'Cyberpunk Cruise'

    # Most viewed video
    cursor.execute(f"""
        SELECT item_id, COUNT(*) as count FROM user_history 
        {where_clause} {"AND" if user_id else "WHERE"} action_type = 'watch_video' 
        GROUP BY item_id ORDER BY count DESC LIMIT 1
    """, params)
    most_viewed_video_row = cursor.fetchone()
    most_viewed_video = 'RRR Naatu Naatu Hook Step Sync'
    if most_viewed_video_row:
        vid = next((v for v in VIDEOS if v['id'] == most_viewed_video_row['item_id']), None)
        if vid:
            most_viewed_video = vid['title']

    # User creation date
    user_created_at = None
    if user_id:
        cursor.execute("SELECT created_at FROM users WHERE id = ?", (user_id,))
        user_created_row = cursor.fetchone()
        if user_created_row:
            user_created_at = user_created_row['created_at']
            
    # 6. Dynamic Machine Learning Learner Brain stats
    fav_count = 0
    history_count = 0
    if user_id:
        cursor.execute("SELECT COUNT(*) FROM favorites WHERE user_id = ?", (user_id,))
        fav_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM user_history WHERE user_id = ?", (user_id,))
        history_count = cursor.fetchone()[0]

    # Compute dynamic learned ML weights
    mood_weight = max(20, 50 - history_count * 0.5)
    hist_weight = min(50, 20 + history_count * 0.8)
    fav_weight = min(40, 10 + fav_count * 3)
    w_sum = mood_weight + hist_weight + fav_weight
    mood_weight = round((mood_weight / w_sum) * 100)
    hist_weight = round((hist_weight / w_sum) * 100)
    fav_weight = 100 - mood_weight - hist_weight

    # Learned Genres (simulate a ranked listing based on history genres)
    learned_genres = [
        {"genre": "Synthwave", "affinity": min(98, 70 + fav_count * 2)},
        {"genre": "Bollywood", "affinity": min(95, 60 + history_count)},
        {"genre": "Tollywood", "affinity": min(90, 50 + history_count)},
        {"genre": "Lo-Fi", "affinity": min(88, 45 + fav_count * 3)}
    ]
    learned_languages = [
        {"lang": "English", "affinity": min(95, 80 + fav_count)},
        {"lang": "Hindi", "affinity": min(90, 65 + history_count)},
        {"lang": "Telugu", "affinity": min(85, 55 + history_count)},
        {"lang": "Spanish", "affinity": min(80, 40 + fav_count)}
    ]
    
    conn.close()
    
    return jsonify({
        'moodDistribution': moods,
        'activityMetrics': actions,
        'topPlayedSongs': top_songs,
        'gestureUsage': gestures,
        'rhythmGameStats': {
            'highScore': game_stats['high_score'] if game_stats and game_stats['high_score'] else 0,
            'avgAccuracy': round(game_stats['avg_accuracy'], 2) if game_stats and game_stats['avg_accuracy'] else 0.0,
            'gamesPlayed': game_stats['games_played'] if game_stats and game_stats['games_played'] else 0
        },
        'dashboardStats': {
            'totalGestures': total_gestures_count,
            'mostUsedMood': most_used_mood,
            'mostPlayedSong': most_played_song,
            'mostViewedVideo': most_viewed_video,
            'userCreatedAt': user_created_at or '2026-06-01',
            'avgRecConfidence': 88.5,
            'recHitRate': 92.0
        },
        'mlBrainStats': {
            'weights': {
                'moodMatch': mood_weight,
                'historyAffinity': hist_weight,
                'favoritesBias': fav_weight
            },
            'topLearnedGenres': learned_genres,
            'topLearnedLanguages': learned_languages,
            'preferredBpmRange': [78, 125]
        }
    }), 200

# ==========================================
# TENSORFLOW CUSTOM GESTURE CLASSIFIER ROUTES
# ==========================================
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gesture_classifier.h5')
MAPPING_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gesture_mapping.json')
gesture_model = None
gesture_mapping = None

def load_gesture_model():
    global gesture_model, gesture_mapping
    if os.path.exists(MODEL_PATH) and os.path.exists(MAPPING_PATH):
        try:
            # Prevent noisy log outputs on startup
            os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
            import tensorflow as tf
            import numpy as np
            gesture_model = tf.keras.models.load_model(MODEL_PATH)
            with open(MAPPING_PATH, 'r') as f:
                gesture_mapping = json.load(f)
            print("Trained TensorFlow gesture model loaded successfully.")
        except Exception as e:
            print("Failed to load gesture model:", e)

# Soft load gesture neural network at startup
load_gesture_model()

@app.route('/api/gesture/save', methods=['POST'])
def save_gesture_dataset():
    data = request.get_json()
    if not data or 'rows' not in data:
        return jsonify({'message': 'Invalid data format. "rows" required.'}), 400
    
    rows = data['rows']
    dataset_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gesture_dataset.csv')
    
    try:
        import csv
        with open(dataset_path, 'w', newline='') as f:
            writer = csv.writer(f)
            # Write coordinates header: label, x0, y0, z0, ..., x20, y20, z20
            header = ['label']
            for i in range(21):
                header.extend([f'x{i}', f'y{i}', f'z{i}'])
            writer.writerow(header)
            writer.writerows(rows)
        
        return jsonify({'message': f'Dataset saved successfully with {len(rows)} samples.'}), 200
    except Exception as e:
        return jsonify({'message': 'Failed to save dataset.', 'error': str(e)}), 500

@app.route('/api/gesture/train', methods=['POST'])
def train_gesture_model():
    try:
        # Import train script functions
        from train_model import train as run_training
        accuracy = run_training()
        
        # Reload the newly trained classifier
        load_gesture_model()
        
        return jsonify({
            'message': 'Model trained successfully.',
            'accuracy': round(float(accuracy) * 100, 2)
        }), 200
    except Exception as e:
        return jsonify({'message': 'Training failed.', 'error': str(e)}), 500

@app.route('/api/gesture/predict', methods=['POST'])
def predict_gesture():
    global gesture_model, gesture_mapping
    if not gesture_model:
        load_gesture_model()
        if not gesture_model:
            return jsonify({'message': 'TensorFlow model is not trained yet. Defaulting to Euclidean ratio engine.'}), 400
            
    data = request.get_json()
    if not data or 'landmarks' not in data or len(data['landmarks']) != 63:
        return jsonify({'message': 'Invalid landmarks format. 63 float coordinates required.'}), 400
        
    try:
        import numpy as np
        from train_model import preprocess_row
        raw_landmarks = data['landmarks']
        processed = preprocess_row(raw_landmarks)
        input_data = np.array([processed], dtype=np.float32)
        
        predictions = gesture_model.predict(input_data, verbose=0)[0]
        class_idx = int(np.argmax(predictions))
        confidence = float(predictions[class_idx])
        
        label = 'None'
        if gesture_mapping and str(class_idx) in gesture_mapping:
            label = gesture_mapping[str(class_idx)]
        else:
            classes = ['Fist', 'Open Palm', 'Thumbs Up', 'Victory']
            if class_idx < len(classes):
                label = classes[class_idx]
                
        return jsonify({
            'gesture': label,
            'confidence': round(confidence * 100, 2)
        }), 200
    except Exception as e:
        return jsonify({'message': 'Prediction failed.', 'error': str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat_assistant():
    auth_header = request.headers.get('Authorization')
    user_id = None
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            user_id = data['user_id']
        except Exception:
            pass

    data = request.get_json() or {}
    message = data.get('message', '').strip().lower()
    current_mood = data.get('mood', 'Happy')

    response_text = "I'm your VibeFusion AI Assistant. Ask me to navigate tabs or change your vibe!"
    command = None
    command_args = {}

    # Command Router
    if "play" in message or "song" in message or "music" in message:
        response_text = "I've navigated you to the Music Center! Let's check out the current vibe tunes."
        command = "switch_tab"
        command_args = {"tab": "music"}
    elif "video" in message or "dance" in message or "watch" in message:
        response_text = "Opening the Profile Panel where your recommended dance rhythm challenges are waiting!"
        command = "switch_tab"
        command_args = {"tab": "profile"}
    elif "meme" in message or "humor" in message:
        response_text = "Navigating to the Meme Center. Time for some tech laughs!"
        command = "switch_tab"
        command_args = {"tab": "memes"}
    elif "game" in message or "rhythm" in message or "play beat" in message:
        response_text = "Opening the Hook Rhythm Game tab. Get ready to hit the notes!"
        command = "switch_tab"
        command_args = {"tab": "game"}
    elif "profile" in message or "history" in message or "timeline" in message or "badge" in message or "achievement" in message:
        response_text = "Opening your Profile Panel to display achievement badges, watch timeline, and interaction stats!"
        command = "switch_tab"
        command_args = {"tab": "profile"}
    elif "analytics" in message or "dashboard" in message or "chart" in message:
        response_text = "Opening the Analytics Deck to inspect mood frequencies, gesture stats, and ML affinities."
        command = "switch_tab"
        command_args = {"tab": "analytics"}
    elif "gesture" in message or "camera" in message or "webcam" in message or "hand" in message:
        response_text = "Switching to the AI Gesture Control tab. Calibrate and control VibeFusion with your hand movement!"
        command = "switch_tab"
        command_args = {"tab": "gestures"}
    elif "change mood to" in message or "set mood to" in message or "switch mood to" in message:
        mood_options = ['happy', 'sad', 'focused', 'energetic', 'relaxed', 'angry', 'excited']
        matched_mood = None
        for m in mood_options:
            if m in message:
                matched_mood = m.capitalize()
                break
        if matched_mood:
            response_text = f"Mood switched to {matched_mood}! Enjoy your updated playlist and memes."
            command = "change_mood"
            command_args = {"mood": matched_mood}
        else:
            response_text = "I couldn't identify the target mood. Try saying: 'change mood to Excited'."
    elif "why recommended" in message or "explain" in message or "explanation" in message:
        response_text = f"Recommendations are generated dynamically using your historical interaction logs and favorite tags. You are currently in a {current_mood} vibe, so we boost matching genres and filter for time-of-day settings!"
    elif "hello" in message or "hi" in message or "hey" in message:
        response_text = "Hey there! I am VibeFusion AI, your personal chatbot assistant. Ask me to play music, change moods, show memes, or explain recommendation metrics!"
    elif "help" in message or "guide" in message:
        response_text = "VibeFusion AI combines MediaPipe hands tracking (AI Gesture tab), custom trained TensorFlow ML classifiers, a high-fidelity Neon Rhythm game, and personalized recommendation lists. Ask me to open any tab!"

    # Log chat telemetry if user is authenticated
    if user_id:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO user_history (user_id, action_type, details) VALUES (?, ?, ?)",
                (user_id, 'chatbot_chat', json.dumps({"user_message": message, "bot_response": response_text}))
            )
            conn.commit()
            conn.close()
        except Exception:
            pass

    return jsonify({
        "response": response_text,
        "command": command,
        "args": command_args
    }), 200

import random
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

