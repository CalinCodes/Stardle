import os
from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

from app.config import config_by_name

db = SQLAlchemy()
migrate = Migrate()


def create_app(config_name: str | None = None) -> Flask:
    """Application factory."""
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)

    # Register blueprints
    from app.routes.onboarding import onboarding_bp
    from app.routes.feed import feed_bp
    from app.routes.daily import daily_bp
    from app.routes.infinite import infinite_bp
    from app.routes.leaderboard import leaderboard_bp

    app.register_blueprint(onboarding_bp)
    app.register_blueprint(feed_bp)
    app.register_blueprint(daily_bp)
    app.register_blueprint(infinite_bp)
    app.register_blueprint(leaderboard_bp)

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {"error": "Not found"}, 404

    @app.errorhandler(500)
    def internal_error(error):
        return {"error": "Internal server error"}, 500

    return app
