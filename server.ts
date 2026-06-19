import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import {
  SEMANTIC_POOL,
  PROMPT_POOL,
  ZEITGEIST_POOL,
  DETECTIVE_POOL,
  RIDDLE_POOL,
  NEGOTIATION_POOL,
  DIALECT_POOL,
  HALLUCINATION_POOL,
  MISSINGLINK_POOL,
  getSeededIndex
} from './src/data/puzzles.ts';
import {
  generatePuzzle,
  toClientPayload,
  checkGuess,
  ALL_FORMATS,
  type ForgeFormat
} from './src/engines/forge.ts';
import {
  savePuzzle,
  getPuzzle,
  listPuzzles,
  addScore,
  getLeaderboard
} from './src/data/store.ts';

// Load .env.local first (AI Studio convention), then fall back to .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
app.use(express.json());

// Never let a malformed request body crash the process — return 400 instead.
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  next(err);
});

const PORT = Number(process.env.PORT) || 3000;

// Single source of truth for the model id. Override with GEMINI_MODEL in env.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

// Simple unique id generator for generated puzzles.
let puzzleCounter = 0;
function newPuzzleId(format: string): string {
  puzzleCounter += 1;
  return `${format}-${Date.now().toString(36)}-${puzzleCounter}`;
}

// Lazy initialize Gemini client to avoid crashes if API Key is missing.
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY' && key.trim() !== '') {
      aiInstance = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      console.log("Successfully initialized Google GenAI client.");
    } else {
      console.log("No valid GEMINI_API_KEY found. Falling back to rule-based engine.");
    }
  }
  return aiInstance;
}

// Memory databases for session state & daily scoreboards
interface ScoreboardEntry {
  username: string;
  gameType: string;
  score: number;
  timeTaken: string;
  guessesCount: number;
  date: string;
}

const GLOBAL_LEADERBOARD: ScoreboardEntry[] = [
  { username: "SolarSurfer", gameType: "semantic", score: 98, timeTaken: "0m 45s", guessesCount: 3, date: new Date().toISOString().split('T')[0] },
  { username: "OrionCoder", gameType: "prompt", score: 95, timeTaken: "1m 12s", guessesCount: 2, date: new Date().toISOString().split('T')[0] },
  { username: "NebulaGhost", gameType: "zeitgeist", score: 100, timeTaken: "0m 19s", guessesCount: 1, date: new Date().toISOString().split('T')[0] },
  { username: "CosmicWhale", gameType: "detective", score: 88, timeTaken: "3m 40s", guessesCount: 4, date: new Date().toISOString().split('T')[0] },
  { username: "Supernova", gameType: "riddle", score: 90, timeTaken: "1m 02s", guessesCount: 2, date: new Date().toISOString().split('T')[0] }
];

