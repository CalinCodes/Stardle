"""
Celery application configuration.
Workers run separately from the Flask API server.
"""
from celery import Celery
from celery.schedules import crontab

from app.config import Config


def make_celery(app=None):
    """Create a Celery app, optionally tied to a Flask app."""
    celery = Celery(
        "daily_workers",
        broker=Config.CELERY_BROKER_URL,
        backend=Config.CELERY_RESULT_BACKEND,
    )

    celery.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        task_track_started=True,
        task_acks_late=True,
        worker_prefetch_multiplier=1,
    )

    # Scheduled tasks
    celery.conf.beat_schedule = {
        "finalize-daily-puzzles": {
            "task": "app.tasks.generate_puzzles.finalize_daily_task",
            "schedule": crontab(hour=0, minute=0),  # Midnight UTC
        },
        "refill-puzzle-pools": {
            "task": "app.tasks.generate_puzzles.refill_all_pools_task",
            "schedule": crontab(hour="*/6"),  # Every 6 hours
        },
    }

    celery.autodiscover_tasks(["app.tasks"])

    return celery


celery_app = make_celery()
