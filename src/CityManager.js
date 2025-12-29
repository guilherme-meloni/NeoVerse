import * as THREE from 'three';
import { readDir } from '@tauri-apps/api/fs';
import { open } from '@tauri-apps/api/shell';

export class CityManager {
  constructor(universe, windowManager, objectManager) {
    this.universe = universe;
    this.windowManager = windowManager;
    this.objectManager = objectManager;
    this.currentPath = null;
    this.doors = []; // Lista de IDs para verificar colisão
    this.isCityActive = false;
    
    // Configurações de Design
    this.colors = {
      neonBlue: 0x00ffff,
      neonPink: 0xff00ff,
      neonGreen: 0x00ff00,
      darkBase: 0x0a0a10,
      glass: 0x00aaff,
      factory: 0x555555,
      matrix: 0x003300
    };
  }

  async startCity(path) {
    console.log("🏙️ Iniciando Protocolo: Data Metropolis em", path);
    this.isCityActive = true;
    this.enterDirectory(path);
  }

  async enterDirectory(path) {
    this.currentPath = path;
    this.doors = []; // Limpa portas antigas
    
    // 1. Limpar Objetos da Cidade Anterior
    await this.objectManager.removeAllCityObjects();
    
    // 2. Configurar Ambiente Cyberpunk (Visual Global)
    this.universe.setCyberpunkAtmosphere();

    // 3. Ler Arquivos
    try {
      const entries = await readDir(path);
      this.buildCityBlock(entries);
      
      // Mover player para o início da rua
      if(this.universe.player) {
        this.universe.player.position.set(0, 2, 0);
        this.universe.playerVelocity.set(0,0,0);
        this.universe.fpsYaw = Math.PI; 
        this.universe.fpsPitch = 0;
      }
      
    } catch (e) {
      console.error("Falha ao ler diretório da cidade:", e);
    }
  }

  buildCityBlock(entries) {
    // PROTEÇÃO CONTRA CRASH
    const MAX_ITEMS = 150;
    let renderEntries = entries;
    if (entries.length > MAX_ITEMS) {
        console.warn(`⚠️ Diretório muito grande! Limitando a ${MAX_ITEMS}.`);
        renderEntries = entries.slice(0, MAX_ITEMS);
    }

    // Layout Grid
    const streetWidth = 4;
    const buildingSize = 5;
    const spacing = buildingSize + streetWidth;
    
    const cols = Math.ceil(Math.sqrt(renderEntries.length));
    
    // Chão da Cidade (Objeto Especial)
    // Vamos adicionar o chão como um objeto "city_floor" para ele também sincronizar?
    // Por enquanto deixamos local no Universe, mas idealmente seria sync também.
    // Para simplificar, o chão fica local no Universe.js ou adicionamos aqui como 'plane'
    // Vamos deixar o Universe lidar com o chão infinito global, e aqui só os prédios.

    // Gerar Prédios via ObjectManager
    renderEntries.forEach((entry, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        const x = (col * spacing) - (cols * spacing / 2);
        const z = (row * spacing) - (cols * spacing / 2);
        
        const isDir = !entry.name.includes('.'); 
        
        if (isDir) {
            this.createBuilding(entry, x, z);
        } else {
            this.createFileMonument(entry, x, z);
        }
    });

    // Portal de Saída (Voltar)
    this.createPortal("..", 0, 10, true);
  }

  async createBuilding(entry, x, z) {
    const name = entry.name.toLowerCase();
    let type = 'office';
    let height = 6 + Math.random() * 8;
    
    // Lógica de Arquétipos
    if (name === 'node_modules' || name.includes('hidden')) {
        type = 'blackhole';
    } else if (name === 'bin' || name === 'sys' || name === 'windows' || name === 'system32') {
        type = 'factory';
    } else if (name === 'src' || name === 'code' || name.includes('project')) {
        type = 'matrix';
    } else if (name === 'images' || name === 'photos' || name === 'pictures') {
        type = 'gallery';
    }

    // Cria via ObjectManager para sincronizar!
    const id = await this.objectManager.addObject('building', 
        { x, y: 0, z }, // Pos
        { 
            buildingType: type,
            height: height,
            label: entry.name,
            color: this.colors.neonBlue, // Base color fallback
            isDir: true
        },
        true // isCity = true
    );

    // Registrar Porta
    this.doors.push({
        id: id,
        path: entry.path,
        isBack: false,
        worldPos: new THREE.Vector3(x, 0, z) // Aproximação, o update pegará a real
    });
  }

  async createFileMonument(entry, x, z) {
    const name = entry.name;
    const ext = name.split('.').pop().toLowerCase();
    
    let color = 0xcccccc;
    if (['png', 'jpg', 'jpeg'].includes(ext)) color = this.colors.neonPink;
    else if (['js', 'json', 'rs', 'py'].includes(ext)) color = this.colors.neonBlue;
    else if (['exe', 'sh'].includes(ext)) color = 0xff0000;

    const id = await this.objectManager.addObject('monument', 
        { x, y: 1, z },
        {
            color: color,
            label: name,
            isFile: true
        },
        true
    );

    this.doors.push({
        id: id,
        path: entry.path,
        isFile: true,
        worldPos: new THREE.Vector3(x, 1, z)
    });
  }

  async createPortal(name, x, z, isBack) {
    const id = await this.objectManager.addObject('portal',
        { x, y: 1.5, z },
        { label: isBack ? "VOLTAR (..)" : name },
        true
    );

    this.doors.push({
        id: id,
        isBack: true,
        worldPos: new THREE.Vector3(x, 1.5, z)
    });
  }

  // Loop de verificação
  update(playerPos) {
    if (!this.isCityActive) return;

    // Verificar distância das portas
    for (const door of this.doors) {
        // Obter posição real do objeto (caso tenha movido ou seja ghost)
        // Mas prédios são estáticos, então worldPos inicial serve para performance
        // A menos que queiramos janelas móveis levando a cidade junto (complexo)
        
        // Se a janela se moveu, a "cidade" se moveu junto visualmente
        // POREM, playerPos é relativo à janela local?
        // Sim, player é local.
        
        const dx = playerPos.x - door.worldPos.x;
        const dz = playerPos.z - door.worldPos.z;
        const dist = Math.sqrt(dx*dx + dz*dz);

        if (dist < 1.5) {
            if (door.isFile) {
                if(!this.openingFile) {
                    this.openingFile = true;
                    console.log("📄 Abrindo arquivo:", door.path);
                    open(door.path);
                    setTimeout(() => this.openingFile = false, 2000);
                }
            } else if (door.isBack) {
                console.log("🔙 Voltando...");
                // Implementar lógica de voltar real
            } else {
                console.log("🚪 Entrando em:", door.path);
                this.enterDirectory(door.path);
            }
            break; 
        }
    }
  }
}
