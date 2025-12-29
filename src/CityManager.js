import * as THREE from 'three';
import { readDir } from '@tauri-apps/api/fs';
import { open } from '@tauri-apps/api/shell';

export class CityManager {
  constructor(universe, windowManager) {
    this.universe = universe;
    this.windowManager = windowManager;
    this.currentPath = null;
    this.doors = []; // Lista de portas para verificar colisão
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
    
    // 1. Limpar Universo
    this.universe.clearScene();
    
    // 2. Configurar Ambiente Cyberpunk
    this.universe.setCyberpunkAtmosphere();

    // 3. Ler Arquivos
    try {
      const entries = await readDir(path);
      this.buildCityBlock(entries);
      
      // Mover player para o início da rua
      if(this.universe.player) {
        this.universe.player.position.set(0, 2, 0);
        this.universe.playerVelocity.set(0,0,0);
        // Resetar rotação da câmera
        this.universe.fpsYaw = Math.PI; 
        this.universe.fpsPitch = 0;
      }
      
    } catch (e) {
      console.error("Falha ao ler diretório da cidade:", e);
    }
  }

  buildCityBlock(entries) {
    // PROTEÇÃO CONTRA CRASH: Limitar número de itens renderizados
    const MAX_ITEMS = 150;
    let renderEntries = entries;
    if (entries.length > MAX_ITEMS) {
        console.warn(`⚠️ Diretório muito grande! Renderizando apenas os primeiros ${MAX_ITEMS} itens de ${entries.length}.`);
        renderEntries = entries.slice(0, MAX_ITEMS);
    }

    // Layout Grid
    const streetWidth = 4;
    const buildingSize = 5;
    const spacing = buildingSize + streetWidth;
    
    const cols = Math.ceil(Math.sqrt(renderEntries.length));
    
    // Chão da Cidade (Grade Infinita Visual)
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x050510, 
        roughness: 0.1, 
        metalness: 0.8,
        emissive: 0x000022,
        emissiveIntensity: 0.2
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.05; // Avoid Z-fighting with Universe grid
    this.universe.scene.add(floor);

    // GRADE DE NEON (Para noção de espaço)
    const gridHelper = new THREE.GridHelper(200, 50, this.colors.neonBlue, 0x111122);
    gridHelper.position.y = 0.1; // Pouco acima do chão
    this.universe.scene.add(gridHelper);

    // Gerar Prédios
    renderEntries.forEach((entry, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        const x = (col * spacing) - (cols * spacing / 2);
        const z = (row * spacing) - (cols * spacing / 2); // Centralizar
        
        // Determinar Arquétipo
        const isDir = !entry.name.includes('.'); // Heurística simples
        
        if (isDir) {
            this.createBuilding(entry, x, z);
        } else {
            this.createFileMonument(entry, x, z);
        }
    });

    // Criar "Portal de Saída" (Voltar diretório) se não for raiz
    // Simplificação: Portal sempre atrás do player
    this.createPortal("..", 0, 10, true);
  }

