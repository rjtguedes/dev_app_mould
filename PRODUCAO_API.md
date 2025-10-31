## API de Produção — Tablet IHM (Finalização por Talão)

### Visão Geral
- Contadores de sessão/turno NUNCA são resetados ao iniciar talão/produção.
- O início de produção zera apenas o contexto de `producao_mapa`.
- Quantidades produzidas são calculadas pelo backend via contadores (`sinais_validos`). O tablet não envia quantidades.
- Toda finalização é SEMPRE por talão/estação (inclusive em máquina simples — estação 1). Não há finalização por mapa no fluxo do tablet.
- Contexto inicial SEMPRE vem do Supabase (machine_stats_redis). SSE entrega mudanças em tempo real (updates parciais sem esperar 1 min).

---

### 1) Iniciar Produção — Máquina Simples
POST `/api/producao/iniciar-simples`

Body:
```json
{
  "id_maquina": 73,
  "id_mapa": 34,
  "taloes": [
    { "id_talao": 410, "estacao_numero": 1, "quantidade": 36, "tempo_ciclo_segundos": 69 }
  ]
}
```

Comportamento:
- Valida que a máquina não é multipostos e que `estacao_numero` = 1.
- Enriquecimento do contexto `producao_mapa` com dados do talão (`taloes_estacao`):
  - `id_talao_estacao`, `quantidade_programada`, `id_cor`, `id_matriz`, `id_produto`.
- Persiste início em `producao_mapa (inicio_unix_segundos)`.
- SSE: `producao_iniciada` com `{ id_mapa, inicio, taloes }`.

---

### 2) Iniciar Produção — Máquina Multipostos
POST `/api/producao/iniciar`

Body:
```json
{
  "id_maquina": 147,
  "id_mapa": 654,
  "taloes": [
    { "id_talao": 2001, "estacao_numero": 1, "quantidade": 30 },
    { "id_talao": 2002, "estacao_numero": 2, "quantidade": 40 }
  ]
}
```

Comportamento:
- Valida multipostos, mapeia talões por estação.
- Cada estação (máquina filha) recebe `producao_mapa` específico com talões enriquecidos (`id_cor`, `id_matriz`, `id_produto`).
- Persiste início (best-effort) e emite SSE:
  - Pai: `producao_mapa_iniciada`
  - Filhas: `producao_estacao_iniciada`

---

### 3) Finalizar Produção por Estação (Talão) — SEMPRE USAR ESTE
POST `/api/producao/finalizar-estacao`

Body:
```json
{
  "id_maquina": 73,
  "estacao_numero": 1,
  "id_talao": 410,
  "motivo": "Produção concluída"
}
```

Regras:
- O backend calcula os números:
  - `produzido_sinais_validos` = `producao_mapa.sinais_validos`
  - `rejeitos` = `producao_mapa.rejeitos`
- Atualiza o talão correspondente em `producao_mapa.taloes`:
  - `finalizado=true`, `fim`, `motivo_finalizacao`, `produzido_sinais_validos`, `rejeitos`.
- Persiste como PAUSA parcial via `producao_mapa_sync_service.pausar_producao_mapa`.
- SSE: `talao_finalizado` com `{ estacao_numero, id_talao, fim, produzido_sinais_validos, rejeitos, motivo }`.

---

### 4) Pausar/Finalizar Mapa — (Administrativo/Backoffice, não usar no tablet)
- Os endpoints de pausar/finalizar mapa existem para rotinas administrativas e reconciliações, mas o fluxo do tablet deve finalizar SEMPRE por talão/estação via `/api/producao/finalizar-estacao`.
- Para concluir todo o mapa via tablet, finalize todos os talões/estações pendentes individualmente (um por vez) usando o endpoint por estação.

---

### 6) Adicionar Rejeitos
POST `/api/producao/rejeitos`

Body:
```json
{ "id_maquina": 73, "quantidade": 1, "id_motivo_rejeito": 12 }
```

Comportamento:
- Incrementa rejeitos em sessão, turno e mapa (se ativo).
- Supabase: insere em `rejeitos` (com tratamento de pai/filha em multipostos).

---

### SSE — Eventos e Payloads (updates parciais)
- connected (primeiro evento)
  - `{ initial_context: <dashboard>, has_context: true, connection_id, timestamp }`
