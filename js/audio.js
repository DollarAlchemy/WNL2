const AC = (()=>{
  let ctx = null;
  function getCtx(){
    if(!ctx) ctx = new (window.AudioContext||window.webkitAudioContext)();
    if(ctx.state==='suspended') ctx.resume();
    return ctx;
  }

  // shape an oscillator with ADSR envelope
  function tone(freq, type, attack, decay, sustain, release, gainPeak, startTime, ctx){
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(gainPeak, startTime + attack);
    env.gain.linearRampToValueAtTime(gainPeak * sustain, startTime + attack + decay);
    env.gain.setValueAtTime(gainPeak * sustain, startTime + attack + decay);
    env.gain.linearRampToValueAtTime(0, startTime + attack + decay + release);
    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + attack + decay + release + 0.01);
  }

  // bright ascending ding for correct
  function correct(){
    const c = getCtx(); const t = c.currentTime;
    tone(660,  'sine',   0.005, 0.05, 0.6, 0.18, 0.28, t,       c);
    tone(880,  'sine',   0.005, 0.05, 0.6, 0.20, 0.22, t+0.08,  c);
    tone(1320, 'sine',   0.005, 0.04, 0.5, 0.22, 0.18, t+0.17,  c);
    // subtle shimmer
    tone(2640, 'sine',   0.005, 0.03, 0.3, 0.25, 0.06, t+0.17,  c);
  }

  // dull thud + low buzz for wrong
  function wrong(){
    const c = getCtx(); const t = c.currentTime;
    // impact thud
    const buf = c.createBuffer(1, c.sampleRate * 0.15, c.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0;i<data.length;i++) data[i] = (Math.random()*2-1) * Math.exp(-i/(c.sampleRate*0.04));
    const src = c.createBufferSource();
    src.buffer = buf;
    const flt = c.createBiquadFilter();
    flt.type = 'lowpass'; flt.frequency.value = 220;
    const g = c.createGain(); g.gain.setValueAtTime(0.45, t);
    src.connect(flt); flt.connect(g); g.connect(c.destination);
    src.start(t);
    // low descending tone
    tone(180, 'sawtooth', 0.005, 0.06, 0.4, 0.22, 0.14, t,      c);
    tone(140, 'sine',     0.005, 0.08, 0.3, 0.20, 0.10, t+0.06, c);
  }

  // soft tick for timer urgency (last 5s)
  function tick(){
    const c = getCtx(); const t = c.currentTime;
    tone(440, 'square', 0.001, 0.002, 0.0, 0.06, 0.08, t, c);
  }

  // skip whoosh
  function skip(){
    const c = getCtx(); const t = c.currentTime;
    const osc = c.createOscillator();
    const env = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.linearRampToValueAtTime(200, t+0.12);
    env.gain.setValueAtTime(0.12, t);
    env.gain.linearRampToValueAtTime(0, t+0.14);
    osc.connect(env); env.connect(c.destination);
    osc.start(t); osc.stop(t+0.15);
  }

  // fanfare for session complete / level up
  function fanfare(){
    const c = getCtx(); const t = c.currentTime;
    const notes = [523,659,784,1047]; // C5 E5 G5 C6
    notes.forEach((f,i)=>{
      tone(f, 'sine', 0.01, 0.08, 0.7, 0.30, 0.22, t + i*0.12, c);
      tone(f*1.5, 'sine', 0.01, 0.06, 0.4, 0.28, 0.06, t + i*0.12, c);
    });
  }

  // level up jingle
  function levelUp(){
    const c = getCtx(); const t = c.currentTime;
    [440,554,659,880,1108].forEach((f,i)=>{
      tone(f, 'sine', 0.005, 0.05, 0.5, 0.25, 0.18, t + i*0.09, c);
    });
  }

  return { correct, wrong, tick, skip, fanfare, levelUp, getCtx };
})();

