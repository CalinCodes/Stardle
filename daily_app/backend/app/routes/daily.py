from datetime import date

from flask import Blueprint, request, jsonify

from app import db
from app.models import User, Topic, Puzzle, DailyAssignment, Attempt
from app.services.scoring import calculate_score

daily_bp = Blueprint("daily", __name__)


@daily_bp.route("/daily/<topic_slug>/<engine>", methods=["GET"])
def get_daily_puzzle(topic_slug: str, engine: str):
    """Return today's frozen daily puzzle for a given topic and engine."""
    topic = Topic.query.filter_by(slug=topic_slug).first()
    if not topic:
        return jsonify({"error": f"Topic '{topic_slug}' not found"}), 404

    today = date.today()
    assignment = DailyAssignment.query.filter_by(
        date=today, topic_id=topic.id, engine=engine,
    ).first()

    if not assignment:
        return jsonify({"error": "No daily puzzle available for today"}), 404

    puzzle = assignment.puzzle

    response_data = {
        "id": puzzle.id,
        "topic_slug": topic.slug,
        "topic_name": topic.name,
        "engine": engine,
        "word_length": puzzle.payload.get("word_length", 5),
        "max_attempts": puzzle.payload.get("max_attempts", 6),
        "date": today.isoformat(),
    }

    if engine == "attribute-deduction":
        response_data["attribute_keys"] = puzzle.payload.get("attribute_keys", [])
        response_data["entities"] = list(puzzle.payload.get("entities", {}).keys())

    return jsonify(response_data), 200


@daily_bp.route("/daily/<puzzle_id>/guess", methods=["POST"])
def submit_daily_guess(puzzle_id: str):
    """Validate a single guess against the daily puzzle and return feedback."""
    puzzle = Puzzle.query.get(puzzle_id)
    if not puzzle:
        return jsonify({"error": "Puzzle not found"}), 404

    data = request.get_json()
    guess = data.get("guess", "").upper()

    if not guess:
        return jsonify({"valid": False, "message": "No guess provided"}), 400

    answer = puzzle.solution.get("answer", "").upper()

    if puzzle.engine == "attribute-deduction":
        entities = puzzle.payload.get("entities", {})
        
        # Standardize casing for lookup
        guess_lower = guess.lower()
        matched_entity = next((k for k in entities.keys() if k.lower() == guess_lower), None)
        
        if not matched_entity:
            return jsonify({"valid": False, "message": "Unknown entity"}), 200
            
        answer_key = next((k for k in entities.keys() if k.lower() == answer.lower()), None)
        if not answer_key:
            return jsonify({"error": "Answer not found in entities"}), 500
            
        guess_attrs = entities[matched_entity]
        answer_attrs = entities[answer_key]
        attribute_keys = puzzle.payload.get("attribute_keys", [])
        
        feedback = []
        for key in attribute_keys:
            guess_val = str(guess_attrs.get(key, ""))
            answer_val = str(answer_attrs.get(key, ""))
            
            # Simple exact match vs partial logic. 
            # In a real game, you might split by commas and check overlaps.
            state = "absent"
            if guess_val.lower() == answer_val.lower():
                state = "correct"
            elif any(w in answer_val.lower() for w in guess_val.lower().split(", ") if w):
                # Basic partial match (e.g. sharing one genre)
                state = "present"
                
            feedback.append({
                "attribute": key,
                "value": guess_val,
                "state": state
            })
            
        # Is the guess the exact answer entity?
        is_correct = (matched_entity.lower() == answer.lower())
        # We append a special feedback item for the entity name itself so the client can show it
        feedback.insert(0, {
            "attribute": "Name",
            "value": matched_entity,
            "state": "correct" if is_correct else "absent"
        })
        
        return jsonify({
            "valid": True,
            "feedback": feedback,
        }), 200

    else:
        # Default Word Guess logic
        if len(guess) != len(answer):
            return jsonify({"valid": False, "message": f"Guess must be {len(answer)} letters"}), 400

        # Validate against accepted words list if available
        accepted_words = puzzle.payload.get("accepted_words", [])
        if accepted_words and guess.lower() not in [w.lower() for w in accepted_words]:
            return jsonify({"valid": False, "message": "Not a valid word"}), 200

        # Compute per-letter feedback
        feedback = _compute_feedback(guess, answer)

        return jsonify({
            "valid": True,
            "feedback": feedback,
        }), 200


@daily_bp.route("/daily/<puzzle_id>/attempt", methods=["POST"])
def submit_daily_attempt(puzzle_id: str):
    """Submit final attempt for a daily puzzle."""
    device_id = request.headers.get("X-Device-Id", "")
    if not device_id:
        return jsonify({"error": "Missing X-Device-Id"}), 400

    user = User.query.filter_by(device_id=device_id).first()
    if not user:
        user = User(device_id=device_id)
        db.session.add(user)
        db.session.flush()

    puzzle = Puzzle.query.get(puzzle_id)
    if not puzzle:
        return jsonify({"error": "Puzzle not found"}), 404

    # Check if already attempted
    existing = Attempt.query.filter_by(
        user_id=user.id, puzzle_id=puzzle_id, mode="daily",
    ).first()
    if existing:
        return jsonify({
            "correct": existing.result == "win",
            "score": existing.score,
            "answer": puzzle.solution.get("answer", ""),
        }), 200

    data = request.get_json()
    won = data.get("won", False)
    guesses = data.get("guesses", [])
    time_ms = data.get("time_ms", 0)
    hints_used = data.get("hints_used", 0)

    score = calculate_score(
        won=won,
        num_guesses=len(guesses),
        max_attempts=puzzle.payload.get("max_attempts", 6),
        time_ms=time_ms,
        hints_used=hints_used,
    )

    attempt = Attempt(
        user_id=user.id,
        puzzle_id=puzzle_id,
        mode="daily",
        result="win" if won else "loss",
        score=score,
        guesses=guesses,
        time_ms=time_ms,
        hints_used=hints_used,
    )
    db.session.add(attempt)
    db.session.commit()

    # Calculate rank
    all_attempts = (
        Attempt.query
        .filter_by(puzzle_id=puzzle_id, mode="daily")
        .order_by(Attempt.score.desc())
        .all()
    )
    rank = next(
        (i + 1 for i, a in enumerate(all_attempts) if a.id == attempt.id),
        len(all_attempts),
    )

    return jsonify({
        "correct": won,
        "score": score,
        "rank": rank,
        "total_players": len(all_attempts),
        "answer": puzzle.solution.get("answer", ""),
    }), 200


def _compute_feedback(guess: str, answer: str) -> list[dict]:
    """
    Wordle-style feedback: CORRECT > PRESENT > ABSENT.
    Handles duplicate letters correctly.
    """
    n = len(answer)
    feedback = [{"letter": guess[i], "state": "absent"} for i in range(n)]
    answer_chars = list(answer)
    used = [False] * n

    # Pass 1: Mark correct positions
    for i in range(n):
        if guess[i] == answer[i]:
            feedback[i]["state"] = "correct"
            used[i] = True
            answer_chars[i] = None  # type: ignore

    # Pass 2: Mark present (wrong position)
    for i in range(n):
        if feedback[i]["state"] == "correct":
            continue
        for j in range(n):
            if not used[j] and answer_chars[j] == guess[i]:
                feedback[i]["state"] = "present"
                used[j] = True
                answer_chars[j] = None  # type: ignore
                break

    return feedback
