# 🔐 Guia de Atualização - WebSocket Seguro (WSS)

## 🎉 Backend Atualizado para WSS!

O servidor WebSocket foi migrado de **WS** (cleartext) para **WSS** (secure) com SSL/TLS.

---

## 📊 Mudanças

### Antes vs Agora

```
┌─────────────────────────────────────────────────┐
│ ANTES (WS - Inseguro)                           │
├─────────────────────────────────────────────────┤
│ URL:    ws://10.200.0.184:8765                  │
│ Porta:  8765                                    │
│ SSL:    ❌ Não                                  │
│ Android: ❌ Bloqueado (requer config)           │
│ Dados:  ❌ Não criptografados                   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ AGORA (WSS - Seguro)                            │
├─────────────────────────────────────────────────┤
│ URL:    wss://10.200.0.184:443                  │
│ Porta:  443 (HTTPS padrão)                      │
│ SSL:    ✅ Sim (TLS 1.2+)                       │
│ Android: ✅ Permitido (sem config extra)        │
│ Dados:  ✅ Criptografados                       │
└─────────────────────────────────────────────────┘
```

---

## ✅ Vantagens do WSS

### 1. **Segurança**
- ✅ Dados criptografados em trânsito
- ✅ Proteção contra man-in-the-middle
- ✅ Autenticidade do servidor

### 2. **Compatibilidade Android**
- ✅ Android 9+ permite WSS por padrão
- ✅ Não precisa `network_security_config.xml`
- ✅ Não precisa `usesCleartextTraffic`

### 3. **Produção Ready**
- ✅ Funciona em HTTPS sites
- ✅ Aceito por browsers modernos
- ✅ Melhor prática de segurança

---

## 🚀 Código React Já Atualizado!

Os seguintes arquivos foram automaticamente atualizados:

### 1. **`src/lib/websocketConfig.ts`**

```typescript
// Agora retorna WSS por padrão
export function getWebSocketURL(): string {
  // Variável de ambiente (prioridade)
  const envUrl = import.meta.env.VITE_WS_URL;
  if (envUrl) return envUrl;
  
  // Padrão: WSS na porta 443
  const protocol = 'wss:';  // Sempre seguro
  const port = '443';
  
  // Para localhost → wss://10.200.0.184:443
  if (hostname === 'localhost') {
    return 'wss://10.200.0.184:443';
  }
  
  // Para outros → wss://{hostname}:443
  return `${protocol}//${hostname}:${port}`;
}
```

### 2. **`src/types/websocket-new.ts`**

```typescript
export const DEFAULT_WS_CONFIG: WebSocketConfig = {
  url: 'wss://10.200.0.184:443',  // Atualizado
  port: 443,
  reconnectAttempts: 5,
  reconnectInterval: 5000,
  pingTimeout: 60000
};
```

### 3. **Hooks WebSocket**

Os hooks `useWebSocket` e `useWebSocketManager` usam a configuração atualizada automaticamente.

---

## 🔧 Passos para Atualizar o App

### 1️⃣ Rebuild Frontend

```bash
# Na raiz do projeto
npm run build
```

### 2️⃣ Rebuild Android (Clean Build)

```bash
# Cordova
cd android
./gradlew clean
cd ..
cordova build android

# Capacitor
npx cap sync android
npx cap open android
# No Android Studio: Build > Rebuild Project

# React Native
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### 3️⃣ Instalar no Tablet

Instale o novo APK no tablet.

### 4️⃣ Testar!

O WebSocket deve conectar automaticamente via WSS!

---

## 🧪 Testes

### Teste 1: Navegador Desktop

```bash
npm run dev
# Abrir http://localhost:5173
# F12 Console deve mostrar:
# 🔌 WebSocket: Usando IP VPN WSS: wss://10.200.0.184:443
# ✅ WebSocket conectado
```

### Teste 2: Componente de Diagnóstico

```tsx
import { WebSocketDiagnostic } from './components/WebSocketDiagnostic';

// Adicionar em Settings.tsx
<WebSocketDiagnostic />
```

Deve mostrar:
- URL: `wss://10.200.0.184:443`
- Seguro (SSL): ✅ Sim (WSS)
- Porta: 443

### Teste 3: Logs ADB (Android)

```bash
adb logcat | grep -i websocket

# Deve mostrar:
# 🔌 WebSocket: Conectando a wss://10.200.0.184:443
# ✅ WebSocket conectado
```

---

## ⚠️ Certificado Auto-Assinado

Como você está usando IP privado (10.200.0.184), o certificado é **auto-assinado**.

### Comportamento Esperado:

#### 🌐 Navegador Desktop:
- ⚠️ Pode mostrar aviso de certificado na primeira vez
- ✅ Você pode clicar em "Avançado" e aceitar
- ✅ WebSocket funciona após aceitar

#### 📱 WebView Android:
- ✅ **Aceita automaticamente** em modo debug/desenvolvimento
- ✅ Não mostra avisos ao usuário
- ✅ WebSocket conecta normalmente

### Se Houver Erro SSL no Android:

#### Opção 1: Habilitar Debug no WebView (Capacitor)

```json
// capacitor.config.json
{
  "android": {
    "allowMixedContent": true,
    "webContentsDebuggingEnabled": true
  }
}
```

#### Opção 2: Allow Navigation (Cordova)

```xml
<!-- config.xml -->
<platform name="android">
    <allow-navigation href="https://10.200.0.184:*" />
    <preference name="AndroidInsecureFileModeEnabled" value="true" />
</platform>
```

