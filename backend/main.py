from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pathlib import Path
import sys
import threading
import uuid
import re
from tkinter import Tk, filedialog

import yt_dlp

app = FastAPI(title="YouTube Music Downloader", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_OUTPUT_DIR = Path.home() / "Downloads" / "YouTube Music Downloader"
DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

jobs = {}
jobs_lock = threading.Lock()


class SearchRequest(BaseModel):
    artist: str = Field(min_length=1, max_length=100)
    quantity: int = Field(default=10, ge=1, le=50)


class DownloadItem(BaseModel):
    id: str
    title: str
    url: str


class DownloadRequest(BaseModel):
    songs: list[DownloadItem] = Field(min_length=1, max_length=50)
    output_dir: str = Field(default=str(DEFAULT_OUTPUT_DIR), min_length=1, max_length=500)


class ImportRequest(BaseModel):
    text: str = Field(min_length=1, max_length=100000)


def clean_title(title: str) -> str:
    return re.sub(r"\s+", " ", title).strip()


def is_youtube_url(url: str) -> bool:
    return bool(re.match(r"^https?://(www\.)?(youtube\.com|youtu\.be)/", url, re.IGNORECASE))


def is_candidate(title: str) -> bool:
    normalized = title.lower()
    ignored = (
        "shorts", "interview", "reaction", "podcast", "news",
        "review", "tutorial", "karaoke", "lyrics video", "compilation",
        "full album", "greatest hits", "playlist", "mix"
    )
    return not any(word in normalized for word in ignored)


def make_song(title: str, video_id: str, url: str | None = None):
    return {
        "id": str(uuid.uuid4()),
        "title": clean_title(title),
        "url": url or f"https://www.youtube.com/watch?v={video_id}",
    }


@app.get("/")
def root():
    return {"application": "YouTube Music Downloader", "status": "running"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/config")
def config():
    return {"default_output_dir": str(DEFAULT_OUTPUT_DIR)}


@app.post("/api/select-directory")
def select_directory():
    root = Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    selected = filedialog.askdirectory(
        title="Escolha a pasta onde as músicas serão salvas",
        initialdir=str(DEFAULT_OUTPUT_DIR),
        mustexist=False,
    )
    root.destroy()

    if not selected:
        return {"success": False, "cancelled": True}

    path = Path(selected)
    path.mkdir(parents=True, exist_ok=True)
    return {"success": True, "output_dir": str(path)}


@app.post("/api/search")
def search(request: SearchRequest):
    query = f"ytsearch{request.quantity * 5}:{request.artist} official music"
    options = {
        "quiet": True,
        "skip_download": True,
        "extract_flat": True,
    }

    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            data = ydl.extract_info(query, download=False)
    except Exception as exc:
        return {"success": False, "error": str(exc)}

    songs = []
    seen = set()

    for entry in data.get("entries", []):
        title = clean_title(entry.get("title", ""))
        video_id = entry.get("id")
        if not title or not video_id or video_id in seen or not is_candidate(title):
            continue
        seen.add(video_id)
        songs.append(make_song(title, video_id))
        if len(songs) >= request.quantity:
            break

    return {"success": True, "artist": request.artist, "songs": songs}


@app.post("/api/import")
def import_links(request: ImportRequest):
    urls = []
    seen_urls = set()

    for line in request.text.splitlines():
        url = line.strip()
        if not url or url.startswith("#") or not is_youtube_url(url):
            continue
        if url not in seen_urls:
            seen_urls.add(url)
            urls.append(url)

    if not urls:
        return {"success": False, "error": "Nenhuma URL válida do YouTube foi encontrada."}

    songs = []
    seen_ids = set()
    errors = []

    options = {
        "quiet": True,
        "skip_download": True,
        "extract_flat": True,
        "playlistend": 50,
    }

    for url in urls:
        try:
            with yt_dlp.YoutubeDL(options) as ydl:
                data = ydl.extract_info(url, download=False)

            entries = data.get("entries") if data.get("_type") in ("playlist", "multi_video") else [data]
            for entry in entries or []:
                if not entry:
                    continue
                title = clean_title(entry.get("title", ""))
                video_id = entry.get("id")
                if not title or not video_id or video_id in seen_ids:
                    continue
                seen_ids.add(video_id)
                songs.append(make_song(title, video_id))
                if len(songs) >= 50:
                    break
        except Exception as exc:
            errors.append({"url": url, "error": str(exc)})

        if len(songs) >= 50:
            break

    if not songs:
        return {"success": False, "error": "Não foi possível extrair músicas das URLs informadas.", "errors": errors}

    return {
        "success": True,
        "songs": songs,
        "sources": len(urls),
        "errors": errors,
    }


def update_job(job_id: str, **values):
    with jobs_lock:
        jobs[job_id].update(values)


def download_job(job_id: str, songs: list[DownloadItem], output_dir: Path):
    results = []

    try:
        output_dir.mkdir(parents=True, exist_ok=True)

        for index, song in enumerate(songs):
            update_job(
                job_id,
                current=index + 1,
                current_title=song.title,
                current_percent=0,
                status="downloading",
            )

            def progress_hook(data):
                if data.get("status") == "downloading":
                    total = data.get("total_bytes") or data.get("total_bytes_estimate")
                    downloaded = data.get("downloaded_bytes", 0)
                    percent = int(downloaded * 100 / total) if total else 0
                    update_job(job_id, current_percent=max(0, min(100, percent)))
                elif data.get("status") == "finished":
                    update_job(job_id, current_percent=100, status="converting")

            options = {
                "format": "bestaudio/best",
                "outtmpl": str(output_dir / "%(title)s.%(ext)s"),
                "noplaylist": True,
                "quiet": True,
                "no_warnings": True,
                "retries": 5,
                "fragment_retries": 5,
                "continuedl": True,
                "overwrites": False,
                "postprocessors": [{
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "0",
                }],
                "addmetadata": True,
                "progress_hooks": [progress_hook],
            }

            success = True
            error = None
            try:
                with yt_dlp.YoutubeDL(options) as ydl:
                    ydl.download([song.url])
            except Exception as exc:
                success = False
                error = str(exc)

            results.append({
                "id": song.id,
                "title": song.title,
                "success": success,
                "error": error,
            })

            update_job(
                job_id,
                completed=index + 1,
                current_percent=100 if success else 0,
                status="completed_song" if success else "error_song",
                results=results.copy(),
            )

        update_job(
            job_id,
            status="finished",
            completed=len(songs),
            current_percent=100,
            results=results,
        )
    except Exception as exc:
        update_job(job_id, status="failed", error=str(exc), results=results)


@app.post("/api/download")
def download(request: DownloadRequest):
    output_dir = Path(request.output_dir).expanduser()
    output_dir.mkdir(parents=True, exist_ok=True)

    job_id = str(uuid.uuid4())
    with jobs_lock:
        jobs[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "total": len(request.songs),
            "completed": 0,
            "current": 0,
            "current_title": "",
            "current_percent": 0,
            "output_dir": str(output_dir),
            "results": [],
            "error": None,
        }

    thread = threading.Thread(
        target=download_job,
        args=(job_id, request.songs, output_dir),
        daemon=True,
    )
    thread.start()

    return {"success": True, "job_id": job_id}


@app.get("/api/download/{job_id}")
def download_status(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            return {"success": False, "error": "Download não encontrado."}
        return {"success": True, **job}
