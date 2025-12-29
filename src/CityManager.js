import * as THREE from 'three';
import { readDir } from '@tauri-apps/api/fs';
import { open as shellOpen } from '@tauri-apps/api/shell';
import { dirname } from '@tauri-apps/api/path'; // Import dirname for parent path

export class CityManager {
  constructor(universe, windowManager, objectManager) {
    this.universe = universe;
    this.windowManager = windowManager;
    this.objectManager = objectManager;
    this.currentPath = null;
    this.initialRootPath = null; // Store the initial path to determine 'city' view
    this.doors = []; // Lista de IDs para verificar colisão
    this.isCityActive = false;
    this.interactCooldown = false; // Add cooldown for interaction
    
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
    this.initialRootPath = path; // Set the root of this exploration
    this.loadLevel(path);
  }

  async loadLevel(path) {
    this.currentPath = path;
    this.doors = []; // Limpa portas antigas
    
    // 1. Limpar Objetos da Cidade Anterior
    await this.objectManager.removeAllCityObjects();
    this.universe.colliders = []; // Clear collision boxes

    // 2. Configurar Ambiente
    const isCityView = (this.currentPath === this.initialRootPath);
    if (isCityView) {
        this.universe.setEnvironment('city');
    } else {
        this.universe.setEnvironment('lobby');
    }

    // 3. Ler Arquivos
    try {
      const entries = await readDir(path);
      
      if (isCityView) {
        this.buildCityBlock(entries);
      } else {
        this.buildLobby(entries);
      }
      
      // Mover player para o início da rua
      if(this.universe.player) {
        this.universe.player.position.set(0, 2, isCityView ? 10 : 0); // Start further out in city view
        this.universe.playerVelocity.set(0,0,0);
        this.universe.fpsYaw = Math.PI; 
        this.universe.fpsPitch = 0;
      }
      
    } catch (e) {
      console.error("Falha ao ler diretório da cidade:", e);
    }
  }

  buildCityBlock(entries) {
    const MAX_ITEMS = 150;
    let renderEntries = entries;
    if (entries.length > MAX_ITEMS) {
        console.warn(`⚠️ Diretório muito grande! Limitando a ${MAX_ITEMS}.`);
        renderEntries = entries.slice(0, MAX_ITEMS);
    }

    const streetWidth = 4;
    const buildingSize = 5;
    const spacing = buildingSize + streetWidth;
    
    const cols = Math.ceil(Math.sqrt(renderEntries.length));

    // Floor Collision
    const floorBox = new THREE.Box3();
    floorBox.min.set(-100, -5, -100);
    floorBox.max.set(100, -0.1, 100); // FIX: Lowered slightly to prevent friction with player feet
    this.universe.colliders.push(floorBox);
    
    renderEntries.forEach((entry, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        const x = (col * spacing) - (cols * spacing / 2);
        const z = (row * spacing) - (cols * spacing / 2);
        
        // HEURISTIC FIX: Tauri readDir (non-recursive) doesn't always give types.
        // Assume it's a Dir if no extension. If it has extension, it's a File.
        const isDir = !entry.name.includes('.');
        
        if (isDir) {
            this.createBuilding(entry, x, z);
        } else {
            this.createFileMonument(entry, x, z);
        }
    });

    // Portal de Saída (Voltar) - Only if not at the root of initial exploration
    if (this.currentPath !== this.initialRootPath) {
        this.createPortal("..", 0, 10, true);
    }
  }

