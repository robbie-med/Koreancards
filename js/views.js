// ============================================
// VIEWS.JS - UI view rendering and interactions
// ============================================

// Toast notifications
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

// Study View
function renderStudyView() {
    const container = document.getElementById('main-content');
    const cards = Storage.getCards();
    const settings = Storage.getSettings();
    const queue = SRS.getReviewQueue(cards, settings);

    if (queue.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">🎉</div>
                <h2>All caught up!</h2>
                <p>No cards due for review. Add new cards or come back tomorrow.</p>
                <button class="btn btn-primary" onclick="switchView('suggestions')">💡 Find New Words</button>
            </div>
        `;
        updateStreak();
        return;
    }

    let currentIndex = 0;
    let showingBack = false;
    let sessionStats = { again: 0, hard: 0, good: 0, easy: 0, total: 0 };

    function renderCard() {
        const card = queue[currentIndex];
        const isLast = currentIndex === queue.length - 1;
        const progress = ((currentIndex) / queue.length) * 100;

        const readingDisplay = settings.showReading && card.reading ? 
            `<div class="back-reading">[${card.reading}]</div>` : '';

        container.innerHTML = `
            <div class="study-container">
                <div class="study-progress">
                    <span>${currentIndex + 1} / ${queue.length}</span>
                    <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
                    <span>${queue.length - currentIndex} left</span>
                </div>

                <div class="reading-toggle">
                    <label>
                        <input type="checkbox" id="reading-toggle" ${settings.showReading ? 'checked' : ''}>
                        Show pronunciation
                    </label>
                </div>

                <div class="flashcard ${showingBack ? 'flipped' : ''}" id="study-card">
                    <div class="card-audio">
                        ${createAudioButton(card.audioData).outerHTML}
                    </div>
                    <div class="card-front">
                        <span class="ko-text">${card.front}</span>
                        ${!showingBack && settings.showReading && card.reading ? `<div style="font-size:1rem;color:var(--text-light);margin-top:12px;">[${card.reading}]</div>` : ''}
                    </div>
                    <div class="card-back">
                        <div class="back-korean">${card.front}</div>
                        ${readingDisplay}
                        <div class="back-english">${card.back}</div>
                        ${card.notes ? `<div class="back-notes">${card.notes}</div>` : ''}
                        ${card.topic ? `<span class="badge badge-${card.repetitions === 0 ? 'new' : SRS.getCardStatus(card)}">${TOPIC_METADATA[card.topic]?.label || card.topic}</span>` : ''}
                    </div>
                    <div class="flip-hint">${showingBack ? '' : 'Tap to flip'}</div>
                </div>

                ${settings.readingMode && !showingBack ? `
                <div class="reading-practice-bar">
                    <button class="mic-btn" id="mic-btn" title="Practice reading aloud">🎤</button>
                    <div class="reading-status" id="reading-status">Tap mic to practice reading aloud</div>
                </div>
                ` : ''}

                <div class="difficulty-buttons" id="diff-buttons" style="${showingBack ? '' : 'visibility:hidden;'}">
                    <button class="diff-btn diff-btn-again" data-diff="again">
                        Again
                        <span class="interval">${SRS.getIntervalLabel(card, 'again')}</span>
                    </button>
                    <button class="diff-btn diff-btn-hard" data-diff="hard">
                        Hard
                        <span class="interval">${SRS.getIntervalLabel(card, 'hard')}</span>
                    </button>
                    <button class="diff-btn diff-btn-good" data-diff="good">
                        Good
                        <span class="interval">${SRS.getIntervalLabel(card, 'good')}</span>
                    </button>
                    <button class="diff-btn diff-btn-easy" data-diff="easy">
                        Easy
                        <span class="interval">${SRS.getIntervalLabel(card, 'easy')}</span>
                    </button>
                </div>
            </div>
        `;

        // Card flip
        document.getElementById('study-card').addEventListener('click', () => {
            showingBack = !showingBack;
            renderCard();
        });

        // Reading practice mic
        const micBtn = document.getElementById('mic-btn');
        if (micBtn) {
            micBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const status = document.getElementById('reading-status');

                if (audioManager.isRecording) {
                    await audioManager.stopRecording();
                    micBtn.classList.remove('recording');
                    status.textContent = 'Great practice! Keep going.';
                } else {
                    const started = await audioManager.startRecording();
                    if (started) {
                        micBtn.classList.add('recording');
                        status.textContent = 'Reading practice recording... tap again to stop';
                    }
                }
            });
        }

        // Difficulty buttons
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const diff = btn.dataset.diff;
                sessionStats[diff]++;
                sessionStats.total++;

                // Update card in storage
                const allCards = Storage.getCards();
                const cardIndex = allCards.findIndex(c => c.id === card.id);
                if (cardIndex >= 0) {
                    allCards[cardIndex] = SRS.processReview(allCards[cardIndex], diff);
                    Storage.saveCards(allCards);
                }

                // Update stats
                const stats = Storage.getStats();
                stats.totalCardsStudied++;
                stats.totalStudySessions++;
                const today = new Date().toISOString().split('T')[0];
                if (!stats.dailyHistory[today]) stats.dailyHistory[today] = { cards: 0, minutes: 0 };
                stats.dailyHistory[today].cards++;
                Storage.saveStats(stats);

                currentIndex++;
                showingBack = false;

                if (currentIndex >= queue.length) {
                    renderSessionComplete(sessionStats);
                } else {
                    renderCard();
                }
            });
        });

        // Reading toggle
        const readingToggle = document.getElementById('reading-toggle');
        if (readingToggle) {
            readingToggle.addEventListener('change', (e) => {
                settings.showReading = e.target.checked;
                Storage.saveSettings(settings);
                renderCard();
            });
        }
    }

    function renderSessionComplete(stats) {
        updateStreak();
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">🎉</div>
                <h2>Session Complete!</h2>
                <p>You reviewed ${stats.total} cards.</p>
                <div style="display:flex;gap:12px;justify-content:center;margin:20px 0;flex-wrap:wrap;">
                    <span style="background:#FFEBEE;padding:8px 16px;border-radius:20px;color:#C62828;font-size:0.85rem;">Again: ${stats.again}</span>
                    <span style="background:#FFF3E0;padding:8px 16px;border-radius:20px;color:#E65100;font-size:0.85rem;">Hard: ${stats.hard}</span>
                    <span style="background:#E8F5E9;padding:8px 16px;border-radius:20px;color:#2E7D32;font-size:0.85rem;">Good: ${stats.good}</span>
                    <span style="background:#E3F2FD;padding:8px 16px;border-radius:20px;color:#1565C0;font-size:0.85rem;">Easy: ${stats.easy}</span>
                </div>
                <button class="btn btn-primary" onclick="switchView('study')">Study More</button>
                <button class="btn btn-ghost" onclick="switchView('suggestions')" style="margin-left:8px;">Add Words</button>
            </div>
        `;
    }

    renderCard();
}

