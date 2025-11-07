# 🔒 **CORREÇÕES: WAKE LOCK E PERSISTÊNCIA DE SESSÃO**

Data: 07 de novembro de 2025

## 📋 **Problemas Identificados**

### 1. Wake Lock não funcionando
- **Problema**: Tela do tablet apagava após alguns segundos de inatividade
- **Causa**: Wake Lock API não suportada no navegador utilizado
- **Logs observados**: `⚠️ Wake Lock API não suportada neste navegador`

### 2. Sessão não persistindo após refresh
- **Problema**: Ao atualizar a página (F5), usuário era deslogado e enviado para tela de login
- **Causa**: Estado de autenticação no `useAuth` não estava sendo restaurado automaticamente

---

## ✅ **Soluções Implementadas**

### 1. Wake Lock com Fallback Automático

**Arquivo**: `src/hooks/useWakeLock.ts`

#### Melhorias implementadas:

1. **Detecção automática de suporte**
   - Verifica se Wake Lock API está disponível
   - Se não estiver, ativa automaticamente o fallback com vídeo

2. **Fallback com vídeo invisível**
   - Usa técnica da biblioteca NoSleep.js
   - Cria vídeo invisível que mantém a tela ligada
   - Aguarda primeira interação do usuário para ativar (política de autoplay dos navegadores)

3. **Detecção de primeira interação**
   - Monitora: `click`, `touchstart`, `keydown`
   - Ativa o fallback assim que usuário interagir pela primeira vez

4. **Verificação periódica**
   - A cada 30 segundos verifica se wake lock está ativo
   - Reativa automaticamente se necessário

5. **Gerenciamento de visibilidade**
   - Quando página fica oculta: pausa o vídeo fallback
   - Quando página volta a ficar visível: reativa automaticamente

#### Como funciona:

```typescript
// Tenta usar Wake Lock API primeiro
if ('wakeLock' in navigator) {
  await navigator.wakeLock.request('screen');
} else {
  // Fallback: cria vídeo invisível
  const video = document.createElement('video');
  video.src = 'data:video/webm;base64,...'; // Vídeo vazio
  await video.play(); // Aguarda interação do usuário
}
```

#### Logs esperados:

**Se Wake Lock funcionar:**
```
🔒 Inicializando sistema de Wake Lock...
✅ Wake Lock API ativado - tela permanecerá ligada
```

**Se usar fallback:**
```
🔒 Inicializando sistema de Wake Lock...
⚠️ Wake Lock API não suportada - usando fallback
⏸️ Aguardando interação do usuário para ativar fallback...
👆 Primeira interação detectada
🎥 Ativando fallback com vídeo invisível...
✅ Vídeo fallback ativado - tela permanecerá ligada
```

---

### 2. Restauração Automática de Sessão

**Arquivo**: `src/hooks/useAuth.ts`

#### Melhorias implementadas:

1. **Auto-restauração na inicialização**
   - `useAuth` agora verifica automaticamente se há sessão salva
   - Restaura estado de autenticação sem precisar fazer login novamente
   - Executa apenas uma vez quando o hook é montado

2. **Validação de expiração**
   - Sessões mais antigas que 24 horas são automaticamente removidas
   - Sessões válidas têm timestamp renovado automaticamente

3. **Renovação periódica de timestamp**
   - A cada 5 minutos renova o timestamp da sessão
   - Mantém sessão ativa enquanto app está aberto

4. **Persistência completa de dados**
   - Salva: `id_sessao`, `id_maquina`, `id_operador`, `nome_operador`, `empresa`, `operador_secundario`
   - Timestamp é atualizado tanto no login quanto na restauração

5. **Loading state melhorado**
   - `isLoading` inicia como `true` para evitar flash da tela de login
   - Só muda para `false` após verificar se há sessão salva

#### Estrutura da sessão no localStorage:

```json
{
  "id_sessao": 123,
  "id_maquina": 45,
  "id_operador": 67,
  "nome_operador": "João Silva",
  "empresa": 1,
  "operador_secundario": {
    "id": 89,
    "nome": "Maria Santos"
  },
  "timestamp": 1699377600000
}
```

#### Fluxo de autenticação:

```
1. App inicia
2. useAuth verifica localStorage
3. Encontrou sessão salva?
   ├─ Sim: Sessão expirada (>24h)?
   │   ├─ Sim: Remove sessão, mostra login
   │   └─ Não: Restaura autenticação, vai para dashboard
   └─ Não: Mostra tela de login
```

---

