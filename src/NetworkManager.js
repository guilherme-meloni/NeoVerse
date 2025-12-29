// src/NetworkManager.js
export class NetworkManager {
  constructor(windowManager, objectManager) {
    this.windowManager = windowManager;
    this.objectManager = objectManager;
    
    this.serverUrl = 'ws://192.168.50.200:9000';
    this.ws = null;
    this.connected = false;
    this.myCode = this.generateCode();
    this.mergedUniverses = new Set(); // Códigos de universos mesclados
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.heartbeatInterval = null;

    console.log(`🔑 Meu código: ${this.myCode}`);
  }

  async connect() {
    if (this.connected) {
      console.log('⚠️ Já conectado ao servidor');
      return;
    }

    try {
      console.log(`🔌 Conectando ao servidor ${this.serverUrl}...`);
      
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        console.log('✅ Conectado ao servidor!');

        // Envia identificação
        this.send({
          type: 'connect',
          code: this.myCode
        });

        // Inicia heartbeat
        this.startHeartbeat();

        // Atualiza UI
        this.updateNetworkUI();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onerror = (error) => {
        console.error('❌ Erro na conexão:', error);
        this.updateNetworkUI();
      };

      this.ws.onclose = () => {
        this.connected = false;
        console.log('👋 Desconectado do servidor');
        
        this.stopHeartbeat();
        this.updateNetworkUI();

        // Tenta reconectar
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`🔄 Tentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.connect(), 3000);
        }
      };

    } catch (err) {
      console.error('❌ Falha ao conectar:', err);
      this.updateNetworkUI();
    }
  }

  disconnect() {
    if (this.ws) {
      this.stopHeartbeat();
      this.ws.close();
      this.ws = null;
      this.connected = false;
      console.log('👋 Desconectado manualmente');
      this.updateNetworkUI();
    }
  }

  handleMessage(message) {
    switch (message.type) {
      case 'connected':
        console.log(`✅ Confirmado servidor: ${message.code}`);
        this.showTooltip(`🌐 Conectado! Código: ${this.myCode}`);
        break;

      case 'connect-error':
        console.error('❌ Erro de conexão:', message.message);
        // Gera novo código e tenta novamente
        this.myCode = this.generateCode();
        this.send({ type: 'connect', code: this.myCode });
        break;

      case 'universes-list':
        console.log(`📡 Universos disponíveis:`, message.universes);
        break;

      case 'object-add':
        if (this.mergedUniverses.has(message.code)) {
          this.objectManager.handleRemoteObjectAdd(message.code, message.object);
        }
        break;

      case 'object-move':
        if (this.mergedUniverses.has(message.code)) {
          this.objectManager.handleObjectMove(message.id, message.position);
        }
        break;

      case 'object-update':
        if (this.mergedUniverses.has(message.code)) {
          this.objectManager.handleObjectUpdate(message.id, message.properties);
        }
        break;

      case 'object-remove':
        if (this.mergedUniverses.has(message.code)) {
          this.objectManager.handleObjectRemove(message.id);
        }
        break;

      case 'merge-objects':
        this.handleMergeObjects(message);
        break;

      case 'merge-error':
        console.error('❌ Erro ao mesclar:', message.message);
        this.showTooltip(`❌ ${message.message}`);
        break;

      case 'universe-merged':
        console.log(`🔗 Universo ${message.code} mesclou com você`);
        this.mergedUniverses.add(message.code);
        this.updateNetworkUI();
        break;

      case 'universe-disconnected':
        console.log(`👋 Universo ${message.code} desconectou`);
        this.mergedUniverses.delete(message.code);
        this.updateNetworkUI();
        break;

      default:
        console.log('❓ Mensagem desconhecida:', message);
    }
  }

  handleMergeObjects(message) {
    const { fromCode, objects } = message;
    
    console.log(`🔗 Mesclando com ${fromCode} (${objects.length} objetos)`);

    // Adiciona universo à lista de mesclados
    this.mergedUniverses.add(fromCode);

    // Adiciona todos os objetos como fantasmas
    objects.forEach(obj => {
      this.objectManager.handleRemoteObjectAdd(fromCode, obj);
    });

    this.showTooltip(`🔗 Mesclado com ${fromCode}!`);
    this.updateNetworkUI();
  }

  mergeWithUniverse(code) {
    if (!this.connected) {
      this.showTooltip('❌ Não conectado ao servidor');
      return;
    }

    if (code === this.myCode) {
      this.showTooltip('❌ Não pode mesclar consigo mesmo');
      return;
    }

    console.log(`🔗 Solicitando mescla com ${code}...`);

    this.send({
      type: 'merge-request',
      fromCode: this.myCode,
      toCode: code
    });
  }

  // Envia evento de objeto local
  broadcastObjectAdd(object) {
    if (!this.connected) return;

    this.send({
      type: 'object-add',
      code: this.myCode,
      object
    });
  }

  broadcastObjectMove(id, position) {
    if (!this.connected) return;

    this.send({
      type: 'object-move',
      code: this.myCode,
      id,
      position
    });
  }

  broadcastObjectUpdate(id, properties) {
    if (!this.connected) return;

    this.send({
      type: 'object-update',
      code: this.myCode,
      id,
      properties
    });
  }

  broadcastObjectRemove(id) {
    if (!this.connected) return;

    this.send({
      type: 'object-remove',
      code: this.myCode,
      id
    });
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.connected) {
        this.send({
          type: 'heartbeat',
          code: this.myCode
        });
      }
    }, 10000); // A cada 10s
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  updateNetworkUI() {
    const statusText = document.getElementById('network-status');
    const codeText = document.getElementById('network-code');
    const mergedCount = document.getElementById('merged-count');

    if (statusText) {
      statusText.textContent = this.connected ? 'Online' : 'Offline';
      statusText.style.color = this.connected ? '#0f0' : '#f00';
    }

    if (codeText) {
      codeText.textContent = this.myCode;
    }

    if (mergedCount) {
      mergedCount.textContent = this.mergedUniverses.size;
    }
  }

  showTooltip(message) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = message;
    tooltip.style.left = '50%';
    tooltip.style.top = '20%';
    tooltip.style.transform = 'translate(-50%, 0)';
    document.body.appendChild(tooltip);

    setTimeout(() => tooltip.remove(), 2000);
  }

  cleanup() {
    this.disconnect();
  }
}
