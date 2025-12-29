# Multi Universe (univ) 🌌

Multi Universe é uma aplicação Desktop experimental desenvolvida com **Tauri (Rust + Webview)** que transforma o gerenciamento de janelas e arquivos em uma experiência de "Metaverso 3D".

A característica central do projeto é a **interação física entre janelas**: janelas que são arrastadas fisicamente para cima de outras na tela do computador revelam "fantasmas" (projeções) do conteúdo da janela que está embaixo, criando um espaço contínuo entre elas.

## 🚀 Funcionalidades Principais

### 1. Sistema de Múltiplos Universos
- Cada janela do sistema operacional é um universo 3D independente.
- **Overlap System:** Quando a Janela A sobrepõe a Janela B, objetos da Janela B aparecem na Janela A como hologramas interativos.
- Suporte a múltiplas janelas simultâneas.

### 2. FSN (File System Navigator) 📂
Transforme suas pastas do computador em salas 3D navegáveis.
- **Visualização 3D:** Pastas viram objetos físicos extrudados e arquivos viram cápsulas de dados coloridas por tipo (Roxo=Imagens, Verde=Vídeos, Azul=Código, etc).
- **Interação Real:** Clique duplo nos objetos 3D abre o arquivo ou pasta correspondente no seu sistema operacional (Linux/Windows/Mac) usando o programa padrão.
- **Integração:** Os arquivos gerados também aparecem como fantasmas em outras janelas sobrepostas.

### 3. Modos de Visão
- **3D Orbital (Padrão):** Controles estilo Blender. Clique esquerdo seleciona, Scroll dá zoom, Botão do meio orbita/move.
- **FPS (First Person):** Navegação imersiva com `WASD` + Mouse Look, gravidade e colisão.

### 4. Networking
- Capacidade de conectar universos entre computadores diferentes via WebSocket (Merge de universos remotos).

---

## 🛠️ Stack Tecnológica

*   **Backend:** Tauri (Rust) v1
*   **Frontend:** Vanilla JavaScript (ES Modules) - *Sem frameworks como React/Vue*
*   **Engine 3D:** Three.js
*   **Gerenciador de Pacotes:** pnpm

## 🏗️ Arquitetura do Código

O projeto segue uma arquitetura modular em Vanilla JS:

*   **`src/main.js`**: Ponto de entrada. Inicializa os gerenciadores.
*   **`src/Universe.js`**: Wrapper do Three.js. Gerencia a cena, câmera, renderização e inputs do usuário.
*   **`src/WindowManager.js`**: A "mágica" das janelas. Rastreia a posição física da janela no monitor e calcula colisões (overlaps) com outras janelas.
*   **`src/ObjectManager.js`**: Gerencia o estado dos objetos (locais e fantasmas) e a lógica do FSN (leitura de arquivos).
*   **`src/NetworkManager.js`**: Gerencia conexões WebSocket para multiplayer.

### Estrutura de Dados (Objetos 3D)
Todo objeto na cena carrega metadados vitais em `mesh.userData`:
```javascript
mesh.userData = {
  id: "uuid...",
  type: "folder" | "file" | "cube",
  isGhost: boolean,         // True se pertence a outra janela
  properties: {
    filePath: "/caminho/do/arquivo", // Para o FSN
    color: 0xffffff,
    isFileSystem: true
  }
}
```

---

## 📦 Instalação e Uso

### Pré-requisitos
- Rust instalado (`cargo`)
- Node.js
- pnpm

### Rodando o projeto

1. Instale as dependências:
   ```bash
   pnpm install
   ```

2. Inicie o modo de desenvolvimento:
   ```bash
   pnpm tauri dev
   ```

### Comandos Úteis na Interface
- **Botão "Nova Janela":** Abre outro universo. Tente arrastar uma sobre a outra!
- **Botão "Criar Sala (FSN)":** Escolha uma pasta do seu PC para visualizar.
- **Botão "Visão":** Alterna entre modo Mouse/Orbital e FPS.

---

## ⚠️ Notas de Segurança
Este aplicativo é configurado (`tauri.conf.json`) para ter permissões estendidas:
- **`fs`:** Leitura de qualquer diretório selecionado pelo usuário.
- **`shell`:** Capacidade de abrir qualquer arquivo (`open`) no sistema operacional.
- **`allowlist`:** Configuradas para aceitar regex permissiva (`^.*$`) para caminhos de arquivos locais.

---

*Projeto desenvolvido como experimento de interface 3D Desktop.*