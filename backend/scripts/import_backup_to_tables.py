#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from passlib.context import CryptContext
from sqlalchemy import Boolean, Column, DateTime, Integer, MetaData, String, Table, create_engine
from sqlalchemy.dialects.postgresql import JSONB, insert


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import backup JSON into current relational tables.",
    )
    parser.add_argument(
        "--file",
        required=True,
        help="Path to backup JSON file (list of {key, value, updated_at}).",
    )
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL", ""),
        help="Postgres URL. Defaults to DATABASE_URL env var.",
    )
    parser.add_argument(
        "--system-owner",
        default="system",
        help="Owner id for public resources and shared app_data keys.",
    )
    return parser.parse_args()


def chunked(items: list[dict], size: int = 1000) -> Iterable[list[dict]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def parse_timestamp_ms(value: int | float | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    return datetime.fromtimestamp(value / 1000, tz=timezone.utc)


def parse_iso_timestamp(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return datetime.now(timezone.utc)


def is_public_flag(value: object) -> bool:
    return bool(value)


def main() -> int:
    args = parse_args()
    if not args.database_url:
        raise SystemExit("DATABASE_URL is required (env var or --database-url).")

    backup_path = Path(args.file)
    if not backup_path.exists():
        raise SystemExit(f"Backup file not found: {backup_path}")

    with backup_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    if not isinstance(payload, list):
        raise SystemExit("Backup file must contain a JSON list.")

    by_key = {item["key"]: item["value"] for item in payload if "key" in item}

    metadata = MetaData()
    users = Table(
        "users",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("username", String(120), nullable=False),
        Column("password_hash", String(255), nullable=False),
        Column("role", String(20), nullable=False),
        Column("created_at", DateTime(timezone=True), nullable=False),
    )
    app_data = Table(
        "app_data",
        metadata,
        Column("owner_id", String(120), primary_key=True),
        Column("key", String(255), primary_key=True),
        Column("value", JSONB, nullable=False),
        Column("is_public", Boolean, nullable=False),
        Column("updated_at", DateTime(timezone=True), nullable=False),
    )
    resource_countries = Table(
        "resource_countries",
        metadata,
        Column("id", String(50), primary_key=True),
        Column("name", String(100), nullable=False),
        Column("owner_id", String(120), nullable=False),
        Column("is_public", Boolean, nullable=False),
        Column("created_at", DateTime(timezone=True), nullable=False),
    )
    resource_cities = Table(
        "resource_cities",
        metadata,
        Column("id", String(50), primary_key=True),
        Column("country", String(100), nullable=False),
        Column("name", String(100), nullable=False),
        Column("owner_id", String(120), nullable=False),
        Column("is_public", Boolean, nullable=False),
        Column("created_at", DateTime(timezone=True), nullable=False),
    )
    resource_spots = Table(
        "resource_spots",
        metadata,
        Column("id", String(50), primary_key=True),
        Column("city_id", String(50), nullable=False),
        Column("name", String(200), nullable=False),
        Column("price", Integer, nullable=False),
        Column("owner_id", String(120), nullable=False),
        Column("is_public", Boolean, nullable=False),
    )
    resource_hotels = Table(
        "resource_hotels",
        metadata,
        Column("id", String(50), primary_key=True),
        Column("city_id", String(50), nullable=False),
        Column("name", String(200), nullable=False),
        Column("room_type", String(100)),
        Column("price", Integer, nullable=False),
        Column("owner_id", String(120), nullable=False),
        Column("is_public", Boolean, nullable=False),
    )
    resource_activities = Table(
        "resource_activities",
        metadata,
        Column("id", String(50), primary_key=True),
        Column("city_id", String(50), nullable=False),
        Column("name", String(200), nullable=False),
        Column("price", Integer, nullable=False),
        Column("owner_id", String(120), nullable=False),
        Column("is_public", Boolean, nullable=False),
    )
    resource_transports = Table(
        "resource_transports",
        metadata,
        Column("id", String(50), primary_key=True),
        Column("region", String(100), nullable=False),
        Column("car_model", String(100)),
        Column("service_type", String(50)),
        Column("passengers", Integer, nullable=False),
        Column("price_low", Integer, nullable=False),
        Column("price_high", Integer, nullable=False),
        Column("owner_id", String(120), nullable=False),
        Column("is_public", Boolean, nullable=False),
    )
    trips = Table(
        "trips",
        metadata,
        Column("id", String(50), primary_key=True),
        Column("name", String(200), nullable=False),
        Column("owner_id", String(120), nullable=False),
        Column("is_public", Boolean, nullable=False),
        Column("content", JSONB, nullable=False),
        Column("created_at", DateTime(timezone=True), nullable=False),
        Column("updated_at", DateTime(timezone=True), nullable=False),
    )

    engine = create_engine(args.database_url, pool_pre_ping=True)

    user_rows = []
    for key, value in by_key.items():
        if not key.startswith("user_profile_") or not isinstance(value, dict):
            continue
        username = value.get("username") or key[len("user_profile_") :]
        password = value.get("password", "")
        if not password:
            continue
        password_hash = pwd_context.hash(password)
        created_at = parse_timestamp_ms(value.get("createdAt"))
        role = value.get("role") or "user"
        user_rows.append(
            {
                "username": username,
                "password_hash": password_hash,
                "role": role,
                "created_at": created_at,
            }
        )

    cities_src = by_key.get("travel_builder_db_poi_cities", []) or []
    city_rows = []
    country_rows = {}
    for item in cities_src:
        city_id = item.get("id")
        name = item.get("name")
        country = item.get("country")
        if not city_id or not name or not country:
            continue
        public = is_public_flag(item.get("isPublic"))
        owner_id = args.system_owner if public else (item.get("createdBy") or args.system_owner)
        city_rows.append(
            {
                "id": city_id,
                "country": country,
                "name": name,
                "owner_id": owner_id,
                "is_public": public,
                "created_at": datetime.now(timezone.utc),
            }
        )
        if country not in country_rows:
            country_rows[country] = {
                "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, country)),
                "name": country,
                "owner_id": args.system_owner,
                "is_public": True,
                "created_at": datetime.now(timezone.utc),
            }

    def build_resource_rows(items: list[dict], mapper) -> list[dict]:
        rows = []
        for item in items:
            row = mapper(item)
            if row:
                rows.append(row)
        return rows

    def owner_from_item(item: dict) -> tuple[str, bool]:
        public = is_public_flag(item.get("isPublic"))
        owner_id = args.system_owner if public else (item.get("createdBy") or args.system_owner)
        return owner_id, public

    spot_rows = build_resource_rows(
        by_key.get("travel_builder_db_poi_spots", []) or [],
        lambda item: {
            "id": item.get("id"),
            "city_id": item.get("cityId"),
            "name": item.get("name"),
            "price": int(item.get("price") or 0),
            "owner_id": owner_from_item(item)[0],
            "is_public": owner_from_item(item)[1],
        }
        if item.get("id") and item.get("cityId") and item.get("name")
        else None,
    )

    hotel_rows = build_resource_rows(
        by_key.get("travel_builder_db_poi_hotels_v2", []) or [],
        lambda item: {
            "id": item.get("id"),
            "city_id": item.get("cityId"),
            "name": item.get("name"),
            "room_type": item.get("roomType"),
            "price": int(item.get("price") or 0),
            "owner_id": owner_from_item(item)[0],
            "is_public": owner_from_item(item)[1],
        }
        if item.get("id") and item.get("cityId") and item.get("name")
        else None,
    )

    activity_rows = build_resource_rows(
        by_key.get("travel_builder_db_poi_activities", []) or [],
        lambda item: {
            "id": item.get("id"),
            "city_id": item.get("cityId"),
            "name": item.get("name"),
            "price": int(item.get("price") or 0),
            "owner_id": owner_from_item(item)[0],
            "is_public": owner_from_item(item)[1],
        }
        if item.get("id") and item.get("cityId") and item.get("name")
        else None,
    )

    transport_rows = build_resource_rows(
        by_key.get("travel_builder_db_cars", []) or [],
        lambda item: {
            "id": item.get("id"),
            "region": item.get("region"),
            "car_model": item.get("carModel"),
            "service_type": item.get("serviceType"),
            "passengers": int(item.get("passengers") or 0),
            "price_low": int(item.get("priceLow") or 0),
            "price_high": int(item.get("priceHigh") or 0),
            "owner_id": owner_from_item(item)[0],
            "is_public": owner_from_item(item)[1],
        }
        if item.get("id") and item.get("region")
        else None,
    )

    trip_rows = []
    for item in by_key.get("travel_builder_history", []) or []:
        if not isinstance(item, dict):
            continue
        trip_id = item.get("id") or str(uuid.uuid4())
        item["id"] = trip_id
        owner_id = item.get("createdBy") or args.system_owner
        timestamp = parse_timestamp_ms(item.get("timestamp"))
        trip_rows.append(
            {
                "id": trip_id,
                "name": item.get("name") or "Untitled",
                "owner_id": owner_id,
                "is_public": False,
                "content": item,
                "created_at": timestamp,
                "updated_at": timestamp,
            }
        )

    app_data_rows = []
    for key, value in by_key.items():
        if key.startswith("user_profile_"):
            continue
        if key.startswith("travel_builder_db_poi_") or key.startswith("travel_builder_db_cars"):
            continue
        if key == "travel_builder_history":
            continue
        if key in {
            "travel_builder_db_country_files",
        }:
            continue
        app_data_rows.append(
            {
                "owner_id": args.system_owner,
                "key": key,
                "value": value,
                "is_public": True,
                "updated_at": parse_iso_timestamp(
                    next((i.get("updated_at") for i in payload if i.get("key") == key), None)
                ),
            }
        )

    with engine.begin() as conn:
        if user_rows:
            stmt = insert(users)
            stmt = stmt.on_conflict_do_update(
                index_elements=["username"],
                set_={
                    "password_hash": stmt.excluded.password_hash,
                    "role": stmt.excluded.role,
                },
            )
            for batch in chunked(user_rows, 200):
                conn.execute(stmt.values(batch))

        if country_rows:
            stmt = insert(resource_countries)
            stmt = stmt.on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "name": stmt.excluded.name,
                    "owner_id": stmt.excluded.owner_id,
                    "is_public": stmt.excluded.is_public,
                },
            )
            for batch in chunked(list(country_rows.values()), 500):
                conn.execute(stmt.values(batch))

        if city_rows:
            stmt = insert(resource_cities)
            stmt = stmt.on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "country": stmt.excluded.country,
                    "name": stmt.excluded.name,
                    "owner_id": stmt.excluded.owner_id,
                    "is_public": stmt.excluded.is_public,
                },
            )
            for batch in chunked(city_rows, 1000):
                conn.execute(stmt.values(batch))

        for table, rows in [
            (resource_spots, spot_rows),
            (resource_hotels, hotel_rows),
            (resource_activities, activity_rows),
            (resource_transports, transport_rows),
        ]:
            if not rows:
                continue
            stmt = insert(table)
            stmt = stmt.on_conflict_do_update(
                index_elements=["id"],
                set_={col.name: getattr(stmt.excluded, col.name) for col in table.columns if col.name != "id"},
            )
            for batch in chunked(rows, 1000):
                conn.execute(stmt.values(batch))

        if trip_rows:
            stmt = insert(trips)
            stmt = stmt.on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "name": stmt.excluded.name,
                    "owner_id": stmt.excluded.owner_id,
                    "is_public": stmt.excluded.is_public,
                    "content": stmt.excluded.content,
                    "updated_at": stmt.excluded.updated_at,
                },
            )
            for batch in chunked(trip_rows, 500):
                conn.execute(stmt.values(batch))

        if app_data_rows:
            stmt = insert(app_data)
            stmt = stmt.on_conflict_do_update(
                index_elements=["owner_id", "key"],
                set_={
                    "value": stmt.excluded.value,
                    "is_public": stmt.excluded.is_public,
                    "updated_at": stmt.excluded.updated_at,
                },
            )
            for batch in chunked(app_data_rows, 200):
                conn.execute(stmt.values(batch))

    print("Import completed.")
    print(
        f"users={len(user_rows)}, countries={len(country_rows)}, cities={len(city_rows)}, "
        f"spots={len(spot_rows)}, hotels={len(hotel_rows)}, activities={len(activity_rows)}, "
        f"transports={len(transport_rows)}, trips={len(trip_rows)}, app_data={len(app_data_rows)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
