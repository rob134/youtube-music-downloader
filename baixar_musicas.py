import subprocess
from pathlib import Path

LINKS_FILE = Path(r"E:\Musicas\links.txt")
OUTPUT_DIR = Path(r"E:\Musicas")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

if not LINKS_FILE.exists():
    print(f"ERRO: arquivo não encontrado: {LINKS_FILE}")
    input("\nPressione ENTER para sair...")
    raise SystemExit(1)

links = LINKS_FILE.read_text(encoding="utf-8").splitlines()

links = list(dict.fromkeys(
    link.strip()
    for link in links
    if link.strip()
    and not link.startswith("#")
    and "youtube.com/watch?" in link
))

print("=" * 60)
print("      DOWNLOAD DE MÚSICAS - YT-DLP")
print("=" * 60)
print(f"URLs encontradas: {len(links)}")
print(f"Destino: {OUTPUT_DIR}")
print("=" * 60)

sucesso = 0
erros = []

for numero, url in enumerate(links, start=1):
    print()
    print(f"[{numero}/{len(links)}]")
    print(f"URL: {url}")

    comando = [
        "python",
        "-m",
        "yt_dlp",
        "--ignore-errors",
        "--retries", "5",
        "--fragment-retries", "5",
        "--continue",
        "--no-overwrites",
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "--add-metadata",
        "-o",
        str(OUTPUT_DIR / "%(title)s.%(ext)s"),
        url
    ]

    resultado = subprocess.run(comando)

    if resultado.returncode == 0:
        sucesso += 1
        print("OK")
    else:
        erros.append(url)
        print("ERRO - continuando para a próxima...")

if erros:
    (OUTPUT_DIR / "erros.txt").write_text(
        "\n".join(erros) + "\n",
        encoding="utf-8"
    )

print()
print("=" * 60)
print("FINALIZADO")
print("=" * 60)
print(f"Total de URLs : {len(links)}")
print(f"Sucesso       : {sucesso}")
print(f"Erros         : {len(erros)}")
print(f"Destino       : {OUTPUT_DIR}")
if erros:
    print(f"URLs com erro : {OUTPUT_DIR / 'erros.txt'}")
print("=" * 60)

input("\nPressione ENTER para sair...")
