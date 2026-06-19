"""
Seed script: populates the database with initial topics and pre-built
word guess puzzles so the app works immediately without Gemini API.

Usage:
    python -m app.seed
"""
import hashlib
from datetime import date

from app import create_app, db
from app.models import Topic, Puzzle, DailyAssignment


# Pre-built topics
SEED_TOPICS = [
    {"name": "Geography", "slug": "geography", "icon": "🌍", "engines": ["word-guess", "attribute-deduction"]},
    {"name": "Science", "slug": "science", "icon": "🔬", "engines": ["word-guess"]},
    {"name": "Movies", "slug": "movies", "icon": "🎬", "engines": ["word-guess", "attribute-deduction"]},
    {"name": "Sports", "slug": "sports", "icon": "⚽", "engines": ["word-guess"]},
    {"name": "Food & Cooking", "slug": "food", "icon": "🍳", "engines": ["word-guess"]},
    {"name": "Technology", "slug": "technology", "icon": "💻", "engines": ["word-guess"]},
    {"name": "Animals", "slug": "animals", "icon": "🐾", "engines": ["word-guess", "attribute-deduction"]},
    {"name": "Music", "slug": "music", "icon": "🎵", "engines": ["word-guess"]},
]

# Pre-built word sets per topic (validated 5-letter words)
SEED_WORDS = {
    "geography": [
        "atlas", "beach", "canal", "cliff", "coast", "coral", "creek",
        "delta", "earth", "field", "globe", "gorge", "haven", "hills",
        "inlet", "isle", "lake", "marsh", "mount", "north",
        "ocean", "oasis", "peaks", "plain", "range", "ridge", "river",
        "rocky", "route", "rural", "shore", "slope", "south", "stone",
        "swamp", "trail", "urban", "valley", "water", "world",
    ],
    "science": [
        "acids", "atoms", "basic", "beams", "bonds", "cells", "clone",
        "comet", "datum", "decay", "dense", "draft", "drive", "epoch",
        "fiber", "field", "fluid", "force", "forge", "fungi",
        "gauge", "genes", "glass", "grain", "graph", "helix", "image",
        "laser", "layer", "level", "light", "logic", "lunar", "metal",
        "model", "nerve", "noise", "orbit", "oxide", "ozone",
        "phase", "plant", "polar", "power", "probe", "pulse", "radar",
        "radio", "ratio", "react", "scale", "sigma", "solar", "solid",
        "solve", "space", "spark", "steam", "study", "tests",
        "toxic", "ultra", "unity", "valve", "vapor", "viral", "virus",
        "vital", "vivid", "waves", "yield",
    ],
    "movies": [
        "actor", "award", "brand", "chase", "click", "close", "comic",
        "crane", "crash", "crowd", "dance", "debut", "drama", "dream",
        "drive", "extra", "fairy", "feast", "fight", "flame",
        "flash", "flood", "forge", "frame", "ghost", "giant", "gleam",
        "globe", "glory", "grace", "grand", "heist", "humor", "image",
        "laugh", "light", "magic", "match", "media", "model",
        "money", "music", "night", "noble", "opera", "party", "pitch",
        "plant", "point", "power", "press", "pride", "prize", "proof",
        "queen", "realm", "reign", "rider", "rival", "robot", "rough",
        "royal", "saint", "scene", "scent", "score", "scout",
        "shade", "shark", "shock", "short", "sight", "skill", "skull",
        "snake", "sound", "space", "speed", "spell", "sport", "stage",
        "stain", "stand", "stark", "start", "steal", "steel", "stone",
        "storm", "story", "super", "surge", "sweet", "swept", "swift",
        "sword", "theme", "thief", "tower", "track", "trail", "train",
        "tribe", "trick", "troop", "truly", "trust", "truth", "twist",
        "ultra", "unite", "valor", "vault", "voice", "witch", "world",
        "wound", "wrath", "youth",
    ],
    "sports": [
        "arena", "badge", "balls", "bands", "bench", "blast", "block",
        "boost", "bound", "brave", "broad", "catch", "chase", "chief",
        "claim", "clash", "climb", "coach", "count", "court",
        "crash", "crowd", "crown", "cycle", "daily", "draft", "drill",
        "drive", "drops", "duals", "eagle", "eight", "elite", "event",
        "extra", "fault", "feast", "fence", "field", "fifty",
        "fight", "final", "first", "flame", "float", "force", "found",
        "frame", "front", "goals", "grace", "grand", "grasp", "grass",
        "grind", "gross", "group", "guard", "guest", "guide", "heart",
        "honor", "human", "image", "inner", "joint", "judge",
        "knock", "lance", "large", "later", "layer", "leads", "level",
        "light", "limit", "liner", "links", "lunar", "major", "maker",
        "manor", "march", "marsh", "match", "medal", "might", "minor",
        "model", "mount", "nerve", "novel", "outer", "owner",
        "party", "patch", "peace", "phase", "pitch", "place", "plain",
        "plane", "plant", "plate", "plaza", "point", "power", "press",
        "pride", "prime", "prize", "proof", "proud", "pulse", "queen",
        "quick", "quiet", "quota", "raise", "rally", "ranch",
        "range", "rapid", "reach", "react", "ready", "realm", "rider",
        "rifle", "right", "rigid", "rinse", "rival", "robin", "rocky",
        "rough", "round", "route", "royal", "rugby", "ruler", "rural",
        "saint", "scale", "scare", "scene", "scope", "score", "scout",
        "serve", "seven", "shade", "shaft", "shake", "shame",
        "shape", "share", "sharp", "sheet", "shift", "shine", "shirt",
        "shock", "shore", "short", "shown", "sight", "since", "sixth",
        "sixty", "skill", "slate", "slice", "slope", "smart", "smile",
        "smoke", "solar", "solve", "sound", "south", "space",
        "spark", "speak", "speed", "spell", "spend", "spent", "spike",
        "sport", "spray", "squad", "stack", "staff", "stage", "stain",
        "stake", "stall", "stamp", "stand", "start", "state",
        "steal", "steam", "steel", "steep", "stern", "stick", "still",
        "stock", "stone", "stood", "store", "storm", "story", "stout",
        "strap", "straw", "strip", "stuck", "study", "stuff", "style",
        "suite", "sunny", "super", "surge", "swarm", "swear",
        "sweep", "sweet", "swept", "swift", "swing", "swirl", "table",
        "taken", "teach", "teeth", "terms", "theme", "there", "thick",
        "thing", "think", "third", "those", "three", "threw", "throw",
        "thumb", "tidal", "tight", "timer", "title", "today",
        "token", "total", "touch", "tough", "tower", "trace", "track",
        "trade", "trail", "train", "trait", "trash", "trend", "trial",
        "trick", "tried", "troop", "truck", "truly", "trunk", "trust",
        "truth", "twice", "twist", "ultra", "under", "union", "unite",
        "unity", "until", "upper", "upset", "usage", "usual",
        "valid", "value", "vault", "verse", "vigor", "viral", "visit",
        "vital", "vivid", "vocal", "voice", "waste", "watch", "water",
        "weary", "weird", "whale", "wheat", "wheel", "where", "which",
        "while", "white", "whole", "whose", "wider", "woman",
        "world", "worry", "worse", "worst", "worth", "would", "wound",
        "write", "wrong", "wrote", "yield", "young", "youth",
    ],
    "food": [
        "apple", "bacon", "baker", "batch", "berry", "blend", "bread",
        "broil", "bunch", "candy", "chips", "cocoa", "cream", "crisp",
        "crush", "dairy", "diner", "dough", "drink", "feast",
        "fiber", "flame", "flask", "flour", "fluid", "fresh", "frost",
        "fruit", "fudge", "grain", "grape", "grasp", "grate", "gravy",
        "grind", "grill", "herbs", "honey", "juicy", "knife",
        "lemon", "lunch", "maple", "meals", "melon", "mince", "mints",
        "mixer", "mocha", "olive", "onion", "paste", "peach", "pearl",
        "pinch", "pizza", "plate", "plumb", "plume", "poach", "pound",
        "roast", "rolls", "salad", "sauce", "savor", "scone",
        "serve", "shelf", "slice", "smoke", "snack", "solid", "spice",
        "spoon", "steak", "steam", "stove", "sugar", "sweet", "syrup",
        "table", "taste", "toast", "treat", "wheat", "whisk", "yeast",
    ],
    "technology": [
        "admin", "alarm", "align", "array", "badge", "basic", "batch",
        "block", "board", "build", "bytes", "cache", "cable", "chain",
        "check", "class", "clean", "click", "clone", "close",
        "cloud", "coded", "crash", "cycle", "debug", "depot", "draft",
        "drive", "drone", "email", "entry", "error", "event", "fiber",
        "filed", "fixed", "flash", "float", "fluid", "focal", "focus",
        "force", "forge", "frame", "front", "games", "glass",
        "graph", "guard", "guide", "image", "index", "indie", "inner",
        "input", "inter", "issue", "label", "laser", "layer", "learn",
        "level", "lever", "light", "limit", "links", "linux", "local",
        "logic", "login", "macro", "media", "merge", "metal",
        "meter", "micro", "mixed", "model", "modem", "money", "motor",
        "mount", "mouse", "nerve", "nodes", "noise", "novel", "occur",
        "offer", "onset", "orbit", "order", "organ", "outer", "oxide",
        "panel", "parse", "patch", "phase", "phone", "photo",
        "pixel", "place", "plain", "plane", "plant", "point", "power",
        "press", "print", "prior", "probe", "proof", "proxy", "pulse",
        "query", "queue", "quick", "quiet", "quota", "radar", "radio",
        "range", "rapid", "ratio", "reach", "react", "ready",
        "realm", "refer", "relay", "reply", "reset", "rigid", "robot",
        "route", "scale", "scope", "scout", "sense", "serve", "setup",
        "seven", "share", "shell", "shift", "sigma", "skill", "slate",
        "sleep", "slide", "smart", "solar", "solid", "solve",
        "sound", "space", "spark", "speed", "stack", "staff", "stage",
        "stand", "start", "state", "steam", "steel", "stock", "stone",
        "store", "strip", "stuck", "study", "style", "suite", "super",
        "surge", "sweep", "swept", "swift", "swing", "table",
        "token", "total", "touch", "tower", "trace", "track", "trade",
        "trail", "train", "trait", "trend", "trial", "trick", "tried",
        "truck", "truly", "trust", "ultra", "under", "union", "unite",
        "unity", "until", "upper", "usage", "usual", "valid",
        "value", "vault", "vigor", "viral", "virus", "visit", "vital",
        "vivid", "vocal", "voice", "waste", "watch", "water", "weave",
        "wheel", "where", "which", "while", "white", "whole", "wider",
        "world", "worry", "worse", "worst", "worth", "would",
        "write", "wrong", "wrote", "yield", "young",
    ],
    "animals": [
        "bears", "beast", "birds", "breed", "camel", "catch", "chase",
        "climb", "crane", "eagle", "flock", "goats", "hawk", "horse",
        "hound", "ivory", "llama", "moose", "mouse", "otter",
        "panther", "pupil", "raven", "robin", "shark", "sheep", "shell",
        "snake", "stork", "swarm", "swift", "tiger", "trout", "whale",
        "zebra",
    ],
    "music": [
        "album", "audio", "bands", "beats", "blues", "brass", "chord",
        "dance", "drums", "flute", "forte", "genre", "haste", "ivory",
        "lyric", "major", "minor", "music", "notes", "opera",
        "organ", "piano", "pitch", "psalm", "pulse", "queen", "radio",
        "rally", "reign", "round", "scale", "scene", "sharp", "shift",
        "sigma", "slide", "smile", "smoke", "solid", "sound",
        "south", "space", "spark", "speed", "stage", "stand", "start",
        "steal", "steam", "steel", "stone", "store", "storm", "story",
        "strap", "straw", "strip", "stuck", "study", "stuff", "style",
        "suite", "surge", "sweep", "sweet", "swept", "swift",
        "swing", "theme", "tidal", "timer", "title", "token", "total",
        "touch", "tower", "track", "trade", "trail", "train", "trend",
        "trial", "trick", "truly", "trunk", "trust", "truth", "tuned",
        "twist", "ultra", "union", "unite", "unity", "until",
        "upper", "usage", "usual", "valid", "value", "vault", "verse",
        "vigor", "vinyl", "viral", "visit", "vital", "vivid", "vocal",
        "voice",
    ],
}