// Cards List View
function renderCardsView() {
    const container = document.getElementById('main-content');
    const cards = Storage.getCards();
    let filter = 'all';

    function renderList() {
        let filtered = cards;
        if (filter !== 'all') {
            filtered = cards.filter(c => c.topic === filter || SRS.getCardStatus(c) === filter);
        }

        const topics = [...new Set(cards.map(c => c.topic).filter(Boolean))];

        container.innerHTML = `
            <div class="cards-header">
                <h2>📝 My Cards (${cards.length})</h2>
                <button class="btn btn-primary btn-sm" onclick="switchView('add')">+ Add New</button>
            </div>

            <div class="cards-filter">
                <button class="filter-btn ${filter === 'all' ? 'active' : ''}" data-filter="all">All</button>
                <button class="filter-btn ${filter === 'new' ? 'active' : ''}" data-filter="new">New</button>
                <button class="filter-btn ${filter === 'learning' ? 'active' : ''}" data-filter="learning">Learning</button>
                <button class="filter-btn ${filter === 'mastered' ? 'active' : ''}" data-filter="mastered">Mastered</button>
                ${topics.map(t => `<button class="filter-btn ${filter === t ? 'active' : ''}" data-filter="${t}">${TOPIC_METADATA[t]?.icon || '📌'} ${TOPIC_METADATA[t]?.label || t}</button>`).join('')}
            </div>

            <div class="card-list">
                ${filtered.length === 0 ? '<div class="empty-state"><p>No cards match this filter.</p></div>' : ''}
                ${filtered.map((card, i) => `
                    <div class="card-item">
                        <span class="card-number">${i + 1}</span>
                        <div class="card-content">
                            <div class="card-korean">${card.front}</div>
                            <div class="card-english">${card.back}</div>
                        </div>
                        <div class="card-meta">
                            <span class="badge badge-${SRS.getCardStatus(card)}">${SRS.getCardStatus(card)}</span>
                            ${card.topic ? `<span class="badge badge-new">${TOPIC_METADATA[card.topic]?.label || card.topic}</span>` : ''}
                        </div>
                        <div class="card-actions">
                            <button onclick="playCardAudio('${card.id}')" title="Play">🔊</button>
                            <button onclick="editCard('${card.id}')" title="Edit">✏️</button>
                            <button onclick="deleteCard('${card.id}')" title="Delete">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                filter = btn.dataset.filter;
                renderList();
            });
        });
    }

    renderList();
}

