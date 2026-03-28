function getAllCards(){
  let all=[];
  Object.values(DB.races).forEach(r=>all.push(...r.cards));
  Object.values(DB.classes).forEach(c=>Object.values(c.cards).flat().forEach(card=>all.push(card)));
  const seen=new Set();
  return all.filter(c=>{if(seen.has(c.no))return false;seen.add(c.no);return true;});
}
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function go(target,current){ stopTimer(); showScreen(target); }
function setFB(msg,cls){
  const fb=document.getElementById('fb');
  fb.textContent=msg;
  fb.className='fb'+(msg?' show':'')+(cls?' '+cls:'');
}
function mkBtn(icon,name,sub,cb,cls){
  const b=document.createElement('button');
  b.className=cls;
  b.innerHTML=`<span class="pick-icon">${icon}</span><div class="pick-name">${name}</div>${sub?`<div class="pick-sub">${sub}</div>`:''}`;
  b.onclick=cb;
  return b;
}
function toggleBGM(){
  const muted = BGM.toggleMute();
  const btn = document.getElementById('muteBtn');
  btn.textContent = muted ? '♪ BGM OFF' : '♪ BGM ON';
  btn.classList.toggle('muted', muted);
}

function capFirst(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

const corrects=['Riktig!','Perfekt!','Bra jobbet!','Excellent!','Ja!'];
function rndCorrect(){ return corrects[Math.floor(Math.random()*corrects.length)]; }
