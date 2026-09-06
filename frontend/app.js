const API = "http://127.0.0.1:8000";

let songs = [];
let downloadRunning = false;
let pollingTimer = null;

const artistInput = document.getElementById("artist");
const quantityInput = document.getElementById("quantity");
const linksInput = document.getElementById("linksInput");
const txtFile = document.getElementById("txtFile");
const searchButton = document.getElementById("searchButton");
const importButton = document.getElementById("importButton");
const clearButton = document.getElementById("clearButton");
const downloadButton = document.getElementById("downloadButton");
const selectFolderButton = document.getElementById("selectFolderButton");
const resetFolderButton = document.getElementById("resetFolderButton");
const songList = document.getElementById("songList");
const queueCount = document.getElementById("queueCount");
const loading = document.getElementById("loading");
const progressPanel = document.getElementById("progressPanel");
const progressSummary = document.getElementById("progressSummary");
const overallProgress = document.getElementById("overallProgress");
const currentSong = document.getElementById("currentSong");
const folderPath = document.getElementById("folderPath");
const status = document.getElementById("status");

searchButton.addEventListener("click", searchSongs);
artistInput.addEventListener("keydown", e => { if (e.key === "Enter") searchSongs(); });
importButton.addEventListener("click", importLinks);
txtFile.addEventListener("change", importTxtFile);
clearButton.addEventListener("click", clearQueue);
downloadButton.addEventListener("click", downloadSongs);
selectFolderButton.addEventListener("click", selectFolder);
resetFolderButton.addEventListener("click", resetFolder);

loadSettings();

async function loadSettings() {
    try {
        const response = await fetch(`${API}/api/settings`);
        const data = await response.json();
        folderPath.textContent = data.output_dir;
    } catch (error) {
        folderPath.textContent = "Não foi possível carregar a pasta.";
    }
}

