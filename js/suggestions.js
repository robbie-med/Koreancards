// ============================================
// SUGGESTIONS.JS - Intelligent next-word recommendations
// ============================================

class SuggestionEngine {

    // Scored flat list (used internally)
    static getSuggestions(cards, limit = 30) {
        const detailed = TOPIKEstimator.getDetailedProgress(cards);
        const levels = ['TOPIK1', 'TOPIK2', 'TOPIK3', 'TOPIK4', 'TOPIK5', 'TOPIK6'];
        const currentLevelObj = detailed.find(d => !d.achieved) || detailed[5];
        const currentLevelIdx = levels.indexOf(currentLevelObj.level);
        const settings = Storage.getSettings();
        const goalIdx = levels.indexOf(settings.topikGoal || 'TOPIK6');
        const userTopics = this.getUserTopicDistribution(cards);
        const stats = Storage.getStats();
        const monthsStudying = Object.keys(stats.dailyHistory || {}).length / 30;

        const scored = STARTER_VOCABULARY.map(item => {
            if (cards.some(c => c.front === item.korean)) return null;

            const itemIdx = levels.indexOf(item.level);
            let score = 0;

            // Words at or below current level fill the gap fastest
            if (itemIdx <= currentLevelIdx) score += 30;
            else if (itemIdx === currentLevelIdx + 1) score += 20;
            else score += Math.max(0, 10 - (itemIdx - currentLevelIdx) * 3);

            // Medical boost scales with goal level and time studying
            if (item.topic === 'medical') {
                if (goalIdx >= 4) score += 10;
                if (monthsStudying > 12) score += 15;
            }

            // Practical topics first when starting out
            const practicalTopics = ['phrases', 'home', 'church', 'family', 'cat'];
            if (practicalTopics.includes(item.topic) && cards.length < 100) score += 12;

            // Slightly penalise over-represented topics
            const topicCount = userTopics[item.topic] || 0;
            if (topicCount > 15) score -= 10;
            else if (topicCount > 8) score -= 4;

            return { ...item, score };
        }).filter(Boolean);

        return scored.sort((a, b) => b.score - a.score).slice(0, limit);
    }

    // Level-grouped sections used by the suggestions view
    static getSuggestionsByLevel(cards) {
        const thresholds = TOPIKEstimator.getLevelThresholds();
        const detailed = TOPIKEstimator.getDetailedProgress(cards);
        const levels = ['TOPIK1', 'TOPIK2', 'TOPIK3', 'TOPIK4', 'TOPIK5', 'TOPIK6'];
        const settings = Storage.getSettings();
        const goalLevel = settings.topikGoal || 'TOPIK6';
        const goalIdx = levels.indexOf(goalLevel);

        const currentLevelObj = detailed.find(d => !d.achieved) || detailed[5];
        const currentLevelIdx = levels.indexOf(currentLevelObj.level);

        const unlearned = STARTER_VOCABULARY.filter(item =>
            !cards.some(c => c.front === item.korean)
        );

        const byLevel = {};
        levels.forEach(lv => { byLevel[lv] = unlearned.filter(w => w.level === lv); });

        const sections = [];

        // 1. Solidify current level (highest priority)
        if (byLevel[currentLevelObj.level]?.length > 0) {
            const d = detailed[currentLevelIdx];
            sections.push({
                level: currentLevelObj.level,
                color: thresholds[currentLevelObj.level].color,
                light: thresholds[currentLevelObj.level].light,
                short: thresholds[currentLevelObj.level].short,
                title: `Complete ${thresholds[currentLevelObj.level].label}`,
                subtitle: `${d.cumulative} / ${d.threshold} words · ${d.wordsNeeded} more to unlock this level`,
                priority: 'current',
                words: byLevel[currentLevelObj.level].slice(0, 8),
                progress: d.progress,
            });
        }

        // 2. Preview next level (if within goal)
        const nextIdx = currentLevelIdx + 1;
        if (nextIdx <= goalIdx && nextIdx <= 5 && byLevel[levels[nextIdx]]?.length > 0) {
            const nextLv = levels[nextIdx];
            const d = detailed[nextIdx];
            sections.push({
                level: nextLv,
                color: thresholds[nextLv].color,
                light: thresholds[nextLv].light,
                short: thresholds[nextLv].short,
                title: `Build toward ${thresholds[nextLv].label}`,
                subtitle: `${d.cumulative} / ${d.threshold} cumulative words · start building now`,
                priority: 'next',
                words: byLevel[nextLv].slice(0, 6),
                progress: d.progress,
            });
        }

        // 3. Medical focus if boards is the goal and foundation is established
        if (goalIdx >= 4 && cards.length >= 40) {
            const medUnlearned = unlearned.filter(w => w.topic === 'medical');
            if (medUnlearned.length > 0) {
                const medCount = cards.filter(c => c.topic === 'medical').length;
                sections.push({
                    level: 'medical',
                    color: '#2196F3',
                    light: '#E3F2FD',
                    short: '🏥',
                    title: 'Medical Korean',
                    subtitle: `Boards goal · ${medCount} medical words in your deck so far`,
                    priority: 'goal',
                    words: medUnlearned.slice(0, 6),
                    progress: Math.min(100, Math.round((medCount / 150) * 100)),
                });
            }
        }

        return { sections, currentLevel: currentLevelObj, detailed };
    }

