from flask import Blueprint, jsonify

from app.models import Attempt, DailyAssignment, Topic

leaderboard_bp = Blueprint("leaderboard", __name__)


@leaderboard_bp.route("/leaderboard/<topic_slug>/<engine>/<date_str>", methods=["GET"])
def get_leaderboard(topic_slug: str, engine: str, date_str: str):
    """Return ranked leaderboard for a specific daily puzzle."""
    from datetime import date as date_type

    topic = Topic.query.filter_by(slug=topic_slug).first()
    if not topic:
        return jsonify({"error": "Topic not found"}), 404

    try:
        target_date = date_type.fromisoformat(date_str)
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    assignment = DailyAssignment.query.filter_by(
        date=target_date, topic_id=topic.id, engine=engine,
    ).first()
    if not assignment:
        return jsonify({"error": "No daily puzzle found for this date"}), 404

    attempts = (
        Attempt.query
        .filter_by(puzzle_id=assignment.puzzle_id, mode="daily")
        .order_by(Attempt.score.desc(), Attempt.time_ms.asc())
        .limit(100)
        .all()
    )

    entries = []
    for rank, attempt in enumerate(attempts, 1):
        entries.append({
            "rank": rank,
            "display_name": attempt.user.display_name if attempt.user else "Player",
            "score": attempt.score,
            "guesses": len(attempt.guesses) if attempt.guesses else 0,
            "time_ms": attempt.time_ms,
        })

    return jsonify(entries), 200
