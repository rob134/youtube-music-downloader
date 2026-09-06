const API = "http://127.0.0.1:8000";

let songs = [];
let downloadRunning = false;
let pollingTimer = null;
let importPollingTimer = null;

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
const searchResults = document.getElementById("searchResults");
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
linksInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        importLinks();
    }
});
txtFile.addEventListener("change", importTxtFile);
clearButton.addEventListener("click", clearQueue);
downloadButton.addEventListener("click", downloadSongs);
selectFolderButton.addEventListener("click", selectFolder);
resetFolderButton.addEventListener("click", resetFolder);

loadSettings();
renderSongs();

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
    const query = artistInput.value.trim();
    const quantity = Number(quantityInput.value);
    if (!query) return alert("Digite o nome da música, artista ou banda.");
    if (quantity < 1 || quantity > 50) return alert("A quantidade deve estar entre 1 e 50.");
    loading.classList.remove("hidden");
    searchButton.disabled = true;
    status.textContent = `Pesquisando no YouTube: ${query}...`;
    try {
        const response = await fetch(`${API}/api/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, quantity })
        });
        const data = await response.json();
        if (!data.success) {
            status.textContent = "Erro: " + (data.error || "falha na pesquisa.");
            return;
        }
        renderSearchResults(data.songs || [], query);
        status.textContent = `${(data.songs || []).length} resultado(s) encontrado(s). Selecione os que deseja adicionar à fila.`;
    } catch (error) {
        status.textContent = "Não foi possível conectar ao servidor. Verifique se o FastAPI está rodando.";
        console.error(error);
    } finally {
        loading.classList.add("hidden");
        searchButton.disabled = false;
    }
}

function renderSearchResults(results, query) {
    searchResults.innerHTML = "";
    searchResults.classList.remove("hidden");
    if (!results.length) {
        searchResults.innerHTML = `<p>Nenhum resultado encontrado para "${escapeHtml(query)}".</p>`;
        return;
    }

    const header = document.createElement("div");
    header.className = "search-results-header";
    header.innerHTML = `<strong>Resultados para: ${escapeHtml(query)}</strong><button id="addSearchSelected">➕ Adicionar selecionadas</button>`;
    searchResults.appendChild(header);

    const resultSongs = results.map(song => ({ ...song, selected: false }));
    resultSongs.forEach(song => {
        const element = document.createElement("div");
        element.className = "song search-result";

        const check = document.createElement("input");
        check.type = "checkbox";
        check.className = "song-check";
        check.checked = false;
        check.addEventListener("change", () => { song.selected = check.checked; });

        const content = document.createElement("div");
        content.className = "song-content";
        const title = document.createElement("div");
        title.className = "song-title";
        title.textContent = song.title;
        content.appendChild(title);

        element.append(check, content);
        searchResults.appendChild(element);
    });

    document.getElementById("addSearchSelected").addEventListener("click", () => {
        const selected = resultSongs.filter(song => song.selected);
        if (!selected.length) return alert("Selecione pelo menos um resultado.");
        const added = addSongs(selected);
        renderSongs();
        status.textContent = `${added} música(s) adicionada(s) à fila.`;
        searchResults.classList.add("hidden");
        searchResults.innerHTML = "";
    });
}

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[char]));
}

async function importLinks() {
    const text = linksInput.value.trim();
    if (!text) return alert("Cole pelo menos um link.");
    linksInput.value = "";
    await startImport(text, null);
}

async function importTxtFile() {
    const file = txtFile.files[0];
    if (!file) return;

    importButton.disabled = true;
    txtFile.disabled = true;
    status.textContent = `📄 Arquivo selecionado: ${file.name}. Enviando para processamento...`;

    try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`${API}/api/import-file`, { method: "POST", body: formData });
        const data = await response.json();
        if (!data.success) {
            status.textContent = "Erro: " + (data.error || "falha ao carregar o arquivo.");
            return;
        }
        showImportedFile(file.name);
        status.textContent = `📄 ${file.name}: importação iniciada. A fila será preenchida automaticamente.`;
        await pollImport(data.job_id, file.name);
    } catch (error) {
        status.textContent = `Erro ao importar o arquivo ${file.name}.`;
        console.error(error);
    } finally {
        importButton.disabled = false;
        txtFile.disabled = false;
        txtFile.value = "";
    }
}

async function startImport(text, fileName) {
    importButton.disabled = true;
    status.textContent = fileName
        ? `📄 ${fileName}: iniciando importação...`
        : "⏳ Link(s) recebido(s). Identificando e adicionando à fila...";

    try {
        const response = await fetch(`${API}/api/import`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });
        const data = await response.json();
        if (!data.success) {
            status.textContent = "Erro: " + (data.error || "falha na importação.");
            return;
        }
        await pollImport(data.job_id, fileName);
    } catch (error) {
        status.textContent = "Erro ao importar os links.";
        console.error(error);
    } finally {
        importButton.disabled = false;
    }
}

async function pollImport(jobId, fileName = null) {
    return new Promise(resolve => {
        const poll = async () => {
            try {
                const response = await fetch(`${API}/api/import/${jobId}`);
                const data = await response.json();
                if (!data.success) throw new Error(data.error || "Importação não encontrada.");

                const before = songs.length;
                const added = addSongs(data.songs || []);
                if (added > 0 || before !== songs.length) renderSongs();

                const totalLinks = data.input_count || 0;
                const processed = data.processed_inputs || 0;
                const loaded = songs.length;
                const source = fileName || data.file_name;

                if (data.status !== "completed") {
                    if (source) {
                        status.textContent = `📄 ${source}: ${processed}/${totalLinks} link(s) processado(s) — ${loaded} música(s) na fila.`;
                    } else {
                        status.textContent = `⏳ Processando: ${processed}/${totalLinks} link(s) — ${loaded} música(s) na fila.`;
                    }
                    importPollingTimer = setTimeout(poll, 300);
                    return;
                }

                let message = source
                    ? `📄 ${source}: ${loaded} música(s) carregada(s) na fila.`
                    : `🔗 ${loaded} música(s) carregada(s) na fila.`;
                if (totalLinks) message += ` ${totalLinks} link(s) recebido(s).`;
                if (data.errors?.length) message += ` ${data.errors.length} link(s) não puderam ser lidos.`;
                status.textContent = message;
                resolve();
            } catch (error) {
                status.textContent = "Erro ao consultar o progresso da importação.";
                console.error(error);
                resolve();
            }
        };
        poll();
    });
}

function showImportedFile(name) {
    let indicator = document.getElementById("importedFile");
    if (!indicator) {
        indicator = document.createElement("div");
        indicator.id = "importedFile";
        indicator.className = "imported-file";
        const fileButton = txtFile.closest(".file-button");
        fileButton.insertAdjacentElement("afterend", indicator);
    }
    indicator.textContent = `📄 Arquivo carregado: ${name}`;
}

function addSongs(newSongs) {
    const existing = new Set(songs.map(song => song.url));
    let added = 0;
    for (const song of newSongs) {
        if (!song?.url || existing.has(song.url)) continue;
        songs.push({ ...song, selected: true });
        existing.add(song.url);
        added++;
    }
    return added;
}

function clearQueue() {
    if (downloadRunning) return;
    songs = [];
    renderSongs();
    status.textContent = "Fila limpa.";
}

function renderSongs() {
    songList.innerHTML = "";
    queueCount.textContent = `${songs.length} ${songs.length === 1 ? "música" : "músicas"} na fila`;
    if (!songs.length) {
        songList.innerHTML = "<p>Nenhuma música na fila.</p>";
        return;
    }

    const fragment = document.createDocumentFragment();
    songs.forEach((song, index) => {
        const element = document.createElement("div");
        element.className = "song";

        const check = document.createElement("input");
        check.type = "checkbox";
        check.className = "song-check";
        check.checked = song.selected !== false;
        check.disabled = downloadRunning;
        check.addEventListener("change", () => { song.selected = check.checked; });

        const content = document.createElement("div");
        content.className = "song-content";
        const title = document.createElement("div");
        title.className = "song-title";
        title.textContent = `${index + 1}. ${song.title}`;
        content.appendChild(title);

        const remove = document.createElement("button");
        remove.className = "remove";
        remove.textContent = "✕";
        remove.title = "Remover música";
        remove.disabled = downloadRunning;
        remove.addEventListener("click", () => removeSong(song.id));

        element.append(check, content, remove);
        fragment.appendChild(element);
    });
    songList.appendChild(fragment);
}

function removeSong(id) {
    if (downloadRunning) return;
    songs = songs.filter(song => song.id !== id);
    renderSongs();
    status.textContent = `${songs.length} músicas na fila.`;
}

async function selectFolder() {
    selectFolderButton.disabled = true;
    try {
        const response = await fetch(`${API}/api/select-folder`, { method: "POST" });
        const data = await response.json();
        if (data.success) {
            folderPath.textContent = data.output_dir;
            status.textContent = "Pasta de download atualizada.";
        } else if (!data.cancelled) {
            status.textContent = data.error || "Não foi possível selecionar a pasta.";
        }
    } catch (error) {
        status.textContent = "Erro ao escolher a pasta.";
        console.error(error);
    } finally {
        selectFolderButton.disabled = false;
    }
}

async function resetFolder() {
    try {
        const response = await fetch(`${API}/api/reset-folder`, { method: "POST" });
        const data = await response.json();
        folderPath.textContent = data.output_dir;
        status.textContent = "Pasta padrão restaurada.";
    } catch (error) {
        status.textContent = "Erro ao restaurar a pasta padrão.";
    }
}

async function downloadSongs() {
    const selectedSongs = songs.filter(song => song.selected !== false);
    if (!selectedSongs.length) return alert("Selecione pelo menos uma música.");
    if (downloadRunning) return;

    downloadRunning = true;
    setControlsDisabled(true);
    progressPanel.classList.remove("hidden");
    progressSummary.textContent = `Preparando ${selectedSongs.length} músicas...`;
    overallProgress.style.width = "0%";
    currentSong.textContent = "Iniciando...";
    status.textContent = "";

    try {
        const response = await fetch(`${API}/api/download`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ songs: selectedSongs })
        });
        const data = await response.json();
        if (!data.success) {
            status.textContent = "Erro: " + (data.error || "não foi possível iniciar o download.");
            return;
        }
        await pollDownload(data.job_id);
    } catch (error) {
        status.textContent = "Erro durante o download.";
        console.error(error);
    } finally {
        downloadRunning = false;
        setControlsDisabled(false);
        renderSongs();
    }
}

async function pollDownload(jobId) {
    return new Promise(resolve => {
        const poll = async () => {
            try {
                const response = await fetch(`${API}/api/download/${jobId}`);
                const data = await response.json();
                if (!data.success) throw new Error(data.error || "Job não encontrado.");
                const total = data.total || 1;
                const completed = data.completed || 0;
                const percent = Math.min(100, Math.round(((completed + (data.current_percent || 0) / 100) / total) * 100));
                overallProgress.style.width = `${percent}%`;
                progressSummary.textContent = `${completed}/${data.total} concluídas — ${percent}%`;
                currentSong.textContent = data.current_title
                    ? `${data.current_percent || 0}% — ${data.current_title}`
                    : (data.status === "completed" ? "Concluído." : "Processando...");
                if (data.status === "completed") {
                    overallProgress.style.width = "100%";
                    progressSummary.textContent = `Download finalizado: ${completed}/${data.total} músicas.`;
                    const success = data.results.filter(item => item.success).length;
                    status.textContent = `Download finalizado: ${success}/${data.total} músicas com sucesso. Pasta: ${data.output_dir}`;
                    resolve();
                    return;
                }
                pollingTimer = setTimeout(poll, 500);
            } catch (error) {
                status.textContent = "Erro ao consultar o progresso do download.";
                console.error(error);
                resolve();
            }
        };
        poll();
    });
}

function setControlsDisabled(disabled) {
    searchButton.disabled = disabled;
    importButton.disabled = disabled;
    clearButton.disabled = disabled;
    selectFolderButton.disabled = disabled;
    resetFolderButton.disabled = disabled;
    artistInput.disabled = disabled;
    quantityInput.disabled = disabled;
    linksInput.disabled = disabled;
    txtFile.disabled = disabled;
    downloadButton.disabled = disabled;
}
