# YouTube Music Downloader

Script em Python para baixar áudio de vídeos do YouTube e convertê-lo automaticamente para MP3 usando `yt-dlp` e FFmpeg.

> **Objetivo:** automatizar o download de uma lista de URLs do YouTube para uma pasta local no Windows, mantendo o projeto simples e fácil de evoluir.

## ⚠️ Uso responsável

Use este projeto somente para conteúdos que você tem autorização para baixar ou para os quais o download seja permitido pelos termos aplicáveis. O projeto não hospeda, distribui ou inclui arquivos de música.

## ✨ Funcionalidades

- Leitura de URLs a partir de um arquivo `links.txt`.
- Remoção automática de URLs duplicadas.
- Ignora linhas vazias e comentários iniciados com `#`.
- Download utilizando `yt-dlp`.
- Extração automática do áudio.
- Conversão para MP3 usando FFmpeg.
- Melhor qualidade de áudio disponível (`--audio-quality 0`).
- Inclusão de metadados no arquivo de áudio.
- Tentativas automáticas em caso de falha.
- Suporte à continuação de downloads interrompidos.
- Evita sobrescrever arquivos já existentes.
- Continua processando a lista mesmo quando uma URL apresenta erro.
- Gera `erros.txt` com as URLs que falharam.
- Exibe um resumo final com quantidade de sucessos e erros.

## 🧰 Tecnologias

- Python 3
- yt-dlp
- FFmpeg
- PowerShell / Windows

## 📋 Pré-requisitos

### 1. Python

Instale o Python 3 no Windows e confirme no PowerShell:

```powershell
python --version
```

### 2. yt-dlp

Instale o `yt-dlp`:

```powershell
python -m pip install -U yt-dlp
```

Confirme:

```powershell
python -m yt_dlp --version
```

### 3. FFmpeg

O FFmpeg é necessário para a conversão do áudio para MP3.

Confirme se está instalado:

```powershell
ffmpeg -version
```

No Windows, o FFmpeg pode ser instalado por um gerenciador de pacotes como o `winget`, desde que o pacote desejado esteja disponível no ambiente.

## 📁 Estrutura esperada

O script utiliza atualmente a seguinte estrutura no computador:

```text
E:\Musicas\
├── baixar_musicas.py
├── links.txt
├── musica1.mp3
├── musica2.mp3
└── erros.txt          # criado somente se houver falhas
```

**Importante:** os arquivos MP3, `links.txt` e `erros.txt` são arquivos locais e não fazem parte deste repositório.

## 🔗 Criando o `links.txt`

Crie o arquivo:

```text
E:\Musicas\links.txt
```

Coloque uma URL por linha:

```text
https://www.youtube.com/watch?v=EXEMPLO1
https://www.youtube.com/watch?v=EXEMPLO2
https://www.youtube.com/watch?v=EXEMPLO3
```

Também é possível utilizar comentários:

```text
# Minha playlist
https://www.youtube.com/watch?v=EXEMPLO1
https://www.youtube.com/watch?v=EXEMPLO2
```

URLs repetidas são automaticamente eliminadas pelo script.

## ▶️ Como executar

Abra o PowerShell e execute:

```powershell
cd E:\Musicas
python baixar_musicas.py
```

O programa irá:

1. Verificar se `links.txt` existe.
2. Ler as URLs.
3. Remover duplicadas e linhas inválidas.
4. Processar cada URL individualmente.
5. Baixar o melhor áudio disponível.
6. Converter o áudio para MP3.
7. Adicionar metadados.
8. Continuar para a próxima URL em caso de falha.
9. Criar `erros.txt` caso existam URLs que não puderam ser processadas.
10. Mostrar um resumo no final.

## 🖥️ Exemplo de saída

```text
============================================================
      DOWNLOAD DE MÚSICAS - YT-DLP
============================================================
URLs encontradas: 10
Destino: E:\Musicas
============================================================

[1/10]
URL: https://www.youtube.com/watch?v=EXEMPLO
...
OK

============================================================
FINALIZADO
============================================================
Total de URLs : 10
Sucesso       : 9
Erros         : 1
Destino       : E:\Musicas
URLs com erro : E:\Musicas\erros.txt
============================================================
```

## 🔄 Downloads interrompidos

O script utiliza opções para tentar continuar downloads incompletos e evitar baixar novamente arquivos que já existem.

Isso é especialmente útil quando uma lista possui muitas URLs ou quando a conexão apresenta instabilidade.

## ❌ Tratamento de erros

Quando uma URL não consegue ser processada, o programa registra a URL em memória e continua para a próxima.

Ao final, se houver falhas, é criado:

