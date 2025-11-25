# 📋 Configuração do App IHM

Este documento explica como configurar o app IHM para diferentes clientes/instalações.

## ⚙️ Arquivo de Configurações

O app utiliza um arquivo `settings.json` na raiz do projeto para configurações dinâmicas.

### ⚠️ IMPORTANTE - Controle de Versão

- **`settings.json`** - NÃO é commitado no Git (está no `.gitignore`)
  - Cada instalação/cliente deve ter seu próprio arquivo local
  - As configurações são específicas de cada ambiente
  
- **`settings.json.example`** - NÃO é commitado (está no `.gitignore`)
  - Cada desenvolvedor/cliente pode ter seu próprio template local
  - **Vantagem**: Não há conflitos ao fazer `git pull` - suas configurações locais são preservadas
  - Serve como template para criar o `settings.json` no build
  - **Primeira vez**: Se você não tiver o arquivo, crie baseado no exemplo abaixo

### Localização

O arquivo deve estar localizado em:
```
/settings.json  (raiz do projeto, na pasta dist após build)
```

### Estrutura do Arquivo

Crie um arquivo `settings.json` baseado no exemplo `settings.json.example`:

```json
{
  "apiBaseUrl": "http://10.200.0.184:8000",
  "companyName": "Mould"
}
```

### Parâmetros

- **apiBaseUrl**: Endereço IP e porta do servidor SSE/API
  - Formato: `http://IP:PORTA` ou `https://IP:PORTA`
  - Exemplo: `http://192.168.1.100:8000`

- **companyName**: Nome da empresa (substitui "Mould" em todo o app)
  - Este nome aparecerá na interface do usuário
  - Exemplo: `"Minha Empresa"`

## 🚀 Instalação na VM do Cliente

### Opção 1: Configurar ANTES do Build (Recomendado para primeira instalação)

**✅ Vantagem**: O arquivo já sai configurado do build, pronto para uso.

1. **Editar `settings.json.example`** com as configurações do cliente:
```json
{
  "apiBaseUrl": "http://IP_DO_CLIENTE:8000",
  "companyName": "Nome da Empresa do Cliente"
}
```

2. **Fazer o build**:
```bash
npm run build
```
O build copiará automaticamente o `settings.json.example` (já configurado) para `dist/settings.json`.

3. **Copiar a pasta `dist`** para a VM do cliente.

**✅ Vantagem desta abordagem**: 
- O `settings.json.example` está no `.gitignore`, então cada desenvolvedor/cliente mantém seu próprio template
- Não há conflitos ao fazer `git pull` - suas configurações locais são preservadas
- Você pode configurar uma vez e esquecer

### 🔄 Builds Subsequentes

**✅ IMPORTANTE**: O build preserva automaticamente o `settings.json` configurado!

**Como funciona:**
1. **Antes do build**: O plugin salva o `settings.json` existente
2. **Durante o build**: O Vite limpa a pasta `dist` (normal)
3. **Após o build**: O plugin restaura o `settings.json` salvo

**Resultado**: 
- ✅ Você configura o `settings.json` **UMA VEZ**
- ✅ Todos os builds subsequentes **preservam** suas configurações
- ✅ Não precisa reconfigurar a cada atualização! 🎉

**Se você precisar resetar para os valores padrão:**
```bash
rm dist/settings.json
# Próximo build copiará o settings.json.example novamente
```

### Opção 2: Configurar DEPOIS do Build

**✅ Vantagem**: Mantém o `settings.json.example` como template genérico no Git.

1. **Fazer o build**:
```bash
npm run build
```

2. **Copiar a pasta `dist`** para a VM do cliente.

3. **Editar `dist/settings.json`** na VM com as configurações do cliente:
```json
{
  "apiBaseUrl": "http://IP_DO_CLIENTE:8000",
  "companyName": "Nome da Empresa do Cliente"
}
```

**Notas**: 
- O arquivo `settings.json` já estará presente na pasta `dist` após o build (com valores padrão)
- Você precisa apenas EDITAR o arquivo com os valores corretos do cliente
- Este arquivo é específico de cada instalação e NÃO deve ser commitado no Git

### Passo 4: Configurar Servidor Web

Certifique-se de que o servidor web (nginx, Apache, etc.) está configurado para servir o arquivo `settings.json` com o content-type correto:

**Nginx:**
```nginx
location /settings.json {
    add_header Content-Type application/json;
}
```

## 🔄 Como Funciona

1. **Carregamento**: O app tenta carregar `settings.json` na inicialização
2. **Fallback**: Se o arquivo não for encontrado, usa valores padrão:
   - `apiBaseUrl`: `http://10.200.0.184:8000`
   - `companyName`: `Mould`
3. **Cache**: As configurações são armazenadas em cache para melhor performance
4. **LocalStorage**: Em desenvolvimento, você pode salvar configurações no localStorage do navegador

## 🧪 Teste Local

Para testar localmente, você pode:

1. Criar `settings.json` na raiz do projeto (durante desenvolvimento)
2. Ou usar o console do navegador:
```javascript
localStorage.setItem('app_settings', JSON.stringify({
  apiBaseUrl: 'http://localhost:8000',
  companyName: 'Teste'
}));
```

Depois recarregue a página.

## 📝 Notas

- O arquivo `settings.json` é carregado via fetch, então precisa estar acessível via HTTP/HTTPS
- Mudanças no `settings.json` requerem recarregar a página
- O nome da empresa é usado em:
  - Título da página
  - Interface do usuário (App.tsx)
  - Client IDs do MQTT
  - Manifest do PWA (parcialmente - alguns campos são build-time)

## 📝 Editar settings.json no Linux

### Comando Rápido

Para editar o `settings.json` na pasta `dist` usando nano:

```bash
cd dist && nano settings.json
```

### Script Automatizado

Um script `editar-settings.sh` está disponível na raiz do projeto. Para usar:

```bash
# Dar permissão de execução (primeira vez)
chmod +x editar-settings.sh

# Executar o script
./editar-settings.sh
```

O script automaticamente:
- Navega para a pasta `dist`
- Verifica se o arquivo existe
- Abre com nano para edição

### Comandos Úteis no Nano

- **Salvar**: `Ctrl + O` (depois Enter para confirmar)
- **Sair**: `Ctrl + X`
- **Cancelar**: `Ctrl + X` (se não salvou, perguntará se quer salvar)
- **Buscar**: `Ctrl + W`
- **Ajuda**: `Ctrl + G`

## 🔧 Troubleshooting

### Configurações não estão sendo aplicadas

1. Verifique se o arquivo `settings.json` está na pasta correta (mesma do `index.html`)
2. Verifique o console do navegador para erros de carregamento
3. Verifique se o servidor web está servindo o arquivo corretamente
4. Limpe o cache do navegador

### Erro 404 ao carregar settings.json

- Certifique-se de que o arquivo existe no local correto
- Verifique as permissões do arquivo
- Verifique a configuração do servidor web

