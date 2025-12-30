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
      office: 0x334455,
      factory: 0x555555,
      matrix: 0x001a00,
      gallery: 0x2a1a3a,
      library: 0x3a2a1a,
      tech: 0x1a2a3a,
      glass: 0x88aacc
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

    await this.objectManager.removeAllCityObjects();
    this.universe.colliders = [];

    const isCityView = (this.currentPath === this.initialRootPath);
    
    // Ambiente
    if (isCityView) {
        this.universe.scene.background = new THREE.Color(0x0a0515);
        this.universe.scene.fog = new THREE.FogExp2(0x0a0515, 0.018);
    } else {
        this.universe.scene.background = new THREE.Color(0x0a0a0a);
        this.universe.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.04);
    }

    try {
      const entries = await readDir(path);

      if (isCityView) {
        await this.buildBeautifulCity(entries);
      } else {
        await this.buildThemedLobby(entries);
      }

      if(this.universe.player) {
        this.universe.player.position.set(0, 2, isCityView ? 20 : 8);
        this.universe.playerVelocity.set(0,0,0);
        this.universe.fpsYaw = Math.PI;
        this.universe.fpsPitch = 0;
      }

    } catch (e) {
      console.error("Erro ao ler diretório:", e);
    }
  }

  async buildBeautifulCity(entries) {
    const MAX = 100;
    if (entries.length > MAX) entries = entries.slice(0, MAX);

    const dirs = [];
    const files = [];
    entries.forEach(e => {
        const isDir = !e.name.includes('.');
        if (isDir) dirs.push(e);
        else files.push(e);
    });

    console.log(`🏗️ Construindo cidade: ${dirs.length} prédios`);

    // Chão
    const floor = new THREE.Box3();
    floor.min.set(-150, -5, -150);
    floor.max.set(150, -0.05, 150);
    this.universe.colliders.push(floor);

    // LAYOUT ORGÂNICO - Quarteirões variados
    const STREET = 10;
    const BLOCK = 7;
    
    let buildingIndex = 0;
    const gridSize = Math.ceil(Math.sqrt(dirs.length));

    for (let bx = -gridSize; bx <= gridSize; bx++) {
        for (let bz = -gridSize; bz <= gridSize; bz++) {
            if (buildingIndex >= dirs.length) break;

            // Offset orgânico (não perfeitamente alinhado)
            const offsetX = (Math.random() - 0.5) * 3;
            const offsetZ = (Math.random() - 0.5) * 3;

            const x = bx * (BLOCK + STREET) + offsetX;
            const z = bz * (BLOCK + STREET) + offsetZ;

            // Pular algumas posições para criar praças
            if (Math.random() > 0.85) {
                this.createPark(x, z);
                continue;
            }

            await this.createArchitecturalBuilding(dirs[buildingIndex], x, z);
            buildingIndex++;
        }
    }

    // Arquivos em praça central circular
    const plaza = gridSize * (BLOCK + STREET) * 0.7;
    files.forEach((file, i) => {
        const angle = (i / files.length) * Math.PI * 2;
        const x = Math.cos(angle) * plaza;
        const z = Math.sin(angle) * plaza;
        this.createStylizedFile(file, x, z);
    });

    // Portal de saída
    if (this.currentPath !== this.initialRootPath) {
        await this.createStylizedPortal(0, plaza + 8);
    }

    // Iluminação da cidade
    this.addCityLights(gridSize, BLOCK + STREET);

    console.log(`✅ Cidade renderizada`);
  }

  async createArchitecturalBuilding(entry, x, z) {
    const name = entry.name.toLowerCase();
    
    // Analisar tipo
    let type = 'office';
    let height = 10;
    
    if (name.includes('src') || name.includes('code') || name.includes('app')) {
        type = 'tech';
        height = 18;
    } else if (name.includes('node_modules') || name.includes('.git') || name.includes('cache')) {
        type = 'hidden';
        height = 4;
    } else if (name.includes('image') || name.includes('photo') || name.includes('media')) {
        type = 'gallery';
        height = 12;
    } else if (name.includes('doc') || name.includes('text') || name.includes('data')) {
        type = 'library';
        height = 14;
    } else if (name.includes('bin') || name.includes('build') || name.includes('dist')) {
        type = 'factory';
        height = 16;
    } else {
        height = 8 + Math.random() * 8;
    }

    // Cores
    const baseColor = this.getBuildingColor(type);
    const darkColor = this.darkenColor(baseColor, 0.5);

    // BASE DO PRÉDIO
    const baseWidth = type === 'tech' ? 6 : 5;
    const baseDepth = type === 'factory' ? 6.5 : 5;

    await this.objectManager.addObject('cube',
        { x, y: height / 2, z },
        { scaleX: baseWidth, scaleY: height, scaleZ: baseDepth, color: baseColor },
        true
    );

    // TOPO (estrutura diferente)
    if (type === 'tech') {
        // Topo pirâmide
        await this.objectManager.addObject('pyramid',
            { x, y: height + 1, z },
            { scale: 3, color: this.colors.glass },
            true
        );
    } else if (type === 'gallery') {
        // Topo plano com borda
        await this.objectManager.addObject('cube',
            { x, y: height + 0.3, z },
            { scaleX: baseWidth + 0.5, scaleY: 0.6, scaleZ: baseDepth + 0.5, color: darkColor },
            true
        );
    } else if (type === 'factory') {
        // Chaminés
        await this.objectManager.addObject('cylinder',
            { x: x + 2, y: height + 2, z },
            { scale: 0.8, height: 4, color: 0x333333 },
            true
        );
        await this.objectManager.addObject('cylinder',
            { x: x - 2, y: height + 1.5, z },
            { scale: 0.6, height: 3, color: 0x333333 },
            true
        );
    }

    // JANELAS (várias camadas)
    const windowLayers = Math.floor(height / 3);
    for (let i = 1; i <= windowLayers; i++) {
        const y = (height / windowLayers) * i - 1.5;
        
        // Janelas frontais
        await this.objectManager.addObject('cube',
            { x, y, z: z + baseDepth / 2 + 0.05 },
            { scaleX: baseWidth * 0.7, scaleY: 1.5, scaleZ: 0.1, color: this.colors.glass },
            true
        );

        // Janelas laterais (se não for hidden)
        if (type !== 'hidden') {
            await this.objectManager.addObject('cube',
                { x: x + baseWidth / 2 + 0.05, y, z },
                { scaleX: 0.1, scaleY: 1.5, scaleZ: baseDepth * 0.6, color: this.colors.glass },
                true
            );
        }
    }

    // ENTRADA (porta + marquise)
    const doorZ = z + baseDepth / 2 + 0.1;
    
    // Marquise
    await this.objectManager.addObject('cube',
        { x, y: 2.5, z: doorZ + 0.5 },
        { scaleX: 4, scaleY: 0.2, scaleZ: 1, color: darkColor },
        true
    );

    // Porta (emissiva)
    await this.objectManager.addObject('cube',
        { x, y: 1.5, z: doorZ },
        { scaleX: 2, scaleY: 3, scaleZ: 0.1, color: 0x00ff88 },
        true
    );

    // Placa com nome
    await this.createFloatingLabel(entry.name, x, height + 0.8, z);

    // Colisão
    const box = new THREE.Box3();
    box.min.set(x - baseWidth/2, 0, z - baseDepth/2);
    box.max.set(x + baseWidth/2, height, z + baseDepth/2);
    this.universe.colliders.push(box);

    // Interação
    this.doors.push({
        targetPath: entry.path,
        type: 'dir',
        pos: new THREE.Vector3(x, 0, doorZ),
        radius: 6,
        name: entry.name
    });
  }

  getBuildingColor(type) {
    const colors = {
        'office': 0x445566,
        'tech': 0x1a3a4a,
        'factory': 0x4a4a4a,
        'gallery': 0x3a2a4a,
        'library': 0x4a3a2a,
        'hidden': 0x1a1a1a
    };
    return colors[type] || colors.office;
  }

  darkenColor(hex, factor) {
    const r = ((hex >> 16) & 0xff) * factor;
    const g = ((hex >> 8) & 0xff) * factor;
    const b = (hex & 0xff) * factor;
    return (r << 16) | (g << 8) | b;
  }

  createPark(x, z) {
    // Árvore simples
    this.objectManager.addObject('cylinder',
        { x, y: 1.5, z },
        { scale: 0.4, height: 3, color: 0x4a3020 },
        true
    );
    this.objectManager.addObject('sphere',
        { x, y: 3.5, z },
        { scale: 2, color: 0x2a5a2a },
        true
    );
  }

  async createStylizedFile(entry, x, z) {
    const ext = entry.name.split('.').pop().toLowerCase();

    let color = 0xaaaaaa;
    let shape = 'cube';

    if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
        color = 0xff44aa;
        shape = 'picture';
    } else if (['js', 'ts', 'py', 'java'].includes(ext)) {
        color = 0x44aaff;
        shape = 'code';
    } else if (['mp4', 'avi', 'mkv'].includes(ext)) {
        color = 0xff6644;
        shape = 'video';
    } else if (['txt', 'md', 'pdf'].includes(ext)) {
        color = 0x44ff88;
        shape = 'doc';
    }

    // Pedestal com borda
    await this.objectManager.addObject('cylinder',
        { x, y: 0.3, z },
        { scale: 1.2, height: 0.6, color: 0x2a2a2a },
        true
    );

    await this.objectManager.addObject('cylinder',
        { x, y: 0.7, z },
        { scale: 1, height: 0.2, color: 0x1a1a1a },
        true
    );

    // Objeto baseado em tipo
    if (shape === 'picture') {
        // Moldura vertical
        await this.objectManager.addObject('cube',
            { x, y: 2, z },
            { scaleX: 1.5, scaleY: 2, scaleZ: 0.1, color: 0x8a7a6a },
            true
        );
        await this.objectManager.addObject('cube',
            { x, y: 2, z: z + 0.05 },
            { scaleX: 1.3, scaleY: 1.8, scaleZ: 0.05, color },
            true
        );
    } else if (shape === 'video') {
        // Tela 16:9
        await this.objectManager.addObject('cube',
            { x, y: 2, z },
            { scaleX: 2, scaleY: 1.2, scaleZ: 0.1, color },
            true
        );
    } else if (shape === 'code') {
        // Holograma rotativo
        await this.objectManager.addObject('torus',
            { x, y: 2, z },
            { scale: 0.9, color },
            true
        );
    } else {
        // Cristal padrão
        await this.objectManager.addObject('pyramid',
            { x, y: 2, z },
            { scale: 1.2, color },
            true
        );
    }

    this.doors.push({
        targetPath: entry.path,
        type: 'file',
        pos: new THREE.Vector3(x, 2, z),
        radius: 2.5,
        name: entry.name
    });
  }

  async createStylizedPortal(x, z) {
    // Anel duplo rotativo
    await this.objectManager.addObject('torus',
        { x, y: 2.5, z },
        { scale: 2.5, color: 0xff8800 },
        true
    );
    
    await this.objectManager.addObject('torus',
        { x, y: 2.5, z },
        { scale: 2, color: 0xffaa00 },
        true
    );

    this.doors.push({
        type: 'back',
        pos: new THREE.Vector3(x, 2.5, z),
        radius: 4.5,
        name: 'VOLTAR'
    });
  }

  async createFloatingLabel(text, x, y, z) {
    // Você pode adicionar uma sprite com texto aqui
    // Por enquanto, placeholder
  }

  addCityLights(gridSize, spacing) {
    if (!this.universe.settings.shadows) return;

    // Postes de luz nas ruas
    const lights = [
        [0, 15, 0], // Centro
        [spacing * gridSize * 0.5, 12, spacing * gridSize * 0.5],
        [-spacing * gridSize * 0.5, 12, spacing * gridSize * 0.5],
        [spacing * gridSize * 0.5, 12, -spacing * gridSize * 0.5],
        [-spacing * gridSize * 0.5, 12, -spacing * gridSize * 0.5]
    ];

    lights.forEach(([lx, ly, lz]) => {
        const light = new THREE.PointLight(0x88ccff, 1.2, 60);
        light.position.set(lx, ly, lz);
        this.universe.lightsGroup.add(light);
    });
  }

  // ==================== LOBBIES TEMÁTICOS ====================

  async buildThemedLobby(entries) {
    const dirs = [];
    const files = [];
    entries.forEach(e => {
        const isDir = !e.name.includes('.');
        if (isDir) dirs.push(e);
        else files.push(e);
    });

    // Detectar tema baseado em conteúdo
    let theme = 'generic';
    const exts = files.map(f => f.name.split('.').pop().toLowerCase());
    
    const imgCount = exts.filter(e => ['png','jpg','jpeg','gif'].includes(e)).length;
    const codeCount = exts.filter(e => ['js','ts','py','java','cpp'].includes(e)).length;
    const docCount = exts.filter(e => ['txt','md','pdf','doc'].includes(e)).length;
    const videoCount = exts.filter(e => ['mp4','avi','mkv','mov'].includes(e)).length;

    if (imgCount > files.length * 0.4) theme = 'gallery';
    else if (codeCount > files.length * 0.3) theme = 'server';
    else if (docCount > files.length * 0.4) theme = 'library';
    else if (videoCount > files.length * 0.3) theme = 'cinema';

    console.log(`🏛️ Criando lobby tema: ${theme.toUpperCase()}`);

    switch(theme) {
        case 'gallery': await this.buildGallery(files, dirs); break;
        case 'server': await this.buildServerRoom(files, dirs); break;
        case 'library': await this.buildLibrary(files, dirs); break;
        case 'cinema': await this.buildCinema(files, dirs); break;
        default: await this.buildGenericLobby(files, dirs);
    }

    await this.createStylizedPortal(0, 10);
  }

  async buildGallery(files, dirs) {
    const W = 24, H = 10, D = 24;
    await this.createStyledRoom(W, H, D, 0x1a1520);

    // Iluminação suave
    if (this.universe.settings.shadows) {
        const spot = new THREE.SpotLight(0xffffff, 2.5, 35, Math.PI / 5);
        spot.position.set(0, H - 1, 0);
        spot.target.position.set(0, 0, 0);
        this.universe.lightsGroup.add(spot);
        this.universe.lightsGroup.add(spot.target);
    }

    // Quadros nas paredes
    let idx = 0;
    const gap = 4;

    // Parede Norte
    for (let x = -W/2 + gap; x < W/2 - gap && idx < files.length; x += gap) {
        await this.hangArtwork(files[idx], x, 4, -D/2 + 0.5);
        idx++;
    }

    // Parede Sul
    for (let x = -W/2 + gap; x < W/2 - gap && idx < files.length; x += gap) {
        await this.hangArtwork(files[idx], x, 4, D/2 - 0.5);
        idx++;
    }

    // Esculturas no centro (resto dos arquivos)
    while (idx < files.length) {
        const angle = (idx / files.length) * Math.PI * 2;
        const r = 5;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        await this.createSculpture(files[idx], x, z);
        idx++;
    }

    // Elevadores nos cantos
    await this.placeCornerElevators(dirs, W, D);
  }

  async buildServerRoom(files, dirs) {
    const W = 22, H = 7, D = 22;
    await this.createStyledRoom(W, H, D, 0x0a0f0a);

    // Luz verde
    if (this.universe.settings.shadows) {
        const green = new THREE.PointLight(0x00ff44, 1.5, 18);
        green.position.set(0, H - 1, 0);
        this.universe.lightsGroup.add(green);
    }

    // Racks em corredores
    const rows = 4;
    const cols = Math.ceil(files.length / rows);
    const spacing = 3.5;

    files.forEach((file, i) => {
        const row = i % rows;
        const col = Math.floor(i / rows);
        const x = (col - cols/2) * spacing;
        const z = (row - 2) * spacing;

        // Rack tower
        this.objectManager.addObject('cube',
            { x, y: 2, z },
            { scaleX: 1.2, scaleY: 4, scaleZ: 0.6, color: 0x1a2a1a },
            true
        );

        // LEDs
        for (let led = 0; led < 3; led++) {
            this.objectManager.addObject('sphere',
                { x: x - 0.4, y: 1 + led * 1.2, z: z + 0.35 },
                { scale: 0.1, color: Math.random() > 0.5 ? 0x00ff00 : 0xff0000 },
                true
            );
        }

        const box = new THREE.Box3();
        box.min.set(x - 0.6, 0, z - 0.3);
        box.max.set(x + 0.6, 4, z + 0.3);
        this.universe.colliders.push(box);

        this.doors.push({
            type: 'file',
            targetPath: file.path,
            pos: new THREE.Vector3(x, 2, z),
            radius: 2,
            name: file.name
        });
    });

    await this.placeWallElevators(dirs, W, D);
  }

  async buildLibrary(files, dirs) {
    const W = 26, H = 9, D = 26;
    await this.createStyledRoom(W, H, D, 0x2a1a0a);

    // Luz quente
    if (this.universe.settings.shadows) {
        const warm = new THREE.PointLight(0xffaa55, 1.8, 22);
        warm.position.set(0, H - 1, 0);
        this.universe.lightsGroup.add(warm);
    }

    // Estantes em ilhas
    const shelfCount = Math.ceil(files.length / 4);
    let fileIdx = 0;

    for (let i = 0; i < shelfCount && fileIdx < files.length; i++) {
        const x = ((i % 3) - 1) * 7;
        const z = (Math.floor(i / 3) - 1) * 6;

        // Estante
        await this.objectManager.addObject('cube',
            { x, y: 2.5, z },
            { scaleX: 4, scaleY: 5, scaleZ: 0.4, color: 0x5a3a1a },
            true
        );

        // Livros (4 por estante)
        for (let book = 0; book < 4 && fileIdx < files.length; book++) {
            const bx = x + (book - 1.5) * 0.9;
            
            await this.objectManager.addObject('cube',
                { x: bx, y: 2 + Math.random(), z: z + 0.25 },
                { scaleX: 0.6, scaleY: 1.2, scaleZ: 0.2, color: 0x8a5a2a },
                true
            );

            this.doors.push({
                type: 'file',
                targetPath: files[fileIdx].path,
                pos: new THREE.Vector3(bx, 2, z),
                radius: 1.8,
                name: files[fileIdx].name
            });
            fileIdx++;
        }

        const box = new THREE.Box3();
        box.min.set(x - 2, 0, z - 0.2);
        box.max.set(x + 2, 5, z + 0.2);
        this.universe.colliders.push(box);
    }

    await this.placeCornerElevators(dirs, W, D);
  }

  async buildCinema(files, dirs) {
    const W = 24, H = 10, D = 30;
    await this.createStyledRoom(W, H, D, 0x0a0000);

    // Tela gigante
    await this.objectManager.addObject('cube',
        { x: 0, y: 5, z: -D/2 + 3 },
        { scaleX: 18, scaleY: 10, scaleZ: 0.3, color: 0x1a1a1a },
        true
    );
    
    await this.objectManager.addObject('cube',
        { x: 0, y: 5, z: -D/2 + 3.2 },
        { scaleX: 16, scaleY: 9, scaleZ: 0.1, color: 0xeeeeee },
        true
    );

    // Poltronas
    const rows = Math.ceil(Math.sqrt(files.length));
    const seatsPerRow = Math.ceil(files.length / rows);

    files.forEach((file, i) => {
        const row = Math.floor(i / seatsPerRow);
        const seat = i % seatsPerRow;
        const x = (seat - seatsPerRow/2) * 2;
        const z = row * 2.5 + 2;

        // Poltrona
        this.objectManager.addObject('cube',
            { x, y: 0.4, z },
            { scaleX: 0.9, scaleY: 0.8, scaleZ: 0.9, color: 0x5a0000 },
            true
        );
        
        this.objectManager.addObject('cube',
            { x, y: 0.9, z: z - 0.2 },
            { scaleX: 0.9, scaleY: 0.6, scaleZ: 0.3, color: 0x6a0000 },
            true
        );

        this.doors.push({
            type: 'file',
            targetPath: file.path,
            pos: new THREE.Vector3(x, 0.5, z),
            radius: 1.5,
            name: file.name
        });
    });

    await this.placeWallElevators(dirs, W, D);
  }

  async buildGenericLobby(files, dirs) {
    const W = 20, H = 8, D = 20;
    await this.createStyledRoom(W, H, D, 0x1a1a1a);

    // Arquivos em espiral
    files.forEach((file, i) => {
        const angle = (i / files.length) * Math.PI * 2 * 2; // Duas voltas
        const r = 3 + (i / files.length) * 4;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;

        this.objectManager.addObject('cylinder',
            { x, y: 0.4, z },
            { scale: 0.6, height: 0.8, color: 0x2a2a2a },
            true
        );

        this.objectManager.addObject('sphere',
            { x, y: 1.2, z },
            { scale: 0.5, color: 0x44aaff },
            true
        );

        this.doors.push({
            type: 'file',
            targetPath: file.path,
            pos: new THREE.Vector3(x, 1, z),
            radius: 1.5,
            name: file.name
        });
    });

    await this.placeCornerElevators(dirs, W, D);
  }

  // ==================== HELPERS ====================

  async createStyledRoom(w, h, d, color) {
    const WALL = 1;

    // Chão com textura
    await this.objectManager.addObject('cube',
        { x: 0, y: -0.5, z: 0 },
        { scaleX: w, scaleY: 1, scaleZ: d, color },
        true
    );

    // Teto
    const ceilingColor = this.darkenColor(color, 0.7);
    await this.objectManager.addObject('cube',
        { x: 0, y: h + 0.5, z: 0 },
        { scaleX: w, scaleY: 1, scaleZ: d, color: ceilingColor },
        true
    );

    // Paredes
    const wallColor = this.darkenColor(color, 0.85);
    const walls = [
        { x: 0, y: h/2, z: -d/2 - WALL/2, sx: w, sy: h, sz: WALL },
        { x: 0, y: h/2, z: d/2 + WALL/2, sx: w, sy: h, sz: WALL },
        { x: -w/2 - WALL/2, y: h/2, z: 0, sx: WALL, sy: h, sz: d },
        { x: w/2 + WALL/2, y: h/2, z: 0, sx: WALL, sy: h, sz: d }
    ];

    for (const wall of walls) {
        await this.objectManager.addObject('cube',
            { x: wall.x, y: wall.y, z: wall.z },
            { scaleX: wall.sx, scaleY: wall.sy, scaleZ: wall.sz, color: wallColor },
            true
        );

        const box = new THREE.Box3();
        box.min.set(wall.x - wall.sx/2, 0, wall.z - wall.sz/2);
        box.max.set(wall.x + wall.sx/2, h, wall.z + wall.sz/2);
        this.universe.colliders.push(box);
    }

    this.universe.colliders.push(
        new THREE.Box3(new THREE.Vector3(-w/2, -5, -d/2), new THREE.Vector3(w/2, -0.05, d/2)),
        new THREE.Box3(new THREE.Vector3(-w/2, h, -d/2), new THREE.Vector3(w/2, h+1, d/2))
    );
  }

  async hangArtwork(file, x, y, z) {
    // Moldura
    await this.objectManager.addObject('cube',
        { x, y, z },
        { scaleX: 2.2, scaleY: 2.8, scaleZ: 0.15, color: 0x8a7a5a },
        true
    );

    // Tela
    await this.objectManager.addObject('cube',
        { x, y, z: z + 0.08 },
        { scaleX: 2, scaleY: 2.5, scaleZ: 0.05, color: 0xff44aa },
        true
    );

    this.doors.push({
        type: 'file',
        targetPath: file.path,
        pos: new THREE.Vector3(x, y, z),
        radius: 2,
        name: file.name
    });
  }

  async createSculpture(file, x, z) {
    // Pedestal
    await this.objectManager.addObject('cylinder',
        { x, y: 0.5, z },
        { scale: 0.8, height: 1, color: 0x3a3a3a },
        true
    );

    // Escultura abstrata
    await this.objectManager.addObject('torus',
        { x, y: 1.5, z },
        { scale: 0.7, color: 0xff88cc },
        true
    );

    this.doors.push({
        type: 'file',
        targetPath: file.path,
        pos: new THREE.Vector3(x, 1.5, z),
        radius: 1.8,
        name: file.name
    });
  }

  async placeCornerElevators(dirs, w, d) {
    const corners = [
        [-w/2 + 3, -d/2 + 3],
        [w/2 - 3, -d/2 + 3],
        [-w/2 + 3, d/2 - 3],
        [w/2 - 3, d/2 - 3]
    ];

    for (let i = 0; i < Math.min(dirs.length, 4); i++) {
        const [x, z] = corners[i];
        
        await this.objectManager.addObject('cylinder',
            { x, y: 2.5, z },
            { scale: 1.5, height: 5, color: 0xff8800 },
            true
        );

        this.doors.push({
            type: 'dir',
            targetPath: dirs[i].path,
            pos: new THREE.Vector3(x, 1, z),
            radius: 3,
            name: dirs[i].name
        });
    }
  }

  async placeWallElevators(dirs, w, d) {
    dirs.forEach((dir, i) => {
        const side = i % 2;
        const x = side === 0 ? -w/2 + 2 : w/2 - 2;
        const z = ((i / 2 | 0) - dirs.length/4) * 5;

        this.objectManager.addObject('cylinder',
            { x, y: 2.5, z },
            { scale: 1.5, height: 5, color: 0xff8800 },
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
  }

  update(playerPos) {
    if (!this.isCityActive) return;

    let nearest = null;
    let minDist = Infinity;

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

        if ((this.universe.keys.e || (this.universe.joystick.active && minDist < 1.5)) && !this.interactCooldown) {
            this.interact(nearest);
        }
    } else {
        prompt.style.display = 'none';
    }

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
