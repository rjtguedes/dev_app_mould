# 📱 **NOVOS ENDPOINTS PARA TABLET IHM**

## 🚀 **IMPLEMENTAÇÃO COMPLETA**

O tablet IHM agora é **independente do Supabase** e trabalha exclusivamente com a **API REST**. 

---

## 📋 **ENDPOINTS IMPLEMENTADOS**

### **🔐 1. AUTENTICAÇÃO**

#### **Login com PIN**
```http
POST /api/auth/login
Content-Type: application/json

{
  "pin": 1234,
  "id_maquina": 135  // Opcional
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "id_operador": 1,
    "nome": "João Silva",
    "empresa": 5,
    "cargo": "Operador",
    "ativo": true,
    "id_empresa": 5
  }
}
```

---

### **📋 2. LISTAGENS BÁSICAS**

#### **Listar Máquinas**
```http
GET /api/maquinas
GET /api/maquinas?ativa=true
```

#### **Listar Operadores**
```http
GET /api/operadores
```
*Nota: PIN não é incluído na resposta por segurança*

#### **Listar Turnos**
```http
GET /api/turnos              # Todos os turnos
GET /api/turnos/ativos       # Apenas turnos ativos no horário atual
```

---

### **🗺️ 3. MAPAS DE PRODUÇÃO**

#### **Listar Mapas**
```http
GET /api/mapas
GET /api/mapas?id_maquina=135
GET /api/mapas?ativo=true
```

#### **Detalhes Completos do Mapa**
```http
GET /api/mapa/{id_mapa}/detalhes
```

**Resposta inclui:**
- Dados do mapa
- Estações (ordenadas por `posicao_ordem`)
- Talões de cada estação

**Exemplo de resposta:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nome": "Mapa ABC - Lote 001",
    "ativo": true,
    "estacoes": [
      {
        "id": 1,
        "numero_estacao": 1,
        "grupo_maquina_id": 1,
        "posicao_ordem": 1,
        "taloes": [
          {
            "id": 1,
            "talao_referencia": "REF001",
            "talao_tamanho": "M",
            "quantidade": 100,
            "tempo_ciclo_segundos": 30
          }
        ]
      }
    ]
  }
}
```

---

### **🛑 4. PARADAS E MOTIVOS**

#### **Listar Motivos de Parada**
```http
GET /api/motivos-parada
GET /api/motivos-parada?grupo_maquina=1
```

#### **Listar Paradas da Máquina**
```http
GET /api/maquina/{id_maquina}/paradas
GET /api/maquina/135/paradas?periodo=hoje
GET /api/maquina/135/paradas?periodo=semana
GET /api/maquina/135/paradas?periodo=mes
GET /api/maquina/135/paradas?inicio=1698000000&fim=1698086400
```

#### **Justificar Parada**
```http
POST /api/parada/{id_parada}/justificar
Content-Type: application/json

{
  "id_motivo": 5,
  "observacoes": "Manutenção preventiva"  // Opcional
}
```

---

### **📊 5. DASHBOARD COMPLETO**

#### **Dashboard da Máquina**
```http
GET /api/maquina/{id_maquina}/dashboard
```

**Resposta completa:**
```json
{
  "success": true,
  "data": {
    "maquina": {
      "id_maquina": 135,
      "nome": "Máquina 01",
      "status": true,
      "velocidade": 100,
      "multipostos": false,
      "ativa": true
    },
    "sessao_ativa": {
      "id_sessao": 123,
      "id_operador": 1,
      "inicio": 1698000000,
      "sinais": 150,
      "rejeitos": 5,
      "sinais_validos": 145
    },
    "producao_ativa": {
      "id_mapa": 1,
      "sinais": 150,
      "rejeitos": 5,
      "inicio": 1698000000
    },
    "producao_turno": {
      "sinais": 890,
      "rejeitos": 23,
      "sinais_validos": 867
    },
    "parada_ativa": {
      "id": 456,
      "inicio_unix_segundos": 1698001800,
      "motivo_parada": null
    },
    "parada_forcada": {
      "ativa": false,
      "bloqueio_sinais": false
    },
    "estatisticas": {
      "sinais_sessao": 150,
      "rejeitos_sessao": 5,
      "sinais_validos_sessao": 145,
      "sinais_turno": 890,
      "rejeitos_turno": 23,
      "sinais_validos_turno": 867,
      "tempo_decorrido_segundos": 7200,
      "tempo_paradas_segundos": 600,
      "tempo_valido_segundos": 6600
    }
  }
}
```

---

## 🛢️ **TABELAS UTILIZADAS**

### **✅ Tabelas Configuradas:**

1. **`operador`** - Operadores com PIN para login
2. **`mapa_producao`** - Mapas de produção
3. **`estacoes_mapa`** - Estações dos mapas
4. **`taloes_estacao`** - Talões das estações
5. **`Maquinas`** - Lista de máquinas (já existente)
6. **`Turnos`** - Turnos de trabalho (já existente)
7. **`motivos_parada`** - Motivos de parada (já existente)
8. **`paradas_redis`** - Registro de paradas (já existente)

### **🔍 Campos Essenciais:**

#### **operador**
- `id`, `nome`, `pin`, `empresa`, `ativo`, `id_empresa`

#### **mapa_producao**
- `id`, `nome`, `ativo`, `id_empresa`

#### **estacoes_mapa**
- `id`, `mapa_producao_id`, `numero_estacao`, `posicao_ordem`, `grupo_maquina_id`

#### **taloes_estacao**
- `id`, `estacao_mapa_id`, `talao_referencia`, `talao_tamanho`, `quantidade`, `tempo_ciclo_segundos`

---

## 🎯 **COMANDOS PROCESSADOS**

### **CommandProcessor Handlers:**

```python
# Novos comandos implementados:
- handle_login_operador()
- handle_listar_maquinas()
- handle_listar_operadores()
- handle_listar_turnos()
- handle_listar_turnos_ativos()
- handle_listar_mapas_producao()
- handle_obter_detalhes_mapa()
- handle_listar_motivos_parada()
- handle_listar_paradas_maquina()
- handle_dashboard_maquina()
```

---

## 🧪 **COMO TESTAR**

### **1. Verificar Health**
```bash
curl http://localhost:8000/health
```

### **2. Testar Login**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"pin": 1234}'
```

