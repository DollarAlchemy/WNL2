# Ordbok ⚔ — WoW Norsk Trainer

A Norwegian language flashcard game built around World of Warcraft Classic & TBC vocabulary.

## Features

- Faction selection (Alliance / Horde)
- Race cards — racials, cities, zones, lore
- Class cards — weapons, armor, playstyle
- 2-choice quiz with 15s timer
- XP progression and streak tracking
- Synthesized SFX + ambient BGM (no audio files needed)

## Project Structure

```
norsk-wow/
  index.html          — app shell, links all files
  css/
    base.css          — CSS variables, reset, layout, header, XP bar
    components.css    — faction cards, race/class grid, buttons, chips
    screens.css       — quiz card, options, results, feedback
  js/
    data.js           — all flashcard data (DB object)
    audio.js          — Web Audio SFX engine (AC) + ambient BGM engine
    state.js          — game state object (S) and XP constant
    ui.js             — DOM helpers, screen switching, utility functions
    quiz.js           — game logic: deck building, quiz flow, timer, XP, results
  assets/
    fonts/            — (optional) self-hosted font files
    sounds/           — (optional) future .mp3 SFX replacements
```

## Deployment

This project is designed for **GitHub Pages** — just push and it works.

1. Upload the full `norsk-wow/` folder contents to your GitHub repo root
2. In repo Settings → Pages → set source to `main` branch, `/ (root)`
3. Done — visit `https://yourusername.github.io/norsk-wow/`

## Adding Cards

Open `js/data.js` and find the race or class you want to expand. Cards follow this format:

```js
{ en: 'English term', no: 'Norsk term', ctx: 'WoW context hint' }
```

For class cards, add to the correct depth layer (`weapons`, `armor`, `playstyle`).

## Local Development

Open `index.html` directly in Chrome or Firefox — no server needed for basic testing.

For hot-reload development, install [Vite](https://vitejs.dev/):

```bash
npm create vite@latest
npm install
npm run dev
```

## Credits

Built by Thomas with Claude. WoW Classic & TBC vocabulary — all rights to Blizzard Entertainment.