```text
E:\Musicas\erros.txt
```

Exemplo:

```text
https://www.youtube.com/watch?v=URL_COM_ERRO_1
https://www.youtube.com/watch?v=URL_COM_ERRO_2
```

Isso permite executar novamente apenas as URLs problemáticas.

## ⚙️ Configuração

As principais configurações ficam no início de `baixar_musicas.py`:

```python
LINKS_FILE = Path(r"E:\Musicas\links.txt")
OUTPUT_DIR = Path(r"E:\Musicas")
```

Para usar outra pasta, altere esses caminhos.

Por exemplo:

```python
LINKS_FILE = Path(r"C:\Users\Robson\Music\links.txt")
OUTPUT_DIR = Path(r"C:\Users\Robson\Music")
```

## 🧪 Teste rápido

Antes de executar uma lista grande, é recomendado testar uma única URL diretamente:

```powershell
cd E:\Musicas
python -m yt_dlp -x --audio-format mp3 --audio-quality 0 "https://www.youtube.com/watch?v=EXEMPLO"
```

Se o comando funcionar, o ambiente `yt-dlp + FFmpeg` está preparado para o script.

## 🚀 Roadmap

Este projeto pode evoluir além do script de linha de comando.

### Versão atual — CLI

- [x] Leitura de URLs
- [x] Download automático
- [x] Conversão para MP3
- [x] Metadados
- [x] Retry
- [x] Continuação de downloads
- [x] Registro de erros

### Próxima evolução — API Python

- [ ] Criar uma API local com FastAPI.
- [ ] Endpoint para receber uma URL.
- [ ] Endpoint para iniciar downloads.
- [ ] Status do download.
- [ ] Histórico de downloads.
- [ ] Validação de URLs.

### Evolução futura — Extensão Chrome

A ideia é transformar o projeto em uma extensão do Chrome capaz de enviar a URL da página atual para uma aplicação Python local.

Arquitetura planejada:

```text
┌──────────────────────┐
│   Chrome Extension   │
│                      │
│  Botão "Baixar MP3"  │
└──────────┬───────────┘
           │ HTTP
           ▼
┌──────────────────────┐
│   Python / FastAPI   │
│                      │
│ API local            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│       yt-dlp         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│       FFmpeg         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│     Pasta local      │
│      E:\Musicas      │
└──────────────────────┘
```

A extensão ficaria responsável pela interface e pela captura da URL, enquanto o Python continuaria responsável pelo processamento local.

## 🔐 Privacidade

O projeto foi pensado para processamento local. As URLs são lidas pelo script no computador e os arquivos resultantes são salvos na pasta configurada pelo usuário.

Este repositório não contém músicas, arquivos de áudio baixados, credenciais ou tokens de acesso.

## 📄 Licença

Este projeto pode ser licenciado e distribuído conforme a licença escolhida pelo mantenedor do repositório. Caso nenhuma licença tenha sido adicionada, o código permanece sem uma licença open source explícita.

## 👨‍💻 Autor

**Robson Scavazzini**