### **3. Iniciar Produção com Talões Específicos**
```bash
# NOVO: Produção com talões específicos (máquinas multipostos)
curl -X POST http://localhost:8000/api/producao/iniciar \
  -H "Content-Type: application/json" \
  -d '{
    "id_maquina": 135,
    "id_mapa": 1,
    "taloes": [
      {
        "id_talao": 101,
        "estacao_numero": 1,
        "quantidade": 50,
        "tempo_ciclo_segundos": 30
      },
      {
        "id_talao": 102,
        "estacao_numero": 2,
        "quantidade": 30,
        "tempo_ciclo_segundos": 25
      }
    ]
  }'
```

### **4. Listar Dados**
```bash
# Máquinas
curl http://localhost:8000/api/maquinas

# Operadores
curl http://localhost:8000/api/operadores

# Turnos ativos
curl http://localhost:8000/api/turnos/ativos

# Mapas de produção
curl http://localhost:8000/api/mapas?ativo=true
```

### **6. Dashboard Completo**
```bash
curl http://localhost:8000/api/maquina/135/dashboard
```

### **7. Detalhes do Mapa**
```bash
curl http://localhost:8000/api/mapa/1/detalhes
```

---

## 🏭 **PRODUÇÃO COM TALÕES ESPECÍFICOS**

### **📋 NOVA FUNCIONALIDADE IMPLEMENTADA**

A **produção de mapas** agora funciona corretamente com **talões específicos**:

#### **❌ ANTES (Incorreto):**
- Iniciava produção de TODO o mapa
- Não considerava talões específicos
- Configuração genérica para todas máquinas

#### **✅ AGORA (Correto):**
- **Recebe array de talões específicos** a produzir
- **Valida** se talões existem no mapa
- **Distribui talões** para máquinas filhas corretas
- **Máquina PAI**: contexto do mapa geral
- **Máquinas FILHAS**: contexto com talões específicos da estação

### **🔄 FLUXO DE DISTRIBUIÇÃO:**

```
1. Tablet envia: id_mapa + array de talões específicos
   ├─ Validação: talões existem no mapa?
   ├─ Mapeamento: talão → estação → máquina filha
   └─ Distribuição hierárquica
   
2. Máquina PAI (multipostos):
   ├─ Contexto: mapa geral + estatísticas consolidadas
   └─ Coordenação das filhas
   
3. Máquinas FILHAS:
   ├─ Contexto: talões específicos da sua estação
   ├─ Quantidade e tempo de ciclo por talão
   └─ Produção independente por estação
```

### **📊 EXEMPLO DE ESTRUTURA:**

**Requisição:**
```json
{
  "id_maquina": 135,  // Máquina PAI (multipostos)
  "id_mapa": 1,
  "taloes": [
    {
      "id_talao": 101,
      "estacao_numero": 1,
      "quantidade": 50,
      "tempo_ciclo_segundos": 30
    },
    {
      "id_talao": 102, 
      "estacao_numero": 2,
      "quantidade": 30,
      "tempo_ciclo_segundos": 25
    }
  ]
}
```

