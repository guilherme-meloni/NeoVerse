import { WindowManager } from './WindowManager.js';
import { Universe } from './Universe.js';
import { ObjectManager } from './ObjectManager.js';
import { NetworkManager } from './NetworkManager.js';
import { WebviewWindow } from '@tauri-apps/api/window';

let windowManager;
let universe;
let objectManager;
let networkManager;

async function init() {
  console.log('🚀 Iniciando Multi Universe...');

  const canvas = document.getElementById('canvas');

  // Determina se é a primeira janela (tem player)
  const label = (await import('@tauri-apps/api/window')).appWindow.label;
  const isFirstWindow = label.includes('main') || !label.includes('universe-');

  // Inicializa componentes
  windowManager = new WindowManager();
  universe = new Universe(canvas, isFirstWindow);
  networkManager = new NetworkManager(windowManager, null); // objectManager depois
  objectManager = new ObjectManager(windowManager, universe, networkManager);
  
  // Atualiza referência circular
  networkManager.objectManager = objectManager;

  // Aguarda inicialização
  await new Promise(resolve => setTimeout(resolve, 100));

  // Mostra elementos do player se tiver
  if (isFirstWindow) {
    document.getElementById('player-status').style.display = 'flex';
    document.getElementById('view-mode').style.display = 'flex';
    document.getElementById('view-btn').style.display = 'block';
    console.log('🧍 Janela COM player');
  } else {
    console.log('👻 Janela SEM player');
  }

  // Setup controles
  setupControls();

  // Remove info após 8s
  setTimeout(() => {
    const info = document.getElementById('info');
    if (info) {
      info.style.opacity = '0';
      info.style.transition = 'opacity 1s';
      setTimeout(() => info.remove(), 1000);
    }
  }, 8000);

  // Atualiza memória a cada 2s
  setInterval(() => {
    objectManager.updateMemoryUsage();
  }, 2000);

  console.log('✅ App iniciado');
}

function setupControls() {
  // Nova janela
  document.getElementById('new-window-btn').addEventListener('click', async () => {
    const windowCount = windowManager.windows.size;
    const offset = windowCount * 30;

    new WebviewWindow(`universe-${Date.now()}`, {
      url: '/',
      title: `Multi Universe #${windowCount + 1}`,
      width: 800,
      height: 600,
      x: 100 + offset,
      y: 100 + offset,
      decorations: true,
      transparent: false,
      resizable: true,
      fullscreen: false
    });
  });

  // Toggle visão (FPS/3D)
  const viewBtn = document.getElementById('view-btn');
  if (viewBtn) {
    viewBtn.addEventListener('click', () => {
      universe.toggleViewMode();
      universe.updateViewUI();
    });
  }

  // Botão de rede
  document.getElementById('network-btn').addEventListener('click', () => {
    const panel = document.getElementById('network-panel');
    if (panel.style.display === 'none') {
      panel.style.display = 'block';
      
      // Atualiza código
      document.getElementById('my-code-display').textContent = networkManager.myCode;
      
      // Atualiza botão
      const toggleBtn = document.getElementById('network-toggle');
      if (networkManager.connected) {
        toggleBtn.textContent = '🔌 Desconectar';
        toggleBtn.classList.add('connected');
      } else {
        toggleBtn.textContent = '🔌 Conectar Servidor';
        toggleBtn.classList.remove('connected');
      }
    } else {
      panel.style.display = 'none';
    }
  });

  // Funções globais para o painel de rede
  window.closeNetworkPanel = () => {
    document.getElementById('network-panel').style.display = 'none';
  };

  window.toggleNetwork = async () => {
    const toggleBtn = document.getElementById('network-toggle');
    
    if (networkManager.connected) {
      networkManager.disconnect();
      toggleBtn.textContent = '🔌 Conectar Servidor';
      toggleBtn.classList.remove('connected');
    } else {
      await networkManager.connect();
      toggleBtn.textContent = '🔌 Desconectar';
      toggleBtn.classList.add('connected');
      
      // Atualiza código
      document.getElementById('my-code-display').textContent = networkManager.myCode;
    }
  };

  window.connectRemote = () => {
    const input = document.getElementById('remote-code-input');
    const code = input.value.toUpperCase().trim();
    
    if (code.length !== 6) {
      alert('❌ Código deve ter 6 caracteres');
      return;
    }

    networkManager.mergeWithUniverse(code);
    input.value = '';
  };

  // Enter no input de código
  document.getElementById('remote-code-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      window.connectRemote();
    }
  });

  // Adicionar objetos
  document.getElementById('sphere-btn').addEventListener('click', () => {
    objectManager.addObject('sphere');
  });

  document.getElementById('cube-btn').addEventListener('click', () => {
    objectManager.addObject('cube');
  });

  document.getElementById('node-btn').addEventListener('click', () => {
    objectManager.addObject('node');
  });

  document.getElementById('pyramid-btn').addEventListener('click', () => {
    objectManager.addObject('pyramid');
  });

  document.getElementById('torus-btn').addEventListener('click', () => {
    objectManager.addObject('torus');
  });

  document.getElementById('cylinder-btn').addEventListener('click', () => {
    objectManager.addObject('cylinder');
  });

  // Atalhos de teclado
  document.addEventListener('keydown', async (e) => {
    // Ctrl/Cmd + N: Nova janela
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      const windowCount = windowManager.windows.size;
      const offset = windowCount * 30;

      new WebviewWindow(`universe-${Date.now()}`, {
        url: '/',
        title: `Multi Universe #${windowCount + 1}`,
        width: 800,
        height: 600,
        x: 100 + offset,
        y: 100 + offset
      });
    }

    // Ctrl/Cmd + R: Toggle rede
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault();
      document.getElementById('network-btn').click();
    }

    // Ctrl/Cmd + 1-6: Adicionar objetos
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case '1':
          e.preventDefault();
          objectManager.addObject('sphere');
          break;
        case '2':
          e.preventDefault();
          objectManager.addObject('cube');
          break;
        case '3':
          e.preventDefault();
          objectManager.addObject('node');
          break;
        case '4':
          e.preventDefault();
          objectManager.addObject('pyramid');
          break;
        case '5':
          e.preventDefault();
          objectManager.addObject('torus');
          break;
        case '6':
          e.preventDefault();
          objectManager.addObject('cylinder');
          break;
      }
    }

    // Delete: Remove objeto selecionado
    if (e.key === 'Delete' && objectManager.selectedObject) {
      objectManager.removeObject(objectManager.selectedObject);
      objectManager.selectedObject = null;
    }
  });
}

// Cleanup ao fechar
window.addEventListener('beforeunload', async () => {
  if (networkManager) networkManager.cleanup();
  if (windowManager) await windowManager.cleanup();
  if (universe) universe.cleanup();
  if (objectManager) objectManager.cleanup();
});

// Inicializa
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