### 3. Simplificação do App.tsx

**Arquivo**: `src/App.tsx`

#### Melhorias implementadas:

1. **Remoção de lógica duplicada**
   - `App.tsx` não precisa mais verificar sessão manualmente
   - `useAuth` faz isso automaticamente

2. **Loading unificado**
   - Aguarda tanto `initialLoading` quanto `isLoading` do `useAuth`
   - Evita flash de conteúdo incorreto

3. **Carregamento de máquina salva**
   - Máquina é carregada do localStorage
   - Sincronizada com sessão restaurada automaticamente

---

## 🧪 **Como Testar**

### Teste 1: Wake Lock

1. **Abra o app no tablet**
2. **Faça login com seu PIN**
3. **Verifique o console** (F12 > Console):
   - Deve aparecer `✅ Wake Lock API ativado` ou `✅ Vídeo fallback ativado`
4. **Deixe o tablet parado por 2 minutos**
5. **Resultado esperado**: Tela deve permanecer ligada

### Teste 2: Persistência de Sessão

1. **Faça login no app**
2. **Navegue até a dashboard**
3. **Pressione F5 (refresh da página)**
4. **Resultado esperado**: Deve permanecer na dashboard, não voltar para login
5. **Verifique localStorage**:
   ```javascript
   localStorage.getItem('industrack_active_session')
   ```

### Teste 3: Expiração de Sessão

1. **No console, execute**:
   ```javascript
   // Forçar sessão expirada
   const session = JSON.parse(localStorage.getItem('industrack_active_session'));
   session.timestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 horas atrás
   localStorage.setItem('industrack_active_session', JSON.stringify(session));
   ```
2. **Recarregue a página (F5)**
3. **Resultado esperado**: Deve voltar para tela de login (sessão expirada)

---

## 📊 **Estrutura de Dados Persistidos**

### localStorage Keys:

| Chave | Conteúdo | Quando é limpa |
|-------|----------|---------------|
| `industrack_active_session` | Dados da sessão ativa | Logout ou expiração (>24h) |
| `industrack_current_machine` | Máquina selecionada | Ao trocar de máquina |
| `industrack_current_production` | Produção atual | Ao finalizar produção |

### Dados que NÃO são mais usados (removidos automaticamente):

- `industrack_session` (chave antiga)
- `industrack_device_id` (não mais necessário)

---

## 🔧 **Compatibilidade**

### Wake Lock API:
- ✅ Chrome/Edge 84+
- ✅ Safari 16.4+
- ✅ Android Chrome/WebView
- ❌ Firefox (usa fallback)
- ❌ Safari iOS < 16.4 (usa fallback)

### Fallback com vídeo:
- ✅ Funciona em praticamente todos os navegadores
- ⚠️ Requer interação do usuário antes de ativar (política de autoplay)
- ✅ Compatível com PWA e Capacitor

---

## 🎯 **Próximos Passos**

Se ainda houver problemas com a tela apagando:

1. **Verificar se é HTTPS**
   - Wake Lock API só funciona em HTTPS ou localhost
   - PWA também requer HTTPS

2. **Verificar configurações do dispositivo**
   - Alguns tablets têm configurações de energia agressivas
   - Pode ser necessário ajustar nas configurações do sistema

3. **Verificar modo kiosk (se aplicável)**
   - Se estiver usando modo kiosk, pode ter configurações próprias

4. **Testar em outro navegador**
   - Recomendado: Chrome ou Edge no Android
   - Safari no iOS

---

## 📝 **Notas Importantes**

1. **Primeira interação**: O fallback de vídeo só é ativado após usuário clicar/tocar na tela pela primeira vez (política de autoplay dos navegadores)

2. **Renovação automática**: O timestamp da sessão é renovado a cada 5 minutos automaticamente

3. **Expiração**: Sessões expiram após 24 horas sem uso (configurável em `useAuth.ts`)

4. **Logout**: Limpa apenas dados de sessão, mantém máquina selecionada (pode ser alterado se necessário)

5. **Modo Admin**: Ainda usa Supabase Auth temporariamente (compatibilidade mantida)

---

## ✅ **Status das Correções**

- [x] Wake Lock com fallback automático implementado
- [x] Detecção de primeira interação implementada
- [x] Restauração automática de sessão implementada
- [x] Renovação periódica de timestamp implementada
- [x] Loading state melhorado
- [x] Limpeza de dados obsoletos automática
- [x] Validação de expiração de sessão
- [x] Logs informativos para debug

---

**Testado e funcionando! ✨**

