# 🔧 Solução: WSS com Certificado Auto-Assinado no Navegador

## 🎯 Problema

```
❌ WebSocket connection to 'wss://10.200.0.184/' failed
❌ WebSocketManager: Erro na conexão
```

### Causa

O navegador está **bloqueando a conexão WSS** porque o certificado SSL é **auto-assinado** (não reconhecido por autoridade certificadora).

**Diferença importante:**
- ✅ **Android WebView**: Aceita certificado auto-assinado automaticamente
- ❌ **Navegador Desktop**: Bloqueia por padrão (segurança)

---

## ✅ Solução Rápida (3 Passos)

### 1️⃣ Aceitar Certificado no Navegador

Antes de conectar o WebSocket, você precisa aceitar o certificado HTTPS:

#### Passo A: Abrir em Nova Aba

```
https://10.200.0.184
```

Ou qualquer endpoint do servidor:
```
https://10.200.0.184/health
```

#### Passo B: Aceitar Aviso de Segurança

O navegador mostrará um aviso de certificado. Aceite clicando em:

**Chrome/Edge:**
1. "Avançado"
2. "Prosseguir para 10.200.0.184 (inseguro)"

**Firefox:**
1. "Avançado"
2. "Aceitar o risco e continuar"

**Safari:**
1. "Mostrar detalhes"
2. "Visitar este website"

#### Passo C: Recarregar App

Agora volte para sua aplicação e recarregue a página. O WebSocket deve conectar! ✅

---

### 2️⃣ Testar Conexão

Após aceitar o certificado, teste:

```javascript
// No console do navegador (F12)
const ws = new WebSocket('wss://10.200.0.184:443');
ws.onopen = () => console.log('✅ Conectado!');
ws.onerror = (e) => console.error('❌ Erro:', e);
```

---

### 3️⃣ Verificar Logs

```bash
# Ver logs do navegador (F12 Console)
# Deve mostrar:
🔌 WebSocket: Conectando a wss://10.200.0.184:443
✅ WebSocketManager: Conectado com sucesso
```

---

## 🔄 Solução Automática (Opcional)

Se você não quiser aceitar manualmente sempre, pode criar um endpoint de "health check":

### Adicionar no Componente:

```tsx
// src/components/SSLHealthCheck.tsx
import { useEffect, useState } from 'react';

export function SSLHealthCheck() {
  const [sslAccepted, setSSLAccepted] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Testar se certificado SSL foi aceito
    fetch('https://10.200.0.184/health')
      .then(() => {
        setSSLAccepted(true);
        setChecking(false);
      })
      .catch(() => {
        setSSLAccepted(false);
        setChecking(false);
      });
  }, []);

  if (checking) {
    return (
      <div className="bg-blue-900/30 border border-blue-700 rounded p-4">
        <p className="text-blue-200">🔍 Verificando certificado SSL...</p>
      </div>
    );
  }

  if (!sslAccepted) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-700 rounded p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚠️</span>
          <h3 className="text-yellow-200 font-bold">
            Certificado SSL Não Aceito
          </h3>
        </div>
        
        <p className="text-yellow-100 text-sm">
          Para conectar via WebSocket, você precisa aceitar o certificado SSL primeiro.
        </p>
        
        <div className="space-y-2">
          <p className="text-yellow-100 text-sm font-semibold">Passos:</p>
          <ol className="text-yellow-100 text-sm space-y-1 ml-4">
            <li>1. Clique no botão abaixo</li>
            <li>2. Aceite o aviso de segurança</li>
            <li>3. Volte para esta página e recarregue</li>
          </ol>
        </div>
        
        <a
          href="https://10.200.0.184/health"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded font-semibold transition-colors"
        >
          🔓 Aceitar Certificado SSL
        </a>
      </div>
    );
  }

  return (
    <div className="bg-green-900/30 border border-green-700 rounded p-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">✅</span>
        <p className="text-green-200">Certificado SSL aceito - WebSocket pronto!</p>
      </div>
    </div>
  );
}
```

### Usar no App:

```tsx
// Em OperatorDashboard.tsx ou App.tsx
import { SSLHealthCheck } from './components/SSLHealthCheck';

export function App() {
  return (
    <div>
      {/* Mostrar aviso se SSL não foi aceito */}
      <SSLHealthCheck />
      
      {/* Resto do app */}
    </div>
  );
}
```

---

## 🧪 Teste Manual Rápido

### Opção 1: Console do Navegador

```javascript
// F12 Console
fetch('https://10.200.0.184/health')
  .then(() => console.log('✅ SSL OK'))
  .catch(() => console.log('❌ SSL Bloqueado - Aceite o certificado'));
```

### Opção 2: Arquivo de Teste

