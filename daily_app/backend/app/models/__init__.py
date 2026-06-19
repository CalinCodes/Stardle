import uuid
from datetime import datetime, timezone

from app import db


def gen_uuid():
    return str(uuid.uuid4())


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    device_id = db.Column(db.String(255), unique=True, nullable=False, index=True)
    display_name = db.Column(db.String(100), default="Player")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    interests = db.relationship("UserInterest", back_populates="user", cascade="all, delete-orphan")
    attempts = db.relationship("Attempt", back_populates="user", cascade="all, delete-orphan")


class UserInterest(db.Model):
    __tablename__ = "user_interests"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    topic_id = db.Column(db.String(36), db.ForeignKey("topics.id"), nullable=False)

    user = db.relationship("User", back_populates="interests")
    topic = db.relationship("Topic")

    __table_args__ = (db.UniqueConstraint("user_id", "topic_id"),)


class Topic(db.Model):
    __tablename__ = "topics"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False, index=True)
    icon = db.Column(db.String(10), default="🧩")
    engines = db.Column(db.JSON, default=list)  # List of supported engine slugs
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    puzzles = db.relationship("Puzzle", back_populates="topic", cascade="all, delete-orphan")


class Dataset(db.Model):
    __tablename__ = "datasets"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    topic_id = db.Column(db.String(36), db.ForeignKey("topics.id"), nullable=False)
    engine = db.Column(db.String(50), nullable=False)
    payload = db.Column(db.JSON, nullable=False)  # The actual dataset content
    version = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    topic = db.relationship("Topic")


class Puzzle(db.Model):
    __tablename__ = "puzzles"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    topic_id = db.Column(db.String(36), db.ForeignKey("topics.id"), nullable=False)
    engine = db.Column(db.String(50), nullable=False)
    payload = db.Column(db.JSON, nullable=False)   # Puzzle data (without solution for client)
    solution = db.Column(db.JSON, nullable=False)   # Solution data (server-side only)
    validation_status = db.Column(
        db.String(20), default="pending",
        nullable=False, index=True,
    )  # pending, valid, invalid
    source = db.Column(db.String(50), default="gemini")  # gemini, manual, solver
    used_in_daily = db.Column(db.Boolean, default=False, index=True)
    used_in_infinite = db.Column(db.Boolean, default=False, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    topic = db.relationship("Topic", back_populates="puzzles")
    attempts = db.relationship("Attempt", back_populates="puzzle", cascade="all, delete-orphan")

    __table_args__ = (db.Index("ix_puzzle_pool", "topic_id", "engine", "validation_status", "used_in_infinite"),)


class DailyAssignment(db.Model):
    __tablename__ = "daily_assignments"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    date = db.Column(db.Date, nullable=False)
    topic_id = db.Column(db.String(36), db.ForeignKey("topics.id"), nullable=False)
    engine = db.Column(db.String(50), nullable=False)
    puzzle_id = db.Column(db.String(36), db.ForeignKey("puzzles.id"), nullable=False)

    topic = db.relationship("Topic")
    puzzle = db.relationship("Puzzle")

    __table_args__ = (
        db.UniqueConstraint("date", "topic_id", "engine", name="uq_daily_assignment"),
    )


class Attempt(db.Model):
    __tablename__ = "attempts"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    puzzle_id = db.Column(db.String(36), db.ForeignKey("puzzles.id"), nullable=False)
    mode = db.Column(db.String(10), nullable=False)  # "daily" or "infinite"
    result = db.Column(db.String(10), nullable=False)  # "win" or "loss"
    score = db.Column(db.Integer, default=0)
    guesses = db.Column(db.JSON, default=list)  # List of guess words
    time_ms = db.Column(db.BigInteger, default=0)
    hints_used = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", back_populates="attempts")
    puzzle = db.relationship("Puzzle", back_populates="attempts")

    __table_args__ = (
        db.UniqueConstraint("user_id", "puzzle_id", "mode", name="uq_user_puzzle_attempt"),
    )
