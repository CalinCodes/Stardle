"""
Word Guess puzzle generator using Gemini for topical word lists.
Words are filtered against a dictionary and validated before entering the pool.
"""
import logging
from typing import Optional

from pydantic import BaseModel, Field

from app.services.gemini_client import GeminiClient

logger = logging.getLogger(__name__)

# Basic English word set for validation (5-letter words)
# In production, use a full dictionary file
COMMON_5_LETTER_WORDS = {
    "about", "above", "abuse", "actor", "acute", "admit", "adopt", "adult",
    "after", "again", "agent", "agree", "ahead", "alarm", "album", "alert",
    "alien", "align", "alike", "alive", "alley", "allow", "alone", "along",
    "alter", "among", "angel", "anger", "angle", "angry", "anime", "ankle",
    "apart", "apple", "apply", "arena", "argue", "arise", "array", "aside",
    "asset", "avoid", "award", "aware", "awful", "bacon", "badge", "badly",
    "baker", "balls", "bands", "banks", "basic", "basis", "batch", "beach",
    "beard", "beast", "began", "begin", "being", "bench", "berry", "bible",
    "bikes", "birds", "birth", "black", "blade", "blame", "bland", "blank",
    "blast", "blaze", "bleed", "blend", "bless", "blind", "block", "blood",
    "bloom", "blown", "blues", "board", "boats", "bonus", "books", "boost",
    "booth", "bound", "brain", "brand", "brave", "bread", "break", "breed",
    "brick", "bride", "brief", "bring", "broad", "broke", "brook", "brown",
    "brush", "buddy", "build", "built", "bunch", "burst", "buyer", "cabin",
    "cable", "camel", "cargo", "carry", "catch", "cause", "cease", "chain",
    "chair", "chaos", "charm", "chart", "chase", "cheap", "check", "cheek",
    "cheer", "chess", "chest", "chief", "child", "china", "chips", "chunk",
    "civic", "civil", "claim", "clash", "class", "clean", "clear", "clerk",
    "click", "cliff", "climb", "cling", "clock", "clone", "close", "cloth",
    "cloud", "coach", "coast", "cocoa", "colon", "color", "comet", "comic",
    "coral", "couch", "could", "count", "court", "cover", "crack", "craft",
    "crane", "crash", "crazy", "cream", "creek", "crest", "crime", "crisp",
    "cross", "crowd", "crown", "cruel", "crush", "curve", "cycle", "daily",
    "dance", "dealt", "death", "debug", "decay", "decor", "delay", "delta",
    "dense", "depot", "depth", "derby", "devil", "diary", "dirty", "disco",
    "ditch", "dizzy", "dodge", "doing", "donor", "donut", "doubt", "dough",
    "draft", "drain", "drake", "drama", "drank", "drawn", "dream", "dress",
    "dried", "drift", "drill", "drink", "drive", "drone", "drops", "drove",
    "drugs", "drunk", "dryer", "dusty", "dwarf", "dying", "eager", "eagle",
    "early", "earth", "eight", "elect", "elite", "email", "ember", "empty",
    "enemy", "enjoy", "enter", "entry", "equal", "error", "essay", "event",
    "every", "exact", "exams", "exist", "extra", "faint", "fairy", "faith",
    "false", "fancy", "fatal", "fault", "feast", "fence", "ferry", "fetch",
    "fever", "fiber", "field", "fifty", "fight", "filed", "final", "first",
    "fixed", "flame", "flash", "flask", "flesh", "flies", "float", "flood",
    "floor", "flour", "flown", "fluid", "flush", "flute", "focal", "focus",
    "force", "forge", "forth", "forum", "found", "frame", "frank", "fraud",
    "fresh", "front", "frost", "fruit", "fully", "funny", "gases", "gauge",
    "genre", "ghost", "giant", "given", "glass", "gleam", "globe", "gloom",
    "glory", "gloss", "glove", "going", "grace", "grade", "grain", "grand",
    "grant", "graph", "grasp", "grass", "grave", "great", "green", "greet",
    "grief", "grind", "groan", "gross", "group", "grove", "grown", "guard",
    "guess", "guest", "guide", "guild", "guilt", "guise", "human", "humor",
    "ideal", "image", "imply", "index", "indie", "inner", "input", "inter",
    "issue", "ivory", "joins", "joint", "joker", "judge", "juice", "juicy",
    "jumbo", "knock", "known", "label", "labor", "lance", "large", "laser",
    "later", "laugh", "layer", "learn", "lease", "leave", "legal", "lemon",
    "level", "lever", "light", "limit", "linen", "liner", "links", "lion",
    "liver", "lobby", "local", "logic", "login", "loose", "lover", "lower",
    "loyal", "lucky", "lunch", "lunar", "lying", "magic", "major", "maker",
    "manor", "maple", "march", "marry", "marsh", "match", "mayor", "meant",
    "media", "mercy", "merge", "merit", "metal", "meter", "might", "might",
    "minor", "minus", "mixed", "model", "money", "month", "moral", "motor",
    "mount", "mouse", "mouth", "moved", "movie", "music", "names", "nerve",
    "never", "night", "noble", "noise", "north", "noted", "novel", "nurse",
    "occur", "ocean", "offer", "often", "olive", "onset", "opera", "orbit",
    "order", "organ", "other", "ought", "outer", "owner", "oxide", "ozone",
    "paint", "panel", "panic", "paper", "party", "paste", "patch", "pause",
    "peace", "pearl", "penny", "phase", "phone", "photo", "piano", "piece",
    "pilot", "pinch", "pitch", "pixel", "pizza", "place", "plain", "plane",
    "plant", "plate", "plaza", "plead", "plumb", "plume", "plump", "plunge",
    "point", "poker", "polar", "porch", "posed", "power", "press", "price",
    "pride", "prime", "print", "prior", "prize", "probe", "proof", "proud",
    "prove", "psalm", "pulse", "pupil", "purse", "queen", "query", "quest",
    "queue", "quick", "quiet", "quota", "quote", "radar", "radio", "raise",
    "rally", "ranch", "range", "rapid", "ratio", "reach", "react", "ready",
    "realm", "rebel", "refer", "reign", "relax", "reply", "rider", "ridge",
    "rifle", "right", "rigid", "rinse", "risky", "rival", "river", "robin",
    "robot", "rocky", "rouge", "rough", "round", "route", "royal", "rugby",
    "ruler", "rural", "sadly", "saint", "salad", "sauce", "scale", "scare",
    "scene", "scent", "scope", "score", "scout", "scrap", "sense", "serve",
    "seven", "shade", "shaft", "shake", "shall", "shame", "shape", "share",
    "shark", "sharp", "sheep", "sheer", "sheet", "shelf", "shell", "shift",
    "shine", "shirt", "shock", "shore", "short", "shown", "sight", "sigma",
    "since", "sixth", "sixty", "sized", "skill", "skull", "slate", "slave",
    "sleep", "slice", "slide", "slope", "smart", "smell", "smile", "smoke",
    "snake", "solar", "solid", "solve", "sorry", "sound", "south", "space",
    "spare", "spark", "speak", "spear", "speed", "spell", "spend", "spent",
    "spice", "spine", "spoke", "spoon", "sport", "spray", "squad", "stack",
    "staff", "stage", "stain", "stake", "stale", "stall", "stamp", "stand",
    "stark", "start", "state", "stays", "steady", "steal", "steam", "steel",
    "steep", "steer", "stern", "stick", "stiff", "still", "stock", "stoic",
    "stone", "stood", "store", "storm", "story", "stout", "stove", "strap",
    "straw", "stray", "strip", "stuck", "study", "stuff", "style", "sugar",
    "suite", "sunny", "super", "surge", "swamp", "swarm", "swear", "sweep",
    "sweet", "swept", "swift", "swing", "swirl", "swore", "sworn", "syrup",
    "table", "taken", "taste", "teach", "teeth", "tempt", "terms", "their",
    "theme", "there", "thick", "thing", "think", "third", "those", "three",
    "threw", "throw", "thumb", "tidal", "tight", "timer", "tired", "title",
    "today", "token", "tombs", "total", "touch", "tough", "tower", "toxic",
    "trace", "track", "trade", "trail", "train", "trait", "trash", "treat",
    "trend", "trial", "tribe", "trick", "tried", "troop", "truck", "truly",
    "trump", "trunk", "trust", "truth", "tumor", "tuned", "twice", "twist",
    "ultra", "uncle", "under", "unfit", "union", "unite", "unity", "until",
    "upper", "upset", "urban", "usage", "usual", "utter", "valid", "value",
    "valve", "vault", "verse", "vigor", "viral", "virus", "visit", "vista",
    "vital", "vivid", "vocal", "voice", "voter", "wagon", "waste", "watch",
    "water", "weary", "weave", "wedge", "weird", "whale", "wheat", "wheel",
    "where", "which", "while", "white", "whole", "whose", "wider", "witch",
    "woman", "women", "world", "worry", "worse", "worst", "worth", "would",
    "wound", "wrath", "write", "wrong", "wrote", "yacht", "yield", "young",
    "youth", "zebra",
}