// Helper to calculate basic string similarity when Gemini falls back
function getLevenshteinDistance(a: string, b: string): number {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

function getFuzzyConfidence(wordA: string, wordB: string): number {
  const a = wordA.toLowerCase().trim();
  const b = wordB.toLowerCase().trim();
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 80;
  
  const maxLength = Math.max(a.length, b.length);
  const distance = getLevenshteinDistance(a, b);
  const similarity = Math.max(0, 100 - (distance / maxLength) * 100);
  return Math.round(similarity);
}

/* ========================================================================= */
/* API ENDPOINTS                                                             */
/* ========================================================================= */

// 1. Get Game Config
app.get('/api/games/config', (req, res) => {
  res.json({
    appName: "Stardle",
    theme: "yellow",
    gamesCount: 5,
    isGeminiActive: getGeminiClient() !== null
  });
});

// 2. Fetch Daily Challenges
app.get('/api/games/daily', (req, res) => {
  const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
  
  // Choose daily index deterministically based on date seed
  const semanticIndex = getSeededIndex(dateStr + "semantic", SEMANTIC_POOL.length);
  const promptIndex = getSeededIndex(dateStr + "prompt", PROMPT_POOL.length);
  const zIndex = getSeededIndex(dateStr + "zeitgeist", ZEITGEIST_POOL.length);
  const dIndex = getSeededIndex(dateStr + "detective", DETECTIVE_POOL.length);
  const riddleIndex = getSeededIndex(dateStr + "riddle", RIDDLE_POOL.length);

  const semanticPreset = SEMANTIC_POOL[semanticIndex];
  const promptPreset = PROMPT_POOL[promptIndex];
  const zeitgeistPreset = ZEITGEIST_POOL[zIndex];
  const detectivePreset = DETECTIVE_POOL[dIndex];
  const riddlePreset = RIDDLE_POOL[riddleIndex];

  // Prepare safe response (omit exact answers for client security)
  res.json({
    date: dateStr,
    semantic: {
      category: semanticPreset.category,
      hintsCount: semanticPreset.hints.length,
      fallbackClues: semanticPreset.hints
    },
    prompt: {
      id: promptPreset.id,
      imageUrl: promptPreset.imageUrl,
      category: promptPreset.category,
      clues: promptPreset.clues
    },
    zeitgeist: {
      id: zeitgeistPreset.id,
      emojis: zeitgeistPreset.emojis,
      category: zeitgeistPreset.category,
      clues: zeitgeistPreset.clues
    },
    detective: {
      id: detectivePreset.id,
      setup: detectivePreset.setup,
      clues: detectivePreset.clues
    },
    riddle: {
      id: riddlePreset.id,
      riddleText: riddlePreset.riddleText,
      theme: riddlePreset.theme,
      difficulty: riddlePreset.difficulty
    }
  });
});

// 3. Game 1: Synonym Seekers - Semantic Guess
app.post('/api/games/semantic/guess', async (req, res) => {
  const { date, guess, isInfinite, activeIndex } = req.body;
  if (!guess) {
    return res.status(400).json({ error: "No guess word supplied" });
  }

  // Determine current active target
  let target = "Volcano";
  const dateStr = date || new Date().toISOString().split('T')[0];
  const storedSem = req.body.puzzleId ? getPuzzle(req.body.puzzleId) : null;
  if (storedSem) {
    target = storedSem.payload.word;
  } else if (isInfinite && typeof activeIndex === 'number') {
    target = SEMANTIC_POOL[activeIndex % SEMANTIC_POOL.length].word;
  } else {
    const sIndex = getSeededIndex(dateStr + "semantic", SEMANTIC_POOL.length);
    target = SEMANTIC_POOL[sIndex].word;
  }

  const ai = getGeminiClient();
  const normalGuess = guess.toLowerCase().trim();
  const normalTarget = target.toLowerCase().trim();

  // Instant Check
  if (normalGuess === normalTarget) {
    return res.json({
      word: guess,
      score: 100,
      status: 'exact',
      clueFeedback: `Spot on! You found the hidden word and matched "${target}" perfectly!`
    });
  }

  if (ai) {
    try {
      const prompt = `You are a real-time semantic comparison engine for the game Synonym Seekers.
The target secret word is "${target}".
The player has guessed "${guess}".
Calculate the semantic and conceptual similarity match of "${guess}" compared with the target "${target}" from 0% to 100%.
Strict Guidelines:
- If they are completely unrelated: 0-25% (status: "cold").
- If they share extremely broad concepts: 26-55% (status: "cool").
- If they are thematic or somewhat related: 56-85% (status: "warm").
- If they are strong synonyms, closely related, or matching types: 86-99% (status: "hot").
- Keep it responsive, fun, and witty. Explain the connection.`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER, description: "Percentage match from 0 to 100" },
              status: { type: Type.STRING, description: "One of: cold, cool, warm, hot, exact" },
              explanation: { type: Type.STRING, description: "A witty message explaining the word association" }
            },
            required: ["score", "status", "explanation"]
          }
        }
      });

      const data = JSON.parse(response.text?.trim() || "{}");
      return res.json({
        word: guess,
        score: typeof data.score === 'number' ? data.score : 50,
        status: data.status || 'cool',
        clueFeedback: data.explanation || "Interesting guess! Keep searching."
      });
    } catch (err: any) {
      console.error("Gemini synonym error:", err);
    }
  }

  // Fallback Rule System
  const score = getFuzzyConfidence(normalGuess, normalTarget);
  let status: 'cold' | 'cool' | 'warm' | 'hot' = 'cold';
  let message = "Far away! Keep search parameters open.";
  if (score > 85) {
    status = 'hot';
    message = "Incredibly hot match! You're extremely close in meaning!";
  } else if (score > 55) {
    status = 'warm';
    message = "Warm match! Broad associations are aligning!";
  } else if (score > 25) {
    status = 'cool';
    message = "Cool match. There is a tiny spark of relevance.";
  }

  res.json({
    word: guess,
    score,
    status,
    clueFeedback: message
  });
});

// 4. Game 2: AI Art Decipher - Prompt Detective Guess
app.post('/api/games/prompt/guess', async (req, res) => {
  const { date, guess, isInfinite, activeIndex } = req.body;
  
  let targetConcept = "vintage astronaut eating spaghetti on a bicycle";
  const dateStr = date || new Date().toISOString().split('T')[0];
  if (isInfinite && typeof activeIndex === 'number') {
    targetConcept = PROMPT_POOL[activeIndex % PROMPT_POOL.length].targetConcept;
  } else {
    const pIndex = getSeededIndex(dateStr + "prompt", PROMPT_POOL.length);
    targetConcept = PROMPT_POOL[pIndex].targetConcept;
  }

  const ai = getGeminiClient();
  const rawGuess = (guess || "").trim();

  if (ai) {
    try {
      const prompt = `You are a strict game validation master for Prompt Detective.
The original secret artist text prompt is: "${targetConcept}".
The player made a guess: "${rawGuess}".
Evaluate the conceptual accuracy and semantic match between the user's guess and the target on a scale of 0 to 100.
Rule:
- If they guess similar concepts, reward them generously (e.g. if prompt is 'spaghetti', give credit for 'pasta' or 'noodles'; if 'bicycle', give credit for 'cycle' / 'bike').
- Provide standard guidance feedback telling them what they got right and what was missing or incorrect.
- If similarity is 90% or greater, set completed: true.`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              similarity: { type: Type.INTEGER, description: "Confidence match percentage from 0 to 100" },
              feedback: { type: Type.STRING, description: "Encouraging explanation of what elements they correctly identified or missed" },
              completed: { type: Type.BOOLEAN, description: "True if guess is extremely close to the core elements" }
            },
            required: ["similarity", "feedback", "completed"]
          }
        }
      });

      const resObj = JSON.parse(response.text?.trim() || "{}");
      return res.json({
        text: guess,
        similarity: resObj.similarity || 50,
        feedback: resObj.feedback || "Interesting guess! Search for the key elements.",
        isCorrect: !!resObj.completed
      });
    } catch (err) {
      console.error("Gemini Prompt Detective error:", err);
    }
  }

  // Local fallback
  const confidence = getFuzzyConfidence(rawGuess, targetConcept);
  res.json({
    text: guess,
    similarity: confidence,
    feedback: confidence > 85 ? "You nailed the major aspects!" : "Good effort. Try describing different subjects or styles.",
    isCorrect: confidence > 85
  });
});