async function searchSongs() {
    const artist = artistInput.value.trim();
    const quantity = Number(quantityInput.value);
    if (!artist) return alert("Digite o nome do artista ou banda.");
    if (quantity < 1 || quantity > 50) return alert("A quantidade deve estar entre 1 e 50.");
    loading.classList.remove("hidden");
    searchButton.disabled = true;
    status.textContent = "";
    try {
        const response = await fetch(`${API}/api/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ artist, quantity }) });
        const data = await response.json();
        if (!data.success) { status.textContent = "Erro: " + (data.error || "falha na pesquisa."); return; }
        const added = addSongs(data.songs);
        status.textContent = `${added} músicas adicionadas à fila.`;
    } catch (error) { status.textContent = "Não foi possível conectar ao servidor. Verifique se o FastAPI está rodando."; console.error(error); }
    finally { loading.classList.add("hidden"); searchButton.disabled = false; }
}

async function importLinks() {
    const text = linksInput.value.trim();
    if (!text) return alert("Cole pelo menos um link.");
    await importText(text);
    linksInput.value = "";
}

async function importTxtFile() {
    const file = txtFile.files[0];
    if (!file) return;
    status.textContent = `Lendo arquivo: ${file.name}...`;
    importButton.disabled = true;
    try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`${API}/api/import-file`, { method: "POST", body: formData });
        const data = await response.json();
        handleImportResult(data, file.name);
    } catch (error) {
        status.textContent = `Erro ao importar o arquivo ${file.name}.`;
        console.error(error);
    } finally {
        importButton.disabled = false;
        txtFile.value = "";
    }
}

async function importText(text) {
    importButton.disabled = true;
    status.textContent = "Lendo links e playlists...";
    try {
        const response = await fetch(`${API}/api/import`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
        const data = await response.json();
        handleImportResult(data);
    } catch (error) { status.textContent = "Erro ao importar os links."; console.error(error); }
    finally { importButton.disabled = false; }
}

function handleImportResult(data, importedFileName = null) {
    if (!data.success) { status.textContent = "Erro: " + (data.error || "falha na importação."); return; }
    const added = addSongs(data.songs || []);
    const source = importedFileName || data.file_name;
    let message = source ? `📄 ${source}: ${added} música(s) adicionada(s) à fila.` : `${added} música(s) adicionada(s) à fila.`;
    if (data.input_count !== undefined) message += ` ${data.input_count} link(s) encontrado(s).`;
    if (data.errors?.length) message += ` ${data.errors.length} link(s) não puderam ser lidos.`;
    status.textContent = message;
    if (source) showImportedFile(source);
}

function showImportedFile(name) {
    let indicator = document.getElementById("importedFile");
    if (!indicator) {
        indicator = document.createElement("div");
        indicator.id = "importedFile";
        indicator.className = "imported-file";
        txtFile.closest(".file-button").insertAdjacentElement("afterend", indicator);
    }
    indicator.textContent = `📄 Arquivo carregado: ${name}`;
}

function addSongs(newSongs) {
    const existing = new Set(songs.map(song => song.url));
    let added = 0;
    for (const song of newSongs) {
        if (!existing.has(song.url)) { songs.push({ ...song, selected: true }); existing.add(song.url); added++; }
    }
    renderSongs();
    return added;
}

function clearQueue() {
    if (downloadRunning) return;
    songs = [];
    renderSongs();
    status.textContent = "";
}

function renderSongs() {
    songList.innerHTML = "";
    queueCount.textContent = `${songs.length} ${songs.length === 1 ? "música" : "músicas"}`;
    if (!songs.length) { songList.innerHTML = "<p>Nenhuma música na fila.</p>"; return; }
    songs.forEach(song => {
        const element = document.createElement("div");
        element.className = "song";
        const check = document.createElement("input");
        check.type = "checkbox"; check.className = "song-check"; check.checked = song.selected !== false; check.disabled = downloadRunning;
        check.addEventListener("change", () => { song.selected = check.checked; });
        const content = document.createElement("div"); content.className = "song-content";
        const title = document.createElement("div"); title.className = "song-title"; title.textContent = song.title; content.appendChild(title);
        const remove = document.createElement("button"); remove.className = "remove"; remove.textContent = "✕"; remove.title = "Remover música"; remove.disabled = downloadRunning; remove.addEventListener("click", () => removeSong(song.id));
        element.append(check, content, remove); songList.appendChild(element);
    });
}

function removeSong(id) {
    if (downloadRunning) return;
    songs = songs.filter(song => song.id !== id); renderSongs(); status.textContent = `${songs.length} músicas na fila.`;
}

async function selectFolder() {
    selectFolderButton.disabled = true;
    try {
        const response = await fetch(`${API}/api/select-folder`, { method: "POST" });
        const data = await response.json();
        if (data.success) { folderPath.textContent = data.output_dir; status.textContent = "Pasta de download atualizada."; }
        else if (!data.cancelled) status.textContent = data.error || "Não foi possível selecionar a pasta.";
    } catch (error) { status.textContent = "Erro ao escolher a pasta."; console.error(error); }
    finally { selectFolderButton.disabled = false; }
}

async function resetFolder() {
    try {
        const response = await fetch(`${API}/api/reset-folder`, { method: "POST" });
        const data = await response.json(); folderPath.textContent = data.output_dir; status.textContent = "Pasta padrão restaurada.";
    } catch (error) { status.textContent = "Erro ao restaurar a pasta padrão."; }
}

async function downloadSongs() {
    const selectedSongs = songs.filter(song => song.selected !== false);
    if (!selectedSongs.length) return alert("Selecione pelo menos uma música.");
    if (downloadRunning) return;
    downloadRunning = true; setControlsDisabled(true); progressPanel.classList.remove("hidden");
    progressSummary.textContent = `Preparando ${selectedSongs.length} músicas...`; overallProgress.style.width = "0%"; currentSong.textContent = "Iniciando..."; status.textContent = "";
    try {
        const response = await fetch(`${API}/api/download`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ songs: selectedSongs }) });
        const data = await response.json();
        if (!data.success) { status.textContent = "Erro: " + (data.error || "não foi possível iniciar o download."); return; }
        await pollDownload(data.job_id);
    } catch (error) { status.textContent = "Erro durante o download."; console.error(error); }
    finally { downloadRunning = false; setControlsDisabled(false); renderSongs(); }
}

async function pollDownload(jobId) {
    return new Promise(resolve => {
        const poll = async () => {
            try {
                const response = await fetch(`${API}/api/download/${jobId}`); const data = await response.json();
                if (!data.success) throw new Error(data.error || "Job não encontrado.");
                const total = data.total || 1; const completed = data.completed || 0;
                const percent = Math.min(100, Math.round(((completed + (data.current_percent || 0) / 100) / total) * 100));
                overallProgress.style.width = `${percent}%`; progressSummary.textContent = `${completed}/${data.total} concluídas — ${percent}%`;
                currentSong.textContent = data.current_title ? `${data.current_percent || 0}% — ${data.current_title}` : (data.status === "completed" ? "Concluído." : "Processando...");
                if (data.status === "completed") {
                    overallProgress.style.width = "100%"; progressSummary.textContent = `Download finalizado: ${completed}/${data.total} músicas.`;
                    const success = data.results.filter(item => item.success).length;
                    status.textContent = `Download finalizado: ${success}/${data.total} músicas com sucesso. Pasta: ${data.output_dir}`;
                    resolve(); return;
                }
                pollingTimer = setTimeout(poll, 500);
            } catch (error) { status.textContent = "Erro ao consultar o progresso do download."; console.error(error); resolve(); }
        };
        poll();
    });
}

function setControlsDisabled(disabled) {
    searchButton.disabled = disabled; importButton.disabled = disabled; clearButton.disabled = disabled; selectFolderButton.disabled = disabled; resetFolderButton.disabled = disabled; artistInput.disabled = disabled; quantityInput.disabled = disabled; linksInput.disabled = disabled; txtFile.disabled = disabled; downloadButton.disabled = disabled;
}
