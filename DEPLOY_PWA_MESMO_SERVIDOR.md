# 🚀 Deploy PWA no Mesmo Servidor do WebSocket

## 🎯 Objetivo

Hospedar o site React (PWA) no **mesmo servidor** que o WebSocket para resolver o problema de certificado auto-assinado.

---

## ✅ Vantagens Desta Solução

```
SITE E WEBSOCKET NO MESMO DOMÍNIO:
✅ Mesmo certificado SSL para ambos
✅ Sem problemas de Cross-Origin
✅ PWA funciona perfeitamente
✅ Não precisa aceitar certificado manualmente
✅ WebSocket conecta automaticamente
```

---

## 📋 Pré-requisitos

- ✅ Servidor já tem WebSocket rodando em `10.200.0.184:8765`
- ✅ Nginx já configurado para SSL (porta 443)
- ✅ Acesso SSH ao servidor

---

## 🚀 Passo a Passo

### 1️⃣ Build do Frontend

```bash
# Na máquina de desenvolvimento
cd /Users/ruanjguedes/ihm_mould

# Build production
npm run build

# Será criada pasta dist/ com os arquivos
```

### 2️⃣ Copiar Arquivos para Servidor

```bash
# Opção A: Via SCP (SSH)
scp -r dist/ user@10.200.0.184:/var/www/industrack-pwa/

# Opção B: Via rsync (mais eficiente)
rsync -avz --delete dist/ user@10.200.0.184:/var/www/industrack-pwa/dist/

# Opção C: Copiar manualmente (se tiver acesso direto)
```

### 3️⃣ Configurar Nginx

#### A. Copiar Configuração

```bash
# No servidor (10.200.0.184)
ssh user@10.200.0.184

# Criar diretório web (se não existir)
sudo mkdir -p /var/www/industrack-pwa/dist

# Copiar configuração Nginx
sudo nano /etc/nginx/sites-available/industrack-pwa
```

#### B. Colar Configuração

Cole o conteúdo do arquivo `nginx-pwa-config.conf` (já criado).

#### C. Ativar Site

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/industrack-pwa /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Se OK, recarregar Nginx
sudo systemctl reload nginx
```

### 4️⃣ Ajustar Permissões

```bash
# No servidor
sudo chown -R www-data:www-data /var/www/industrack-pwa
sudo chmod -R 755 /var/www/industrack-pwa
```

### 5️⃣ Atualizar Backend WebSocket

O backend precisa aceitar conexões de `/ws`:

```python
# No código do WebSocket server
# Ajustar para aceitar path /ws

# Se usar Python websockets:
async def main():
    async with websockets.serve(
        handler,
        "localhost",  # ← Só aceitar de localhost (Nginx faz proxy)
        8765,
        # path="/ws"  # ← Se biblioteca suportar
    ):
        await asyncio.Future()
```

**Importante:** O WebSocket continua na porta 8765, mas agora o Nginx faz proxy de `https://10.200.0.184/ws` para `http://localhost:8765`.

---

## 🧪 Testar

### 1. Verificar Site

```bash
# Abrir no navegador do tablet:
https://10.200.0.184

# Deve carregar o app React
```

### 2. Verificar WebSocket

```javascript
// Console do navegador (F12)
const ws = new WebSocket('wss://10.200.0.184/ws');
ws.onopen = () => console.log('✅ WebSocket conectado!');
ws.onerror = (e) => console.error('❌ Erro:', e);
```

### 3. Instalar PWA

```
1. Abrir site no Chrome do tablet
2. Aceitar certificado (uma vez)
3. Menu → "Adicionar à tela inicial"
4. Abrir PWA instalado
5. WebSocket deve conectar automaticamente! ✅
```

---

## 🔧 Troubleshooting

### Erro: "502 Bad Gateway" no /ws

**Causa:** Nginx não consegue conectar ao WebSocket na porta 8765

**Solução:**

```bash
# Verificar se WebSocket está rodando
sudo lsof -i :8765

# Verificar logs do Nginx
sudo tail -f /var/log/nginx/industrack-pwa-error.log

# Verificar logs do WebSocket
# (depende de como você roda o server)
```

