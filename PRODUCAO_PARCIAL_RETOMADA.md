# 🔄 Produção Parcial e Retomada de Talões

## 📋 Problema Identificado

Atualmente, quando um talão é finalizado mas **não produziu a quantidade total**, o sistema não diferencia entre:

- ✅ **Conclusão Total**: Toda a quantidade foi produzida
- ⚠️ **Conclusão Parcial**: Parte foi produzida, mas há saldo pendente

## 🎯 Solução Necessária no Backend

### 1. Lógica de Finalização por Talão

No endpoint `POST /api/producao/finalizar-estacao`, o backend deve:

```python
# Endpoint: POST /api/producao/finalizar-estacao
# Body: { id_maquina, id_talao, estacao_numero, motivo }

# 1. Calcular produção realizada
quantidade_programada = talao.quantidade
quantidade_produzida = producao_mapa.sinais_validos
rejeitos = producao_mapa.rejeitos

# 2. Verificar se foi concluída total ou parcialmente
saldo_pendente = quantidade_programada - quantidade_produzida

if saldo_pendente <= 0:
    # Produção TOTAL
    talao.concluida_total = True
    talao.concluida_parcial = False
else:
    # Produção PARCIAL (há saldo)
    talao.concluida_total = False
    talao.concluida_parcial = True
    talao.saldo_pendente = saldo_pendente  # Novo campo sugerido

# 3. Atualizar dados do talão
talao.quantidade_produzida = quantidade_produzida
talao.rejeitos = rejeitos
talao.fim_unix = tempo_atual_unix()
talao.updated_at = agora()
```

### 2. Estrutura Atualizada do Talão

```typescript
// ✅ IMPLEMENTADO em src/types/websocket-new.ts
interface TalaoProducao {
  id_talao: number;
  estacao_numero: number;
  quantidade: number;                    // Quantidade original programada
  tempo_ciclo_segundos: number;
  
  // Campos opcionais para controle de produção parcial
  quantidade_produzida?: number;         // Quanto foi produzido
  rejeitos?: number;                     // Quantos rejeitos
  saldo_pendente?: number;               // NOVO: quanto falta produzir
  
  iniciada?: boolean;                    // Se já foi iniciada
  concluida_total?: boolean;             // Se produziu TUDO
  concluida_parcial?: boolean;           // Se produziu PARTE
  
  pode_retomar?: boolean;                // NOVO: Se pode ser retomada
  inicio_unix?: number | null;
  fim_unix?: number | null;
}
```

### 3. Endpoint de Retomada (A CRIAR)

```http
POST /api/producao/retomar-talao
Content-Type: application/json

{
  "id_maquina": 73,
  "id_talao": 410,
  "estacao_numero": 1
}
```

**Comportamento esperado:**

```python
# 1. Validar que o talão está com concluida_parcial = true
if not talao.concluida_parcial:
    raise ValueError("Talão não está em estado parcialmente concluído")

if talao.concluida_total:
    raise ValueError("Talão já foi totalmente concluído")

# 2. Resetar flags de finalização
talao.concluida_parcial = False
talao.fim_unix = None

# 3. Zerar contexto de producao_mapa (mas manter histórico)
producao_mapa.sinais_validos = 0
producao_mapa.rejeitos = 0
producao_mapa.inicio_unix_segundos = tempo_atual_unix()

# 4. Manter quantidade_produzida anterior como "baseline"
# (ou criar campo quantidade_produzida_acumulada)

# 5. Retornar sucesso
return {
    "success": true,
    "message": "Talão retomado com sucesso",
    "data": {
        "id_talao": talao.id,
        "quantidade_programada": talao.quantidade,
        "quantidade_ja_produzida": talao.quantidade_produzida,
        "saldo_pendente": talao.saldo_pendente,
        "inicio_retomada": tempo_atual_unix()
    }
}
```

### 4. Regras de Negócio

| Condição | `concluida_total` | `concluida_parcial` | Ação Permitida |
|----------|-------------------|---------------------|----------------|
| Produzidas ≥ Programadas | `true` | `false` | ❌ Não pode retomar |
| Produzidas < Programadas | `false` | `true` | ✅ Pode retomar |
| Não iniciada | `false` | `false` | ✅ Pode iniciar |
| Em produção | `false` | `false` | ⏸️ Pode pausar/finalizar |

### 5. Exemplo Prático

#### Cenário 1: Conclusão Total
```json
{
  "id_talao": 410,
  "quantidade": 36,
  "quantidade_produzida": 61,  // Produziu a mais!
  "rejeitos": 3,
  "saldo_pendente": 0,
  "concluida_total": true,
  "concluida_parcial": false,
  "pode_retomar": false
}
```

#### Cenário 2: Conclusão Parcial
```json
{
  "id_talao": 411,
  "quantidade": 100,
  "quantidade_produzida": 45,  // Produziu menos
  "rejeitos": 2,
  "saldo_pendente": 55,
  "concluida_total": false,
  "concluida_parcial": true,
  "pode_retomar": true
}
```

### 6. UI no Tablet

#### Badge Visual para Produção Parcial

```tsx
{talao.concluida_parcial && (
  <div className="px-3 py-1.5 bg-gradient-to-r from-yellow-600 to-amber-700 text-white rounded-full font-bold text-xs shadow-md uppercase">
    ⚠️ Parcial - Saldo: {talao.saldo_pendente}
  </div>
)}

{talao.concluida_parcial && (
  <button
    onClick={() => handleRetomarTalao(talao)}
    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs rounded-lg font-bold"
  >
    ▶️ Retomar Produção
  </button>
)}
```

## 🚀 Próximos Passos

### Backend (VOCÊ DEVE CRIAR):

1. ✅ Modificar endpoint `/api/producao/finalizar-estacao` para calcular `concluida_total` vs `concluida_parcial`
2. ✅ Adicionar campo `saldo_pendente` na tabela `taloes_estacao`
3. ✅ Criar endpoint `/api/producao/retomar-talao`
4. ✅ Retornar `pode_retomar` no endpoint `/api/mapa/{id}/detalhes`

### Frontend (EU VOU IMPLEMENTAR):

1. ⏳ Adicionar função `handleRetomarTalao()`
2. ⏳ Mostrar badge diferenciado para talões parciais
3. ⏳ Botão "Retomar Produção" para talões parciais
4. ⏳ Feedback visual de saldo pendente

## 📝 Notas Importantes

- **Histórico**: Manter registro de todas as tentativas de produção
- **Acumulação**: `quantidade_produzida` deve acumular entre retomadas ou resetar? (definir regra)
- **Múltiplas Retomadas**: Permitir retomar várias vezes até atingir quantidade total
- **SSE**: Emitir evento `talao_retomado` quando retomar produção

---

**Status**: ⚠️ **Aguardando implementação no backend**

Após implementar os endpoints mencionados, me avise para adaptar o frontend!



