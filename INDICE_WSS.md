# 📚 Índice de Documentação - WSS (Atualizado)

## 🎯 COMECE AQUI! (WSS)

### ✅ Backend Migrado para WSS
O servidor WebSocket agora usa **WSS (WebSocket Secure)** com SSL/TLS.

**URL:** `wss://10.200.0.184:443`

---

## 📖 Guias por Ordem de Leitura

### 1. 📘 [LEIA-ME_PRIMEIRO.md](./LEIA-ME_PRIMEIRO.md) ⭐
**INÍCIO!** Guia principal atualizado para WSS.
- ✅ Backend migrado para WSS
- ✅ Código já atualizado
- 🚀 Como recompilar e testar
- ⚠️ Certificado auto-assinado

### 2. 📗 [GUIA_WSS_ATUALIZADO.md](./GUIA_WSS_ATUALIZADO.md)
Guia completo sobre WSS.
- 📊 Mudanças detalhadas
- ✅ Vantagens do WSS
- 🔧 Como configurar (se necessário)
- 🧪 Testes e validação
- 🔍 Troubleshooting SSL

### 3. 📋 [MIGRACAO_WSS_RESUMO.md](./MIGRACAO_WSS_RESUMO.md)
Resumo da migração WS → WSS.
- 🔄 O que mudou
- ✅ Benefícios
- 📝 Checklist de validação
- 📊 Métricas de sucesso

### 4. 🔧 [SOLUCAO_WSS_NAVEGADOR.md](./SOLUCAO_WSS_NAVEGADOR.md) ⚠️ IMPORTANTE
Solução para erro de certificado no navegador.
- ❌ Erro: "WebSocket connection failed"
- ✅ Como aceitar certificado SSL
- 💡 Componente automático SSLHealthCheck
- 🔍 Troubleshooting completo

---

## 🔧 Documentação Técnica

### Código Atualizado:
- [`src/lib/websocketConfig.ts`](./src/lib/websocketConfig.ts) - Config WSS
- [`src/types/websocket-new.ts`](./src/types/websocket-new.ts) - Types WSS
- [`test-websocket.html`](./test-websocket.html) - Teste WSS

### Componentes:
- [`src/components/WebSocketDiagnostic.tsx`](./src/components/WebSocketDiagnostic.tsx) - Diagnóstico
- [`src/components/SSLHealthCheck.tsx`](./src/components/SSLHealthCheck.tsx) - ⭐ Verificação SSL

---

## ⚠️ Documentação Legada (WS Cleartext)

Os seguintes guias foram criados para **WS (cleartext)** e agora estão **obsoletos** com a migração para WSS:

### ❌ Não Mais Necessários:
- `ANDROID_WEBSOCKET_FIX.md` - Soluções para WS cleartext
- `GUIA_RAPIDO_ANDROID.md` - Configuração Android para WS
- `android-configs/network_security_config.xml` - Config cleartext
- `android-configs/AndroidManifest.xml.example` - Manifest para WS

**Por que obsoletos?**
- WSS funciona nativamente no Android 9+
- Não precisa `network_security_config.xml`
- Não precisa `usesCleartextTraffic`
- Configurações simplificadas

**Mantidos para:**
- Referência histórica
- Entendimento do problema original
- Casos edge de fallback para WS

---

## 📚 Ainda Relevantes:

### Conceitos Gerais:
- [`DIAGNOSTICO_VISUAL.md`](./DIAGNOSTICO_VISUAL.md) - Fluxogramas
- [`RESUMO_ALTERACOES.md`](./RESUMO_ALTERACOES.md) - Histórico
- [`EXEMPLO_INTEGRACAO_DIAGNOSTICO.md`](./EXEMPLO_INTEGRACAO_DIAGNOSTICO.md) - Como usar diagnóstico

---

## 🚀 Guia Rápido (3 Passos)

```bash
# 1. Rebuild Frontend
npm run build

# 2. Rebuild Android (clean)
cd android && ./gradlew clean && cd ..
cordova build android  # ou Capacitor/React Native

# 3. Testar
adb logcat | grep -i websocket
```

---

## 🎯 Navegação Rápida

### Se você quer...

#### 🚀 Usar WSS agora
1. [LEIA-ME_PRIMEIRO.md](./LEIA-ME_PRIMEIRO.md)
2. Recompilar app
3. Testar

#### 📚 Entender WSS em detalhes
1. [GUIA_WSS_ATUALIZADO.md](./GUIA_WSS_ATUALIZADO.md)
2. [MIGRACAO_WSS_RESUMO.md](./MIGRACAO_WSS_RESUMO.md)

