//  STATE
// ═══════════════════════════════════════════════════════
let S = {
  xp:0, level:1, streak:0,
  faction: null,
  selectedRaces: [],
  selectedClasses: [],
  selectedDepths: ['weapons','armor','playstyle'],
  deck: [], idx: 0,
  correct: 0, wrong: 0, missed: [],
  timer: null, timeLeft: 15,
  answered: false,
  lastDeckConfig: null,
};
const XPL = 100;

// ═══════════════════════════════════════════════════════
