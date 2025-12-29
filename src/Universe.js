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
    this.cameraTarget = new THREE.Vector3(0, 0, 0); // Ponto central de rotação (Blender style)
    this.isRotating = false;
    this.isPanning = false; // Novo estado para Pan
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

    // Setup Luzes (só serão visíveis no ultra)
    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(10, 20, 10);
    this.lightsGroup.add(ambient);
    this.lightsGroup.add(dir);

    // Helpers
    const gridHelper = new THREE.GridHelper(50, 50, 0x00ff00, 0x003300);
    gridHelper.position.y = 0.02; // Fix Z-fighting (Green flickering)
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
    this.setQuality('retro');

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
    console.log(`🎨 Switching to ${mode}`);
    this.qualityMode = mode;
    
    if (window.updateQualityUI) window.updateQualityUI(mode);

    if (mode === 'retro') {
      this.renderer.setPixelRatio(0.5); // 0.5 é mais estável que 0.4
      this.scene.background = new THREE.Color(0x000000);
      this.scene.fog = new THREE.FogExp2(0x000000, 0.04);
      this.lightsGroup.visible = false;
      this.frameInterval = 1000 / 30;
    } else {
      this.renderer.setPixelRatio(window.devicePixelRatio > 1.5 ? 1.5 : 1);
      this.scene.background = new THREE.Color(0x050510);
      this.scene.fog = new THREE.FogExp2(0x050510, 0.015);
      this.lightsGroup.visible = true;
      this.frameInterval = 1000 / 60;
    }

    this.objects.forEach(mesh => this.updateObjectMaterial(mesh));

    if (this.player) {
      this.player.traverse(child => {
        if (child.isMesh) this.updateObjectMaterial(child, true);
      });
      if (this.playerLight) this.playerLight.visible = (mode === 'ultra');
    }
  }

  // Helper para criar material
  getMaterial(color, isEmissive = false) {
    if (this.qualityMode === 'retro') {
      return new THREE.MeshBasicMaterial({ color: color });
    } else {
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
    mesh.material = this.getMaterial(color, isNode);
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
    const segs = 12; 
    switch (type) {
      case 'sphere': mesh = new THREE.Mesh(new THREE.SphereGeometry(properties.scale || 1, segs, segs), this.getMaterial(properties.color)); break;
      case 'cube': mesh = new THREE.Mesh(new THREE.BoxGeometry(properties.scale, properties.scale, properties.scale), this.getMaterial(properties.color)); break;
      case 'node': mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3 * properties.scale, 8, 8), this.getMaterial(properties.color, true)); break;
      case 'pyramid': mesh = new THREE.Mesh(new THREE.ConeGeometry(properties.scale, properties.scale * 1.5, 4), this.getMaterial(properties.color)); break;
      case 'torus': mesh = new THREE.Mesh(new THREE.TorusGeometry(properties.scale, 0.3, 6, 12), this.getMaterial(properties.color)); break;
      case 'cylinder': mesh = new THREE.Mesh(new THREE.CylinderGeometry(properties.scale * 0.5, properties.scale * 0.5, properties.scale * 2, 8), this.getMaterial(properties.color)); break;
      default: mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), this.getMaterial(0xffffff));
    }
    mesh.position.copy(position);
    mesh.userData = { id, type, properties, isGhost, isSolid: true };
    if (isGhost) { mesh.material.transparent = true; mesh.material.opacity = 0.5; }
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
      // Try to lock pointer
      this.canvas.requestPointerLock({ unadjustedMovement: true })
        .catch(e => {
          console.warn("PointerLock (Unadjusted) failed:", e);
          this.canvas.requestPointerLock().catch(err => {
              console.error("PointerLock Default failed:", err);
              this.onPointerLockError(); // Force fallback
          });
        });
  }

  exitFPS() {
      if (document.pointerLockElement === this.canvas) {
          document.exitPointerLock();
      }
      // If was in fallback mode (no lock), manually reset
      this.viewMode = '3d';
      this.onPointerLockChange(); // Force update UI/Camera
  }

  onPointerLockChange() {
    // Check if we are locked OR if we are forcing FPS (fallback check handled elsewhere, 
    // but here we align UI based on state)
    
    // If we just lost lock, browser sets pointerLockElement to null.
    // BUT we might want to stay in FPS mode if it was a glitch? 
    // No, standard behavior: lost lock = exit FPS.
    // UNLESS we are in explicit fallback mode? 
    // Let's rely on the fact that if user pressed ESC, lock is lost.
    
    const isLocked = document.pointerLockElement === this.canvas;
    
    if (isLocked) {
      this.viewMode = 'fps';
      if(this.player) this.player.visible = false;
      document.getElementById('hud-mode').textContent = 'FPS MODE';
      document.getElementById('crosshair').classList.add('active');
      document.getElementById('btn-view-mode').innerHTML = '🌍 Sair do FPS (ESC)';
    } else {
      // Only switch back to 3D if we were not forcing fallback via error handler?
      // Actually, if lock is lost, we generally want to exit.
      // BUT if we are in "Fallback FPS", there is no lock to lose.
      // So this event won't fire for Fallback exit unless we call exitPointerLock (which does nothing).
      
      // So we handle the "Exit" logic here for normal termination.
      if (this.viewMode === 'fps' && !isLocked) {
          // Check if we are in fallback mode? 
          // If we are in fallback, this event MIGHT NOT FIRE.
          // So we update UI just in case.
      }
      
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

  setupControls() {
    // Keys
    document.addEventListener('keydown', (e) => {
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

    // Mouse Move (FPS & Dragging & Blender Controls)
    document.addEventListener('mousemove', (e) => {
      // FPS Logic
      if (this.viewMode === 'fps') {
          if (document.pointerLockElement === this.canvas) {
            this.fpsYaw -= e.movementX * 0.002;
            this.fpsPitch -= e.movementY * 0.002;
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

    // Double Click to Load Texture
    this.canvas.addEventListener('dblclick', (e) => {
        if (this.viewMode !== '3d') return;

        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const objects = Array.from(this.objects.values()).filter(o => !o.userData.isGhost);
        const intersects = this.raycaster.intersectObjects(objects);
        
        if (intersects.length > 0) {
            this.textureTargetObject = intersects[0].object;
            this.fileInput.click(); // Open system dialog
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
          const speed = this.keys.shift ? 0.3 : 0.15;
          const dir = new THREE.Vector3();
          if(this.keys.w) dir.z = -1;
          if(this.keys.s) dir.z = 1;
          if(this.keys.a) dir.x = -1;
          if(this.keys.d) dir.x = 1;
          
          // Keyboard Rotation (Fallback)
          if (this.keys.arrowLeft) this.fpsYaw += 0.05;
          if (this.keys.arrowRight) this.fpsYaw -= 0.05;
          if (this.keys.arrowUp) this.fpsPitch += 0.05;
          if (this.keys.arrowDown) this.fpsPitch -= 0.05;
          this.fpsPitch = Math.max(-1.5, Math.min(1.5, this.fpsPitch));

          // Rotate input vector by Yaw
          // Yaw is Y rotation. 
          // In Three.js, rotation order usually requires care.
          // We can just use trigonometry:
          // Forward (Z-1) implies moving towards where we look.
          
          const moveX = dir.x * Math.cos(this.fpsYaw) - dir.z * Math.sin(this.fpsYaw);
          const moveZ = dir.x * Math.sin(this.fpsYaw) + dir.z * Math.cos(this.fpsYaw);
          
          if (dir.lengthSq() > 0) {
              this.player.position.x += moveX * speed;
              this.player.position.z += moveZ * speed;
          }
          
          // Gravity
          if(this.keys.space && this.isGrounded) {
              this.playerVelocity.y = this.jumpPower;
              this.isGrounded = false;
          }
          this.playerVelocity.y += this.gravity;
          
          // Apply Y
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

        this.renderer.render(this.scene, this.camera);
    } catch (e) {
        console.error("Animate Error:", e);
        // Fallback to safe state to prevent freeze loop?
        this.viewMode = '3d'; 
    }
  }

  cleanup() {
    if(this.animationId) cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
  }
}
