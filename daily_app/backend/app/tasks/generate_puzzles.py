"""
Background tasks for puzzle generation and daily assignment.

These tasks run in Celery workers, never on the request path.
They use Gemini for content generation and write validated puzzles to the DB pool.
"""
import hashlib
import logging
from datetime import date, timezone, datetime

from app.celery_app import celery_app
from app.config import Config

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.generate_puzzles.refill_pool_task")
def refill_pool_task(topic_id: str, engine: str):
    """
    Check if the puzzle pool for a (topic, engine) pair is below the
    low-water-mark, and if so, generate more puzzles via Gemini.
    """
    from app import create_app, db
    from app.models import Topic, Puzzle
    from app.services.gemini_client import GeminiClient
    from app.generators.word_guess import generate_word_list, create_word_guess_puzzles

    app = create_app()
    with app.app_context():
        topic = Topic.query.get(topic_id)
        if not topic:
            logger.error(f"Topic {topic_id} not found")
            return

        # Count available puzzles in pool
        pool_count = Puzzle.query.filter_by(
            topic_id=topic_id,
            engine=engine,
            validation_status="valid",
            used_in_infinite=False,
        ).count()

        low_water = Config.POOL_LOW_WATER_MARK
        if pool_count >= low_water:
            logger.info(
                f"Pool for {topic.slug}/{engine} has {pool_count} puzzles, "
                f"above low-water-mark ({low_water}). Skipping."
            )
            return

        needed = low_water - pool_count
        logger.info(
            f"Pool for {topic.slug}/{engine} has {pool_count} puzzles. "
            f"Generating {needed} more..."
        )

        if engine != "word-guess":
            logger.warning(f"Engine '{engine}' not yet supported for generation")
            return

        if not Config.GEMINI_API_KEY:
            logger.error("GEMINI_API_KEY not set, cannot generate puzzles")
            return

        client = GeminiClient(api_key=Config.GEMINI_API_KEY)
        words = generate_word_list(
            client=client,
            model=Config.GEMINI_GENERATION_MODEL,
            topic_name=topic.name,
            word_length=5,
            count=min(needed, Config.POOL_BATCH_SIZE),
        )

        if not words:
            logger.warning(f"No valid words generated for {topic.slug}")
            return

        # Check for duplicates already in pool
        existing_answers = {
            p.solution.get("answer", "").upper()
            for p in Puzzle.query.filter_by(
                topic_id=topic_id, engine=engine
            ).all()
        }

        puzzle_data = create_word_guess_puzzles(
            words=[w for w in words if w.upper() not in existing_answers],
            topic_slug=topic.slug,
            topic_name=topic.name,
        )

        created = 0
        for pd in puzzle_data:
            puzzle = Puzzle(
                topic_id=topic_id,
                engine=engine,
                payload=pd["payload"],
                solution=pd["solution"],
                validation_status="valid",  # Dictionary-filtered = valid
                source="gemini",
            )
            db.session.add(puzzle)
            created += 1

        db.session.commit()
        logger.info(f"Created {created} new puzzles for {topic.slug}/{engine}")


@celery_app.task(name="app.tasks.generate_puzzles.finalize_daily_task")
def finalize_daily_task():
    """
    Nightly job: select and freeze the daily puzzle for each
    (topic × engine) using a date-derived seed. This ensures every player
    in the world gets the same puzzle for the same date.
    """
    from app import create_app, db
    from app.models import Topic, Puzzle, DailyAssignment

    app = create_app()
    with app.app_context():
        today = date.today()
        topics = Topic.query.all()

        for topic in topics:
            for engine in (topic.engines or ["word-guess"]):
                # Check if already assigned
                existing = DailyAssignment.query.filter_by(
                    date=today, topic_id=topic.id, engine=engine,
                ).first()
                if existing:
                    continue

                # Get valid puzzles not yet used in daily
                candidates = Puzzle.query.filter_by(
                    topic_id=topic.id,
                    engine=engine,
                    validation_status="valid",
                    used_in_daily=False,
                ).all()

                if not candidates:
                    logger.warning(
                        f"No puzzle candidates for daily {topic.slug}/{engine} on {today}"
                    )
                    continue

                # Deterministic selection using date seed
                seed_str = f"{today.isoformat()}:{topic.slug}:{engine}"
                seed_hash = int(hashlib.sha256(seed_str.encode()).hexdigest(), 16)
                selected = candidates[seed_hash % len(candidates)]

                # Mark as used and create assignment
                selected.used_in_daily = True
                assignment = DailyAssignment(
                    date=today,
                    topic_id=topic.id,
                    engine=engine,
                    puzzle_id=selected.id,
                )
                db.session.add(assignment)
                logger.info(
                    f"Daily assigned: {topic.slug}/{engine} -> puzzle {selected.id}"
                )

        db.session.commit()
        logger.info(f"Daily assignments finalized for {today}")


@celery_app.task(name="app.tasks.generate_puzzles.refill_all_pools_task")
def refill_all_pools_task():
    """Trigger pool refill for all topic × engine combinations."""
    from app import create_app
    from app.models import Topic

    app = create_app()
    with app.app_context():
        topics = Topic.query.all()
        for topic in topics:
            for engine in (topic.engines or ["word-guess"]):
                refill_pool_task.delay(topic.id, engine)

    logger.info("Dispatched refill tasks for all pools")
