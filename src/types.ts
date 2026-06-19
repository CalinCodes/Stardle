export enum GameType {
  SEMANTIC = 'semantic',
  PROMPT = 'prompt',
  ZEITGEIST = 'zeitgeist',
  DETECTIVE = 'detective',
  RIDDLE = 'riddle',
}

export interface UserProfile {
  username: string;
  interests: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  created_at: string;
  completedOnboarding: boolean;
}

export interface GameMetadata {
  id: GameType;
  title: string;
  subtitle: string;
  description: string;
  rules: string;
  needsGemini: string;
  emoji: string;
}

// Game 1: Semantic Synonym Guess state
export interface SemanticGuess {
  word: string;
  score: number; // 0 to 100%
  status: 'cold' | 'cool' | 'warm' | 'hot' | 'exact';
  clueFeedback?: string; // custom hint from Gemini
}

export interface SemanticGameData {
  guesses: SemanticGuess[];
  hintsUsed: number;
  completed: boolean;
  won: boolean;
}

// Game 2: Prompt Detective state
export interface PromptGuess {
  text: string;
  similarity: number; // 0 to 100%
  feedback: string; // Gemini's response on what was correct
}

export interface PromptGameData {
  imageUrl: string;
  targetConcept: string;
  guesses: PromptGuess[];
  completed: boolean;
  won: boolean;
}

// Game 3: Emoji Zeitgeist state
export interface ZeitgeistGuess {
  text: string;
  correct: boolean;
  feedback: string;
}

export interface ZeitgeistGameData {
  emojis: string[];
  theme: string;
  guesses: ZeitgeistGuess[];
  completed: boolean;
  won: boolean;
}

// Game 4: Daily Detective state
export interface DetectiveQuestion {
  question: string;
  answer: 'YES' | 'NO' | 'IRRELEVANT' | 'ERROR';
}

export interface DetectiveGameData {
  setup: string;
  questions: DetectiveQuestion[];
  isSolved: boolean;
  attemptsUsed: number;
  maxQuestions: number;
}

// Game 5: Calibration Riddle state
export interface RiddleGameData {
  riddleText: string;
  theme: string;
  difficulty: 'easy' | 'medium' | 'hard';
  clues: string[];
  guesses: string[];
  completed: boolean;
  won: boolean;
}

// Main daily puzzle payload bundle (no client-visible solutions)
export interface DailyPuzzlesBundle {
  date: string;
  [GameType.SEMANTIC]: {
    id: string;
    hintCount: number;
  };
  [GameType.PROMPT]: {
    id: string;
    imageUrl: string;
    descriptionCount: number;
  };
  [GameType.ZEITGEIST]: {
    id: string;
    emojis: string[];
    hintWords: string[];
  };
  [GameType.DETECTIVE]: {
    id: string;
    setup: string;
  };
  [GameType.RIDDLE]: {
    id: string;
    riddleText: string;
    theme: string;
    difficulty: string;
  };
}

// Statistics
export interface GameStats {
  played: number;
  won: number;
  streak: number;
  maxStreak: number;
  history: { [dateString: string]: boolean };
}

export interface GlobalLeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  timeTaken: string;
  guessesCount: number;
}
