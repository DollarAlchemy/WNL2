//  INIT
// ═══════════════════════════════════════════════════════
(function init(){
  // Quick class grid on faction screen
  const qg = document.getElementById('quickClassGrid');
  Object.entries(DB.classes).forEach(([k,c])=>{
    const b = mkBtn(c.icon, c.label, '', ()=> { toggleQuickClass(k,b); }, 'pick-btn');
    b.dataset.key = k;
    qg.appendChild(b);
  });

  // Depth chips
  document.querySelectorAll('.depth-chip').forEach(ch=>{
    ch.onclick = ()=>{
      ch.classList.toggle('sel');
      const d = ch.dataset.d;
      const i = S.selectedDepths.indexOf(d);
      if(i>=0) S.selectedDepths.splice(i,1); else S.selectedDepths.push(d);
    };
  });
})();

// quick class grid (faction home)
const quickClassSel = new Set();
function toggleQuickClass(k, btn){
  if(quickClassSel.has(k)){ quickClassSel.delete(k); btn.classList.remove('sel'); }
  else { quickClassSel.add(k); btn.classList.add('sel'); }
  document.getElementById('quickStart').disabled = quickClassSel.size===0;
}
function launchQuickClasses(){
  S.selectedRaces = [];
  S.selectedClasses = [...quickClassSel];
  S.selectedDepths = ['weapons','armor','playstyle'];
  buildDeck();
  BGM.start();
  showScreen('sQuiz');
  loadCard();
}

// ═══════════════════════════════════════════════════════
//  FACTION → RACE SELECT
// ═══════════════════════════════════════════════════════
function pickFaction(f){
  S.faction = f;
  S.selectedRaces = [];
  S.selectedClasses = [];
  document.getElementById('raceLabel').textContent = f==='alliance'? '🔵 Alliance Races' : '🔴 Horde Races';

  // Race grid
  const rg = document.getElementById('raceGrid');
  rg.innerHTML = '';
  Object.entries(DB.races).filter(([,r])=>r.faction===f).forEach(([k,r])=>{
    const b = mkBtn(r.icon, r.label, r.cards.length+' cards', ()=>toggleSel(k,'race',b),'pick-btn');
    b.dataset.key=k; rg.appendChild(b);
  });

  // Class grid (faction-relevant)
  const cg = document.getElementById('classGridR');
  cg.innerHTML='';
  Object.entries(DB.classes).filter(([,c])=>c.faction==='both'||c.faction===f).forEach(([k,c])=>{
    const totalCards = Object.values(c.cards).flat().length;
    const b = mkBtn(c.icon, c.label, totalCards+' cards', ()=>toggleSel(k,'cls',b),'pick-btn');
    b.dataset.key=k; cg.appendChild(b);
  });

  showScreen('sRace');
}

function toggleSel(k, type, btn){
  if(type==='race'){
    const i=S.selectedRaces.indexOf(k);
    if(i>=0){S.selectedRaces.splice(i,1); btn.classList.remove('sel');}
    else{S.selectedRaces.push(k); btn.classList.add('sel');}
  } else {
    const i=S.selectedClasses.indexOf(k);
    if(i>=0){S.selectedClasses.splice(i,1); btn.classList.remove('sel');}
    else{S.selectedClasses.push(k); btn.classList.add('sel');}
  }
}

function launch(){
  // If nothing selected, take all available
  if(S.selectedRaces.length===0){
    document.querySelectorAll('#raceGrid .pick-btn').forEach(b=>{
      S.selectedRaces.push(b.dataset.key); b.classList.add('sel');
    });
  }
  if(S.selectedClasses.length===0){
    document.querySelectorAll('#classGridR .pick-btn').forEach(b=>{
      S.selectedClasses.push(b.dataset.key); b.classList.add('sel');
    });
  }
  if(S.selectedDepths.length===0) S.selectedDepths=['weapons','armor','playstyle'];
  buildDeck();
  BGM.start();
  showScreen('sQuiz');
  loadCard();
}

