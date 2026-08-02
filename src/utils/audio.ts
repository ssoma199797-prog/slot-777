// Dynamic web-synthesized pachislot sound effects using Web Audio API

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (!soundEnabled) return null;
  try {
    if (!audioCtx) {
      // Support standard and legacy audio context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      const res = audioCtx.resume();
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    }
  } catch (e) {
    console.warn("Web Audio API not supported or blocked in this environment", e);
    return null;
  }
  return audioCtx;
}

export const toggleMute = (forceState?: boolean): boolean => {
  if (forceState !== undefined) {
    soundEnabled = forceState;
  } else {
    soundEnabled = !soundEnabled;
  }
  
  if (soundEnabled) {
    getAudioContext();
  } else if (audioCtx) {
    try {
      const res = audioCtx.close();
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
    audioCtx = null;
  }
  return soundEnabled;
};

export const isSoundEnabled = (): boolean => soundEnabled;

// Utility to create smooth volume envelopes
function createGainNode(ctx: AudioContext, duration: number, startVal = 1, endVal = 0.01): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(startVal, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(endVal, ctx.currentTime + duration);
  return gain;
}

// 1. レバーON音「ズバァァン！」 (Metallic, highly energetic start with extreme satisfaction)
export const playLeverOn = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const dest = ctx.destination;
  const now = ctx.currentTime;
  
  // High-gain detuned brassy saws for a massive physical rip
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const oscSub = ctx.createOscillator();
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.45, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(180, now);
  osc1.frequency.exponentialRampToValueAtTime(42, now + 0.35);

  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(185, now); // Slightly detuned
  osc2.frequency.exponentialRampToValueAtTime(45, now + 0.3);

  // Sub bass reinforcement
  oscSub.type = 'sine';
  oscSub.frequency.setValueAtTime(90, now);
  oscSub.frequency.linearRampToValueAtTime(30, now + 0.25);
  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.3, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  // Intense mechanical noise impact
  const bufferSize = ctx.sampleRate * 0.25;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.Q.setValueAtTime(5.0, now);
  noiseFilter.frequency.setValueAtTime(1200, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(150, now + 0.35);
  
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.35, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  oscSub.connect(subGain);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);

  gainNode.connect(dest);
  subGain.connect(dest);
  noiseGain.connect(dest);

  osc1.start(now);
  osc2.start(now);
  oscSub.start(now);
  noise.start(now);

  osc1.stop(now + 0.48);
  osc2.stop(now + 0.48);
  oscSub.stop(now + 0.3);
  noise.stop(now + 0.35);
};

// 2. リール回転音「シュシュシュ…」 (Continuous pulse wave)
let spinOsc: OscillatorNode | null = null;
let spinGain: GainNode | null = null;

export const startSpinSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (spinOsc) {
    stopSpinSound();
  }

  spinOsc = ctx.createOscillator();
  spinOsc.type = 'triangle';
  spinOsc.frequency.setValueAtTime(45, ctx.currentTime); // low hum hum hum

  // LFO to make it pulse like a rotating reel
  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime(14, ctx.currentTime); // 14Hz spin rotation
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(15, ctx.currentTime);

  spinGain = ctx.createGain();
  spinGain.gain.setValueAtTime(0.08, ctx.currentTime);

  lfo.connect(lfoGain);
  lfoGain.connect(spinOsc.frequency);
  spinOsc.connect(spinGain);
  spinGain.connect(ctx.destination);

  lfo.start();
  spinOsc.start();
};

export const stopSpinSound = () => {
  if (spinOsc) {
    try {
      spinOsc.stop();
    } catch (e) {}
    spinOsc = null;
  }
  if (spinGain) {
    spinGain.disconnect();
    spinGain = null;
  }
};

