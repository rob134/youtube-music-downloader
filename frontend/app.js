const API = "http://127.0.0.1:8000";
let songs = [];

const artistInput = document.getElementById("artist");
const quantityInput = document.getElementById("quantity");
const searchButton = document.getElementById("searchButton");
const clearButton = document.getElementById("clearButton");
const downloadButton = document.getElementById("downloadButton");
const songList = document.getElementById("songList");
const loading = document.getElementById("loading");
const status = document.getElementById("status");

searchButton.addEventListener("click", searchSongs);
artistInput.addEventListener("keydown", e => { if (e.key === "Enter") searchSongs(); });
clearButton.addEventListener("click", () => { songs = []; renderSongs(); status.textContent = ""; });
downloadButton.addEventListener("click", downloadSongs);

async function searchSongs() {
    const artist = artistInput.value.trim();
    const quantity = Number(quantityInput.value);
    if (!artist) return alert("Digite o nome do artista ou banda.");
    if (quantity < 1 || quantity > 50) return alert("A quantidade deve estar entre 1 e 50.");

    loading.classList.remove("hidden");
    searchButton.disabled = true;
    status.textContent = "";
    try {
        const response = await fetch(`${API}/api/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ artist, quantity })
        });
        const data = await response.json();
        if (!data.success) {
            status.textContent = "Erro: " + (data.error || "falha na pesquisa.");
            return;
        }
        songs = data.songs;
        renderSongs();
        status.textContent = `${songs.length} músicas encontradas.`;
    } catch (error) {
        status.textContent = "Não foi possível conectar ao servidor. Verifique se o FastAPI está rodando.";
        console.error(error);
    } finally {
        loading.classList.add("hidden");
        searchButton.disabled = false;
    }
}

function renderSongs() {
    songList.innerHTML = "";
    if (!songs.length) {
        songList.innerHTML = "<p>Nenhuma música na lista.</p>";
        return;
    }
    songs.forEach(song => {
        const element = document.createElement("div");
        element.className = "song";
        const title = document.createElement("div");
        title.className = "song-title";
        title.textContent = song.title;
        const remove = document.createElement("button");
        remove.className = "remove";
        remove.textContent = "✕";
        remove.title = "Remover música";
        remove.addEventListener("click", () => removeSong(song.id));
        element.append(title, remove);
        songList.appendChild(element);
    });
}

function removeSong(id) {
    songs = songs.filter(song => song.id !== id);
    renderSongs();
    status.textContent = `${songs.length} músicas na lista.`;
}

async function downloadSongs() {
    if (!songs.length) return alert("A lista está vazia.");
    downloadButton.disabled = true;
    status.textContent = `Baixando ${songs.length} músicas...`;
    try {
        const response = await fetch(`${API}/api/download`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ songs })
        });
        const data = await response.json();
        const success = data.results.filter(item => item.success).length;
        status.textContent = `Download finalizado: ${success}/${songs.length} músicas.`;
    } catch (error) {
        status.textContent = "Erro durante o download.";
        console.error(error);
    } finally {
        downloadButton.disabled = false;
    }
}
