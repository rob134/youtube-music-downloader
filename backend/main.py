from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pathlib import Path
import subprocess
import json
import uuid
import re

app = FastAPI(title="YouTube Music Downloader", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = Path(r"E:\Musicas")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


class SearchRequest(BaseModel):
    artist: str = Field(min_length=1, max_length=100)
    quantity: int = Field(default=10, ge=1, le=50)


class DownloadItem(BaseModel):
    id: str
    title: str
    url: str


class DownloadRequest(BaseModel):
    songs: list[DownloadItem] = Field(min_length=1, max_length=50)


def clean_title(title: str) -> str:
    return re.sub(r"\s+", " ", title).strip()


def is_candidate(title: str) -> bool:
    normalized = title.lower()
    ignored = (
        "shorts", "interview", "reaction", "podcast", "news",
        "review", "tutorial", "karaoke", "lyrics video", "compilation"
    )
    return not any(word in normalized for word in ignored)


@app.get("/")
def root():
    return {"application": "YouTube Music Downloader", "status": "running"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/search")
def search(request: SearchRequest):
    query = f"ytsearch{request.quantity * 3}:{request.artist} official music"

    command = [
        "python", "-m", "yt_dlp",
        "--flat-playlist",
        "--dump-single-json",
        "--skip-download",
        query,
    ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    if result.returncode != 0:
        return {"success": False, "error": result.stderr.strip()}

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        return {"success": False, "error": "Não foi possível interpretar os resultados."}

    songs = []
    seen = set()

    for entry in data.get("entries", []):
        title = clean_title(entry.get("title", ""))
        video_id = entry.get("id")

        if not title or not video_id or video_id in seen or not is_candidate(title):
            continue

        seen.add(video_id)
        songs.append({
            "id": str(uuid.uuid4()),
            "title": title,
            "url": f"https://www.youtube.com/watch?v={video_id}",
        })

        if len(songs) >= request.quantity:
            break

    return {
        "success": True,
        "artist": request.artist,
        "songs": songs,
    }


@app.post("/api/download")
def download(request: DownloadRequest):
    results = []

    for song in request.songs:
        command = [
            "python", "-m", "yt_dlp",
            "--ignore-errors",
            "--retries", "5",
            "--fragment-retries", "5",
            "--continue",
            "--no-overwrites",
            "-x",
            "--audio-format", "mp3",
            "--audio-quality", "0",
            "--add-metadata",
            "-o", str(OUTPUT_DIR / "%(title)s.%(ext)s"),
            song.url,
        ]

        result = subprocess.run(command)
        results.append({
            "id": song.id,
            "title": song.title,
            "success": result.returncode == 0,
        })

    return {"success": True, "results": results}
