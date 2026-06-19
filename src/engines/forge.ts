/**
 * The Forge: turns a free-text topic into a fully-playable puzzle.
 *
 * Each format has: a Gemini generator (structured output), a deterministic
 * validation gate, an offline fallback (so demos never break), a client-safe
 * projection (strips the solution), and a server-side checker.
 *
 * Logic puzzles (sudoku) live in ./sudoku.ts — the LLM never authors them.
 */
import { GoogleGenAI, Type } from '@google/genai';
import { generateSudoku, checkSudoku } from './sudoku.ts';
import { generateZip, checkZip, generateQueens, checkQueens } from './linkedin.ts';

export type ForgeFormat = 'codex' | 'wordgrid' | 'connections' | 'quiz' | 'sudoku' | 'zip' | 'queens';

export const ALL_FORMATS: ForgeFormat[] = ['codex', 'wordgrid', 'connections', 'quiz', 'sudoku', 'zip', 'queens'];

export interface GeneratedPuzzle {
  format: ForgeFormat;
  topic: string;
  difficulty: string;
  title: string;
  note?: string; // AI "setter's note" / flavor shown to the player
  payload: any; // includes solution — server-side only
  source: 'gemini' | 'solver' | 'fallback';
}

/** How a difficulty should bias AI generation (counts + tone). */
function diffSpec(difficulty: string) {
  switch (difficulty) {
    case 'easy':
      return { tone: 'Use famous, instantly-recognisable items and obvious attributes. Beginner friendly.', sizeWord: 'easy' };
    case 'hard':
      return { tone: 'Use deeper-cut, less obvious items and subtle/tricky attributes that demand expertise.', sizeWord: 'hard' };
    default:
      return { tone: 'Mix well-known items with a few trickier ones.', sizeWord: 'medium' };
  }
}


/* ===================================================================== */
/* Helpers                                                               */
/* ===================================================================== */

function norm(s: string): string {
  return (s || '').toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function genJSON(ai: GoogleGenAI, model: string, prompt: string, schema: any): Promise<any> {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: 'application/json', responseSchema: schema },
  });
  return JSON.parse(response.text?.trim() || '{}');
}

/* ===================================================================== */
/* Format chooser ("Surprise me")                                        */
/* ===================================================================== */

function heuristicFormat(topic: string): ForgeFormat {
  const t = topic.toLowerCase();
  if (/(zip|connect|dots?|path|maze)/.test(t)) return 'zip';
  if (/(queen|crown|chess)/.test(t)) return 'queens';
  if (/(sudoku|number|math)/.test(t)) return 'sudoku';
  if (/(logic|grid|puzzle)/.test(t)) return pick<ForgeFormat>(['sudoku', 'zip', 'queens']);
  if (/(connection|group|categor)/.test(t)) return 'connections';
  // Topics that are sets of named entities with attributes → codex (Pokédle-style)
  if (/(pokemon|pokémon|character|hero|villain|player|club|team|driver|country|planet|element|dog|car|champion|marvel|dc|anime)/.test(t))
    return 'codex';
  return pick<ForgeFormat>(['wordgrid', 'codex', 'quiz', 'connections']);
}

export async function chooseFormat(
  ai: GoogleGenAI | null,
  model: string,
  topic: string,
): Promise<ForgeFormat> {
  if (!ai) return heuristicFormat(topic);
  try {
    const data = await genJSON(
      ai,
      model,
      `A user wants a daily-puzzle game about the topic: "${topic}".
Pick the single best game format for this topic:
- "codex": attribute-deduction guessing of named entities (best when the topic is a set of characters/things with comparable attributes, e.g. Pokémon, footballers, countries).
- "wordgrid": Wordle-style single hidden word (best for topics rich in nameable single words).
- "connections": sort 16 items into 4 hidden groups (best for topics with many related sub-categories).
- "quiz": creative trivia / odd-one-out / sequence (best for abstract or factual topics).
Return the chosen format and a one-line reason.`,
      {
        type: Type.OBJECT,
        properties: {
          format: { type: Type.STRING, description: 'one of: codex, wordgrid, connections, quiz' },
          reason: { type: Type.STRING },
        },
        required: ['format'],
      },
    );
    const f = (data.format || '').toLowerCase();
    if (['codex', 'wordgrid', 'connections', 'quiz'].includes(f)) return f as ForgeFormat;
  } catch (err) {
    console.error('[forge] chooseFormat error:', err);
  }
  return heuristicFormat(topic);
}

