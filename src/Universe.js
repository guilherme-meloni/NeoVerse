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
    
    // Modos de visão
    this.viewMode = '3d'; // '3d' ou 'fps'
    this.cameraDistance = 12;

    // Raycaster para drag & drop
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

    // Controles FPS (simplificados)
    this.keys = { w: false, a: false, s: false, d: false, shift: false };
    this.fpsYaw = 0;
    this.fpsPitch = 0;

    this.init();
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.02);

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    this.camera.position.set(0, 5, 12);
    this.camera.lookAt(0, 0, 0);

    // Renderer otimizado
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: "low-power"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    // Iluminação
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);

    // Grid
    const gridHelper = new THREE.GridHelper(20, 10, 0x00ff00, 0x003300);
    this.scene.add(gridHelper);

    // Player (apenas se tiver)
    if (this.hasPlayer) {
      this.createPlayer();
    }

    // Estrelas
    this.createStarField();

    // Controles
    this.setupControls();
    window.addEventListener('resize', () => this.onResize());

    // Inicia animação
    this.animate();

    console.log('🌌 Universe iniciado');
  }

  createStarField() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    for (let i = 0; i < 300; i++) {
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
    
    const bodyGeom = new THREE.CylinderGeometry(0.3, 0.3, 1.4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.3
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.7;
    
    const headGeom = new THREE.SphereGeometry(0.25, 8, 8);
    const head = new THREE.Mesh(headGeom, bodyMat);
    head.position.y = 1.6;
    
    group.add(body);
    group.add(head);
    group.position.set(0, 0.1, 0);
    
    this.player = group;
    this.scene.add(group);
    
    console.log('🧍 Player criado');
  }

  toggleViewMode() {
    if (!this.hasPlayer) {
      console.log('❌ Sem player nesta janela');
      return;
    }
    
    this.viewMode = this.viewMode === '3d' ? 'fps' : '3d';
    
    if (this.viewMode === 'fps') {
      // Ativa FPS - câmera olha pra frente
      this.fpsYaw = Math.PI; // Olha pra frente do grid
      this.fpsPitch = 0;
      
      // Posiciona câmera
      const eyeHeight = 1.6;
      this.camera.position.set(
        this.player.position.x,
        this.player.position.y + eyeHeight,
        this.player.position.z
      );
      
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.set(0, this.fpsYaw, 0);
      
      // Esconde cursor e trava ele no centro
      this.canvas.style.cursor = 'none';
      
      console.log('👁️ Modo FPS ativado - mova o mouse livremente');
    } else {
      // Volta pra 3D
      this.canvas.style.cursor = 'default';
      this.resetCamera3D();
      console.log('🌍 Modo 3D ativado');
    }
    
    // Mostra/esconde player
    if (this.player) {
      this.player.visible = this.viewMode === '3d';
    }
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
      
      if (key === 'v' && this.hasPlayer) {
        this.toggleViewMode();
        // Atualiza UI quando usa tecla V
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
    });

    document.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w') this.keys.w = false;
      if (key === 'a') this.keys.a = false;
      if (key === 's') this.keys.s = false;
      if (key === 'd') this.keys.d = false;
      if (key === 'shift') this.keys.shift = false;
    });

    // Mouse move
    document.addEventListener('mousemove', (e) => {
      // Modo FPS - rotação LIVRE (sem botão)
      if (this.viewMode === 'fps') {
        // Sensibilidade aumentada
        this.fpsYaw -= e.movementX * 0.005;
        this.fpsPitch -= e.movementY * 0.005;
        // Limita pitch (não vira de cabeça pra baixo)
        this.fpsPitch = Math.max(-1.4, Math.min(1.4, this.fpsPitch));
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
        // Rotação 3D
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

    // Mouse down (apenas modo 3D)
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.viewMode === 'fps') return;
      if (e.button !== 0) return; // Apenas botão esquerdo
      
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

    // Desabilita menu contexto
    this.canvas.addEventListener('contextmenu', (e) => {
      if (this.viewMode === 'fps') {
        e.preventDefault();
      }
    });

    // Zoom (apenas modo 3D)
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
      default:
        mesh = this.createSphere(position, properties);
    }

    mesh.userData = { id, type, properties, isGhost };

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
    const geometry = new THREE.SphereGeometry(properties.scale || 1, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: properties.color || 0xff00ff,
      emissive: properties.color || 0xff00ff,
      emissiveIntensity: 0.3,
      metalness: 0.4,
      roughness: 0.3
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);
    sphere.castShadow = false;
    sphere.receiveShadow = false;
    return sphere;
  }

  createCube(position, properties) {
    const size = properties.scale || 1;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshStandardMaterial({
      color: properties.color || 0x00ff00,
      emissive: properties.color || 0x00ff00,
      emissiveIntensity: 0.3,
      metalness: 0.4,
      roughness: 0.3
    });

    const cube = new THREE.Mesh(geometry, material);
    cube.position.copy(position);
    cube.userData.rotationSpeed = 0.01;
    return cube;
  }

  createNode(position, properties) {
    const geometry = new THREE.SphereGeometry(0.3 * (properties.scale || 1), 12, 12);
    const material = new THREE.MeshBasicMaterial({
      color: properties.color || 0xffff00
    });

    const node = new THREE.Mesh(geometry, material);
    node.position.copy(position);

    const glowGeometry = new THREE.SphereGeometry(0.5 * (properties.scale || 1), 12, 12);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: properties.color || 0xffff00,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    node.add(glow);

    return node;
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

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    // Movimento FPS
    if (this.viewMode === 'fps' && this.player) {
      this.updateFPSMovement();
    }

    // Anima objetos
    this.objects.forEach((obj) => {
      if (obj.userData.rotationSpeed && obj !== this.selectedObject) {
        obj.rotation.x += obj.userData.rotationSpeed;
        obj.rotation.y += obj.userData.rotationSpeed;
      }
    });

    this.renderer.render(this.scene, this.camera);
  }

  updateFPSMovement() {
    const speed = this.keys.shift ? 0.15 : 0.08;
    const direction = new THREE.Vector3();
    
    // Movimento baseado na rotação YAW (horizontal)
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
    
    // Aplica movimento ao player
    this.player.position.add(direction);
    
    // Limita área (dentro do grid)
    this.player.position.x = Math.max(-9, Math.min(9, this.player.position.x));
    this.player.position.z = Math.max(-9, Math.min(9, this.player.position.z));
    
    // Câmera sempre na altura dos olhos
    const eyeHeight = 1.6;
    this.camera.position.set(
      this.player.position.x,
      this.player.position.y + eyeHeight,
      this.player.position.z
    );
    
    // Aplica rotação (YXZ é importante!)
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
