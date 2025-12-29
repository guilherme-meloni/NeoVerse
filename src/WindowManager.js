import { appWindow, WebviewWindow } from '@tauri-apps/api/window';
import { emit, listen } from '@tauri-apps/api/event';

export class WindowManager {
  constructor() {
    this.label = appWindow.label;
    this.windows = new Map();
    this.updateInterval = null;
    
    this.init();
  }

  async init() {
    // Adiciona esta janela
    this.windows.set(this.label, await this.getMyBounds());
    
    // Escuta eventos de outras janelas
    await listen('window-announce', (event) => {
      const { label, bounds } = event.payload;
      this.windows.set(label, bounds);
      this.updateUI();
      this.checkOverlaps();
    });

    await listen('window-update', (event) => {
      const { label, bounds } = event.payload;
      this.windows.set(label, bounds);
      this.checkOverlaps();
    });

    await listen('window-close', (event) => {
      const { label } = event.payload;
      this.windows.delete(label);
      this.updateUI();
      this.checkOverlaps();
    });
    
    // Anuncia presença
    await this.announce();
    
    // Atualiza posição periodicamente (mais eficiente que BroadcastChannel)
    this.updateInterval = setInterval(() => this.updatePosition(), 150);
    
    // Listener de tamanho da janela
    await appWindow.onResized(() => this.updatePosition());
    
    console.log('🪟 WindowManager iniciado:', this.label);
  }

  async getMyBounds() {
    const position = await appWindow.outerPosition();
    const size = await appWindow.outerSize();
    
    return {
      label: this.label,
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
      timestamp: Date.now()
    };
  }

  async announce() {
    const bounds = await this.getMyBounds();
    await emit('window-announce', { label: this.label, bounds });
  }

  async updatePosition() {
    const bounds = await this.getMyBounds();
    const oldBounds = this.windows.get(this.label);
    
    // Só emite se mudou significativamente (otimização)
    if (!oldBounds || 
        Math.abs(bounds.x - oldBounds.x) > 3 ||
        Math.abs(bounds.y - oldBounds.y) > 3 ||
        Math.abs(bounds.width - oldBounds.width) > 3 ||
        Math.abs(bounds.height - oldBounds.height) > 3) {
      
      this.windows.set(this.label, bounds);
      await emit('window-update', { label: this.label, bounds });
      
      this.updateUI();
    }
  }

  checkOverlaps() {
    const myBounds = this.windows.get(this.label);
    if (!myBounds) return [];
    
    const overlapping = [];
    
    for (const [label, bounds] of this.windows.entries()) {
      if (label === this.label) continue;
      
      if (this.rectanglesOverlap(myBounds, bounds)) {
        overlapping.push(label);
      }
    }
    
    // Dispara evento
    window.dispatchEvent(new CustomEvent('overlaps-changed', {
      detail: { overlapping }
    }));
    
    // Atualiza UI
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const overlapCount = document.getElementById('overlap-count');
    
    overlapCount.textContent = overlapping.length;
    
    if (overlapping.length > 0) {
      statusDot.className = 'status-dot dot-merging';
      statusText.textContent = 'Mesclando!';
    } else {
      statusDot.className = 'status-dot dot-active';
      statusText.textContent = 'Ativo';
    }
    
    return overlapping;
  }

  rectanglesOverlap(r1, r2) {
    return !(
      r2.x > r1.x + r1.width ||
      r2.x + r2.width < r1.x ||
      r2.y > r1.y + r1.height ||
      r2.y + r2.height < r1.y
    );
  }

  updateUI() {
    // Contador de janelas
    document.getElementById('window-count').textContent = this.windows.size;
    
    // Número da janela
    const windowNumber = Array.from(this.windows.keys()).indexOf(this.label) + 1;
    document.getElementById('window-id').textContent = windowNumber;
  }

  getOverlappingWindows() {
    return this.checkOverlaps();
  }

  async cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    await emit('window-close', { label: this.label });
  }
}
