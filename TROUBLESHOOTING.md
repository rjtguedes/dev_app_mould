# 🔧 Troubleshooting - Problemas de Conexão

## ❌ App não consegue se conectar ao servidor

### 1. Verificar se o settings.json está sendo servido corretamente

**Problema**: O arquivo `settings.json` pode não estar acessível via HTTP.

**Solução**:
1. Abra o console do navegador (F12)
2. Verifique se há erros ao carregar `/settings.json`
3. Tente acessar diretamente: `http://SEU_IP/settings.json`

**Se der 404**:
- Verifique se o arquivo está na pasta `dist` (mesma do `index.html`)
- Verifique as permissões do arquivo no servidor
- Configure o servidor web para servir arquivos JSON:

**Nginx:**
```nginx
location /settings.json {
    add_header Content-Type application/json;
    add_header Access-Control-Allow-Origin *;
}
```

### 2. Verificar se o IP está correto

**Problema**: O IP configurado pode estar incorreto ou inacessível.

**Solução**:
1. Verifique o console do navegador - deve mostrar:
   ```
   ✅ Configurações carregadas de settings.json: { apiBaseUrl: 'http://...', ... }
   ```
2. Verifique a URL sendo usada nas requisições:
   ```
   🔗 getAPIUrl() gerado: http://IP:PORTA/endpoint
   ```
3. Teste o IP manualmente:
   ```bash
   curl http://IP_DO_SERVIDOR:8000/api/auth/login
   ```

### 3. Verificar CORS (Cross-Origin Resource Sharing)

**Problema**: O servidor pode estar bloqueando requisições do navegador.

**Solução**: Configure o servidor para aceitar requisições do domínio do app:

**Backend (FastAPI exemplo):**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Ou especifique o domínio do app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4. Verificar se as configurações foram carregadas

**Problema**: O app pode estar usando valores padrão antes das configurações serem carregadas.

**Solução**:
1. Abra o console do navegador
2. Procure por mensagens:
   - `✅ Configurações carregadas de settings.json` - OK
   - `📋 Usando configurações padrão` - Problema! O arquivo não foi encontrado
   - `⚠️ settings.json inválido` - Problema! O arquivo está mal formatado

### 5. Verificar formato do settings.json

**Problema**: O arquivo pode estar mal formatado.

**Formato correto:**
```json
{
  "apiBaseUrl": "http://192.168.1.100:8000",
  "companyName": "Nome da Empresa"
}
```

**Erros comuns:**
- Vírgula extra no final
- Aspas faltando
- JSON inválido

**Validação**: Use um validador JSON online ou:
```bash
cat settings.json | python -m json.tool
```

### 6. Verificar logs do console

**Passos**:
1. Abra o console do navegador (F12)
2. Filtre por "SSE" ou "API"
3. Procure por:
   - `🔌 SSE: Conectando em...` - Mostra a URL sendo usada
   - `❌ SSE: Erro de conexão` - Mostra o erro
   - `📡 API Request: GET http://...` - Mostra a URL da API

### 7. Teste manual da conexão

**No console do navegador:**
```javascript
// Testar carregamento do settings.json
fetch('/settings.json')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Testar conexão SSE
const es = new EventSource('http://SEU_IP:8000/api/sse/updates/1');
es.onopen = () => console.log('✅ SSE conectado');
es.onerror = (e) => console.error('❌ SSE erro:', e);
```

### 8. Verificar firewall/rede

**Problema**: Firewall ou rede pode estar bloqueando a conexão.

**Solução**:
1. Verifique se o servidor está acessível da máquina do cliente
2. Teste ping: `ping IP_DO_SERVIDOR`
3. Teste porta: `telnet IP_DO_SERVIDOR 8000` ou `nc -zv IP_DO_SERVIDOR 8000`
4. Verifique firewall do servidor

### 9. Verificar se está usando HTTP vs HTTPS

**Problema**: Mistura de HTTP/HTTPS pode causar problemas.

**Solução**:
- Se o app está em HTTPS, o servidor também deve ser HTTPS (ou configurar CORS adequadamente)
- Se o app está em HTTP, use HTTP no settings.json

### 10. Limpar cache e recarregar

**Solução**:
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Recarregue a página com Ctrl+F5 (hard refresh)
3. Verifique se o settings.json foi atualizado

## 📋 Checklist de Diagnóstico

- [ ] `settings.json` existe na pasta `dist`
- [ ] `settings.json` está acessível via HTTP (`http://.../settings.json`)
- [ ] Formato JSON está correto
- [ ] IP e porta estão corretos
- [ ] Servidor está rodando e acessível
- [ ] CORS está configurado no servidor
- [ ] Firewall não está bloqueando
- [ ] Console do navegador mostra configurações carregadas
- [ ] Console mostra URLs corretas sendo usadas

## 🆘 Ainda não funciona?

1. Compartilhe os logs do console do navegador
2. Compartilhe o conteúdo do `settings.json`
3. Compartilhe a URL que está sendo usada nas requisições
4. Teste se o servidor responde com `curl` ou Postman