/* ===================================================================== */
/* CODEX — attribute deduction (Pokédle / LoLdle-style)                  */
/* ===================================================================== */

function validateCodex(data: any): boolean {
  if (!data || !Array.isArray(data.attributes) || !Array.isArray(data.entities)) return false;
  if (data.attributes.length < 3 || data.entities.length < 8) return false;
  const keys = data.attributes.map((a: any) => a.key);
  for (const e of data.entities) {
    if (!e.name || !e.attrs) return false;
    for (const k of keys) if (e.attrs[k] === undefined || e.attrs[k] === null) return false;
  }
  return data.entities.some((e: any) => norm(e.name) === norm(data.answer));
}

const CODEX_FALLBACK: GeneratedPuzzle['payload'] = {
  attributes: [
    { key: 'type', label: 'Type', type: 'text' },
    { key: 'color', label: 'Color', type: 'text' },
    { key: 'diameterRank', label: 'Size Rank', type: 'number' },
    { key: 'moons', label: 'Moons', type: 'number' },
    { key: 'rings', label: 'Has Rings', type: 'text' },
  ],
  entities: [
    { name: 'Mercury', attrs: { type: 'Terrestrial', color: 'Grey', diameterRank: 8, moons: 0, rings: 'No' } },
    { name: 'Venus', attrs: { type: 'Terrestrial', color: 'Yellow', diameterRank: 6, moons: 0, rings: 'No' } },
    { name: 'Earth', attrs: { type: 'Terrestrial', color: 'Blue', diameterRank: 5, moons: 1, rings: 'No' } },
    { name: 'Mars', attrs: { type: 'Terrestrial', color: 'Red', diameterRank: 7, moons: 2, rings: 'No' } },
    { name: 'Jupiter', attrs: { type: 'Gas Giant', color: 'Orange', diameterRank: 1, moons: 95, rings: 'Yes' } },
    { name: 'Saturn', attrs: { type: 'Gas Giant', color: 'Yellow', diameterRank: 2, moons: 146, rings: 'Yes' } },
    { name: 'Uranus', attrs: { type: 'Ice Giant', color: 'Cyan', diameterRank: 3, moons: 28, rings: 'Yes' } },
    { name: 'Neptune', attrs: { type: 'Ice Giant', color: 'Blue', diameterRank: 4, moons: 16, rings: 'Yes' } },
  ],
  answer: 'Saturn',
};

async function generateCodex(
  ai: GoogleGenAI | null,
  model: string,
  topic: string,
  difficulty: string,
): Promise<GeneratedPuzzle> {
  if (ai) {
    try {
      const data = await genJSON(
        ai,
        model,
        `Build an attribute-deduction guessing game (like Pokédle / LoLdle) about: "${topic}".
Difficulty: ${difficulty}. ${diffSpec(difficulty).tone}
Produce 16-20 entities from this topic, each with 5-6 comparable attributes.
Rules:
- Use a mix of text attributes (e.g. category, color, origin) and at least TWO NUMBER attributes (e.g. year, rank, count, height) so players get higher/lower hints.
- Every entity MUST have a value for EVERY attribute. Ground facts in reality.
- "answer" must be one of the entity names (pick an interesting one fitting the difficulty).
- attribute "type" must be "text" or "number".
Return strict JSON.`,
        {
          type: Type.OBJECT,
          properties: {
            attributes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  label: { type: Type.STRING },
                  type: { type: Type.STRING },
                },
                required: ['key', 'label', 'type'],
              },
            },
            entities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  // attrs delivered as parallel arrays to keep schema valid
                  keys: { type: Type.ARRAY, items: { type: Type.STRING } },
                  values: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['name', 'keys', 'values'],
              },
            },
            answer: { type: Type.STRING },
          },
          required: ['attributes', 'entities', 'answer'],
        },
      );
      // Rehydrate parallel key/value arrays into attrs objects, coercing numbers.
      const numericKeys = new Set(
        (data.attributes || []).filter((a: any) => a.type === 'number').map((a: any) => a.key),
      );
      const entities = (data.entities || []).map((e: any) => {
        const attrs: any = {};
        (e.keys || []).forEach((k: string, i: number) => {
          const raw = e.values?.[i];
          attrs[k] = numericKeys.has(k) ? Number(String(raw).replace(/[^0-9.\-]/g, '')) : raw;
        });
        return { name: e.name, attrs };
      });
      const rebuilt = { attributes: data.attributes, entities, answer: data.answer };
      if (validateCodex(rebuilt)) {
        return {
          format: 'codex',
          topic,
          difficulty,
          title: `${topic} Codex`,
          payload: rebuilt,
          source: 'gemini',
        };
      }
      console.warn('[forge] codex validation failed, using fallback');
    } catch (err) {
      console.error('[forge] codex generation error:', err);
    }
  }
  return { format: 'codex', topic, difficulty, title: 'Planet Codex', payload: CODEX_FALLBACK, source: 'fallback' };
}