  async createBuilding(entry, x, z) {
    const name = entry.name ? entry.name.toLowerCase() : 'dir';
    let type = 'office';
    let height = 6 + Math.random() * 8;
    
    if (name.includes('node_modules') || name.includes('hidden') || name.includes('cache')) {
        type = 'blackhole';
    } else if (name === 'bin' || name.includes('system') || name.includes('lib')) {
        type = 'factory';
    } else if (name === 'src' || name.includes('code') || name.includes('project')) {
        type = 'matrix';
    } else if (name.includes('image') || name.includes('photo') || name.includes('picture')) {
        type = 'gallery';
    }

    const id = await this.objectManager.addObject('building', 
        { x, y: 0, z }, 
        { 
            buildingType: type,
            height: height,
            label: entry.name,
            color: this.colors.neonBlue, 
            isDir: true
        },
        true
    );

    const bBox = new THREE.Box3();
    bBox.min.set(x - 2, 0, z - 2);
    bBox.max.set(x + 2, height, z + 2);
    this.universe.colliders.push(bBox);

    this.doors.push({
        id: id,
        targetPath: entry.path,
        type: 'dir',
        pos: new THREE.Vector3(x, 0, z),
        radius: 5, // Increased radius
        name: entry.name
    });
  }

  async createFileMonument(entry, x, z) {
    const name = entry.name || 'file';
    const ext = name.split('.').pop().toLowerCase();
    
    let color = 0xcccccc;
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(ext)) color = this.colors.neonPink;
    else if (['js', 'json', 'ts', 'rs', 'py', 'java', 'c', 'cpp', 'h', 'go'].includes(ext)) color = this.colors.neonBlue;
    else if (['exe', 'sh', 'bat', 'bin', 'dmg', 'app'].includes(ext)) color = 0xff0000;
    else if (['txt', 'md', 'doc', 'pdf'].includes(ext)) color = 0x00ff00;

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
        targetPath: entry.path,
        type: 'file',
        pos: new THREE.Vector3(x, 1, z),
        radius: 2,
        name: entry.name
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
        type: 'back',
        pos: new THREE.Vector3(x, 1.5, z),
        radius: 3,
        name: name
    });
  }

  async buildLobby(entries) {
    const w = 15, h = 6, d = 15;
    const wallThick = 1;

    // --- VISUALS (via ObjectManager) ---
    this.objectManager.addObject('cube', {x:0, y:-0.5, z:0}, { scale: w, color: 0x222222 }, true); // Floor
    this.objectManager.addObject('cube', {x:0, y:h+0.5, z:0}, { scale: w, color: 0x222222 }, true); // Ceiling

    // Walls
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2 });
    // Back wall
    this.objectManager.addObject('cube', {x:0, y:h/2, z: -d/2 - wallThick/2}, { scaleX: w, scaleY: h, scaleZ: wallThick, material: wallMaterial }, true);
    // Front wall
    this.objectManager.addObject('cube', {x:0, y:h/2, z: d/2 + wallThick/2}, { scaleX: w, scaleY: h, scaleZ: wallThick, material: wallMaterial }, true);
    // Left wall
    this.objectManager.addObject('cube', {x:-w/2 - wallThick/2, y:h/2, z: 0}, { scaleX: wallThick, scaleY: h, scaleZ: d, material: wallMaterial }, true);
    // Right wall
    this.objectManager.addObject('cube', {x:w/2 + wallThick/2, y:h/2, z: 0}, { scaleX: wallThick, scaleY: h, scaleZ: d, material: wallMaterial }, true);


    // --- COLLISIONS ---
    const walls = [
        { min: [-w/2, 0, -d/2 - wallThick], max: [w/2, h, -d/2] }, // Back
        { min: [-w/2, 0, d/2], max: [w/2, h, d/2 + wallThick] },   // Front
        { min: [-w/2 - wallThick, 0, -d/2], max: [-w/2, h, d/2] }, // Left
        { min: [w/2, 0, -d/2], max: [w/2 + wallThick, h, d/2] },   // Right
        { min: [-w/2, -5, -d/2], max: [w/2, -0.1, d/2] },           // Floor (FIXED: lowered to -0.1)
        { min: [-w/2, h, -d/2], max: [w/2, h+1, d/2] }              // Ceiling
    ];

    walls.forEach(dims => {
        const box = new THREE.Box3();
        box.min.set(...dims.min);
        box.max.set(...dims.max);
        this.universe.colliders.push(box);
    });
    
    // EXIT DOOR (Behind start position, towards -Z)
    this.createPortal("..", 0, d/2 - 0.5, true); // Behind player's starting point

    // SEPARATE FILES AND DIRS (Heuristic Fix)
    const files = [];
    const dirs = [];
    
    entries.forEach(e => {
         // Same heuristic as City: No dot = Dir
         const isDir = !e.name.includes('.');
         if(isDir) dirs.push(e);
         else files.push(e);
    });

    // FILES (Center Pedestals)
    files.forEach((f, i) => {
        const angle = (i / files.length) * Math.PI * 2;
        const r = 4;
        const fx = Math.cos(angle) * r;
        const fz = Math.sin(angle) * r;
        
        // Pedestal + File
        this.objectManager.addObject('cylinder', {x: fx, y: 0.5, z: fz}, { scale: 1, color: 0x333333 }, true);
        this.objectManager.addObject('file', {x: fx, y: 1.5, z: fz}, { color: 0x00ffff, label: f.name }, true);

        // Collision for pedestal
        const pedBox = new THREE.Box3();
        pedBox.min.set(fx - 0.5, 0, fz - 0.5);
        pedBox.max.set(fx + 0.5, 1, fz + 0.5);
        this.universe.colliders.push(pedBox);

        this.doors.push({
            type: 'file',
            targetPath: f.path,
            pos: new THREE.Vector3(fx, 1.5, fz),
            radius: 2,
            name: f.name
        });
    });

    // ELEVATORS (Subdirectories) - On Side Walls
    dirs.forEach((dItem, i) => {
        const isLeft = i % 2 === 0;
        const xPos = isLeft ? -w/2 + 0.5 : w/2 - 0.5;
        const zPos = ((i/2|0) - (dirs.length/4)) * 4;

        this.objectManager.addObject('building', // Reusing building as elevator frame
            { x: xPos, y: 0, z: zPos }, 
            { buildingType: 'office', height: 4, label: dItem.name, scale: 0.5 }, 
            true
        );
        
        this.doors.push({
            type: 'dir',
            targetPath: dItem.path,
            pos: new THREE.Vector3(xPos, 1, zPos),
            radius: 3,
            name: dItem.name
        });
    });
  }

  update(playerPos) {
    if (!this.isCityActive) return;
    
    let nearest = null;
    let minD = Infinity;

    for (const door of this.doors) {
        const dist = playerPos.distanceTo(door.pos);
        if (dist < door.radius) {
            if (dist < minD) {
                minD = dist;
                nearest = door;
            }
        }
    }

    const prompt = document.getElementById('interaction-prompt');
    if (nearest) {
        let text = "";
        if (nearest.type === 'dir') text = `ENTRAR ${nearest.name}`;
        else if (nearest.type === 'back') text = "VOLTAR";
        else text = `ABRIR ${nearest.name}`;
        
        prompt.textContent = `[E] / TAP: ${text}`;
        prompt.style.display = 'block';

        if ((this.universe.keys.e || (this.universe.joystick.active && minD < 1.0)) && !this.interactCooldown) {
            this.handleInteraction(nearest);
            this.interactCooldown = true;
            setTimeout(() => this.interactCooldown = false, 500); 
        }
    } else {
        prompt.style.display = 'none';
    }
    
    if (this.universe.keys.e) this.universe.keys.e = false;
  }

  async handleInteraction(target) {
      if (this.interactCooldown) return;
      this.interactCooldown = true;
      setTimeout(() => this.interactCooldown = false, 500);

      if (target.type === 'dir') {
          this.loadLevel(target.targetPath);
      } else if (target.type === 'back') {
          const parentPath = await dirname(this.currentPath);
          if (parentPath !== this.currentPath) { // Check if we actually moved up
              this.loadLevel(parentPath);
          } else {
              // If already at drive root (e.g. C:/), then just stay or go to initialRootPath
              this.loadLevel(this.initialRootPath); // Go back to the initial city view
          }
      } else if (target.type === 'file') {
          console.log("Opening:", target.targetPath);
          shellOpen(target.targetPath);
      }
  }
}
