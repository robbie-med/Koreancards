// ============================================
// APP.JS - Main application entry point
// ============================================

let currentView = 'study';

function switchView(view) {
    currentView = view;

    // Update nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Render view
    const container = document.getElementById('main-content');
    container.innerHTML = '<div style="text-align:center;padding:40px;">Loading...</div>';

    switch(view) {
        case 'study': renderStudyView(); break;
        case 'cards': renderCardsView(); break;
        case 'add': renderAddView(); break;
        case 'suggestions': renderSuggestionsView(); break;
        case 'stats': renderStatsView(); break;
        case 'settings': renderSettingsView(); break;
        default: renderStudyView();
    }

    // Update streak display
    updateStreak();
}

function updateStreak() {
    const streak = Storage.getStreak();
    const el = document.getElementById('streak-count');
    if (el) el.textContent = streak.current;
}

function checkAndUpdateStreak() {
    const streak = Storage.getStreak();
    const today = new Date().toISOString().split('T')[0];
    const lastDate = streak.lastDate;

    if (lastDate === today) {
        // Already studied today
        return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastDate === yesterdayStr) {
        // Consecutive day
        streak.current++;
        if (streak.current > streak.longest) {
            streak.longest = streak.current;
        }
    } else if (lastDate && lastDate !== today) {
        // Streak broken
        streak.current = 1;
    } else {
        // First study ever
        streak.current = 1;
        streak.longest = 1;
    }

    streak.lastDate = today;
    Storage.saveStreak(streak);
    updateStreak();
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize storage with starter deck if empty
    const initialized = Storage.initializeStarterDeck();
    if (initialized > 0) {
        console.log(`Initialized with ${initialized} starter cards`);
    }

    // Check streak on load
    checkAndUpdateStreak();

    // Setup nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    // Start with study view
    switchView('study');

    // Show welcome toast for first visit
    const cards = Storage.getCards();
    if (cards.length <= STARTER_VOCABULARY.length) {
        setTimeout(() => {
            showToast('Welcome! Start by studying cards or add your own with wife's audio!', 'info', 5000);
        }, 1000);
    }
});

// Handle visibility change (update streak when returning)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        checkAndUpdateStreak();
        updateStreak();
    }
});
