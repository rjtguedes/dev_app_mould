// ⚙️ Configurações da Aplicação
// Este módulo gerencia as configurações dinâmicas do app IHM
// As configurações são carregadas de um arquivo settings.json na raiz do projeto

export interface AppSettings {
  // IP e porta do servidor SSE/API
  apiBaseUrl: string;
  
  // Nome da empresa (substitui "Mould" em todo o app)
  companyName: string;
}

// Valores padrão (fallback caso settings.json não exista)
const DEFAULT_SETTINGS: AppSettings = {
  apiBaseUrl: 'http://10.200.0.184:8000',
  companyName: 'Mould'
};

// Cache das configurações
let cachedSettings: AppSettings | null = null;

/**
 * Carrega as configurações do arquivo settings.json
 * Tenta carregar de várias fontes em ordem de prioridade:
 * 1. Arquivo settings.json na raiz do projeto (via fetch)
 * 2. localStorage (para desenvolvimento/testes)
 * 3. Valores padrão
 */
export async function loadSettings(): Promise<AppSettings> {
  // Se já temos configurações em cache, retornar
  if (cachedSettings) {
    return cachedSettings;
  }

  try {
    // Tentar carregar de settings.json na raiz
    const response = await fetch('/settings.json');
    if (response.ok) {
      const settings = await response.json() as AppSettings;
      
      // Validar configurações
      if (settings.apiBaseUrl && settings.companyName) {
        cachedSettings = {
          apiBaseUrl: settings.apiBaseUrl.trim(),
          companyName: settings.companyName.trim()
        };
        console.log('✅ Configurações carregadas de settings.json:', cachedSettings);
        return cachedSettings;
      } else {
        console.warn('⚠️ settings.json inválido, usando valores padrão');
      }
    }
  } catch (error) {
    // Arquivo não encontrado ou erro de leitura - tentar localStorage
    console.log('📋 settings.json não encontrado, tentando localStorage...');
    
    try {
      const stored = localStorage.getItem('app_settings');
      if (stored) {
        const settings = JSON.parse(stored) as AppSettings;
        if (settings.apiBaseUrl && settings.companyName) {
          cachedSettings = settings;
          console.log('✅ Configurações carregadas de localStorage:', cachedSettings);
          return cachedSettings;
        }
      }
    } catch (localError) {
      console.warn('⚠️ Erro ao ler localStorage:', localError);
    }
  }

  // Fallback para valores padrão
  console.log('📋 Usando configurações padrão:', DEFAULT_SETTINGS);
  cachedSettings = DEFAULT_SETTINGS;
  return cachedSettings;
}

/**
 * Carrega as configurações de forma síncrona (usa cache ou padrão)
 * Útil para inicialização rápida antes do fetch assíncrono
 */
export function getSettingsSync(): AppSettings {
  if (cachedSettings) {
    return cachedSettings;
  }
  return DEFAULT_SETTINGS;
}

/**
 * Salva configurações no localStorage (útil para testes/desenvolvimento)
 */
export function saveSettingsToLocalStorage(settings: AppSettings): void {
  try {
    localStorage.setItem('app_settings', JSON.stringify(settings));
    cachedSettings = settings;
    console.log('✅ Configurações salvas no localStorage:', settings);
  } catch (error) {
    console.error('❌ Erro ao salvar configurações no localStorage:', error);
  }
}

/**
 * Limpa o cache de configurações (força recarregar)
 */
export function clearSettingsCache(): void {
  cachedSettings = null;
}

/**
 * Obtém o nome da empresa (com fallback)
 */
export function getCompanyName(): string {
  return getSettingsSync().companyName;
}

/**
 * Obtém a URL base da API (com fallback)
 */
export function getApiBaseUrl(): string {
  return getSettingsSync().apiBaseUrl;
}

// Carregar configurações na inicialização
if (typeof window !== 'undefined') {
  loadSettings().catch(err => {
    console.error('❌ Erro ao carregar configurações iniciais:', err);
  });
}