// 5. Game 3: Emoji Zeitgeist guess
app.post('/api/games/zeitgeist/guess', async (req, res) => {
  const { date, guess, isInfinite, activeIndex } = req.body;
  
  let targetAnswer = "Jurassic Park";
  const dateStr = date || new Date().toISOString().split('T')[0];
  const storedZ = req.body.puzzleId ? getPuzzle(req.body.puzzleId) : null;
  if (storedZ) {
    targetAnswer = storedZ.payload.answer;
  } else if (isInfinite && typeof activeIndex === 'number') {
    targetAnswer = ZEITGEIST_POOL[activeIndex % ZEITGEIST_POOL.length].answer;
  } else {
    const zIndex = getSeededIndex(dateStr + "zeitgeist", ZEITGEIST_POOL.length);
    targetAnswer = ZEITGEIST_POOL[zIndex].answer;
  }

  const ai = getGeminiClient();
  const cleanGuess = (guess || "").trim();

  if (ai) {
    try {
      const prompt = `You are validating the game Emoji Zeitgeist.
The correct pop culture topic or event answer is: "${targetAnswer}".
The user guessed: "${cleanGuess}".
Compare them for conceptual equivalent, allowing minor typos, abbreviations, or shorthand (e.g. "Apple vision" matches "Apple Vision Pro launch").
Provide friendly emoji responses.`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              correct: { type: Type.BOOLEAN, description: "True if the answer matches conceptually" },
              feedback: { type: Type.STRING, description: "Fun pop culture contextual feedback" }
            },
            required: ["correct", "feedback"]
          }
        }
      });

      const resObj = JSON.parse(response.text?.trim() || "{}");
      return res.json({
        text: guess,
        correct: !!resObj.correct,
        feedback: resObj.feedback || "Close, keep translating!"
      });
    } catch (err) {
      console.error("Zeitgeist error:", err);
    }
  }

  const match = getFuzzyConfidence(cleanGuess, targetAnswer) > 80;
  res.json({
    text: guess,
    correct: match,
    feedback: match ? "Correct! You parsed the trend perfectly!" : "Not quite! Try thinking of movies, tech, or big cultural milestones."
  });
});

// 6. Game 4: Daily Detective Yes/No questions
app.post('/api/games/detective/question', async (req, res) => {
  const { date, question, isInfinite, activeIndex } = req.body;
  
  let setup = "";
  let solution = "";
  const dateStr = date || new Date().toISOString().split('T')[0];
  const storedDet = req.body.puzzleId ? getPuzzle(req.body.puzzleId) : null;
  if (storedDet) {
    setup = storedDet.payload.setup;
    solution = storedDet.payload.solution;
  } else if (isInfinite && typeof activeIndex === 'number') {
    const preset = DETECTIVE_POOL[activeIndex % DETECTIVE_POOL.length];
    setup = preset.setup;
    solution = preset.secretSolution;
  } else {
    const dIndex = getSeededIndex(dateStr + "detective", DETECTIVE_POOL.length);
    const preset = DETECTIVE_POOL[dIndex];
    setup = preset.setup;
    solution = preset.secretSolution;
  }

  const ai = getGeminiClient();
  const rawQ = (question || "").trim();

  if (ai) {
    try {
      const prompt = `You are the strict Game Master for Daily Detective.
Mystery Setup: "${setup}"
Secret Internal Solution: "${solution}"
The player asks the following question: "${rawQ}"
Rule:
You may ONLY answer with one of: "YES", "NO", or "IRRELEVANT".
Choose "YES" if the question aligns with the truth in the solution.
Choose "NO" if it contradicts the truth.
Choose "IRRELEVANT" if it deals with details that don't help solve the central melting block of ice or circus Knife thrower puzzle variables.`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: { type: Type.STRING, description: "Must be exactly: YES, NO, or IRRELEVANT" },
              wittyRemark: { type: Type.STRING, description: "Short, mysterious 10-word maximum confirmation context" }
            },
            required: ["answer", "wittyRemark"]
          }
        }
      });

      const resObj = JSON.parse(response.text?.trim() || "{}");
      let ans = resObj.answer || 'IRRELEVANT';
      if (!['YES', 'NO', 'IRRELEVANT'].includes(ans.toUpperCase())) {
        ans = 'IRRELEVANT';
      }
      return res.json({
        question: rawQ,
        answer: ans.toUpperCase(),
        remark: resObj.wittyRemark || ""
      });
    } catch (err) {
      console.error("Detective GM error:", err);
    }
  }

  // Static response fallback if no Gemini client
  let ans: 'YES' | 'NO' | 'IRRELEVANT' = 'IRRELEVANT';
  const qLower = rawQ.toLowerCase();
  if (qLower.includes("water") || qLower.includes("ice") || qLower.includes("cold") || qLower.includes("melt") || qLower.includes("tall") || qLower.includes("height")) {
    ans = 'YES';
  } else if (qLower.includes("shoot") || qLower.includes("poison") || qLower.includes("ghost")) {
    ans = 'NO';
  }

  res.json({
    question: rawQ,
    answer: ans,
    remark: "The mechanical system acknowledges your curiosity."
  });
});

