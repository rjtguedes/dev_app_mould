# 🔧 Guia de Correção: WebSocket em App Android Nativo

## 📋 Problema Identificado

O WebSocket funciona no navegador mas **não conecta no app nativo Android**, mesmo estando na mesma rede.

### ⚠️ Causas Principais:

1. **Cleartext Traffic Bloqueado**: Android 9+ bloqueia conexões `ws://` (não criptografadas) por padrão
2. **IP Hardcoded**: O IP `10.200.0.184` pode não ser acessível do tablet
3. **Falta de Configuração Android**: Sem permissões ou configurações de rede

---

## ✅ Soluções (Escolha UMA das opções)

### 🎯 OPÇÃO 1: Configurar Network Security (Recomendado para Desenvolvimento)

Se você está usando **Cordova, Capacitor ou WebView**, precisa criar um arquivo de configuração:

#### Passo 1: Criar `network_security_config.xml`

**Localização**: `android/app/src/main/res/xml/network_security_config.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Permitir cleartext (ws://) para desenvolvimento -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">10.200.0.184</domain>
        <domain includeSubdomains="true">192.168.1.0/24</domain>
        <domain includeSubdomains="true">localhost</domain>
    </domain-config>
    
    <!-- Para produção, usar apenas WSS (wss://) -->
    <base-config cleartextTrafficPermitted="false" />
</network-security-config>
```

#### Passo 2: Atualizar `AndroidManifest.xml`

**Localização**: `android/app/src/main/AndroidManifest.xml`

Adicionar dentro da tag `<application>`:

```xml
<application
    ...
    android:networkSecurityConfig="@xml/network_security_config"
    android:usesCleartextTraffic="true">
    
    <!-- Resto da configuração -->
</application>
```

#### Passo 3: Verificar Permissões

Certifique-se que tem essas permissões no `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
```

---

### 🎯 OPÇÃO 2: Usar WSS (WebSocket Secure) - RECOMENDADO PARA PRODUÇÃO

Se você tem acesso ao servidor, **configure SSL/TLS** no servidor WebSocket:

#### No Servidor (Backend):
```python
# Usar WSS em vez de WS
# Requer certificado SSL
wss://10.200.0.184:8765
```

#### No Frontend:
```typescript
// Mudar de ws:// para wss://
const WS_URL = 'wss://10.200.0.184:8765';
```

**Vantagens**:
- ✅ Seguro
- ✅ Funciona em todos os Android sem configuração extra
- ✅ Melhor prática para produção

---

### 🎯 OPÇÃO 3: IP Dinâmico com Variável de Ambiente

#### Passo 1: Criar `.env.production`

```env
VITE_WS_URL=ws://SEU_IP_AQUI:8765
```

#### Passo 2: Usar IP Local Automaticamente

Modificar o código para detectar o IP automaticamente:

```typescript
// src/hooks/useWebSocket.ts
const getWebSocketURL = () => {
  // Se tem variável de ambiente, usar ela
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  
  // Detectar IP local
  const hostname = window.location.hostname;
  
  // Se for localhost, usar IP VPN
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'ws://10.200.0.184:8765';
  }
  
  // Se for rede local, usar o mesmo IP do host
  return `ws://${hostname}:8765`;
};

const WS_URL = getWebSocketURL();
```

---

### 🎯 OPÇÃO 4: Configuração Universal (Capacitor)

Se estiver usando **Capacitor**, adicionar no `capacitor.config.json`:

```json
{
  "server": {
    "cleartext": true,
    "allowNavigation": [
      "10.200.0.184",
      "192.168.*",
      "localhost"
    ]
  }
}
```

---

## 🧪 Como Testar

### 1. Verificar se o IP é Acessível do Tablet

No tablet Android, abrir o navegador e acessar:
```
http://10.200.0.184:8765
```

Se **não carregar**, o problema é de **rede/firewall**, não do código.

### 2. Testar Porta com App

Instalar um app de teste de rede (ex: "Network Analyzer") e verificar se a porta 8765 está acessível.

### 3. Ver Logs do Android (Usando ADB)

```bash
# Conectar tablet via USB
adb logcat | grep -i websocket
```

Isso mostrará os erros exatos do Android.

---

## 🔍 Diagnóstico Rápido

| Sintoma | Causa Provável | Solução |
|---------|---------------|---------|
| Conexão recusada | IP não acessível | Verificar IP/rede |
| Cleartext not permitted | Android bloqueando WS | Usar WSS ou network_security_config |
| Timeout | Firewall bloqueando | Abrir porta 8765 |
| ERR_CONNECTION_REFUSED | Servidor não rodando | Verificar backend |

---

## 🚀 Recomendação Final

**Para Desenvolvimento Rápido**:
1. Adicionar `network_security_config.xml` (Opção 1)
2. Permitir cleartext para IPs locais

**Para Produção**:
1. Usar WSS com certificado SSL (Opção 2)
2. Configurar reverse proxy com Nginx/Traefik

---

## 📞 Próximos Passos

1. **Identificar qual wrapper você está usando** (Cordova, Capacitor, PWA, etc.)
2. **Aplicar a configuração apropriada**
3. **Recompilar o app Android**
4. **Testar novamente**

Se precisar de ajuda com qualquer uma dessas etapas, me avise! 🚀