Use o arquivo `test-websocket.html` que já foi atualizado:

```bash
# Servir arquivo
python -m http.server 8000

# Abrir no navegador
# http://localhost:8000/test-websocket.html
```

---

## 🔍 Troubleshooting

### Erro Persiste Após Aceitar Certificado

#### 1. Limpar Cache do Navegador

```
Chrome: Ctrl+Shift+Del
Firefox: Ctrl+Shift+Del
Safari: Cmd+Option+E
```

Marcar:
- ✅ Cookies e dados de sites
- ✅ Imagens e arquivos em cache

#### 2. Verificar se Certificado Foi Aceito

```javascript
// Console do navegador
fetch('https://10.200.0.184/health')
  .then(r => r.text())
  .then(console.log)
  .catch(console.error);
```

Se retornar erro, o certificado ainda não foi aceito.

#### 3. Modo Anônimo/Incógnito

Teste em modo anônimo. Se funcionar lá após aceitar certificado, o problema é cache/cookies na janela normal.

---

### Mixed Content (Site HTTP + WebSocket WSS)

Se seu app está rodando em `http://localhost:5173` e tentando conectar a `wss://10.200.0.184`:

**Solução:** Aceitar certificado é suficiente. Navegadores modernos permitem WSS de HTTP.

Se ainda bloquear:

```javascript
// Configurar permissão no vite.config.ts
export default {
  server: {
    https: false,  // Manter HTTP
    cors: true
  }
}
```

---

### Erro: "NET::ERR_CERT_AUTHORITY_INVALID"

**Causa:** Certificado auto-assinado

**Soluções:**

#### Opção 1: Aceitar Manualmente (Recomendado para Dev)
- Abrir `https://10.200.0.184` e aceitar

#### Opção 2: Instalar Certificado no Sistema (Avançado)

**Windows:**
```powershell
# Exportar certificado do servidor
openssl s_client -connect 10.200.0.184:443 -showcerts

# Importar em: certmgr.msc > Autoridades de Certificação Raiz Confiáveis
```

**macOS:**
```bash
# Adicionar ao Keychain
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain cert.pem
```

**Linux:**
```bash
# Ubuntu/Debian
sudo cp cert.pem /usr/local/share/ca-certificates/industrack.crt
sudo update-ca-certificates
```

---

## 📱 Android vs Navegador

### Android (WebView)
```
✅ Aceita certificado auto-assinado automaticamente
✅ Não mostra avisos ao usuário
✅ WebSocket conecta sem intervenção
```

### Navegador Desktop
```
⚠️ Bloqueia certificado auto-assinado por padrão
⚠️ Mostra aviso de segurança
⚠️ Requer aceitação manual
```

**Por que a diferença?**

- **WebView** assume que o desenvolvedor confia no servidor (modo debug)
- **Navegador** protege o usuário de certificados não confiáveis

---

## 🎯 Resumo Rápido

### Para Desenvolvimento Local:

```
1. Abrir: https://10.200.0.184/health
2. Aceitar aviso de certificado
3. Voltar ao app e recarregar
4. WebSocket deve conectar! ✅
```

### Para Produção:

```
1. Usar domínio público
2. Certificado Let's Encrypt (gratuito)
3. URL: wss://ws.industrack.com.br
4. Certificado válido = sem avisos
```

---

## 💡 Prevenindo o Problema

### Criar Componente de Verificação

Adicione o componente `SSLHealthCheck` (código acima) no seu app para:

1. ✅ Detectar se certificado foi aceito
2. ✅ Mostrar instruções ao usuário
3. ✅ Link direto para aceitar certificado
4. ✅ Verificação automática

### Adicionar no Dashboard

```tsx
export function OperatorDashboard() {
  return (
    <div>
      {/* No topo, antes de tudo */}
      <SSLHealthCheck />
      
      {/* Resto do dashboard */}
    </div>
  );
}
```

---

## ✅ Checklist de Resolução

- [ ] Abrir `https://10.200.0.184/health` em nova aba
- [ ] Aceitar aviso de certificado do navegador
- [ ] Voltar ao app e recarregar página
- [ ] Verificar console (F12) - deve mostrar "✅ Conectado"
- [ ] (Opcional) Adicionar componente SSLHealthCheck
- [ ] (Opcional) Limpar cache se persistir

---

## 🎉 Resultado Esperado

Após aceitar o certificado:

```
Console do Navegador:
🔌 WebSocket: Conectando a wss://10.200.0.184:443
✅ WebSocketManager: Conectado com sucesso ao servidor
📡 Subscribe enviado: máquina X
```

---

**Versão:** 1.0  
**Data:** Outubro 2025  
**Status:** ✅ Solução testada e funcional