SEED_ATTRIBUTE_DEDUCTION = {
    "geography": {
        "attribute_keys": ["Continent", "Language", "Hemisphere", "Population"],
        "entities": {
            "Brazil": {"Continent": "South America", "Language": "Portuguese", "Hemisphere": "Southern", "Population": "Large"},
            "Japan": {"Continent": "Asia", "Language": "Japanese", "Hemisphere": "Northern", "Population": "Large"},
            "France": {"Continent": "Europe", "Language": "French", "Hemisphere": "Northern", "Population": "Medium"},
            "Canada": {"Continent": "North America", "Language": "English/French", "Hemisphere": "Northern", "Population": "Medium"},
            "Egypt": {"Continent": "Africa", "Language": "Arabic", "Hemisphere": "Northern", "Population": "Large"},
            "Australia": {"Continent": "Oceania", "Language": "English", "Hemisphere": "Southern", "Population": "Medium"},
            "Mexico": {"Continent": "North America", "Language": "Spanish", "Hemisphere": "Northern", "Population": "Large"},
            "Germany": {"Continent": "Europe", "Language": "German", "Hemisphere": "Northern", "Population": "Large"},
        }
    },
    "movies": {
        "attribute_keys": ["Genre", "Decade", "Director", "Lead Actor"],
        "entities": {
            "Inception": {"Genre": "Sci-Fi", "Decade": "2010s", "Director": "Christopher Nolan", "Lead Actor": "Leonardo DiCaprio"},
            "The Matrix": {"Genre": "Sci-Fi", "Decade": "1990s", "Director": "Wachowskis", "Lead Actor": "Keanu Reeves"},
            "Titanic": {"Genre": "Romance", "Decade": "1990s", "Director": "James Cameron", "Lead Actor": "Leonardo DiCaprio"},
            "Jurassic Park": {"Genre": "Sci-Fi", "Decade": "1990s", "Director": "Steven Spielberg", "Lead Actor": "Sam Neill"},
            "Avatar": {"Genre": "Sci-Fi", "Decade": "2000s", "Director": "James Cameron", "Lead Actor": "Sam Worthington"},
            "The Dark Knight": {"Genre": "Action", "Decade": "2000s", "Director": "Christopher Nolan", "Lead Actor": "Christian Bale"},
            "Pulp Fiction": {"Genre": "Crime", "Decade": "1990s", "Director": "Quentin Tarantino", "Lead Actor": "John Travolta"},
        }
    },
    "animals": {
        "attribute_keys": ["Class", "Diet", "Habitat", "Legs"],
        "entities": {
            "Lion": {"Class": "Mammal", "Diet": "Carnivore", "Habitat": "Savanna", "Legs": "4"},
            "Eagle": {"Class": "Bird", "Diet": "Carnivore", "Habitat": "Mountains", "Legs": "2"},
            "Shark": {"Class": "Fish", "Diet": "Carnivore", "Habitat": "Ocean", "Legs": "0"},
            "Elephant": {"Class": "Mammal", "Diet": "Herbivore", "Habitat": "Savanna", "Legs": "4"},
            "Frog": {"Class": "Amphibian", "Diet": "Carnivore", "Habitat": "Wetlands", "Legs": "4"},
            "Snake": {"Class": "Reptile", "Diet": "Carnivore", "Habitat": "Various", "Legs": "0"},
            "Penguin": {"Class": "Bird", "Diet": "Carnivore", "Habitat": "Antarctica", "Legs": "2"},
            "Gorilla": {"Class": "Mammal", "Diet": "Herbivore", "Habitat": "Jungle", "Legs": "2"},
        }
    }
}


