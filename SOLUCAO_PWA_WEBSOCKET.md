# 🔧 Solução: WebSocket WSS em PWA Android

## 🎯 Cenário Identificado

**Seu setup:**
- ✅ App é um **PWA** (Progressive Web App)
- ✅ Site está hospedado online (provavelmente HTTPS)
- ✅ Tablet "instala" o app usando PWA nativo do Android
- ❌ WebSocket WSS **não conecta** no PWA instalado

---

## ⚠️ O Problema Específico de PWA

PWAs têm restrições **mais rígidas** que apps nativos:

```
┌─────────────────────────────────────────────────────┐
│ NAVEGADOR vs PWA vs APP NATIVO                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 🌐 Navegador Desktop:                               │
│    ⚠️ Pode aceitar certificado manualmente         │
│    ✅ Funciona após aceitar                         │
│                                                     │
│ 📱 PWA Instalado (Android):                         │
│    ❌ NÃO pode aceitar certificado manualmente     │
│    ❌ Bloqueia certificado auto-assinado           │
│    ❌ Não tem opção de "aceitar risco"             │
│    ❌ Service Worker pode bloquear                 │
│                                                     │
│ 📦 App Nativo (Cordova/Capacitor):                  │
│    ✅ Aceita certificado auto-assinado             │
│    ✅ Controle total sobre WebView                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔍 Problemas do PWA com WSS + IP Privado

### 1. **Certificado Auto-Assinado**
PWA **não aceita** certificados auto-assinados - sem exceção!

### 2. **Cross-Origin / Mixed Content**
Se site está em domínio diferente do WebSocket, PWA pode bloquear

### 3. **Service Worker**
Service Worker pode interceptar e bloquear conexões WebSocket

---

## ✅ Soluções (em ordem de viabilidade)

### 🎯 SOLUÇÃO 1: Hospedar Site na Mesma Rede/Servidor (IDEAL)

Se o site estiver no mesmo servidor que o WebSocket:

#### Configuração:

```nginx
# No mesmo servidor (10.200.0.184)
# Servir site e WebSocket pelo mesmo domínio/IP

