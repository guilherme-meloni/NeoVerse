export class Terminal {
  constructor(universe, cityManager) {
    this.universe = universe;
    this.cityManager = cityManager;
    this.isActive = false;
    this.history = [];
    this.historyIndex = -1;
    this.currentPath = '~';

    this.commands = {
      help: this.cmdHelp.bind(this),
      echo: this.cmdEcho.bind(this),
      clear: this.cmdClear.bind(this),
      ls: this.cmdLs.bind(this),
      pwd: this.cmdPwd.bind(this),
      exit: this.cmdExit.bind(this),
      fps: this.cmdFps.bind(this),
      spawn: this.cmdSpawn.bind(this)
    };

    this.init();
  }

  init() {
    // Elementos DOM
    this.overlay = document.getElementById('terminal-overlay');
    this.output = document.getElementById('terminal-output');
    this.input = document.getElementById('terminal-input');
    this.prompt = document.getElementById('terminal-prompt');

    if (!this.overlay || !this.input || !this.output) {
      console.error('❌ Terminal DOM elements not found');
      return;
    }

    // Event Listeners
    this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Atualiza prompt
    this.updatePrompt();

    console.log('🖥️ Terminal inicializado');
  }

  toggle() {
    this.isActive = !this.isActive;

    if (this.isActive) {
      this.open();
    } else {
      this.close();
    }
  }

  open() {
    this.isActive = true;
    this.overlay.style.display = 'flex';
    
    // Pausa controles FPS
    if (this.universe) {
      this.universe.terminalActive = true;
    }

    // Foco no input
    setTimeout(() => {
      this.input.focus();
    }, 100);

    this.addOutput('Terminal v1.0 - Digite "help" para comandos', 'system');
  }

  close() {
    this.isActive = false;
    this.overlay.style.display = 'none';
    
    // Resume controles
    if (this.universe) {
      this.universe.terminalActive = false;
    }

    // Remove foco
    this.input.blur();
  }

  handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.executeCommand();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.navigateHistory(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.navigateHistory(1);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Future: autocomplete
    }
  }

  executeCommand() {
    const cmd = this.input.value.trim();
    
    if (cmd === '') return;

    // Adiciona ao histórico
    this.history.push(cmd);
    this.historyIndex = this.history.length;

    // Mostra comando no output
    this.addOutput(`${this.currentPath} $ ${cmd}`, 'input');

    // Parse comando
    const parts = cmd.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Executa
    if (this.commands[command]) {
      this.commands[command](args);
    } else {
      this.addOutput(`comando não encontrado: ${command}`, 'error');
      this.addOutput(`digite "help" para ver comandos disponíveis`, 'hint');
    }

    // Limpa input
    this.input.value = '';

    // Scroll para o fim
    this.output.scrollTop = this.output.scrollHeight;
  }

  navigateHistory(direction) {
    if (this.history.length === 0) return;

    this.historyIndex += direction;
    
    if (this.historyIndex < 0) {
      this.historyIndex = 0;
    } else if (this.historyIndex > this.history.length) {
      this.historyIndex = this.history.length;
    }

    if (this.historyIndex < this.history.length) {
      this.input.value = this.history[this.historyIndex];
    } else {
      this.input.value = '';
    }
  }

  addOutput(text, type = 'normal') {
    const line = document.createElement('div');
    line.className = `terminal-line terminal-${type}`;
    line.textContent = text;
    this.output.appendChild(line);

    // Limita linhas (performance)
    if (this.output.children.length > 100) {
      this.output.removeChild(this.output.firstChild);
    }
  }

  updatePrompt() {
    if (this.prompt) {
      this.prompt.textContent = `${this.currentPath} $`;
    }
  }

  // ============ COMANDOS ============

  cmdHelp(args) {
    this.addOutput('═══════════════════════════════════', 'system');
    this.addOutput('COMANDOS DISPONÍVEIS:', 'system');
    this.addOutput('═══════════════════════════════════', 'system');
    this.addOutput('  help       - mostra esta ajuda', 'normal');
    this.addOutput('  echo [txt] - repete o texto', 'normal');
    this.addOutput('  clear      - limpa a tela', 'normal');
    this.addOutput('  ls         - lista prédios/arquivos', 'normal');
    this.addOutput('  pwd        - mostra caminho atual', 'normal');
    this.addOutput('  fps        - mostra FPS atual', 'normal');
    this.addOutput('  spawn [n]  - cria N objetos aleatórios', 'normal');
    this.addOutput('  exit       - fecha o terminal', 'normal');
    this.addOutput('═══════════════════════════════════', 'system');
  }

  cmdEcho(args) {
    this.addOutput(args.join(' '), 'normal');
  }

  cmdClear(args) {
    this.output.innerHTML = '';
  }

  cmdLs(args) {
    if (!this.cityManager || !this.cityManager.isCityActive) {
      this.addOutput('cidade não ativa', 'error');
      return;
    }

    const doors = this.cityManager.doors;
    
    if (doors.length === 0) {
      this.addOutput('nenhum item encontrado', 'hint');
      return;
    }

    this.addOutput(`total ${doors.length} itens:`, 'system');
    
    doors.forEach((door, i) => {
      const type = door.type === 'dir' ? '[DIR]' : '[FILE]';
      const color = door.type === 'dir' ? 'directory' : 'file';
      this.addOutput(`  ${type} ${door.name}`, color);
    });
  }

  cmdPwd(args) {
    if (this.cityManager && this.cityManager.currentPath) {
      this.addOutput(this.cityManager.currentPath, 'normal');
      this.currentPath = this.cityManager.currentPath.split('/').pop() || '~';
      this.updatePrompt();
    } else {
      this.addOutput('~', 'normal');
    }
  }

  cmdExit(args) {
    this.addOutput('fechando terminal...', 'system');
    setTimeout(() => this.close(), 300);
  }

  cmdFps(args) {
    const fpsEl = document.getElementById('debug-fps');
    const fps = fpsEl ? fpsEl.textContent : '--';
    this.addOutput(`FPS atual: ${fps}`, 'system');
    
    const objCount = this.universe ? this.universe.objects.size : 0;
    this.addOutput(`Objetos na cena: ${objCount}`, 'normal');
  }

  cmdSpawn(args) {
    if (!this.universe || !this.universe.player) {
      this.addOutput('player não disponível', 'error');
      return;
    }

    const count = parseInt(args[0]) || 1;
    
    if (count > 10) {
      this.addOutput('máximo 10 objetos por vez (performance)', 'error');
      return;
    }

    this.addOutput(`spawning ${count} objeto(s)...`, 'system');

    const types = ['sphere', 'cube', 'pyramid', 'cylinder', 'torus'];
    const playerPos = this.universe.player.position;

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const offset = {
        x: playerPos.x + (Math.random() - 0.5) * 6,
        y: playerPos.y + 2 + Math.random() * 2,
        z: playerPos.z + (Math.random() - 0.5) * 6
      };

      // Precisa de ObjectManager injetado ou emitir evento
      window.dispatchEvent(new CustomEvent('terminal-spawn-object', {
        detail: { type, position: offset }
      }));
    }

    this.addOutput(`✓ ${count} objeto(s) criado(s)`, 'success');
  }

  cleanup() {
    if (this.input) {
      this.input.removeEventListener('keydown', this.handleKeyDown);
    }
  }
}