class WordListResponse(BaseModel):
    """Structured response from Gemini for word list generation."""
    words: list[str] = Field(description="List of 5-letter words related to the topic")
    topic_relevance: str = Field(description="Brief explanation of how words relate to the topic")


class GeneratedPuzzle(BaseModel):
    """A generated word guess puzzle ready for validation."""
    answer: str
    word_length: int
    topic_slug: str
    topic_name: str


def generate_word_list(
    client: GeminiClient,
    model: str,
    topic_name: str,
    word_length: int = 5,
    count: int = 50,
) -> list[str]:
    """
    Use Gemini to generate a topical word list, then filter against dictionary.

    Returns only valid dictionary words of the correct length.
    """
    prompt = f"""Generate exactly {count} English words that are related to the topic "{topic_name}".

Rules:
- Every word must be exactly {word_length} letters long
- Every word must be a common, well-known English word
- Words should be thematically connected to "{topic_name}"
- No proper nouns, abbreviations, or slang
- No duplicate words
- Prefer words that most English speakers would know

Return the words as a JSON list."""

    try:
        result = client.generate_structured(
            model=model,
            prompt=prompt,
            schema=WordListResponse,
            temperature=0.8,
        )
        raw_words = result.words
    except Exception as e:
        logger.error(f"Failed to generate word list for topic '{topic_name}': {e}")
        return []

    # Filter: correct length + in dictionary
    valid_words = []
    seen = set()
    for word in raw_words:
        w = word.strip().lower()
        if (
            len(w) == word_length
            and w.isalpha()
            and w in COMMON_5_LETTER_WORDS
            and w not in seen
        ):
            valid_words.append(w)
            seen.add(w)

    logger.info(
        f"Generated {len(raw_words)} words for '{topic_name}', "
        f"{len(valid_words)} passed dictionary filter"
    )
    return valid_words


def create_word_guess_puzzles(
    words: list[str],
    topic_slug: str,
    topic_name: str,
    word_length: int = 5,
    max_attempts: int = 6,
) -> list[dict]:
    """
    Create puzzle payloads from a validated word list.
    Each word becomes one puzzle in the pool.
    """
    puzzles = []
    for word in words:
        puzzles.append({
            "payload": {
                "word_length": word_length,
                "max_attempts": max_attempts,
                "accepted_words": list(COMMON_5_LETTER_WORDS),  # Full dictionary for validation
            },
            "solution": {
                "answer": word.upper(),
            },
        })
    return puzzles
