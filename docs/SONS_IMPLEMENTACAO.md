# 🔊 Sistema de Sons - App IHM

## 📦 Biblioteca Instalada

**Howler.js** - Biblioteca leve e performática para reprodução de sons em JavaScript.
- ✅ Compatível com tablets e navegadores modernos
- ✅ Suporte HTML5 Audio
- ✅ Controle de volume e loop
- ✅ Pré-carregamento automático

## 📁 Arquivos Criados

1. **`src/lib/sounds.ts`** - Configuração e gerenciamento de sons
2. **`src/hooks/useSounds.ts`** - Hook React para facilitar uso dos sons

## 🎵 Sons Disponíveis

```typescript
// Notificações
playNotification()  // Notificação geral
playSuccess()       // Ação bem-sucedida
playError()         // Erro ou falha

// Interações
playClick()         // Clique em botões
playClick2()        // Click alternativo

// Produção
playStop()          // Parada da máquina
playResume()        // Retomada da máquina

// Alertas
playAlert()         // Alerta importante
playWarning()       // Aviso
```

## 📂 Onde Adicionar os Arquivos de Som

Crie a pasta `/public/sounds/` e adicione os arquivos MP3:

```
public/
  sounds/
    notification.mp3
    success.mp3
    error.mp3
    click.mp3
    click2.mp3
    stop.mp3
    resume.mp3
    alert.mp3
    warning.mp3
```

## 💡 Como Usar

### Exemplo 1: No Dashboard

```tsx
import { useSounds } from '../hooks/useSounds';

function OperatorDashboard() {
  const { playSuccess, playError, playStop, playResume } = useSounds();

  // No handler de retomada
  const handleResume = () => {
    playResume();
    // ... resto do código
  };

  // No handler de parada
  const handleStop = () => {
    playStop();
    // ... resto do código
  };
}
```

### Exemplo 2: Em Botões

```tsx
import { useSounds } from '../hooks/useSounds';

function ProductionButton() {
  const { playClick, playSuccess } = useSounds();

  const handleClick = () => {
    playClick();
    
    // Realizar ação...
    
    if (success) {
      playSuccess();
    }
  };
}
```

### Exemplo 3: Modal de Erro

```tsx
import { useSounds } from '../hooks/useSounds';

function ErrorModal({ error }) {
  const { playError } = useSounds();
  
  useEffect(() => {
    if (error) {
      playError();
    }
  }, [error, playError]);
}
```

## 🎚️ Ajustar Volumes

Edite os volumes em `src/lib/sounds.ts`:

```typescript
const volumes = {
  notification: 0.7,  // 70% do volume
  error: 0.8,         // 80% do volume
  success: 0.6,       // 60% do volume
  click: 0.3,         // 30% do volume (muito baixo)
  stop: 0.7,
  resume: 0.5
};
```

## 🔊 Onde Obter Sons

### Fontes Gratuitas:
- **Freesound.org** - Biblioteca grande de sons gratuitos
- **Zapsplat** - Sons profissionais gratuitos (requer cadastro)
- **Mixkit** - Sons gratuitos para projetos
- **BBC Sound Effects Library** - Áudio profissional gratuito

### Recomendações para Sons Industriais:
- Use sons curtos (0.5s - 2s) para não distrair
- Priorize cliques e notificações discretas
- Sons de alerta devem ser claros mas não assustadores
- Teste volume em ambiente industrial real

## 🧪 Testando

1. Adicione arquivos MP3 na pasta `/public/sounds/`
2. Importe o hook `useSounds` no componente desejado
3. Chame os métodos de som nos eventos apropriados
4. Teste em tablet real para validar volume e timing

## ⚙️ Desabilitar Sons

Para desabilitar temporariamente, comente as chamadas de `playSound()` ou ajuste todos os volumes para `0` em `src/lib/sounds.ts`.