function clientCodex(p: any) {
  return {
    attributes: p.attributes,
    entityNames: p.entities.map((e: any) => e.name),
  };
}

function checkCodex(p: any, guessName: string) {
  const guessed = p.entities.find((e: any) => norm(e.name) === norm(guessName));
  if (!guessed) return { valid: false, message: 'Not a known entity in this set.' };
  const answer = p.entities.find((e: any) => norm(e.name) === norm(p.answer));
  const comparison = p.attributes.map((attr: any) => {
    const gv = guessed.attrs[attr.key];
    const av = answer.attrs[attr.key];
    if (attr.type === 'number') {
      const g = Number(gv);
      const a = Number(av);
      return {
        key: attr.key,
        label: attr.label,
        value: gv,
        status: g === a ? 'match' : 'miss',
        direction: g === a ? 'equal' : g < a ? 'up' : 'down',
      };
    }
    // text or list-ish: support comma-separated multi-values for partial matches
    const gset = String(gv).split(/[,/]/).map(norm).filter(Boolean);
    const aset = String(av).split(/[,/]/).map(norm).filter(Boolean);
    const overlap = gset.filter((x) => aset.includes(x));
    let status: 'match' | 'partial' | 'miss' = 'miss';
    if (overlap.length === gset.length && gset.length === aset.length) status = 'match';
    else if (overlap.length > 0) status = 'partial';
    return { key: attr.key, label: attr.label, value: gv, status, direction: 'equal' };
  });
  const solved = norm(guessName) === norm(p.answer);
  return { valid: true, name: guessed.name, comparison, solved };
}

/* ===================================================================== */
/* WORDGRID — Wordle                                                     */
/* ===================================================================== */

function validateWordgrid(data: any): boolean {
  if (!data || typeof data.answer !== 'string') return false;
  const ans = data.answer.toUpperCase().replace(/[^A-Z]/g, '');
  if (ans.length < 4 || ans.length > 8) return false;
  data.answer = ans;
  data.length = ans.length;
  return true;
}

const WORDGRID_FALLBACK_WORDS = [
  { answer: 'PLANET', hint: 'Orbits a star.' },
  { answer: 'GALAXY', hint: 'A vast system of stars.' },
  { answer: 'COMET', hint: 'An icy body with a tail.' },
  { answer: 'NEBULA', hint: 'A cloud of gas and dust in space.' },
];

async function generateWordgrid(
  ai: GoogleGenAI | null,
  model: string,
  topic: string,
  difficulty: string,
): Promise<GeneratedPuzzle> {
  if (ai) {
    try {
      const data = await genJSON(
        ai,
        model,
        `Pick ONE interesting word strongly associated with the topic "${topic}" for a Wordle-style game.
Difficulty: ${difficulty}. ${difficulty === 'easy' ? 'Choose a common 4-5 letter word.' : difficulty === 'hard' ? 'Choose a less common, surprising 7-8 letter word.' : 'Choose a 5-6 letter word.'}
Rules: a single word, letters A-Z only (no spaces, no proper-noun punctuation).
Also give a short one-sentence cryptic hint that does NOT contain the word.
Return strict JSON: { "answer": "...", "hint": "..." }`,
        {
          type: Type.OBJECT,
          properties: { answer: { type: Type.STRING }, hint: { type: Type.STRING } },
          required: ['answer', 'hint'],
        },
      );
      if (validateWordgrid(data)) {
        return {
          format: 'wordgrid',
          topic,
          difficulty,
          title: `${topic} Wordle`,
          payload: { answer: data.answer, length: data.length, maxRows: 6, hint: data.hint },
          source: 'gemini',
        };
      }
      console.warn('[forge] wordgrid validation failed, using fallback');
    } catch (err) {
      console.error('[forge] wordgrid generation error:', err);
    }
  }
  const f = pick(WORDGRID_FALLBACK_WORDS);
  return {
    format: 'wordgrid',
    topic,
    difficulty,
    title: 'Cosmic Wordle',
    payload: { answer: f.answer, length: f.answer.length, maxRows: 6, hint: f.hint },
    source: 'fallback',
  };
}