// 3. 停止ボタン押下「ビシィッ！」 (Highly crisp and physical mechanical lock)
export const playStopSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const dest = ctx.destination;
  const now = ctx.currentTime;
  
  // Tonal core
  const oscCore = ctx.createOscillator();
  const oscSub = ctx.createOscillator();
  
  oscCore.type = 'triangle';
  oscCore.frequency.setValueAtTime(1350, now);
  oscCore.frequency.exponentialRampToValueAtTime(120, now + 0.08);

  oscSub.type = 'sine';
  oscSub.frequency.setValueAtTime(250, now);
  oscSub.frequency.exponentialRampToValueAtTime(60, now + 0.07);

  const coreGain = ctx.createGain();
  coreGain.gain.setValueAtTime(0.28, now);
  coreGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

  // Mechanical crack transient noise
  const bufferSize = ctx.sampleRate * 0.015; // ultra-short 15ms impact burst
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.setValueAtTime(2500, now);
  
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.22, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.014);

  oscCore.connect(coreGain);
  oscSub.connect(coreGain);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);

  coreGain.connect(dest);
  noiseGain.connect(dest);

  oscCore.start(now);
  oscSub.start(now);
  noise.start(now);

  oscCore.stop(now + 0.1);
  oscSub.stop(now + 0.1);
  noise.stop(now + 0.02);
};

// 4. カットイン時のインパクト音「バギィィィン！」 (Huge dramatic hit with dopamine-rich frequencies)
export const playCutinSound = (level: 'under_100' | 'under_50' | 'under_30' | 'under_10' | "none") => {
  if (level === 'none') return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const dest = ctx.destination;
  const now = ctx.currentTime;

  if (level === 'under_100' || level === 'under_50') {
    // Chance Impact: Stylish twin-tone metallic sword slice "Shakiinn!"
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(650, now);
    osc1.frequency.exponentialRampToValueAtTime(120, now + 0.38);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1300, now); // Octave chime
    osc2.frequency.exponentialRampToValueAtTime(300, now + 0.28);

    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.18, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    // Filter to make it crisp and shiny
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(400, now);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain1);
    filter.connect(gain2);
    gain1.connect(dest);
    gain2.connect(dest);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.3);
  } else if (level === 'under_30') {
    // High Chance Impact: Extremely dramatic "Zubadadooooon!" + Tension alert
    // Heavy physical boom
    const boom = ctx.createOscillator();
    boom.type = 'sawtooth';
    boom.frequency.setValueAtTime(150, now);
    boom.frequency.exponentialRampToValueAtTime(25, now + 0.8);
    const boomGain = ctx.createGain();
    boomGain.gain.setValueAtTime(0.5, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    // Distorted heavy sub rumble
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(75, now);
    sub.frequency.linearRampToValueAtTime(35, now + 0.7);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    // Tension-inducing synthesizer alarm (warning siren: "Weeee-Woooo" at hyper-speed)
    for (let i = 0; i < 4; i++) {
      const alarmStart = now + (i * 0.15);
      const alarm = ctx.createOscillator();
      alarm.type = 'square';
      // Alternate frequencies to create alert sound
      alarm.frequency.setValueAtTime(i % 2 === 0 ? 880 : 980, alarmStart);
      alarm.frequency.linearRampToValueAtTime(i % 2 === 0 ? 980 : 1200, alarmStart + 0.14);
      
      const alarmGain = ctx.createGain();
      alarmGain.gain.setValueAtTime(0.12, alarmStart);
      alarmGain.gain.exponentialRampToValueAtTime(0.001, alarmStart + 0.14);
      
      alarm.connect(alarmGain);
      alarmGain.connect(dest);
      alarm.start(alarmStart);
      alarm.stop(alarmStart + 0.15);
    }

    boom.connect(boomGain);
    sub.connect(subGain);
    boomGain.connect(dest);
    subGain.connect(dest);

    boom.start(now);
    sub.start(now);
    boom.stop(now + 0.9);
    sub.stop(now + 0.8);
  } else {
    // Under 10: Rainbow Legend Jackpot / Golden Revelation
    // 12-round hyper-accelerated Kyuin-Kyuin loop + Holy golden cathedral chord
    let time = ctx.currentTime;
    
    // 1. Play massive physical impact (Metallic explosion)
    const boomNode = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    boomNode.type = 'sawtooth';
    boomNode.frequency.setValueAtTime(140, time);
    boomNode.frequency.exponentialRampToValueAtTime(15, time + 1.4);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, time);
    
    noiseGain.gain.setValueAtTime(0.85, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 1.4);
    
    boomNode.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);
    
    boomNode.start(time);
    boomNode.stop(time + 1.45);

    // 2. Beautiful background heavenly harmony (C major ninth chord) to make it super premium
    const choirNotes = [261.63, 329.63, 392.00, 493.88, 523.25, 659.25]; // C4, E4, G4, B4, C5, E5
    choirNotes.forEach((freq, idx) => {
      const choir = ctx.createOscillator();
      choir.type = 'sine';
      choir.frequency.setValueAtTime(freq, time);
      
      const choirGain = ctx.createGain();
      choirGain.gain.setValueAtTime(0.06, time);
      choirGain.gain.exponentialRampToValueAtTime(0.001, time + 1.5);
      
      choir.connect(choirGain);
      choirGain.connect(dest);
      choir.start(time);
      choir.stop(time + 1.6);
    });

    // 3. 12-round hyper siren loops with acceleration (dopamine overload)
    for (let i = 0; i < 12; i++) {
      // Accelerate the interval slightly for each iteration
      const interval = 0.11 - (i * 0.003); // Starts at 110ms and decreases to ~75ms
      const partStart = time + (i * interval);
      
      // Main sweep oscillator for high piercing whistle
      const kyuinPart = ctx.createOscillator();
      kyuinPart.type = 'sawtooth';
      kyuinPart.frequency.setValueAtTime(2200, partStart);
      kyuinPart.frequency.exponentialRampToValueAtTime(5600, partStart + (interval * 0.72));
      
      // Bandpass filter to create resonant siren whistle
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.Q.setValueAtTime(5.5, partStart);
      bandpass.frequency.setValueAtTime(3600, partStart);
      
      const kyuinGain = ctx.createGain();
      kyuinGain.gain.setValueAtTime(0, partStart);
      kyuinGain.gain.linearRampToValueAtTime(0.65, partStart + 0.012);
      kyuinGain.gain.exponentialRampToValueAtTime(0.001, partStart + (interval * 0.9));
      
      kyuinPart.connect(bandpass);
      bandpass.connect(kyuinGain);
      kyuinGain.connect(dest);
      
      kyuinPart.start(partStart);
      kyuinPart.stop(partStart + interval);

      // Super-high shimmering bell chimes layered on top of each kyuin
      const bell = ctx.createOscillator();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(4200 + (i * 120), partStart);
      const bellGain = ctx.createGain();
      bellGain.gain.setValueAtTime(0.16, partStart);
      bellGain.gain.exponentialRampToValueAtTime(0.001, partStart + (interval * 0.8));
      
      bell.connect(bellGain);
      bellGain.connect(dest);
      bell.start(partStart);
      bell.stop(partStart + interval);
    }
  }
};

