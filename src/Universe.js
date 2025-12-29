import * as THREE from 'three';

export class Universe {
  constructor(canvas, hasPlayer = false) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.objects = new Map();
    this.animationId = null;

    // Configurações Globais
    this.qualityMode = 'retro'; // 'retro' | 'ultra'
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

    // Controles de câmera 3D
    this.cameraRotation = { x: 0, y: 0 };
    this.isRotating = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // Controles FPS
    this.keys = { w: false, a: false, s: false, d: false, shift: false, space: false };
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
    this.frameInterval = 1000 / 30; // 30 FPS base

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    
    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    this.camera.position.set(0, 5, 12);
    this.camera.lookAt(0, 0, 0);

    // Renderer (Inicializa Básico)
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: "low-power",
      precision: "lowp"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(0.4);

    // Lights Group (Para ligar/desligar)
    this.lightsGroup = new THREE.Group();
    this.scene.add(this.lightsGroup);
    
    // Setup Luzes (só serão visíveis no ultra)
    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(10, 20, 10);
    this.lightsGroup.add(ambient);
    this.lightsGroup.add(dir);

    // Helpers
    const gridHelper = new THREE.GridHelper(50, 50, 0x00ff00, 0x003300);
    this.scene.add(gridHelper);

    // Chão invisível
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

    // Aplica qualidade inicial
    this.setQuality('retro');

