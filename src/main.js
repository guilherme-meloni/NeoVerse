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
  console.log('🚀 Iniciando Multi Universe UI...');

  const canvas = document.getElementById('canvas');

  // Check window type
  let isFirstWindow = true;
  try {
    const label = (await import('@tauri-apps/api/window')).appWindow.label;
    isFirstWindow = label.includes('main') || !label.includes('universe-');
  } catch (e) {
    console.log('Browser mode');
  }

  // Init Components
  windowManager = new WindowManager();
  universe = new Universe(canvas, isFirstWindow);
  networkManager = new NetworkManager(windowManager, null);
  objectManager = new ObjectManager(windowManager, universe, networkManager);
  networkManager.objectManager = objectManager;

  // Expose quality switcher to global scope for HTML buttons
  window.setQuality = (mode) => {
    universe.setQuality(mode);
  };
  
  // Also expose network funcs
  window.toggleNetwork = async () => {
      const btn = document.getElementById('btn-net-toggle');
      if(networkManager.connected) {
          networkManager.disconnect();
          btn.textContent = '🔌 Conectar';
          btn.style.borderColor = '#333';
          document.getElementById('net-my-code').textContent = 'OFFLINE';
      } else {
          await networkManager.connect();
          btn.textContent = '🔌 Desconectar';
          btn.style.borderColor = '#00ff88';
          document.getElementById('net-my-code').textContent = networkManager.myCode;
      }
  };

  window.connectRemote = () => {
      const code = document.getElementById('net-input-code').value.toUpperCase();
      if(code.length === 6) networkManager.mergeWithUniverse(code);
  };

  // Setup UI Listeners
  setupUI();

  // Update loop for FPS counter
  let lastTime = performance.now();
  let frames = 0;
  setInterval(() => {
      const t = performance.now();
      frames++;
      if(t - lastTime >= 1000) {
          document.getElementById('debug-fps').textContent = frames;
          frames = 0;
          lastTime = t;
      }
  }, 1000); // Simple FPS counter independent of logic loop

  console.log('✅ UI Ready');
}

function setupUI() {
  // Objects
  const bindObj = (id, type) => {
      const el = document.getElementById(id);
      if(el) el.addEventListener('click', () => objectManager.addObject(type));
  };
  
  bindObj('btn-sphere', 'sphere');
  bindObj('btn-cube', 'cube');
  bindObj('btn-pyramid', 'pyramid');
  bindObj('btn-cylinder', 'cylinder');
  bindObj('btn-torus', 'torus');
  bindObj('btn-node', 'node');

  // Delete
  document.getElementById('btn-delete').addEventListener('click', () => {
      if(universe.selectedObject) {
          universe.removeObject(universe.selectedObject.userData.id);
          universe.selectedObject = null;
      }
  });

  // World
  document.getElementById('btn-new-window').addEventListener('click', () => {
      const id = Date.now();
      new WebviewWindow(`universe-${id}`, {
          url: '/',
          title: `Universe ${id}`,
          width: 800, height: 600
      });
  });

  document.getElementById('btn-view-mode').addEventListener('click', () => {
      universe.toggleViewMode();
  });
  
  // Network Listeners are handled via window globals assigned above for simplicity with the HTML structure
}

window.addEventListener('beforeunload', () => {
  if(universe) universe.cleanup();
});

document.addEventListener('DOMContentLoaded', init);