// ═══════════════════════════════════════════════════════
//  DECK BUILDER
// ═══════════════════════════════════════════════════════
function buildDeck(){
  let cards = [];

  S.selectedRaces.forEach(k=>{
    const r = DB.races[k]; if(!r) return;
    r.cards.forEach(c=> cards.push({...c, _tag: r.label+' Race'}));
  });

  S.selectedClasses.forEach(k=>{
    const c = DB.classes[k]; if(!c) return;
    S.selectedDepths.forEach(d=>{
      if(c.cards[d]) c.cards[d].forEach(card=> cards.push({...card, _tag: c.label+' · '+capFirst(d)}));
    });
  });

  // Deduplicate by en+no
  const seen = new Set();
  cards = cards.filter(c=>{ const key=c.en+'|'+c.no; if(seen.has(key)) return false; seen.add(key); return true; });

  // Shuffle
  for(let i=cards.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [cards[i],cards[j]]=[cards[j],cards[i]]; }

  S.deck=cards; S.idx=0; S.correct=0; S.wrong=0; S.missed=[];
  S.lastDeckConfig = { races:[...S.selectedRaces], classes:[...S.selectedClasses], depths:[...S.selectedDepths] };
  document.getElementById('qT').textContent = cards.length;
}

// ═══════════════════════════════════════════════════════
//  QUIZ
// ═══════════════════════════════════════════════════════
function loadCard(){
  if(S.idx>=S.deck.length){ showResults(); return; }
  const card = S.deck[S.idx];
  S.answered=false;
  document.getElementById('qN').textContent=S.idx+1;
  document.getElementById('qTag').textContent=card._tag||'—';
  document.getElementById('qEn').textContent=card.en;
  document.getElementById('qCtx2').textContent=card.ctx||'';
  document.getElementById('qCtx').innerHTML='TOPIC · <span>'+(card._tag||'—')+'</span>';

  const qc=document.getElementById('qCard');
  qc.className='q-card';
  setFB('','');
  document.getElementById('nextBtn').style.display='none';

  buildOpts(card);
  startTimer();
}

function buildOpts(card){
  // Pull 1 wrong answer from entire DB
  const pool = getAllCards().filter(c=>c.no!==card.no).sort(()=>Math.random()-.5).slice(0,1);
  const opts = [...pool, card].sort(()=>Math.random()-.5);
  const g=document.getElementById('optsGrid');
  g.innerHTML='';
  g.style.gridTemplateColumns='1fr 1fr';
  opts.forEach((o)=>{
    const b=document.createElement('button');
    b.className='opt opt-2';
    b.innerHTML=o.no;
    b.onclick=()=>answer(o.no===card.no, b, card, opts);
    g.appendChild(b);
  });
}

function answer(correct, btn, card, opts){
  if(S.answered) return;
  S.answered=true; stopTimer();
  document.querySelectorAll('.opt').forEach(b=>{
    b.disabled=true;
    // strip letter prefix for comparison
    const txt=b.textContent.replace(/^[A-D]\.\s*/,'');
    if(txt===card.no) b.classList.add('ok');
  });
  const qc=document.getElementById('qCard');
  if(correct){
    AC.correct();
    btn.classList.remove('ok');btn.classList.add('ok');
    qc.classList.add('correct');
    S.correct++; S.streak++;
    const bonus=Math.min(S.streak*2,20);
    const prevLevel = S.level;
    addXP(10+bonus);
    if(S.level > prevLevel) AC.levelUp();
    spawnXP('+' +(10+bonus)+' XP');
    setFB('✓  Riktig! '+rndCorrect(),'ok');
  } else {
    AC.wrong();
    btn.classList.add('miss');
    qc.classList.add('wrong');
    S.wrong++; S.streak=0;
    S.missed.push(card);
    setFB('✗  Answer: "'+card.no+'"','miss');
  }
  updateStrip();
  document.getElementById('nextBtn').style.display='block';
}

function nextCard(){ S.idx++; loadCard(); }
function skipCard(){
  AC.skip();
  stopTimer(); S.wrong++; S.streak=0;
  S.missed.push(S.deck[S.idx]);
  updateStrip(); S.idx++; loadCard();
}

