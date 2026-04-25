# 🇰🇷 한국어 연습 - Korean Flashcards

A personalized Korean learning flashcard app built for a family medicine resident preparing to move to Korea and take medical boards in 5 years.

## Features

- **🎯 Spaced Repetition (SM-2)** - Efficient memorization algorithm
- **🎙️ Audio Recording** - Have your wife record native pronunciation
- **📖 Reading Practice Mode** - Practice reading aloud with mic
- **💡 Smart Suggestions** - AI-powered next word recommendations based on your progress
- **📊 TOPIK Level Tracking** - Estimate your proficiency and get test recommendations
- **📈 5-Year Progress Tracker** - Stay on track for medical board goals
- **🔥 Streak Tracking** - Daily study motivation
- **🏷️ Topic Organization** - Home, Church, Medical, Family, Cat, Garden, Music, Art, Chemistry
- **💾 Local Storage** - All data stays on your device
- **📤 Export/Import** - Backup your progress

## Quick Start

1. Open `index.html` in any modern browser (Chrome/Firefox/Safari)
2. Start studying with the pre-loaded 181 vocabulary cards
3. Click "Add" to create custom cards with your wife's audio
4. Check "Stats" to see your TOPIK level estimate
5. Visit "Words" for smart suggestions on what to learn next

## File Structure

```
korean-flashcards/
├── index.html          # Main entry point
├── css/
│   ├── main.css        # Core styles, variables, layout
│   ├── study.css       # Flashcard study mode, reading practice
│   ├── cards.css       # Card list, audio recorder, forms
│   └── stats.css       # Dashboard, TOPIK gauge, calendar
├── js/
│   ├── data.js         # 181 starter vocabulary words + metadata
│   ├── storage.js      # LocalStorage persistence layer
│   ├── srs.js          # SM-2 spaced repetition algorithm
│   ├── audio.js        # Web Audio API recording/playback
│   ├── topik.js        # TOPIK level estimation & milestones
│   ├── suggestions.js  # Smart word recommendation engine
│   ├── views.js        # All UI view rendering functions
│   └── app.js          # Main app controller & initialization
└── data/
    └── starter.json    # Starter deck metadata
```

## GitHub Pages Deployment

1. Create a new GitHub repository
2. Upload all files (maintaining folder structure)
3. Go to Settings → Pages
4. Select "Deploy from a branch" → "main" → "/ (root)"
5. Your app will be live at `https://yourusername.github.io/korean-flashcards/`

## Daily Workflow

**With wife (5 min):**
1. Open app → Study mode
2. Review due cards together
3. She corrects pronunciation
4. Add any new words from conversation

**Solo (5 min):**
1. Study more cards
2. Check "Words" tab for suggestions
3. Review stats and streak

**Deep work (5+ min when possible):**
1. Add cards with audio recording
2. Practice reading aloud
3. Explore medical vocabulary

## Customization

Edit `js/data.js` to:
- Add more starter vocabulary
- Change topic categories
- Adjust TOPIK level thresholds
- Add reading practice sentences

## Browser Requirements

- Modern browser with LocalStorage support
- Microphone access for audio recording (HTTPS required for mic)
- For local use: open via `file://` works for everything except microphone
- For mic recording: serve via local server or deploy to HTTPS

## Data Backup

Always export your data regularly from the Settings tab. The export is a JSON file containing all cards, stats, and settings.

---

Built with ❤️ for 한국어 연습