function playCardAudio(cardId) {
    const cards = Storage.getCards();
    const card = cards.find(c => c.id === cardId);
    if (card && card.audioData) {
        audioManager.playAudio(card.audioData);
    } else {
        showToast('No audio recorded for this card', 'info');
    }
}

function deleteCard(cardId) {
    if (!confirm('Delete this card?')) return;
    const cards = Storage.getCards();
    const filtered = cards.filter(c => c.id !== cardId);
    Storage.saveCards(filtered);
    showToast('Card deleted', 'success');
    renderCardsView();
}

function editCard(cardId) {
    // For now, redirect to add view with prefill (simplified)
    showToast('Edit feature: Delete and re-add with changes', 'info');
}

// Add Card View
function renderAddView() {
    const container = document.getElementById('main-content');
    let recordedAudio = null;
    let isRecording = false;

    container.innerHTML = `
        <div class="add-card-form">
            <h2 style="margin-bottom:20px;">➕ Add New Card</h2>

            <div class="audio-recorder">
                <div class="recorder-status" id="recorder-status">Have your wife record the pronunciation!</div>
                <div class="audio-waveform" id="audio-waveform"></div>
                <div class="recorder-controls">
                    <button class="rec-btn" id="record-btn">🎙️</button>
                    <button class="play-preview-btn" id="play-preview" disabled>▶️ Preview</button>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Korean (Front)</label>
                    <input type="text" id="card-front" placeholder="e.g., 고양이" required>
                </div>
                <div class="form-group">
                    <label>English (Back)</label>
                    <input type="text" id="card-back" placeholder="e.g., cat" required>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Pronunciation (optional)</label>
                    <input type="text" id="card-reading" placeholder="e.g., goyangi">
                </div>
                <div class="form-group">
                    <label>Topic</label>
                    <select id="card-topic">
                        ${Object.entries(TOPIC_METADATA).map(([key, meta]) => 
                            `<option value="${key}">${meta.icon} ${meta.label}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label>Notes (optional)</label>
                <textarea id="card-notes" placeholder="Grammar notes, context, etc."></textarea>
            </div>

            <div class="form-group">
                <label>TOPIK Level</label>
                <select id="card-level">
                    <option value="TOPIK1">TOPIK I - Level 1</option>
                    <option value="TOPIK2">TOPIK I - Level 2</option>
                    <option value="TOPIK3">TOPIK II - Level 3</option>
                    <option value="TOPIK4">TOPIK II - Level 4</option>
                    <option value="TOPIK5">TOPIK II - Level 5</option>
                    <option value="TOPIK6">TOPIK II - Level 6</option>
                </select>
            </div>

            <button class="btn btn-primary btn-lg" id="save-card-btn" style="width:100%;">
                💾 Save Card
            </button>
        </div>
    `;

    // Recording
    const recordBtn = document.getElementById('record-btn');
    const playPreview = document.getElementById('play-preview');
    const waveform = document.getElementById('audio-waveform');
    const status = document.getElementById('recorder-status');

    recordBtn.addEventListener('click', async () => {
        if (isRecording) {
            const audio = await audioManager.stopRecording();
            if (audio) {
                recordedAudio = audio;
                playPreview.disabled = false;
                status.textContent = 'Audio recorded! Preview or re-record.';
            }
            isRecording = false;
            recordBtn.classList.remove('recording');
            waveform.classList.remove('active');
        } else {
            const started = await audioManager.startRecording();
            if (started) {
                isRecording = true;
                recordBtn.classList.add('recording');
                waveform.classList.add('active');
                status.textContent = 'Recording... click again to stop';
            }
        }
    });

    playPreview.addEventListener('click', () => {
        if (recordedAudio) {
            audioManager.playAudio(recordedAudio);
        }
    });

    // Save
    document.getElementById('save-card-btn').addEventListener('click', () => {
        const front = document.getElementById('card-front').value.trim();
        const back = document.getElementById('card-back').value.trim();

        if (!front || !back) {
            showToast('Please fill in Korean and English', 'error');
            return;
        }

        const cards = Storage.getCards();
        const newCard = {
            id: 'card_' + Date.now(),
            front,
            back,
            reading: document.getElementById('card-reading').value.trim(),
            notes: document.getElementById('card-notes').value.trim(),
            topic: document.getElementById('card-topic').value,
            level: document.getElementById('card-level').value,
            created: Date.now(),
            interval: 0,
            repetitions: 0,
            easeFactor: 2.5,
            nextReview: Date.now(),
            lastReviewed: null,
            audioData: recordedAudio,
            isStarter: false,
        };

        cards.push(newCard);
        Storage.saveCards(cards);

        // Update stats
        const stats = Storage.getStats();
        stats.cardsAdded++;
        Storage.saveStats(stats);

        showToast('Card saved!', 'success');

        // Reset form
        document.getElementById('card-front').value = '';
        document.getElementById('card-back').value = '';
        document.getElementById('card-reading').value = '';
        document.getElementById('card-notes').value = '';
        recordedAudio = null;
        playPreview.disabled = true;
        status.textContent = 'Have your wife record the pronunciation!';
    });
}

// Suggestions View
function renderSuggestionsView() {
    const container = document.getElementById('main-content');
    const cards = Storage.getCards();
    const suggestions = SuggestionEngine.getSuggestions(cards, 30);
    const smartSuggestions = SuggestionEngine.getSmartSuggestions(cards);

    // Group by topic
    const byTopic = {};
    suggestions.forEach(s => {
        if (!byTopic[s.topic]) byTopic[s.topic] = [];
        byTopic[s.topic].push(s);
    });

    container.innerHTML = `
        <div class="suggestions-header">
            <h2>💡 Suggested Words</h2>
            <p>Based on your progress, here are the best next words to learn.</p>
        </div>

        ${smartSuggestions.length > 0 ? `
        <div class="smart-suggestions">
            <h3>🎯 Smart Recommendations</h3>
            ${smartSuggestions.map(s => `
                <p>${s.message}</p>
                ${s.topics ? `<div class="smart-list">${s.topics.map(t => 
                    `<button class="smart-chip" onclick="filterSuggestions('${t}')">${TOPIC_METADATA[t]?.label || t}</button>`
                ).join('')}</div>` : ''}
            `).join('')}
        </div>
        ` : ''}

        ${Object.entries(byTopic).map(([topic, items]) => `
            <div class="topic-section">
                <h3>${TOPIC_METADATA[topic]?.icon || '📌'} ${TOPIC_METADATA[topic]?.label || topic}</h3>
                <div class="suggestion-list">
                    ${items.slice(0, 5).map(s => `
                        <div class="suggestion-item" id="sug-${s.korean}">
                            <span class="sug-korean">${s.korean}</span>
                            <span class="sug-english">${s.english}</span>
                            <span class="sug-level">${s.level}</span>
                            <button class="sug-add-btn" onclick="addSuggestion('${s.korean}', '${s.english.replace(/'/g, "&#39;")}', '${s.reading || ''}', '${s.topic}', '${s.level}', '${(s.notes || '').replace(/'/g, "&#39;")}')">+ Add</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('')}
    `;
}

function addSuggestion(korean, english, reading, topic, level, notes) {
    const cards = Storage.getCards();

    // Check if already exists
    if (cards.some(c => c.front === korean)) {
        showToast('Already in your deck!', 'info');
        return;
    }

    const newCard = {
        id: 'card_' + Date.now(),
        front: korean,
        back: english,
        reading: reading || '',
        notes: notes || '',
        topic: topic || 'general',
        level: level || 'TOPIK1',
        created: Date.now(),
        interval: 0,
        repetitions: 0,
        easeFactor: 2.5,
        nextReview: Date.now(),
        lastReviewed: null,
        audioData: null,
        isStarter: false,
    };

    cards.push(newCard);
    Storage.saveCards(cards);

    const stats = Storage.getStats();
    stats.cardsAdded++;
    Storage.saveStats(stats);

    // Mark as added in UI
    const item = document.getElementById(`sug-${korean}`);
    if (item) {
        item.classList.add('added');
        item.querySelector('.sug-add-btn').textContent = '✓ Added';
    }

    showToast(`Added "${korean}" to your deck!`, 'success');
}

function filterSuggestions(topic) {
    // Re-render with filter (simplified - just scroll to topic)
    const section = document.querySelector(`h3:contains('${TOPIC_METADATA[topic]?.label || topic}')`);
    if (section) section.scrollIntoView({ behavior: 'smooth' });
}

// Stats View
function renderStatsView() {
    const container = document.getElementById('main-content');
    const cards = Storage.getCards();
    const stats = Storage.getStats();
    const srsStats = SRS.getStats(cards);
    const topik = TOPIKEstimator.estimateLevel(cards);
    const yearProgress = TOPIKEstimator.getCurrentYearProgress(cards);

    // Build heatmap data (last 28 days)
    const heatmapDays = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const dayData = stats.dailyHistory[key];
        heatmapDays.push({
            date: key,
            level: dayData ? Math.min(4, Math.ceil(dayData.cards / 5)) : 0,
        });
    }

    container.innerHTML = `
        <h2 style="margin-bottom:20px;">📊 Your Progress</h2>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${srsStats.total}</div>
                <div class="stat-label">Total Cards</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${srsStats.dueToday}</div>
                <div class="stat-label">Due Today</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalStudySessions}</div>
                <div class="stat-label">Study Sessions</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.currentStreak}</div>
                <div class="stat-label">Day Streak</div>
            </div>
        </div>

        <div class="topik-section">
            <h3>🎯 TOPIK Level Estimate</h3>
            <div class="topik-gauge">
                <div class="topik-gauge-fill" style="width: ${topik.progress}%" data-level="${topik.level}"></div>
            </div>
            <div class="topik-levels">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
            </div>
            <div style="margin-top:12px;">
                <strong>Current: ${topik.level}</strong> — ${topik.recommendation}
            </div>
            <div class="topik-recommendation">
                <strong>Next Test:</strong> ${topik.testRecommendation.nextTest}<br>
                <strong>When:</strong> ${topik.testRecommendation.timeline}
            </div>
        </div>

        <div class="card">
            <h3 class="card-title">📅 5-Year Plan Progress</h3>
            <p style="margin-bottom:12px;color:var(--text-light);">Year ${yearProgress.year}: ${yearProgress.milestone.goal}</p>
            <div class="progress-bar" style="margin-bottom:8px;">
                <div class="progress-fill" style="width: ${yearProgress.cardProgress}%"></div>
            </div>
            <p style="font-size:0.85rem;color:var(--text-light);">
                ${cards.length} / ${yearProgress.milestone.cards} cards needed this year 
                (${yearProgress.cardsNeeded > 0 ? yearProgress.cardsNeeded + ' more needed' : 'On track!'})
            </p>
        </div>

        <div class="card">
            <h3 class="card-title">🔥 Study Streak</h3>
            <div class="calendar-heatmap">
                ${heatmapDays.map(d => `<div class="day level-${d.level}" title="${d.date}: ${d.level > 0 ? d.level * 5 + ' cards' : 'No study'}"></div>`).join('')}
            </div>
            <p style="text-align:center;margin-top:12px;font-size:0.85rem;color:var(--text-light);">
                Last 28 days. Darker = more cards studied.
            </p>
        </div>

        <div class="card">
            <h3 class="card-title">📈 Card Status Breakdown</h3>
            <div style="display:flex;gap:16px;flex-wrap:wrap;">
                <div><span class="badge badge-new">New</span> ${srsStats.new}</div>
                <div><span class="badge badge-learning">Learning</span> ${srsStats.learning}</div>
                <div><span class="badge badge-review">Review</span> ${srsStats.review}</div>
                <div><span class="badge badge-mastered">Mastered</span> ${srsStats.mastered}</div>
            </div>
        </div>

        <div class="card">
            <h3 class="card-title">🏷️ Topic Breakdown</h3>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
                ${Object.entries(SuggestionEngine.getUserTopicDistribution(cards)).map(([topic, count]) => `
                    <span style="padding:6px 12px;background:var(--bg);border-radius:20px;font-size:0.85rem;">
                        ${TOPIC_METADATA[topic]?.icon || '📌'} ${TOPIC_METADATA[topic]?.label || topic}: ${count}
                    </span>
                `).join('')}
            </div>
        </div>
    `;
}

// Settings View
function renderSettingsView() {
    const container = document.getElementById('main-content');
    const settings = Storage.getSettings();

    container.innerHTML = `
        <h2 style="margin-bottom:20px;">⚙️ Settings</h2>

        <div class="card">
            <h3 class="card-title">📚 Study Preferences</h3>

            <div class="settings-row">
                <div>
                    <label>Daily New Cards</label>
                    <div class="setting-desc">How many new cards to show per day</div>
                </div>
                <input type="number" id="setting-new-cards" value="${settings.newCardsPerDay}" min="1" max="50" style="width:80px;">
            </div>

            <div class="settings-row">
                <div>
                    <label>Daily Review Cards</label>
                    <div class="setting-desc">Max review cards per day</div>
                </div>
                <input type="number" id="setting-review-cards" value="${settings.reviewCardsPerDay}" min="5" max="100" style="width:80px;">
            </div>

            <div class="settings-row">
                <div>
                    <label>Reading Practice Mode</label>
                    <div class="setting-desc">Show mic button during study for reading aloud</div>
                </div>
                <label class="toggle">
                    <input type="checkbox" id="setting-reading" ${settings.readingMode ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>

            <div class="settings-row">
                <div>
                    <label>Show Pronunciation</label>
                    <div class="setting-desc">Display [reading] on card front</div>
                </div>
                <label class="toggle">
                    <input type="checkbox" id="setting-reading-guide" ${settings.showReading ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>

            <div class="settings-row">
                <div>
                    <label>Auto-play Audio</label>
                    <div class="setting-desc">Play audio automatically when card appears</div>
                </div>
                <label class="toggle">
                    <input type="checkbox" id="setting-autoplay" ${settings.autoPlayAudio ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>

        <div class="card">
            <h3 class="card-title">💾 Data Management</h3>

            <div class="settings-row">
                <div>
                    <label>Export All Data</label>
                    <div class="setting-desc">Backup your cards, stats, and settings</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="exportData()">Export JSON</button>
            </div>

            <div class="settings-row">
                <div>
                    <label>Import Data</label>
                    <div class="setting-desc">Restore from a previous backup</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="importData()">Import JSON</button>
            </div>

            <div class="settings-row">
                <div>
                    <label>Reset Everything</label>
                    <div class="setting-desc">Clear all data and start fresh</div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="resetAll()">Reset</button>
            </div>
        </div>

        <div id="export-area" style="display:none;">
            <div class="card">
                <h3 class="card-title">📋 Export Data</h3>
                <p style="margin-bottom:12px;font-size:0.85rem;color:var(--text-light);">Copy this text and save it somewhere safe:</p>
                <div class="export-area" id="export-content"></div>
                <button class="btn btn-primary btn-sm" onclick="copyExport()">📋 Copy to Clipboard</button>
            </div>
        </div>

        <div id="import-area" style="display:none;">
            <div class="card">
                <h3 class="card-title">📥 Import Data</h3>
                <p style="margin-bottom:12px;font-size:0.85rem;color:var(--text-light);">Paste your backup data here:</p>
                <textarea id="import-content" style="width:100%;min-height:120px;font-family:monospace;font-size:0.8rem;" placeholder="Paste JSON here..."></textarea>
                <button class="btn btn-primary btn-sm" onclick="doImport()" style="margin-top:12px;">Import</button>
            </div>
        </div>
    `;

    // Save settings on change
    const saveSettings = () => {
        settings.newCardsPerDay = parseInt(document.getElementById('setting-new-cards').value) || 5;
        settings.reviewCardsPerDay = parseInt(document.getElementById('setting-review-cards').value) || 20;
        settings.readingMode = document.getElementById('setting-reading').checked;
        settings.showReading = document.getElementById('setting-reading-guide').checked;
        settings.autoPlayAudio = document.getElementById('setting-autoplay').checked;
        Storage.saveSettings(settings);
        showToast('Settings saved', 'success');
    };

    document.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('change', saveSettings);
    });
}

function exportData() {
    const data = Storage.exportData();
    document.getElementById('export-content').textContent = data;
    document.getElementById('export-area').style.display = 'block';
    document.getElementById('import-area').style.display = 'none';
    showToast('Data ready to export', 'success');
}

function copyExport() {
    const content = document.getElementById('export-content').textContent;
    navigator.clipboard.writeText(content).then(() => {
        showToast('Copied to clipboard!', 'success');
    });
}

function importData() {
    document.getElementById('import-area').style.display = 'block';
    document.getElementById('export-area').style.display = 'none';
}

function doImport() {
    const content = document.getElementById('import-content').value.trim();
    if (!content) {
        showToast('Please paste data first', 'error');
        return;
    }

    if (Storage.importData(content)) {
        showToast('Data imported successfully!', 'success');
        document.getElementById('import-area').style.display = 'none';
        updateStreak();
    } else {
        showToast('Import failed. Check your data format.', 'error');
    }
}

function resetAll() {
    if (!confirm('WARNING: This will delete ALL your cards, stats, and settings. This cannot be undone. Are you sure?')) return;
    if (!confirm('Really sure? All progress will be lost.')) return;

    Storage.clearAll();
    showToast('All data reset. Reloading...', 'info');
    setTimeout(() => location.reload(), 1500);
}