// 5. 結果発表ファンファーレ (Happy winning melody)
export const playWinFanfare = (level: 'under_100' | 'under_50' | 'under_30' | 'under_10' | 'none') => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const dest = ctx.destination;
  const now = ctx.currentTime;

  if (level === 'under_10') {
    // Ultimate dopamine-charged victory fanfare (777 Style Electronic Symphony)
    // Plays a rapid ascending, celebratory melody with detuned twin oscillators & ringing high-bells
    const melody = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50, 1318.51, 1567.98]; // C5 -> E5 -> G5 -> C6 -> G5 -> C6 -> E6 -> G6
    const noteDuration = 0.07; // High-speed notes

    melody.forEach((freq, idx) => {
      const noteStart = now + idx * 0.085;
      
      // Detuned pair for fat analog synth brass sound
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      
      osc1.type = 'square';
      osc2.type = 'sawtooth';
      
      osc1.frequency.setValueAtTime(freq, noteStart);
      osc2.frequency.setValueAtTime(freq + 4, noteStart); // slight detune
      
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.15, noteStart);
      oscGain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration + 0.01);
      
      osc1.connect(oscGain);
      osc2.connect(oscGain);
      oscGain.connect(dest);
      
      osc1.start(noteStart);
      osc2.start(noteStart);
      
      osc1.stop(noteStart + noteDuration + 0.02);
      osc2.stop(noteStart + noteDuration + 0.02);

      // Add high pitch sweet glitter chimes on key beats (0, 3, 6, 7)
      if (idx % 2 === 0 || idx === 7) {
        const chime = ctx.createOscillator();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(freq * 2, noteStart);
        const chimeGain = ctx.createGain();
        chimeGain.gain.setValueAtTime(0.12, noteStart);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.25);
        chime.connect(chimeGain);
        chimeGain.connect(dest);
        chime.start(noteStart);
        chime.stop(noteStart + 0.26);
      }
    });

    // Final grand chord (Rich celebratory fanfare finish)
    const finalStart = now + melody.length * 0.085;
    const finalChords = [1046.50, 1318.51, 1567.98, 2093.00]; // C6-E6-G6-C7 chord
    
    finalChords.forEach((freq, idx) => {
      const fOsc = ctx.createOscillator();
      fOsc.type = 'square';
      fOsc.frequency.setValueAtTime(freq, finalStart);
      
      const fGain = ctx.createGain();
      fGain.gain.setValueAtTime(0.1, finalStart);
      fGain.gain.exponentialRampToValueAtTime(0.001, finalStart + 1.2);
      
      fOsc.connect(fGain);
      fGain.connect(dest);
      
      fOsc.start(finalStart);
      fOsc.stop(finalStart + 1.25);
    });

    // High speed laser sweeps at the end
    const laser = ctx.createOscillator();
    laser.type = 'sawtooth';
    laser.frequency.setValueAtTime(800, finalStart);
    laser.frequency.exponentialRampToValueAtTime(4000, finalStart + 0.6);
    const laserGain = ctx.createGain();
    laserGain.gain.setValueAtTime(0.08, finalStart);
    laserGain.gain.exponentialRampToValueAtTime(0.001, finalStart + 0.6);
    laser.connect(laserGain);
    laserGain.connect(dest);
    laser.start(finalStart);
    laser.stop(finalStart + 0.65);

  } else if (level === 'under_30' || level === 'under_50' || level === 'under_100') {
    // Standard high-beat notes
    const melody = [523.25, 659.25, 783.99, 1046.50];
    melody.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      const oscGain = createGainNode(ctx, 0.15, 0.15, 0.001);
      osc.connect(oscGain);
      oscGain.connect(dest);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.15);
    });
  } else {
    // Simple click/ding
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880.00, now);
    const oscGain = createGainNode(ctx, 0.25, 0.15, 0.001);
    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.25);
  }
};

