// --- Elements ---
const body = document.body;
const themeToggle = document.getElementById('theme-toggle');
const fullscreenToggle = document.getElementById('fullscreen-toggle');
const liveDatetime = document.getElementById('live-datetime');
const tabs = document.querySelectorAll('.tab-btn');
const views = document.querySelectorAll('.view');
const glassContainer = document.querySelector('.glass-container');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Load theme
    const savedTheme = localStorage.getItem('chronoTheme') || 'dark';
    setTheme(savedTheme);

    // Start Clock
    updateLiveClock();
    setInterval(updateLiveClock, 1000);

    // Load Timer settings
    loadTimerSettings();
});

// --- Utility Functions ---
function pad(num, size = 2) {
    let s = "000" + num;
    return s.substring(s.length - size);
}

// Generate an audio beep using Web Audio API (No external files)
function playNotificationSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        
        // Main beep
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
        console.log("Web Audio API not supported in this browser.");
    }
}

// --- Global UI Logic ---
function updateLiveClock() {
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    liveDatetime.textContent = now.toLocaleDateString(undefined, options);
}

function setTheme(theme) {
    body.setAttribute('data-theme', theme);
    localStorage.setItem('chronoTheme', theme);
    const icon = themeToggle.querySelector('i');
    if (theme === 'light') {
        icon.className = 'fa-solid fa-moon';
    } else {
        icon.className = 'fa-solid fa-sun';
    }
}

themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

fullscreenToggle.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        views.forEach(v => v.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tab.dataset.target).classList.add('active');
    });
});


// --- STOPWATCH LOGIC ---
let swStartTime = 0;
let swElapsedTime = 0;
let swTimerId = null;
let swIsRunning = false;
let laps = [];

const swDisplay = document.getElementById('sw-display');
const btnSwStartPause = document.getElementById('sw-start-pause');
const btnSwLap = document.getElementById('sw-lap');
const btnSwReset = document.getElementById('sw-reset');
const lapsList = document.getElementById('laps-list');

function formatStopwatchTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    
    return {
        main: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
        ms: pad(hundredths)
    };
}

function updateStopwatchDisplay(timeInMs) {
    const formatted = formatStopwatchTime(timeInMs);
    swDisplay.innerHTML = `${formatted.main}<span class="ms">.${formatted.ms}</span>`;
}

function swTick(timestamp) {
    if (!swIsRunning) return;
    swElapsedTime = timestamp - swStartTime;
    updateStopwatchDisplay(swElapsedTime);
    swTimerId = requestAnimationFrame(swTick);
}

function toggleStopwatch() {
    if (swIsRunning) {
        // Pause
        swIsRunning = false;
        cancelAnimationFrame(swTimerId);
        btnSwStartPause.innerHTML = `<i class="fa-solid fa-play"></i> Resume`;
        btnSwStartPause.classList.remove('danger-btn');
        btnSwStartPause.classList.add('primary-btn');
        btnSwLap.disabled = true;
    } else {
        // Start / Resume
        swIsRunning = true;
        swStartTime = performance.now() - swElapsedTime;
        swTimerId = requestAnimationFrame(swTick);
        btnSwStartPause.innerHTML = `<i class="fa-solid fa-pause"></i> Pause`;
        btnSwStartPause.classList.remove('primary-btn');
        btnSwStartPause.classList.add('danger-btn');
        btnSwLap.disabled = false;
        btnSwReset.disabled = false;
    }
}

function recordLap() {
    if (!swIsRunning) return;
    
    const lapOverall = swElapsedTime;
    const previousLapOverall = laps.length > 0 ? laps[laps.length - 1].overall : 0;
    const lapDuration = lapOverall - previousLapOverall;
    
    laps.push({ duration: lapDuration, overall: lapOverall });
    renderLaps();
}