### Erro: "404 Not Found" na raiz

**Causa:** Arquivos não foram copiados corretamente

**Solução:**

```bash
# Verificar se arquivos existem
ls -la /var/www/industrack-pwa/dist/

# Deve ter index.html, assets/, etc.
```

### WebSocket ainda não conecta

**Causa:** Código ainda está tentando conectar na porta 443 direta

**Solução:**

O código já foi atualizado para detectar e usar `/ws` quando no mesmo domínio.

Verificar console do navegador:

```
Deve mostrar:
🔌 WebSocket: Usando mesmo domínio do site (PWA-friendly): wss://10.200.0.184/ws
```

Se não mostrar, limpar cache e recarregar.

---

## 📊 Arquitetura Resultante

```
┌─────────────────────────────────────────────────────┐
│ ANTES (Não Funcionava)                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Site Online                                         │
│ https://outro-dominio.com                           │
│       ↓                                             │
│ PWA Instalado                                       │
│       ↓                                             │
│ Tentando conectar:                                  │
│ wss://10.200.0.184:443 ❌                          │
│ (Certificado auto-assinado bloqueado)              │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ AGORA (Funciona!)                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Tablet → https://10.200.0.184                       │
│             ↓                                       │
│      ┌──────────────┐                              │
│      │ Nginx (443)  │                              │
│      └──────────────┘                              │
│          ↓        ↓                                 │
│    Site React   WebSocket Proxy                    │
│    (/)          (/ws)                               │
│                    ↓                                │
│              WS Server (8765)                       │
│                                                     │
│ ✅ Mesmo certificado para tudo                     │
│ ✅ Mesmo domínio                                    │
│ ✅ PWA funciona!                                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Deploy Contínuo (Opcional)

Criar script para automatizar deploy:

```bash
# deploy.sh
#!/bin/bash

echo "🚀 Deploy PWA Industrack"

# Build
echo "📦 Building..."
npm run build

# Sync
echo "📤 Uploading..."
rsync -avz --delete dist/ user@10.200.0.184:/var/www/industrack-pwa/dist/

# Restart (se necessário)
echo "🔄 Reloading Nginx..."
ssh user@10.200.0.184 'sudo systemctl reload nginx'

echo "✅ Deploy completo!"
echo "🌐 Acesse: https://10.200.0.184"
```

Usar:

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## ✅ Checklist de Deploy

### Preparação:
- [ ] Build executado (`npm run build`)
- [ ] Pasta `dist/` gerada com sucesso
- [ ] Acesso SSH ao servidor disponível

### No Servidor:
- [ ] Pasta `/var/www/industrack-pwa/dist/` criada
- [ ] Arquivos copiados para servidor
- [ ] Permissões ajustadas (www-data)
- [ ] Nginx configurado (`sites-available/industrack-pwa`)
- [ ] Link simbólico criado (`sites-enabled/`)
- [ ] Nginx testado (`nginx -t`)
- [ ] Nginx recarregado (`systemctl reload nginx`)

### Testes:
- [ ] Site carrega em `https://10.200.0.184`
- [ ] WebSocket conecta via `/ws`
- [ ] Console mostra URL correta
- [ ] PWA pode ser instalado
- [ ] PWA instalado conecta WebSocket

---

## 🎯 Resultado Esperado

Após deploy completo:

```
1. Tablet acessa: https://10.200.0.184
2. Aceita certificado (uma vez)
3. Instala PWA
4. PWA conecta WebSocket via wss://10.200.0.184/ws
5. Tudo funciona! ✅
```

Console mostrará:

```
🔌 WebSocket: Usando mesmo domínio do site (PWA-friendly): wss://10.200.0.184/ws
✅ WebSocketManager: Conectado com sucesso ao servidor
```

---

## 📚 Arquivos de Referência

- `nginx-pwa-config.conf` - Configuração Nginx completa
- `SOLUCAO_PWA_WEBSOCKET.md` - Explicação do problema PWA
- `src/lib/websocketConfig.ts` - Código atualizado (detecta mesmo domínio)

---

**🎉 Pronto! Site e WebSocket no mesmo domínio = PWA funcionando perfeitamente!**