function clientWordgrid(p: any) {
  return { length: p.length, maxRows: p.maxRows, hint: p.hint };
}

function checkWordgrid(p: any, guess: string) {
  const g = (guess || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (g.length !== p.length) return { valid: false, message: `Guess must be ${p.length} letters.` };
  const answer: string = p.answer;
  const result: { letter: string; status: 'correct' | 'present' | 'absent' }[] = [];
  const answerCounts: Record<string, number> = {};
  for (const ch of answer) answerCounts[ch] = (answerCounts[ch] || 0) + 1;
  // First pass: greens
  const status: ('correct' | 'present' | 'absent')[] = Array(g.length).fill('absent');
  for (let i = 0; i < g.length; i++) {
    if (g[i] === answer[i]) {
      status[i] = 'correct';
      answerCounts[g[i]]--;
    }
  }
  // Second pass: yellows
  for (let i = 0; i < g.length; i++) {
    if (status[i] === 'correct') continue;
    if (answerCounts[g[i]] > 0) {
      status[i] = 'present';
      answerCounts[g[i]]--;
    }
  }
  for (let i = 0; i < g.length; i++) result.push({ letter: g[i], status: status[i] });
  return { valid: true, result, solved: g === answer };
}

/* ===================================================================== */
/* CONNECTIONS — sort 16 into 4 groups                                   */
/* ===================================================================== */

function validateConnections(data: any): boolean {
  if (!data || !Array.isArray(data.groups) || data.groups.length !== 4) return false;
  const seen = new Set<string>();
  for (const grp of data.groups) {
    if (!grp.category || !Array.isArray(grp.members) || grp.members.length !== 4) return false;
    for (const m of grp.members) {
      const key = norm(m);
      if (!key || seen.has(key)) return false;
      seen.add(key);
    }
  }
  return seen.size === 16;
}

const CONNECTIONS_FALLBACK = {
  groups: [
    { category: 'Planets', members: ['Mars', 'Venus', 'Earth', 'Saturn'] },
    { category: 'Programming Languages', members: ['Python', 'Java', 'Ruby', 'Rust'] },
    { category: 'Citrus Fruits', members: ['Lemon', 'Lime', 'Orange', 'Pomelo'] },
    { category: 'Chess Pieces', members: ['King', 'Queen', 'Bishop', 'Knight'] },
  ],
};

async function generateConnections(
  ai: GoogleGenAI | null,
  model: string,
  topic: string,
  difficulty: string,
): Promise<GeneratedPuzzle> {
  if (ai) {
    try {
      const data = await genJSON(
        ai,
        model,
        `Create a "Connections" puzzle themed around "${topic}".
Difficulty: ${difficulty}. ${difficulty === 'easy' ? 'Categories should be clear and distinct.' : difficulty === 'hard' ? 'Use sneaky overlap traps where words plausibly fit multiple groups, with at least one wordplay category.' : 'Include a couple of overlap traps.'}
Produce EXACTLY 4 groups, each with a category name and EXACTLY 4 members.
All 16 members must be distinct single words/short phrases.
Return strict JSON: { "groups": [ { "category": "...", "members": ["..","..","..",".."] }, x4 ] }`,
        {
          type: Type.OBJECT,
          properties: {
            groups: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  members: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['category', 'members'],
              },
            },
          },
          required: ['groups'],
        },
      );
      if (validateConnections(data)) {
        return {
          format: 'connections',
          topic,
          difficulty,
          title: `${topic} Connections`,
          payload: data,
          source: 'gemini',
        };
      }
      console.warn('[forge] connections validation failed, using fallback');
    } catch (err) {
      console.error('[forge] connections generation error:', err);
    }
  }
  return {
    format: 'connections',
    topic,
    difficulty,
    title: 'Mixed Bag Connections',
    payload: CONNECTIONS_FALLBACK,
    source: 'fallback',
  };
}