    this.animate();
    console.log('🌌 Universe Init');
  }

  // --- QUALITY SYSTEM ---

  setQuality(mode) {
    console.log(`🎨 Switching to ${mode}`);
    this.qualityMode = mode;
    
    // Atualiza UI global (no index.html)
    if (window.updateQualityUI) window.updateQualityUI(mode);

    if (mode === 'retro') {
      // Configurações RETRO
      this.renderer.setPixelRatio(0.4);
      this.scene.background = new THREE.Color(0x000000);
      this.scene.fog = new THREE.FogExp2(0x000000, 0.04);
      this.lightsGroup.visible = false;
      this.frameInterval = 1000 / 30; // 30 FPS Cap
      
    } else {
      // Configurações ULTRA
      this.renderer.setPixelRatio(window.devicePixelRatio > 1.5 ? 1.5 : 1); // Limitado a 1.5x
      this.scene.background = new THREE.Color(0x050510); // Azul escuro profundo
      this.scene.fog = new THREE.FogExp2(0x050510, 0.015); // Fog mais distante e suave
      this.lightsGroup.visible = true;
      this.frameInterval = 1000 / 60; // Tenta 60 FPS
    }

    // Atualiza materiais de TODOS os objetos
    this.objects.forEach(mesh => {
      this.updateObjectMaterial(mesh);
    });

    // Atualiza Player
    if (this.player) {
      this.player.traverse(child => {
        if (child.isMesh) this.updateObjectMaterial(child, true);
      });
      // Luz do player
      if (this.playerLight) {
        this.playerLight.visible = (mode === 'ultra');
      }
    }
  }

  // Helper para criar material baseado no modo
  getMaterial(color, isEmissive = false) {
    if (this.qualityMode === 'retro') {
      // Retro: Basic (sem luz), wireframe falso se quiser, cores chapadas
      return new THREE.MeshBasicMaterial({ color: color });
    } else {
      // Ultra: Standard (reage a luz), roughness, metalness, emissive
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.2
      });
      
      if (isEmissive) {
        mat.emissive = new THREE.Color(color);
        mat.emissiveIntensity = 0.8;
      }
      return mat;
    }
  }

  updateObjectMaterial(mesh, isPlayer = false) {
    if (!mesh.userData || !mesh.userData.properties) {
        // Se for parte do player ou auxiliar sem userdata complexo
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

    mesh.material.dispose();
    mesh.material = this.getMaterial(color, isNode); // Nodes brilham no ultra
  }


  // --- CREATION ---

  createPlayer() {
    const group = new THREE.Group();

    // Corpo
    const bodyGeom = new THREE.CylinderGeometry(0.3, 0.3, 1.4, 8);
    const bodyMat = this.getMaterial(0x00ffff);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.7;

    // Cabeça
    const headGeom = new THREE.SphereGeometry(0.25, 8, 8);
    const headMat = this.getMaterial(0x00ffff);
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.6;

    group.add(body);
    group.add(head);

    // Luz do Player (Ultra only)
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
        (Math.random() - 0.5) * 100 + 20, // Apenas acima
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
    // Low poly geometries
    const segs = 12; 

    switch (type) {
      case 'sphere':
        mesh = new THREE.Mesh(new THREE.SphereGeometry(properties.scale || 1, segs, segs), this.getMaterial(properties.color));
        break;
      case 'cube':
        mesh = new THREE.Mesh(new THREE.BoxGeometry(properties.scale, properties.scale, properties.scale), this.getMaterial(properties.color));
        break;
      case 'node':
        mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3 * properties.scale, 8, 8), this.getMaterial(properties.color, true));
        break;
      case 'pyramid':
        mesh = new THREE.Mesh(new THREE.ConeGeometry(properties.scale, properties.scale * 1.5, 4), this.getMaterial(properties.color));
        break;
      case 'torus':
        mesh = new THREE.Mesh(new THREE.TorusGeometry(properties.scale, 0.3, 6, 12), this.getMaterial(properties.color));
        break;
      case 'cylinder':
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(properties.scale * 0.5, properties.scale * 0.5, properties.scale * 2, 8), this.getMaterial(properties.color));
        break;
      default:
        mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), this.getMaterial(0xffffff));
    }

    mesh.position.copy(position);
    mesh.userData = { id, type, properties, isGhost, isSolid: true };

    if (isGhost) {
      mesh.material.transparent = true;
      mesh.material.opacity = 0.5;
    }

    this.scene.add(mesh);
    this.objects.set(id, mesh);
    return mesh;
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
      if(obj) obj.position.lerp(position, 0.5); // Simple lerp
  }

  updateObjectProperties(id, properties) {
      const obj = this.objects.get(id);
      if(obj) {
          obj.userData.properties = { ...obj.userData.properties, ...properties };
          this.updateObjectMaterial(obj); // Refresh material color/type
          if (properties.scale) obj.scale.setScalar(properties.scale);
      }
  }

  // --- CONTROLS & LOGIC ---

  toggleViewMode() {
    if (!this.hasPlayer) return;
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    } else {
      this.canvas.requestPointerLock().catch(e => console.error(e));
    }
  }

  onPointerLockChange() {
    if (document.pointerLockElement === this.canvas) {
      this.viewMode = 'fps';
      if(this.player) this.player.visible = false;
      
      // Update HUD
      document.getElementById('hud-mode').textContent = 'FPS MODE';
      document.getElementById('crosshair').classList.add('active');
      document.getElementById('btn-view-mode').innerHTML = '🌍 Sair do FPS (ESC)';
    } else {
      this.viewMode = '3d';
      if(this.player) this.player.visible = true;
      this.resetCamera3D();
      
      // Update HUD
      document.getElementById('hud-mode').textContent = '3D ORBITAL';
      document.getElementById('crosshair').classList.remove('active');
      document.getElementById('btn-view-mode').innerHTML = '👁️ Entrar em FPS';
    }
  }

  onPointerLockError() {
    console.error("Pointer Lock Error");
    this.viewMode = '3d';
  }

  resetCamera3D() {
    this.camera.rotation.set(0,0,0);
    this.cameraRotation = { x: 0, y: 0 };
    this.camera.position.set(0, 5, 12);
    this.camera.lookAt(0,0,0);
  }

  setupControls() {
    // Keys
    document.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if(this.keys.hasOwnProperty(k)) this.keys[k] = true;
      if(k === ' ') this.keys.space = true;
    });
    document.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if(this.keys.hasOwnProperty(k)) this.keys[k] = false;
      if(k === ' ') this.keys.space = false;
    });

    // Mouse Move
    document.addEventListener('mousemove', (e) => {
      if (this.viewMode === 'fps' && document.pointerLockElement === this.canvas) {
        this.fpsYaw -= e.movementX * 0.002;
        this.fpsPitch -= e.movementY * 0.002;
        this.fpsPitch = Math.max(-1.5, Math.min(1.5, this.fpsPitch));
      } else if (this.viewMode === '3d' && this.isRotating) {
        // Orbit logic
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.cameraRotation.y += dx * 0.005;
        this.cameraRotation.x += dy * 0.005;
        this.cameraRotation.x = Math.max(-1.5, Math.min(1.5, this.cameraRotation.x));
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        
        // Apply orbit
        const r = this.cameraDistance;
        this.camera.position.x = r * Math.sin(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
        this.camera.position.y = r * Math.sin(this.cameraRotation.x) + 5;
        this.camera.position.z = r * Math.cos(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
        this.camera.lookAt(0,0,0);
      }
    });

    // Mouse Down/Up
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.viewMode === '3d') {
          if (e.button === 0) {
              // Try select
              this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
              this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
              this.raycaster.setFromCamera(this.mouse, this.camera);
              const intersects = this.raycaster.intersectObjects(Array.from(this.objects.values()));
              
              if(intersects.length > 0) {
                  this.selectedObject = intersects[0].object;
                  // Notify selection (e.g. for delete)
                  window.dispatchEvent(new CustomEvent('object-selected', { detail: this.selectedObject.userData }));
              } else {
                  this.isRotating = true;
                  this.lastMouseX = e.clientX;
                  this.lastMouseY = e.clientY;
              }
          }
      } else {
          // FPS Shoot or Interact
          if(document.pointerLockElement !== this.canvas) this.canvas.requestPointerLock();
      }
    });

    window.addEventListener('mouseup', () => {
      this.isRotating = false;
    });
    
    // Zoom
    this.canvas.addEventListener('wheel', (e) => {
        if(this.viewMode === '3d') {
            this.cameraDistance += e.deltaY * 0.01;
            this.cameraDistance = Math.max(5, Math.min(50, this.cameraDistance));
            // Re-calc position
             const r = this.cameraDistance;
            this.camera.position.x = r * Math.sin(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
            this.camera.position.y = r * Math.sin(this.cameraRotation.x) + 5;
            this.camera.position.z = r * Math.cos(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
            this.camera.lookAt(0,0,0);
        }
    });
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

    if (this.viewMode === 'fps' && this.player) {
      // FPS Physics
      const speed = this.keys.shift ? 0.3 : 0.15;
      const dir = new THREE.Vector3();
      if(this.keys.w) dir.z = -1;
      if(this.keys.s) dir.z = 1;
      if(this.keys.a) dir.x = -1;
      if(this.keys.d) dir.x = 1;
      
      // Rotate vector by Yaw
      dir.applyAxisAngle(new THREE.Vector3(0,1,0), this.fpsYaw);
      dir.multiplyScalar(speed);
      
      // Gravity
      if(this.keys.space && this.isGrounded) {
          this.playerVelocity.y = this.jumpPower;
          this.isGrounded = false;
      }
      this.playerVelocity.y += this.gravity;
      
      // Apply
      this.player.position.add(dir);
      this.player.position.y += this.playerVelocity.y;
      
      // Floor collision
      if(this.player.position.y < 0.1) {
          this.player.position.y = 0.1;
          this.playerVelocity.y = 0;
          this.isGrounded = true;
      }
      
      // Camera Follow
      this.camera.position.copy(this.player.position);
      this.camera.position.y += 1.6;
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.fpsYaw;
      this.camera.rotation.x = this.fpsPitch;
    }

    // Rotate objects logic? (Optional, maybe lightweight)
    
    this.renderer.render(this.scene, this.camera);
  }

  cleanup() {
    if(this.animationId) cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
  }
}
