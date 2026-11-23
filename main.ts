// Emberfall Duel — the hand-in program (Node 22, standard library only).
//
// The game itself is the static site in game/: plain files a desktop browser
// opens offline, no build step and no network. This program delivers it. It
// copies game/ and screenshots/ from beside this file into the output folder
// and writes dossier.json there with buildDossier from the vendored make.fun
// library — the summary of the game and its screenshots that the judge reads.
//
// In the grader the output folder is /output; anywhere else, set
// MAKEFUN_OUTPUT_DIR to stand in for it:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play the game first if you like: `node serve.ts`, then http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps are the gate's own (see the bounty's RULES.txt): the dossier text is
// capped, screenshots are at most 4 files of 256 KiB, and game/ holds at most
// 993 entries and 48 MiB with no path over 1,000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