function renderLaps() {
    lapsList.innerHTML = '';
    if (laps.length === 0) return;

    let minDuration = Infinity;
    let maxDuration = 0;
    
    if (laps.length > 1) {
        laps.forEach(lap => {
            if (lap.duration < minDuration) minDuration = lap.duration;
            if (lap.duration > maxDuration) maxDuration = lap.duration;
        });
    }

    // Render in reverse order (newest first)
    [...laps].reverse().forEach((lap, index) => {
        const lapNumber = laps.length - index;
        const li = document.createElement('li');
        li.className = 'lap-item';
        
        if (laps.length > 1) {
            if (lap.duration === minDuration) li.classList.add('fastest');
            if (lap.duration === maxDuration) li.classList.add('slowest');
        }

        const durFormatted = formatStopwatchTime(lap.duration);
        const overFormatted = formatStopwatchTime(lap.overall);

        li.innerHTML = `
            <span>${pad(lapNumber)}</span>
            <span>${durFormatted.main}.${durFormatted.ms}</span>
            <span>${overFormatted.main}.${overFormatted.ms}</span>
        `;
        lapsList.appendChild(li);
    });
}

function resetStopwatch() {
    swIsRunning = false;
    cancelAnimationFrame(swTimerId);
    swElapsedTime = 0;
    laps = [];
    updateStopwatchDisplay(0);
    renderLaps();
    
    btnSwStartPause.innerHTML = `<i class="fa-solid fa-play"></i> Start`;
    btnSwStartPause.classList.remove('danger-btn');
    btnSwStartPause.classList.add('primary-btn');
    btnSwLap.disabled = true;
    btnSwReset.disabled = true;
}

btnSwStartPause.addEventListener('click', toggleStopwatch);
btnSwLap.addEventListener('click', recordLap);
btnSwReset.addEventListener('click', resetStopwatch);


// --- TIMER LOGIC ---
const inpHours = document.getElementById('t-hours');
const inpMinutes = document.getElementById('t-minutes');
const inpSeconds = document.getElementById('t-seconds');
const timerInputsGroup = document.getElementById('timer-inputs');
const timerDisplay = document.getElementById('timer-display');
const btnTStartPause = document.getElementById('t-start-pause');
const btnTReset = document.getElementById('t-reset');
const progressCircle = document.querySelector('.progress-ring-circle');

let tDuration = 0;
let tRemaining = 0;
let tEndTime = 0;
let tIsRunning = false;
let tTimerId = null;
let ringCircumference = 0;

// Setup SVG Progress Ring
function initProgressRing() {
    const radius = progressCircle.r.baseVal.value;
    ringCircumference = 2 * Math.PI * radius;
    progressCircle.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
    progressCircle.style.strokeDashoffset = ringCircumference;
}
initProgressRing();

function setProgress(percent) {
    // Prevent negative offset visually
    const p = Math.max(0, Math.min(1, percent)); 
    const offset = ringCircumference - (p * ringCircumference);
    progressCircle.style.strokeDashoffset = offset;
}

function parseTimerInputs() {
    let h = parseInt(inpHours.value) || 0;
    let m = parseInt(inpMinutes.value) || 0;
    let s = parseInt(inpSeconds.value) || 0;
    return (h * 3600 + m * 60 + s) * 1000;
}

function saveTimerSettings() {
    const settings = { h: inpHours.value, m: inpMinutes.value, s: inpSeconds.value };
    localStorage.setItem('chronoTimer', JSON.stringify(settings));
}

function loadTimerSettings() {
    const saved = JSON.parse(localStorage.getItem('chronoTimer'));
    if (saved) {
        inpHours.value = pad(saved.h);
        inpMinutes.value = pad(saved.m);
        inpSeconds.value = pad(saved.s);
    }
}

