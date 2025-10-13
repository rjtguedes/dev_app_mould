# 🚀 Guia Rápido: Corrigir WebSocket no Android

## 🎯 Problema

✅ **WebSocket funciona na máquina de desenvolvimento**  
❌ **WebSocket NÃO funciona no tablet Android nativo**

## 🔍 Causa Principal

O Android 9+ **bloqueia por padrão** conexões `ws://` (cleartext) em apps nativos por segurança. Você precisa configurar explicitamente para permitir essas conexões.

## ⚡ Solução Rápida (5 Passos)

### 1️⃣ Copiar Arquivo de Configuração

```bash
# Criar diretório (se não existir)
mkdir -p android/app/src/main/res/xml/

# Copiar configuração de segurança
cp android-configs/network_security_config.xml android/app/src/main/res/xml/
```

### 2️⃣ Editar AndroidManifest.xml

**Localização:** `android/app/src/main/AndroidManifest.xml`

Adicione dentro da tag `<application>`:

```xml
<application
    ...
    android:networkSecurityConfig="@xml/network_security_config"
    android:usesCleartextTraffic="true">
```

### 3️⃣ Verificar Permissões

Certifique-se que estas permissões estão no AndroidManifest.xml:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
```

### 4️⃣ Recompilar App

```bash
# Limpar build anterior
cd android
./gradlew clean
cd ..

# Rebuild completo
# Para Cordova:
cordova build android

# Para Capacitor:
npx cap sync android
npx cap open android
# Então: Build > Rebuild Project

# Para React Native:
npx react-native run-android
```

### 5️⃣ Testar

Instale o app no tablet e teste a conexão WebSocket.

---

## 🧪 Como Debugar

### Opção 1: Componente de Diagnóstico Visual

Adicione o componente de diagnóstico ao app para ver informações em tempo real:

```tsx
// Em src/pages/Settings.tsx (ou onde preferir)
import { WebSocketDiagnostic } from '../components/WebSocketDiagnostic';

export function Settings() {
  return (
    <div>
      {/* Seus componentes existentes */}
      
      {/* Adicionar diagnóstico */}
      <WebSocketDiagnostic />
    </div>
  );
}
```

O componente mostra:
- ✅ URL do WebSocket
- ✅ Informações do dispositivo
- ✅ Avisos e recomendações
- ✅ Botão de teste de conexão
- ✅ Soluções específicas para Android

### Opção 2: Ver Logs via ADB

```bash
# Conectar tablet via USB
adb devices

# Ver logs do WebSocket
adb logcat | grep -i websocket

# Ver todos os erros
adb logcat *:E

# Limpar logs e começar de novo
adb logcat -c && adb logcat
```

### Opção 3: Chrome DevTools

1. No computador, abra Chrome
2. Acesse: `chrome://inspect`
3. Conecte o tablet via USB
4. Habilite "USB Debugging" no tablet
5. Inspecione o app e veja o console

---

## 📊 Fluxograma de Diagnóstico

```
App não conecta no Android?
    ↓
1. IP está correto e acessível?
   → Não: Ajuste o IP ou use variável de ambiente
   → Sim: Continuar
    ↓
2. Está na mesma rede?
   → Não: Conecte na mesma rede WiFi
   → Sim: Continuar
    ↓
3. Configurou network_security_config.xml?
   → Não: APLICAR SOLUÇÃO RÁPIDA ACIMA
   → Sim: Continuar
    ↓
4. Recompilou o app após mudanças?
   → Não: Fazer clean build
   → Sim: Continuar
    ↓
5. Servidor WebSocket está rodando?
   → Não: Iniciar servidor
   → Sim: Verificar logs com ADB
```

---

## 🔧 Configuração Avançada: IP Dinâmico

O código agora detecta automaticamente o melhor IP. Para personalizar:

### Criar arquivo `.env.local`:

```env
# Para desenvolvimento local
VITE_WS_URL=ws://localhost:8765

# Para rede local
VITE_WS_URL=ws://192.168.1.100:8765

# Para VPN (atual)
VITE_WS_URL=ws://10.200.0.184:8765

# Para produção com SSL
VITE_WS_URL=wss://seu-dominio.com:8765
```

### Rebuild após criar .env:

```bash
npm run build
# Então recompilar o app Android
```

---

## 📝 Checklist Final

Antes de testar, confirme:

- [ ] Arquivo `network_security_config.xml` em `android/app/src/main/res/xml/`
- [ ] `AndroidManifest.xml` atualizado com `networkSecurityConfig`
- [ ] `AndroidManifest.xml` tem `usesCleartextTraffic="true"`
- [ ] Permissões de INTERNET adicionadas
- [ ] App recompilado com clean build
- [ ] Tablet conectado na mesma rede do servidor
- [ ] IP do servidor está correto e acessível
- [ ] Servidor WebSocket está rodando na porta 8765

---

## ⚠️ Ainda Não Funciona?

### Teste Manual da Conectividade:

```bash
# No tablet Android (usando Termux ou similar)
# Ou via ADB shell
adb shell

# Testar se IP é acessível
ping 10.200.0.184

# Testar se porta está aberta
telnet 10.200.0.184 8765
# ou
nc -zv 10.200.0.184 8765
```

Se o ping/telnet **falhar**, o problema é de **rede**, não de configuração do app:

1. ✅ Confirme que tablet e servidor estão na mesma rede
2. ✅ Verifique firewall no servidor (porta 8765 aberta)
3. ✅ Teste com IP da rede local em vez do VPN
4. ✅ Verifique se VPN está ativa no tablet (se usar IP VPN)

---

## 🎯 Solução para Produção

Para ambiente de produção, **NÃO use WS cleartext**. Use WSS com SSL:

1. Configure certificado SSL no servidor WebSocket
2. Mude URL para `wss://` (WebSocket Secure)
3. Remova `usesCleartextTraffic` do AndroidManifest
4. Não precisa de `network_security_config.xml` para WSS

---

## 📞 Arquivos de Referência

- `ANDROID_WEBSOCKET_FIX.md` - Guia completo detalhado
- `android-configs/` - Todos os arquivos de configuração
- `src/lib/websocketConfig.ts` - Lógica de detecção de IP
- `src/components/WebSocketDiagnostic.tsx` - Componente de diagnóstico

---

## 💡 Dica Extra

Se o problema persistir, adicione logs detalhados:

```tsx
// Em useWebSocket.ts ou useWebSocketManager.ts
console.log('🌐 User Agent:', navigator.userAgent);
console.log('🔒 Protocolo:', window.location.protocol);
console.log('📡 Tentando conectar a:', WS_URL);
```

Esses logs aparecerão no Chrome DevTools quando você inspecionar o app.

---

**✅ Após seguir estes passos, o WebSocket deve funcionar no tablet Android!**

