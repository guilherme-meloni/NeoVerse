import * as THREE from 'three';

export class Universe {
  constructor(canvas, hasPlayer = false) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.objects = new Map();
    this.animationId = null;

    // Player
    this.hasPlayer = hasPlayer;
    this.player = null;
    this.playerVelocity = new THREE.Vector3();

    // Modos de visão
    this.viewMode = '3d';
    this.cameraDistance = 12;

    // FPS settings otimizados para hardware fraco (EXTREMO)
    this.fpsSettings = {
      pixelRatio: 0.4, // Resolução muito baixa (estilo retro)
      renderDistance: 20, // Fog bem perto
      maxFPS: 24 // Cinematográfico/Mínimo jogável
    };

    // Raycaster para seleção
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
    this.fpsYaw = 0;
    this.fpsPitch = 0;
    this.gravity = -0.02;
    this.jumpPower = 0.3;
    this.isGrounded = false;
    
    this.onPointerLockChange = this.onPointerLockChange.bind(this);
    this.onPointerLockError = this.onPointerLockError.bind(this);

    // Throttle para animação
    this.lastFrameTime = 0;
    this.frameInterval = 1000 / 24; // 24 FPS fixo

    this.init();
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.05); // Fog fixo

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    this.camera.position.set(0, 5, 12);
    this.camera.lookAt(0, 0, 0);

    // Renderer SUPER OTIMIZADO - Configuração única
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
      precision: "lowp",
      depth: true,
      stencil: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(0.4); // Pixel ratio fixo baixo para performance
    this.renderer.shadowMap.enabled = false;

    // Iluminação removida (MeshBasicMaterial não usa)
    
    // Grid simples
    const gridHelper = new THREE.GridHelper(20, 10, 0x00ff00, 0x003300);
    this.scene.add(gridHelper);

    // Chão invisível para colisão
    const floorGeom = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshBasicMaterial({ visible: false });
    this.floor = new THREE.Mesh(floorGeom, floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.userData.isFloor = true;
    this.scene.add(this.floor);

    // Player (temporariamente desabilitado para depuração)
    // if (this.hasPlayer) {
    //   this.createPlayer();
    // }

    // Estrelas (temporariamente desabilitado para depuração)
    // this.createStarField();

    // Controles
    this.setupControls();
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('pointerlockerror', this.onPointerLockError);
    window.addEventListener('resize', () => this.onResize());

    // Inicia animação
    this.animate();

    console.log('🌌 Universe iniciado (modo PERFORMANCE EXTREMA)');
  }

  createStarField() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    // Reduzido para 50 estrelas (Performance Extrema)
    for (let i = 0; i < 50; i++) {
      const x = (Math.random() - 0.5) * 100;
      const y = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 100;
      vertices.push(x, y, z);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: false,
      sizeAttenuation: true
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  createPlayer() {
    const group = new THREE.Group();

    // Geometrias simplificadas (menos segmentos)
    const bodyGeom = new THREE.CylinderGeometry(0.3, 0.3, 1.4, 6);
    const bodyMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.7;

    const headGeom = new THREE.SphereGeometry(0.25, 4, 4); // Low poly extremo
    const head = new THREE.Mesh(headGeom, bodyMat);
    head.position.y = 1.6;

    group.add(body);
    group.add(head);
    group.position.set(0, 0.1, 0);

    this.player = group;
    this.scene.add(group);

    console.log('🧍 Player criado (low poly)');
  }

  toggleViewMode() {
    if (!this.hasPlayer) return;

    // Apenas solicita a mudança de estado do ponteiro
    // A lógica real acontece em onPointerLockChange
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    } else {
      // Tenta travar. Se falhar, o erro é pego no listener
      const promise = this.canvas.requestPointerLock();
      // Alguns navegadores retornam promise, outros não
      if (promise && promise.catch) {
        promise.catch(err => console.error('PointerLock request failed:', err));
      }
    }
  }

  onPointerLockError() {
    console.error('❌ Erro no Pointer Lock');
    // Garante que voltamos ao estado seguro
    if (this.viewMode === 'fps') {
      document.exitPointerLock(); // Tenta limpar
      // Força modo 3D manualmente se o evento de change não disparar
      this.setMode3D();
    }
  }

  onPointerLockChange() {
    if (document.pointerLockElement === this.canvas) {
      // Entrou no modo FPS
      this.setModeFPS();
    } else {
      // Saiu do modo FPS
      this.setMode3D();
    }
    this.updateViewUI();
  }

  setModeFPS() {
    if (this.viewMode === 'fps') return; // Já está
    this.viewMode = 'fps';
    
    this.fpsYaw = Math.PI;
    this.fpsPitch = 0;

    const eyeHeight = 1.6;
    this.camera.position.set(
      this.player.position.x,
      this.player.position.y + eyeHeight,
      this.player.position.z
    );

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(0, this.fpsYaw, 0);

    // Esconde estrelas
    this.scene.children.forEach(child => {
      if (child instanceof THREE.Points) {
        child.visible = false;
      }
    });

    if (this.player) this.player.visible = false;
    console.log('👁️ Modo FPS ativado');
  }

  setMode3D() {
    if (this.viewMode === '3d') return; // Já está
    this.viewMode = '3d';
    
    this.canvas.style.cursor = 'default';
    
    // Mostra estrelas
    this.scene.children.forEach(child => {
      if (child instanceof THREE.Points) {
        child.visible = true;
      }
    });
    
    this.resetCamera3D();
    if (this.player) this.player.visible = true;
    console.log('🌍 Modo 3D ativado');
  }

  resetCamera3D() {
    this.cameraRotation = { x: 0, y: 0 };
    this.camera.position.set(0, 5, 12);
    this.camera.lookAt(0, 0, 0);
    this.cameraDistance = 12;
  }

  setupControls() {
    // Teclas
    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w') this.keys.w = true;
      if (key === 'a') this.keys.a = true;
      if (key === 's') this.keys.s = true;
      if (key === 'd') this.keys.d = true;
      if (key === 'shift') this.keys.shift = true;
      if (key === ' ') this.keys.space = true;

      if (key === 'v' && this.hasPlayer) {
        this.toggleViewMode();
        this.updateViewUI();
      }
    });

    document.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w') this.keys.w = false;
      if (key === 'a') this.keys.a = false;
      if (key === 's') this.keys.s = false;
      if (key === 'd') this.keys.d = false;
      if (key === 'shift') this.keys.shift = false;
      if (key === ' ') this.keys.space = false;
    });

    // Mouse move
    document.addEventListener('mousemove', (e) => {
      // Modo FPS - movimento com Pointer Lock nativo
      if (this.viewMode === 'fps') {
        if (document.pointerLockElement === this.canvas) {
            // Sensibilidade ajustada (0.002 é um valor comum para movementX/Y)
            const sensitivity = 0.002;
            this.fpsYaw -= e.movementX * sensitivity;
            this.fpsPitch -= e.movementY * sensitivity;
            
            // Limita o pitch para não dar volta completa vertical (gimbal lock prevention)
            this.fpsPitch = Math.max(-1.5, Math.min(1.5, this.fpsPitch));
        }
        return;
      }

      // Modo 3D - drag objetos
      if (this.isDragging && this.selectedObject) {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);

        if (intersectPoint) {
          const newPosition = intersectPoint.sub(this.offset);
          newPosition.y = Math.max(0.5, newPosition.y);

          this.selectedObject.position.copy(newPosition);

          window.dispatchEvent(new CustomEvent('object-moved', {
            detail: {
              id: this.selectedObject.userData.id,
              position: newPosition.clone()
            }
          }));
        }
      } else if (this.isRotating) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;

        this.cameraRotation.y += deltaX * 0.005;
        this.cameraRotation.x += deltaY * 0.005;
        this.cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraRotation.x));

        const radius = this.cameraDistance;
        this.camera.position.x = radius * Math.sin(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
        this.camera.position.y = radius * Math.sin(this.cameraRotation.x) + 5;
        this.camera.position.z = radius * Math.cos(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
        this.camera.lookAt(0, 0, 0);

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    // Mouse down
    this.canvas.addEventListener('mousedown', (e) => {
      // Se estiver em FPS mas perdeu o lock (ex: alt-tab), tenta recuperar ao clicar
      if (this.viewMode === 'fps') {
        if (document.pointerLockElement !== this.canvas) {
            this.canvas.requestPointerLock();
        }
        return;
      }
      
      if (e.button !== 0) return;

      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      const draggableObjects = Array.from(this.objects.values())
        .filter(obj => !obj.userData.isGhost);

      const intersects = this.raycaster.intersectObjects(draggableObjects, true);

      if (intersects.length > 0) {
        let obj = intersects[0].object;

        while (obj.parent && !this.objects.has(obj.userData.id)) {
          obj = obj.parent;
        }

        if (obj.userData && obj.userData.id) {
          this.selectedObject = obj;
          this.isDragging = true;

          const intersectionPoint = intersects[0].point;
          this.offset.copy(intersectionPoint).sub(obj.position);

          this.canvas.style.cursor = 'grabbing';
          document.body.classList.add('dragging');

          this.highlightObject(obj);

          // Mostra menu de edição
          window.dispatchEvent(new CustomEvent('object-selected', {
            detail: { object: obj }
          }));
        }
      } else {
        this.isRotating = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.canvas.style.cursor = 'grab';
      }
    });

    // Mouse up
    window.addEventListener('mouseup', () => {
      if (this.isDragging && this.selectedObject) {
        this.unhighlightObject(this.selectedObject);
        this.selectedObject = null;
      }

      this.isDragging = false;
      this.isRotating = false;
      this.canvas.style.cursor = 'default';
      document.body.classList.remove('dragging');
    });

    // Zoom
    this.canvas.addEventListener('wheel', (e) => {
      if (this.viewMode === 'fps') return;

      e.preventDefault();
      const delta = e.deltaY * 0.001;

      const direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction);

      this.camera.position.addScaledVector(direction, -delta);

      const distance = this.camera.position.length();
      if (distance < 5) {
        this.camera.position.normalize().multiplyScalar(5);
      } else if (distance > 30) {
        this.camera.position.normalize().multiplyScalar(30);
      }

      this.cameraDistance = distance;
    });
  }

  updateViewUI() {
    const mode = this.viewMode;
    const viewText = document.getElementById('view-text');
    const viewBtn = document.getElementById('view-btn');
    const hud = document.getElementById('hud');
    const crosshair = document.getElementById('crosshair');

    if (viewText) viewText.textContent = mode === 'fps' ? 'FPS' : '3D';
    if (viewBtn) viewBtn.textContent = mode === 'fps' ? '🌍 3D' : '👁️ FPS';

    if (mode === 'fps') {
      hud.classList.add('fps-mode');
      if (crosshair) crosshair.classList.add('active');
    } else {
      hud.classList.remove('fps-mode');
      if (crosshair) crosshair.classList.remove('active');
    }
  }

  highlightObject(obj) {
    obj.traverse((child) => {
      if (child.material) {
        child.material.emissiveIntensity = 0.6;
      }
    });
  }

  unhighlightObject(obj) {
    obj.traverse((child) => {
      if (child.material && child.material.emissiveIntensity) {
        child.material.emissiveIntensity = 0.3;
      }
    });
  }

  checkCollision(position) {
    const playerRadius = 0.3;

    for (const [id, mesh] of this.objects.entries()) {
      const objData = mesh.userData;
      
      if (!objData.isSolid) continue;
      
      const distance = position.distanceTo(mesh.position);
      const minDistance = playerRadius + (objData.properties?.scale || 1) * 0.5;
      
      if (distance < minDistance) {
        return true;
      }
    }
    
    return false;
  }

  addObject(type, position, properties, id, isGhost = false) {
    let mesh;

    switch (type) {
      case 'sphere':
        mesh = this.createSphere(position, properties);
        break;
      case 'cube':
        mesh = this.createCube(position, properties);
        break;
      case 'node':
        mesh = this.createNode(position, properties);
        break;
      case 'pyramid':
        mesh = this.createPyramid(position, properties);
        break;
      case 'torus':
        mesh = this.createTorus(position, properties);
        break;
      case 'cylinder':
        mesh = this.createCylinder(position, properties);
        break;
      default:
        mesh = this.createSphere(position, properties);
    }

    mesh.userData = { 
      id, 
      type, 
      properties, 
      isGhost,
      isSolid: properties?.isSolid !== false
    };

    if (isGhost) {
      mesh.traverse((child) => {
        if (child.material) {
          child.material.transparent = true;
          child.material.opacity = 0;
        }
      });

      this.animateFadeIn(mesh);
    }

    this.scene.add(mesh);
    this.objects.set(id, mesh);

    return mesh;
  }

  animateFadeIn(mesh) {
    const duration = 500;
    const startTime = Date.now();
    const targetOpacity = 0.5;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      mesh.traverse((child) => {
        if (child.material && child.material.transparent) {
          child.material.opacity = progress * targetOpacity;
        }
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  animateFadeOut(mesh, callback) {
    const duration = 500;
    const startTime = Date.now();
    const startOpacity = mesh.userData.isGhost ? 0.5 : 1;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      mesh.traverse((child) => {
        if (child.material) {
          if (!child.material.transparent) {
            child.material.transparent = true;
          }
          child.material.opacity = startOpacity * (1 - progress);
        }
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else if (callback) {
        callback();
      }
    };

    animate();
  }

  createSphere(position, properties) {
    // Reduzido para o mínimo (low poly extremo)
    const geometry = new THREE.SphereGeometry(properties.scale || 1, 6, 4);
    const material = new THREE.MeshBasicMaterial({ // MeshBasic é mais leve
      color: properties.color || 0xff00ff
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);
    return sphere;
  }

  createCube(position, properties) {
    const size = properties.scale || 1;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshBasicMaterial({
      color: properties.color || 0x00ff00
    });

    const cube = new THREE.Mesh(geometry, material);
    cube.position.copy(position);
    cube.userData.rotationSpeed = 0.01;
    return cube;
  }

  createNode(position, properties) {
    const geometry = new THREE.SphereGeometry(0.3 * (properties.scale || 1), 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: properties.color || 0xffff00
    });

    const node = new THREE.Mesh(geometry, material);
    node.position.copy(position);

    const glowGeometry = new THREE.SphereGeometry(0.5 * (properties.scale || 1), 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: properties.color || 0xffff00,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    node.add(glow);

    return node;
  }

  createPyramid(position, properties) {
    const geometry = new THREE.ConeGeometry(properties.scale || 1, properties.scale * 1.5 || 1.5, 4);
    const material = new THREE.MeshBasicMaterial({
      color: properties.color || 0xff6600
    });

    const pyramid = new THREE.Mesh(geometry, material);
    pyramid.position.copy(position);
    pyramid.userData.rotationSpeed = 0.01;
    return pyramid;
  }

  createTorus(position, properties) {
    const geometry = new THREE.TorusGeometry(properties.scale || 1, 0.3, 5, 8); // Muito low poly
    const material = new THREE.MeshBasicMaterial({
      color: properties.color || 0xff0088
    });

    const torus = new THREE.Mesh(geometry, material);
    torus.position.copy(position);
    torus.userData.rotationSpeed = 0.015;
    return torus;
  }

  createCylinder(position, properties) {
    const geometry = new THREE.CylinderGeometry(
      properties.scale * 0.5 || 0.5,
      properties.scale * 0.5 || 0.5,
      properties.scale * 2 || 2,
      6 // Hexágono
    );
    const material = new THREE.MeshBasicMaterial({
      color: properties.color || 0x0088ff
    });

    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.position.copy(position);
    return cylinder;
  }

  removeObject(id) {
    const obj = this.objects.get(id);
    if (obj) {
      this.animateFadeOut(obj, () => {
        this.scene.remove(obj);

        obj.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      });

      this.objects.delete(id);
    }
  }

  updateObjectPosition(id, position) {
    const obj = this.objects.get(id);
    if (obj) {
      const duration = 200;
      const startPos = obj.position.clone();
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        obj.position.lerpVectors(startPos, position, progress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    }
  }

  updateObjectProperties(id, properties) {
    const obj = this.objects.get(id);
    if (!obj) return;

    obj.userData.properties = { ...obj.userData.properties, ...properties };
    obj.userData.isSolid = properties.isSolid !== false;

    if (properties.color !== undefined) {
      obj.traverse((child) => {
        if (child.material) {
          child.material.color.setHex(properties.color);
        }
      });
    }

    if (properties.scale !== undefined) {
      obj.scale.setScalar(properties.scale);
    }
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    // THROTTLE DE FPS para hardware fraco
    const now = Date.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed < this.frameInterval) {
      return; // Pula frames para manter 30 FPS
    }

    this.lastFrameTime = now;

    // Movimento FPS
    if (this.viewMode === 'fps' && this.player) {
      this.updateFPSMovement();
    }

    // Anima objetos (mais lento no FPS)
    const rotationSpeed = this.viewMode === 'fps' ? 0.005 : 0.01;
    this.objects.forEach((obj) => {
      if (obj.userData.rotationSpeed && obj !== this.selectedObject) {
        obj.rotation.x += rotationSpeed;
        obj.rotation.y += rotationSpeed;
      }
    });

    this.renderer.render(this.scene, this.camera);
  }

  updateFPSMovement() {
    const speed = this.keys.shift ? 0.15 : 0.08;
    const direction = new THREE.Vector3();

    if (this.keys.w) {
      direction.x -= Math.sin(this.fpsYaw) * speed;
      direction.z -= Math.cos(this.fpsYaw) * speed;
    }
    if (this.keys.s) {
      direction.x += Math.sin(this.fpsYaw) * speed;
      direction.z += Math.cos(this.fpsYaw) * speed;
    }
    if (this.keys.a) {
      direction.x -= Math.cos(this.fpsYaw) * speed;
      direction.z += Math.sin(this.fpsYaw) * speed;
    }
    if (this.keys.d) {
      direction.x += Math.cos(this.fpsYaw) * speed;
      direction.z -= Math.sin(this.fpsYaw) * speed;
    }

    // Pulo
    if (this.keys.space && this.isGrounded) {
      this.playerVelocity.y = this.jumpPower;
      this.isGrounded = false;
    }

    // Gravidade
    this.playerVelocity.y += this.gravity;

    // Nova posição
    const newPos = this.player.position.clone();
    newPos.add(direction);
    newPos.y += this.playerVelocity.y;

    // Chão
    if (newPos.y <= 0.1) {
      newPos.y = 0.1;
      this.playerVelocity.y = 0;
      this.isGrounded = true;
    }

    // Colisão
    if (!this.checkCollision(newPos)) {
      this.player.position.copy(newPos);
    } else {
      this.playerVelocity.y = 0;
    }

    // Limites
    this.player.position.x = Math.max(-9, Math.min(9, this.player.position.x));
    this.player.position.z = Math.max(-9, Math.min(9, this.player.position.z));

    // Câmera
    const eyeHeight = 1.6;
    this.camera.position.set(
      this.player.position.x,
      this.player.position.y + eyeHeight,
      this.player.position.z
    );

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.fpsYaw;
    this.camera.rotation.x = this.fpsPitch;
    this.camera.rotation.z = 0;
  }

  onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  cleanup() {
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('pointerlockerror', this.onPointerLockError);

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.objects.forEach((obj, id) => {
      this.removeObject(id);
    });

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}