// 7. Game 4: Daily Detective Final Solve submission
app.post('/api/games/detective/solve', async (req, res) => {
  const { date, explanation, isInfinite, activeIndex } = req.body;
  
  let setup = "";
  let solution = "";
  const dateStr = date || new Date().toISOString().split('T')[0];
  const storedDet = req.body.puzzleId ? getPuzzle(req.body.puzzleId) : null;
  if (storedDet) {
    setup = storedDet.payload.setup;
    solution = storedDet.payload.solution;
  } else if (isInfinite && typeof activeIndex === 'number') {
    const preset = DETECTIVE_POOL[activeIndex % DETECTIVE_POOL.length];
    setup = preset.setup;
    solution = preset.secretSolution;
  } else {
    const dIndex = getSeededIndex(dateStr + "detective", DETECTIVE_POOL.length);
    const preset = DETECTIVE_POOL[dIndex];
    setup = preset.setup;
    solution = preset.secretSolution;
  }

  const ai = getGeminiClient();
  const explanationText = (explanation || "").trim();

  if (ai) {
    try {
      const prompt = `Translate the mystery solving attempt.
Mystery Setup: "${setup}"
True Secret Solution is: "${solution}"
User's submitted explanation: "${explanationText}"
Is the user's explanation conceptually correct? Do they recognize the core mechanics of the solution (e.g. melting ice, or heights of heels changing knife paths)?
Provide a friendly verdict with a beautiful explanation of the mystery.`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              solved: { type: Type.BOOLEAN, description: "True if they solved it correctly" },
              feedback: { type: Type.STRING, description: "A highly rewarding full explanation reveals what happened" }
            },
            required: ["solved", "feedback"]
          }
        }
      });

      const resObj = JSON.parse(response.text?.trim() || "{}");
      return res.json({
        solved: !!resObj.solved,
        feedback: resObj.feedback || "Check your deductions and try again."
      });
    } catch (err) {
      console.error("Detective solve evaluation error:", err);
    }
  }

  const parsedScore = getFuzzyConfidence(explanationText, solution);
  const correct = parsedScore > 50;
  res.json({
    solved: correct,
    feedback: correct
      ? `Terrific! You solved it. Indeed: ${solution}`
      : "Not quite the right explanation. Double check your yes/no logs!"
  });
});

// 8. Game 5: Riddle Evaluation
app.post('/api/games/riddle/solve', async (req, res) => {
  const { date, guess, isInfinite, activeIndex } = req.body;
  
  let targetAnswer = "Echo";
  const dateStr = date || new Date().toISOString().split('T')[0];
  if (isInfinite && typeof activeIndex === 'number') {
    targetAnswer = RIDDLE_POOL[activeIndex % RIDDLE_POOL.length].answer;
  } else {
    const rIndex = getSeededIndex(dateStr + "riddle", RIDDLE_POOL.length);
    targetAnswer = RIDDLE_POOL[rIndex].answer;
  }

  const ai = getGeminiClient();
  const cleanGuess = (guess || "").trim();

  if (ai) {
    try {
      const prompt = `You are evaluating a riddle solution.
Secret Answer is: "${targetAnswer}"
The player guessed: "${cleanGuess}"
Determine if this is correct, allowing synonyms or plural formats. Provide witty, poetic riddle feedback.`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              correct: { type: Type.BOOLEAN, description: "True if the riddle answer is correct" },
              feedback: { type: Type.STRING, description: "Poetic comment confirming or guiding" }
            },
            required: ["correct", "feedback"]
          }
        }
      });

      const resObj = JSON.parse(response.text?.trim() || "{}");
      return res.json({
        correct: !!resObj.correct,
        feedback: resObj.feedback || "Your answer echoes, but doesn't quite fit."
      });
    } catch (err) {
      console.error("Riddle solve error:", err);
    }
  }

  const matches = getFuzzyConfidence(cleanGuess, targetAnswer) > 80;
  res.json({
    correct: matches,
    feedback: matches
      ? `Magnificent! "${targetAnswer}" is the correct answer to the riddle.`
      : "The oracle is silent. Try another perspective."
  });
});

