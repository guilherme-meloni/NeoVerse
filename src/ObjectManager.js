import { emit, listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/api/dialog';
import { readDir } from '@tauri-apps/api/fs';
import { homeDir } from '@tauri-apps/api/path';

export class ObjectManager {
  constructor(windowManager, universe, networkManager = null) {
    this.windowManager = windowManager;
    this.universe = universe;
    this.networkManager = networkManager;
    this.myObjects = new Set();
    this.allObjects = new Map();
    this.remoteObjects = new Map(); // Objetos de universos remotos
    this.selectedObject = null;
    this.editingObject = null;

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

    await listen('object-update', (event) => {
      const { id, properties } = event.payload;
      this.handleObjectUpdate(id, properties);
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
        const objData = this.allObjects.get(id);
        if (objData) {
          objData.position = position;
          await emit('object-move', { id, position });
        }
      }
    });

    // Listener de seleção de objeto
    window.addEventListener('object-selected', (e) => {
      this.showEditMenu(e.detail.object);
    });

    // Listener de clique na lista
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
            true
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
    
    // Fecha menu se estava editando este objeto
    if (this.editingObject === id) {
      this.hideEditMenu();
    }
    
    this.updateUI();
  }

  handleObjectUpdate(id, properties) {
    const objData = this.allObjects.get(id);
    if (objData) {
      objData.properties = { ...objData.properties, ...properties };
      this.universe.updateObjectProperties(id, properties);
      
      // Atualiza menu se está aberto
      if (this.editingObject === id) {
        this.updateEditMenu(objData);
      }
    }
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
            true
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
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xff00ff, 0x00ffff, 0xffff00, 0xff6600, 0xff0088];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const properties = {
      color: color,
      scale: 0.5 + Math.random() * 1,
      isSolid: true // Sólido por padrão
    };

    const objData = {
      id,
      type,
      position,
      properties,
      ownerId: this.windowManager.label,
      createdAt: Date.now()
    };

    // Adiciona localmente
    this.universe.addObject(type, position, properties, id, false);
    this.myObjects.add(id);
    this.allObjects.set(id, objData);

    // Broadcast LOCAL (Tauri events)
    await emit('object-add', objData);

    // Broadcast REDE (WebSocket) se conectado
    if (this.networkManager && this.networkManager.connected) {
      this.networkManager.broadcastObjectAdd(objData);
    }

    this.updateUI();
    this.showTooltip(`${this.getEmoji(type)} ${type} adicionado!`);

    console.log(`✨ Objeto ${type} criado:`, id);
    return id;
  }

  // Novo método para lidar com objetos remotos
  handleRemoteObjectAdd(sourceCode, obj) {
    console.log(`🌐 Objeto remoto de ${sourceCode}:`, obj.type);

    // Marca como remoto
    const remoteId = `remote_${sourceCode}_${obj.id}`;
    
    // Adiciona como fantasma
    this.universe.addObject(
      obj.type,
      obj.position,
      obj.properties,
      remoteId,
      true // isGhost
    );

    this.remoteObjects.set(remoteId, {
      ...obj,
      sourceCode,
      originalId: obj.id
    });

    this.updateUI();
  }

  async removeObject(id) {
    if (!this.myObjects.has(id)) return;

    this.universe.removeObject(id);
    this.myObjects.delete(id);
    this.allObjects.delete(id);

    // Broadcast LOCAL
    await emit('object-remove', { id });

    // Broadcast REDE
    if (this.networkManager && this.networkManager.connected) {
      this.networkManager.broadcastObjectRemove(id);
    }

    this.updateUI();
  }

  async updateObjectProperties(id, properties) {
    if (!this.myObjects.has(id)) return;

    const objData = this.allObjects.get(id);
    if (objData) {
      objData.properties = { ...objData.properties, ...properties };
      this.universe.updateObjectProperties(id, properties);
      
      // Broadcast LOCAL
      await emit('object-update', { id, properties });

      // Broadcast REDE
      if (this.networkManager && this.networkManager.connected) {
        this.networkManager.broadcastObjectUpdate(id, properties);
      }
    }
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

        // Mostra menu se for nosso objeto
        if (this.myObjects.has(id)) {
          this.showEditMenu(mesh);
        }

        // Remove destaque após 1s
        setTimeout(() => {
          this.universe.unhighlightObject(mesh);
        }, 1000);
      }
    }
  }

  showEditMenu(mesh) {
    if (!this.myObjects.has(mesh.userData.id)) {
      console.log('❌ Não é possível editar objetos de outros universos');
      return;
    }

    this.editingObject = mesh.userData.id;
    const objData = this.allObjects.get(mesh.userData.id);
    
    // Remove menu anterior se existir
    this.hideEditMenu();

    // Cria menu
    const menu = document.createElement('div');
    menu.id = 'edit-menu';
    menu.innerHTML = `
      <div class="edit-panel">
        <div class="edit-header">
          <h3>✏️ Editar ${this.getEmoji(mesh.userData.type)} ${mesh.userData.type}</h3>
          <button class="close-btn" onclick="window.closeEditMenu()">✕</button>
        </div>
        
        <div class="edit-content">
          <div class="edit-row">
            <label>🎨 Cor:</label>
            <input type="color" id="edit-color" value="#${objData.properties.color.toString(16).padStart(6, '0')}">
          </div>
          
          <div class="edit-row">
            <label>📏 Tamanho: <span id="scale-value">${objData.properties.scale.toFixed(2)}</span></label>
            <input type="range" id="edit-scale" min="0.1" max="3" step="0.1" value="${objData.properties.scale}">
          </div>
          
          <div class="edit-row">
            <label>
              <input type="checkbox" id="edit-solid" ${objData.properties.isSolid ? 'checked' : ''}>
              🧱 Sólido (colisão no FPS)
            </label>
          </div>
          
          <div class="edit-actions">
            <button class="btn-apply" onclick="window.applyEdit()">✓ Aplicar</button>
            <button class="btn-delete" onclick="window.deleteObject()">🗑️ Deletar</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(menu);

    // Listeners
    document.getElementById('edit-scale').addEventListener('input', (e) => {
      document.getElementById('scale-value').textContent = parseFloat(e.target.value).toFixed(2);
    });

    // Funções globais temporárias
    window.closeEditMenu = () => this.hideEditMenu();
    window.applyEdit = () => this.applyEdit();
    window.deleteObject = () => this.deleteCurrentObject();

    console.log('📝 Menu de edição aberto');
  }

  updateEditMenu(objData) {
    const colorInput = document.getElementById('edit-color');
    const scaleInput = document.getElementById('edit-scale');
    const solidInput = document.getElementById('edit-solid');
    
    if (colorInput) {
      colorInput.value = `#${objData.properties.color.toString(16).padStart(6, '0')}`;
    }
    if (scaleInput) {
      scaleInput.value = objData.properties.scale;
      document.getElementById('scale-value').textContent = objData.properties.scale.toFixed(2);
    }
    if (solidInput) {
      solidInput.checked = objData.properties.isSolid;
    }
  }

  async applyEdit() {
    if (!this.editingObject) return;

    const colorInput = document.getElementById('edit-color');
    const scaleInput = document.getElementById('edit-scale');
    const solidInput = document.getElementById('edit-solid');

    const properties = {
      color: parseInt(colorInput.value.substring(1), 16),
      scale: parseFloat(scaleInput.value),
      isSolid: solidInput.checked
    };

    await this.updateObjectProperties(this.editingObject, properties);

    this.showTooltip('✓ Alterações aplicadas!');
    console.log('✓ Propriedades atualizadas:', properties);
  }

  async deleteCurrentObject() {
    if (!this.editingObject) return;

    const confirmed = confirm('Deletar este objeto?');
    if (confirmed) {
      await this.removeObject(this.editingObject);
      this.hideEditMenu();
      this.showTooltip('🗑️ Objeto deletado!');
    }
  }

  hideEditMenu() {
    const menu = document.getElementById('edit-menu');
    if (menu) {
      menu.remove();
      this.editingObject = null;
      
      // Remove funções globais
      delete window.closeEditMenu;
      delete window.applyEdit;
      delete window.deleteObject;
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
        const solid = mesh.userData.isSolid ? '🧱' : '👻';
        
        html += `<div class="object-item ${ghost ? 'ghost' : ''} ${selected ? 'selected' : ''}"
                      data-id="${mesh.userData.id}">
          ${emoji} ${mesh.userData.type} ${ghost ? '(fantasma)' : solid}
        </div>`;
      });

      container.innerHTML = html;
    }

    // Atualiza memória
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
      node: '⭐',
      pyramid: '🔺',
      torus: '🍩',
      cylinder: '🥫'
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

  async createFileSystemRoom() {
    try {
        const selected = await open({
            directory: true,
            multiple: false,
            defaultPath: await homeDir()
        });

        if (selected && typeof selected === 'string') {
            console.log('📂 Diretório selecionado:', selected);
            this.generateRoomFromPath(selected);
        }
    } catch (e) {
        console.error('Erro ao selecionar diretório:', e);
        this.showTooltip('❌ Erro ao abrir diálogo');
    }
  }

  async generateRoomFromPath(path) {
    try {
        const entries = await readDir(path);
        
        if (!entries || entries.length === 0) {
            this.showTooltip('📂 Pasta vazia');
            return;
        }

        // Layout Parameters
        const spacing = 1.5;
        const cols = Math.ceil(Math.sqrt(entries.length));
        
        // Define a "Room Center" offset relative to origin
        // Spawning "FSN" cluster at x=10, z=10 to avoid 0,0 clash
        const originX = 10;
        const originZ = 10;

        entries.forEach((entry, index) => {
            // Grid Layout
            const col = index % cols;
            const row = Math.floor(index / cols);
            
            const x = originX + (col * spacing);
            const z = originZ + (row * spacing);
            
            // Heuristic to detect folder (no perfect way without metadata call, 
            // but we can assume no extension = folder or check children if recursive was true)
            // For now, let's just make everything a box.
            // If it has a dot, it might be a file.
            const isFile = entry.name && entry.name.includes('.');
            
            const type = isFile ? 'cube' : 'cube'; // Keep it FSN style (all cubes?)
            // Let's make folders GREEN and files BLUE
            const color = isFile ? 0x00ccff : 0x00ff88;
            
            const id = this.generateId();
            
            const properties = {
                color: color,
                scale: 0.8,
                isSolid: true,
                filePath: entry.path,
                fileName: entry.name,
                isFileSystem: true
            };
            
            const position = { x, y: 1, z };

            this.universe.addObject(type, position, properties, id, false);
            this.myObjects.add(id);
            this.allObjects.set(id, {
                id,
                type,
                position,
                properties,
                ownerId: this.windowManager.label
            });
            
            // Also add text label? (Complex in vanilla Three.js without font loader)
            // We'll skip text for now, maybe tooltip on hover later.
        });
        
        // Move player nearby?
        if (this.universe.hasPlayer && this.universe.player) {
            this.universe.player.position.set(originX - 2, 2, originZ - 2);
            this.universe.playerVelocity.set(0,0,0);
        }

        this.updateUI();
        this.showTooltip(`📂 Sala criada: ${entries.length} itens!`);
        
    } catch (e) {
        console.error('Erro ao ler diretório:', e);
        this.showTooltip('❌ Erro ao ler arquivos');
    }
  }

  cleanup() {
    this.hideEditMenu();
  }
}
