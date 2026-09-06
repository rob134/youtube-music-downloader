# 🎵 YouTube Music Downloader

Aplicação local para pesquisar músicas no YouTube, selecionar resultados e baixar o áudio em MP3 utilizando `yt-dlp` e FFmpeg.

O projeto começou como um script Python de linha de comando e evoluiu para uma aplicação web local com frontend em HTML/CSS/JavaScript e backend em FastAPI.

> ⚠️ **Uso responsável:** utilize a aplicação somente para conteúdos que você tenha autorização para baixar ou para os quais o download seja permitido pelos termos aplicáveis. O projeto não hospeda nem distribui arquivos de música.

---

## 🚀 Evolução do projeto

### V1 — Script Python

A primeira versão automatizou o download de uma lista de URLs do YouTube.

Características:

- leitura de URLs a partir de `links.txt`;
- remoção de URLs duplicadas;
- suporte a comentários e linhas vazias;
- download com `yt-dlp`;
- extração e conversão para MP3 com FFmpeg;
- retries e continuação de downloads;
- prevenção de sobrescrita de arquivos;
- registro das URLs que falharam em `erros.txt`;
- resumo final de sucessos e erros.

Arquivo principal:

```text
baixar_musicas.py
```

Fluxo da V1:

```text
links.txt
   ↓
Python
   ↓
yt-dlp
   ↓
FFmpeg
   ↓
MP3
```

### V2 — Aplicação Web

A segunda versão substituiu o fluxo baseado exclusivamente em URLs por uma interface web local.

O usuário informa o artista/banda e a quantidade desejada. O backend pesquisa no YouTube, apresenta os resultados e permite iniciar o download das músicas selecionadas.

Fluxo atual:

```text
Usuário
   ↓
Frontend
   ↓ HTTP/REST
FastAPI
   ↓
yt-dlp / pesquisa
   ↓
Lista de músicas
   ↓
Usuário seleciona
   ↓
FastAPI
   ↓
yt-dlp + FFmpeg
   ↓
Downloads/YouTube Music Downloader
```

---

## 🏗️ Arquitetura atual

```text
┌──────────────────────────┐
│        Browser           │
│  HTML + CSS + JavaScript │
└────────────┬─────────────┘
             │ HTTP
             ▼
┌──────────────────────────┐
│        FastAPI            │
│                           │
│  /api/health              │
│  /api/search              │
│  /api/download            │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│         yt-dlp            │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│         FFmpeg            │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Downloads do usuário      │
│ YouTube Music Downloader  │
└──────────────────────────┘
```

---

## 📁 Estrutura atual

```text
youtube-music-downloader/
│
├── backend/
│   └── main.py
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── baixar_musicas.py
├── requirements.txt
├── README.md
└── .gitignore
```

A V1 permanece no projeto como referência da evolução. A V2 utiliza o diretório `backend/` e o diretório `frontend/`.

---

## 🔎 Pesquisa de músicas

A interface permite informar:

- artista ou banda;
- quantidade de resultados, de 1 a 50.

Exemplo:

```text
Artista: Linkin Park
Quantidade: 10
```

O backend utiliza o `yt-dlp` para realizar a pesquisa e retorna os resultados para o frontend.

Cada resultado contém um identificador, título e URL do vídeo.

Endpoint:

```text
POST /api/search
```

Exemplo de requisição:

```json
{
  "artist": "Linkin Park",
  "quantity": 5
}
```

---

## ⬇️ Download

Depois da pesquisa, o usuário pode remover músicas da lista e iniciar o download das restantes.

Endpoint:

```text
POST /api/download
```

O backend executa o fluxo:

```text
yt-dlp
   ↓
download do áudio
   ↓
FFmpeg
   ↓
MP3
```

### Pasta de destino

Os arquivos são salvos automaticamente na pasta Downloads do usuário:

```text
Downloads/YouTube Music Downloader
```

No Windows:

```text
C:\Users\<USUARIO>\Downloads\YouTube Music Downloader
```

A pasta é criada automaticamente quando necessário. Dessa forma, o projeto não depende de um caminho fixo como `E:\Musicas`.

---

## 🧪 Testes realizados

Durante o desenvolvimento da V2 foram validados:

- inicialização do FastAPI com Uvicorn;
- endpoint `/api/health`;
- documentação Swagger em `/docs`;
- pesquisa de músicas com `/api/search`;
- execução do `yt-dlp` utilizando o Python do ambiente virtual;
- download de áudio;
- conversão para MP3 com FFmpeg;
- criação automática da pasta de Downloads;
- download de múltiplas músicas;
- comunicação entre frontend e backend.

Exemplo de health check:

```text
GET http://127.0.0.1:8000/api/health
```

Resposta:

```json
{
  "status": "ok"
}
```

---

## 🛠️ Tecnologias

- Python 3
- FastAPI
- Uvicorn
- yt-dlp
- FFmpeg
- HTML5
- CSS3
- JavaScript
- REST API
- Git
- GitHub

---

## 📋 Pré-requisitos

### Python

Verifique a instalação:

```powershell
python --version
```

### Ambiente virtual

Crie um ambiente virtual:

```powershell
python -m venv .venv
```

Ative no Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

### Dependências Python

Instale:

```powershell
pip install -r requirements.txt
```

As principais dependências são:

```text
fastapi
uvicorn[standard]
yt-dlp
```

### FFmpeg

O FFmpeg é necessário para a conversão do áudio para MP3.

Verifique:

```powershell
ffmpeg -version
```

---

## ▶️ Executando a V2

Com o ambiente virtual ativado, a partir da raiz do projeto:

```powershell
python -m uvicorn backend.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

Frontend local:

```text
file:///C:/Users/<USUARIO>/Documents/youtube-music-downloader/frontend/index.html
```

> O caminho do frontend varia conforme a pasta onde o projeto foi clonado.

---

## 🖥️ Como utilizar

1. Inicie o backend com Uvicorn.
2. Abra `frontend/index.html` no navegador.
3. Informe o artista ou banda.
4. Escolha a quantidade de músicas.
5. Clique em **Buscar músicas**.
6. Remova da lista as músicas que não deseja baixar.
7. Clique em **Baixar selecionadas**.
8. Os MP3 serão salvos em `Downloads/YouTube Music Downloader`.

---

## 📝 Logs do backend

A V2 mantém logs no backend para facilitar diagnóstico durante o desenvolvimento.

Exemplos:

```text
SONGS RECEBIDAS: [...]
PROCESSANDO: In The End
PYTHON USADO: C:\...\.venv\Scripts\python.exe
RETORNO: 0
ERRO YT-DLP:
```

Esses logs ajudam a identificar problemas de ambiente, execução do `yt-dlp`, conversão e downloads individuais.

---

## 🔐 Privacidade

O processamento é local. Os arquivos baixados são armazenados no computador do usuário e o repositório não contém músicas, arquivos de áudio, credenciais ou tokens de acesso.

---

## 📌 Roadmap

### V1 — CLI

- [x] Download através de URLs
- [x] Conversão para MP3
- [x] Metadados
- [x] Retry
- [x] Continuação de downloads
- [x] Registro de erros

### V2 — Web App

- [x] Backend FastAPI
- [x] Frontend HTML/CSS/JavaScript
- [x] Pesquisa por artista/banda
- [x] Seleção e remoção de músicas
- [x] Download em lote
- [x] Conversão para MP3
- [x] Pasta Downloads automática
- [x] Logs no backend

### Próximas evoluções

- [ ] Melhorar o algoritmo de filtragem dos resultados do YouTube
- [ ] Melhorar ranking/seleção de músicas
- [ ] Selecionar/desselecionar todas
- [ ] Exibir progresso individual dos downloads
- [ ] Exibir erros detalhados no frontend
- [ ] Escolha da pasta de destino pelo usuário
- [ ] Histórico de downloads
- [ ] Tratamento de músicas duplicadas
- [ ] Melhor gerenciamento de metadados MP3
- [ ] Interface mais moderna
- [ ] Chrome Extension
- [ ] Empacotamento da aplicação para Windows

---

## 👨‍💻 Autor

**Robson Scavazzini**

GitHub: [@rob134](https://github.com/rob134)

---

## ⭐ Projeto

Projeto desenvolvido para estudo prático de Python, APIs REST, automação, integração com ferramentas CLI, frontend web e evolução incremental de software.