// 9. Game 5 Calibration Riddle: Live Adaptive Generation based on telemetry & onboarding
app.post('/api/games/riddle/generate', async (req, res) => {
  const { interests, difficulty, averageSecs } = req.body;
  
  const selectedInterests = interests && interests.length > 0 ? interests : ["Science", "Space"];
  const selectedDifficulty = difficulty || "medium";
  const speedStats = averageSecs || 25; // telemetry speeds in seconds

  const ai = getGeminiClient();
  let selectedTheme = selectedInterests[Math.floor(Math.random() * selectedInterests.length)];

  if (ai) {
    try {
      // Prompt customization taking telemetry "Average solves time" into account
      let diffInstruction = '';
      if (speedStats < 15) {
        diffInstruction = 'Since the user is an expert player solving games in under 15 seconds, make this exceptionally abstract, challenging, and intellectually deep.';
      } else {
        diffInstruction = `Make the riddle aligned with the requested difficulty of: ${selectedDifficulty}.`;
      }

      const prompt = `You are the master calibration sphinx of Stardle.
We need to generate a highly personalized riddle.
Theme context: "${selectedTheme}"
Your telemetry reports the player averages ${speedStats} seconds per solve.
${diffInstruction}
Generate a unique, elegant riddle with a simple single-word answer.`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riddleText: { type: Type.STRING, description: "The enigmatic riddle body" },
              answer: { type: Type.STRING, description: "Single-word correct answer" },
              theme: { type: Type.STRING, description: "Theme title used" },
              difficulty: { type: Type.STRING, description: "Engine estimated difficulty" }
            },
            required: ["riddleText", "answer", "theme", "difficulty"]
          }
        }
      });

      const resObj = JSON.parse(response.text?.trim() || "{}");
      
      // Keep it in ephemeral pool override so they can solve it
      // Let's modify RIDDLE_POOL index 0 for current session
      RIDDLE_POOL[0].riddleText = resObj.riddleText || RIDDLE_POOL[0].riddleText;
      RIDDLE_POOL[0].answer = resObj.answer || RIDDLE_POOL[0].answer;
      RIDDLE_POOL[0].theme = resObj.theme || RIDDLE_POOL[0].theme;

      return res.json({
        riddleText: resObj.riddleText,
        theme: resObj.theme,
        difficulty: resObj.difficulty,
        success: true
      });
    } catch (err) {
      console.error("Adaptive riddle generation error:", err);
    }
  }

  // Local fallback
  const randomPreset = RIDDLE_POOL[Math.floor(Math.random() * RIDDLE_POOL.length)];
  res.json({
    riddleText: randomPreset.riddleText,
    theme: randomPreset.theme,
    difficulty: randomPreset.difficulty,
    success: false
  });
});

// 10. Negotiation Game Endpoint
app.post('/api/games/negotiation/barter', async (req, res) => {
  const { pitch, isInfinite, activeIndex, history } = req.body;
  if (!pitch) return res.status(400).json({ error: "Missing pitch" });

  const ai = getGeminiClient();
  const preset = NEGOTIATION_POOL[isInfinite ? activeIndex % NEGOTIATION_POOL.length : getSeededIndex(new Date().toISOString().split('T')[0], NEGOTIATION_POOL.length)];
  // AI-generated merchants are passed in from the client; fall back to the pool.
  const merchant = req.body.merchant || preset.merchant;
  const item = req.body.item || preset.item;
  const startPrice = req.body.startingPrice || preset.startingPrice;

  // Determine current price based on history length if fallback
  let fallbackPrice = startPrice - (history.length * 50);

  if (!ai) {
    return res.json({
      reply: "Grumble grumble... fine. Take it or leave it.",
      newPrice: fallbackPrice - 100,
      dealAccepted: history.length >= 2,
      startingPrice: startPrice
    });
  }

  try {
    const chatHistoryText = history.map((m: any) => `${m.role === 'user' ? 'Buyer' : 'Merchant'}: ${m.text}`).join('\n');
    const prompt = `You are playing a role in a negotiation game.
Your Character: ${merchant}
Selling: ${item}
Initial Asking Price: ${startPrice} gold

Previous conversation:
${chatHistoryText}
Buyer just said: "${pitch}"

Evaluate if you should lower the price, hold firm, or accept the deal based on the buyer's logic, charm, or humor.
Respond in JSON format with:
- "reply": Your character's in-character response to the buyer.
- "newPrice": The new numerical asking price in gold (must be a number, can be the same, lower, or 0 if accepted).
- "dealAccepted": boolean (true if you agree to their terms and close the deal).`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            newPrice: { type: Type.INTEGER },
            dealAccepted: { type: Type.BOOLEAN }
          },
          required: ["reply", "newPrice", "dealAccepted"]
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    return res.json({
      reply: parsed.reply || "I don't know what to say to that.",
      newPrice: parsed.newPrice || fallbackPrice,
      dealAccepted: parsed.dealAccepted || false,
      startingPrice: startPrice
    });
  } catch (err) {
    console.error("Negotiation error:", err);
    res.json({ reply: "Comm distortion...", newPrice: fallbackPrice, dealAccepted: false, startingPrice: startPrice });
  }
});

// 11. Dialect Decoder Endpoints
app.post('/api/games/dialect/get', (req, res) => {
  const { isInfinite, activeIndex } = req.body;
  const preset = DIALECT_POOL[isInfinite ? activeIndex % DIALECT_POOL.length : getSeededIndex(new Date().toISOString().split('T')[0], DIALECT_POOL.length)];
  res.json({ style: preset.style, text: preset.fallbackText });
});

