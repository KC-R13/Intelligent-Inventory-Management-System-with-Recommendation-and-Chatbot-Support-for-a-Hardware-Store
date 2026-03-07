import os

from dotenv import load_dotenv

load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL")
RASA_WEBHOOK_URL = os.getenv("RASA_WEBHOOK_URL")
