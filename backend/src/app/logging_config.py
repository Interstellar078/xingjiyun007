from __future__ import annotations

import logging
import logging.config


def configure_logging(level: str = "INFO", json_format: bool = False) -> None:
    level = (level or "INFO").upper()
    formatter = "json" if json_format else "standard"

    import os
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    
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

    logging.config.dictConfig(config)