app.post('/api/games/dialect/guess', async (req, res) => {
  const { guess, isInfinite, activeIndex } = req.body;
  const ai = getGeminiClient();
  const preset = DIALECT_POOL[isInfinite ? activeIndex % DIALECT_POOL.length : getSeededIndex(new Date().toISOString().split('T')[0], DIALECT_POOL.length)];
  const storedDia = req.body.puzzleId ? getPuzzle(req.body.puzzleId) : null;
  const answer = storedDia ? storedDia.payload.answer : preset.answer;

  if (guess.toLowerCase() === answer.toLowerCase()) {
    return res.json({ correct: true, feedback: `Exact match! The answer was ${answer}.` });
  }

  if (!ai) {
    return res.json({ correct: false, feedback: "Incorrect. Try again." });
  }

  try {
    const prompt = `The target answer is "${answer}".
The user guessed "${guess}".
Did the user correctly identify or closely guess the target subject conceptually?
Provide a JSON response:
- "correct": true/false
- "feedback": A short hint or confirmation.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            correct: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING }
          },
          required: ["correct", "feedback"]
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.json({ correct: false, feedback: "Error evaluating." });
  }
});

// 12. Spot the Hallucination Endpoint
app.post('/api/games/hallucination/get', (req, res) => {
  const { isInfinite, activeIndex } = req.body;
  const preset = HALLUCINATION_POOL[isInfinite ? activeIndex % HALLUCINATION_POOL.length : getSeededIndex(new Date().toISOString().split('T')[0], HALLUCINATION_POOL.length)];
  res.json({ topic: preset.topic, facts: preset.facts, fakeIndex: preset.fakeIndex });
});

// 13. Missing Link Endpoints
app.post('/api/games/missinglink/get', (req, res) => {
  const { isInfinite, activeIndex } = req.body;
  const preset = MISSINGLINK_POOL[isInfinite ? activeIndex % MISSINGLINK_POOL.length : getSeededIndex(new Date().toISOString().split('T')[0], MISSINGLINK_POOL.length)];
  res.json({ wordA: preset.wordA, wordB: preset.wordB });
});

app.post('/api/games/missinglink/score', async (req, res) => {
  const { sentence, isInfinite, activeIndex } = req.body;
  const ai = getGeminiClient();
  const preset = MISSINGLINK_POOL[isInfinite ? activeIndex % MISSINGLINK_POOL.length : getSeededIndex(new Date().toISOString().split('T')[0], MISSINGLINK_POOL.length)];
  // AI-generated pairs are passed from the client; fall back to the pool.
  const wordA = req.body.wordA || preset.wordA;
  const wordB = req.body.wordB || preset.wordB;

  if (!sentence) return res.status(400).json({ error: "Missing sentence" });

  if (!ai) {
    const aLower = wordA.toLowerCase();
    const bLower = wordB.toLowerCase();
    const sentLower = sentence.toLowerCase();
    const hasBoth = sentLower.includes(aLower) && sentLower.includes(bLower);
    
    return res.json({
      score: hasBoth ? 75 : 0,
      explanation: hasBoth ? "Valid connection found (fallback evaluation). Both words are present." : "Your sentence does not contain both target words clearly."
    });
  }

  try {
    const prompt = `Game: The Missing Link. Let's act as a semantic referee.
Words to connect: "${wordA}" and "${wordB}".
User's sentence: "${sentence}"

Evaluate if the sentence:
1. Actually includes both concepts (or their direct variations).
2. Is a cohesive, logically sound sentence (not just gibberish connecting them).

Score the connection from 0 to 100 based on grammatical correctness, creativity, and logical flow.
A score >= 50 means PASS. < 50 means REJECT.

Return JSON:
- "score": numerical score (0-100)
- "explanation": a short snappy review of their sentence logic.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            explanation: { type: Type.STRING }
          },
          required: ["score", "explanation"]
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    res.json({ score: parsed.score || 0, explanation: parsed.explanation || "Error parsing." });
  } catch (err) {
    console.error(err);
    res.json({ score: 0, explanation: "Gemini referee is offline." });
  }
});

/* ========================================================================= */
/* CLASSIC GAMES: infinite AI-generated content (fresh every time)           */
/* ========================================================================= */

async function aiGen(prompt: string, schema: any): Promise<any | null> {
  const ai = getGeminiClient();
  if (!ai) return null;
  try {
    const r = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json', responseSchema: schema },
    });
    return JSON.parse(r.text?.trim() || '{}');
  } catch (e) {
    console.error('[classic] gen error:', e);
    return null;
  }
}

function storeClassic(type: string, payload: any): string {
  const id = newPuzzleId('classic-' + type);
  savePuzzle({
    id, format: 'classic:' + type, topic: type, difficulty: 'medium',
    title: type, payload, source: 'gemini', createdAt: new Date().toISOString(),
  });
  return id;
}

// Emoji (zeitgeist) — fresh emoji rebus
app.post('/api/games/zeitgeist/new', async (req, res) => {
  const data = await aiGen(
    `Invent a fresh "guess the thing from emojis" puzzle. Pick a well-known movie, song, place, historical event, brand or common idiom, then represent it with 4 to 6 emojis. Return JSON: { "emojis": [".."], "answer": "..", "category": "..", "clues": ["vague clue","medium clue","specific clue"] }. Keep it safe and broadly known.`,
    { type: Type.OBJECT, properties: {
      emojis: { type: Type.ARRAY, items: { type: Type.STRING } },
      answer: { type: Type.STRING }, category: { type: Type.STRING },
      clues: { type: Type.ARRAY, items: { type: Type.STRING } },
    }, required: ['emojis', 'answer', 'category', 'clues'] },
  );
  if (data && Array.isArray(data.emojis) && data.emojis.length >= 3 && data.answer) {
    const id = storeClassic('zeitgeist', data);
    return res.json({ id, emojis: data.emojis, category: data.category || 'Pop culture', clues: data.clues || [] });
  }
  const p = ZEITGEIST_POOL[getSeededIndex(Date.now().toString(), ZEITGEIST_POOL.length)];
  const id = storeClassic('zeitgeist', { emojis: p.emojis, answer: p.answer, category: p.category, clues: p.clues });
  res.json({ id, emojis: p.emojis, category: p.category, clues: p.clues });
});