// ═══════════════════════════════════════════════════════
//  TIMER
// ═══════════════════════════════════════════════════════
function startTimer(){
  stopTimer(); S.timeLeft=15; updateTimer();
  S.timer=setInterval(()=>{
    S.timeLeft--;
    updateTimer();
    if(S.timeLeft<=5 && S.timeLeft>0 && !S.answered) AC.tick();
    if(S.timeLeft<=0){
      stopTimer();
      if(!S.answered){
        AC.wrong();
        S.answered=true;
        document.getElementById('qCard').classList.add('wrong');
        S.wrong++; S.streak=0;
        S.missed.push(S.deck[S.idx]);
        setFB('⏱  Time\'s up! Answer: "'+S.deck[S.idx].no+'"','miss');
        document.querySelectorAll('.opt').forEach(b=>{b.disabled=true; if(b.textContent.replace(/^[A-D]\.\s*/,'')===S.deck[S.idx].no) b.classList.add('ok');});
        document.getElementById('nextBtn').style.display='block';
        updateStrip();
      }
    }
  },1000);
}
function stopTimer(){ if(S.timer){clearInterval(S.timer);S.timer=null;} }
function updateTimer(){
  const r=document.getElementById('tArc');
  const n=document.getElementById('tNum');
  const pct=S.timeLeft/15;
  r.style.strokeDashoffset=(100.5*(1-pct));
  const col=S.timeLeft<=5?'#da4040':S.timeLeft<=10?'#d4a040':'var(--gold)';
  r.style.stroke=col; n.style.color=col;
  n.textContent=S.timeLeft;
}

// ═══════════════════════════════════════════════════════
//  XP
// ═══════════════════════════════════════════════════════
function addXP(v){
  S.xp+=v;
  while(S.xp>=XPL){S.xp-=XPL;S.level++;}
  updateStrip();
}
function updateStrip(){
  document.getElementById('xLvl').textContent=S.level;
  document.getElementById('xCur').textContent=S.xp;
  document.getElementById('xNxt').textContent=XPL;
  document.getElementById('xBar').style.width=(S.xp/XPL*100)+'%';
  document.getElementById('xStr').textContent=S.streak;
}
function spawnXP(txt){
  const card=document.getElementById('qCard').getBoundingClientRect();
  const el=document.createElement('div');
  el.className='xp-pop';
  el.textContent=txt;
  el.style.left=(card.left+card.width/2-20)+'px';
  el.style.top=(card.top+window.scrollY+10)+'px';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1200);
}

// ═══════════════════════════════════════════════════════
//  RESULTS
// ═══════════════════════════════════════════════════════
function showResults(){
  stopTimer();
  AC.fanfare();
  const tot=S.correct+S.wrong;
  const pct=tot?Math.round(S.correct/tot*100):0;
  document.getElementById('sC').textContent=S.correct;
  document.getElementById('sW').textContent=S.wrong;
  document.getElementById('sP').textContent=pct+'%';
  let icon='⚔',title='SESSION COMPLETE';
  if(pct===100){icon='👑';title='PERFEKT SEIER!';}
  else if(pct>=80){icon='🏆';title='STRONG SHOWING';}
  else if(pct>=60){icon='⚔';title='SESSION COMPLETE';}
  else if(pct>=40){icon='🛡';title='KEEP PRACTICING';}
  else{icon='💀';title='FALLEN IN BATTLE';}
  document.getElementById('resIcon').textContent=icon;
  document.getElementById('resTitle').textContent=title;
  const ml=document.getElementById('missL');
  ml.innerHTML='';
  if(S.missed.length){
    document.getElementById('missH').textContent='Review these ('+S.missed.length+'):';
    S.missed.forEach(c=>{
      const d=document.createElement('div');
      d.className='missed-row';
      d.innerHTML=`<span class="m-en">${c.en}</span><span class="m-no">${c.no}</span>`;
      ml.appendChild(d);
    });
  } else { document.getElementById('missH').textContent=''; }
  showScreen('sResults');
}
function relaunch(){
  // Rebuild with same config
  S.selectedRaces=S.lastDeckConfig?.races||[];
  S.selectedClasses=S.lastDeckConfig?.classes||[];
  S.selectedDepths=S.lastDeckConfig?.depths||['weapons','armor','playstyle'];
  buildDeck();
  showScreen('sQuiz');
  loadCard();
}

// ═══════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════
