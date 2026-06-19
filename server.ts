import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import {
  SEMANTIC_POOL,
  PROMPT_POOL,
  ZEITGEIST_POOL,
  DETECTIVE_POOL,
  RIDDLE_POOL,
  getSeededIndex
} from './src/data/puzzles.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = 3000;

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
  if (isInfinite && typeof activeIndex === 'number') {
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
        model: 'gemini-3.5-flash',
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
        model: 'gemini-3.5-flash',
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
  if (isInfinite && typeof activeIndex === 'number') {
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
        model: 'gemini-3.5-flash',
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
  if (isInfinite && typeof activeIndex === 'number') {
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
        model: 'gemini-3.5-flash',
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
  if (isInfinite && typeof activeIndex === 'number') {
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
        model: 'gemini-3.5-flash',
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
        model: 'gemini-3.5-flash',
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
        model: 'gemini-3.5-flash',
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

// 10. Submit Score to Leaderboard
app.post('/api/games/leaderboard/submit', (req, res) => {
  const { username, gameType, score, timeTaken, guessesCount, date } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Missing username" });
  }

  const payload: ScoreboardEntry = {
    username,
    gameType,
    score: score || 0,
    timeTaken: timeTaken || "1m 30s",
    guessesCount: guessesCount || 1,
    date: date || new Date().toISOString().split('T')[0]
  };

  GLOBAL_LEADERBOARD.unshift(payload);
  res.json({ success: true, leaderboard: GLOBAL_LEADERBOARD.slice(0, 100) });
});

// 11. Fetch Leaderboard for specific category
app.get('/api/games/leaderboard', (req, res) => {
  const gameType = req.query.gameType as string;
  const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];

  let filtered = GLOBAL_LEADERBOARD.filter(item => item.date === dateStr);
  if (gameType) {
    filtered = filtered.filter(item => item.gameType === gameType);
  }

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