function clientConnections(p: any) {
  const tiles = shuffle(p.groups.flatMap((g: any) => g.members));
  return { tiles, groupCount: p.groups.length, groupSize: 4 };
}

function checkConnections(p: any, selected: string[]) {
  if (!Array.isArray(selected) || selected.length !== 4)
    return { valid: false, message: 'Select exactly 4 tiles.' };
  const sel = selected.map(norm).sort();
  for (let i = 0; i < p.groups.length; i++) {
    const members = p.groups[i].members.map(norm).sort();
    if (members.every((m: string, idx: number) => m === sel[idx])) {
      return { valid: true, correct: true, groupIndex: i, category: p.groups[i].category, members: p.groups[i].members };
    }
  }
  // "one away" feedback
  let best = 0;
  for (const grp of p.groups) {
    const members = grp.members.map(norm);
    const overlap = sel.filter((s) => members.includes(s)).length;
    best = Math.max(best, overlap);
  }
  return { valid: true, correct: false, oneAway: best === 3 };
}

/* ===================================================================== */
/* QUIZ — the "AI goes wild" generic player                              */
/* ===================================================================== */

function validateQuiz(data: any): boolean {
  if (!data || !data.kind || !data.question || !data.answer) return false;
  const kinds = ['progressive', 'multiple_choice', 'odd_one_out', 'sequence'];
  if (!kinds.includes(data.kind)) return false;
  if ((data.kind === 'multiple_choice' || data.kind === 'odd_one_out')) {
    if (!Array.isArray(data.options) || data.options.length < 3) return false;
    if (!data.options.some((o: any) => norm(o) === norm(data.answer))) return false;
  }
  if (data.kind === 'progressive' && (!Array.isArray(data.clues) || data.clues.length < 2)) return false;
  return true;
}

const QUIZ_FALLBACK = {
  kind: 'progressive',
  title: 'Mystery Object',
  question: 'Guess the mystery thing from the clues.',
  clues: ['I am found in the night sky.', 'I am a ball of plasma.', 'I am the closest one to Earth.', 'I rise in the east.'],
  answer: 'The Sun',
  explanation: 'The Sun is the star at the center of our solar system.',
};

