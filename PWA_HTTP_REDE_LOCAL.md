# 🌐 **PWA EM HTTP NA REDE LOCAL - CONFIGURAÇÃO E MELHORIAS**

## 📊 **Situação Atual**

- ✅ PWA rodando em HTTP na rede local
- ⚠️ Wake Lock API não funciona (requer HTTPS)
- ✅ Fallback com vídeo/áudio funciona após interação do usuário

---

## 🔧 **Soluções Implementadas**

### 1. Sistema de Fallback em 3 Camadas

O hook `useWakeLock` agora usa uma abordagem progressiva:

1. **Wake Lock API** (não funciona em HTTP)
2. **Vídeo MP4 invisível** (fallback principal)
3. **Áudio MP3 silencioso** (último recurso)

**Logs esperados no console:**
```
🔒 Inicializando sistema de Wake Lock...
⚠️ Wake Lock API não suportada neste navegador
ℹ️ PWA em HTTP - usando fallback automático
⏸️ Aguardando interação do usuário para ativar fallback...
👆 Primeira interação detectada
🎥 Ativando fallback com vídeo invisível...
✅ Vídeo fallback ativado - tela permanecerá ligada
```

---

## 🎯 **Recomendações para Produção**

### Opção 1: Adicionar HTTPS (Recomendado)

Para ativar Wake Lock API nativa e melhorar a segurança:

#### A) Usando Certificado Auto-Assinado (desenvolvimento)

```bash
# Gerar certificado SSL auto-assinado
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# No nginx.conf
server {
    listen 443 ssl;
    server_name seu-ip-local;
    
    ssl_certificate /caminho/para/cert.pem;
    ssl_certificate_key /caminho/para/key.pem;
    
    location / {
        root /var/www/pwa;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

**⚠️ Importante**: Tablets precisarão confiar no certificado auto-assinado.

#### B) Usando mDNS/Bonjour (mais fácil)

Se seu servidor suportar mDNS:

```bash
# Acesse via .local ao invés de IP
# Exemplo: http://servidor-pwa.local
# Alguns navegadores tratam .local como contexto seguro
```

#### C) Usando Let's Encrypt + DuckDNS

Para produção real com domínio:

```bash
# 1. Registrar domínio em DuckDNS ou No-IP
# 2. Configurar port forwarding no roteador
# 3. Usar Certbot para Let's Encrypt

sudo certbot --nginx -d seu-dominio.duckdns.org
```

---

### Opção 2: Usar como `localhost` (mais simples)

Se o servidor rodar no mesmo dispositivo que o navegador:

```bash
# Acesse via localhost ao invés do IP
http://localhost:3000  # Wake Lock funciona!
http://127.0.0.1:3000  # Wake Lock funciona!
```

**Limitação**: Só funciona no dispositivo que hospeda o servidor.

---

### Opção 3: Aceitar Fallback (solução atual)

Se HTTPS não for viável, o sistema atual funciona bem:

✅ **Vantagens:**
- Funciona em HTTP
- Compatível com qualquer navegador
- Não requer configuração extra

⚠️ **Limitações:**
- Requer interação do usuário primeiro
- Consome um pouco mais de recursos
- Não é tão eficiente quanto Wake Lock nativo

---

## 📱 **Configuração Nginx para PWA (HTTPS)**

Baseado no arquivo `nginx-pwa-config.conf` do projeto:

```nginx
server {
    listen 80;
    server_name seu-ip-ou-dominio;
    
    # Redirecionar HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-ip-ou-dominio;
    
    # Certificados SSL
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    
    # Headers de segurança
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    
    # PWA
    root /var/www/pwa/dist;
    index index.html;
    
    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Service Worker não deve ser cacheado
    location /service-worker.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        expires 0;
    }
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy (se necessário)
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔍 **Como Verificar se Wake Lock Está Funcionando**

### No Console do Navegador:

```javascript
// Verificar suporte
console.log('Wake Lock suportado?', 'wakeLock' in navigator);

// Verificar se é contexto seguro (HTTPS ou localhost)
console.log('Contexto seguro?', window.isSecureContext);

// Tentar usar Wake Lock
if ('wakeLock' in navigator && window.isSecureContext) {
    navigator.wakeLock.request('screen')
        .then(() => console.log('✅ Wake Lock funcionou!'))
        .catch(err => console.error('❌ Erro:', err));
}
```

