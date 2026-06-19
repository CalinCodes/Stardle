from flask import Blueprint, request, jsonify

from app import db
from app.models import User, Topic, Puzzle, Attempt
from app.services.scoring import calculate_score

infinite_bp = Blueprint("infinite", __name__)


@infinite_bp.route("/infinite/<topic_slug>/<engine>/next", methods=["GET"])
def get_next_infinite_puzzle(topic_slug: str, engine: str):
    """Return the next unplayed puzzle from the pool for infinite mode."""
    device_id = request.headers.get("X-Device-Id", "")

    topic = Topic.query.filter_by(slug=topic_slug).first()
    if not topic:
        return jsonify({"error": f"Topic '{topic_slug}' not found"}), 404

    # Find a valid puzzle not yet played by this user in infinite mode
    user = User.query.filter_by(device_id=device_id).first() if device_id else None

    query = Puzzle.query.filter_by(
        topic_id=topic.id,
        engine=engine,
        validation_status="valid",
    )

    if user:
        # Exclude puzzles already attempted in infinite mode
        played_ids = [
            a.puzzle_id for a in
            Attempt.query.filter_by(user_id=user.id, mode="infinite").all()
        ]
        if played_ids:
            query = query.filter(~Puzzle.id.in_(played_ids))

    puzzle = query.order_by(db.func.random()).first()

    if not puzzle:
        return jsonify({"error": "No more puzzles available. Check back later!"}), 404

    response_data = {
        "id": puzzle.id,
        "topic_slug": topic.slug,
        "topic_name": topic.name,
        "engine": engine,
        "word_length": puzzle.payload.get("word_length", 5),
        "max_attempts": puzzle.payload.get("max_attempts", 6),
        "date": None,
    }

    if engine == "attribute-deduction":
        response_data["attribute_keys"] = puzzle.payload.get("attribute_keys", [])
        response_data["entities"] = list(puzzle.payload.get("entities", {}).keys())

    return jsonify(response_data), 200


@infinite_bp.route("/infinite/<puzzle_id>/guess", methods=["POST"])
def submit_infinite_guess(puzzle_id: str):
    """Validate a single guess in infinite mode."""
    puzzle = Puzzle.query.get(puzzle_id)
    if not puzzle:
        return jsonify({"error": "Puzzle not found"}), 404

    data = request.get_json()
    guess = data.get("guess", "").upper()
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
            
            state = "absent"
            if guess_val.lower() == answer_val.lower():
                state = "correct"
            elif any(w in answer_val.lower() for w in guess_val.lower().split(", ") if w):
                state = "present"
                
            feedback.append({
                "attribute": key,
                "value": guess_val,
                "state": state
            })
            
        is_correct = (matched_entity.lower() == answer.lower())
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
        if len(guess) != len(answer):
            return jsonify({"valid": False, "message": f"Guess must be {len(answer)} letters"}), 400

        # Reuse the same feedback logic
        from app.routes.daily import _compute_feedback
        feedback = _compute_feedback(guess, answer)

        return jsonify({
            "valid": True,
            "feedback": feedback,
        }), 200


@infinite_bp.route("/infinite/<puzzle_id>/attempt", methods=["POST"])
def submit_infinite_attempt(puzzle_id: str):
    """Submit final attempt for an infinite puzzle (practice stats only)."""
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

    # Mark puzzle as used in infinite mode
    puzzle.used_in_infinite = True

    attempt = Attempt(
        user_id=user.id,
        puzzle_id=puzzle_id,
        mode="infinite",
        result="win" if won else "loss",
        score=score,
        guesses=guesses,
        time_ms=time_ms,
        hints_used=hints_used,
    )
    db.session.add(attempt)
    db.session.commit()

    return jsonify({
        "correct": won,
        "score": score,
        "rank": None,
        "total_players": None,
        "answer": puzzle.solution.get("answer", ""),
    }), 200
