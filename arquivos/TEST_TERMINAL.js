// ============================================================================
// TEST_TERMINAL.js - Script de Teste do Sistema de Terminal
// ============================================================================
// Execute no console do navegador (F12) após carregar a aplicação

console.log('🧪 Iniciando testes do Terminal...\n');

// ────────────────────────────────────────────────────────────────────────────
// TESTE 1: Verificar elementos DOM
// ────────────────────────────────────────────────────────────────────────────
function test1_DOM() {
  console.log('📋 TESTE 1: Verificando elementos DOM...');
  
  const checks = {
    'Terminal Overlay': document.getElementById('terminal-overlay'),
    'Terminal Window': document.getElementById('terminal-window'),
    'Terminal Output': document.getElementById('terminal-output'),
    'Terminal Input': document.getElementById('terminal-input'),
    'Terminal Prompt': document.getElementById('terminal-prompt'),
    'HUD Button': document.getElementById('btn-terminal-toggle'),
    'Omni HUD': document.getElementById('omni-hud')
  };
  
  let passed = 0;
  let failed = 0;
  
  for (const [name, element] of Object.entries(checks)) {
    if (element) {
      console.log(`  ✅ ${name}: OK`);
      passed++;
    } else {
      console.error(`  ❌ ${name}: MISSING`);
      failed++;
    }
  }
  
  console.log(`\n  Resultado: ${passed}/${passed+failed} elementos encontrados\n`);
  return failed === 0;
}

// ────────────────────────────────────────────────────────────────────────────
// TESTE 2: Verificar variável global terminal
// ────────────────────────────────────────────────────────────────────────────
function test2_TerminalObject() {
  console.log('🔍 TESTE 2: Verificando objeto Terminal...');
  
  if (typeof terminal === 'undefined') {
    console.error('  ❌ Variável "terminal" não encontrada!');
    console.error('  💡 Certifique-se de que main.js foi modificado corretamente');
    return false;
  }
  
  console.log('  ✅ Objeto terminal existe');
  
  const methods = ['toggle', 'open', 'close', 'executeCommand', 'addOutput'];
  let methodsPassed = 0;
  
  for (const method of methods) {
    if (typeof terminal[method] === 'function') {
      console.log(`  ✅ Método ${method}(): OK`);
      methodsPassed++;
    } else {
      console.error(`  ❌ Método ${method}(): MISSING`);
    }
  }
  
  console.log(`\n  Resultado: ${methodsPassed}/${methods.length} métodos disponíveis\n`);
  return methodsPassed === methods.length;
}