// 6. フリーズ・プチュン音 (High pitch sudden beep + complete silence - absolute brain-melting transition)
// Designed as an ultra-fast high frequency laser snap with a vacuum implosion pop and absolute physical mute
export const playPuchunSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const dest = ctx.destination;
  const now = ctx.currentTime;
  
  // Ear-piercing glassy snap
  const highSnap = ctx.createOscillator();
  highSnap.type = 'sine';
  highSnap.frequency.setValueAtTime(5500, now);
  highSnap.frequency.exponentialRampToValueAtTime(1500, now + 0.055);
  
  const snapGain = ctx.createGain();
  snapGain.gain.setValueAtTime(0.55, now);
  snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.052);
  
  highSnap.connect(snapGain);
  snapGain.connect(dest);
  
  highSnap.start(now);
  highSnap.stop(now + 0.06);

  // Subwoofer pressure pop (Heavy physical vacuum vacuum effect)
  const subPop = ctx.createOscillator();
  subPop.type = 'sawtooth';
  subPop.frequency.setValueAtTime(180, now);
  subPop.frequency.linearRampToValueAtTime(20, now + 0.075);
  
  const popGain = ctx.createGain();
  popGain.gain.setValueAtTime(0.75, now);
  popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.072);
  
  subPop.connect(popGain);
  popGain.connect(dest);
  
  subPop.start(now);
  subPop.stop(now + 0.08);

  // Dynamic high-pass white noise hiss to simulate "air sucking out"
  const bufferSize = ctx.sampleRate * 0.06;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.setValueAtTime(4500, now);
  
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.4, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.058);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(dest);

  noise.start(now);
  noise.stop(now + 0.06);
};

