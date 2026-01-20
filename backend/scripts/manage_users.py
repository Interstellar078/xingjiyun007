from __future__ import annotations

import argparse
import getpass
import os
import sys

ROOT_DIR = os.path.dirname(os.path.dirname(__file__))
SRC_DIR = os.path.join(ROOT_DIR, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from app.db import SessionLocal  # noqa: E402
from app.models import User  # noqa: E402
from app.auth import hash_password  # noqa: E402


def create_user(username: str, password: str, role: str) -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            raise SystemExit(f"User already exists: {username}")

        user = User(
            username=username,
            password_hash=hash_password(password),
            role=role,
        )
        db.add(user)
        db.commit()
        print(f"Created user: {username} (role={role})")
    finally:
        db.close()


def promote_user(username: str, role: str) -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise SystemExit(f"User not found: {username}")
        user.role = role
        db.commit()
        print(f"Updated role: {username} -> {role}")
    finally:
        db.close()


def reset_password(username: str, password: str) -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise SystemExit(f"User not found: {username}")
        user.password_hash = hash_password(password)
        db.commit()
        print(f"Password reset for: {username}")
    finally:
        db.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Manage API users")
    sub = parser.add_subparsers(dest="command", required=True)

    create = sub.add_parser("create", help="Create a new user")
    create.add_argument("--username", required=True)
    create.add_argument("--role", default="user", choices=["user", "admin"])
    create.add_argument("--password")

    promote = sub.add_parser("promote", help="Promote or change user role")
    promote.add_argument("--username", required=True)
    promote.add_argument("--role", default="admin", choices=["user", "admin"])

    reset = sub.add_parser("reset-password", help="Reset user password")
    reset.add_argument("--username", required=True)
    reset.add_argument("--password")

    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.command == "create":
        password = args.password or getpass.getpass("Password: ")
        create_user(args.username, password, args.role)
    elif args.command == "promote":
        promote_user(args.username, args.role)
    elif args.command == "reset-password":
        password = args.password or getpass.getpass("New password: ")
        reset_password(args.username, password)


if __name__ == "__main__":
    main()