  createBuilding(entry, x, z) {
    const name = entry.name.toLowerCase();
    let type = 'office';
    let height = 6 + Math.random() * 8;
    let color = this.colors.neonBlue;
    
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

    const group = new THREE.Group();
    group.position.set(x, 0, z);

    let mesh;

    // --- CONSTRUÇÃO DO PRÉDIO ---
    if (type === 'factory') {
        // Fábrica: Larga, cinza, baixa
        height = 5;
        const geo = new THREE.CylinderGeometry(3, 4, height, 32);
        const mat = new THREE.MeshStandardMaterial({ color: this.colors.factory, roughness: 0.9 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = height / 2;
        
        // Chaminés
        const chimGeo = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
        const chim = new THREE.Mesh(chimGeo, mat);
        chim.position.set(1.5, height, 0);
        group.add(chim);

    } else if (type === 'blackhole') {
        // Buraco Negro: Cubo denso, flutuando
        const geo = new THREE.BoxGeometry(4, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 4;
        
        // Partículas orbitando (simples)
        const ringGeo = new THREE.TorusGeometry(3, 0.1, 16, 32);
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        ring.rotation.x = Math.PI / 2;
        mesh.add(ring);

    } else if (type === 'matrix') {
        // Matrix: Alto, preto, neon verde
        height = 15 + Math.random() * 10;
        const geo = new THREE.BoxGeometry(3, height, 3);
        const mat = new THREE.MeshStandardMaterial({ 
            color: 0x001100, 
            emissive: 0x00ff00, 
            emissiveIntensity: 0.2,
            wireframe: false 
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = height / 2;

        // Wireframe overlay
        const wireGeo = new THREE.EdgesGeometry(geo);
        const wireMat = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const wire = new THREE.LineSegments(wireGeo, wireMat);
        mesh.add(wire);

    } else if (type === 'gallery') {
        // Galeria: Vidro ciano
        height = 8;
        const geo = new THREE.BoxGeometry(4, height, 4);
        const mat = new THREE.MeshPhysicalMaterial({ 
            color: this.colors.glass, 
            transmission: 0.5, 
            opacity: 0.8, 
            transparent: true,
            roughness: 0 
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = height / 2;

    } else {
        // Office Genérico
        const geo = new THREE.BoxGeometry(3, height, 3);
        const mat = new THREE.MeshStandardMaterial({ color: 0x222244, roughness: 0.2 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = height / 2;
        
        // Janelas (simples textura procedural via canvas seria melhor, mas vamos de emissive random)
        if (Math.random() > 0.5) {
            mat.emissive = new THREE.Color(0x000044);
            mat.emissiveIntensity = 0.5;
        }
    }

    group.add(mesh);

    // --- PORTA / PORTAL ---
    // Área de colisão para entrar
    const doorGeo = new THREE.PlaneGeometry(1.5, 2.5);
    const doorMat = new THREE.MeshBasicMaterial({ color: this.colors.neonGreen, side: THREE.DoubleSide });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.25, 2); // Na frente do prédio (assumindo box size ~3 ou 4)
    if (type === 'factory') door.position.z = 3.5; // Ajuste para cilindro

    // Texto flutuante (Nome da pasta)
    // Three.js puro é ruim com texto, vamos usar CanvasTexture
    const label = this.createLabel(entry.name);
    label.position.set(0, height + 1, 0);
    group.add(label);

    group.add(door);
    
    // Adicionar à cena e à lista de portas
    this.universe.scene.add(group);
    
    // Registrar Porta para Colisão
    this.doors.push({
        mesh: door,
        path: entry.path,
        isBack: false,
        worldPos: new THREE.Vector3().addVectors(group.position, door.position)
    });
  }

  createFileMonument(entry, x, z) {
    // Arquivos são monumentos menores flutuando
    const group = new THREE.Group();
    group.position.set(x, 1, z);

    // Cor baseada na extensão
    let color = 0xcccccc;
    const name = entry.name;
    const ext = name.split('.').pop().toLowerCase();

    if (['png', 'jpg', 'jpeg'].includes(ext)) color = this.colors.neonPink;
    else if (['js', 'json', 'rs', 'py'].includes(ext)) color = this.colors.neonBlue;
    else if (['exe', 'sh'].includes(ext)) color = 0xff0000;

    // Geometria
    const geo = new THREE.OctahedronGeometry(0.8);
    const mat = new THREE.MeshStandardMaterial({ 
        color: color, 
        emissive: color, 
        emissiveIntensity: 0.5,
        wireframe: true 
    });
    const mesh = new THREE.Mesh(geo, mat);
    
    // Animação de rotação (userData para o loop de animação pegar depois se quisesse)
    // Por enquanto estático para performance
    
    group.add(mesh);

    // Label
    const label = this.createLabel(name, 0.5);
    label.position.y = 1.5;
    group.add(label);

    // Colisão para ABRIR arquivo
    this.doors.push({
        mesh: mesh,
        path: entry.path,
        isFile: true,
        worldPos: group.position
    });

    this.universe.scene.add(group);
  }

  createPortal(name, x, z, isBack) {
    const geo = new THREE.TorusGeometry(1.5, 0.1, 8, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const portal = new THREE.Mesh(geo, mat);
    portal.position.set(x, 1.5, z);
    
    const label = this.createLabel(isBack ? "VOLTAR (..)" : name);
    label.position.set(x, 3.5, z);
    
    this.universe.scene.add(portal);
    this.universe.scene.add(label);

    this.doors.push({
        mesh: portal,
        isBack: true,
        worldPos: portal.position
    });
  }

  createLabel(text, scale=1) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; // Dobro da resolução
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; // Fundo um pouco mais escuro
    ctx.fillRect(0,0,512,128);
    ctx.font = 'bold 50px monospace'; // Fonte maior
    ctx.fillStyle = '#00ffff'; // Neon Cyan
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.substring(0, 20), 256, 64);
    
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(4 * scale, 1 * scale, 1);
    return sprite;
  }

  // Loop de verificação chamado pelo Universe.js
  update(playerPos) {
    if (!this.isCityActive) return;

    // Verificar distância das portas
    for (const door of this.doors) {
        // Distância simples 2D (XZ) para facilitar entrada
        const dx = playerPos.x - door.worldPos.x;
        const dz = playerPos.z - door.worldPos.z;
        const dist = Math.sqrt(dx*dx + dz*dz);

        if (dist < 1.5) {
            // Entrou!
            if (door.isFile) {
                // Abrir arquivo (debounce simples)
                if(!this.openingFile) {
                    this.openingFile = true;
                    console.log("📄 Abrindo arquivo:", door.path);
                    open(door.path);
                    setTimeout(() => this.openingFile = false, 2000);
                }
            } else if (door.isBack) {
                // Voltar diretório
                // Lógica simples: subir um nível na string path
                // (Isso requer lidar com path separator dependendo do OS, assumindo / ou \)
                // Como tauri path API é assincrona, vamos tentar heuristica de string por enquanto ou pedir pro pai
                // TODO: Implementar lógica robusta de 'parent dir'
                console.log("🔙 Voltando...");
                // Hack: Recarregar home ou anterior (precisaria de pilha de histórico)
                // Por hora, reseta
                // this.startCity(homeDir...); 
                alert("Voltar ainda não implementado totalmente!");
            } else {
                // Entrar na pasta
                console.log("🚪 Entrando em:", door.path);
                this.enterDirectory(door.path);
            }
            break; // Evitar múltiplas entradas num frame
        }
    }
  }
}
