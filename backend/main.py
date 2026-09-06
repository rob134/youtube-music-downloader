from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pathlib import Path
from threading import Lock, Thread
import sys
import subprocess
import json
import uuid
import re
import tkinter as tk
from tkinter import filedialog

app = FastAPI(title="YouTube Music Downloader", version="2.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

DEFAULT_OUTPUT_DIR = Path.home() / "Downloads" / "YouTube Music Downloader"
OUTPUT_DIR = DEFAULT_OUTPUT_DIR
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

jobs = {}
import_jobs = {}
jobs_lock = Lock()

class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=200)
    quantity: int = Field(default=10, ge=1, le=50)

class DownloadItem(BaseModel):
    id: str
    title: str
    url: str

class DownloadRequest(BaseModel):
    songs: list[DownloadItem] = Field(min_length=1)

class ImportRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000000)


def clean_title(title: str) -> str:
    return re.sub(r"\s+", " ", title or "").strip()


def is_candidate(title: str) -> bool:
    normalized = title.lower()
    ignored = ("shorts", "interview", "reaction", "podcast", "news", "review", "tutorial", "karaoke", "lyrics video", "compilation")
    return not any(word in normalized for word in ignored)


def normalize_url(url: str) -> str:
    return url.strip().rstrip(",;.)]")


def add_song(songs, seen, title, url, video_id=None):
    title = clean_title(title)
    url = normalize_url(url)
    if not title or not url:
        return False
    key = video_id or url
    if key in seen:
        return False
    seen.add(key)
    songs.append({"id": str(uuid.uuid4()), "title": title, "url": url})
    return True


def extract_url_entries(url):
    command = [sys.executable, "-m", "yt_dlp", "--flat-playlist", "--dump-single-json", "--skip-download", url]
    result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "Não foi possível ler o link.")
    data = json.loads(result.stdout)
    entries = data.get("entries")
    if entries is None:
        entries = [data]
    songs = []
    seen = set()
    for entry in entries:
        if not entry:
            continue
        title = entry.get("title", "")
        video_id = entry.get("id")
        webpage_url = entry.get("webpage_url") or (f"https://www.youtube.com/watch?v={video_id}" if video_id else None)
        if title and webpage_url:
            add_song(songs, seen, title, webpage_url, video_id)
    return songs