// 7. フリーズ解除・GOD降臨音 (Ultimate massive celestial chord + extreme bass rumble)
// A stadium-sized cinematic brass synthesizer, resonant lowpass filter sweeps, sweet glisten-bells, and physical sub-bass rumble
export const playFreezeRevealSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const dest = ctx.destination;
  
  const now = ctx.currentTime;
  
  // A. Double-layered physical sub-bass rumble to physically vibrate the user's ears (40Hz + 80Hz)
  const subBass1 = ctx.createOscillator();
  const subBass2 = ctx.createOscillator();
  subBass1.type = 'sine';
  subBass2.type = 'sine';
  
  subBass1.frequency.setValueAtTime(40, now);
  subBass1.frequency.linearRampToValueAtTime(28, now + 2.8);
  
  subBass2.frequency.setValueAtTime(80, now);
  subBass2.frequency.linearRampToValueAtTime(56, now + 2.8);

  // Warm distortion curve
  const dist = ctx.createWaveShaper();
  const makeDistortionCurve = (amount = 25) => {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  };
  dist.curve = makeDistortionCurve(35);
  dist.oversample = '4x';

  const bassGain = ctx.createGain();
  bassGain.gain.setValueAtTime(1.1, now);
  bassGain.gain.exponentialRampToValueAtTime(0.001, now + 2.7);
  
  subBass1.connect(dist);
  subBass2.connect(dist);
  dist.connect(bassGain);
  bassGain.connect(dest);
  
  subBass1.start(now);
  subBass2.start(now);
  subBass1.stop(now + 2.85);
  subBass2.stop(now + 2.85);
  
  // B. Massive detuned Supersaw Choir Chord (E Major Chord cluster)
  // Stacked oscillators with detuning to simulate standard high-end physical cabinet synthesizers
  const chordFrequencies = [164.81, 246.94, 329.63, 415.30, 493.88, 659.25, 830.61]; // E3 -> G#5
  
  chordFrequencies.forEach((freq, idx) => {
    // 3 detuned oscillators per note for huge stereo-field simulation
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const oscC = ctx.createOscillator();
    
    oscA.type = 'sawtooth';
    oscB.type = 'sawtooth';
    oscC.type = 'sawtooth';
    
    oscA.frequency.setValueAtTime(freq, now);
    oscB.frequency.setValueAtTime(freq + (freq * 0.006), now);  // Slightly sharp detune (+10 cents)
    oscC.frequency.setValueAtTime(freq - (freq * 0.006), now);  // Slightly flat detune (-10 cents)
    
    // High-resonance lowpass sweep (creates beautiful squelchy "heaven opening" filter sweeps)
    const filterNode = ctx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.Q.setValueAtTime(9.5, now);
    filterNode.frequency.setValueAtTime(120, now);
    filterNode.frequency.exponentialRampToValueAtTime(5200, now + 1.4); // Sweeps open dramatically
    
    const chordGain = ctx.createGain();
    chordGain.gain.setValueAtTime(0.065, now);
    chordGain.gain.exponentialRampToValueAtTime(0.001, now + 3.1);
    
    oscA.connect(filterNode);
    oscB.connect(filterNode);
    oscC.connect(filterNode);
    filterNode.connect(chordGain);
    chordGain.connect(dest);
    
    oscA.start(now);
    oscB.start(now);
    oscC.start(now);
    
    oscA.stop(now + 3.25);
    oscB.stop(now + 3.25);
    oscC.stop(now + 3.25);
  });

  // C. Highly reflective sweet FM-style glisten bells (Arpeggiated heavenly dings)
  const bellFrequencies = [659.25, 830.61, 987.77, 1318.51, 1661.22, 1975.53, 2637.02, 3322.44];
  bellFrequencies.forEach((freq, idx) => {
    const delay = idx * 0.055;
    
    // Bell core frequency
    const bellCore = ctx.createOscillator();
    bellCore.type = 'sine';
    bellCore.frequency.setValueAtTime(freq, now + delay);
    
    // Bell metallic overtone multiplier (harmonic modulator simulation)
    const bellHarmonic = ctx.createOscillator();
    bellHarmonic.type = 'sine';
    bellHarmonic.frequency.setValueAtTime(freq * 2.76, now + delay); // non-integer multiplier for glassiness
    
    const bellGain = ctx.createGain();
    bellGain.gain.setValueAtTime(0, now + delay);
    bellGain.gain.linearRampToValueAtTime(0.18, now + delay + 0.012);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.48);
    
    bellCore.connect(bellGain);
    bellHarmonic.connect(bellGain);
    bellGain.connect(dest);
    
    bellCore.start(now + delay);
    bellHarmonic.start(now + delay);
    
    bellCore.stop(now + delay + 0.52);
    bellHarmonic.stop(now + delay + 0.52);
  });
};

