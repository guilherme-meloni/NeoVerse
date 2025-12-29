import { WindowManager } from './WindowManager.js';
import { Universe } from './Universe.js';
import { ObjectManager } from './ObjectManager.js';
import { WebviewWindow } from '@tauri-apps/api/window';

let windowManager;
let universe;
let objectManager;

async function init() {
  console.log('🚀 Iniciando Multi Universe...');
  
  const canvas = document.getElementById('canvas');
  
  // Inicializa componentes
  windowManager = new WindowManager();
  universe = new Universe(canvas);
  objectManager = new ObjectManager(windowManager, universe);
  
  // Aguarda inicialização
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Setup controles
  setupControls();
  
  // Remove info após 5s
  setTimeout(() => {
    const info = document.getElementById('info');
    if (info) {
      info.style.opacity = '0';
      info.style.transition = 'opacity 1s';
      setTimeout(() => info.remove(), 1000);
    }
  }, 5000);
  
  // Atualiza memória a cada 2s
  setInterval(() => {
    objectManager.updateMemoryUsage();
  }, 2000);
  
  console.log('✅ App iniciado (modo otimizado)');
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
  
  // Adicionar esfera
  document.getElementById('sphere-btn').addEventListener('click', () => {
    objectManager.addObject('sphere');
  });
  
  // Adicionar cubo
  document.getElementById('cube-btn').addEventListener('click', () => {
    objectManager.addObject('cube');
  });
  
  // Adicionar node
  document.getElementById('node-btn').addEventListener('click', () => {
    objectManager.addObject('node');
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
    
    // Ctrl/Cmd + 1-3: Adicionar objetos
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
  if (windowManager) await windowManager.cleanup();
  if (universe) universe.cleanup();
});

// Inicializa
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
