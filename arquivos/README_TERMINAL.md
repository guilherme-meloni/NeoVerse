# 🚀 Multi Universe - Sistema de Terminal Integrado

## 📋 Resumo da Implementação

Sistema de Terminal **ultralight** otimizado para hardware fraco (i5-661 sem GPU dedicada). Usa overlay HTML puro, sem CSS3D ou texturas dinâmicas.

## 🎯 Recursos Implementados

✅ **Terminal Flutuante**
- Overlay HTML com fundo transparente
- Comandos funcionais (`ls`, `echo`, `help`, `spawn`, etc.)
- Histórico de comandos (setas ↑/↓)
- Auto-complete planejado (Tab)

✅ **Integração com HUD**
- Botão `[>_ TERMINAL]` na barra inferior
- Hotkey: Tecla **T** para abrir/fechar
- ESC para fechar (funciona mesmo em modo FPS)

✅ **Pausa de Controles**
- WASD desabilitado quando terminal está ativo
- Mouse look permanece funcional
- ESC sempre funciona para sair do FPS

✅ **Comandos Disponíveis**
- `help` - Lista todos os comandos
- `echo [texto]` - Repete o texto digitado
- `clear` - Limpa a tela do terminal
- `ls` - Lista prédios/arquivos da cidade atual
- `pwd` - Mostra caminho do diretório atual
- `fps` - Exibe FPS e contagem de objetos
- `spawn [n]` - Cria N objetos aleatórios (máx 10)
- `exit` - Fecha o terminal

## 📦 Arquivos Criados/Modificados

### **Novos Arquivos**
1. `src/Terminal.js` - Classe principal do terminal
2. `UNIVERSE_PATCH.md` - Instruções de modificação
3. `Universe_Modifications.js` - Snippets de código

### **Arquivos Modificados**
1. `index.html` - Adicionado estrutura do terminal e botão HUD
2. `src/main.js` - Integração do Terminal com outros módulos
3. `src/Universe.js` - Adicionado suporte para `terminalActive`

## 🔧 Instalação

### Passo 1: Adicionar Arquivos Novos

Copie para o diretório `src/`:
```bash
cp Terminal.js seu-projeto/src/
```

### Passo 2: Substituir index.html

Substitua seu `index.html` atual pelo novo arquivo fornecido.

### Passo 3: Substituir main.js

Substitua seu `src/main.js` atual pelo novo arquivo fornecido.

### Passo 4: Modificar Universe.js

Abra `src/Universe.js` e aplique as 3 modificações descritas em `Universe_Modifications.js`:

#### Modificação 1 - Construtor
```javascript
// Localização: Após this.keys = { ... }
this.terminalActive = false;
```

#### Modificação 2 - Método animate()
```javascript
// Substituir bloco FPS por:
if (this.viewMode === 'fps' && this.player) {
  if (this.terminalActive) {
    this.camera.position.copy(this.player.position);
    this.camera.position.y += 1.6;
  } else {
    // ... código original de movimento ...
  }
}
```

#### Modificação 3 - setupControls()
```javascript
// Adicionar NO INÍCIO do keydown handler:
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && this.viewMode === 'fps') {
      this.exitFPS();
      return;
  }
  
  const blockedKeys = ['w','a','s','d',' ','arrowup','arrowdown','arrowleft','arrowright'];
  if (this.terminalActive && blockedKeys.includes(e.key.toLowerCase())) {
      return;
  }
  
  // ... resto do código original ...
});
```

### Passo 5: Testar

```bash
npm run dev
```

## 🎮 Como Usar

### Abrir Terminal
- **Botão:** Clique em `[>_ TERMINAL]` na barra inferior
- **Hotkey:** Pressione tecla **T**

### Comandos Básicos
```bash
# Listar arquivos da cidade
ls

# Criar 5 objetos aleatórios
spawn 5

# Ver FPS atual
fps

# Mostrar caminho atual
pwd

# Ajuda
help
```

### Fechar Terminal
- Pressione **ESC**
- Digite `exit`
- Clique novamente no botão

## ⚡ Otimizações para Hardware Fraco

### Decisões de Design

❌ **Evitado:**
- CSS3DRenderer (overhead de transformações 3D)
- Texturas Canvas dinâmicas (custo GPU)
- Efeitos visuais pesados (bloom, blur)

✅ **Usado:**
- Overlay HTML puro com `position: fixed`
- Renderização via DOM nativo (zero impacto WebGL)
- Pausa de física quando terminal ativo (economiza CPU)

### Benchmarks Esperados

**Hardware Teste:** i5-661 (2 cores, 2.66GHz, sem GPU)

- **Sem Terminal:** ~45-60 FPS (modo retro)
- **Terminal Aberto:** ~43-58 FPS (queda <5%)
- **Terminal Fechado:** Performance idêntica

**Memória:**
- Overhead: ~2-5MB RAM
- DOM Elements: 10-15 elementos

## 🐛 Troubleshooting

### Terminal não abre
- Verifique console: `terminal.isActive`
- Confirme que elementos DOM existem (`#terminal-overlay`)

### Controles não pausam
- Verifique `universe.terminalActive` está `true`
- Confirme modificação 3 foi aplicada corretamente

### Comandos não funcionam
- Abra console e teste: `terminal.commands.help()`
- Verifique se `cityManager` foi injetado corretamente

## 🎨 Personalização

### Mudar Cor do Terminal
```css
/* index.html - Buscar por #terminal-output */
#terminal-output {
  color: #00ff00; /* Verde padrão */
  /* Trocar para: */
  color: #00ffff; /* Ciano */
  color: #ff00ff; /* Magenta */
}
```

### Adicionar Novos Comandos
```javascript
// src/Terminal.js - No objeto commands
this.commands = {
  // ... comandos existentes ...
  
  // Novo comando
  meucomando: this.cmdMeuComando.bind(this)
};

// Implementar método
cmdMeuComando(args) {
  this.addOutput('Meu comando executado!', 'success');
}
```

### Hotkey Diferente
```javascript
// src/main.js - Trocar 't' por outra tecla
if (e.key.toLowerCase() === 'c' && !terminal.isActive) {
  terminal.toggle();
}
```

## 📊 Performance Tips

1. **Limite objetos spawned:** Máximo 10 por comando
2. **Clear com frequência:** Use `clear` para limpar histórico
3. **Feche quando não usar:** Terminal fechado = zero overhead

## 🔮 Próximos Passos (Roadmap)

- [ ] Autocomplete com Tab
- [ ] Comando `cd` para navegar diretórios
- [ ] Pipe/redirect de comandos (`ls | grep`)
- [ ] Histórico persistente (localStorage)
- [ ] Temas de cores customizáveis
- [ ] Integração com sistema de arquivos Tauri

## 📝 Licença

Mesmo do projeto Multi Universe.

## 🤝 Contribuindo

Contribuições são bem-vindas! Especialmente otimizações para hardware fraco.

---

**Desenvolvido para rodar em hardware legado** 🖥️⚡