// 8. 違和感・ロックされたボタン押下時の警告音 (Low buzzing error)
export const playBuzzerSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(100, now);
  osc.frequency.linearRampToValueAtTime(90, now + 0.15);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(200, now);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.16);
};

// 9. ボタンロック解除音 (Dopamine lock-release chime)
export const playButtonUnlockSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(600, now);
  osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(800, now);
  osc2.frequency.exponentialRampToValueAtTime(1600, now + 0.15);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.2);
  osc2.stop(now + 0.2);
};

// 9-b. 数値確定音 (Two-note descending chime: "決まった" feel)
export const playConfirmScoreSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  [
    { freq: 880, at: 0, dur: 0.16 },
    { freq: 587.33, at: 0.11, dur: 0.34 },
  ].forEach(({ freq, at, dur }) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + at);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(0.26, now + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + at);
    osc.stop(now + at + dur + 0.02);
  });
};

// 9-c. 手番通知音 (Short bright arpeggio announcing "your turn")
export const playYourTurnSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  [659.25, 830.61, 987.77].forEach((freq, i) => {
    const at = i * 0.075;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + at);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(0.22, now + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.26);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + at);
    osc.stop(now + at + 0.28);
  });
};

// 9-d. 地獄音 (Descending dissonant drone: the +100 outcome)
export const playHellSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Two detuned saws sliding down a tritone apart — deliberately unpleasant.
  [110, 155.6].forEach((start, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(start, now);
    osc.frequency.exponentialRampToValueAtTime(start / 3.2, now + 1.5);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.08);
    gain.gain.setValueAtTime(0.2, now + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(220, now + 1.5);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.03);
    osc.stop(now + 1.7);
  });

  // A struck-bell thud on top so the hit lands.
  const thud = ctx.createOscillator();
  thud.type = 'square';
  thud.frequency.setValueAtTime(70, now);
  thud.frequency.exponentialRampToValueAtTime(28, now + 0.6);
  const thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(0.28, now);
  thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
  thud.connect(thudGain);
  thudGain.connect(ctx.destination);
  thud.start(now);
  thud.stop(now + 0.75);
};

// 10. 3rd停止時書き換えあおり音 (Rising frequency tensional sweep)
export const playRewriteTriggerSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(1800, now + 0.6);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, now);
  filter.frequency.exponentialRampToValueAtTime(4000, now + 0.6);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.65);
};

// 11. 書き換え成功音 (Massive exploding high-pitched Kyuin chime)
export const playRewriteSuccessSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (let i = 0; i < 6; i++) {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    const freq = 600 + i * 250;
    osc.frequency.setValueAtTime(freq, now + i * 0.05);
    osc.frequency.exponentialRampToValueAtTime(freq * 2, now + i * 0.05 + 0.15);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now + i * 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.05);
    osc.stop(now + i * 0.05 + 0.16);
  }
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(160, now);
  sub.frequency.linearRampToValueAtTime(40, now + 0.5);
  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.5, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  sub.connect(subGain);
  subGain.connect(ctx.destination);
  sub.start(now);
  sub.stop(now + 0.52);
};

