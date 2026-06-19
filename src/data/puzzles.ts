import { GameType } from '../types';

export interface SemanticPreset {
  word: string;
  category: string;
  hints: string[];
}

export interface PromptPreset {
  id: string;
  targetConcept: string;
  imageUrl: string;
  category: string;
  clues: string[];
}

export interface ZeitgeistPreset {
  id: string;
  emojis: string[];
  answer: string;
  category: string;
  clues: string[];
}

export interface DetectivePreset {
  id: string;
  setup: string;
  secretSolution: string;
  clues: string[];
}

export interface RiddlePreset {
  id: string;
  riddleText: string;
  answer: string;
  theme: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// 1. Semantic Hot & Cold Words Pool
export const SEMANTIC_POOL: SemanticPreset[] = [
  {
    word: "Volcano",
    category: "Science & Nature",
    hints: [
      "It is related to geothermal activity and mountains.",
      "It can erupt with hot lava and ash clouds.",
      "Think of tectonic plates, fire, and magma under pressure."
    ]
  },
  {
    word: "Symphony",
    category: "Music & Art",
    hints: [
      "It is a complex piece of classical art composed for orchestras.",
      "It usually consists of four movements played by many string and brass instruments.",
      "Think of Beethoven, conductors, and harmony."
    ]
  },
  {
    word: "Constellation",
    category: "Cosmology & Space",
    hints: [
      "It is a group of stars forming a recognizable pattern.",
      "Ursa Major and Orion are famous examples.",
      "They are mapped across the night sky and named after mythological figures."
    ]
  },
  {
    word: "Breeze",
    category: "Science & Nature",
    hints: [
      "It refers to a gentle, cooling motion of air.",
      "It's stronger than a whisper but lighter than a gale.",
      "You feel it by the seaside or on a pleasant spring afternoon."
    ]
  },
  {
    word: "Gravity",
    category: "Science & Nature",
    hints: [
      "It is an invisible force pulling objects together.",
      "It keeps your feet on the ground and planets in orbit around stars.",
      "Famous for an apple falling on Isaac Newton's head."
    ]
  },
  {
    word: "Library",
    category: "Literature & Words",
    hints: [
      "A quiet sanctuary housing thousands of books.",
      "You can borrow publications, novels, and catalogs here with a special card.",
      "A place of silent learning, study desks, and paper scents."
    ]
  },
  {
    word: "Origami",
    category: "Hobbies & Culture",
    hints: [
      "A traditional Japanese art form using paper.",
      "It involves meticulous folds without cutting or gluing.",
      "Common patterns include paper cranes and frogs."
    ]
  },
  {
    word: "Navigation",
    category: "Science & Tech",
    hints: [
      "The process or activity of accurately determining one's position and planning a route.",
      "Used by ancient sailors reading stars and modern drivers checking GPS maps.",
      "Related to steering, maps, compasses, and destinations."
    ]
  }
];

// 2. Prompt Detective Preset Images and Concepts
export const PROMPT_POOL: PromptPreset[] = [
  {
    id: "prompt-1",
    targetConcept: "vintage astronaut eating spaghetti on a bicycle",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80", // beautiful vector abstract
    category: "Space & Food",
    clues: [
      "The main character travels to outer space.",
      "He is riding a retro two-wheeled vehicle.",
      "He is eating a popular Italian long pasta noodle."
    ]
  },
  {
    id: "prompt-2",
    targetConcept: "neon cybernetic tiger walking down a rainy Tokyo street at midnight",
    imageUrl: "https://images.unsplash.com/photo-1549490349-8643362247b5?w=800&auto=format&fit=crop&q=80",
    category: "Sci-Fi & Cyberpunk",
    clues: [
      "An exotic striped jungle cat is main subject, but she has neon robotic parts.",
      "The backdrop is a famous Japanese metropolis at night.",
      "Wet asphalt with glowing reflections from neon signs."
    ]
  },
  {
    id: "prompt-3",
    targetConcept: "watercolor red panda wearing a tiny knitted yellow beanie reading a thick book",
    imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80",
    category: "Cute & Whimsical",
    clues: [
      "The subject is an adorable copper-colored Asian forest animal.",
      "She has a small, warm knitted item on her head of golden-yellow shade.",
      "She's intensely focused on literature, turning a page."
    ]
  },
  {
    id: "prompt-4",
    targetConcept: "giant golden clockwork owl perched on an emerald mountain",
    imageUrl: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=800&auto=format&fit=crop&q=80",
    category: "Fantasy & Steampunk",
    clues: [
      "A huge metallic bird of wisdom with gears and winding springs.",
      "Standing proudly atop a vibrant mystical green stone range.",
      "Sunrays gleaming off mechanical feathers."
    ]
  }
];

// 3. Emoji Zeitgeist Topics
export const ZEITGEIST_POOL: ZeitgeistPreset[] = [
  {
    id: "zeitgeist-1",
    emojis: ["🍿", "🦖", "🤠", "🌋", "🗺️"],
    answer: "Jurassic Park",
    category: "Movies & Media",
    clues: ["An archaeological adventure turns chaotic.", "Involves dinosaurs escaping their boundaries.", "Directed by Steven Spielberg."]
  },
  {
    id: "zeitgeist-2",
    emojis: ["🚀", "🌕", "👨‍🚀", "🇺🇸", "📅"],
    answer: "Apollo 11 Moon Landing",
    category: "History & Landmarks",
    clues: ["A major step for mankind in 1969.", "Neil Armstrong and Buzz Aldrin walked here.", "Broadcasted live around the world."]
  },
  {
    id: "zeitgeist-3",
    emojis: ["📱", "🍏", "🕶️", "🥽", "🕶️"],
    answer: "Apple Vision Pro launch",
    category: "Science & Tech",
    clues: ["An expensive, premium mixed-reality headset.", "Introduced spatial computing concept.", "Features high-res passenger view screen."]
  },
  {
    id: "zeitgeist-4",
    emojis: ["🎸", "👩‍🎤", "🎤", "🎟️", "💰"],
    answer: "Taylor Swift Eras Tour",
    category: "Music & Pop Culture",
    clues: ["The highest-grossing concert tour of all time.", "Spans different eras of a solo pop artist.", "Sparked high demand and Ticketmaster controversies."]
  }
];

// 4. Daily Detective (5-Question Mysteries)
export const DETECTIVE_POOL: DetectivePreset[] = [
  {
    id: "detective-1",
    setup: "A man is found dead in a room with only a puddle of water and a locked door. No hanging cables, no poisons, no weapons present. How did he die?",
    secretSolution: "He stood on a block of ice to hang himself from a high fixture. The block of ice melted completely, leaving only a puddle of water beneath him.",
    clues: [
      "The water was originally in solid form.",
      "The room temperature played a crucial role over time.",
      "He used the water's solid state to reach an elevated height."
    ]
  },
  {
    id: "detective-2",
    setup: "A woman buys a brand new pair of shoes, wears them to work, and dies exactly three hours later. Why did she die?",
    secretSolution: "She works as a knife-thrower's assistant at a circus. Her new high-heeled shoes were slightly taller than her old ones, changing her height and causing the knife-thrower to miss his target.",
    clues: [
      "Her job is extremely dangerous and requires high precision.",
      "The physical thickness or height of the shoe soles was critical.",
      "She stands in front of sharp projectiles."
    ]
  },
  {
    id: "detective-3",
    setup: "An explorer enters a cave, strikes a match, and immediately dies in a sudden flash. What happened?",
    secretSolution: "The cave was filled with trapped flammable methane gas. Striking the match created a small spark that instantly ignited the entire cave, causing a fiery explosion.",
    clues: [
      "The air in the cave was filled with an invisible substance.",
      "A spark trigger caused the chemical reaction.",
      "The death was caused by a sudden blast."
    ]
  }
];

// 5. Calibration Riddles Pool (Customizable)
export const RIDDLE_POOL: RiddlePreset[] = [
  {
    id: "riddle-1",
    riddleText: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
    answer: "Echo",
    theme: "Science & Nature",
    difficulty: "medium"
  },
  {
    id: "riddle-2",
    riddleText: "The person who makes it has no need of it; the person who buys it does not use it. The person who uses it can neither see nor feel it. What is it?",
    answer: "Coffin",
    theme: "History & Culture",
    difficulty: "hard"
  },
  {
    id: "riddle-3",
    riddleText: "I have keys but open no locks. I have space but no room. You can enter but can't go outside. What am I?",
    answer: "Keyboard",
    theme: "Science & Tech",
    difficulty: "easy"
  },
  {
    id: "riddle-4",
    riddleText: "What ancient invention allows people to look straight through walls?",
    answer: "Window",
    theme: "History & Landmarks",
    difficulty: "easy"
  }
];

// Get seeded index for daily deterministic puzzles
export function getSeededIndex(dateString: string, poolLength: number): number {
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    hash = dateString.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % poolLength;
}