---

## 🔐 Segurança: Desenvolvimento vs Produção

### 🏠 Desenvolvimento (IP Privado)

```
┌─────────────────────────────────────────┐
│ wss://10.200.0.184:443                  │
│                                         │
│ Certificado: Auto-assinado             │
│ Validade: Apenas rede interna          │
│ WebView: Aceita automaticamente        │
│                                         │
│ ✅ Perfeito para desenvolvimento        │
└─────────────────────────────────────────┘
```

### 🌍 Produção (Domínio Público)

```
┌─────────────────────────────────────────┐
│ wss://ws.industrack.com.br              │
│                                         │
│ Certificado: Let's Encrypt (gratuito)  │
│ Validade: Reconhecido globalmente      │
│ WebView: Aceita nativamente            │
│                                         │
│ ✅ Pronto para produção                 │
└─────────────────────────────────────────┘
```

---

## 📱 Configurações Android (Simplificadas)

### ✅ O Que NÃO Precisa Mais:

- ❌ `network_security_config.xml` com cleartext
- ❌ `android:usesCleartextTraffic="true"`
- ❌ Configurações especiais de segurança

### ✅ O Que Ainda Precisa:

- ✅ Permissão `INTERNET` (básica)
- ✅ Permissão `ACCESS_NETWORK_STATE` (opcional)

```xml
<!-- AndroidManifest.xml -->
<manifest>
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <application>
        <!-- Suas configs normais -->
    </application>
</manifest>
```

**Pronto!** Só isso é necessário para WSS funcionar. 🎉

---

## 🔍 Troubleshooting

### Erro: "NET::ERR_CERT_AUTHORITY_INVALID"

**Normal para certificado auto-assinado em IP privado**

**No navegador:**
- Clicar em "Avançado" → "Prosseguir para 10.200.0.184 (inseguro)"

**No Android:**
- WebView aceita automaticamente (não mostra erro ao usuário)

---

### Erro: "WebSocket connection failed"

**Verificar:**

```bash
# 1. Servidor está rodando?
curl -k https://10.200.0.184/health

# 2. Porta 443 está acessível?
telnet 10.200.0.184 443

# 3. Mesma rede?
ping 10.200.0.184

# 4. Ver logs
adb logcat | grep -i "websocket\|ssl"
```

---

### Erro: "Connection immediately closed"

**Causa:** Possível problema de handshake SSL

**Solução:**

1. Ver logs detalhados:
```bash
adb logcat *:E | grep -i ssl
```

2. Verificar se certificado do servidor está válido:
```bash
openssl s_client -connect 10.200.0.184:443
```

---

## 🎯 Variáveis de Ambiente (Opcional)

### Desenvolvimento:

```env
# .env.local
VITE_WS_URL=wss://10.200.0.184:443
VITE_WS_PORT=443
```

### Produção:

```env
# .env.production
VITE_WS_URL=wss://ws.industrack.com.br
```

### Múltiplos Ambientes:

```typescript
// src/config/websocket.ts
const WS_URLS = {
  development: 'wss://10.200.0.184:443',
  staging: 'wss://ws-staging.industrack.com.br',
  production: 'wss://ws.industrack.com.br'
};

export const getWebSocketURL = () => {
  const env = import.meta.env.MODE;
  return import.meta.env.VITE_WS_URL || WS_URLS[env] || WS_URLS.development;
};
```

---

## 📋 Checklist de Migração

### Código:
- [x] `websocketConfig.ts` atualizado para WSS ✅
- [x] `websocket-new.ts` config padrão WSS ✅
- [x] Hooks usando configuração dinâmica ✅

### Build:
- [ ] Frontend recompilado (`npm run build`)
- [ ] Android clean build (`./gradlew clean`)
- [ ] App instalado no tablet

### Testes:
- [ ] Teste no navegador desktop
- [ ] Teste no tablet Android
- [ ] Verificar logs (sem erros SSL)
- [ ] Testar comandos WebSocket
- [ ] Verificar reconexão automática

### Documentação:
- [x] `LEIA-ME_PRIMEIRO.md` atualizado ✅
- [x] Este guia criado ✅
- [ ] Equipe notificada da mudança

---

## 🎉 Resultado Esperado

### Antes (WS):
```
❌ Android bloqueava
❌ Precisava configurar XML
❌ Dados não criptografados
❌ Não funciona em produção HTTPS
```

### Agora (WSS):
```
✅ Android aceita automaticamente
✅ Não precisa configurar nada
✅ Dados criptografados
✅ Funciona em qualquer ambiente
```

---

## 💡 Dicas Importantes

1. **Rebuild Completo:** Sempre faça clean build, não apenas rebuild
2. **Cache:** Limpe cache do navegador se testar no desktop
3. **WebView Cache:** Desinstale o app antigo antes de instalar o novo
4. **Logs:** Use `adb logcat` para ver erros detalhados
5. **Diagnóstico:** Use o componente `WebSocketDiagnostic` para debug

---

## 📞 Resumo Final

### ✅ O Que Foi Feito:
1. Backend migrado de WS para WSS
2. Código React atualizado automaticamente
3. Documentação atualizada

### 🚀 O Que Você Precisa Fazer:
1. Rebuild frontend e Android
2. Instalar no tablet
3. Testar

### 🎯 Resultado:
**WebSocket seguro funcionando no Android sem configurações extras!** ✨

---

**Versão:** 1.0  
**Data:** Outubro 2025  
**Status:** ✅ Pronto para uso