- sessao_iniciada
  - `{ estacao_numero, ligada, id_sessao, inicio_sessao, id_turno_atual }`
- producao_iniciada
  - `{ estacao_numero, id_producao_mapa, id_mapa, id_talao_estacao, inicio_producao, tempo_ciclo,
      id_produto, descricao_produto, id_cor, descricao_cor, id_matriz }`
- producao_pausada
  - `{ estacao_numero, id_producao_mapa: null, id_mapa: null }`
- producao_finalizada
  - `{ estacao_numero, id_producao_mapa: null, id_mapa: null, inicio_producao: null }`
- talao_finalizado
  - `{ estacao_numero, sinais_producao_valido, rejeitos_producao }`
- rejeitos_adicionados
  - `{ estacao_numero, rejeitos_sessao, rejeitos_turno, rejeitos_producao }`
- parada_forcada
  - `{ estacao_numero, id_parada_atual, status: false }`
- retomada_forcada
  - `{ estacao_numero, id_parada_atual: null, ultima_parada, ultima_parada_inicio, ultima_parada_fim, ultima_parada_duracao }`
- parada_justificada
  - `{ estacao_numero, ultima_parada, ultima_parada_motivo, ultima_parada_observacoes, ultima_parada_contabiliza_oee }`
- heartbeat
  - vazio (comentado). Mantém conexão ativa.

---

### Regras de Contadores
- Início de produção/talão: zera SOMENTE `producao_mapa`.
- Sessão (`sessao_operador`) e Turno (`producao_turno`) nunca são resetados ao iniciar produção.
- Justificativa de parada (motivo não contabiliza OEE):
  - Reclassifica tempo: move de `tempo_paradas_validas` para `tempo_paradas_nao_conta_oee` em sessão/turno/mapa.
  - Recalcula `tempo_valido_segundos`.

---

### Contexto inicial (REST) — Dashboard
- Endpoint: `GET /api/maquina/{id_maquina}/dashboard`
- Resumo do payload:
  - `maquina`: { `id_maquina`, `nome`, `status`, `velocidade`, `multipostos`, `ativa`, `total_filhas` }
  - `estacoes`: [
    { `estacao_numero`, `ligada`, `status`, `velocidade`, `ultimo_sinal`,
      `sessao`: { `id_sessao`, `id_turno`, `inicio`, `sinais_validos`, `rejeitos` },
      `producao`: { `id_producao_mapa`, `id_mapa`, `id_talao_estacao`, `inicio`, `tempo_ciclo`, `id_produto`, `descricao_produto`, `id_cor`, `descricao_cor`, `id_matriz`, `sinais_validos`, `rejeitos`, `saldo_a_produzir`, `tempo_decorrido_segundos`, `tempo_paradas_segundos`, `tempo_paradas_nao_conta_oee`, `tempo_paradas_validas`, `tempo_valido_segundos` },
      `paradas`: { `id_parada_atual`, `ultima_parada`: { `id`, `inicio_unix_segundos`, `fim_unix_segundos`, `duracao_segundos`, `motivo_parada`, `contabiliza_oee`, `observacoes` }, `ultima_parada_justificada` },
      `last_snapshot_unix` }
  ]
  - `maquinas_filhas` (se multipostos): [ { `id_maquina`, `nome`, `estacoes`: [...] } ]
  - `estatisticas`: { `sinais_sessao`, `rejeitos_sessao`, `sinais_validos_sessao`, `tempo_decorrido_segundos`, `tempo_paradas_segundos`, `tempo_valido_segundos` }

---

### Exemplos Rápidos

Iniciar simples:
```bash
curl -X POST http://HOST/api/producao/iniciar-simples \
  -H "Content-Type: application/json" \
  -d '{
    "id_maquina":73,
    "id_mapa":34,
    "taloes":[{"id_talao":410,"estacao_numero":1,"quantidade":36,"tempo_ciclo_segundos":69}]
  }'
```

Finalizar estação:
```bash
curl -X POST http://HOST/api/producao/finalizar-estacao \
  -H "Content-Type: application/json" \
  -d '{"id_maquina":73,"estacao_numero":1,"id_talao":410,"motivo":"Produção concluída"}'
```