GitHub: [@rob134](https://github.com/rob134)

## ⭐ Projeto

Se este projeto for útil para seus estudos de Python, automação, integração com ferramentas CLI e desenvolvimento de extensões Chrome, considere deixar uma estrela no repositório.

---

## 📌 Evolução recente — V2 Web Application

A partir da versão inicial em CLI, o projeto começou a evoluir para uma aplicação web local.

### O que foi implementado

- Backend em FastAPI.
- Frontend em HTML, CSS e JavaScript.
- Endpoint de health check: `GET /api/health`.
- Endpoint de pesquisa: `POST /api/search`.
- Endpoint de download: `POST /api/download`.
- Pesquisa de músicas por artista/banda utilizando `yt-dlp`.
- Seleção e remoção de músicas pela interface.
- Download de múltiplas músicas.
- Conversão para MP3 utilizando FFmpeg.
- Execução do `yt-dlp` através do Python do ambiente virtual (`sys.executable`).
- Logs no backend para acompanhamento do processamento e diagnóstico de erros.
- Criação automática da pasta de destino na pasta Downloads do usuário.

### Pasta de destino da V2

A aplicação não depende mais de um caminho fixo como `E:\Musicas`.

Os downloads são armazenados por padrão em:

```text
C:\Users\<USUARIO>\Downloads\YouTube Music Downloader
```

A pasta é criada automaticamente quando necessário.

### Fluxo atual

```text
Frontend
   ↓
FastAPI
   ↓
yt-dlp
   ↓
Resultados da pesquisa
   ↓
Seleção do usuário
   ↓
FastAPI
   ↓
yt-dlp + FFmpeg
   ↓
Downloads do usuário
```

### Validação realizada

A V2 foi testada com downloads reais de músicas, incluindo múltiplos arquivos, confirmando o fluxo completo entre frontend, backend, `yt-dlp` e FFmpeg.

### Próximo commit

O próximo commit deve consolidar as alterações da V2 no código-fonte, incluindo backend, frontend, tratamento de downloads e a evolução da pasta de destino.

Próximas melhorias planejadas incluem progresso individual dos downloads, tratamento de erros na interface, melhoria da seleção dos resultados e opção para o usuário escolher outra pasta de destino.

---

## 🚀 V2 fechada — fila, links, playlists e progresso

A evolução V2 foi ampliada para transformar o downloader em uma aplicação web local completa para gerenciamento de uma fila de downloads.

### 📁 Pasta de destino configurável

- Pasta padrão: `Downloads/YouTube Music Downloader`.
- Botão para abrir o seletor nativo de pastas do Windows.
- Possibilidade de escolher qualquer pasta acessível pelo usuário.
- Botão para restaurar a pasta padrão.
- A pasta selecionada é exibida na interface e utilizada nos próximos downloads.

### 🔗 Entrada de músicas

A fila aceita diferentes formas de entrada:

- Pesquisa por música, artista ou banda.
- Um link individual do YouTube.
- Vários links, um por linha.
- Arquivo `.txt` contendo URLs.
- URL de playlist do YouTube.

Os itens importados são normalizados e duplicados são eliminados antes de entrarem na fila.

### 📋 Gerenciamento da fila

- Cada música aparece na fila com checkbox de seleção.
- O usuário pode desmarcar músicas que não deseja baixar.
- O usuário pode remover itens individualmente.
- A fila pode ser limpa antes do download.
- Resultados de pesquisas e links importados podem ser combinados na mesma fila.

### 📊 Progresso em tempo real

O download deixou de ser uma operação que somente apresenta o resultado no final.

Agora o backend cria um `job_id` para cada lote e o frontend consulta periodicamente seu estado através de:

```text
POST /api/download
GET  /api/download/{job_id}
```

A interface apresenta:

- Música atualmente sendo processada.
- Percentual da música atual.
- Quantidade de músicas concluídas.
- Percentual geral do lote.
- Resultado final com sucessos e falhas.

O backend utiliza a saída de progresso do `yt-dlp` para atualizar o estado do job enquanto o download acontece.

### 📄 Importação de TXT

O endpoint:

```text
POST /api/import-file
```

recebe o arquivo `.txt`, lê as URLs e encaminha o conteúdo para o mesmo mecanismo de importação utilizado pelos links colados na interface.

A importação agora procura URLs em todo o conteúdo do TXT e **não possui limite artificial de 200 músicas**. Todas as URLs válidas encontradas são processadas. Se uma URL falhar, ela é registrada no retorno sem interromper as demais.

O nome do arquivo carregado também é exibido na interface.

### 📑 Playlists

URLs de playlists podem ser informadas diretamente. O backend utiliza o `yt-dlp` para extrair os itens da playlist e transformá-los em músicas individuais na fila.

A extração não possui mais o limite artificial de 200 itens, permitindo carregar todos os itens que o `yt-dlp` conseguir obter.

### 🔎 Busca no YouTube

A interface também permite pesquisar diretamente no YouTube por:

- Nome da música.
- Artista.
- Banda.
- Combinação de música e artista.

Exemplo:

```text
Linkin Park - Numb
```

Os resultados aparecem na interface com checkbox individual. O usuário pode selecionar uma ou várias opções e clicar em **Adicionar selecionadas**. Os resultados escolhidos entram na mesma fila utilizada pelos links, TXT e playlists.

A quantidade de resultados pode ser configurada entre 1 e 50.

### 🔧 Dependências da V2

Além de FastAPI, Uvicorn e `yt-dlp`, o projeto utiliza `python-multipart` para permitir upload de arquivos TXT através da API.

### 🏁 Status da V2

A V2 agora contempla o fluxo principal planejado:

```text
Pesquisa / Link / TXT / Playlist
              ↓
         Normalização
              ↓
       Remoção de duplicados
              ↓
          Fila de músicas
              ↓
      Seleção / remoção
              ↓
       Escolha da pasta
              ↓
       Início do download
              ↓
     Progresso em tempo real
              ↓
       Resultado por música
              ↓
        Resumo final
```

A próxima etapa natural do projeto passa a ser a evolução para uma V3, com recursos como histórico persistente, melhorias de UX, cancelamento de jobs, logs estruturados e possível extensão de navegador.
