// ============================================================================
// UNIVERSE.JS - SNIPPETS DE MODIFICAÇÃO PARA TERMINAL
// ============================================================================
// Aplique estas modificações no seu arquivo Universe.js existente

// ────────────────────────────────────────────────────────────────────────────
// MODIFICAÇÃO 1: Adicionar no construtor, após a linha dos controles FPS
// ────────────────────────────────────────────────────────────────────────────
// Localização: Após "this.keys = { w: false, a: false, ... }"

this.terminalActive = false; // NOVO: Pausa controles quando terminal está ativo

// ────────────────────────────────────────────────────────────────────────────
// MODIFICAÇÃO 2: Modificar método animate() - Seção FPS
// ────────────────────────────────────────────────────────────────────────────
// Localização: Substitua o bloco "if (this.viewMode === 'fps' && this.player)"

// CÓDIGO ORIGINAL (REMOVER/SUBSTITUIR):
/*
if (this.viewMode === 'fps' && this.player) {
  const speed = this.keys.shift ? 0.3 : 0.15;
  
  // --- MOVEMENT VECTORS ---
  const forward = new THREE.Vector3();
  // ... resto do código de movimento
}
*/

// NOVO CÓDIGO (USAR ESTE):
if (this.viewMode === 'fps' && this.player) {
  // ===== VERIFICAÇÃO TERMINAL =====
  // Se terminal ativo, apenas atualiza câmera sem movimento
  if (this.terminalActive) {
    this.camera.position.copy(this.player.position);
    this.camera.position.y += 1.6;
    // Pula processamento de física/movimento
  } else {
    // ===== CÓDIGO ORIGINAL DE MOVIMENTO (MANTER TUDO) =====
    const speed = this.keys.shift ? 0.3 : 0.15;

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

        const moveZ = dz * speed;
        nextPos.copy(this.player.position);
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
  } // FIM DO ELSE (movimento normal)
}

// ────────────────────────────────────────────────────────────────────────────
// MODIFICAÇÃO 3: Modificar setupControls() - Handler keydown
// ────────────────────────────────────────────────────────────────────────────
// Localização: No início do addEventListener('keydown')

// CÓDIGO ORIGINAL (MANTER, mas adicionar ANTES):
/*
document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if(this.keys.hasOwnProperty(k)) this.keys[k] = true;
  // ...
});
*/

// NOVO CÓDIGO (ADICIONAR NO INÍCIO do handler):
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
  
  // ===== RESTO DO CÓDIGO ORIGINAL (MANTER TUDO) =====
  const k = e.key.toLowerCase();
  if(this.keys.hasOwnProperty(k)) this.keys[k] = true;
  if(e.key === 'ArrowUp') this.keys.arrowUp = true;
  if(e.key === 'ArrowDown') this.keys.arrowDown = true;
  if(e.key === 'ArrowLeft') this.keys.arrowLeft = true;
  if(e.key === 'ArrowRight') this.keys.arrowRight = true;
  if(k === ' ') this.keys.space = true;

  // (resto do código keydown original...)
});

// ────────────────────────────────────────────────────────────────────────────
// FIM DAS MODIFICAÇÕES
// ────────────────────────────────────────────────────────────────────────────

// ============================================================================
// TESTE RÁPIDO
// ============================================================================
// Após aplicar as modificações:
// 1. Pressione T para abrir o terminal
// 2. Tente mover com WASD (não deve funcionar)
// 3. Pressione ESC para sair do FPS (deve funcionar)
// 4. Feche o terminal com ESC novamente
// 5. Movimento WASD volta a funcionar
