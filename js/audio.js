/**
 * Tiny synthesized sound-effects + haptics layer. No audio assets: everything
 * is generated with the Web Audio API. Every entry point is guarded so it is a
 * harmless no-op where Web Audio / vibration are unavailable (old browsers,
 * headless test environments).
 *
 * Exposes a single global `sfx` with:
 *   sfx.play(name)      – play a named effect
 *   sfx.vibrate(pat)    – trigger haptics (respects mute)
 *   sfx.toggleMute()    – flip + persist mute preference, returns new state
 *   sfx.muted           – current mute state (boolean)
 */
const sfx = (function () {
    const STORAGE_KEY = "miniRPG9_muted";

    let ctx = null;
    let muted = false;
    try { muted = localStorage.getItem(STORAGE_KEY) === "1"; } catch (e) { /* ignore */ }

    function audioContext() {
        if (ctx) return ctx;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
        } catch (e) {
            ctx = null;
        }
        return ctx;
    }

    function tone(freq, duration, type = "square", volume = 0.05) {
        if (muted) return;
        const c = audioContext();
        if (!c) return;
        try {
            if (c.state === "suspended" && c.resume) c.resume();
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            const t = c.currentTime;
            gain.gain.setValueAtTime(volume, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(t);
            osc.stop(t + duration);
        } catch (e) { /* ignore */ }
    }

    function later(fn, ms) { try { setTimeout(fn, ms); } catch (e) { fn(); } }

    const effects = {
        attack: () => tone(220, 0.08, "square", 0.05),
        crit: () => { tone(320, 0.06, "square", 0.06); later(() => tone(500, 0.1, "square", 0.06), 60); },
        heal: () => { tone(587, 0.12, "sine", 0.05); later(() => tone(880, 0.14, "sine", 0.05), 90); },
        defend: () => tone(170, 0.12, "triangle", 0.05),
        chest: () => { tone(523, 0.1, "sine", 0.05); later(() => tone(784, 0.16, "sine", 0.05), 100); },
        relic: () => { tone(659, 0.1, "sine", 0.05); later(() => tone(988, 0.2, "sine", 0.05), 110); },
        hurt: () => { tone(140, 0.18, "sawtooth", 0.06); vibrate(60); },
        flee: () => tone(420, 0.1, "triangle", 0.05),
        win: () => { tone(523, 0.1); later(() => tone(659, 0.1), 110); later(() => tone(784, 0.22), 220); vibrate(40); },
        lose: () => { tone(300, 0.25, "sawtooth", 0.06); later(() => tone(150, 0.4, "sawtooth", 0.06), 200); vibrate([80, 40, 120]); }
    };

    function play(name) {
        if (muted) return;
        const fn = effects[name];
        if (fn) { try { fn(); } catch (e) { /* ignore */ } }
    }

    function vibrate(pattern) {
        if (muted) return;
        try {
            if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
        } catch (e) { /* ignore */ }
    }

    function toggleMute() {
        muted = !muted;
        try { localStorage.setItem(STORAGE_KEY, muted ? "1" : "0"); } catch (e) { /* ignore */ }
        return muted;
    }

    return {
        play,
        vibrate,
        toggleMute,
        get muted() { return muted; }
    };
})();
