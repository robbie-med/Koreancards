// ============================================
// STORAGE.JS - Data persistence layer
// ============================================

const STORAGE_KEYS = {
    CARDS: 'kfc_cards',
    STATS: 'kfc_stats',
    SETTINGS: 'kfc_settings',
    STREAK: 'kfc_streak',
    LAST_STUDY: 'kfc_last_study',
};

const DEFAULT_SETTINGS = {
    dailyGoal: 10,
    readingMode: true,
    autoPlayAudio: false,
    showReading: true,
    newCardsPerDay: 5,
    reviewCardsPerDay: 20,
    topikGoal: 'TOPIK6',
};

const DEFAULT_STATS = {
    totalStudySessions: 0,
    totalCardsStudied: 0,
    totalMinutes: 0,
    cardsAdded: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
    dailyHistory: {}, // { "2026-04-21": { cards: 5, minutes: 10 } }
    topicBreakdown: {}, // { "home": 15, "church": 10 }
};

class Storage {
    static getCards() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.CARDS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error loading cards:', e);
            return [];
        }
    }

    static saveCards(cards) {
        localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
    }

    static getStats() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.STATS);
            return data ? { ...DEFAULT_STATS, ...JSON.parse(data) } : { ...DEFAULT_STATS };
        } catch (e) {
            return { ...DEFAULT_STATS };
        }
    }

    static saveStats(stats) {
        localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    }

    static getSettings() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
        } catch (e) {
            return { ...DEFAULT_SETTINGS };
        }
    }

    static saveSettings(settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }

    static getStreak() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.STREAK);
            return data ? JSON.parse(data) : { current: 0, longest: 0, lastDate: null };
        } catch (e) {
            return { current: 0, longest: 0, lastDate: null };
        }
    }

    static saveStreak(streak) {
        localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
    }

    static exportData() {
        return JSON.stringify({
            cards: this.getCards(),
            stats: this.getStats(),
            settings: this.getSettings(),
            streak: this.getStreak(),
            exportDate: new Date().toISOString(),
            version: '1.0',
        }, null, 2);
    }

    static importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.cards) this.saveCards(data.cards);
            if (data.stats) this.saveStats(data.stats);
            if (data.settings) this.saveSettings(data.settings);
            if (data.streak) this.saveStreak(data.streak);
            return true;
        } catch (e) {
            console.error('Import failed:', e);
            return false;
        }
    }

    static clearAll() {
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    }

    // Initialize with starter vocabulary if empty
    static initializeStarterDeck() {
        const existing = this.getCards();
        if (existing.length === 0 && typeof STARTER_VOCABULARY !== 'undefined') {
            const now = Date.now();
            const starterCards = STARTER_VOCABULARY.map((item, index) => ({
                id: 'starter_' + index,
                front: item.korean,
                back: item.english,
                reading: item.reading || '',
                notes: item.notes || '',
                topic: item.topic || 'general',
                level: item.level || 'TOPIK1',
                created: now,
                interval: 0,
                repetitions: 0,
                easeFactor: 2.5,
                nextReview: now,
                lastReviewed: null,
                audioData: null,
                isStarter: true,
            }));
            this.saveCards(starterCards);

            // Update stats
            const stats = this.getStats();
            stats.cardsAdded = starterCards.length;
            this.saveStats(stats);

            return starterCards.length;
        }
        return 0;
    }
}
