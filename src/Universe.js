import * as THREE from 'three';
import { open as shellOpen } from '@tauri-apps/api/shell';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export class Universe {
  constructor(canvas, hasPlayer = false) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.objects = new Map();
    this.animationId = null;

    // Configurações Globais
    this.settings = {
        quality: 'retro', // Start in retro mode
        shadows: false,
        bloom: false,
        antialias: false,
        fog: false
    };

    this.hasPlayer = hasPlayer;
    
    // Player
    this.player = null;
    this.playerVelocity = new THREE.Vector3();
    this.playerLight = null; // Luz do player (ultra)

    // Modos de visão
    this.viewMode = '3d';
    this.cameraDistance = 12;

    // Raycaster
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.selectedObject = null;
    this.isDragging = false;
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.offset = new THREE.Vector3();

    // Physics & Collision
    this.colliders = []; // Array of THREE.Box3
    this.playerBox = new THREE.Box3();

    // Controles de câmera 3D
    this.cameraRotation = { x: 0, y: 0 };
    this.cameraTarget = new THREE.Vector3(0, 0, 0); // Ponto central de rotação (Blender style)
    this.isRotating = false;
    this.isPanning = false; // Novo estado para Pan
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // Controles FPS
    this.keys = { w: false, a: false, s: false, d: false, shift: false, space: false, e: false, enter: false };
    this.terminalActive = false; // NOVO: Pausa controles quando terminal está ativo
    this.joystick = { active: false, dx: 0, dy: 0, originX: 0, originY: 0 }; // Mobile Joystick
    this.fpsYaw = Math.PI;
    this.fpsPitch = 0;
    this.gravity = -0.02;
    this.jumpPower = 0.3;
    this.isGrounded = false;
    
    // Bindings
    this.onPointerLockChange = this.onPointerLockChange.bind(this);
    this.onPointerLockError = this.onPointerLockError.bind(this);

    // Throttle
    this.lastFrameTime = 0;
    this.frameInterval = 1000 / 60; // 60 FPS base

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    
    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 5, 12);
    this.camera.lookAt(0, 0, 0);

    // Renderer (Inicializa Básico)
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true, // Force on initially
      powerPreference: "high-performance",
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // POST PROCESSING
    this.composer = new EffectComposer(this.renderer);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    this.bloomPass.threshold = 0.2;
    this.bloomPass.strength = 1.2;
    this.bloomPass.radius = 0.5;
    this.composer.addPass(this.bloomPass);
    
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    // Lights Group (Para ligar/desligar)
    this.lightsGroup = new THREE.Group();
    this.scene.add(this.lightsGroup);
    
    // Hidden File Input for Texture Loading
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'image/*';
    this.fileInput.style.display = 'none';
    document.body.appendChild(this.fileInput);
    
    this.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && this.textureTargetObject) {
            this.applyTextureToMesh(this.textureTargetObject, file);
            this.textureTargetObject = null;
        }
        this.fileInput.value = ''; // Reset
    });

    // Setup Luzes
    const ambient = new THREE.AmbientLight(0x404040, 0.6); // Luz base
    this.lightsGroup.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 2);
    dir.position.set(10, 20, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 2048;
    dir.shadow.mapSize.height = 2048;
    this.lightsGroup.add(dir);

    // Helpers
    // FIX: Grid levemente elevado e com transparência para evitar flickering
    const gridHelper = new THREE.GridHelper(50, 50, 0x00ff00, 0x003300);
    gridHelper.position.y = 0.05; 
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.5;
    gridHelper.material.depthWrite = false; // Ajuda no Z-Fighting
    this.scene.add(gridHelper);

    // Chão invisível (mas sólido para raycast)
    const floorGeom = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshBasicMaterial({ visible: false });
    this.floor = new THREE.Mesh(floorGeom, floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.scene.add(this.floor);

    // Player e Estrelas
    if (this.hasPlayer) this.createPlayer();
    this.createStarField();

    // Listeners
    this.setupControls();
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('pointerlockerror', this.onPointerLockError);
    window.addEventListener('resize', () => this.onResize());
    
    // Drag & Drop Textures
    this.setupDragDrop();

    // Aplica qualidade inicial
    this.updateSettings(this.settings);

    this.animate();
    console.log('🌌 Universe Init');
  }

  setupDragDrop() {
      // Prevent default browser behavior for drag events
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
          this.canvas.addEventListener(eventName, (e) => {
              e.preventDefault();
              e.stopPropagation();
          }, false);
      });

      // Highlight effect? (Optional)
      this.canvas.addEventListener('dragover', () => {
          this.canvas.style.cursor = 'copy';
      });

      this.canvas.addEventListener('drop', (e) => {
          this.canvas.style.cursor = 'default';
          
          const dt = e.dataTransfer;
          const files = dt.files;
          
          if (files.length > 0) {
              const file = files[0];
              if (file.type.startsWith('image/')) {
                  this.handleTextureDrop(e.clientX, e.clientY, file);
              }
          }
      });
  }

  handleTextureDrop(clientX, clientY, file) {
      // Raycast to find target object
      const mouse = new THREE.Vector2();
      mouse.x = (clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(clientY / window.innerHeight) * 2 + 1;
      
      this.raycaster.setFromCamera(mouse, this.camera);
      
      // Filter only our managed objects
      const objects = Array.from(this.objects.values());
      const intersects = this.raycaster.intersectObjects(objects);
      
      if (intersects.length > 0) {
          const targetMesh = intersects[0].object;
          this.applyTextureToMesh(targetMesh, file);
      }
  }

  applyTextureToMesh(mesh, file) {
      const url = URL.createObjectURL(file);
      const loader = new THREE.TextureLoader();
      
      loader.load(url, (texture) => {
          // Optimization: Set correct color space for images
          texture.colorSpace = THREE.SRGBColorSpace;
          
          // Optimization: Dispose old texture to free GPU memory
          if (mesh.material.map) {
              mesh.material.map.dispose();
          }

          mesh.material.map = texture;
          mesh.material.color.setHex(0xffffff); // Reset color to white so texture is visible
          mesh.material.needsUpdate = true;
          
          // Save texture info to userData so it might persist (future proofing)
          mesh.userData.hasTexture = true;
          
          console.log(`🖼️ Texture applied to object ${mesh.userData.id}`);
          
          // Cleanup Blob URL
          URL.revokeObjectURL(url);
      });
  }

  // --- QUALITY SYSTEM ---

  setQuality(mode) {
    // Backward compatibility for the UI buttons
    if (mode === 'retro') {
        this.updateSettings({
            quality: 'retro',
            shadows: false,
            bloom: false,
            antialias: false,
            fog: false
        });
    } else {
        this.updateSettings({
            quality: 'ultra',
            shadows: true,
            bloom: true,
            antialias: true,
            fog: true
        });
    }
  }

  updateSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings };
      console.log('⚙️ Settings Updated:', this.settings);

      // Apply specific settings
      
      // 1. Shadows / Lights
      this.lightsGroup.visible = this.settings.shadows; // Basic heuristic: if shadows on, lights on
      this.renderer.shadowMap.enabled = this.settings.shadows;
      
      // 2. Fog / Background
      if (this.settings.fog) {
          this.scene.background = new THREE.Color(0x050510);
          this.scene.fog = new THREE.FogExp2(0x050510, 0.015);
      } else {
          this.scene.background = new THREE.Color(0x000000);
          this.scene.fog = new THREE.FogExp2(0x000000, 0.04);
      }

      // 3. Antialias (Requires renderer rebuild usually, but we can toggle pixel ratio)
      this.renderer.setPixelRatio(this.settings.antialias ? window.devicePixelRatio : 0.5);

      // 4. Update Materials
      this.objects.forEach(mesh => this.updateObjectMaterial(mesh));
      if (this.player) {
          this.player.traverse(child => {
            if (child.isMesh) this.updateObjectMaterial(child, true);
          });
          if (this.playerLight) this.playerLight.visible = this.settings.bloom;
      }
      
      // Notify UI if function exists
      if (window.updateQualityUI) window.updateQualityUI(this.settings.quality);
  }

  getMaterial(color, isEmissive = false) {
    if (!this.settings.shadows) {
      // "Retro" / Low Quality
      return new THREE.MeshBasicMaterial({ color: color });
    } else {
      // High Quality
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.2
      });
      if (isEmissive) {
        mat.emissive = new THREE.Color(color);
        mat.emissiveIntensity = this.settings.bloom ? 2.0 : 0.8; // Boost for bloom
      }
      return mat;
    }
  }

  updateObjectMaterial(mesh, isPlayer = false) {
    if (!mesh.userData || !mesh.userData.properties) {
        if (isPlayer && mesh.material) {
            const color = mesh.material.color.getHex();
            mesh.material.dispose();
            mesh.material = this.getMaterial(color, false);
        }
        return;
    }
    const props = mesh.userData.properties;
    const color = props.color || 0xffffff;
    const isNode = mesh.userData.type === 'node';
    
    if (mesh.isGroup) {
        mesh.children.forEach(child => {
            if (child.isMesh) {
                 child.material.dispose();
                 child.material = this.getMaterial(child.userData.originalColor || color, isNode);
                 child.castShadow = this.settings.shadows;
                 child.receiveShadow = this.settings.shadows;
            }
        });
    } else {
        mesh.material.dispose();
        mesh.material = this.getMaterial(color, isNode);
        mesh.castShadow = this.settings.shadows;
        mesh.receiveShadow = this.settings.shadows;
    }
  }

  // --- CREATION ---
  // ... (createPlayer, createStarField, addObject, removeObject, updateObjectPosition, updateObjectProperties mantidos iguais)
  createPlayer() {
    const group = new THREE.Group();
    const bodyGeom = new THREE.CylinderGeometry(0.3, 0.3, 1.4, 8);
    const bodyMat = this.getMaterial(0x00ffff);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.7;

    const headGeom = new THREE.SphereGeometry(0.25, 8, 8);
    const headMat = this.getMaterial(0x00ffff);
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.6;

    group.add(body);
    group.add(head);

    this.playerLight = new THREE.PointLight(0x00ffff, 1, 5);
    this.playerLight.position.set(0, 2, 0);
    this.playerLight.visible = false;
    group.add(this.playerLight);

    group.position.set(0, 0.1, 0);
    this.player = group;
    this.scene.add(group);
  }

  createStarField() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let i = 0; i < 200; i++) {
      vertices.push(
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 100 + 20,
        (Math.random() - 0.5) * 200
      );
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2 });
    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  addObject(type, position, properties, id, isGhost = false) {
    let mesh;
    const segs = 32; 
    
    if (type === 'folder') {
        mesh = new THREE.Group();
        // ... (Folder geometry code remains the same)
        const backGeom = new THREE.BoxGeometry(1.2, 0.9, 0.1);
        const backMat = this.getMaterial(properties.color);
        const back = new THREE.Mesh(backGeom, backMat);
        back.userData = { parentId: id }; // Link to parent
        
        const tabGeom = new THREE.BoxGeometry(0.4, 0.2, 0.1);
        const tab = new THREE.Mesh(tabGeom, backMat.clone());
        tab.position.set(-0.4, 0.55, 0);
        tab.userData = { parentId: id };
        
        const paperGeom = new THREE.BoxGeometry(1.0, 0.8, 0.05);
        const paperMat = this.getMaterial(0xffffff);
        const paper = new THREE.Mesh(paperGeom, paperMat);
        paper.position.set(0, 0.05, 0.05);
        paper.userData = { parentId: id };
        
        const frontGeom = new THREE.BoxGeometry(1.2, 0.5, 0.05);
        const front = new THREE.Mesh(frontGeom, backMat.clone());
        front.position.set(0, -0.2, 0.1);
        front.rotation.x = 0.1; 
        front.userData = { parentId: id };

        mesh.add(back);
        mesh.add(tab);
        mesh.add(paper);
        mesh.add(front);
        
        mesh.scale.setScalar(properties.scale || 1);

    } else if (type === 'building') {
        // --- CITY BUILDING RENDERER ---
        mesh = new THREE.Group();
        const bType = properties.buildingType || 'office';
        const height = properties.height || 6;
        const color = properties.color || 0x00ffff;
        
        let buildingMesh;

        if (bType === 'factory') {
            // Fábrica
            const geo = new THREE.CylinderGeometry(3, 4, height, 32);
            const mat = this.getMaterial(0x555555); // Factory Gray
            buildingMesh = new THREE.Mesh(geo, mat);
            buildingMesh.position.y = height / 2;
            
            const chimGeo = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
            const chim = new THREE.Mesh(chimGeo, mat);
            chim.position.set(1.5, height, 0);
            mesh.add(chim);

        } else if (bType === 'blackhole') {
            // Buraco Negro
            const geo = new THREE.BoxGeometry(4, 4, 4);
            const mat = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
            buildingMesh = new THREE.Mesh(geo, mat);
            buildingMesh.position.y = 4;
            
            const ringGeo = new THREE.TorusGeometry(3, 0.1, 16, 32);
            const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
            ring.rotation.x = Math.PI / 2;
            buildingMesh.add(ring);

        } else if (bType === 'matrix') {
            // Matrix
            const geo = new THREE.BoxGeometry(3, height, 3);
            const mat = this.getMaterial(0x001100, true);
            mat.emissive = new THREE.Color(0x00ff00);
            mat.emissiveIntensity = 0.2;
            buildingMesh = new THREE.Mesh(geo, mat);
            buildingMesh.position.y = height / 2;

            const wireGeo = new THREE.EdgesGeometry(geo);
            const wireMat = new THREE.LineBasicMaterial({ color: 0x00ff00 });
            const wire = new THREE.LineSegments(wireGeo, wireMat);
            buildingMesh.add(wire);

        } else if (bType === 'gallery') {
            // Galeria
            const geo = new THREE.BoxGeometry(4, height, 4);
            const mat = new THREE.MeshPhysicalMaterial({ 
                color: 0x00aaff, 
                transmission: 0.5, 
                opacity: 0.8, 
                transparent: true,
                roughness: 0 
            });
            buildingMesh = new THREE.Mesh(geo, mat);
            buildingMesh.position.y = height / 2;

        } else {
            // Office
            const geo = new THREE.BoxGeometry(3, height, 3);
            const mat = this.getMaterial(0x222244);
            buildingMesh = new THREE.Mesh(geo, mat);
            buildingMesh.position.y = height / 2;
            // Windows logic (emissive random) handled in updateObjectMaterial potentially or simpler here
            if (Math.random() > 0.5 && mat.emissive) {
                mat.emissive = new THREE.Color(0x000044);
                mat.emissiveIntensity = 0.5;
            }
        }
        
        mesh.add(buildingMesh);

        // Porta
        const doorGeo = new THREE.PlaneGeometry(1.5, 2.5);
        const doorMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 1.25, 2); 
        if (bType === 'factory') door.position.z = 3.5;
        mesh.add(door);

        // Label
        if (properties.label) {
            const label = this.createLabel(properties.label);
            label.position.set(0, height + 1, 0);
            mesh.add(label);
        }

    } else if (type === 'monument') {
        // --- FILE MONUMENT ---
        mesh = new THREE.Group();
        const color = properties.color || 0xffffff;
        
        const geo = new THREE.OctahedronGeometry(0.8, 2); // Mais detalhes
        const mat = this.getMaterial(color, true);
        const m = new THREE.Mesh(geo, mat);
        mesh.add(m);

        if (properties.label) {
            const label = this.createLabel(properties.label, 0.5);
            label.position.y = 1.5;
            mesh.add(label);
        }

    } else if (type === 'portal') {
        // --- PORTAL ---
        const geo = new THREE.TorusGeometry(1.5, 0.1, 8, 32);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        mesh = new THREE.Mesh(geo, mat);
        
        if (properties.label) {
            const label = this.createLabel(properties.label);
            label.position.set(0, 2.0, 0);
            mesh.add(label); // Label as child
        }

    } else if (type === 'file') {
        // Thin box (File Card)
        const geom = new THREE.BoxGeometry(0.8, 1.1, 0.05);
        mesh = new THREE.Mesh(geom, this.getMaterial(properties.color));
        // Add a small header bar for detail
        const headGeom = new THREE.BoxGeometry(0.8, 0.2, 0.06);
        const headMat = this.getMaterial(0xffffff); // Contrast
        const head = new THREE.Mesh(headGeom, headMat);
        head.position.y = 0.45;
        head.userData = { parentId: id };
        
        // If it's a mesh, we can just return it, but let's make it a group for consistency if we add details
        // Actually for now, just the mesh + child detail
        mesh.add(head);
        
    } else {
        // Primitives
        switch (type) {
          case 'sphere': mesh = new THREE.Mesh(new THREE.SphereGeometry(properties.scale || 1, segs, segs), this.getMaterial(properties.color)); break;
          case 'cube': 
            const sx = properties.scaleX || properties.scale || 1;
            const sy = properties.scaleY || properties.scale || 1;
            const sz = properties.scaleZ || properties.scale || 1;
            mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), this.getMaterial(properties.color)); 
            break;
          case 'node': mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3 * properties.scale, 32, 32), this.getMaterial(properties.color, true)); break;
          case 'pyramid': mesh = new THREE.Mesh(new THREE.ConeGeometry(properties.scale, properties.scale * 1.5, 4), this.getMaterial(properties.color)); break;
          case 'torus': mesh = new THREE.Mesh(new THREE.TorusGeometry(properties.scale, 0.3, 16, 32), this.getMaterial(properties.color)); break;
          case 'cylinder': mesh = new THREE.Mesh(new THREE.CylinderGeometry(properties.scale * 0.5, properties.scale * 0.5, properties.scale * 2, 32), this.getMaterial(properties.color)); break;
          default: mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), this.getMaterial(0xffffff));
        }
    }

    mesh.position.copy(position);
    mesh.userData = { id, type, properties, isGhost, isSolid: true };
    mesh.castShadow = this.settings.shadows;
    mesh.receiveShadow = this.settings.shadows;
    
    // Propagate shadows to children (Groups)
    if (mesh.isGroup) {
        mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = this.settings.shadows;
                child.receiveShadow = this.settings.shadows;
            }
        });
    }

    if (isGhost) { 
        if (mesh.isGroup) {
            mesh.children.forEach(c => {
                if (c.material) {
                    c.material.transparent = true;
                    c.material.opacity = 0.5;
                }
            });
        } else {
            mesh.material.transparent = true; 
            mesh.material.opacity = 0.5; 
        }
    }
    
    this.scene.add(mesh);
    this.objects.set(id, mesh);
    return mesh;
  }

  createLabel(text, scale=1) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0,0,512,128);
    ctx.font = 'bold 50px monospace';
    ctx.fillStyle = '#00ffff'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.substring(0, 20), 256, 64);
    
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(4 * scale, 1 * scale, 1);
    return sprite;
  }

  removeObject(id) {
    const obj = this.objects.get(id);
    if (obj) {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
      this.objects.delete(id);
    }
  }

  updateObjectPosition(id, position) {
      const obj = this.objects.get(id);
      if(obj) obj.position.lerp(position, 0.5);
  }

  updateObjectProperties(id, properties) {
      const obj = this.objects.get(id);
      if(obj) {
          obj.userData.properties = { ...obj.userData.properties, ...properties };
          this.updateObjectMaterial(obj);
          if (properties.scale) obj.scale.setScalar(properties.scale);
      }
  }

  // --- CONTROLS & LOGIC ---

  toggleViewMode() {
    if (!this.hasPlayer) return;
    
    // If currently in FPS mode (locked OR fallback), exit
    if (this.viewMode === 'fps') {
        this.exitFPS();
    } else {
        this.enterFPS();
    }
  }

  enterFPS() {
      // Focus canvas first to ensure keyboard events go there
      this.canvas.focus();
      
      // Simple lock for better compatibility
      this.canvas.requestPointerLock().catch(err => {
          console.error("PointerLock failed:", err);
          this.onPointerLockError();
      });
  }

  exitFPS() {
      if (document.pointerLockElement === this.canvas) {
          document.exitPointerLock();
      }
      this.viewMode = '3d';
      this.onPointerLockChange(); 
  }

  onPointerLockChange() {
    const isLocked = document.pointerLockElement === this.canvas;
    
    if (isLocked) {
      this.viewMode = 'fps';
      if(this.player) this.player.visible = false;
      document.body.classList.add('fps-mode');
      document.getElementById('hud-mode').textContent = 'FPS MODE';
      document.getElementById('crosshair').classList.add('active');
      document.getElementById('btn-view-mode').innerHTML = '🌍 Sair do FPS (ESC)';
    } else {
      this.viewMode = '3d';
      if(this.player) {
          this.player.visible = true;
          this.camera.position.set(
              this.player.position.x, 
              this.player.position.y + 5, 
              this.player.position.z + 10
          );
          this.camera.lookAt(this.player.position);
          this.cameraRotation = { x: 0, y: 0 };
      }
      document.body.classList.remove('fps-mode');
      document.getElementById('hud-mode').textContent = '3D ORBITAL';
      document.getElementById('crosshair').classList.remove('active');
      document.getElementById('btn-view-mode').innerHTML = '👁️ Entrar em FPS';
    }
  }

  onPointerLockError() {
    console.warn("Pointer Lock Failed - Enabling Fallback FPS Mode");
    this.viewMode = 'fps';
    if(this.player) this.player.visible = false;
    document.getElementById('hud-mode').textContent = 'FPS (KEYBOARD)';
    document.getElementById('crosshair').classList.add('active');
    document.getElementById('btn-view-mode').innerHTML = '🌍 Sair (ESC)';
    console.log("Fallback FPS enabled. Use Arrow Keys to look around.");
  }

  resetCamera3D() {
      // Optional
  }

  setEnvironment(type) {
    if (type === 'city') {
        this.scene.background = new THREE.Color(0x000510);
        this.scene.fog = new THREE.FogExp2(0x000510, 0.02);
        this.lightsGroup.visible = true;
    } else if (type === 'lobby') {
        this.scene.background = new THREE.Color(0x050505);
        this.scene.fog = new THREE.FogExp2(0x050505, 0.06);
        this.lightsGroup.visible = true; // Maybe dim lights for indoors?
    }
  }

  checkCollision(pos) {
    if (!this.player) return false;
    
    const size = 0.3; // Player radius
    this.playerBox.min.set(pos.x - size, pos.y - 0.1, pos.z - size);
    this.playerBox.max.set(pos.x + size, pos.y + 1.6, pos.z + size);

    for (const box of this.colliders) {
        if (this.playerBox.intersectsBox(box)) {
            return true;
        }
    }
    return false;
  }

  setupControls() {
    // Keys
    document.addEventListener('keydown', (e) => {
      // ===== PRIORIDADE: ESC sempre funciona (sair FPS) =====
      if (e.key === 'Escape' && this.viewMode === 'fps') {
          this.exitFPS();
          return;
      }
      
      // ===== BLOQUEAR MOVIMENTO SE TERMINAL ATIVO =====
      const blockedKeys = ['w','a','s','d',' ','arrowup','arrowdown','arrowleft','arrowright'];
      if (this.terminalActive && blockedKeys.includes(e.key.toLowerCase())) {
          return; // Ignora estas teclas quando terminal está aberto
      }

      const k = e.key.toLowerCase();
      if(this.keys.hasOwnProperty(k)) this.keys[k] = true;
      if(e.key === 'ArrowUp') this.keys.arrowUp = true;
      if(e.key === 'ArrowDown') this.keys.arrowDown = true;
      if(e.key === 'ArrowLeft') this.keys.arrowLeft = true;
      if(e.key === 'ArrowRight') this.keys.arrowRight = true;
      if(k === ' ') this.keys.space = true;
      
      // Escape Handler for Fallback Mode
      if (e.key === 'Escape' && this.viewMode === 'fps') {
          this.exitFPS();
      }
    });
    document.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if(this.keys.hasOwnProperty(k)) this.keys[k] = false;
      if(e.key === 'ArrowUp') this.keys.arrowUp = false;
      if(e.key === 'ArrowDown') this.keys.arrowDown = false;
      if(e.key === 'ArrowLeft') this.keys.arrowLeft = false;
      if(e.key === 'ArrowRight') this.keys.arrowRight = false;
      if(k === ' ') this.keys.space = false;
    });

    // Joystick Controls (Mobile)
    const stickZone = document.getElementById('joystick-zone');
    const stickKnob = document.getElementById('joystick-knob');
    
    if (stickZone && 'ontouchstart' in window) {
        stickZone.style.display = 'block';
        
        stickZone.addEventListener('touchstart', (e) => {
            const touch = e.changedTouches[0];
            this.joystick.active = true;
            this.joystick.originX = touch.clientX;
            this.joystick.originY = touch.clientY;
            e.preventDefault();
        }, {passive: false});

        stickZone.addEventListener('touchmove', (e) => {
            if(!this.joystick.active) return;
            const touch = e.changedTouches[0];
            const maxDist = 40;
            
            let dx = touch.clientX - this.joystick.originX;
            let dy = touch.clientY - this.joystick.originY;
            
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > maxDist) {
                const ratio = maxDist / dist;
                dx *= ratio;
                dy *= ratio;
            }
            
            stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            
            // Normalize -1 to 1
            this.joystick.dx = dx / maxDist;
            this.joystick.dy = dy / maxDist;
            e.preventDefault();
        }, {passive: false});

        const endStick = (e) => {
            this.joystick.active = false;
            this.joystick.dx = 0;
            this.joystick.dy = 0;
            stickKnob.style.transform = `translate(-50%, -50%)`;
        };
        
        stickZone.addEventListener('touchend', endStick);
        stickZone.addEventListener('touchcancel', endStick);
    }

    // Mouse Move (FPS & Dragging & Blender Controls)
    document.addEventListener('mousemove', (e) => {
      // FPS Logic
      if (this.viewMode === 'fps') {
          if (document.pointerLockElement === this.canvas) {
            // Clamp huge jumps (common in some linux WMs/drivers)
            const sensitivity = 0.002;
            const maxDelta = 100; // Pixels
            
            let dx = e.movementX;
            let dy = e.movementY;
            
            // Ignore jumps larger than maxDelta (likely cursor re-center artifact)
            if (Math.abs(dx) > maxDelta || Math.abs(dy) > maxDelta) return;

            this.fpsYaw -= dx * sensitivity;
            this.fpsPitch -= dy * sensitivity;
            this.fpsPitch = Math.max(-1.5, Math.min(1.5, this.fpsPitch));
          }
          return;
      } 
      
      // 3D Logic (Blender Style)
      if (this.viewMode === '3d') {
          const dx = e.clientX - this.lastMouseX;
          const dy = e.clientY - this.lastMouseY;
          this.lastMouseX = e.clientX;
          this.lastMouseY = e.clientY;

          // 1. Dragging Object (Left Click)
          if (this.isDragging && this.selectedObject) {
              this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
              this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
              this.raycaster.setFromCamera(this.mouse, this.camera);
              
              const intersectPoint = new THREE.Vector3();
              this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
              
              if (intersectPoint) {
                  const newPos = intersectPoint.sub(this.offset);
                  newPos.y = Math.max(0.5, newPos.y); 
                  this.selectedObject.position.copy(newPos);
              }
              return;
          }

          // 2. Panning (Shift + Middle Mouse)
          if (this.isPanning) {
              const panSpeed = 0.02 * (this.cameraDistance / 10); // Scale pan speed with zoom
              
              // Calculate Camera Right and Up vectors
              const right = new THREE.Vector3();
              this.camera.getWorldDirection(right);
              right.cross(this.camera.up).normalize();
              
              const up = new THREE.Vector3(0, 1, 0);
              up.applyQuaternion(this.camera.quaternion);

              // Move Target AND Camera
              const moveX = right.multiplyScalar(-dx * panSpeed);
              const moveY = up.multiplyScalar(dy * panSpeed); // Blender style: Down moves view up
              
              const combinedMove = moveX.add(moveY);
              this.camera.position.add(combinedMove);
              this.cameraTarget.add(combinedMove);
              return;
          }

          // 3. Orbit Rotation (Middle Mouse)
          if (this.isRotating) {
            this.cameraRotation.y += dx * 0.005;
            this.cameraRotation.x += dy * 0.005;
            this.cameraRotation.x = Math.max(-1.5, Math.min(1.5, this.cameraRotation.x));
            
            // Re-calculate position based on Target + Spherical Coordinates
            const r = this.cameraDistance;
            const cx = r * Math.sin(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
            const cy = r * Math.sin(this.cameraRotation.x);
            const cz = r * Math.cos(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
            
            this.camera.position.set(
                this.cameraTarget.x + cx,
                this.cameraTarget.y + cy + 5, // Offset height slightly
                this.cameraTarget.z + cz
            );
            this.camera.lookAt(this.cameraTarget);
          }
      }
    });

    // Mouse Down
    this.canvas.addEventListener('mousedown', (e) => {
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      if (this.viewMode === '3d') {
          // Button 1 = Middle Mouse (Scroll Wheel Click)
          if (e.button === 1) {
              e.preventDefault(); // Prevent scroll icon or paste
              if (e.shiftKey) {
                  this.isPanning = true;
                  this.canvas.style.cursor = 'move';
              } else {
                  this.isRotating = true;
                  this.canvas.style.cursor = 'all-scroll';
              }
              return;
          }

          // Button 0 = Left Click (Select / Drag)
          if (e.button === 0) {
              this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
              this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
              this.raycaster.setFromCamera(this.mouse, this.camera);
              
              const objects = Array.from(this.objects.values()).filter(o => !o.userData.isGhost);
              const intersects = this.raycaster.intersectObjects(objects);
              
              if(intersects.length > 0) {
                  this.selectedObject = intersects[0].object;
                  this.isDragging = true;
                  this.dragPlane.setFromNormalAndCoplanarPoint(
                      new THREE.Vector3(0, 1, 0), 
                      this.selectedObject.position
                  );
                  const intersectPoint = new THREE.Vector3();
                  this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
                  this.offset.copy(intersectPoint).sub(this.selectedObject.position);
                  this.canvas.style.cursor = 'grabbing';
              }
          }
      } else {
          // FPS: Lock pointer if not locked
          if(document.pointerLockElement !== this.canvas) {
              // Try unadjusted first (for gaming mice/linux)
              this.canvas.requestPointerLock({ unadjustedMovement: true }).catch(() => {
                  this.canvas.requestPointerLock().catch(console.error);
              });
          }
      }
    });

    // Double Click to Load Texture OR Open File
    this.canvas.addEventListener('dblclick', (e) => {
        if (this.viewMode !== '3d') return;

        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Raycast against all objects
        const objectValues = Array.from(this.objects.values());
        const intersects = this.raycaster.intersectObjects(objectValues, true); // Recursive
        
        if (intersects.length > 0) {
            let hit = intersects[0].object;

            // Find the robust parent container
            // We search up until we find the object that we actually created (which has the ID)
            let rootObj = hit;
            while (rootObj && !rootObj.userData.id) {
                rootObj = rootObj.parent;
            }

            // If we hit something that isn't part of our managed objects, ignore
            if (!rootObj || !rootObj.userData.id) return;

            // Check for FileSystem path
            const props = rootObj.userData.properties;
            if (props && props.filePath) {
                console.log(`📂 Opening path: "${props.filePath}"`);
                shellOpen(props.filePath)
                    .then(() => console.log('✅ Command sent'))
                    .catch(e => console.error('❌ Command failed:', e));
                return;
            }

            // Default: Texture Load
            this.textureTargetObject = intersects[0].object;
            this.fileInput.click();
        }
    });

    window.addEventListener('mouseup', () => {
      this.isRotating = false;
      this.isPanning = false;
      this.isDragging = false;
      this.selectedObject = null;
      this.canvas.style.cursor = 'default';
    });

    
    // Zoom (Blender Style)
    this.canvas.addEventListener('wheel', (e) => {
        if(this.viewMode === '3d') {
            e.preventDefault();
            const zoomSpeed = 0.05 * this.cameraDistance;
            const delta = Math.sign(e.deltaY) * zoomSpeed * 0.1;
            
            this.cameraDistance += delta;
            this.cameraDistance = Math.max(2, Math.min(100, this.cameraDistance));
            
            // Re-apply orbit position logic immediately
            const r = this.cameraDistance;
            const cx = r * Math.sin(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
            const cy = r * Math.sin(this.cameraRotation.x);
            const cz = r * Math.cos(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
            
            this.camera.position.set(
                this.cameraTarget.x + cx,
                this.cameraTarget.y + cy + 5,
                this.cameraTarget.z + cz
            );
            this.camera.lookAt(this.cameraTarget);
        }
    }, { passive: false });
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const now = Date.now();
    if (now - this.lastFrameTime < this.frameInterval) return;
    this.lastFrameTime = now;

    try {
        if (this.viewMode === 'fps' && this.player) {
          // ===== VERIFICAÇÃO TERMINAL =====
          // Se terminal ativo, apenas atualiza câmera sem movimento
          if (this.terminalActive) {
            this.camera.position.copy(this.player.position);
            this.camera.position.y += 1.6;
            // Pula processamento de física/movimento
          } else {
            const speed = this.keys.shift ? 0.3 : 0.15; // Adjusted speed
            
            // --- MOVEMENT VECTORS ---
            const forward = new THREE.Vector3();
            this.camera.getWorldDirection(forward);
            forward.y = 0; 
            forward.normalize();

            const right = new THREE.Vector3();
            right.crossVectors(forward, this.camera.up).normalize();

            // Calculate Move Input
            let dx = 0;
            let dz = 0;

            // Keyboard
            if (this.keys.w) { dx += forward.x; dz += forward.z; }
            if (this.keys.s) { dx -= forward.x; dz -= forward.z; }
            if (this.keys.d) { dx += right.x; dz += right.z; }
            if (this.keys.a) { dx -= right.x; dz -= right.z; }

            // Joystick
            if (this.joystick.active) {
                const joyFwd = -this.joystick.dy;
                const joyRight = this.joystick.dx;
                dx += (forward.x * joyFwd + right.x * joyRight);
                dz += (forward.z * joyFwd + right.z * joyRight);
            }

            // Apply Movement with Collision Check (X Axis)
            if (dx !== 0 || dz !== 0) {
                // Normalize if moving diagonally to prevent super-speed, unless joystick which is already analog
                if (!this.joystick.active && (dx !== 0 && dz !== 0)) {
                    const len = Math.sqrt(dx*dx + dz*dz);
                    dx /= len; dz /= len;
                }
                
                const moveX = dx * speed;
                const nextPos = this.player.position.clone();
                nextPos.x += moveX;
                
                if (!this.checkCollision(nextPos)) {
                    this.player.position.x = nextPos.x;
                }

                // Apply Movement with Collision Check (Z Axis)
                const moveZ = dz * speed;
                nextPos.copy(this.player.position); // Reset to current valid pos
                nextPos.z += moveZ;

                if (!this.checkCollision(nextPos)) {
                    this.player.position.z = nextPos.z;
                }
            }
            
            // --- ROTATION (Mouse Look) ---
            this.camera.rotation.order = 'YXZ';
            this.camera.rotation.y = this.fpsYaw;
            this.camera.rotation.x = this.fpsPitch;

            // --- PHYSICS (Gravity) ---
            if(this.keys.space && this.isGrounded) {
                this.playerVelocity.y = this.jumpPower;
                this.isGrounded = false;
            }
            this.playerVelocity.y += this.gravity;
            
            this.player.position.y += this.playerVelocity.y;
            
            // Floor / Ground Collision
            if(this.player.position.y < 0.1) {
                this.player.position.y = 0.1;
                this.playerVelocity.y = 0;
                this.isGrounded = true;
            }
            
            // Lock Camera to Player Head
            this.camera.position.copy(this.player.position);
            this.camera.position.y += 1.6;
          }
        }

        if (this.settings.bloom) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }

    } catch (e) {
        console.error("Animate Error:", e);
        this.viewMode = '3d'; 
    }
  }

  clearScene() {
    // Remove all objects tracked in this.objects
    this.objects.forEach(obj => {
        this.scene.remove(obj);
        if(obj.geometry) obj.geometry.dispose();
        if(obj.material) obj.material.dispose();
    });
    this.objects.clear();

    // Remove other children that are meshes but not player/lights
    for (let i = this.scene.children.length - 1; i >= 0; i--) {
        const child = this.scene.children[i];
        if (child !== this.player && child !== this.lightsGroup && child !== this.camera && child !== this.stars && child !== this.floor) {
            this.scene.remove(child);
        }
    }
  }

  setCyberpunkAtmosphere() {
    this.scene.background = new THREE.Color(0x050510);
    this.scene.fog = new THREE.FogExp2(0x050510, 0.02);
    this.lightsGroup.visible = true;
  }

  cleanup() {
    if(this.animationId) cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
  }
}