// ────────────────────────────────────────────────────────────────────────────
// TESTE 3: Verificar comandos disponíveis
// ────────────────────────────────────────────────────────────────────────────
function test3_Commands() {
  console.log('⚙️ TESTE 3: Verificando comandos...');
  
  if (typeof terminal === 'undefined' || !terminal.commands) {
    console.error('  ❌ Comandos não disponíveis');
    return false;
  }
  
  const expectedCommands = ['help', 'echo', 'clear', 'ls', 'pwd', 'fps', 'spawn', 'exit'];
  const availableCommands = Object.keys(terminal.commands);
  
  console.log(`  📦 Comandos disponíveis: ${availableCommands.join(', ')}`);
  
  let missing = [];
  for (const cmd of expectedCommands) {
    if (!availableCommands.includes(cmd)) {
      missing.push(cmd);
    }
  }
  
  if (missing.length > 0) {
    console.error(`  ❌ Comandos faltando: ${missing.join(', ')}`);
    return false;
  }
  
  console.log('  ✅ Todos os comandos essenciais presentes\n');
  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// TESTE 4: Verificar integração com Universe
// ────────────────────────────────────────────────────────────────────────────
function test4_UniverseIntegration() {
  console.log('🌌 TESTE 4: Verificando integração com Universe...');
  
  if (typeof universe === 'undefined') {
    console.error('  ❌ Objeto "universe" não encontrado');
    return false;
  }
  
  console.log('  ✅ Objeto universe existe');
  
  if (typeof universe.terminalActive === 'undefined') {
    console.error('  ❌ Propriedade "terminalActive" não existe');
    console.error('  💡 Aplicar Modificação 1 no Universe.js');
    return false;
  }
  
  console.log(`  ✅ terminalActive: ${universe.terminalActive}`);
  console.log('\n');
  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// TESTE 5: Teste funcional - Abrir/Fechar terminal
// ────────────────────────────────────────────────────────────────────────────
async function test5_Functional() {
  console.log('🎮 TESTE 5: Teste funcional...');
  
  if (typeof terminal === 'undefined') {
    console.error('  ❌ Terminal não disponível para teste funcional');
    return false;
  }
  
  try {
    // Abrir terminal
    console.log('  📤 Abrindo terminal...');
    terminal.open();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!terminal.isActive) {
      console.error('  ❌ Terminal não abriu corretamente');
      return false;
    }
    console.log('  ✅ Terminal aberto');
    
    // Testar comando help
    console.log('  📝 Executando comando "help"...');
    const helpOutput = terminal.output.children.length;
    terminal.commands.help([]);
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (terminal.output.children.length > helpOutput) {
      console.log('  ✅ Comando help executado');
    } else {
      console.error('  ❌ Comando help não gerou output');
    }
    
    // Fechar terminal
    console.log('  📥 Fechando terminal...');
    terminal.close();
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (terminal.isActive) {
      console.error('  ❌ Terminal não fechou corretamente');
      return false;
    }
    console.log('  ✅ Terminal fechado\n');
    
    return true;
    
  } catch (error) {
    console.error(`  ❌ Erro durante teste funcional: ${error.message}`);
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// TESTE 6: Performance (básico)
// ────────────────────────────────────────────────────────────────────────────
function test6_Performance() {
  console.log('⚡ TESTE 6: Teste de performance básico...');
  
  const fpsEl = document.getElementById('debug-fps');
  if (!fpsEl) {
    console.warn('  ⚠️ Elemento FPS não encontrado, pulando teste');
    return true;
  }
  
  const currentFps = parseInt(fpsEl.textContent) || 0;
  console.log(`  📊 FPS atual: ${currentFps}`);
  
  if (currentFps < 20) {
    console.warn('  ⚠️ FPS baixo detectado (<20)');
    console.warn('  💡 Considere usar modo RETRO nas configurações');
  } else if (currentFps < 40) {
    console.log('  ⚠️ FPS moderado (20-40)');
  } else {
    console.log('  ✅ FPS adequado (>40)');
  }
  
  console.log('\n');
  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// EXECUTAR TODOS OS TESTES
// ────────────────────────────────────────────────────────────────────────────
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║         MULTI UNIVERSE - TESTE DO TERMINAL            ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  const tests = [
    { name: 'DOM Elements', fn: test1_DOM },
    { name: 'Terminal Object', fn: test2_TerminalObject },
    { name: 'Commands', fn: test3_Commands },
    { name: 'Universe Integration', fn: test4_UniverseIntegration },
    { name: 'Functional Test', fn: test5_Functional },
    { name: 'Performance', fn: test6_Performance }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Erro no teste "${test.name}": ${error.message}`);
      failed++;
    }
  }
  
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                    RESULTADO FINAL                     ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\n  ✅ Testes Passou: ${passed}`);
  console.log(`  ❌ Testes Falhou: ${failed}`);
  console.log(`  📊 Taxa de Sucesso: ${Math.round((passed/(passed+failed))*100)}%\n`);
  
  if (failed === 0) {
    console.log('🎉 TODOS OS TESTES PASSARAM! Sistema pronto para uso.');
    console.log('\n💡 Experimente:');
    console.log('   - Pressione T para abrir o terminal');
    console.log('   - Digite "help" para ver comandos');
    console.log('   - Digite "spawn 3" para criar objetos');
  } else {
    console.error('⚠️ Alguns testes falharam. Verifique os erros acima.');
    console.log('\n💡 Dicas de troubleshooting:');
    console.log('   1. Certifique-se de aplicar todas as modificações');
    console.log('   2. Verifique o console por erros de import');
    console.log('   3. Recarregue a página (Ctrl+R)');
  }
  
  console.log('\n════════════════════════════════════════════════════════\n');
}

// ────────────────────────────────────────────────────────────────────────────
// AUTO-EXECUTAR
// ────────────────────────────────────────────────────────────────────────────
// Aguarda 2 segundos para garantir que tudo carregou
setTimeout(() => {
  runAllTests();
}, 2000);

// ────────────────────────────────────────────────────────────────────────────
// HELPER: Testar comando manualmente
// ────────────────────────────────────────────────────────────────────────────
window.testCommand = function(cmd) {
  if (typeof terminal === 'undefined') {
    console.error('Terminal não disponível');
    return;
  }
  
  terminal.open();
  terminal.input.value = cmd;
  terminal.executeCommand();
}

// ────────────────────────────────────────────────────────────────────────────
console.log('📦 Script de teste carregado!');
console.log('💡 Use testCommand("help") para testar comandos manualmente');
