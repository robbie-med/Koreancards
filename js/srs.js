// ============================================
// SRS.JS - Spaced Repetition System (SM-2 variant)
// ============================================

class SRS {
    // SM-2 algorithm parameters
    static MIN_EASE = 1.3;
    static DEFAULT_EASE = 2.5;
    static EASY_BONUS = 1.3;
    static HARD_PENALTY = 0.85;
    static AGAIN_PENALTY = 0.8;

    static getDueCards(cards, limit = 50) {
        const now = Date.now();
        return cards
            .filter(card => card.nextReview <= now)
            .sort((a, b) => a.nextReview - b.nextReview)
            .slice(0, limit);
    }

    static getNewCards(cards, limit = 10) {
        return cards
            .filter(card => card.repetitions === 0)
            .slice(0, limit);
    }

    static getReviewQueue(cards, settings = {}) {
        const newLimit = settings.newCardsPerDay || 5;
        const reviewLimit = settings.reviewCardsPerDay || 20;

        const dueCards = this.getDueCards(cards, reviewLimit);
        const newCards = this.getNewCards(cards, newLimit);

        // Interleave: new, review, new, review...
        const queue = [];
        let n = 0, r = 0;
        while (n < newCards.length || r < dueCards.length) {
            if (n < newCards.length) queue.push({ ...newCards[n], isNew: true });
            n++;
            if (r < dueCards.length) queue.push({ ...dueCards[r], isNew: false });
            r++;
        }

        return queue;
    }

    static processReview(card, difficulty) {
        const now = Date.now();
        const DAY_MS = 24 * 60 * 60 * 1000;

        let { interval, repetitions, easeFactor } = card;

        switch (difficulty) {
            case 'again': // Didn't know it
                repetitions = 0;
                interval = 1 * DAY_MS; // 1 minute (in practice, show again soon)
                easeFactor = Math.max(this.MIN_EASE, easeFactor - 0.2);
                break;

            case 'hard': // Knew but struggled
                repetitions = Math.max(1, repetitions);
                interval = interval * this.HARD_PENALTY;
                easeFactor = Math.max(this.MIN_EASE, easeFactor - 0.15);
                break;

            case 'good': // Knew it well
                repetitions++;
                if (repetitions === 1) interval = 1 * DAY_MS;
                else if (repetitions === 2) interval = 6 * DAY_MS;
                else interval = Math.round(interval * easeFactor);
                break;

            case 'easy': // Knew it perfectly
                repetitions++;
                if (repetitions === 1) interval = 4 * DAY_MS;
                else if (repetitions === 2) interval = 8 * DAY_MS;
                else interval = Math.round(interval * easeFactor * this.EASY_BONUS);
                easeFactor += 0.15;
                break;
        }

        // Cap interval at 1 year
        interval = Math.min(interval, 365 * DAY_MS);

        return {
            ...card,
            interval,
            repetitions,
            easeFactor: Math.max(this.MIN_EASE, easeFactor),
            nextReview: now + interval,
            lastReviewed: now,
        };
    }

    static getIntervalLabel(card, difficulty) {
        const DAY_MS = 24 * 60 * 60 * 1000;
        const MIN_MS = 60 * 1000;

        let interval;
        if (difficulty === 'again') return '< 1m';
        if (difficulty === 'hard') {
            if (card.repetitions === 0) return '10m';
            interval = card.interval * this.HARD_PENALTY;
        } else if (difficulty === 'good') {
            if (card.repetitions === 0) return '1d';
            if (card.repetitions === 1) return '6d';
            interval = card.interval * card.easeFactor;
        } else { // easy
            if (card.repetitions === 0) return '4d';
            if (card.repetitions === 1) return '8d';
            interval = card.interval * card.easeFactor * this.EASY_BONUS;
        }

        if (interval < MIN_MS) return '< 1m';
        if (interval < DAY_MS) return Math.round(interval / MIN_MS) + 'm';
        if (interval < 30 * DAY_MS) return Math.round(interval / DAY_MS) + 'd';
        return Math.round(interval / (30 * DAY_MS)) + 'mo';
    }

    static getCardStatus(card) {
        if (card.repetitions === 0) return 'new';
        if (card.interval < 21 * 24 * 60 * 60 * 1000) return 'learning';
        if (card.interval < 90 * 24 * 60 * 60 * 1000) return 'review';
        return 'mastered';
    }

    static getStats(cards) {
        const now = Date.now();
        const DAY_MS = 24 * 60 * 60 * 1000;

        return {
            total: cards.length,
            new: cards.filter(c => c.repetitions === 0).length,
            learning: cards.filter(c => c.repetitions > 0 && c.interval < 21 * DAY_MS).length,
            review: cards.filter(c => c.interval >= 21 * DAY_MS && c.interval < 90 * DAY_MS).length,
            mastered: cards.filter(c => c.interval >= 90 * DAY_MS).length,
            dueToday: cards.filter(c => c.nextReview <= now).length,
            dueTomorrow: cards.filter(c => c.nextReview > now && c.nextReview <= now + DAY_MS).length,
        };
    }
}