def seed_database():
    """Populate the database with initial topics and puzzles."""
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()

        # Create topics
        for t in SEED_TOPICS:
            existing = Topic.query.filter_by(slug=t["slug"]).first()
            if existing:
                print(f"  Topic '{t['slug']}' already exists, skipping")
                continue

            topic = Topic(
                name=t["name"],
                slug=t["slug"],
                icon=t["icon"],
                engines=t["engines"],
            )
            db.session.add(topic)
            db.session.flush()

            # Create word-guess puzzles from seed words
            if "word-guess" in t["engines"]:
                words = SEED_WORDS.get(t["slug"], [])
                valid_words = [w for w in words if len(w) == 5 and w.isalpha()]
                created = 0
                for word in valid_words:
                    puzzle = Puzzle(
                        topic_id=topic.id,
                        engine="word-guess",
                        payload={
                            "word_length": 5,
                            "max_attempts": 6,
                            "accepted_words": [],  # Will use global dictionary
                        },
                        solution={"answer": word.upper()},
                        validation_status="valid",
                        source="seed",
                    )
                    db.session.add(puzzle)
                    created += 1

                print(f"  Created topic '{t['slug']}' with {created} word-guess puzzles")
            
            # Create attribute-deduction puzzles
            if "attribute-deduction" in t["engines"]:
                ad_data = SEED_ATTRIBUTE_DEDUCTION.get(t["slug"])
                if ad_data:
                    created = 0
                    for entity_name in ad_data["entities"].keys():
                        puzzle = Puzzle(
                            topic_id=topic.id,
                            engine="attribute-deduction",
                            payload={
                                "max_attempts": 8,
                                "attribute_keys": ad_data["attribute_keys"],
                                "entities": ad_data["entities"],
                            },
                            solution={"answer": entity_name},
                            validation_status="valid",
                            source="seed",
                        )
                        db.session.add(puzzle)
                        created += 1
                    
                    print(f"  Created topic '{t['slug']}' with {created} attribute-deduction puzzles")

        db.session.commit()

        # Create daily assignments for today
        today = date.today()
        topics = Topic.query.all()
        for topic in topics:
            for engine in (topic.engines or ["word-guess"]):
                existing = DailyAssignment.query.filter_by(
                    date=today, topic_id=topic.id, engine=engine,
                ).first()
                if existing:
                    continue

                candidates = Puzzle.query.filter_by(
                    topic_id=topic.id,
                    engine=engine,
                    validation_status="valid",
                    used_in_daily=False,
                ).all()

                if not candidates:
                    continue

                # Deterministic selection
                seed_str = f"{today.isoformat()}:{topic.slug}:{engine}"
                seed_hash = int(hashlib.sha256(seed_str.encode()).hexdigest(), 16)
                selected = candidates[seed_hash % len(candidates)]
                selected.used_in_daily = True

                assignment = DailyAssignment(
                    date=today,
                    topic_id=topic.id,
                    engine=engine,
                    puzzle_id=selected.id,
                )
                db.session.add(assignment)
                print(f"  Daily assigned: {topic.slug}/{engine} -> {selected.solution.get('answer', '?')}")

        db.session.commit()
        print("\nSeed complete!")


if __name__ == "__main__":
    seed_database()