// 12. 書き換え失敗音 (Spring-bounce comic-fail sound)
export const playRewriteFailureSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(350, now);
  osc.frequency.linearRampToValueAtTime(80, now + 0.4);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, now);
  filter.frequency.linearRampToValueAtTime(100, now + 0.4);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.42);
};

// 12.5. ダミー99以下・嘲笑ボタン登場音 (Creepy devilish taunt trigger)
export const playMockTriggerSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  
  // Ominous rising & falling devil chime
  const notes = [300, 450, 280, 520, 220];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now + i * 0.08);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + i * 0.08 + 0.06);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.12);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.13);
  });
};

// 12.6. 嘲笑・失敗笑い声風効果音 (Taunting mock laugh sound "Wah-wah-wah/Fahaha")
export const playMockLaughSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  
  // "Fa-ha-ha-ha!" laughing staccato stepped frequencies
  const laughNotes = [260, 220, 180, 140];
  laughNotes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now + i * 0.1);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.8, now + i * 0.1 + 0.08);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now + i * 0.1);
    filter.Q.setValueAtTime(3.0, now + i * 0.1);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.09);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.1);
  });
};

// 13. おもしろ停止音：にゃーん (Highly realistic synthesized cat meow)
export const playWeirdStopSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(500, now);
  osc.frequency.exponentialRampToValueAtTime(1000, now + 0.12);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.28);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
};

// 14. 違和感・おもしろレバーON音 (Weird cartoon boing lever pull sound)
export const playWeirdLeverSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.35);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, now);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.45);
};

// 15. ゾロ目超豪華ファンファーレ (Spectacular multi-voice Zorome melody)
export const playZoromeVictorySound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Let's build a rich fanfare melody: [C5, E5, G5, C6] followed by [D5, F#5, A5, D6] then triumph [E5, G#5, B5, E6]!
  const notes = [
    { freq: 523.25, delay: 0 },     // C5
    { freq: 659.25, delay: 0.1 },   // E5
    { freq: 783.99, delay: 0.2 },   // G5
    { freq: 1046.50, delay: 0.3 },  // C6
    
    { freq: 587.33, delay: 0.45 },  // D5
    { freq: 739.99, delay: 0.55 },  // F#5
    { freq: 880.00, delay: 0.65 },  // A5
    { freq: 1174.66, delay: 0.75 }, // D6

    { freq: 659.25, delay: 0.9 },   // E5
    { freq: 830.61, delay: 1.0 },   // G#5
    { freq: 987.77, delay: 1.1 },   // B5
    { freq: 1318.51, delay: 1.2 },  // E6
  ];

  notes.forEach((note) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(note.freq, now + note.delay);
    
    // Add vibrato
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 12; // 12Hz vibrato
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 15;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now + note.delay);
    gain.gain.exponentialRampToValueAtTime(0.001, now + note.delay + 0.4);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    lfo.start(now + note.delay);
    osc.start(now + note.delay);
    
    lfo.stop(now + note.delay + 0.45);
    osc.stop(now + note.delay + 0.45);
  });

  // Massive exploding bass impact at the end
  const sub = ctx.createOscillator();
  sub.type = 'sawtooth';
  sub.frequency.setValueAtTime(180, now + 1.2);
  sub.frequency.exponentialRampToValueAtTime(45, now + 1.8);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(250, now + 1.2);

  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.4, now + 1.2);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

  sub.connect(filter);
  filter.connect(subGain);
  subGain.connect(ctx.destination);
  sub.start(now + 1.2);
  sub.stop(now + 1.85);
};

// Stamp Reaction sound effect
export const playStampSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523.25, now); // C5
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
  
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(now);
  osc.stop(now + 0.2);
};