server {
    listen 443 ssl;
    server_name 10.200.0.184;
    
    # Site React
    location / {
        root /var/www/app;
        try_files $uri /index.html;
    }
    
    # WebSocket (já configurado)
    location /ws {
        proxy_pass http://localhost:8765;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

#### No código:

```typescript
// src/lib/websocketConfig.ts
export function getWebSocketURL(): string {
  // Usar MESMO domínio do site
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host; // Mesmo host do site
  
  return `${protocol}//${host}/ws`;
}
```

**Vantagens:**
- ✅ Mesmo certificado para site e WebSocket
- ✅ Não precisa aceitar nada
- ✅ Funciona em PWA
- ✅ Funciona em qualquer navegador

---

### 🎯 SOLUÇÃO 2: Usar Domínio Público com Let's Encrypt (RECOMENDADO PRODUÇÃO)

#### Configurar Domínio:

```bash
# 1. Apontar domínio para servidor
# Ex: app.industrack.com.br → 10.200.0.184 (via VPN)

# 2. Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# 3. Gerar certificado Let's Encrypt (GRATUITO)
sudo certbot --nginx -d app.industrack.com.br

# 4. Certificado válido = PWA funciona!
```

#### No código:

```typescript
// .env.production
VITE_WS_URL=wss://app.industrack.com.br/ws
```

**Vantagens:**
- ✅ Certificado válido globalmente
- ✅ Funciona em QUALQUER device
- ✅ Não precisa configuração extra
- ✅ Pronto para produção

---

### 🎯 SOLUÇÃO 3: PWA Acessar Diretamente pelo IP Interno

Se tablets estão na **mesma rede interna**:

#### Configurar PWA para Acessar Localmente:

```typescript
// vite.config.ts
export default defineConfig({
  // Build com base URL do IP local
  base: 'https://10.200.0.184/',
  
  // ... resto da config
});
```

#### Build e Deploy Local:

```bash
# 1. Build para IP local
npm run build

# 2. Servir do servidor local
# Copiar pasta dist/ para servidor

# 3. Acessar DIRETAMENTE pelo IP:
# https://10.200.0.184

# 4. Instalar PWA DESSE endereço
```

#### Aceitar Certificado ANTES de Instalar PWA:

```
1. Abrir https://10.200.0.184 no Chrome do tablet
2. Aceitar certificado auto-assinado
3. DEPOIS instalar como PWA (botão "Adicionar à tela inicial")
4. PWA vai herdar o certificado aceito
```

**Limitação:**
- ⚠️ Funciona, mas não é confiável
- ⚠️ Pode parar de funcionar após atualizações
- ⚠️ Precisa reaceitar certificado periodicamente

---

### 🎯 SOLUÇÃO 4: Migrar de PWA para App Nativo (DEFINITIVO)

Se PWA continua com problemas, migrar para **Capacitor**:

#### Por que Capacitor?

```
PWA:
❌ Não aceita certificado auto-assinado
❌ Restrições de segurança rígidas
❌ Sem controle sobre WebView

Capacitor:
✅ Aceita certificado auto-assinado
✅ Controle total sobre WebView
✅ Configuração flexível
✅ Mesmo código React!
```

#### Migração Rápida (30 minutos):

```bash
# 1. Instalar Capacitor
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android

# 2. Inicializar
npx cap init

# 3. Adicionar Android
npx cap add android

# 4. Configurar (capacitor.config.json)
{
  "android": {
    "allowMixedContent": true,
    "webContentsDebuggingEnabled": true
  }
}

# 5. Build e sync
npm run build
npx cap sync android

# 6. Abrir no Android Studio
npx cap open android

# 7. Build APK
```

**Vantagens:**
- ✅ Mesmo código React (zero mudanças)
- ✅ Funciona com certificado auto-assinado
- ✅ Mais controle
- ✅ Melhor performance

---

## 🧪 Diagnóstico: Como Saber Qual é Seu Problema

### Teste 1: Verificar se é PWA

```javascript
// Console do Chrome no tablet (chrome://inspect)
console.log('É PWA?', window.matchMedia('(display-mode: standalone)').matches);
console.log('Service Worker?', 'serviceWorker' in navigator);
```

### Teste 2: Verificar Erro Exato

```javascript
// Ver erro detalhado
const ws = new WebSocket('wss://10.200.0.184:443');
ws.onerror = (e) => console.error('ERRO:', e);
ws.onopen = () => console.log('OK!');
```

### Teste 3: Testar no Navegador vs PWA

```
1. Abrir site no Chrome normal do tablet
2. Aceitar certificado
3. WebSocket conecta?
   → SIM: Problema é do PWA (certificado não aceito no PWA)
   → NÃO: Problema é de rede/servidor
```

---

## 📊 Matriz de Decisão

| Cenário | Solução Recomendada | Complexidade | Efetividade |
|---------|-------------------|--------------|-------------|
| Site e WS no mesmo servidor | Solução 1 | Baixa | ✅✅✅ |
| Tem domínio público | Solução 2 | Média | ✅✅✅ |
| Rede interna apenas | Solução 3 | Baixa | ⚠️⚠️ |
| Nada funciona | Solução 4 (Capacitor) | Alta | ✅✅✅ |

---

## 🚀 Recomendação Final

### Para Desenvolvimento AGORA:

**Opção A: Site no Mesmo Servidor (Mais Rápido)**
```bash
# Fazer build e hospedar no mesmo servidor do WebSocket
npm run build
# Copiar dist/ para servidor
```

**Opção B: Capacitor (Mais Confiável)**
```bash
# Migrar para Capacitor (30 min)
# Funcionará com certificado auto-assinado
```

### Para Produção FUTURO:

**Domínio + Let's Encrypt (IDEAL)**
```
1. Configurar domínio: app.industrack.com.br
2. Certificado Let's Encrypt (gratuito)
3. PWA funcionará perfeitamente
4. Zero configuração extra
```

---

## ⚙️ Configuração Atual do Projeto

Seu projeto já tem PWA configurado:

```typescript
// vite.config.ts (já existente)
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Industrack - Operador Mould',
    // ...
  }
})
```

**Problema:** PWA não aceita certificado auto-assinado em IP privado.

**Solução Rápida:** Hospedar site E WebSocket no mesmo servidor/IP.

---

## 📝 Checklist de Ação

### Opção 1: Site no Mesmo Servidor

- [ ] Fazer build: `npm run build`
- [ ] Copiar `dist/` para servidor 10.200.0.184
- [ ] Configurar Nginx para servir site
- [ ] Acessar `https://10.200.0.184` no tablet
- [ ] Aceitar certificado
- [ ] Instalar PWA
- [ ] Testar WebSocket

### Opção 2: Migrar para Capacitor

- [ ] Instalar Capacitor: `npm install @capacitor/...`
- [ ] Inicializar: `npx cap init`
- [ ] Adicionar Android: `npx cap add android`
- [ ] Configurar: `capacitor.config.json`
- [ ] Build: `npm run build && npx cap sync`
- [ ] Compilar APK
- [ ] Instalar no tablet
- [ ] Testar

---

## 💡 Por Que PWA Não Funcionou

```
PWA no Android Chrome:
1. Requer HTTPS válido (certificado reconhecido)
2. NÃO aceita certificado auto-assinado
3. NÃO tem opção de "aceitar risco"
4. Service Worker adiciona camada extra de segurança
5. Cross-origin policies mais rígidas

= Certificado auto-assinado em IP privado NÃO funciona em PWA
```

---

## 🎯 Próximos Passos

1. **Escolher solução** (1, 2, 3 ou 4)
2. **Aplicar configuração**
3. **Testar no tablet**
4. **Validar WebSocket**

**Minha recomendação:**
- **Curto prazo:** Hospedar site no mesmo servidor (Solução 1)
- **Médio prazo:** Migrar para Capacitor (Solução 4)
- **Longo prazo:** Domínio + Let's Encrypt (Solução 2)

---

**Precisa de ajuda com qualquer uma dessas soluções? Me avise qual você quer seguir!** 🚀

