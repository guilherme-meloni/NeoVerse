import { emit, listen } from '@tauri-apps/api/event';

export class ObjectManager {
  constructor(windowManager, universe) {
    this.windowManager = windowManager;
    this.universe = universe;
    this.myObjects = new Set();
    this.allObjects = new Map();
    this.selectedObject = null;
    
    this.init();
  }

  async init() {
    // Escuta eventos de objetos
    await listen('object-add', (event) => {
      const obj = event.payload;
      this.handleObjectAdd(obj);
    });

    await listen('object-move', (event) => {
      const { id, position } = event.payload;
      this.handleObjectMove(id, position);
    });

    await listen('object-remove', (event) => {
      const { id } = event.payload;
      this.handleObjectRemove(id);
    });

    await listen('object-request', async () => {
      // Envia nossos objetos para quem pediu
      for (const id of this.myObjects) {
        const objData = this.allObjects.get(id);
        if (objData) {
          await emit('object-add', objData);
        }
      }
    });
    
    // Listener de overlaps
    window.addEventListener('overlaps-changed', (e) => {
      this.handleOverlaps(e.detail.overlapping);
    });
    
    // Listener de movimento local
    window.addEventListener('object-moved', async (e) => {
      const { id, position } = e.detail;
      if (this.myObjects.has(id)) {
        await emit('object-move', { id, position });
      }
    });
    
    // Listener de seleção (para UI)
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('object-item')) {
        const id = e.target.dataset.id;
        this.selectObject(id);
      }
    });
    
    // Solicita objetos existentes
    await emit('object-request', {});
    
    console.log('📦 ObjectManager iniciado');
  }

  handleObjectAdd(obj) {
    this.allObjects.set(obj.id, obj);
    
    // Se não é nosso e estamos em overlap, adiciona como fantasma
    if (obj.ownerId !== this.windowManager.label) {
      const overlapping = this.windowManager.getOverlappingWindows();
      if (overlapping.includes(obj.ownerId)) {
        if (!this.universe.objects.has(obj.id)) {
          this.universe.addObject(
            obj.type,
            obj.position,
            obj.properties,
            obj.id,
            true // isGhost
          );
        }
      }
    }
    
    this.updateUI();
  }

  handleObjectMove(id, position) {
    const objData = this.allObjects.get(id);
    if (objData) {
      objData.position = position;
      this.universe.updateObjectPosition(id, position);
    }
  }

  handleObjectRemove(id) {
    this.allObjects.delete(id);
    this.universe.removeObject(id);
    this.updateUI();
  }

  handleOverlaps(overlappingLabels) {
    // Remove fantasmas de janelas não sobrepostas
    this.universe.objects.forEach((mesh, id) => {
      if (mesh.userData.isGhost) {
        const objData = this.allObjects.get(id);
        if (objData && !overlappingLabels.includes(objData.ownerId)) {
          this.universe.removeObject(id);
        }
      }
    });
    
    // Adiciona fantasmas de janelas sobrepostas
    this.allObjects.forEach((objData, id) => {
      if (objData.ownerId !== this.windowManager.label && 
          overlappingLabels.includes(objData.ownerId)) {
        if (!this.universe.objects.has(id)) {
          this.universe.addObject(
            objData.type,
            objData.position,
            objData.properties,
            id,
            true // isGhost
          );
        }
      }
    });
    
    this.updateUI();
  }

  async addObject(type) {
    const id = this.generateId();
    
    // Posição aleatória
    const position = {
      x: (Math.random() - 0.5) * 8,
      y: 1 + Math.random() * 2,
      z: (Math.random() - 0.5) * 8
    };
    
    // Cor aleatória
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xff00ff, 0x00ffff, 0xffff00];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const properties = {
      color: color,
      scale: 0.5 + Math.random() * 1
    };
    
    const objData = {
      id,
      type,
      position,
      properties,
      ownerId: this.windowManager.label,
      createdAt: Date.now()
    };
    
    // Adiciona localmente (sem fade para objetos locais)
    this.universe.addObject(type, position, properties, id, false);
    this.myObjects.add(id);
    this.allObjects.set(id, objData);
    
    // Broadcast
    await emit('object-add', objData);
    
    this.updateUI();
    this.showTooltip(`${this.getEmoji(type)} adicionado!`);
    
    console.log(`✨ Objeto ${type} criado:`, id);
    return id;
  }

  async removeObject(id) {
    if (!this.myObjects.has(id)) return;
    
    this.universe.removeObject(id);
    this.myObjects.delete(id);
    this.allObjects.delete(id);
    
    await emit('object-remove', { id });
    
    this.updateUI();
  }

  selectObject(id) {
    // Remove seleção anterior
    document.querySelectorAll('.object-item').forEach(el => {
      el.classList.remove('selected');
    });
    
    // Adiciona nova seleção
    const element = document.querySelector(`[data-id="${id}"]`);
    if (element) {
      element.classList.add('selected');
      this.selectedObject = id;
      
      // Destaca objeto na cena
      const mesh = this.universe.objects.get(id);
      if (mesh) {
        this.universe.highlightObject(mesh);
        
        // Remove destaque após 1s
        setTimeout(() => {
          this.universe.unhighlightObject(mesh);
        }, 1000);
      }
    }
  }

  updateUI() {
    // Contagem de objetos
    const localCount = this.myObjects.size;
    const ghostCount = Array.from(this.universe.objects.values())
      .filter(obj => obj.userData.isGhost).length;
    const totalCount = localCount + ghostCount;
    
    document.getElementById('object-count').textContent = totalCount;
    
    // Lista de objetos
    const container = document.getElementById('objects-container');
    if (totalCount === 0) {
      container.innerHTML = 'Nenhum';
    } else {
      let html = '';
      
      this.universe.objects.forEach((mesh) => {
        const emoji = this.getEmoji(mesh.userData.type);
        const ghost = mesh.userData.isGhost;
        const selected = this.selectedObject === mesh.userData.id;
        html += `<div class="object-item ${ghost ? 'ghost' : ''} ${selected ? 'selected' : ''}" 
                      data-id="${mesh.userData.id}">
          ${emoji} ${mesh.userData.type} ${ghost ? '👻' : ''}
        </div>`;
      });
      
      container.innerHTML = html;
    }
    
    // Atualiza memória (aproximado)
    this.updateMemoryUsage();
  }

  updateMemoryUsage() {
    if (performance.memory) {
      const used = Math.round(performance.memory.usedJSHeapSize / 1048576);
      document.getElementById('memory').textContent = `${used}MB`;
    }
  }

  getEmoji(type) {
    const emojis = {
      sphere: '🔵',
      cube: '🧊',
      node: '⭐'
    };
    return emojis[type] || '📦';
  }

  showTooltip(message) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = message;
    tooltip.style.left = '50%';
    tooltip.style.top = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(tooltip);
    
    setTimeout(() => tooltip.remove(), 1500);
  }

  generateId() {
    return 'obj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  cleanup() {
    // Cleanup é automático com Tauri
  }
}
