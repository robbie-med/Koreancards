// ============================================
// SUGGESTIONS.JS - Intelligent next-word recommendations
// ============================================

class SuggestionEngine {
    // Get suggestions based on user's current cards and patterns
    static getSuggestions(cards, limit = 20) {
        const userTopics = this.getUserTopicDistribution(cards);
        const userLevels = this.getUserLevelDistribution(cards);
        const recentTopics = this.getRecentTopics(cards, 7);

        // Score each starter word
        const scored = STARTER_VOCABULARY.map(item => {
            let score = 0;

            // Not already in user's deck = higher priority
            const exists = cards.some(c => c.front === item.korean);
            if (exists) score -= 100;

            // Match underrepresented topics
            const topicCount = userTopics[item.topic] || 0;
            if (topicCount < 5) score += 20;
            else if (topicCount < 15) score += 10;

            // Slightly favor user's current level + 1
            const userMaxLevel = this.getMaxUserLevel(userLevels);
            const itemLevelNum = parseInt(item.level.replace('TOPIK', ''));
            const userLevelNum = parseInt(userMaxLevel.replace('TOPIK', ''));

            if (itemLevelNum === userLevelNum) score += 15;
            if (itemLevelNum === userLevelNum + 1) score += 10;
            if (itemLevelNum < userLevelNum) score -= 5;

            // Boost topics recently studied (spaced variety)
            if (!recentTopics.includes(item.topic)) score += 8;

            // Prioritize practical topics early on
            const practicalTopics = ['phrases', 'home', 'church', 'family', 'cat'];
            if (practicalTopics.includes(item.topic) && cards.length < 100) score += 10;

            // Medical priority for year 2+
            const stats = Storage.getStats();
            const monthsStudying = Object.keys(stats.dailyHistory || {}).length / 30;
            if (monthsStudying > 12 && item.topic === 'medical') score += 15;

            return { ...item, score, exists };
        });

        return scored
            .filter(s => !s.exists)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    static getUserTopicDistribution(cards) {
        const dist = {};
        cards.forEach(c => {
            dist[c.topic] = (dist[c.topic] || 0) + 1;
        });
        return dist;
    }

    static getUserLevelDistribution(cards) {
        const dist = {};
        cards.forEach(c => {
            dist[c.level] = (dist[c.level] || 0) + 1;
        });
        return dist;
    }

    static getRecentTopics(cards, days) {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        const recent = cards.filter(c => c.created > cutoff);
        return [...new Set(recent.map(c => c.topic))];
    }

    static getMaxUserLevel(levelDist) {
        const levels = Object.keys(levelDist);
        if (levels.length === 0) return 'TOPIK1';
        return levels.sort((a, b) => {
            return parseInt(b.replace('TOPIK', '')) - parseInt(a.replace('TOPIK', ''));
        })[0];
    }

    // Get "smart" suggestions based on what user is missing
    static getSmartSuggestions(cards) {
        const suggestions = [];
        const topics = this.getUserTopicDistribution(cards);

        // Identify weak topics
        const allTopics = Object.keys(TOPIC_METADATA);
        const weakTopics = allTopics.filter(t => (topics[t] || 0) < 3);

        if (weakTopics.length > 0) {
            suggestions.push({
                type: 'topic_gap',
                message: `You haven't explored ${weakTopics.slice(0, 2).map(t => TOPIC_METADATA[t]?.label || t).join(' or ')} yet. Want to try?`,
                topics: weakTopics.slice(0, 2),
            });
        }

        // Check if user needs more medical vocab
        const medicalCount = topics['medical'] || 0;
        const total = cards.length;
        if (total > 100 && medicalCount < 10) {
            suggestions.push({
                type: 'medical_push',
                message: 'You have a strong foundation! Time to add medical terms for your 5-year goal.',
                topics: ['medical'],
            });
        }

        // Check reading practice readiness
        const hasBasic = total > 30;
        const settings = Storage.getSettings();
        if (hasBasic && !settings.readingMode) {
            suggestions.push({
                type: 'reading_ready',
                message: 'You know enough words to start reading practice! Enable it in settings.',
                action: 'enable_reading',
            });
        }

        // Streak encouragement
        const streak = Storage.getStreak();
        if (streak.current > 0 && streak.current % 7 === 0) {
            suggestions.push({
                type: 'milestone',
                message: `${streak.current} day streak! Amazing consistency.`,
            });
        }

        return suggestions;
    }

    // Get reading sentences appropriate for user's level
    static getReadingSentences(cards, count = 5) {
        const totalCards = cards.length;
        let maxLevel = 1;

        if (totalCards > 100) maxLevel = 3;
        else if (totalCards > 50) maxLevel = 2;

        return READING_SENTENCES
            .filter(s => s.level <= maxLevel)
            .slice(0, count);
    }
}