// Associations (semantic) — fresh secret word
app.post('/api/games/semantic/new', async (req, res) => {
  const data = await aiGen(
    `Pick an interesting, guessable single secret word for a hot/cold word-association game, plus a category and 3 escalating hints that do NOT contain the word. Return JSON: { "word": "..", "category": "..", "hints": ["..","..",".."] }.`,
    { type: Type.OBJECT, properties: {
      word: { type: Type.STRING }, category: { type: Type.STRING },
      hints: { type: Type.ARRAY, items: { type: Type.STRING } },
    }, required: ['word', 'category', 'hints'] },
  );
  if (data && data.word) {
    const id = storeClassic('semantic', data);
    return res.json({ id, category: data.category || 'General', hints: data.hints || [] });
  }
  const p = SEMANTIC_POOL[getSeededIndex(Date.now().toString(), SEMANTIC_POOL.length)];
  const id = storeClassic('semantic', { word: p.word, category: p.category, hints: p.hints });
  res.json({ id, category: p.category, hints: p.hints });
});

// Disguise (dialect) — fresh stylized description
app.post('/api/games/dialect/new', async (req, res) => {
  const data = await aiGen(
    `Describe a common thing/person/activity in a wildly specific voice or style (e.g. medieval knight, noir detective, surfer, Shakespeare) WITHOUT naming it. Return JSON: { "style": "the voice used", "answer": "the thing being described", "text": "the stylized description" }.`,
    { type: Type.OBJECT, properties: { style: { type: Type.STRING }, answer: { type: Type.STRING }, text: { type: Type.STRING } }, required: ['style', 'answer', 'text'] },
  );
  if (data && data.answer && data.text) {
    const id = storeClassic('dialect', data);
    return res.json({ id, style: data.style || 'Mystery voice', text: data.text });
  }
  const p = DIALECT_POOL[getSeededIndex(Date.now().toString(), DIALECT_POOL.length)];
  const id = storeClassic('dialect', { style: p.style, answer: p.answer, text: p.fallbackText });
  res.json({ id, style: p.style, text: p.fallbackText });
});

