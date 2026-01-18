import os

MONGODB_URI = os.environ.get("MONGODB_URI")
DB_NAME = os.environ.get("DB_NAME", "free-from-trial")

if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI is required (set it in DigitalOcean Environment Variables)")
