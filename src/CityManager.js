import * as THREE from 'three';
import { readDir } from '@tauri-apps/api/fs';
import { open as shellOpen } from '@tauri-apps/api/shell';
import { dirname } from '@tauri-apps/api/path';

export class CityManager {
  constructor(universe, windowManager, objectManager) {
    this.universe = universe;
    this.windowManager = windowManager;
    this.objectManager = objectManager;
    this.currentPath = null;
    this.initialRootPath = null;
    this.doors = [];
    this.isCityActive = false;
    this.interactCooldown = false;

    this.colors = {
      neonBlue: 0x00ffff,
      neonPink: 0xff00ff,
      neonGreen: 0x00ff00,
      office: 0x334455,
      factory: 0x666666,
      matrix: 0x003300
    };
  }

  async startCity(path) {
    console.log("🏙️ Iniciando cidade em:", path);
    this.isCityActive = true;
    this.initialRootPath = path;
    this.loadLevel(path);
  }

  async loadLevel(path) {
    this.currentPath = path;
    this.doors = [];

    // Limpar
    await this.objectManager.removeAllCityObjects();
    this.universe.colliders = [];

    const isCityView = (this.currentPath === this.initialRootPath);
    
    // Ambiente
    if (isCityView) {
        this.universe.scene.background = new THREE.Color(0x000510);
        this.universe.scene.fog = new THREE.FogExp2(0x000510, 0.02);
    } else {
        this.universe.scene.background = new THREE.Color(0x0a0a0a);
        this.universe.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.05);
    }

