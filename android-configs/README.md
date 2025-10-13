# 📁 Configurações Android para WebSocket

Este diretório contém arquivos de configuração necessários para fazer o WebSocket funcionar em apps Android nativos.

## 📋 Arquivos Incluídos

### 1. `network_security_config.xml`
Arquivo de configuração de segurança de rede que permite conexões cleartext (WS) em Android 9+.

**Como usar:**
```bash
# Copiar para o projeto Android
cp network_security_config.xml android/app/src/main/res/xml/
```

### 2. `AndroidManifest.xml.example`
Exemplo de como configurar o AndroidManifest.xml com as permissões e configurações necessárias.

**Como usar:**
1. Abra seu AndroidManifest.xml
2. Compare com o exemplo
3. Adicione as configurações faltantes

### 3. `capacitor.config.json.example`
Configuração para apps que usam Capacitor.

**Como usar:**
```bash
# Se usar Capacitor, copiar e ajustar
cp capacitor.config.json.example ../capacitor.config.json
```

## 🚀 Passos de Instalação

### Para Cordova:
```bash
# 1. Copiar arquivo de configuração
mkdir -p platforms/android/app/src/main/res/xml/
cp android-configs/network_security_config.xml platforms/android/app/src/main/res/xml/

# 2. Editar AndroidManifest.xml
# Adicionar: android:networkSecurityConfig="@xml/network_security_config"
#           android:usesCleartextTraffic="true"

# 3. Rebuild
cordova clean android
cordova build android
```

### Para Capacitor:
```bash
# 1. Copiar arquivo de configuração
mkdir -p android/app/src/main/res/xml/
cp android-configs/network_security_config.xml android/app/src/main/res/xml/

# 2. Editar AndroidManifest.xml (veja o exemplo)

# 3. Sync e build
npx cap sync android
npx cap open android
# Então Build > Rebuild Project no Android Studio
```

### Para React Native:
```bash
# 1. Copiar arquivo de configuração
mkdir -p android/app/src/main/res/xml/
cp android-configs/network_security_config.xml android/app/src/main/res/xml/

# 2. Editar android/app/src/main/AndroidManifest.xml

# 3. Rebuild
cd android
./gradlew clean
cd ..
npx react-native run-android
```

## ✅ Checklist de Verificação

Após aplicar as configurações:

- [ ] `network_security_config.xml` copiado para `res/xml/`
- [ ] `AndroidManifest.xml` atualizado com:
  - [ ] `android:networkSecurityConfig="@xml/network_security_config"`
  - [ ] `android:usesCleartextTraffic="true"`
  - [ ] Permissão `INTERNET`
  - [ ] Permissão `ACCESS_NETWORK_STATE`
- [ ] App recompilado (clean build)
- [ ] Testado em dispositivo real

## 🧪 Como Testar

1. **Adicione o componente de diagnóstico ao app:**
```tsx
import { WebSocketDiagnostic } from './components/WebSocketDiagnostic';

// Na sua página de Settings ou Debug
<WebSocketDiagnostic />
```

2. **Teste a conexão:**
   - Abra o app no tablet
   - Vá até a tela de diagnóstico
   - Clique em "Testar Conexão"
   - Veja os avisos e recomendações

3. **Verifique os logs (via ADB):**
```bash
# Conectar tablet via USB
adb devices

# Ver logs do WebSocket
adb logcat | grep -i websocket

# Ou logs do Chrome DevTools
chrome://inspect
```

## 🔍 Troubleshooting

### Erro: "Cleartext HTTP traffic not permitted"
**Solução:** Certifique-se que o `network_security_config.xml` está no lugar certo e referenciado no AndroidManifest.

### Erro: "Connection refused"
**Solução:** Verifique se:
- O tablet está na mesma rede
- O IP do servidor está correto
- A porta 8765 está aberta no firewall
- O servidor WebSocket está rodando

### Erro: "Failed to connect to /10.200.0.184:8765"
**Solução:** O IP pode não ser acessível. Tente:
- Verificar conectividade: `ping 10.200.0.184`
- Usar IP da rede local em vez do VPN
- Configurar variável de ambiente VITE_WS_URL

## 📞 Suporte

Para mais informações, consulte:
- `ANDROID_WEBSOCKET_FIX.md` - Guia completo de correção
- `documentacao_ws/websocket-subscriptions.md` - Documentação do WebSocket

## 🔐 Segurança em Produção

⚠️ **IMPORTANTE:** As configurações acima permitem conexões não-criptografadas (WS) e são adequadas apenas para desenvolvimento.

**Para produção:**
1. Use WSS (WebSocket Secure) com certificado SSL
2. Remova `cleartextTrafficPermitted="true"`
3. Configure certificado válido no servidor
4. Atualize a URL para `wss://seu-dominio.com:8765`