@app.get("/")
def root():
    return {"application": "YouTube Music Downloader", "status": "running"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/settings")
def settings():
    return {"output_dir": str(OUTPUT_DIR), "default_output_dir": str(DEFAULT_OUTPUT_DIR)}


@app.post("/api/select-folder")
def select_folder():
    global OUTPUT_DIR
    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    selected = filedialog.askdirectory(title="Selecione a pasta onde as músicas serão salvas", initialdir=str(OUTPUT_DIR if OUTPUT_DIR.exists() else DEFAULT_OUTPUT_DIR))
    root.destroy()
    if not selected:
        return {"success": False, "cancelled": True, "output_dir": str(OUTPUT_DIR)}
    OUTPUT_DIR = Path(selected)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return {"success": True, "output_dir": str(OUTPUT_DIR)}


@app.post("/api/reset-folder")
def reset_folder():
    global OUTPUT_DIR
    OUTPUT_DIR = DEFAULT_OUTPUT_DIR
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return {"success": True, "output_dir": str(OUTPUT_DIR)}


@app.post("/api/search")
def search(request: SearchRequest):
    query = f"ytsearch{request.quantity}:{request.query}"
    command = [sys.executable, "-m", "yt_dlp", "--flat-playlist", "--dump-single-json", "--skip-download", query]
    result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace")
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
        songs.append({"id": str(uuid.uuid4()), "title": title, "url": f"https://www.youtube.com/watch?v={video_id}"})
    return {"success": True, "query": request.query, "songs": songs}


def extract_raw_urls(text):
    return re.findall(r'https?://[^\s<>"]+', text, flags=re.IGNORECASE)


def run_import_job(job_id, text, file_name=None):
    raw_urls = extract_raw_urls(text)
    update_import_job(job_id, status="processing", input_count=len(raw_urls), file_name=file_name)

    all_songs = []
    seen = set()
    errors = []

    for index, raw_url in enumerate(raw_urls):
        url = normalize_url(raw_url)
        update_import_job(job_id, current_index=index, current_url=url, current_status="reading")
        try:
            extracted = extract_url_entries(url)
            added_now = 0
            for song in extracted:
                if add_song(all_songs, seen, song["title"], song["url"], song["url"]):
                    added_now += 1
            if added_now:
                update_import_job(job_id, songs=all_songs.copy())
        except Exception as exc:
            errors.append({"url": url, "error": str(exc)})
            update_import_job(job_id, errors=errors.copy())

        update_import_job(job_id, processed_inputs=index + 1, current_status="waiting")

    update_import_job(
        job_id,
        status="completed",
        songs=all_songs,
        errors=errors,
        processed_inputs=len(raw_urls),
        current_index=len(raw_urls) - 1,
        current_url="",
        current_status="completed"
    )


def update_import_job(job_id, **values):
    with jobs_lock:
        if job_id in import_jobs:
            import_jobs[job_id].update(values)


@app.post("/api/import")
def import_links(request: ImportRequest):
    job_id = str(uuid.uuid4())
    with jobs_lock:
        import_jobs[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "input_count": 0,
            "processed_inputs": 0,
            "songs": [],
            "errors": [],
            "current_index": 0,
            "current_url": "",
            "current_status": "queued",
            "file_name": None,
        }
    Thread(target=run_import_job, args=(job_id, request.text), daemon=True).start()
    return {"success": True, "job_id": job_id}


@app.post("/api/import-file")
async def import_file(file: UploadFile = File(...)):
    content = await file.read()
    text = content.decode("utf-8-sig", errors="replace")
    if not text.strip():
        return {"success": False, "error": "O arquivo está vazio.", "file_name": file.filename}
    job_id = str(uuid.uuid4())
    with jobs_lock:
        import_jobs[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "input_count": 0,
            "processed_inputs": 0,
            "songs": [],
            "errors": [],
            "current_index": 0,
            "current_url": "",
            "current_status": "queued",
            "file_name": file.filename,
        }
    Thread(target=run_import_job, args=(job_id, text, file.filename), daemon=True).start()
    return {"success": True, "job_id": job_id, "file_name": file.filename}


@app.get("/api/import/{job_id}")
def import_status(job_id: str):
    with jobs_lock:
        job = import_jobs.get(job_id)
        if not job:
            return {"success": False, "error": "Importação não encontrada."}
        return {"success": True, **job}


def update_job(job_id, **values):
    with jobs_lock:
        if job_id in jobs:
            jobs[job_id].update(values)


def parse_progress(line):
    match = re.search(r"(\d+(?:\.\d+)?)%", line)
    if not match:
        return None
    try:
        return max(0, min(100, round(float(match.group(1)), 1)))
    except ValueError:
        return None


def run_download_job(job_id, songs):
    total = len(songs)
    completed = 0
    results = []
    for index, song in enumerate(songs):
        update_job(job_id, current_index=index, current_title=song.title, current_percent=0, status="downloading")
        command = [sys.executable, "-m", "yt_dlp", "--ignore-errors", "--retries", "5", "--fragment-retries", "5", "--continue", "--no-overwrites", "--newline", "-x", "--audio-format", "mp3", "--audio-quality", "0", "--add-metadata", "-o", str(OUTPUT_DIR / "%(title)s.%(ext)s"), song.url]
        print("PROCESSANDO:", song.title)
        print("PYTHON USADO:", sys.executable)
        print("DESTINO:", OUTPUT_DIR)
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace", bufsize=1)
        output_lines = []
        for line in process.stdout:
            line = line.rstrip()
            output_lines.append(line)
            percent = parse_progress(line)
            if percent is not None:
                update_job(job_id, current_percent=percent)
            print(line)
        return_code = process.wait()
        success = return_code == 0
        if success:
            completed += 1
        results.append({"id": song.id, "title": song.title, "success": success, "error": "\n".join(output_lines[-5:]) if not success else None})
        update_job(job_id, completed=completed, results=results.copy(), current_percent=100 if success else 0, status="downloading")
    update_job(job_id, status="completed", completed=completed, current_index=total - 1, current_percent=100, current_title="", results=results)
    print("DOWNLOAD JOB FINALIZADO:", job_id)


@app.post("/api/download")
def download(request: DownloadRequest):
    with jobs_lock:
        if any(job.get("status") == "downloading" for job in jobs.values()):
            return {"success": False, "error": "Já existe um download em andamento."}
        job_id = str(uuid.uuid4())
        jobs[job_id] = {"job_id": job_id, "status": "queued", "total": len(request.songs), "completed": 0, "current_index": 0, "current_title": "", "current_percent": 0, "results": [], "output_dir": str(OUTPUT_DIR)}
    Thread(target=run_download_job, args=(job_id, request.songs), daemon=True).start()
    return {"success": True, "job_id": job_id, "output_dir": str(OUTPUT_DIR)}


@app.get("/api/download/{job_id}")
def download_status(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            return {"success": False, "error": "Download não encontrado."}
        return {"success": True, **job}