#### 🔍 Resolver problemas SSL
1. [GUIA_WSS_ATUALIZADO.md > Troubleshooting](./GUIA_WSS_ATUALIZADO.md#-troubleshooting)
2. [LEIA-ME_PRIMEIRO.md > Certificado Auto-Assinado](./LEIA-ME_PRIMEIRO.md#-certificado-auto-assinado-no-android)

#### 💻 Ver o que mudou no código
1. [`src/lib/websocketConfig.ts`](./src/lib/websocketConfig.ts)
2. [MIGRACAO_WSS_RESUMO.md](./MIGRACAO_WSS_RESUMO.md)

#### 🧪 Testar conexão
1. [`test-websocket.html`](./test-websocket.html)
2. [`src/components/WebSocketDiagnostic.tsx`](./src/components/WebSocketDiagnostic.tsx)

---

## 📊 Estrutura Atualizada

```
ihm_mould/
│
├── 📘 LEIA-ME_PRIMEIRO.md                ← COMECE AQUI (WSS)
├── 📗 GUIA_WSS_ATUALIZADO.md             ← Guia completo WSS
├── 📋 MIGRACAO_WSS_RESUMO.md             ← Resumo migração
├── 📚 INDICE_WSS.md                      ← Este arquivo
│
├── 🧪 test-websocket.html                ← Teste WSS
│
├── src/
│   ├── lib/
│   │   └── websocketConfig.ts            ← Config WSS ✅
│   │
│   ├── components/
│   │   └── WebSocketDiagnostic.tsx       ← Diagnóstico
│   │
│   ├── types/
│   │   └── websocket-new.ts              ← Types WSS ✅
│   │
│   └── hooks/
│       ├── useWebSocket.ts               ← Usa config WSS
│       └── useWebSocketManager.ts        ← Usa config WSS
│
└── [LEGADO - WS Cleartext]
    ├── ANDROID_WEBSOCKET_FIX.md          ← Obsoleto
    ├── GUIA_RAPIDO_ANDROID.md            ← Obsoleto
    ├── android-configs/                   ← Obsoleto
    ├── DIAGNOSTICO_VISUAL.md             ← Conceitos gerais
    ├── RESUMO_ALTERACOES.md              ← Histórico
    └── EXEMPLO_INTEGRACAO_DIAGNOSTICO.md ← Ainda útil
```

---

## ✅ Checklist de Uso

### Primeira Vez:
- [ ] Ler [LEIA-ME_PRIMEIRO.md](./LEIA-ME_PRIMEIRO.md)
- [ ] Entender mudança WS → WSS
- [ ] Rebuild frontend (`npm run build`)
- [ ] Rebuild Android (clean build)
- [ ] Instalar no tablet
- [ ] Testar conexão

### Debug:
- [ ] Ver logs: `adb logcat | grep -i websocket`
- [ ] Usar [test-websocket.html](./test-websocket.html)
- [ ] Adicionar `<WebSocketDiagnostic />` no app
- [ ] Consultar [troubleshooting](./GUIA_WSS_ATUALIZADO.md#-troubleshooting)

### Produção:
- [ ] Domínio público configurado
- [ ] Certificado Let's Encrypt
- [ ] URL: `wss://ws.industrack.com.br`
- [ ] Monitoramento ativo

---

## 💡 Perguntas Frequentes

### "Preciso configurar network_security_config.xml?"
**Não!** WSS é permitido por padrão no Android.

### "Preciso de usesCleartextTraffic?"
**Não!** WSS é criptografado, não é cleartext.

### "Erro de certificado SSL?"
**Normal** para IP privado com certificado auto-assinado.  
Ver: [Certificado Auto-Assinado](./LEIA-ME_PRIMEIRO.md#-certificado-auto-assinado-no-android)

### "Posso usar senha com WSS?"
**Sim!** WSS (criptografia) + token (autenticação) = ideal.

### "Como migrar para produção?"
Use domínio com Let's Encrypt. Ver: [Produção](./GUIA_WSS_ATUALIZADO.md#-segurança-desenvolvimento-vs-produção)

---

## 📞 Suporte

### Problema com WSS:
1. [LEIA-ME_PRIMEIRO.md](./LEIA-ME_PRIMEIRO.md)
2. [GUIA_WSS_ATUALIZADO.md](./GUIA_WSS_ATUALIZADO.md)
3. Logs: `adb logcat | grep -i "websocket\|ssl"`

### Entender migração:
1. [MIGRACAO_WSS_RESUMO.md](./MIGRACAO_WSS_RESUMO.md)

### Referência histórica:
1. `RESUMO_ALTERACOES.md` - Mudanças antigas
2. `android-configs/` - Configs WS (legado)

---

## 🎉 Resumo

### ✅ WSS Resolveu Tudo:
- Android funciona sem configuração
- Dados criptografados (seguro)
- Pronto para produção
- Simplificou o código

### 🚀 Próximo Passo:
Abra [LEIA-ME_PRIMEIRO.md](./LEIA-ME_PRIMEIRO.md) e siga os passos!

---

**Versão:** 2.0 - WSS  
**Última Atualização:** Migração WS → WSS completa  
**Status:** ✅ Pronto para uso

