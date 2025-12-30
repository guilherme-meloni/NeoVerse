# 🌌 NeoVerse

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows-lightgrey.svg)
![Status](https://img.shields.io/badge/status-Alpha-orange.svg)

**O Metaverso que vive dentro do seu PC**

*Explorador de arquivos 3D inspirado em Jurassic Park FSN, Tron e Ready Player One*

**Entre literalmente dentro do seu computador. Transforme pastas em cidades cyberpunk. Navegue seus arquivos em primeira pessoa.**

[Instalação](#-instalação) • [Funcionalidades](#-funcionalidades) • [Uso](#-como-usar) • [Visão Futura](#-visão-futura) • [Contribuir](#-contribuindo)

---

https://github.com/seu-usuario/neoverse/assets/demo.gif

</div>

---

## 🎯 O que é NeoVerse?

**NeoVerse** é um explorador de arquivos tridimensional experimental onde **cada janela é um universo independente**. Navegue pelo seu sistema de arquivos como se estivesse dentro de uma metrópole cyberpunk, onde cada pasta é um prédio e cada arquivo é um objeto interativo que você pode pegar, manipular e visualizar.

Não é apenas um visualizador 3D - é um **metaverso local** rodando no seu próprio computador.

### 🌟 Conceito Principal

```
📁 Pasta no disco       →  🏢 Prédio arquitetônico na cidade
📄 Arquivo              →  💎 Objeto 3D interativo  
🪟 Janela do programa   →  🌍 Universo independente
🔗 Janelas sobrepostas  →  🌌 Universos mesclados em tempo real
👤 Você                 →  🎮 Avatar navegando em primeira pessoa
```

### 💡 Por que isso existe?

Imagine um programador trabalhando remotamente:

1. Coloca o headset VR (futuramente)
2. Entra na **pasta do projeto**
3. Está em uma **sala real** com arquivos na mesa
4. Pega o arquivo `.env` **na mão** e lê como papel
5. Quer editar? Joga na mesa e abre uma tela de 90" flutuante
6. Precisa do arquivo do GitHub da empresa? Abre uma **porta** na sala
7. Atravessa e está **dentro da sala do projeto da empresa** do outro lado do mundo
8. Trabalha lá diretamente
9. Termina o expediente? **Tira o headset**
10. Quarto limpo, mesa organizada
11. Todo o trabalho **dentro da pasta digital**
12. Amanhã é só reabrir e está tudo como deixou

**Esse é o futuro do NeoVerse.**

---

## ✨ Funcionalidades Atuais

### 🎮 Modos de Visualização

#### 🌐 Modo Orbital (3D)
Controles estilo Blender para navegar, rotacionar e manipular objetos:
- Orbitar câmera com botão do meio do mouse
- Pan com Shift + botão do meio
- Zoom com scroll
- Arrastar objetos com clique esquerdo

#### 🚶 Modo FPS (Primeira Pessoa)
Ande **literalmente dentro** do seu sistema de arquivos:
- Física realista com gravidade e colisão
- Controle WASD para movimento
- Pular, correr, interagir
- Mouse trava automaticamente (Pointer Lock API)
- Suporte a joystick virtual em mobile

### 🏙️ Sistema de Cidades - **A Magia do NeoVerse**

**Escolha qualquer pasta do seu PC e veja ela se transformar em uma cidade cyberpunk navegável.**

```javascript
📂 Seu Projeto/
├── 📁 src/             → 🏢 Prédio de Tecnologia (18 andares, azul néon)
├── 📁 node_modules/    → 🏭 Complexo Industrial (cinza, baixo)
├── 📁 images/          → 🎨 Galeria de Arte (roxo, transparente)
├── 📁 docs/            → 📚 Biblioteca (marrom, com estantes)
├── 📁 .git/            → 🏚️ Estrutura Escondida (escura, pequena)
└── 📄 README.md        → 💎 Monumento Cristalino no centro
```

**O algoritmo inteligente analisa:**
- Nome das pastas (src, node_modules, docs...)
- Quantidade de arquivos
- Tipos de arquivos (código, imagens, vídeos...)
- Cria arquitetura **procedural** baseada no conteúdo

**Layout Orgânico:**
- Distribuição Phyllotaxis (espiral áurea) para distribuir prédios
- Não é grid - é orgânico como cidade real
- Praças, parques e espaços abertos gerados automaticamente
- Iluminação dinâmica (postes de luz, janelas acesas)

### 🏛️ Lobbies Temáticos Inteligentes

Quando você **entra em uma pasta-prédio**, o NeoVerse cria salas temáticas baseadas no conteúdo:

#### 🖼️ Galeria (Pastas com imagens)
- Quadros nas paredes com molduras
- Iluminação suave tipo museu
- Esculturas abstratas no centro
- Cada arquivo é uma obra de arte

#### 🖥️ Sala de Servidores (Pastas com código)
- Racks de servidores em corredores
- LEDs verdes e vermelhos piscando
- Névoa verde tipo Matrix
- Wireframe nos objetos
- Cada arquivo é um servidor torre

#### 📚 Biblioteca (Pastas com documentos)
- Estantes de madeira
- Livros organizados
- Iluminação quente alaranjada
- Cada arquivo é um livro na prateleira

#### 🎬 Cinema (Pastas com vídeos)
- Tela gigante 16:9 na frente
- Poltronas vermelhas em fileiras
- Cada arquivo é uma poltrona
- Atmosfera escura

#### 🏢 Lobby Genérico
- Sala padrão com objetos em espiral
- Elevadores nos cantos para subpastas

**Portal de Retorno:**
- Sempre há um portal dourado para voltar ao nível anterior
- Navegação intuitiva entre níveis de diretórios

### 🌐 Sistema Multi-Universo

**A funcionalidade mais única do NeoVerse:**

1. Abra múltiplas janelas do programa
2. Cada janela é um **universo independente** com seus próprios objetos
3. Aproxime as janelas fisicamente na tela
4. Quando elas **se sobrepõem**, os universos **se mesclam**
5. Objetos de outros universos aparecem como "fantasmas" translúcidos
6. Sincronização automática via Tauri Events (IPC)

```
Janela 1 (Universo A)     Janela 2 (Universo B)
    🔵 🔴 ⭐                    🟢 🟡 💠

    Aproxime as janelas...

Janela 1                  Janela 2
    🔵 🔴 ⭐                    🟢 🟡 💠
    👻🟢 👻🟡 👻💠              👻🔵 👻🔴 👻⭐
    ↑ fantasmas               ↑ fantasmas
```

**Futuro:** Universos em rede LAN e servidores remotos

### 🎨 Sistema de Qualidade Adaptativo

**Roda em QUALQUER máquina - de um Pentium 4 até uma RTX 4090**

#### 👾 Modo Retro
- Materiais básicos (MeshBasicMaterial)
- Sem sombras
- Sem pós-processamento
- Renderização pixelada (retro aesthetic)
- **30-60 FPS em hardware de 2010**

#### ✨ Modo Ultra
- Materiais PBR (MeshStandardMaterial)
- Sombras dinâmicas PCF suaves
- Bloom (brilho)
- Antialiasing
- Névoa atmosférica
- Luzes volumétricas
- **60+ FPS em hardware moderno**

**Configurações granulares:**
- Sombras on/off
- Bloom on/off
- Antialiasing on/off
- Névoa on/off

### 🛠️ Ferramentas e Utilitários

#### 💻 Terminal Integrado
Console Unix-like com comandos:
```bash
~ $ help          # Lista todos os comandos
~ $ ls            # Lista prédios/arquivos na cidade
~ $ pwd           # Caminho atual
~ $ spawn 5       # Cria 5 objetos aleatórios
~ $ fps           # Estatísticas de performance
~ $ echo [txt]    # Exibe texto
~ $ clear         # Limpa terminal
~ $ exit          # Fecha terminal
```

Atalho: **T** para abrir/fechar

#### 🎨 Drag & Drop de Texturas
- Arraste qualquer imagem PNG/JPG para um objeto
- Aplica como textura automaticamente
- Funciona em qualquer objeto 3D

#### ✏️ Editor de Objetos em Tempo Real
Clique em qualquer objeto seu para editar:
- 🎨 **Cor** (picker visual)
- 📏 **Tamanho** (slider de 0.1x a 3x)
- 🧱 **Físico** (checkbox de colisão)
- Aplicação instantânea
- Sincronizado entre universos

#### 📦 Objetos Primitivos
Crie formas 3D básicas:
- 🔵 Esfera
- 🧊 Cubo
- 🔺 Pirâmide
- 🥫 Cilindro
- 🍩 Toroide
- ⭐ Node (esfera emissiva)

#### 📂 Sistema de Arquivos 3D (Legacy)
Versão simplificada antes das Cidades:
- Cria grade com arquivos e pastas
- Cores baseadas em tipo de arquivo
- Duplo clique abre arquivo no sistema

---

## 📦 Instalação

### ⚙️ Pré-requisitos

<details>
<summary><b>🐧 Linux (Debian/Ubuntu/Mint)</b></summary>

```bash
# Atualizar repositórios
sudo apt update

# Instalar dependências do Tauri
sudo apt install -y \
    libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

# Instalar Node.js (caso não tenha)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar pnpm
npm install -g pnpm

# Instalar Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**Arch/Manjaro:**
```bash
sudo pacman -S webkit2gtk base-devel curl wget file openssl gtk3 libappindicator-gtk3 librsvg
```

**Fedora:**
```bash
sudo dnf install webkit2gtk4.0-devel openssl-devel curl wget file gcc gtk3-devel libappindicator-gtk3-devel librsvg2-devel
sudo dnf group install "C Development Tools and Libraries"
```

</details>

<details>
<summary><b>🪟 Windows 10/11</b></summary>

1. **Instalar Node.js**  
   Download: https://nodejs.org/ (versão LTS)

2. **Instalar Rust**  
   Download: https://rustup.rs/  
   Seguir instruções do instalador

3. **Instalar Microsoft C++ Build Tools**  
   Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/  
   Marcar "Desktop development with C++"

4. **Instalar pnpm** (opcional mas recomendado)
   ```cmd
   npm install -g pnpm
   ```

5. **Instalar WebView2** (geralmente já vem no Windows 11)  
   Download: https://developer.microsoft.com/microsoft-edge/webview2/

</details>

<details>
<summary><b>🍎 macOS (NÃO SUPORTADO ainda)</b></summary>

Infelizmente não temos hardware para testar em macOS. Contribuições são bem-vindas!

O Tauri suporta macOS, então teoricamente deveria funcionar com:
```bash
xcode-select --install
brew install node
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
npm install -g pnpm
```

Se você testar, por favor reporte!

</details>

---

### 🚀 Instalação Rápida

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/neoverse.git
cd neoverse

# 2. Instale dependências JavaScript
pnpm install
# ou: npm install

# 3. Execute em modo desenvolvimento
pnpm run tauri:dev
# ou: npm run tauri:dev
```

**Pronto!** Uma janela deve abrir com o NeoVerse rodando.

---

### 📦 Build para Produção (Executável Nativo)

```bash
# Build otimizado
pnpm run tauri:build
```

**Aguarde 2-5 minutos** (primeira build compila Rust)

**Artefatos gerados em `src-tauri/target/release/bundle/`:**

- **🐧 Linux:**
  - `deb/neoverse_1.0.0_amd64.deb` (Debian/Ubuntu)
  - `appimage/neoverse_1.0.0_amd64.AppImage` (Universal)

- **🪟 Windows:**
  - `nsis/neoverse_1.0.0_x64-setup.exe` (Instalador)

**Tamanho:** ~5-15 MB (100x menor que Electron!)

#### Instalar no Linux:
```bash
# Debian/Ubuntu
sudo dpkg -i neoverse_1.0.0_amd64.deb

# AppImage (qualquer distro)
chmod +x neoverse_1.0.0_amd64.AppImage
./neoverse_1.0.0_amd64.AppImage
```

---

## 🎮 Como Usar

### 🌟 Primeiros Passos

1. **Abra o programa** - Uma janela com grade verde 3D aparece
2. **Menu lateral** - Clique no botão **☰** no canto superior esquerdo
3. **Adicione objetos de teste** - Aba **OBJ** → Clique em **Esfera**, **Cubo**, etc
4. **Crie sua primeira cidade** - Aba **MUNDO** → **🏙️ Criar Cidade** → Escolha uma pasta
5. **Entre no modo FPS** - Aba **MUNDO** → **👁️ Entrar em FPS**
6. **Explore!** - Use WASD para andar, E para interagir

### ⌨️ Controles Completos

#### 🌐 Modo 3D (Orbital / Blender-style)

| Ação | Controle |
|------|----------|
| **Orbitar câmera** | 🖱️ Botão do Meio (scroll wheel click) + arrastar |
| **Pan (mover visão)** | 🖱️ Shift + Botão do Meio + arrastar |
| **Zoom** | 🖱️ Scroll para cima/baixo |
| **Selecionar objeto** | 🖱️ Clique Esquerdo |
| **Arrastar objeto** | 🖱️ Clique Esquerdo + arrastar |
| **Editar objeto** | 🖱️ Duplo Clique |
| **Aplicar textura** | 🖱️ Arrastar imagem para objeto |
| **Abrir arquivo** | 🖱️ Duplo Clique (em objetos de arquivo) |

#### 🚶 Modo FPS (Primeira Pessoa)

| Ação | Controle |
|------|----------|
| **Mover** | W A S D |
| **Correr** | Shift (segurar) |
| **Pular** | Espaço |
| **Olhar** | Mouse (trava automaticamente) |
| **Interagir** | E |
| **Terminal** | T |
| **Sair do FPS** | ESC |

**📱 Mobile/Touch:**
- Joystick virtual no canto inferior esquerdo
- Arraste para mover
- Tap próximo de portas para interagir

#### 🏙️ Navegando na Cidade

| Ação | Como |
|------|------|
| **Entrar em prédio** | Aproxime-se da porta verde e pressione **E** |
| **Abrir arquivo** | Aproxime-se do monumento/objeto e pressione **E** |
| **Voltar ao nível anterior** | Encontre o portal dourado e pressione **E** |
| **Ver nome do prédio** | Placa flutuante no topo do prédio |

#### 💻 Terminal

```bash
# Abrir terminal
Pressione T (ou clique no botão TERMINAL na parte inferior)

# Comandos disponíveis:
help          # Lista comandos
ls            # Lista itens da cidade atual
pwd           # Mostra caminho atual no sistema
spawn N       # Cria N objetos aleatórios (max 10)
fps           # Mostra FPS e estatísticas
echo [texto]  # Exibe texto
clear         # Limpa tela
exit          # Fecha terminal

# Histórico:
Seta para Cima/Baixo    # Navegar comandos anteriores
ESC                      # Fechar terminal
```

---

## 🎨 Interface

### Menu Lateral (☰)

#### 📦 Aba OBJ (Objetos)
- Botões para criar primitivos (esfera, cubo, etc)
- Botão para remover seleção
- Lista de todos os objetos na cena
- Objetos "fantasmas" de outros universos marcados

#### 🌍 Aba MUNDO
- **🪟 Nova Janela** - Abre novo universo
- **📂 Criar Sala (FSN)** - Versão legacy de visualização 3D
- **🏙️ Criar Cidade** - **A feature principal!**
- **👁️ Alternar FPS / 3D** - Muda modo de visão

#### 🌐 Aba REDE (Futuro)
- **Meu Código** - Código de 6 dígitos do seu universo
- **Conectar** - Conecta ao servidor WebSocket
- **Mesclar Universos** - Digite código de outro universo
- Status: Online/Offline

#### 🎨 Aba GFX (Gráficos)
- **👾 RETRO** - Máxima performance
- **✨ ULTRA** - Máxima qualidade
- Checkboxes individuais:
  - Sombras
  - Bloom
  - Antialiasing
  - Névoa
- Contador de FPS

### HUD (Heads-Up Display)

**Canto Superior Esquerdo:**
```
MODE: 3D ORBITAL / FPS MODE
Janela #1 | Objetos: 5 | Overlaps: 2
● Ativo / Mesclando!
Render: 60 FPS
```

**Centro da Tela (FPS Mode):**
```
    ·  ← Crosshair (mira)
```

**Prompt de Interação:**
```
[E] ENTRAR: src/
[E] ABRIR: main.js
[E] VOLTAR (..)
```

---

## 🏗️ Arquitetura Técnica

### Stack de Tecnologia

```
┌─────────────────────────────────────────┐
│         Frontend (Three.js)             │
│  ┌──────────────────────────────────┐   │
│  │   Universe.js (Motor 3D)         │   │
│  │   - Renderização WebGL           │   │
│  │   - Física e colisão             │   │
│  │   - Modos Orbital/FPS            │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │   CityManager.js                 │   │
│  │   - Geração procedural           │   │
│  │   - Phyllotaxis layout           │   │
│  │   - Lobbies temáticos            │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │   ObjectManager.js               │   │
│  │   - CRUD de objetos              │   │
│  │   - Sincronização Tauri Events   │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │   WindowManager.js               │   │
│  │   - Detecção overlap             │   │
│  │   - Bounds tracking              │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │   Terminal.js                    │   │
│  │   - Console interativo           │   │
│  │   - Comandos Unix-like           │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │   NetworkManager.js              │   │
│  │   - WebSocket client             │   │
│  │   - Sincronização remota         │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
                   ↕ Tauri IPC
┌─────────────────────────────────────────┐
│         Backend (Tauri/Rust)            │
│  ┌──────────────────────────────────┐   │
│  │   File System API                │   │
│  │   - readDir (recursivo)          │   │
│  │   - Permissões seguras           │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │   Shell API                      │   │
│  │   - open() para arquivos         │   │
│  │   - Abre no programa padrão      │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │   Window API                     │   │
│  │   - Múltiplas janelas            │   │
│  │   - Posição e tamanho            │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Comunicação

- **Intra-processo:** Tauri Events (IPC zero-copy)
- **Inter-janelas:** Broadcast via Tauri global events
- **Rede (futuro):** WebSocket para servidores

### Estrutura de Diretórios

```
neoverse/
├── src/                      # Frontend JavaScript
│   ├── main.js              # Entry point
│   ├── Universe.js          # Motor 3D principal
│   ├── CityManager.js       # Gerador de cidades
│   ├── ObjectManager.js     # Gerenciador de objetos
│   ├── WindowManager.js     # Detecção de overlap
│   ├── NetworkManager.js    # Cliente WebSocket
│   └── Terminal.js          # Console
├── src-tauri/               # Backend Rust
│   ├── src/
│   │   └── main.rs         # Apenas bootstrap Tauri
│   ├── Cargo.toml          # Dependências Rust
│   └── tauri.conf.json     # Configuração Tauri
├── index.html              # HTML principal
├── package.json            # Dependências Node
└── vite.config.js          # Configuração Vite
```

### Otimizações

**Rust (`Cargo.toml`):**
```toml
[profile.release]
panic = "abort"      # Remove unwinding
codegen-units = 1    # Melhor otimização
lto = true           # Link-time optimization
opt-level = "z"      # Otimiza para TAMANHO
strip = true         # Remove símbolos
```

**Resultado:** Binário final ~5-15 MB

**Frontend:**
- Throttling de frame rate (60 FPS cap)
- Culling de objetos fora da câmera
- LOD (Level of Detail) em cidades grandes
- Lazy loading de texturas
- Pooling de geometrias

---

## 🔮 Visão Futura - O Roadmap

Este projeto está em **desenvolvimento ativo** e tem uma visão extremamente ambiciosa.

### 📅 Roadmap Detalhado

#### ✅ v1.0 - Fundação (ATUAL)
- [x] Motor 3D com Three.js
- [x] Modo Orbital e FPS
- [x] Sistema de Cidades procedurais
- [x] Lobbies temáticos
- [x] Multi-janela com mesclagem
- [x] Terminal integrado
- [x] Sistema de qualidade adaptativo

#### 🚧 v1.1 - Melhorias Imediatas (Próximos 3 meses)
- [ ] Interação completa com objetos de universos mesclados
- [ ] Sistema de física melhorado (colisões mais precisas)
- [ ] Mais tipos arquitetônicos de prédios
- [ ] Sistema de partículas (chuva, neve, fog volumétrico)
- [ ] Suporte a modelos 3D externos (GLTF, OBJ)
- [ ] Preview de arquivos (texto, imagem, PDF) in-game
- [ ] Sistema de áudio 3D (música ambiente, efeitos)
- [ ] Save/Load de cenas customizadas
- [ ] Temas de UI (cyberpunk, minimalista, retro)
- [ ] Melhor performance em cidades gigantes (streaming)

#### 🌐 v2.0 - Networking (6-12 meses)
- [ ] Servidor dedicado em Rust
- [ ] Modo multiplayer LAN
- [ ] Sincronização em tempo real
- [ ] Chat integrado (texto e voz)
- [ ] Avatares customizáveis
- [ ] Sistema de permissões (quem pode editar o quê)
- [ ] Servidor público opcional (hospedagem)
- [ ] Portais entre servidores
- [ ] Descoberta automática de servidores LAN

**Use Case:**
```
Você ← WiFi → Servidor Casa ← Internet → Servidor Empresa
   ↓                ↓                          ↓
Universo A      Universo B              Universo C
   ↓                ↓                          ↓
Seu PC         NAS/Servidor           PC Trabalho
```

#### 🥽 v3.0 - Realidade Virtual (12-18 meses)
- [ ] Suporte a OpenVR/OpenXR
- [ ] Controles VR nativos (Vive, Oculus, Index, etc)
- [ ] Locomotion VR (teleporte, movimento livre)
- [ ] Manipulação direta de objetos com hands tracking
- [ ] Interfaces 3D flutuantes (teclado virtual, painéis)
- [ ] Modo "sala de trabalho" VR
- [ ] Telas virtuais de qualquer tamanho
- [ ] Modo "cinema" para visualizar vídeos
- [ ] Spatialized audio (áudio 3D)

**A Experiência Completa:**

```
1. Coloca headset VR em casa
2. Entra na pasta do projeto "~/trabalho/projeto-x"
3. Está em uma SALA REAL
   - Mesa no centro
   - Arquivos .env, config.json são "folhas de papel" na mesa
   - Arquivos .js, .svelte são "livros" na estante
   - Subpastas são "gavetas"
4. Pega o README.md NA MÃO e LÊ
5. Quer editar? Joga na mesa
6. Abre tela virtual de 90" flutuante
7. Editor de código em 4K virtual
8. Testa em outra tela de 50" ao lado
9. Precisa do repositório GitHub da empresa?
10. Vai até a PORTA na parede
11. Placa na porta: "git@github.com:empresa/repo"
12. ABRE A PORTA
13. Atravessa
14. Está NA SALA DO PROJETO DA EMPRESA
15. Colegas do mundo todo trabalhando juntos
16. Sincronização em tempo real
17. Terminou? TIRA O HEADSET
18. Seu quarto está limpo
19. Todo o trabalho dentro da pasta
20. Amanhã é só reabrir
```

#### 🚀 v4.0 - Além (18+ meses)
- [ ] Mobile (Android/iOS) com ARCore/ARKit
- [ ] Modo AR (Realidade Aumentada)
- [ ] Plugin system (JavaScript)
- [ ] Marketplace de temas e assets
- [ ] IA integrada (assistente virtual)
- [ ] Visualização de dados (gráficos 3D, dashboards)
- [ ] Integração com Git (visualizar commits, branches)
- [ ] Whiteboard colaborativo 3D
- [ ] Gravação de sessões (replay)

---

### 💭 Casos de Uso Futuros

#### 👨‍💻 Desenvolvedor
- Trabalho remoto imersivo
- Code review em VR com colegas
- Visualizar arquitetura de projeto em 3D
- Debug visual (stack trace em espaço 3D)

#### 🎨 Designer
- Visualizar portfolio em galeria 3D
- Apresentar trabalhos para clientes em VR
- Organizar assets por projeto em salas

#### 🎓 Educação
- Professores criando "salas de aula" por matéria
- Alunos explorando material didático em 3D
- Bibliotecas virtuais com livros interativos

#### 🏢 Empresas
- Onboarding imersivo (tour virtual pelo "escritório digital")
- Reuniões em salas virtuais
- Apresentações em 3D
- Acesso a recursos da empresa via portais

#### 🎮 Gamers
- Organizar biblioteca de jogos em galeria
- Mods e saves em salas temáticas
- Screenshots em galeria tipo museu

---

## 🤝 Contribuindo

Este projeto é **100% gratuito e sempre será**. Você pode usar, modificar, distribuir comercialmente - **não há restrições**.

### 🎨 Como Você Pode Ajudar

O NeoVerse precisa de ajuda em várias áreas:

#### 🖌️ Design Visual
- Criar novos tipos de prédios
- Desenhar lobbies temáticos
- Desenvolver shaders customizados
- Criar assets 3D (modelos, texturas)
- Design de UI/UX
- Criar temas de interface

#### ⚡ Performance
- Otimizações para hardware antigo
- Profiling e bottleneck analysis
- Implementar LOD (Level of Detail)
- Streaming de assets
- Melhorar culling
- Web Workers para processamento paralelo

#### 🏗️ Features
- Novos tipos de lobbies
- Mais comandos no terminal
- Sistema de plugins
- Integração com serviços (Git, cloud storage)
- Visualizadores de arquivos (markdown, PDF)
- Sistema de física avançado

#### 🧪 Testes
- Testar em diferentes hardware
- Testar em diferentes sistemas operacionais
- Reportar bugs com detalhes
- Criar casos de teste
- Performance benchmarks

#### 📚 Documentação
- Melhorar este README
- Criar tutoriais em vídeo
- Escrever guias de uso
- Traduzir para outros idiomas
- Documentar código
- Criar wiki

#### 🌐 Networking (v2.0)
- Implementar servidor em Rust
- Protocolos de sincronização
- Sistema de autenticação
- NAT traversal
- Servidor relay

#### 🥽 VR (v3.0)
- Integração OpenVR/OpenXR
- Controles VR
- UI em VR
- Locomotion
- Hand tracking

### 📝 Como Contribuir

1. **Fork** o projeto
2. **Crie uma branch** para sua feature:
   ```bash
   git checkout -b feature/MinhaFeatureFoda
   ```
3. **Commit** suas mudanças:
   ```bash
   git commit -m 'Adiciona MinhaFeatureFoda'
   ```
4. **Push** para a branch:
   ```bash
   git push origin feature/MinhaFeatureFoda
   ```
5. **Abra um Pull Request** explicando:
   - O que sua mudança faz
   - Por que é útil
   - Como testar
   - Screenshots/GIFs se aplicável

### 📋 Guidelines

- **Código limpo** - Comente partes complexas
- **Performance** - Sempre pense em hardware fraco
- **Modular** - Mantenha componentes independentes
- **Testável** - Se possível, adicione forma de testar
- **Documentado** - Atualize README se necessário

### 🐛 Reportando Bugs

Abra uma [Issue](https://github.com/seu-usuario/neoverse/issues) com:

- **Sistema Operacional** (Linux Ubuntu 22.04, Windows 11, etc)
- **Hardware** (GPU, CPU, RAM)
- **Versão do NeoVerse**
- **Passos para reproduzir**
- **Comportamento esperado vs atual**
- **Screenshots/vídeo** se aplicável
- **Logs do console** (F12 no navegador)

---

## 🐛 Problemas Conhecidos

### ⚠️ Limitações Atuais

- **❌ macOS não suportado** - Sem hardware para testar. Contribuições bem-vindas!
- **⚠️ Pointer Lock falha em alguns WMs Linux** - Use fallback com setas do teclado
- **⚠️ Cidades >150 itens são limitadas** - Por performance. Use pastas menores ou hardware melhor
- **⚠️ Objetos de outros universos não editáveis** - Será implementado em v1.1
- **⚠️ WebSocket server não incluído** - Networking será em v2.0
- **⚠️ VR não implementado** - Planejado para v3.0

### 🔧 Workarounds

#### Linux: Pointer Lock não funciona
**Problema:** Em alguns window managers (i3, bspwm), Pointer Lock falha.  
**Solução:** Use as **setas do teclado** para olhar ao redor no modo FPS.

#### Windows: Antivirus bloqueia
**Problema:** Windows Defender pode bloquear o .exe  
**Solução:** Adicione exceção ou compile você mesmo.

#### Performance baixa
**Problema:** FPS abaixo de 30  
**Solução:** 
1. Ative **Modo Retro** no menu GFX
2. Feche outras janelas do NeoVerse
3. Crie cidades com menos itens (<50)
4. Reduza resolução da janela

#### Cidade muito grande
**Problema:** Pasta com 500+ itens trava  
**Solução:** NeoVerse limita automaticamente a 150 itens. Organize melhor suas pastas.

---

## 🙏 Créditos e Inspirações

### 🎨 Inspirações Visuais
- **FSN (Jurassic Park, 1993)** - O explorador de arquivos 3D original da SGI
- **Tron (1982) & Tron Legacy (2010)** - Estética cyberpunk néon
- **Ready Player One (2018)** - Conceito de metaverso imersivo
- **Matrix (1999)** - Código verde, atmosfera digital
- **Blade Runner 2049** - Paleta de cores, arquitetura futurista

### 🛠️ Tecnologias
- **Three.js** - Motor 3D WebGL usado no projeto
- **Tauri** - Framework para apps nativos com web frontend
- **Blender** - Inspiração para controles de câmera orbital
- **Vite** - Build tool ultra-rápido

### 🎮 Jogos
- **Minecraft** - Conceito de mundos modificáveis
- **Garry's Mod** - Liberdade criativa total
- **Portal** - Conceito de portais entre espaços

---

## 📄 Licença

```
MIT License

Copyright (c) 2024 NeoVerse Contributors

É concedida permissão, gratuitamente, a qualquer pessoa que obtenha uma cópia
deste software e arquivos de documentação associados (o "Software"), para lidar
no Software sem restrição, incluindo, sem limitação, os direitos de usar, copiar,
modificar, mesclar, publicar, distribuir, sublicenciar e/ou vender cópias do
Software, e permitir que as pessoas a quem o Software é fornecido o façam,
sujeito às seguintes condições:

O aviso de copyright acima e este aviso de permissão devem ser incluídos em todas
as cópias ou partes substanciais do Software.

O SOFTWARE É FORNECIDO "COMO ESTÁ", SEM GARANTIA DE QUALQUER TIPO, EXPRESSA OU
IMPLÍCITA, INCLUINDO, MAS NÃO SE LIMITANDO ÀS GARANTIAS DE COMERCIALIZAÇÃO,
ADEQUAÇÃO A UM PROPÓSITO ESPECÍFICO E NÃO VIOLAÇÃO. EM NENHUMA CIRCUNSTÂNCIA OS
AUTORES OU DETENTORES DE DIREITOS AUTORAIS SERÃO RESPONSÁVEIS POR QUALQUER
RECLAMAÇÃO, DANOS OU OUTRA RESPONSABILIDADE, SEJA EM AÇÃO DE CONTRATO, DELITO
OU DE OUTRA FORMA, DECORRENTE DE, FORA DE OU EM CONEXÃO COM O SOFTWARE OU O USO
OU OUTRAS NEGOCIAÇÕES NO SOFTWARE.
```

**Tradução simples:** Faça o que quiser. Use comercialmente. Modifique. Distribua. Sem restrições.

## 🚀 Quick Start (TL;DR)

```bash
# Clone
git clone https://github.com/guilherme-meloni/NeoVerse.git
cd NeoVerse

# Instale
pnpm install

# Rode
pnpm run tauri:dev

# Use
☰ Menu → MUNDO → 🏙️ Criar Cidade → Escolha pasta → WASD para andar
```

---

<div align="center">

## ⭐ Se você gostou, dê uma estrela!

### *"O futuro da interação com computadores não é através deles, mas dentro deles."*

**NeoVerse - Entre no Código**

---

Made with 💚 by [GuilhermeM]  
Built with [Three.js](https://threejs.org/) + [Tauri](https://tauri.app/)

[⬆ Voltar ao topo](#-neoverse)

</div>
