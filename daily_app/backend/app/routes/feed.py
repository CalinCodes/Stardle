from flask import Blueprint, request, jsonify

from app import db
from app.models import User, UserInterest, Topic, Attempt, DailyAssignment
from datetime import date

feed_bp = Blueprint("feed", __name__)

ENGINE_DISPLAY_NAMES = {
    "word-guess": "Word Guess",
    "attribute-deduction": "Who's That?",
    "association": "Connections",
    "grid-logic": "Grid Logic",
    "word-ladder": "Word Ladder",
    "word-path": "Word Path",
    "trivia": "Trivia",
    "proximity": "Higher / Lower",
}


@feed_bp.route("/feed", methods=["GET"])
def get_feed():
    """Return personalized feed of available games for the user."""
    device_id = request.headers.get("X-Device-Id", "")

    user = User.query.filter_by(device_id=device_id).first() if device_id else None

    # If user has interests, filter by those; otherwise show all topics
    if user:
        interests = UserInterest.query.filter_by(user_id=user.id).all()
        topic_ids = [i.topic_id for i in interests]
        if topic_ids:
            topics = Topic.query.filter(Topic.id.in_(topic_ids)).all()
        else:
            topics = Topic.query.all()
    else:
        topics = Topic.query.all()

    today = date.today()
    feed_items = []

    for topic in topics:
        for engine in (topic.engines or ["word-guess"]):
            # Check if daily is completed
            daily_completed = False
            if user:
                assignment = DailyAssignment.query.filter_by(
                    date=today, topic_id=topic.id, engine=engine,
                ).first()
                if assignment:
                    attempt = Attempt.query.filter_by(
                        user_id=user.id,
                        puzzle_id=assignment.puzzle_id,
                        mode="daily",
                    ).first()
                    daily_completed = attempt is not None

            # Calculate streak
            current_streak = 0
            if user:
                # Simple streak: count consecutive daily wins
                daily_attempts = (
                    Attempt.query
                    .join(DailyAssignment, Attempt.puzzle_id == DailyAssignment.puzzle_id)
                    .filter(
                        Attempt.user_id == user.id,
                        Attempt.mode == "daily",
                        Attempt.result == "win",
                        DailyAssignment.topic_id == topic.id,
                        DailyAssignment.engine == engine,
                    )
                    .order_by(DailyAssignment.date.desc())
                    .all()
                )
                current_streak = len(daily_attempts)  # Simplified

            feed_items.append({
                "topic_slug": topic.slug,
                "topic_name": topic.name,
                "topic_icon": topic.icon,
                "engine": engine,
                "engine_display_name": ENGINE_DISPLAY_NAMES.get(engine, engine),
                "daily_completed": daily_completed,
                "current_streak": current_streak,
                "best_score": None,
            })

    return jsonify(feed_items), 200
