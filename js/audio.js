// ============================================
// AUDIO.JS - Web Audio API recording & playback
// ============================================

class AudioManager {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordedBlob = null;
        this.isRecording = false;
        this.stream = null;
    }

    async startRecording() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(this.stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            return true;
        } catch (err) {
            console.error('Recording failed:', err);
            alert('Microphone access denied. Please allow microphone access to record audio.');
            return false;
        }
    }

    stopRecording() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder || !this.isRecording) {
                resolve(null);
                return;
            }

            this.mediaRecorder.onstop = () => {
                this.recordedBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.isRecording = false;

                // Stop all tracks
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                }

                // Convert to base64 for storage
                this.blobToBase64(this.recordedBlob).then(base64 => {
                    resolve(base64);
                });
            };

            this.mediaRecorder.stop();
        });
    }

    blobToBase64(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }

    playAudio(base64Data, onEnded = null) {
        if (!base64Data) return null;

        const audio = new Audio(base64Data);
        if (onEnded) audio.onended = onEnded;
        audio.play().catch(err => console.error('Playback failed:', err));
        return audio;
    }

    getRecordingDuration() {
        // Approximate duration from blob size (rough estimate)
        if (!this.recordedBlob) return 0;
        return this.recordedBlob.size / 16000; // ~16KB per second for webm
    }
}

// Global audio manager instance
const audioManager = new AudioManager();

// Helper to create audio button for cards
function createAudioButton(audioData, size = 'normal') {
    const btn = document.createElement('button');
    btn.className = 'audio-btn' + (size === 'small' ? ' audio-btn-sm' : '');
    btn.innerHTML = '🔊';
    btn.title = 'Play pronunciation';

    let currentAudio = null;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();

        if (currentAudio && !currentAudio.paused) {
            currentAudio.pause();
            btn.classList.remove('playing');
            btn.innerHTML = '🔊';
            return;
        }

        btn.classList.add('playing');
        btn.innerHTML = '⏸️';

        currentAudio = audioManager.playAudio(audioData, () => {
            btn.classList.remove('playing');
            btn.innerHTML = '🔊';
        });
    });

    if (!audioData) {
        btn.disabled = true;
        btn.style.opacity = '0.3';
        btn.title = 'No audio recorded';
    }

    return btn;
}