function formatTimerDisplay(ms) {
    const totalSecs = Math.ceil(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// Input sanitization & formatting on blur
[inpHours, inpMinutes, inpSeconds].forEach(input => {
    input.addEventListener('blur', function() {
        if(this.value === '' || this.value < 0) this.value = '00';
        // Enforce max 59 for min/sec
        if(this.id !== 't-hours' && this.value > 59) this.value = '59';
        this.value = pad(parseInt(this.value));
    });
});

function tTick(timestamp) {
    if (!tIsRunning) return;
    
    tRemaining = tEndTime - performance.now();
    
    if (tRemaining <= 0) {
        timerFinished();
        return;
    }
    
    timerDisplay.textContent = formatTimerDisplay(tRemaining);
    setProgress(tRemaining / tDuration);
    
    tTimerId = requestAnimationFrame(tTick);
}

function toggleTimer() {
    if (tIsRunning) {
        // Pause
        tIsRunning = false;
        cancelAnimationFrame(tTimerId);
        btnTStartPause.innerHTML = `<i class="fa-solid fa-play"></i> Resume`;
        btnTStartPause.classList.remove('danger-btn');
        btnTStartPause.classList.add('primary-btn');
    } else {
        // Start
        if (tRemaining === 0) {
            tDuration = parseTimerInputs();
            if (tDuration <= 0) return; // Don't start if zero
            tRemaining = tDuration;
            saveTimerSettings();
        }
        
        tEndTime = performance.now() + tRemaining;
        tIsRunning = true;
        
        // Switch UI to display mode
        timerInputsGroup.classList.add('hidden');
        timerDisplay.classList.remove('hidden');
        timerDisplay.textContent = formatTimerDisplay(tRemaining);
        
        tTimerId = requestAnimationFrame(tTick);
        btnTStartPause.innerHTML = `<i class="fa-solid fa-pause"></i> Pause`;
        btnTStartPause.classList.remove('primary-btn');
        btnTStartPause.classList.add('danger-btn');
        
        // Clear animation if restarting
        glassContainer.classList.remove('timer-finished-anim');
        progressCircle.style.stroke = 'var(--ring-color)';
    }
}

function resetTimer() {
    tIsRunning = false;
    cancelAnimationFrame(tTimerId);
    tRemaining = 0;
    
    // Reset UI
    timerInputsGroup.classList.remove('hidden');
    timerDisplay.classList.add('hidden');
    setProgress(0);
    progressCircle.style.strokeDashoffset = ringCircumference;
    progressCircle.style.stroke = 'var(--ring-color)';
    glassContainer.classList.remove('timer-finished-anim');
    
    btnTStartPause.innerHTML = `<i class="fa-solid fa-play"></i> Start`;
    btnTStartPause.classList.remove('danger-btn');
    btnTStartPause.classList.add('primary-btn');
}

function timerFinished() {
    tIsRunning = false;
    tRemaining = 0;
    timerDisplay.textContent = "00:00:00";
    setProgress(0);
    
    btnTStartPause.innerHTML = `<i class="fa-solid fa-play"></i> Start`;
    btnTStartPause.classList.remove('danger-btn');
    btnTStartPause.classList.add('primary-btn');
    
    // Visual & Audio Notification
    playNotificationSound();
    glassContainer.classList.add('timer-finished-anim');
    progressCircle.style.stroke = 'var(--danger)';
    
    // Auto remove input hide after a short delay so user can set new time
    setTimeout(() => {
        timerInputsGroup.classList.remove('hidden');
        timerDisplay.classList.add('hidden');
    }, 3000);
}

btnTStartPause.addEventListener('click', toggleTimer);
btnTReset.addEventListener('click', resetTimer);


// --- KEYBOARD SHORTCUTS ---
document.addEventListener('keydown', (e) => {
    // Ignore if typing in input fields
    if (document.activeElement.tagName === 'INPUT') return;

    const isStopwatchActive = document.getElementById('stopwatch-view').classList.contains('active');

    switch (e.code) {
        case 'Space':
            e.preventDefault(); // Prevent scrolling
            if (isStopwatchActive) toggleStopwatch();
            else toggleTimer();
            break;
        case 'KeyR':
            if (isStopwatchActive) {
                if(!btnSwReset.disabled) resetStopwatch();
            } else {
                resetTimer();
            }
            break;
        case 'KeyL':
            if (isStopwatchActive && !btnSwLap.disabled) recordLap();
            break;
    }
});