async function generateQuiz(
  ai: GoogleGenAI | null,
  model: string,
  topic: string,
  difficulty: string,
): Promise<GeneratedPuzzle> {
  if (ai) {
    try {
      const data = await genJSON(
        ai,
        model,
        `Invent a fun, original single-round puzzle about "${topic}" at ${difficulty} difficulty. Be creative — surprise the player.
Choose ONE "kind":
- "progressive": a hidden answer + 3-5 clues ordered vague→specific.
- "multiple_choice": a question + 4 options (one correct).
- "odd_one_out": a prompt + 4 options where exactly one does NOT belong (that one is the answer).
- "sequence": describe a sequence and ask for the next item (answer = next item).
Also invent a catchy short "title" for this mini-game.
Return strict JSON with: kind, title, question, clues (array, may be empty), options (array, may be empty), answer, explanation.`,
        {
          type: Type.OBJECT,
          properties: {
            kind: { type: Type.STRING },
            title: { type: Type.STRING },
            question: { type: Type.STRING },
            clues: { type: Type.ARRAY, items: { type: Type.STRING } },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            answer: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ['kind', 'title', 'question', 'answer'],
        },
      );
      if (validateQuiz(data)) {
        return {
          format: 'quiz',
          topic,
          difficulty,
          title: data.title || `${topic} Challenge`,
          payload: data,
          source: 'gemini',
        };
      }
      console.warn('[forge] quiz validation failed, using fallback');
    } catch (err) {
      console.error('[forge] quiz generation error:', err);
    }
  }
  return { format: 'quiz', topic, difficulty, title: QUIZ_FALLBACK.title, payload: QUIZ_FALLBACK, source: 'fallback' };
}

function clientQuiz(p: any) {
  return {
    kind: p.kind,
    title: p.title,
    question: p.question,
    clues: p.clues || [],
    options: p.options ? shuffle(p.options) : [],
  };
}

function checkQuiz(p: any, guess: string) {
  const g = norm(guess);
  const a = norm(p.answer);
  const solved = g === a || (g.length > 2 && (a.includes(g) || g.includes(a)));
  return { valid: true, solved, explanation: solved ? p.explanation || '' : '' };
}

/* ===================================================================== */
/* SUDOKU — deterministic                                                */
/* ===================================================================== */

function generateSudokuPuzzle(topic: string, difficulty: string): GeneratedPuzzle {
  const size = difficulty === 'easy' ? 6 : 9; // easy 6×6, medium & hard 9×9
  const s = generateSudoku((difficulty as any) || 'medium', size as 6 | 9);
  return { format: 'sudoku', topic, difficulty, title: `${size}×${size} Sudoku`, payload: s, source: 'solver' };
}

function clientSudoku(p: any) {
  return { size: p.size, boxRows: p.boxRows, boxCols: p.boxCols, givens: p.givens };
}

function checkSudokuPuzzle(p: any, attempt: number[][]) {
  return { valid: true, ...checkSudoku(attempt, p.solution) };
}

/* ===================================================================== */
/* ZIP & QUEENS — deterministic LinkedIn-style logic                     */
/* ===================================================================== */

function generateZipPuzzle(topic: string, difficulty: string): GeneratedPuzzle {
  const z = generateZip((difficulty as any) || 'medium');
  return { format: 'zip', topic, difficulty, title: `Zip ${z.rows}×${z.cols}`, payload: z, source: 'solver' };
}
function clientZip(p: any) {
  return { rows: p.rows, cols: p.cols, checkpoints: p.checkpoints };
}

function generateQueensPuzzle(topic: string, difficulty: string): GeneratedPuzzle {
  const q = generateQueens((difficulty as any) || 'medium');
  return { format: 'queens', topic, difficulty, title: `Queens ${q.n}×${q.n}`, payload: q, source: 'solver' };
}
function clientQueens(p: any) {
  return { n: p.n, regions: p.regions };
}

/* ===================================================================== */
/* Public API                                                            */
/* ===================================================================== */

export async function generatePuzzle(
  ai: GoogleGenAI | null,
  model: string,
  opts: { topic: string; format: ForgeFormat | 'surprise'; difficulty?: string },
): Promise<GeneratedPuzzle> {
  const topic = (opts.topic || 'general knowledge').trim();
  const difficulty = opts.difficulty || 'medium';
  let format = opts.format;
  if (format === 'surprise') format = await chooseFormat(ai, model, topic);

  switch (format) {
    case 'codex':
      return generateCodex(ai, model, topic, difficulty);
    case 'wordgrid':
      return generateWordgrid(ai, model, topic, difficulty);
    case 'connections':
      return generateConnections(ai, model, topic, difficulty);
    case 'sudoku':
      return generateSudokuPuzzle(topic, difficulty);
    case 'zip':
      return generateZipPuzzle(topic, difficulty);
    case 'queens':
      return generateQueensPuzzle(topic, difficulty);
    case 'quiz':
    default:
      return generateQuiz(ai, model, topic, difficulty);
  }
}

/** Strip the solution so the puzzle is safe to send to the browser. */
export function toClientPayload(format: ForgeFormat, payload: any): any {
  switch (format) {
    case 'codex':
      return clientCodex(payload);
    case 'wordgrid':
      return clientWordgrid(payload);
    case 'connections':
      return clientConnections(payload);
    case 'sudoku':
      return clientSudoku(payload);
    case 'zip':
      return clientZip(payload);
    case 'queens':
      return clientQueens(payload);
    case 'quiz':
      return clientQuiz(payload);
  }
}

/** Server-side check of a player's guess against the stored solution. */
export function checkGuess(format: ForgeFormat, payload: any, guess: any): any {
  switch (format) {
    case 'codex':
      return checkCodex(payload, guess);
    case 'wordgrid':
      return checkWordgrid(payload, guess);
    case 'connections':
      return checkConnections(payload, guess);
    case 'sudoku':
      return checkSudokuPuzzle(payload, guess);
    case 'zip':
      return checkZip(payload, guess);
    case 'queens':
      return checkQueens(payload, guess);
    case 'quiz':
      return checkQuiz(payload, guess);
  }
}
