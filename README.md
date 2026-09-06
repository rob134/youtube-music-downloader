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
