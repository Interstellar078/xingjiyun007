from __future__ import annotations

import logging
import logging.config
import os


def configure_logging(level: str = "INFO", json_format: bool = False) -> None:
    level = (level or "INFO").upper()
    formatter = "json" if json_format else "standard"

    log_dir = "logs"
    try:
        os.makedirs(log_dir, exist_ok=True)
    except OSError:
        log_dir = "/tmp"
    
    config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "standard": {
                "format": "%(asctime)s %(levelname)s [%(name)s] %(message)s"
            },
            "json": {
                "format": (
                    '{"time":"%(asctime)s",'
                    '"level":"%(levelname)s",'
                    '"logger":"%(name)s",'
                    '"message":"%(message)s"}'
                )
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": formatter,
            },
            "file": {
                "class": "logging.handlers.TimedRotatingFileHandler",
                "filename": os.path.join(log_dir, "app.log"),
                "when": "midnight",
                "interval": 1,
                "backupCount": 30,
                "formatter": formatter,
                "encoding": "utf-8",
            },
        },
        "root": {
            "handlers": ["console", "file"],
            "level": level,
        },
        "loggers": {
            "uvicorn": {"handlers": ["console", "file"], "level": level, "propagate": False},
            "uvicorn.error": {"handlers": ["console", "file"], "level": level, "propagate": False},
            "uvicorn.access": {
                "handlers": ["console", "file"],
                "level": "INFO" if level != "DEBUG" else "DEBUG",
                "propagate": False,
            },
        },
    }

    try:
        logging.config.dictConfig(config)
    except Exception:
        # Fallback to console-only logging if file handler cannot be initialized.
        fallback = {
            **config,
            "handlers": {"console": config["handlers"]["console"]},
            "root": {"handlers": ["console"], "level": level},
            "loggers": {
                "uvicorn": {"handlers": ["console"], "level": level, "propagate": False},
                "uvicorn.error": {"handlers": ["console"], "level": level, "propagate": False},
                "uvicorn.access": {
                    "handlers": ["console"],
                    "level": "INFO" if level != "DEBUG" else "DEBUG",
                    "propagate": False,
                },
            },
        }
        logging.config.dictConfig(fallback)