---

## 📊 **Comparação: HTTP vs HTTPS**

| Recurso | HTTP (Atual) | HTTPS (Recomendado) |
|---------|--------------|---------------------|
| Wake Lock API | ❌ Não funciona | ✅ Funciona |
| Fallback vídeo/áudio | ✅ Funciona | ✅ Funciona |
| Geolocalização | ⚠️ Limitada | ✅ Total |
| Service Worker | ⚠️ Apenas localhost | ✅ Funciona |
| Push Notifications | ❌ Não funciona | ✅ Funciona |
| Câmera/Microfone | ❌ Não funciona | ✅ Funciona |
| PWA Instalável | ⚠️ Limitado | ✅ Total |

---

## 🛠️ **Script Rápido para Gerar Certificado SSL**

Crie um arquivo `setup-ssl.sh`:

```bash
#!/bin/bash

echo "🔐 Gerando certificado SSL auto-assinado..."

# Criar diretório
mkdir -p ssl

# Gerar certificado
openssl req -x509 -newkey rsa:4096 \
    -keyout ssl/key.pem \
    -out ssl/cert.pem \
    -days 365 -nodes \
    -subj "/C=BR/ST=Estado/L=Cidade/O=Empresa/CN=192.168.1.100"

echo "✅ Certificado gerado em ./ssl/"
echo ""
echo "📋 Próximos passos:"
echo "1. Copie os arquivos para /etc/nginx/ssl/"
echo "2. Configure nginx com os certificados"
echo "3. Reinicie nginx: sudo systemctl restart nginx"
echo "4. Acesse via HTTPS: https://seu-ip"
echo ""
echo "⚠️  Tablets precisarão confiar no certificado!"
```

Execute:
```bash
chmod +x setup-ssl.sh
./setup-ssl.sh
```

---

## 🎯 **Recomendação Final**

Para ambiente de **produção em fábrica**:

1. **Melhor opção**: HTTPS com certificado auto-assinado
   - Wake Lock nativo
   - Mais eficiente
   - Todos os recursos PWA funcionam

2. **Opção atual**: HTTP com fallback
   - Funciona bem
   - Mais simples de configurar
   - Usa mais recursos do dispositivo

3. **Configurar tablets**:
   - Desabilitar suspensão automática nas configurações do Android
   - Adicionar app à lista de apps que podem rodar em background
   - Usar modo Kiosk se possível

---

## 📱 **Configurações Recomendadas do Tablet**

### Android:
```
Configurações > Display > Sleep: Never
Configurações > Battery > Battery Optimization > App > Don't Optimize
Configurações > Developer Options > Stay Awake (quando carregando)
```

### iOS:
```
Settings > Display & Brightness > Auto-Lock: Never
Settings > Battery > Low Power Mode: Off
Settings > Accessibility > Display > Auto-Lock: Never
```

---

## 🔄 **Como Atualizar o PWA**

Com a configuração atual, para forçar atualização nos tablets:

1. Fazer deploy da nova versão
2. Limpar cache do navegador nos tablets, OU
3. Incrementar versão no `manifest.json` e Service Worker

---

## 📞 **Troubleshooting**

### Tela ainda apaga mesmo com fallback?

1. **Verificar logs no console**
   - Deve aparecer "✅ Vídeo fallback ativado" ou "✅ Áudio fallback ativado"

2. **Verificar interação do usuário**
   - Usuário precisa tocar/clicar na tela pelo menos uma vez

3. **Configurações do dispositivo**
   - Algumas configurações de energia podem sobrescrever o comportamento

4. **Modo economia de energia**
   - Desabilitar se estiver ativo

5. **Usar modo Kiosk**
   - Apps como "Fully Kiosk Browser" têm controle total sobre wake lock

---

**Status Atual**: ✅ Sistema funcional com fallback
**Recomendação**: 🔐 Adicionar HTTPS para melhor performance

