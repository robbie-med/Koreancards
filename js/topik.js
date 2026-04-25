// ============================================
// TOPIK.JS - Level estimation & test recommendations
// ============================================

class TOPIKEstimator {
    static estimateLevel(cards) {
        const stats = SRS.getStats(cards);
        const totalCards = stats.total;
        const mastered = stats.mastered;
        const learning = stats.learning + stats.review;

        // Calculate score based on multiple factors
        let score = 0;

        // Card count contribution (max 60 points)
        score += Math.min(totalCards / 15, 60);

        // Mastery contribution (max 25 points)
        if (totalCards > 0) {
            score += (mastered / totalCards) * 25;
        }

        // Topic diversity contribution (max 15 points)
        const topics = new Set(cards.map(c => c.topic).filter(Boolean));
        score += Math.min(topics.size * 1.5, 15);

        // Determine level
        let level, nextLevel, recommendation;

        if (score < 10) {
            level = 'TOPIK1';
            nextLevel = 'TOPIK2';
            recommendation = 'Focus on basic vocabulary and simple phrases. Take TOPIK I when you know ~50 words confidently.';
        } else if (score < 25) {
            level = 'TOPIK2';
            nextLevel = 'TOPIK3';
            recommendation = 'Good foundation! Start forming simple sentences. Consider TOPIK I in 3-6 months.';
        } else if (score < 45) {
            level = 'TOPIK3';
            nextLevel = 'TOPIK4';
            recommendation = 'Solid intermediate. Work on complex sentences and reading. Take TOPIK II Level 3 when ready.';
        } else if (score < 65) {
            level = 'TOPIK4';
            nextLevel = 'TOPIK5';
            recommendation = 'Upper-intermediate! Focus on professional vocabulary. Take TOPIK II Level 4.';
        } else if (score < 85) {
            level = 'TOPIK5';
            nextLevel = 'TOPIK6';
            recommendation = 'Advanced! Start medical Korean. Take TOPIK II Level 5.';
        } else {
            level = 'TOPIK6';
            nextLevel = null;
            recommendation = 'Near-native proficiency! Focus on medical board preparation.';
        }

        const progress = nextLevel ? 
            ((score - this.getLevelMinScore(level)) / (this.getLevelMinScore(nextLevel) - this.getLevelMinScore(level))) * 100 : 
            100;

        return {
            level,
            score: Math.round(score),
            progress: Math.round(Math.max(0, Math.min(100, progress))),
            nextLevel,
            recommendation,
            stats: {
                totalCards,
                mastered,
                learning,
                topics: topics.size,
            },
            testRecommendation: this.getTestRecommendation(level, totalCards),
        };
    }

    static getLevelMinScore(level) {
        const mins = { TOPIK1: 0, TOPIK2: 10, TOPIK3: 25, TOPIK4: 45, TOPIK5: 65, TOPIK6: 85 };
        return mins[level] || 0;
    }

    static getTestRecommendation(level, cardCount) {
        const tests = {
            TOPIK1: {
                when: 'When you have 50+ cards and can read 한글',
                nextTest: 'TOPIK I (Level 1-2)',
                timeline: 'Consider in 3-6 months',
            },
            TOPIK2: {
                when: 'When you can hold basic conversations',
                nextTest: 'TOPIK I (Level 2)',
                timeline: 'Consider in 2-4 months',
            },
            TOPIK3: {
                when: 'When you can discuss daily life topics',
                nextTest: 'TOPIK II (Level 3)',
                timeline: 'Consider in 4-6 months',
            },
            TOPIK4: {
                when: 'When you can handle social/professional situations',
                nextTest: 'TOPIK II (Level 4)',
                timeline: 'Consider in 6-12 months',
            },
            TOPIK5: {
                when: 'When you can read medical texts',
                nextTest: 'TOPIK II (Level 5)',
                timeline: 'Consider in 6-12 months',
            },
            TOPIK6: {
                when: 'When you are ready for medical boards',
                nextTest: '의사국가고시 (Korean Medical Boards)',
                timeline: 'Final preparation year',
            },
        };
        return tests[level] || tests.TOPIK1;
    }

    static get5YearMilestones() {
        return [
            { year: 1, level: 'TOPIK3', goal: 'Home + church fluency; TOPIK I passed', cards: 200 },
            { year: 2, level: 'TOPIK4', goal: 'Social fluency; start medical vocab', cards: 400 },
            { year: 3, level: 'TOPIK5', goal: 'Medical Korean basics; TOPIK II Level 5', cards: 600 },
            { year: 4, level: 'TOPIK6', goal: 'Professional fluency; board prep', cards: 900 },
            { year: 5, level: 'Boards', goal: 'Pass Korean medical licensing exam', cards: 1200 },
        ];
    }

    static getCurrentYearProgress(cards) {
        const startDate = new Date('2026-04-21'); // User start date
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