// ═══════════════════════════════════════════════════════
//  BGM ENGINE — ambient pentatonic loop, no files needed
// ═══════════════════════════════════════════════════════
const BGM = (()=>{
  let ctx = null, masterGain = null, running = false, muted = false;
  let droneNodes = [], melodyTimeout = null, arpTimeout = null;

  function init(){
    ctx = AC.getCtx();
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0, ctx.currentTime);
    masterGain.connect(ctx.destination);
  }

  // Soft pad/drone — layered detuned sines for warmth
  function startDrone(){
    // Root: D2 (73.4 Hz), fifth: A2 (110 Hz)
    [[73.4, 0], [73.4, 4], [110.0, 0], [110.0, -3], [146.8, 2]].forEach(([freq, detune])=>{
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      const flt = ctx.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value    = detune;
      flt.type = 'lowpass'; flt.frequency.value = 400;
      g.gain.value = 0.055;
      osc.connect(flt); flt.connect(g); g.connect(masterGain);
      osc.start();
      droneNodes.push(osc, g);
    });
  }

  function stopDrone(){
    droneNodes.forEach(n=>{ try{ n.disconnect(); if(n.stop) n.stop(); }catch(e){} });
    droneNodes = [];
  }

  // Pentatonic scale in D minor: D3 F3 G3 A3 C4 D4 F4 G4 A4
  const PENTA = [146.8, 174.6, 196.0, 220.0, 261.6, 293.7, 349.2, 392.0, 440.0];

  function softNote(freq, startT, dur, gain=0.045){
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const flt = ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.value = freq;
    flt.type = 'lowpass'; flt.frequency.value = 1800;
    env.gain.setValueAtTime(0, startT);
    env.gain.linearRampToValueAtTime(gain, startT + 0.08);
    env.gain.setValueAtTime(gain, startT + dur - 0.25);
    env.gain.linearRampToValueAtTime(0, startT + dur);
    osc.connect(flt); flt.connect(env); env.connect(masterGain);
    osc.start(startT); osc.stop(startT + dur + 0.05);
  }

  // Slow wandering melody — picks notes from upper penta range
  const MELODY_UPPER = [220.0, 261.6, 293.7, 349.2, 392.0, 440.0, 523.3];
  // Melodic phrase patterns (intervals into MELODY_UPPER)
  const PHRASES = [
    [4,5,6,5,4,3,4],
    [3,4,5,4,3,2,3],
    [5,6,5,4,5,4,3],
    [2,3,4,5,4,3,2],
    [4,3,2,3,4,5,4],
  ];

  function scheduleMelody(){
    if(!running) return;
    const phrase = PHRASES[Math.floor(Math.random()*PHRASES.length)];
    const t = ctx.currentTime + 0.1;
    const noteDur = 1.8 + Math.random()*0.8;   // each note ~1.8–2.6s
    const gap     = 0.3 + Math.random()*0.4;    // gap between notes
    let offset = 0;
    phrase.forEach((idx, i)=>{
      const freq = MELODY_UPPER[Math.min(idx, MELODY_UPPER.length-1)];
      // slight gain variation for expression
      const g = 0.038 + Math.random()*0.014;
      softNote(freq, t + offset, noteDur, g);
      offset += noteDur - 0.6 + gap;
    });
    // total phrase duration + rest before next
    const totalDur = (offset + 2.5) * 1000;
    melodyTimeout = setTimeout(scheduleMelody, totalDur);
  }

  // Gentle arpeggio — D minor chord tones, high register, very soft
  const ARP_NOTES = [293.7, 349.2, 440.0, 587.3, 698.5];
  function scheduleArp(){
    if(!running) return;
    const t = ctx.currentTime + 0.05;
    const pattern = [0,1,2,3,2,1,0,1,2,3,4,3,2,1];
    const step = 0.38 + Math.random()*0.12;
    pattern.forEach((idx,i)=>{
      softNote(ARP_NOTES[idx], t + i*step, 1.1, 0.018);
    });
    const loopMs = (pattern.length * step + 3.5) * 1000;
    arpTimeout = setTimeout(scheduleArp, loopMs);
  }

  function fadeIn(){
    if(!masterGain) return;
    const t = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setValueAtTime(masterGain.gain.value, t);
    masterGain.gain.linearRampToValueAtTime(1.0, t + 3.0);
  }

  function fadeOut(cb){
    if(!masterGain) return;
    const t = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setValueAtTime(masterGain.gain.value, t);
    masterGain.gain.linearRampToValueAtTime(0.0, t + 2.0);
    if(cb) setTimeout(cb, 2200);
  }

  function start(){
    if(running) return;
    if(!ctx) init();
    running = true;
    startDrone();
    scheduleMelody();
    setTimeout(scheduleArp, 4000); // arp starts after melody establishes
    fadeIn();
  }

  function stop(){
    running = false;
    clearTimeout(melodyTimeout);
    clearTimeout(arpTimeout);
    fadeOut(()=> stopDrone());
  }

  function toggleMute(){
    muted = !muted;
    if(!ctx) init();
    if(muted){
      fadeOut();
    } else {
      if(!running) start();
      else fadeIn();
    }
    return muted;
  }

  function isRunning(){ return running; }

  return { start, stop, toggleMute, isRunning };
})();

// ═══════════════════════════════════════════════════════
