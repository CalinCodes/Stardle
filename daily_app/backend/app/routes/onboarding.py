from flask import Blueprint, request, jsonify

from app import db
from app.models import User, UserInterest, Topic

onboarding_bp = Blueprint("onboarding", __name__)


def _get_or_create_user(device_id: str) -> User:
    """Get existing user by device_id or create a new one."""
    user = User.query.filter_by(device_id=device_id).first()
    if user is None:
        user = User(device_id=device_id)
        db.session.add(user)
        db.session.flush()
    return user


@onboarding_bp.route("/onboarding/interests", methods=["POST"])
def submit_interests():
    """Save user topic selections from onboarding."""
    device_id = request.headers.get("X-Device-Id", "")
    if not device_id:
        return jsonify({"error": "Missing X-Device-Id header"}), 400

    data = request.get_json()
    topic_ids = data.get("topic_ids", [])
    if not topic_ids:
        return jsonify({"error": "No topics selected"}), 400

    user = _get_or_create_user(device_id)

    # Clear existing interests and set new ones
    UserInterest.query.filter_by(user_id=user.id).delete()

    for topic_slug in topic_ids:
        topic = Topic.query.filter_by(slug=topic_slug).first()
        if topic:
            interest = UserInterest(user_id=user.id, topic_id=topic.id)
            db.session.add(interest)

    db.session.commit()
    return jsonify({"status": "ok", "interests_count": len(topic_ids)}), 200
