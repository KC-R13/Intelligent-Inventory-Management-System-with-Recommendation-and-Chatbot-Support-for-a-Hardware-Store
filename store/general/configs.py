import os

from dotenv import load_dotenv

load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL")
RASA_WEBHOOK_URL = os.getenv("RASA_WEBHOOK_URL")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_EXPIATION = int(os.getenv('JWT_EXPIATION'))