**Resultado:**
```json
{
  "success": true,
  "message": "Produção mapa iniciada com sucesso (2 filhas configuradas)",
  "data": {
    "id_maquina_pai": 135,
    "filhas_configuradas": 2,
    "total_estacoes": 2,
    "total_taloes": 2,
    "distribuicao": [
      {
        "id_maquina_filha": 201,
        "estacao_numero": 1,
        "taloes": [{"id_talao": 101, "quantidade_solicitada": 50}]
      },
      {
        "id_maquina_filha": 202,  
        "estacao_numero": 2,
        "taloes": [{"id_talao": 102, "quantidade_solicitada": 30}]
      }
    ]
  }
}
```

### **✅ VALIDAÇÕES IMPLEMENTADAS:**

1. **Máquina deve ser multipostos** (PAI)
2. **Talões devem existir no mapa** especificado
3. **Estação do talão deve conferir** com a solicitada
4. **Quantidade deve ser válida** (> 0)
5. **Mapeamento estação → máquina filha** deve existir

---

## 📖 **DOCUMENTAÇÃO AUTOMÁTICA**

A documentação interativa está disponível em:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## 🔧 **CONFIGURAÇÃO MULTI-TENANT**

✅ **Todos os endpoints respeitam `ID_EMPRESA`**:
- Operadores filtrados por `id_empresa`
- Mapas filtrados por `id_empresa`
- Paradas filtradas por `id_empresa`
- Máquinas filtradas por `id_empresa`

✅ **Service Role Key**:
- Bypass de políticas RLS
- Acesso total ao banco via API

---

## 🎉 **RESULTADO FINAL**

**O tablet IHM agora é completamente independente!** 

### **❌ ANTES:**
- Tablet acessa Supabase diretamente
- Problemas com RLS e políticas
- Exposição de chaves no cliente
- Dependência de conectividade direta

### **✅ AGORA:**
- Tablet acessa apenas API REST
- Segurança centralizada no backend
- PIN para autenticação
- Dados completos via endpoints padronizados
- SSE para updates em tempo real

**Total de endpoints novos: 10 + compatibilidade com existentes** 🚀

---

## 🔧 **CORREÇÃO IMPLEMENTADA: PRODUÇÃO COM TALÕES ESPECÍFICOS**

### **✅ PROBLEMA IDENTIFICADO E CORRIGIDO:**

O usuário alertou que a **produção de mapas** estava incorreta:
- ❌ **Antes**: Iniciava produção de TODO o mapa automaticamente
- ✅ **Agora**: Recebe array de **talões específicos** a produzir

### **🏗️ IMPLEMENTAÇÃO CORRETA:**

#### **1. API Atualizada:**
```typescript
// ANTES (incorreto)
interface IniciarProducaoRequest {
  id_maquina: number;
  id_mapa: number;
  tempo_ciclo: number;  // ❌ Genérico
}

// AGORA (correto)
interface IniciarProducaoRequest {
  id_maquina: number;
  id_mapa: number;
  taloes: TalaoProducaoRequest[];  // ✅ Específicos
}

interface TalaoProducaoRequest {
  id_talao: number;
  estacao_numero: number;
  quantidade: number;
  tempo_ciclo_segundos?: number;
}
```

#### **2. Fluxo Hierárquico:**
- **Máquina PAI** (multipostos): Contexto do mapa geral
- **Máquinas FILHAS**: Contexto com talões específicos por estação
- **Distribuição automática**: Talão → Estação → Máquina Filha

#### **3. Validações Robustas:**
- ✅ Talões existem no mapa
- ✅ Estações corretas  
- ✅ Quantidades válidas
- ✅ Máquina deve ser multipostos
- ✅ Mapeamento estação → filha

#### **4. Contextos Diferenciados:**
```json
// Máquina PAI
{
  "producao_mapa": {
    "tipo": "mapa_pai",
    "id_mapa": 1,
    "estacoes_ativas": 2,
    "total_taloes": 3
  }
}

// Máquina FILHA  
{
  "producao_mapa": {
    "tipo": "estacao_especifica", 
    "estacao_numero": 1,
    "taloes": [...],  // Talões específicos
    "quantidade_total": 50
  }
}
```

### **🎯 RESULTADO:**
- **Produção precisa**: Apenas talões solicitados
- **Distribuição correta**: Filhas recebem apenas seus talões
- **Contextos específicos**: PAI coordena, FILHAS executam
- **Validação completa**: Dados consistentes no Supabase

**A correção garante que o sistema funcione exatamente como o usuário especificou!** 🎉
