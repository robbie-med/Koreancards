// ============================================
// TOPIK.JS - Level estimation & test recommendations
// ============================================

class TOPIKEstimator {

    static getLevelThresholds() {
        return {
            TOPIK1: { total: 50,   label: 'TOPIK I · Level 1',        short: 'L1', description: 'Basic survival Korean',          color: '#27AE60', light: '#E8F5E9' },
            TOPIK2: { total: 150,  label: 'TOPIK I · Level 2',        short: 'L2', description: 'Simple daily conversations',     color: '#2ECC71', light: '#F0FFF0' },
            TOPIK3: { total: 300,  label: 'TOPIK II · Level 3',       short: 'L3', description: 'Daily life fluency',             color: '#3498DB', light: '#EBF5FB' },
            TOPIK4: { total: 500,  label: 'TOPIK II · Level 4',       short: 'L4', description: 'Social & professional fluency',  color: '#9B59B6', light: '#F4ECF7' },
            TOPIK5: { total: 800,  label: 'TOPIK II · Level 5',       short: 'L5', description: 'Advanced — medical ready',       color: '#E67E22', light: '#FEF9E7' },
            TOPIK6: { total: 1200, label: 'TOPIK II · Level 6',       short: 'L6', description: 'Professional / board-ready',     color: '#E74C3C', light: '#FDEDEC' },
        };
    }

    // Count how many cards the user has at each TOPIK level
    static getVocabByLevel(cards) {
        const byLevel = { TOPIK1: 0, TOPIK2: 0, TOPIK3: 0, TOPIK4: 0, TOPIK5: 0, TOPIK6: 0 };
        cards.forEach(c => {
            const lv = c.level || 'TOPIK1';
            if (lv in byLevel) byLevel[lv]++;
        });
        return byLevel;
    }

    // Count learned (non-new) cards at each level
    static getMasteredByLevel(cards) {
        const byLevel = { TOPIK1: 0, TOPIK2: 0, TOPIK3: 0, TOPIK4: 0, TOPIK5: 0, TOPIK6: 0 };
        cards.forEach(c => {
            const status = SRS.getCardStatus(c);
            if (status !== 'new') {
                const lv = c.level || 'TOPIK1';
                if (lv in byLevel) byLevel[lv]++;
            }
        });
        return byLevel;
    }

    // Full per-level breakdown used by stats view and suggestion engine
    static getDetailedProgress(cards) {
        const byLevel = this.getVocabByLevel(cards);
        const masteredByLevel = this.getMasteredByLevel(cards);
        const thresholds = this.getLevelThresholds();
        const levels = ['TOPIK1', 'TOPIK2', 'TOPIK3', 'TOPIK4', 'TOPIK5', 'TOPIK6'];

        let cumulative = 0;
        return levels.map(lv => {
            cumulative += byLevel[lv];
            const threshold = thresholds[lv].total;
            const progress = Math.min(100, Math.round((cumulative / threshold) * 100));
            return {
                level: lv,
                ...thresholds[lv],
                cardsAtLevel: byLevel[lv],
                masteredAtLevel: masteredByLevel[lv],
                cumulative,
                threshold,
                progress,
                achieved: cumulative >= threshold,
                wordsNeeded: Math.max(0, threshold - cumulative),
            };
        });
    }

    static estimateLevel(cards) {
        const detailed = this.getDetailedProgress(cards);
        const levels = ['TOPIK1', 'TOPIK2', 'TOPIK3', 'TOPIK4', 'TOPIK5', 'TOPIK6'];

        const currentData = detailed.find(d => !d.achieved) || detailed[5];
        const idx = levels.indexOf(currentData.level);
        const prevData = idx > 0 ? detailed[idx - 1] : null;

        const prevThreshold = prevData ? prevData.threshold : 0;
        const progress = currentData.threshold > prevThreshold
            ? Math.min(100, Math.round(((currentData.cumulative - prevThreshold) / (currentData.threshold - prevThreshold)) * 100))
            : 100;

        return {
            level: currentData.level,
            score: currentData.cumulative,
            progress: Math.max(0, progress),
            nextLevel: idx < 5 ? levels[idx + 1] : null,
            recommendation: currentData.description,
            stats: {
                totalCards: cards.length,
                mastered: cards.filter(c => SRS.getCardStatus(c) === 'mastered').length,
                learning: cards.filter(c => ['learning', 'review'].includes(SRS.getCardStatus(c))).length,
                topics: new Set(cards.map(c => c.topic).filter(Boolean)).size,
            },
            testRecommendation: this.getTestRecommendation(currentData.level, cards.length),
            detailed,
        };
    }

    static getLevelMinScore(level) {
        return this.getLevelThresholds()[level]?.total || 0;
    }

    static getTestRecommendation(level, cardCount) {
        const tests = {
            TOPIK1: { when: 'When you have 50+ cards and can read 한글',   nextTest: 'TOPIK I (Level 1-2)', timeline: 'Consider in 3-6 months' },
            TOPIK2: { when: 'When you can hold basic conversations',       nextTest: 'TOPIK I (Level 2)',   timeline: 'Consider in 2-4 months' },
            TOPIK3: { when: 'When you can discuss daily life topics',      nextTest: 'TOPIK II (Level 3)',  timeline: 'Consider in 4-6 months' },
            TOPIK4: { when: 'When you handle social/professional talk',    nextTest: 'TOPIK II (Level 4)',  timeline: 'Consider in 6-12 months' },
            TOPIK5: { when: 'When you can read medical texts',             nextTest: 'TOPIK II (Level 5)',  timeline: 'Consider in 6-12 months' },
            TOPIK6: { when: 'When you are ready for medical boards',       nextTest: '의사국가고시',        timeline: 'Final preparation year' },
        };
        return tests[level] || tests.TOPIK1;
    }

    static get5YearMilestones() {
        return [
            { year: 1, level: 'TOPIK3', goal: 'Home + church fluency; TOPIK I passed', cards: 200 },
            { year: 2, level: 'TOPIK4', goal: 'Social fluency; start medical vocab',   cards: 400 },
            { year: 3, level: 'TOPIK5', goal: 'Medical Korean basics; TOPIK II Level 5', cards: 600 },
            { year: 4, level: 'TOPIK6', goal: 'Professional fluency; board prep',      cards: 900 },
            { year: 5, level: 'Boards', goal: 'Pass Korean medical licensing exam',    cards: 1200 },
        ];
    }

    static getCurrentYearProgress(cards) {
        const startDate = new Date('2026-04-21');
        const now = new Date();
        const monthsElapsed = (now - startDate) / (1000 * 60 * 60 * 24 * 30);
        const year = Math.min(5, Math.floor(monthsElapsed / 12) + 1);
        const milestones = this.get5YearMilestones();
        const currentMilestone = milestones[year - 1];
        const prevMilestone = year > 1 ? milestones[year - 2] : { cards: 0 };

        const cardProgress = cards.length;
        const milestoneProgress = ((cardProgress - prevMilestone.cards) / (currentMilestone.cards - prevMilestone.cards)) * 100;

        return {
            year,
            milestone: currentMilestone,
            cardProgress: Math.round(Math.max(0, Math.min(100, milestoneProgress))),
            cardsNeeded: Math.max(0, currentMilestone.cards - cardProgress),
            monthsInYear: monthsElapsed % 12,
        };
    }
}
