# config.py
import os
from dotenv import load_dotenv

load_dotenv()  # loads .env from project root


class Config:
    MANIFOLD_API_KEY = os.getenv("MANIFOLD_API_KEY")
    RIOT_API_KEY = os.getenv("RIOT_API_KEY")
    WS_PORT = int(os.getenv("WS_PORT", 8000))
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    SUMMONER_NAME = os.getenv("SUMMONER_NAME")
    RIOT_ID = os.getenv("RIOT_ID")
    TAGLINE = os.getenv("TAGLINE")
    REGION = os.getenv("REGION")
    C_WORKER_URL = os.getenv("C_WORKER_URL")
