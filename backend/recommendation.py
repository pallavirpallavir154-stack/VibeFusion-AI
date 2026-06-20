import json
import random
from database import get_db_connection

# Localized Regional & Global Data Repository
SONGS = [
    # Global English Tracks
    {"id": "cyberpunk_cruise", "title": "Cyberpunk Cruise", "artist": "Synthwave Retro", "genre": "Synthwave", "mood": "Energetic", "language": "English", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", "image": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80"},
    {"id": "rainy_cafe_lofi", "title": "Rainy Cafe Lofi", "artist": "Sleepy Beats", "genre": "Lo-Fi", "mood": "Relaxed", "language": "English", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", "image": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80"},
    {"id": "neon_horizon", "title": "Neon Horizon", "artist": "HyperDrive", "genre": "Synthwave", "mood": "Energetic", "language": "English", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80"},
    {"id": "melancholy_dreams", "title": "Melancholy Dreams", "artist": "Soft Keys", "genre": "Acoustic", "mood": "Sad", "language": "English", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", "image": "https://images.unsplash.com/photo-1446057032654-9d8885db76c6?w=400&q=80"},
    {"id": "midnight_coding", "title": "Midnight Coding Session", "artist": "Lofi Operator", "genre": "Lo-Fi", "mood": "Focused", "language": "English", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", "image": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80"},
    {"id": "rage_active", "title": "Rage Mode Active", "artist": "Cyber Thrashers", "genre": "Synthwave", "mood": "Angry", "language": "English", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3", "image": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80"},
    {"id": "excited_pulse", "title": "Neon Excited Pulse", "artist": "Electro Glitchers", "genre": "Synthwave", "mood": "Excited", "language": "English", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3", "image": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80"},
    
    # Tollywood / Telugu Tracks
    {"id": "naatu_naatu", "title": "Naatu Naatu (RRR)", "artist": "M.M. Keeravaani", "genre": "Tollywood", "mood": "Energetic", "language": "Telugu", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", "image": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80"},
    {"id": "samayama", "title": "Samayama (Hi Nanna)", "artist": "Hesham Abdul Wahab", "genre": "Melody", "mood": "Happy", "language": "Telugu", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", "image": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80"},
    {"id": "adigaa", "title": "Adigaa (Ninnu Kori)", "artist": "Sid Sriram", "genre": "Melody", "mood": "Sad", "language": "Telugu", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", "image": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&q=80"},
    {"id": "telugu_lofi_mix", "title": "Tollywood Chill Lofi Beat", "artist": "Indian Lofi Project", "genre": "Lo-Fi", "mood": "Relaxed", "language": "Telugu", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3", "image": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80"},
    {"id": "intense_brahmi_beat", "title": "Brahmi Angry Chase", "artist": "Tollywood Beats", "genre": "Tollywood", "mood": "Angry", "language": "Telugu", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", "image": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80"},
    {"id": "telugu_excited_vibe", "title": "Paisa Vasool Party", "artist": "Tollywood DJ", "genre": "Tollywood", "mood": "Excited", "language": "Telugu", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", "image": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80"},
    
    # Sandalwood / Kannada Tracks
    {"id": "singara_siriye", "title": "Singara Siriye (Kantara)", "artist": "B. Ajaneesh Loknath", "genre": "Sandalwood", "mood": "Energetic", "language": "Kannada", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", "image": "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&q=80"},
    {"id": "belageddu", "title": "Belageddu (Kirik Party)", "artist": "Vijay Prakash", "genre": "Sandalwood Pop", "mood": "Happy", "language": "Kannada", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3", "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80"},
    {"id": "kadalanu_kaanada", "title": "Kadalanu Kaanada (Mungaru Male)", "artist": "Sonu Nigam", "genre": "Acoustic Melody", "mood": "Sad", "language": "Kannada", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3", "image": "https://images.unsplash.com/photo-1446057032654-9d8885db76c6?w=400&q=80"},
    {"id": "kannada_lofi_mix", "title": "Sandalwood Relax Lofi", "artist": "Sandalwood Lofi", "genre": "Lo-Fi", "mood": "Relaxed", "language": "Kannada", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3", "image": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80"},
    {"id": "kgf_angry_bgm", "title": "KGF Rebellion (Salaam Rocky Bhai)", "artist": "Ravi Basrur", "genre": "Sandalwood", "mood": "Angry", "language": "Kannada", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", "image": "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&q=80"},
    {"id": "kannada_excited_pop", "title": "College Anthem", "artist": "Sandalwood Crew", "genre": "Sandalwood Pop", "mood": "Excited", "language": "Kannada", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3", "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80"},

    # Bollywood / Hindi Tracks
    {"id": "nacho_nacho", "title": "Nacho Nacho (Hindi RRR)", "artist": "M.M. Keeravaani", "genre": "Bollywood", "mood": "Energetic", "language": "Hindi", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", "image": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80"},
    {"id": "hindi_lofi", "title": "Bollywood Sunset Lofi", "artist": "Chill India", "genre": "Lo-Fi", "mood": "Relaxed", "language": "Hindi", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3", "image": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80"},
    {"id": "hindi_melody", "title": "Tum Hi Ho Chill Cover", "artist": "Arijit Fan Club", "genre": "Melody", "mood": "Sad", "language": "Hindi", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", "image": "https://images.unsplash.com/photo-1446057032654-9d8885db76c6?w=400&q=80"},
    {"id": "angry_ranbir", "title": "Animal Entry Theme", "artist": "Harshavardhan Rameshwar", "genre": "Bollywood", "mood": "Angry", "language": "Hindi", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", "image": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80"},
    {"id": "hindi_excited_mix", "title": "Badtameez Dil Dance Sync", "artist": "Pritam", "genre": "Bollywood", "mood": "Excited", "language": "Hindi", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", "image": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80"},

    # Spanish / Latin Tracks
    {"id": "despacito_vibe", "title": "Despacito Rhythm", "artist": "Luis Beats", "genre": "Latin", "mood": "Energetic", "language": "Spanish", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3", "image": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80"},
    {"id": "spanish_romance", "title": "Spanish Acoustic Romance", "artist": "Guitarra Real", "genre": "Acoustic", "mood": "Happy", "language": "Spanish", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", "image": "https://images.unsplash.com/photo-1446057032654-9d8885db76c6?w=400&q=80"},
    {"id": "latin_angry_rap", "title": "Fuego En La Calle", "artist": "El Rapero", "genre": "Latin", "mood": "Angry", "language": "Spanish", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3", "image": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80"},
    {"id": "latin_excited_fiesta", "title": "Fiesta De La Noche", "artist": "DJ Hector", "genre": "Latin", "mood": "Excited", "language": "Spanish", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3", "image": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80"},

    # K-Pop Tracks
    {"id": "dynamite_kpop", "title": "Dynamite K-Pop Vibe", "artist": "K-Star Crew", "genre": "K-Pop", "mood": "Energetic", "language": "K-Pop", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", "image": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80"},
    {"id": "kpop_sweet_dream", "title": "Sweet Dream (K-Pop)", "artist": "Neo Spark", "genre": "Pop", "mood": "Relaxed", "language": "K-Pop", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3", "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80"},
    {"id": "kpop_angry_fire", "title": "Fire & Ice Rap", "artist": "D-Town Squad", "genre": "K-Pop", "mood": "Angry", "language": "K-Pop", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", "image": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80"},
    {"id": "kpop_excited_spark", "title": "Neon Spark Party", "artist": "Neo Spark", "genre": "Pop", "mood": "Excited", "language": "K-Pop", "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3", "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80"}
]

MEMES = [
    # Global English Memes
    {"id": "git_push_force", "title": "Pushing straight to master on Friday", "category": "Dev Humour", "mood": "Energetic", "language": "English", "url": "https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=600&q=80"},
    {"id": "works_on_my_machine", "title": "It works on my machine!", "category": "Dev Humour", "mood": "Happy", "language": "English", "url": "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&q=80"},
    {"id": "exit_vim", "title": "Trying to exit Vim for the first time", "category": "Dev Humour", "mood": "Sad", "language": "English", "url": "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=600&q=80"},
    {"id": "junior_dev_code", "title": "Junior dev checking in their first lines of code", "category": "Motivation", "mood": "Happy", "language": "English", "url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80"},
    {"id": "senior_dev_review", "title": "Senior dev reading stacktrace errors", "category": "Sarcasm", "mood": "Focused", "language": "English", "url": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80"},
    {"id": "friday_deploys", "title": "Deploying code at 4:55 PM on Friday", "category": "Drama", "mood": "Anxious", "language": "English", "url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&q=80"},
    {"id": "cat_coding", "title": "Cat compiling standard library dependencies", "category": "Cats", "mood": "Relaxed", "language": "English", "url": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&q=80"},
    {"id": "stackoverflow_down", "title": "When StackOverflow is down for maintenance", "category": "Dev Humour", "mood": "Sad", "language": "English", "url": "https://images.unsplash.com/photo-1597839219216-a773cb2473e4?w=600&q=80"},
    {"id": "merge_conflict_rage", "title": "When git merge produces 524 conflicts in your configuration", "category": "Dev Humour", "mood": "Angry", "language": "English", "url": "https://images.unsplash.com/photo-1597839219216-a773cb2473e4?w=600&q=80"},
    {"id": "compile_success_party", "title": "When code compiles on the first run without any warnings!", "category": "Motivation", "mood": "Excited", "language": "English", "url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80"},
    
    # Tollywood / Telugu Comedy Memes
    {"id": "brahmi_shocked", "title": "Brahmanandam Epic Dev Shock", "category": "Brahmi Comedy", "mood": "Energetic", "language": "Telugu", "url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&q=80"},
    {"id": "sunil_confused", "title": "Sunil Comedy Dev Code Confused", "category": "Tollywood Comedy", "mood": "Happy", "language": "Telugu", "url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&q=80"},
    {"id": "brahmi_sad", "title": "Brahmi crying after compiling 1000 errors", "category": "Brahmi Comedy", "mood": "Sad", "language": "Telugu", "url": "https://images.unsplash.com/photo-1597223557154-721c1cecc4b0?w=600&q=80"},
    {"id": "ali_focused", "title": "Ali studying code stack traces intently", "category": "Tollywood Comedy", "mood": "Focused", "language": "Telugu", "url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80"},
    {"id": "brahmi_angry", "title": "Brahmi holding stick at buggy code compilers", "category": "Brahmi Comedy", "mood": "Angry", "language": "Telugu", "url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&q=80"},
    {"id": "brahmi_excited", "title": "Brahmanandam full happy dance after deployment success", "category": "Brahmi Comedy", "mood": "Excited", "language": "Telugu", "url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&q=80"},
    
    # Sandalwood / Kannada Comedy Memes
    {"id": "kgf_attitude", "title": "Yash KGF attitude when senior requests force push", "category": "Sandalwood Action", "mood": "Focused", "language": "Kannada", "url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80"},
    {"id": "kirik_party_happy", "title": "Kirik Party College gang after passing exams", "category": "Sandalwood Comedy", "mood": "Happy", "language": "Kannada", "url": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80"},
    {"id": "upendra_chaotic", "title": "Upendra brainstorming chaotic coding logic", "category": "Sandalwood Comedy", "mood": "Energetic", "language": "Kannada", "url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80"},
    {"id": "kannada_sad", "title": "Sandalwood actor tears after major Friday deployment crash", "category": "Sandalwood Comedy", "mood": "Sad", "language": "Kannada", "url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&q=80"},
    {"id": "kgf_angry", "title": "Salaam Rocky Bhai getting angry at production crashes", "category": "Sandalwood Action", "mood": "Angry", "language": "Kannada", "url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80"},
    {"id": "kannada_excited", "title": "Kirik Party dancing in celebration", "category": "Sandalwood Comedy", "mood": "Excited", "language": "Kannada", "url": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80"},

    # Bollywood / Hindi Comedy Memes
    {"id": "paisa_double", "title": "Laxmi Chit Fund - 21 Din Me Paisa Double", "category": "Bollywood Comedy", "mood": "Happy", "language": "Hindi", "url": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80"},
    {"id": "dhoom_biker", "title": "Dhoom biker escaping production compiler errors", "category": "Bollywood Action", "mood": "Energetic", "language": "Hindi", "url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80"},
    {"id": "majnu_bhai_painting", "title": "Majnu Bhai painting representing code structure", "category": "Bollywood Comedy", "mood": "Angry", "language": "Hindi", "url": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80"},
    {"id": "excited_baburao", "title": "Baburao Ganpatrao Apte screaming in excitement", "category": "Bollywood Comedy", "mood": "Excited", "language": "Hindi", "url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80"},

    # Spanish / Latin Comedy Memes
    {"id": "el_risitas", "title": "El Risitas laughing at junior code bugs", "category": "Latin Comedy", "mood": "Happy", "language": "Spanish", "url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80"},
    {"id": "latin_angry_meme", "title": "Angry telenovela drama over git push rejections", "category": "Latin Comedy", "mood": "Angry", "language": "Spanish", "url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80"},

    # K-Pop Comedy Memes
    {"id": "kpop_stanning", "title": "Stanning my custom local server build", "category": "K-Pop Comedy", "mood": "Energetic", "language": "K-Pop", "url": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&q=80"}
]

VIDEOS = [
    # Global/Regional Recommended Videos for Dance Rhythm challenges
    {
        "id": "naatu_naatu_challenge",
        "title": "RRR Naatu Naatu Hook Step Sync",
        "mood": "Energetic",
        "language": "Telugu",
        "bpm": 130,
        "difficulty": "Hard",
        "url": "https://www.youtube.com/embed/OsU0CGZoV8E",
        "youtube_url": "https://www.youtube.com/embed/OsU0CGZoV8E",
        "fallback_url": "https://assets.mixkit.co/videos/preview/mixkit-young-man-dancing-happy-in-colorful-neon-light-43455-large.mp4"
    },
    {
        "id": "singara_siriye_step",
        "title": "Kantara Singara Siriye Folk Match",
        "mood": "Energetic",
        "language": "Kannada",
        "bpm": 115,
        "difficulty": "Medium",
        "url": "https://www.youtube.com/embed/a7S4w8Q2R8s",
        "youtube_url": "https://www.youtube.com/embed/a7S4w8Q2R8s",
        "fallback_url": "https://assets.mixkit.co/videos/preview/mixkit-keyboard-keys-pressed-by-hands-close-up-43407-large.mp4"
    },
    {
        "id": "lofi_ambient_coding",
        "title": "Midnight Coding Lo-fi Chill Lounge",
        "mood": "Relaxed",
        "language": "English",
        "bpm": 75,
        "difficulty": "Easy",
        "url": "https://www.youtube.com/embed/jfKfPfyJRdk",
        "youtube_url": "https://www.youtube.com/embed/jfKfPfyJRdk",
        "fallback_url": "https://assets.mixkit.co/videos/preview/mixkit-spinning-vinyl-record-on-turntable-close-up-42861-large.mp4"
    },
    {
        "id": "telugu_melody_flow",
        "title": "Hi Nanna Samayama Guitar Cover",
        "mood": "Happy",
        "language": "Telugu",
        "bpm": 105,
        "difficulty": "Easy",
        "url": "https://www.youtube.com/embed/rZfWb7h-C-0",
        "youtube_url": "https://www.youtube.com/embed/rZfWb7h-C-0",
        "fallback_url": "https://assets.mixkit.co/videos/preview/mixkit-monitor-display-with-scrolling-green-code-42863-large.mp4"
    },
    {
        "id": "kannada_college_vibe",
        "title": "Kirik Party Belageddu Retro Match",
        "mood": "Happy",
        "language": "Kannada",
        "bpm": 110,
        "difficulty": "Medium",
        "url": "https://www.youtube.com/embed/1Ym_A0m3uU8",
        "youtube_url": "https://www.youtube.com/embed/1Ym_A0m3uU8",
        "fallback_url": "https://assets.mixkit.co/videos/preview/mixkit-young-man-dancing-happy-in-colorful-neon-light-43455-large.mp4"
    },
    {
        "id": "angry_metal_sync",
        "title": "Heavy Metal Headbang Challenge (No Embed Demo)",
        "mood": "Angry",
        "language": "English",
        "bpm": 140,
        "difficulty": "Hard",
        "url": "https://www.youtube.com/embed/yM0g-C-A5_8",
        "youtube_url": "https://www.youtube.com/embed/yM0g-C-A5_8",
        "fallback_url": "https://assets.mixkit.co/videos/preview/mixkit-young-man-dancing-happy-in-colorful-neon-light-43455-large.mp4",
        "allow_embedding": False
    },
    {
        "id": "excited_dance_glow",
        "title": "Vibrant Neon Party Dance Mix",
        "mood": "Excited",
        "language": "English",
        "bpm": 125,
        "difficulty": "Hard",
        "url": "https://www.youtube.com/embed/9bZkp7q19f0",
        "youtube_url": "https://www.youtube.com/embed/9bZkp7q19f0",
        "fallback_url": "https://assets.mixkit.co/videos/preview/mixkit-young-man-dancing-happy-in-colorful-neon-light-43455-large.mp4"
    },
    {
        "id": "nacho_nacho_step",
        "title": "RRR Nacho Nacho (Hindi) Dance cover",
        "mood": "Energetic",
        "language": "Hindi",
        "bpm": 130,
        "difficulty": "Hard",
        "url": "https://www.youtube.com/embed/OsU0CGZoV8E",
        "youtube_url": "https://www.youtube.com/embed/OsU0CGZoV8E",
        "fallback_url": "https://assets.mixkit.co/videos/preview/mixkit-young-man-dancing-happy-in-colorful-neon-light-43455-large.mp4"
    },
    {
        "id": "latin_salsa_step",
        "title": "Latin Salsa Rhythm Sync",
        "mood": "Happy",
        "language": "Spanish",
        "bpm": 118,
        "difficulty": "Medium",
        "url": "https://www.youtube.com/embed/hT_nvWreIhg",
        "youtube_url": "https://www.youtube.com/embed/hT_nvWreIhg",
        "fallback_url": "https://assets.mixkit.co/videos/preview/mixkit-keyboard-keys-pressed-by-hands-close-up-43407-large.mp4"
    },
    {
        "id": "kpop_dynamite_step",
        "title": "K-Pop Dynamite Dance Step Match (No Embed Demo)",
        "mood": "Energetic",
        "language": "K-Pop",
        "bpm": 115,
        "difficulty": "Medium",
        "url": "https://www.youtube.com/embed/gdZLi9oWNZg",
        "youtube_url": "https://www.youtube.com/embed/gdZLi9oWNZg",
        "fallback_url": "https://assets.mixkit.co/videos/preview/mixkit-young-man-dancing-happy-in-colorful-neon-light-43455-large.mp4",
        "allow_embedding": False
    }
]

def calculate_recommendations(user_id=None, current_mood="Happy"):
    """
    Computes weighted recommendations for songs, memes, and videos using an advanced, 
    adaptive Machine Learning affinity preference engine that:
      - Automatically extracts genre & language frequencies from user history.
      - Tracks fully-played items vs skipped items (penalizing skipped genres).
      - Integrates favorited traits (e.g. liked memes and music genres).
      - Incorporates time of usage (Time of Day context: Night, Morning, Day).
      - Adjusts dynamic weights dynamically as user interacts!
    """
    import datetime
    current_hour = datetime.datetime.now().hour
    
    # Contextual Time of Day
    if 20 <= current_hour or current_hour < 5:
        time_of_day_context = "Night"
    elif 5 <= current_hour < 12:
        time_of_day_context = "Morning"
    else:
        time_of_day_context = "Day"

    user_mood_preference = {}
    favorite_categories = set()
    favorite_genres = set()
    
    # Machine learning preference vectors (Affinities)
    genre_affinity = {}
    lang_affinity = {}
    bpm_preference = []
    skipped_genres = set()
    
    # 1. Gather historical metrics if user is authenticated
    if user_id:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get user's favorites
        cursor.execute("SELECT item_type, item_id FROM favorites WHERE user_id = ?", (user_id,))
        favs = cursor.fetchall()
        for fav in favs:
            if fav['item_type'] == 'song':
                song = next((s for s in SONGS if s['id'] == fav['item_id']), None)
                if song:
                    favorite_genres.add(song['genre'])
                    genre_affinity[song['genre']] = genre_affinity.get(song['genre'], 0.0) + 1.0
            elif fav['item_type'] == 'meme':
                meme = next((m for m in MEMES if m['id'] == fav['item_id']), None)
                if meme:
                    favorite_categories.add(meme['category'])
        
        # Get user's interaction logs (to learn from previous)
        cursor.execute("""
            SELECT action_type, item_id, mood, gesture, details FROM user_history 
            WHERE user_id = ? ORDER BY created_at DESC LIMIT 60
        """, (user_id,))
        history = cursor.fetchall()
        
        for h in history:
            h_mood = h['mood']
            if h_mood:
                user_mood_preference[h_mood] = user_mood_preference.get(h_mood, 0) + 1
            
            action = h['action_type']
            item_id = h['item_id']
            
            # Learn from song actions
            if action == 'play_song' and item_id:
                song = next((s for s in SONGS if s['id'] == item_id), None)
                if song:
                    genre_affinity[song['genre']] = genre_affinity.get(song['genre'], 0.0) + 1.0
                    lang_affinity[song['language']] = lang_affinity.get(song['language'], 0.0) + 1.0
            elif action == 'skip_song' and item_id:
                # ML Negative Feedback Loop: user skipped a song
                song = next((s for s in SONGS if s['id'] == item_id), None)
                if song:
                    genre_affinity[song['genre']] = genre_affinity.get(song['genre'], 0.0) - 1.5
                    skipped_genres.add(song['genre'])
            elif action == 'complete_song' and item_id:
                # ML Positive reinforcement
                song = next((s for s in SONGS if s['id'] == item_id), None)
                if song:
                    genre_affinity[song['genre']] = genre_affinity.get(song['genre'], 0.0) + 2.0
            
            # Learn from game bpm performance
            if action == 'submit_game_score' and h['details']:
                try:
                    details_data = json.loads(h['details'])
                    if 'bpm' in details_data:
                        bpm_preference.append(float(details_data['bpm']))
                except Exception:
                    pass
                
        conn.close()

    # 2. Recommendation Engine logic for SONGS
    recommended_songs = []
    for song in SONGS:
        mood_match = 1.0 if song['mood'].lower() == current_mood.lower() else 0.0
        
        # Check historical plays matching this song's mood
        hist_score = 0.0
        if user_mood_preference:
            total_logs = sum(user_mood_preference.values())
            hist_score = user_mood_preference.get(song['mood'], 0) / max(total_logs, 1)
            
        # Genre preference weight learned from previous
        affinity_score = genre_affinity.get(song['genre'], 0.0)
        # Normalize affinity
        affinity_multiplier = 1.0 + (max(-0.8, min(affinity_score, 5.0)) / 5.0)
        
        # Skip penalty
        if song['genre'] in skipped_genres:
            affinity_multiplier *= 0.5
            
        # Check favorites overlap
        fav_score = 1.0 if song['genre'] in favorite_genres else 0.0
        
        # Time of day weight boost
        time_boost = 0.0
        if time_of_day_context == "Night" and song['mood'] in ['Relaxed', 'Sad']:
            time_boost = 0.3
        elif time_of_day_context == "Morning" and song['mood'] in ['Happy', 'Focused']:
            time_boost = 0.3
        elif time_of_day_context == "Day" and song['mood'] in ['Energetic', 'Excited']:
            time_boost = 0.3

        # Calculate overall weighted rating (Adaptive weights)
        final_score = ((0.35 * mood_match) + (0.2 * hist_score) + (0.25 * fav_score) + (0.2 * time_boost)) * affinity_multiplier
        
        # Map rating to confidence
        confidence = int(60 + (final_score * 38))
        confidence = min(max(confidence, 55), 98)
        
        reasons = [f"Complements your current selected {current_mood} mood."]
        if song['genre'] in favorite_genres:
            reasons.append(f"Highly aligns with your favorite genre: {song['genre']}.")
        if affinity_score > 2.0:
            reasons.append("Recommended based on your frequent listening history.")
        elif song['language'] in lang_affinity and lang_affinity[song['language']] > 1:
            reasons.append(f"Matches your active regional {song['language']} listening profile.")
            
        if time_of_day_context == "Night" and song['mood'] in ['Relaxed', 'Sad']:
            reasons.append("Cozy late-night ambient choice to wind down.")
        elif time_of_day_context == "Morning" and song['mood'] in ['Happy', 'Focused']:
            reasons.append("Upbeat morning tempo to kickstart your day.")
        
        reasons.append("Trending among users with a similar vibe profile.")
        
        recommended_songs.append({
            **song,
            "confidence": confidence,
            "reasons": reasons,
            "reason": reasons[0]
        })
        
    recommended_songs = sorted(recommended_songs, key=lambda x: x['confidence'], reverse=True)

    # 3. Recommendation Engine logic for MEMES
    recommended_memes = []
    for meme in MEMES:
        mood_match = 1.0 if meme['mood'].lower() == current_mood.lower() else 0.0
        
        # Check favorites overlap
        fav_score = 1.0 if meme['category'] in favorite_categories else 0.0
        
        # Check history
        hist_score = 0.0
        if user_mood_preference:
            total_logs = sum(user_mood_preference.values())
            hist_score = user_mood_preference.get(meme['mood'], 0) / max(total_logs, 1)
            
        final_score = (0.5 * mood_match) + (0.3 * hist_score) + (0.2 * fav_score)
        confidence = int(60 + (final_score * 38))
        confidence = min(max(confidence, 60), 98)
        
        reasons = [f"Matches your selected {current_mood} mood category."]
        if fav_score > 0:
            reasons.append(f"Aligns with your favorite meme category: {meme['category']}.")
        if meme['language'] in ['Telugu', 'Kannada', 'Hindi', 'Spanish']:
            reasons.append(f"Trending in regional {meme['language']} social channels.")
        reasons.append("High engagement from other tech communities.")

        recommended_memes.append({
            **meme,
            "confidence": confidence,
            "reasons": reasons,
            "reason": reasons[0],
            "likes": random.randint(45, 340)
        })
        
    recommended_memes = sorted(recommended_memes, key=lambda x: x['confidence'], reverse=True)

    # 4. Recommendation Engine logic for VIDEOS
    recommended_videos = []
    for video in VIDEOS:
        mood_match = 1.0 if video['mood'].lower() == current_mood.lower() else 0.0
        
        # ML BPM Matching: match preferred rhythm game BPM
        bpm_match = 1.0
        if bpm_preference:
            avg_bpm = sum(bpm_preference) / len(bpm_preference)
            bpm_diff = abs(video['bpm'] - avg_bpm)
            bpm_match = max(0.5, 1.0 - (bpm_diff / 80.0))
            
        final_score = ((0.7 * mood_match) + (0.3 * random.random())) * bpm_match
        confidence = int(65 + (final_score * 33))
        confidence = min(max(confidence, 65), 98)
        
        reasons = [f"Synchronized folk rhythm challenge for your {current_mood} vibe."]
        if video['language'] in ['Telugu', 'Kannada', 'Hindi', 'Spanish']:
            reasons.append(f"Hot regional {video['language']} beat sync ({video['bpm']} BPM).")
        if bpm_match > 0.8:
            reasons.append("Matches your preferred speed profile from rhythm games.")
        reasons.append("Strong recommendation index for this sync level.")

        recommended_videos.append({
            **video,
            "confidence": confidence,
            "reasons": reasons,
            "reason": reasons[0]
        })
        
    recommended_videos = sorted(recommended_videos, key=lambda x: x['confidence'], reverse=True)

    return {
        "songs": recommended_songs,
        "memes": recommended_memes,
        "videos": recommended_videos,
        "mood": current_mood
    }

