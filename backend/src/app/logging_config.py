from __future__ import annotations

import logging
import logging.config


def configure_logging(level: str = "INFO", json_format: bool = False) -> None:
    level = (level or "INFO").upper()
    formatter = "json" if json_format else "standard"

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
            }
        },
        "root": {
            "handlers": ["console"],
            "level": level,
        },
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

    logging.config.dictConfig(config)