    static getSmartSuggestions(cards) {
        const suggestions = [];
        const detailed = TOPIKEstimator.getDetailedProgress(cards);
        const currentLevel = detailed.find(d => !d.achieved) || detailed[5];
        const settings = Storage.getSettings();
        const goalLevel = settings.topikGoal || 'TOPIK6';
        const thresholds = TOPIKEstimator.getLevelThresholds();
        const streak = Storage.getStreak();

        // Level progress insight
        if (currentLevel.wordsNeeded > 0) {
            suggestions.push({
                type: 'level_progress',
                message: `${currentLevel.progress}% toward ${currentLevel.label}. Add ${currentLevel.wordsNeeded} more words to hit this milestone.`,
            });
        } else {
            const levels = ['TOPIK1', 'TOPIK2', 'TOPIK3', 'TOPIK4', 'TOPIK5', 'TOPIK6'];
            const nextIdx = levels.indexOf(currentLevel.level) + 1;
            const nextLabel = nextIdx < 6 ? thresholds[levels[nextIdx]]?.label : null;
            suggestions.push({
                type: 'level_achieved',
                message: nextLabel
                    ? `${currentLevel.label} vocabulary unlocked! Now pushing toward ${nextLabel}.`
                    : 'You\'ve reached the highest level — nearly board-ready!',
            });
        }

        // Medical gap alert
        const medicalCount = cards.filter(c => c.topic === 'medical').length;
        if (cards.length > 80 && medicalCount < 15) {
            suggestions.push({
                type: 'medical_push',
                message: `Medical vocabulary is thin (${medicalCount} words). For boards, you'll need 150+ medical terms — start the 🏥 section below.`,
                topics: ['medical'],
            });
        }

        // Reading practice nudge
        if (cards.length > 30 && !settings.readingMode) {
            suggestions.push({
                type: 'reading_ready',
                message: 'You know enough words to practice reading aloud. Enable Reading Mode in Settings.',
            });
        }

        // Streak celebration
        if (streak.current > 0 && streak.current % 7 === 0) {
            suggestions.push({
                type: 'milestone',
                message: `${streak.current}-day streak! Consistency like this is how fluency is built.`,
            });
        }

        return suggestions;
    }

    static getUserTopicDistribution(cards) {
        const dist = {};
        cards.forEach(c => { dist[c.topic] = (dist[c.topic] || 0) + 1; });
        return dist;
    }

    static getUserLevelDistribution(cards) {
        const dist = {};
        cards.forEach(c => { dist[c.level] = (dist[c.level] || 0) + 1; });
        return dist;
    }

    static getRecentTopics(cards, days) {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        return [...new Set(cards.filter(c => c.created > cutoff).map(c => c.topic))];
    }

    static getMaxUserLevel(levelDist) {
        const levels = Object.keys(levelDist);
        if (levels.length === 0) return 'TOPIK1';
        return levels.sort((a, b) => parseInt(b.replace('TOPIK', '')) - parseInt(a.replace('TOPIK', '')))[0];
    }

    static getReadingSentences(cards, count = 5) {
        const totalCards = cards.length;
        let maxLevel = 1;
        if (totalCards > 100) maxLevel = 3;
        else if (totalCards > 50) maxLevel = 2;
        return READING_SENTENCES.filter(s => s.level <= maxLevel).slice(0, count);
    }
}
