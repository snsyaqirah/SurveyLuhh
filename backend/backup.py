#!/usr/bin/env python3
"""
Exports MongoDB collections (sessions + feedback) to JSON files.
Run by GitHub Actions weekly — output is uploaded as a workflow artifact.

Usage:
  MONGODB_URI=<uri> python backend/backup.py
"""
import json
import os
from datetime import datetime, timezone

from pymongo import MongoClient


MONGODB_URI = os.environ["MONGODB_URI"]
OUTPUT_DIR = os.environ.get("BACKUP_DIR", "backup_output")
COLLECTIONS = ["sessions", "feedback"]


def serialise(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Cannot serialise {type(obj)}")


def export_collection(db, name: str) -> int:
    docs = list(db[name].find())
    for doc in docs:
        doc.pop("_id", None)   # _id is not JSON-serialisable and not needed for restore

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, f"{name}.json")
    with open(path, "w") as f:
        json.dump(docs, f, indent=2, default=serialise)
    return len(docs)


def main():
    client = MongoClient(MONGODB_URI)
    db = client.get_default_database()

    print(f"Backup started at {datetime.now(timezone.utc).isoformat()}")
    for name in COLLECTIONS:
        try:
            count = export_collection(db, name)
            print(f"  ✓ {name}: {count} documents → {OUTPUT_DIR}/{name}.json")
        except Exception as e:
            print(f"  ✗ {name}: failed — {e}")

    client.close()
    print("Backup complete.")


if __name__ == "__main__":
    main()