// Mystery (detective) — fresh lateral-thinking puzzle
app.post('/api/games/detective/new', async (req, res) => {
  const data = await aiGen(
    `Invent a fresh lateral-thinking mystery (like "a man lies dead in a field next to an unopened package"). Return JSON: { "setup": "the puzzling scenario", "solution": "the full explanation", "clues": ["nudge 1","nudge 2","nudge 3"] }. Solvable by yes/no questions.`,
    { type: Type.OBJECT, properties: { setup: { type: Type.STRING }, solution: { type: Type.STRING }, clues: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['setup', 'solution', 'clues'] },
  );
  if (data && data.setup && data.solution) {
    const id = storeClassic('detective', data);
    return res.json({ id, setup: data.setup, clues: data.clues || [] });
  }
  const p = DETECTIVE_POOL[getSeededIndex(Date.now().toString(), DETECTIVE_POOL.length)];
  const id = storeClassic('detective', { setup: p.setup, solution: p.secretSolution, clues: p.clues });
  res.json({ id, setup: p.setup, clues: p.clues });
});

// Bargain (negotiation) — fresh merchant + item
app.post('/api/games/negotiation/new', async (req, res) => {
  const data = await aiGen(
    `Invent a colourful merchant and a quirky item they're selling for a haggling game, plus a starting price in gold (200-100000). Return JSON: { "merchant": "..", "item": "..", "startingPrice": number }.`,
    { type: Type.OBJECT, properties: { merchant: { type: Type.STRING }, item: { type: Type.STRING }, startingPrice: { type: Type.INTEGER } }, required: ['merchant', 'item', 'startingPrice'] },
  );
  if (data && data.merchant && data.item && data.startingPrice) {
    return res.json({ merchant: data.merchant, item: data.item, startingPrice: data.startingPrice });
  }
  const p = NEGOTIATION_POOL[getSeededIndex(Date.now().toString(), NEGOTIATION_POOL.length)];
  res.json({ merchant: p.merchant, item: p.item, startingPrice: p.startingPrice });
});

// Connect (missing link) — fresh unrelated pair
app.post('/api/games/missinglink/new', async (req, res) => {
  const data = await aiGen(
    `Give two random, genuinely unrelated things for a "connect these in one sentence" game (mix concrete and abstract). Return JSON: { "wordA": "..", "wordB": ".." }. Each 1-3 words, safe, not obviously related.`,
    { type: Type.OBJECT, properties: { wordA: { type: Type.STRING }, wordB: { type: Type.STRING } }, required: ['wordA', 'wordB'] },
  );
  if (data && data.wordA && data.wordB) return res.json({ wordA: data.wordA, wordB: data.wordB });
  const p = MISSINGLINK_POOL[getSeededIndex(Date.now().toString(), MISSINGLINK_POOL.length)];
  res.json({ wordA: p.wordA, wordB: p.wordB });
});

/* ========================================================================= */
/* FORGE: infinite, interest-driven, AI-generated games                      */
/* ========================================================================= */

// F1. Generate a brand-new puzzle from a free-text topic.
//     body: { topic, format ('codex'|'wordgrid'|'connections'|'sudoku'|'quiz'|'surprise'), difficulty }
app.post('/api/forge/generate', async (req, res) => {
  const { topic, format, difficulty } = req.body || {};
  if (!topic || !topic.toString().trim()) {
    return res.status(400).json({ error: "Missing topic" });
  }

  const requested = (format || 'surprise') as ForgeFormat | 'surprise';
  const validFormat =
    requested === 'surprise' || ALL_FORMATS.includes(requested as ForgeFormat)
      ? requested
      : 'surprise';

  try {
    const ai = getGeminiClient();
    const generated = await generatePuzzle(ai, GEMINI_MODEL, {
      topic: topic.toString().trim(),
      format: validFormat,
      difficulty: difficulty || 'medium',
    });

    const id = newPuzzleId(generated.format);
    savePuzzle({
      id,
      format: generated.format,
      topic: generated.topic,
      difficulty: generated.difficulty,
      title: generated.title,
      payload: generated.payload,
      source: generated.source,
      createdAt: new Date().toISOString(),
    });

    res.json({
      id,
      format: generated.format,
      topic: generated.topic,
      difficulty: generated.difficulty,
      title: generated.title,
      note: generated.note || '',
      source: generated.source,
      puzzle: toClientPayload(generated.format, generated.payload),
    });
  } catch (err) {
    console.error("[forge] generate error:", err);
    res.status(500).json({ error: "Generation failed" });
  }
});

// F2. Check a guess/attempt against a generated puzzle (solution stays server-side).
//     body: { puzzleId, guess }
async function isRealWord(word: string): Promise<boolean> {
  const w = (word || '').toLowerCase().replace(/[^a-z]/g, '');
  if (w.length < 2) return false;
  try {
    const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`);
    return r.ok; // 200 = a real dictionary word, 404 = not found
  } catch {
    return true; // if the dictionary is unreachable, don't block play
  }
}

app.post('/api/forge/check', async (req, res) => {
  const { puzzleId, guess } = req.body || {};
  const stored = getPuzzle(puzzleId);
  if (!stored) {
    return res.status(404).json({ error: "Puzzle not found (it may have expired). Generate a new one." });
  }
  try {
    // Word Grid: only accept guesses that are real dictionary words.
    if (stored.format === 'wordgrid') {
      const g = (guess || '').toUpperCase().replace(/[^A-Z]/g, '');
      if (g.length === stored.payload.length && g !== stored.payload.answer && !(await isRealWord(g))) {
        return res.json({ valid: false, message: 'Not a real word.' });
      }
    }
    const result = checkGuess(stored.format as ForgeFormat, stored.payload, guess);
    res.json(result);
  } catch (err) {
    console.error("[forge] check error:", err);
    res.status(500).json({ error: "Check failed" });
  }
});

// F3. Reveal the answer for a generated puzzle (used after a player gives up).
app.post('/api/forge/reveal', (req, res) => {
  const { puzzleId } = req.body || {};
  const stored = getPuzzle(puzzleId);
  if (!stored) return res.status(404).json({ error: "Puzzle not found" });
  const p = stored.payload;
  let answer: any = null;
  switch (stored.format) {
    case 'codex': answer = p.answer; break;
    case 'wordgrid': answer = p.answer; break;
    case 'quiz': answer = { answer: p.answer, explanation: p.explanation }; break;
    case 'connections': answer = p.groups; break;
    case 'sudoku': answer = p.solution; break;
    case 'zip': answer = p.solutionPath; break;
    case 'queens': answer = p.solution; break;
  }
  res.json({ answer });
});

// F4. Recently generated puzzles (community feed).
app.get('/api/forge/recent', (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) || '12', 10), 50);
  const items = listPuzzles(limit).map((p) => ({
    id: p.id,
    format: p.format,
    topic: p.topic,
    title: p.title,
    difficulty: p.difficulty,
    source: p.source,
    createdAt: p.createdAt,
  }));
  res.json(items);
});

// 14. Submit Score to Leaderboard (persisted to disk)
app.post('/api/games/leaderboard/submit', (req, res) => {
  const { username, gameType, score, timeTaken, guessesCount, date, topic } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Missing username" });
  }

  addScore({
    username,
    gameType,
    score: score || 0,
    timeTaken: timeTaken || "1m 30s",
    guessesCount: guessesCount || 1,
    date: date || new Date().toISOString().split('T')[0],
    topic
  });

  res.json({ success: true });
});

// 11. Fetch Leaderboard for specific category
app.get('/api/games/leaderboard', (req, res) => {
  const gameType = req.query.gameType as string;
  const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];

  const filtered = getLeaderboard({ date: dateStr, gameType: gameType || undefined });

  // Sort by score descending, guesses lower is better
  filtered.sort((a, b) => b.score - a.score || a.guessesCount - b.guessesCount);

  // Map to ranks
  const ranked = filtered.map((item, index) => ({
    rank: index + 1,
    username: item.username,
    score: item.score,
    timeTaken: item.timeTaken,
    guessesCount: item.guessesCount
  }));

  res.json(ranked);
});


// Start static server and mounting Vite appropriately
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Stardle Engine] Listening on http://0.0.0.0:${PORT}`);
  });
}

initializeServer();