    // Ler arquivos
    try {
      const entries = await readDir(path);

      if (isCityView) {
        await this.buildSimpleCity(entries);
      } else {
        await this.buildSimpleLobby(entries);
      }

      // Spawn player
      if(this.universe.player) {
        this.universe.player.position.set(0, 2, isCityView ? 15 : 8);
        this.universe.playerVelocity.set(0,0,0);
        this.universe.fpsYaw = Math.PI;
        this.universe.fpsPitch = 0;
      }

    } catch (e) {
      console.error("Erro ao ler diretório:", e);
    }
  }

  async buildSimpleCity(entries) {
    const MAX = 100;
    if (entries.length > MAX) {
        entries = entries.slice(0, MAX);
    }

    // Separar
    const dirs = [];
    const files = [];
    entries.forEach(e => {
        const isDir = !e.name.includes('.');
        if (isDir) dirs.push(e);
        else files.push(e);
    });

    console.log(`📊 ${dirs.length} pastas, ${files.length} arquivos`);

    // Chão
    const floor = new THREE.Box3();
    floor.min.set(-100, -5, -100);
    floor.max.set(100, -0.05, 100);
    this.universe.colliders.push(floor);

    // GRID SIMPLES - Ruas + Prédios
    const STREET_WIDTH = 8;
    const BLOCK_SIZE = 6;
    const SPACING = BLOCK_SIZE + STREET_WIDTH;

    // Calcular grid
    const cols = Math.ceil(Math.sqrt(dirs.length));
    
    // Renderizar PASTAS como prédios
    dirs.forEach((dir, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);

        const x = (col - cols / 2) * SPACING;
        const z = (row - cols / 2) * SPACING;

        this.createSimpleBuilding(dir, x, z);
    });

    // Renderizar ARQUIVOS no perímetro
    const radius = cols * SPACING / 2 + 10;
    files.forEach((file, i) => {
        const angle = (i / files.length) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        this.createSimpleFile(file, x, z);
    });

    // Portal voltar
    if (this.currentPath !== this.initialRootPath) {
        await this.createExitPortal(0, radius + 5);
    }

    console.log(`✅ Cidade criada: ${dirs.length + files.length} objetos`);
  }

  async createSimpleBuilding(entry, x, z) {
    const name = entry.name.toLowerCase();
    
    // Altura baseada em nome
    let height = 8;
    let color = this.colors.office;

    if (name.includes('src') || name.includes('code')) {
        height = 15;
        color = this.colors.matrix;
    } else if (name.includes('node_modules') || name.includes('.git')) {
        height = 5;
        color = 0x111111;
    } else if (name.includes('bin') || name.includes('system')) {
        height = 12;
        color = this.colors.factory;
    } else {
        height = 6 + Math.random() * 6;
    }

    // Criar prédio simples (BOX)
    const id = await this.objectManager.addObject('cube',
        { x, y: height / 2, z },
        {
            scaleX: 5,
            scaleY: height,
            scaleZ: 5,
            color: color,
            label: entry.name
        },
        true
    );

    // Porta verde na frente
    await this.objectManager.addObject('cube',
        { x, y: 1.5, z: z + 2.6 },
        {
            scaleX: 2,
            scaleY: 3,
            scaleZ: 0.2,
            color: 0x00ff00
        },
        true
    );

    // Colisão
    const box = new THREE.Box3();
    box.min.set(x - 2.5, 0, z - 2.5);
    box.max.set(x + 2.5, height, z + 2.5);
    this.universe.colliders.push(box);

    // Interação
    this.doors.push({
        id: id,
        targetPath: entry.path,
        type: 'dir',
        pos: new THREE.Vector3(x, 0, z + 2.5),
        radius: 5,
        name: entry.name
    });
  }

  async createSimpleFile(entry, x, z) {
    const name = entry.name;
    const ext = name.split('.').pop().toLowerCase();

    // Cor baseada em extensão
    let color = 0xcccccc;
    if (['png', 'jpg', 'jpeg'].includes(ext)) color = 0xff00ff;
    else if (['js', 'ts', 'py'].includes(ext)) color = 0x00ffff;
    else if (['txt', 'md'].includes(ext)) color = 0x00ff00;

    // Pedestal
    await this.objectManager.addObject('cylinder',
        { x, y: 0.5, z },
        { scale: 1, color: 0x222222 },
        true
    );

    // Monumento
    const id = await this.objectManager.addObject('pyramid',
        { x, y: 2, z },
        { scale: 1, color: color },
        true
    );

    this.doors.push({
        id: id,
        targetPath: entry.path,
        type: 'file',
        pos: new THREE.Vector3(x, 2, z),
        radius: 2.5,
        name: entry.name
    });
  }

  async createExitPortal(x, z) {
    await this.objectManager.addObject('torus',
        { x, y: 2, z },
        { scale: 2, color: 0xffaa00 },
        true
    );

    this.doors.push({
        type: 'back',
        pos: new THREE.Vector3(x, 2, z),
        radius: 4,
        name: '..'
    });
  }

  async buildSimpleLobby(entries) {
    // Separar
    const dirs = [];
    const files = [];
    entries.forEach(e => {
        const isDir = !e.name.includes('.');
        if (isDir) dirs.push(e);
        else files.push(e);
    });

    console.log(`🏛️ Lobby: ${dirs.length} pastas, ${files.length} arquivos`);

    const W = 20;
    const H = 8;
    const D = 20;

    // Criar sala fechada
    await this.createRoom(W, H, D);

    // ARQUIVOS no centro (círculo)
    const fileRadius = 6;
    files.forEach((file, i) => {
        const angle = (i / files.length) * Math.PI * 2;
        const x = Math.cos(angle) * fileRadius;
        const z = Math.sin(angle) * fileRadius;

        // Pedestal
        this.objectManager.addObject('cylinder',
            { x, y: 0.5, z },
            { scale: 0.8, color: 0x333333 },
            true
        );

        // Arquivo
        this.objectManager.addObject('cube',
            { x, y: 1.5, z },
            { scaleX: 0.6, scaleY: 1, scaleZ: 0.1, color: 0x00ffff },
            true
        );

        const box = new THREE.Box3();
        box.min.set(x - 0.5, 0, z - 0.5);
        box.max.set(x + 0.5, 2, z + 0.5);
        this.universe.colliders.push(box);

        this.doors.push({
            type: 'file',
            targetPath: file.path,
            pos: new THREE.Vector3(x, 1.5, z),
            radius: 2,
            name: file.name
        });
    });

    // PASTAS nas paredes (elevadores)
    dirs.forEach((dir, i) => {
        const side = i % 4;
        let x, z;

        if (side === 0) { x = -W/2 + 2; z = -D/2 + 3 + (i / 4 | 0) * 5; }
        else if (side === 1) { x = W/2 - 2; z = -D/2 + 3 + (i / 4 | 0) * 5; }
        else if (side === 2) { x = -W/2 + 3 + (i / 4 | 0) * 5; z = -D/2 + 2; }
        else { x = -W/2 + 3 + (i / 4 | 0) * 5; z = D/2 - 2; }

        this.objectManager.addObject('cylinder',
            { x, y: 2, z },
            { scale: 1.2, height: 4, color: 0xffaa00 },
            true
        );

        this.doors.push({
            type: 'dir',
            targetPath: dir.path,
            pos: new THREE.Vector3(x, 1, z),
            radius: 3,
            name: dir.name
        });
    });

    // Portal de saída atrás
    await this.createExitPortal(0, D/2 - 2);

    console.log(`✅ Lobby criado`);
  }

  async createRoom(w, h, d) {
    const WALL = 1;

    // Chão
    await this.objectManager.addObject('cube',
        { x: 0, y: -0.5, z: 0 },
        { scaleX: w, scaleY: 1, scaleZ: d, color: 0x1a1a1a },
        true
    );

    // Teto
    await this.objectManager.addObject('cube',
        { x: 0, y: h + 0.5, z: 0 },
        { scaleX: w, scaleY: 1, scaleZ: d, color: 0x1a1a1a },
        true
    );

    // 4 Paredes
    const walls = [
        { x: 0, y: h/2, z: -d/2 - WALL/2, sx: w, sy: h, sz: WALL },      // Norte
        { x: 0, y: h/2, z: d/2 + WALL/2, sx: w, sy: h, sz: WALL },       // Sul
        { x: -w/2 - WALL/2, y: h/2, z: 0, sx: WALL, sy: h, sz: d },      // Oeste
        { x: w/2 + WALL/2, y: h/2, z: 0, sx: WALL, sy: h, sz: d }        // Leste
    ];

    for (const wall of walls) {
        await this.objectManager.addObject('cube',
            { x: wall.x, y: wall.y, z: wall.z },
            { scaleX: wall.sx, scaleY: wall.sy, scaleZ: wall.sz, color: 0x2a2a2a },
            true
        );

        // Colisão
        const box = new THREE.Box3();
        box.min.set(wall.x - wall.sx/2, 0, wall.z - wall.sz/2);
        box.max.set(wall.x + wall.sx/2, h, wall.z + wall.sz/2);
        this.universe.colliders.push(box);
    }

    // Colisões chão/teto
    this.universe.colliders.push(
        new THREE.Box3(new THREE.Vector3(-w/2, -5, -d/2), new THREE.Vector3(w/2, -0.05, d/2)),
        new THREE.Box3(new THREE.Vector3(-w/2, h, -d/2), new THREE.Vector3(w/2, h+1, d/2))
    );
  }

  update(playerPos) {
    if (!this.isCityActive) return;

    let nearest = null;
    let minDist = Infinity;

    // Encontrar porta mais próxima
    for (const door of this.doors) {
        const dist = playerPos.distanceTo(door.pos);
        if (dist < door.radius && dist < minDist) {
            minDist = dist;
            nearest = door;
        }
    }

    const prompt = document.getElementById('interaction-prompt');
    
    if (nearest) {
        let text = "";
        if (nearest.type === 'dir') text = `ENTRAR: ${nearest.name}`;
        else if (nearest.type === 'back') text = "VOLTAR (..)";
        else text = `ABRIR: ${nearest.name}`;

        prompt.textContent = `[E] ${text}`;
        prompt.style.display = 'block';

        // Interagir
        if ((this.universe.keys.e || (this.universe.joystick.active && minDist < 1.5)) && !this.interactCooldown) {
            this.interact(nearest);
        }
    } else {
        prompt.style.display = 'none';
    }

    // Reset key
    if (this.universe.keys.e) this.universe.keys.e = false;
  }

  async interact(target) {
      if (this.interactCooldown) return;
      
      this.interactCooldown = true;
      setTimeout(() => this.interactCooldown = false, 500);

      if (target.type === 'dir') {
          console.log("→ Entrando em:", target.name);
          this.loadLevel(target.targetPath);
      } 
      else if (target.type === 'back') {
          console.log("← Voltando");
          const parent = await dirname(this.currentPath);
          if (parent !== this.currentPath) {
              this.loadLevel(parent);
          } else {
              this.loadLevel(this.initialRootPath);
          }
      } 
      else if (target.type === 'file') {
          console.log("📂 Abrindo:", target.name);
          shellOpen(target.targetPath);
      }
  }
}
