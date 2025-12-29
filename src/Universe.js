import * as THREE from 'three';

export class Universe {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.objects = new Map();
    this.animationId = null;
    
    // Raycaster para drag & drop
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.selectedObject = null;
    this.isDragging = false;
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.offset = new THREE.Vector3();
    
    // Controles de câmera
    this.cameraRotation = { x: 0, y: 0 };
    this.isRotating = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    
    this.init();
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    // Fog leve para profundidade sem custo alto
    this.scene.fog = new THREE.FogExp2(0x000000, 0.02);

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    this.camera.position.set(0, 5, 12);
    this.camera.lookAt(0, 0, 0);

    // Renderer otimizado para hardware fraco
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false, // Desativa para performance
      alpha: false,
      powerPreference: "low-power" // Força modo de baixo consumo
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limita pixel ratio

    // Iluminação simples (menos custoso)
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);

    // Grid simples
    const gridHelper = new THREE.GridHelper(20, 10, 0x00ff00, 0x003300);
    this.scene.add(gridHelper);

    // Estrelas otimizadas (menos partículas)
    this.createStarField();

    // Event listeners
    this.setupControls();
    window.addEventListener('resize', () => this.onResize());

    // Inicia animação
    this.animate();

    console.log('🌌 Universe iniciado (modo otimizado)');
  }

  createStarField() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    // Menos estrelas para performance (300 vs 1000)
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
      transparent: false, // Desativa transparência para performance
      sizeAttenuation: true
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  setupControls() {
    // Mouse down - inicia drag ou rotação
    this.canvas.addEventListener('mousedown', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      // Raycast para detectar objeto
      this.raycaster.setFromCamera(this.mouse, this.camera);
      
      const draggableObjects = Array.from(this.objects.values())
        .filter(obj => !obj.userData.isGhost);
      
      const intersects = this.raycaster.intersectObjects(draggableObjects, true);

      if (intersects.length > 0) {
        // Encontrou objeto - inicia drag
        let obj = intersects[0].object;
        
        // Sobe na hierarquia até achar o objeto raiz
        while (obj.parent && !this.objects.has(obj.userData.id)) {
          obj = obj.parent;
        }
        
        if (obj.userData && obj.userData.id) {
          this.selectedObject = obj;
          this.isDragging = true;
          
          // Calcula offset
          const intersectionPoint = intersects[0].point;
          this.offset.copy(intersectionPoint).sub(obj.position);
          
          this.canvas.style.cursor = 'grabbing';
          document.body.classList.add('dragging');
          
          // Destaca objeto selecionado
          this.highlightObject(obj);
          
          console.log('🎯 Objeto selecionado:', obj.userData.id);
        }
      } else {
        // Não achou objeto - rotação de câmera
        this.isRotating = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.canvas.style.cursor = 'grab';
      }
    });

    // Mouse move - drag ou rotação
    window.addEventListener('mousemove', (e) => {
      if (this.isDragging && this.selectedObject) {
        // Drag de objeto
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
        
        if (intersectPoint) {
          const newPosition = intersectPoint.sub(this.offset);
          newPosition.y = Math.max(0.5, newPosition.y); // Não vai abaixo do chão
          
          this.selectedObject.position.copy(newPosition);
          
          // Emite evento de movimento
          window.dispatchEvent(new CustomEvent('object-moved', {
            detail: {
              id: this.selectedObject.userData.id,
              position: newPosition.clone()
            }
          }));
        }
      } else if (this.isRotating) {
        // Rotação de câmera
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;

        this.cameraRotation.y += deltaX * 0.005;
        this.cameraRotation.x += deltaY * 0.005;

        // Limita rotação vertical
        this.cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraRotation.x));

        // Atualiza posição da câmera
        const radius = 12;
        this.camera.position.x = radius * Math.sin(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
        this.camera.position.y = radius * Math.sin(this.cameraRotation.x) + 5;
        this.camera.position.z = radius * Math.cos(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
        this.camera.lookAt(0, 0, 0);

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    // Mouse up - finaliza drag/rotação
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

    // Zoom com scroll
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY * 0.001;
      
      const direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction);
      
      this.camera.position.addScaledVector(direction, -delta);
      
      // Limita distância
      const distance = this.camera.position.length();
      if (distance < 5) {
        this.camera.position.normalize().multiplyScalar(5);
      } else if (distance > 30) {
        this.camera.position.normalize().multiplyScalar(30);
      }
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
      // Fantasmas começam invisíveis e fazem fade in
      mesh.traverse((child) => {
        if (child.material) {
          child.material.transparent = true;
          child.material.opacity = 0;
        }
      });
      
      // Anima fade in
      this.animateFadeIn(mesh);
    }
    
    this.scene.add(mesh);
    this.objects.set(id, mesh);

    return mesh;
  }

  animateFadeIn(mesh) {
    const duration = 500; // ms
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
    const duration = 500; // ms
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
    // Geometria mais simples para performance
    const geometry = new THREE.SphereGeometry(properties.scale || 1, 16, 16); // Reduzido de 32
    const material = new THREE.MeshStandardMaterial({
      color: properties.color || 0xff00ff,
      emissive: properties.color || 0xff00ff,
      emissiveIntensity: 0.3,
      metalness: 0.4,
      roughness: 0.3
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);
    sphere.castShadow = false; // Desativa sombras para performance
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
    const geometry = new THREE.SphereGeometry(0.3 * (properties.scale || 1), 12, 12); // Reduzido de 16
    const material = new THREE.MeshBasicMaterial({
      color: properties.color || 0xffff00
    });

    const node = new THREE.Mesh(geometry, material);
    node.position.copy(position);

    // Glow simplificado
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
      // Anima fade out antes de remover
      this.animateFadeOut(obj, () => {
        this.scene.remove(obj);
        
        // Dispose
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
      // Animação suave de movimento
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

    // Anima objetos com rotationSpeed
    this.objects.forEach((obj) => {
      if (obj.userData.rotationSpeed && obj !== this.selectedObject) {
        obj.rotation.x += obj.userData.rotationSpeed;
        obj.rotation.y += obj.userData.rotationSpeed;
      }
    });

    this.renderer.render(this.scene, this.camera);
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
