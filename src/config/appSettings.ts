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
export async function loadSettings(forceReload: boolean = false): Promise<AppSettings> {
  // ✅ NOVO: Sempre limpar cache se forçado ou se houver valores antigos
  // Isso força o reload do settings.json a cada inicialização
  if (forceReload || cachedSettings) {
    if (cachedSettings) {
      console.log('🔄 Cache encontrado, mas forçando reload do settings.json para garantir valores corretos');
    }
    cachedSettings = null;
  }

  try {
    // ✅ FORÇAR: Tentar carregar de settings.json na raiz SEM cache (adicionar timestamp)
    // Isso garante que sempre busque a versão mais recente do arquivo
    const cacheBuster = `?t=${Date.now()}`;
    console.log('📥 Tentando carregar settings.json...');
    const response = await fetch(`/settings.json${cacheBuster}`, {
      cache: 'no-store', // ✅ Forçar busca sem cache
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    console.log('📥 Response do settings.json:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url
    });
    
    if (response.ok) {
      const settings = await response.json() as AppSettings;
      console.log('📋 Conteúdo bruto do settings.json:', settings);
      
      // Validar configurações
      if (settings.apiBaseUrl && settings.companyName) {
        cachedSettings = {
          apiBaseUrl: settings.apiBaseUrl.trim(),
          companyName: settings.companyName.trim()
        };
        console.log('✅ Configurações carregadas de settings.json:', cachedSettings);
        console.log('✅ Origem: settings.json (arquivo)');
        
        // ✅ NOVO: Sempre limpar localStorage ao carregar do settings.json
        try {
          const oldLocalStorage = localStorage.getItem('app_settings');
          if (oldLocalStorage) {
            const oldSettings = JSON.parse(oldLocalStorage);
            if (oldSettings.apiBaseUrl !== cachedSettings.apiBaseUrl) {
              console.warn('⚠️ localStorage tinha IP diferente! Limpando...', {
                localStorage: oldSettings.apiBaseUrl,
                settingsJson: cachedSettings.apiBaseUrl
              });
            }
          }
          localStorage.removeItem('app_settings');
          console.log('🧹 localStorage limpo para evitar conflitos');
        } catch (e) {
          console.warn('⚠️ Erro ao limpar localStorage:', e);
        }
        
        return cachedSettings;
      } else {
        console.warn('⚠️ settings.json inválido (campos faltando):', {
          temApiBaseUrl: !!settings.apiBaseUrl,
          temCompanyName: !!settings.companyName,
          settings
        });
      }
    } else {
      console.error(`❌ settings.json retornou status ${response.status} ${response.statusText}`);
      console.warn(`⚠️ Tentando localStorage como fallback...`);
    }
  } catch (error) {
    // Arquivo não encontrado ou erro de leitura - tentar localStorage
    console.error('❌ Erro ao carregar settings.json:', error);
    console.log('📋 Tentando localStorage como fallback...');
    
    try {
      const stored = localStorage.getItem('app_settings');
      if (stored) {
        const settings = JSON.parse(stored) as AppSettings;
        if (settings.apiBaseUrl && settings.companyName) {
          cachedSettings = settings;
          console.log('✅ Configurações carregadas de localStorage:', cachedSettings);
          console.warn('⚠️ ATENÇÃO: Usando configurações do localStorage. Para usar settings.json, limpe o localStorage.');
          console.warn('⚠️ Para limpar, execute: localStorage.removeItem("app_settings"); location.reload();');
          return cachedSettings;
        }
      } else {
        console.log('📋 localStorage vazio');
      }
    } catch (localError) {
      console.warn('⚠️ Erro ao ler localStorage:', localError);
    }
  }

  // Fallback para valores padrão
  console.warn('⚠️ Usando configurações padrão (fallback):', DEFAULT_SETTINGS);
  console.warn('⚠️ Isso significa que settings.json não foi encontrado ou está inválido');
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
 * Limpa o cache E o localStorage (força recarregar do settings.json)
 */
export function clearAllSettingsCache(): void {
  cachedSettings = null;
  try {
    localStorage.removeItem('app_settings');
    console.log('🧹 Cache e localStorage de configurações limpos');
  } catch (error) {
    console.error('❌ Erro ao limpar localStorage:', error);
  }
}

/**
 * Obtém o nome da empresa (com fallback)
 */
export function getCompanyName(): string {
  return getSettingsSync().companyName;
}

/**
 * Obtém a URL base da API (com fallback)
 * ⚠️ IMPORTANTE: Se as configurações ainda não foram carregadas, retorna valores padrão
 * Use await loadSettings() antes de chamar esta função para garantir valores atualizados
 */
export function getApiBaseUrl(): string {
  const settings = getSettingsSync();
  console.log('🔍 getApiBaseUrl() chamado - usando:', settings.apiBaseUrl);
  return settings.apiBaseUrl;
}

/**
 * Obtém a URL base da API de forma assíncrona (garante que as configurações foram carregadas)
 */
export async function getApiBaseUrlAsync(): Promise<string> {
  const settings = await loadSettings();
  console.log('🔍 getApiBaseUrlAsync() - configurações carregadas:', settings.apiBaseUrl);
  return settings.apiBaseUrl;
}

// Carregar configurações na inicialização
if (typeof window !== 'undefined') {
  // ✅ NOVO: Sempre limpar cache e localStorage na inicialização para garantir valores corretos
  console.log('🚀 Inicializando carregamento de configurações...');
  
  // ✅ NOVO: Verificar se há parâmetro na URL para limpar cache
  const urlParams = new URLSearchParams(window.location.search);
  const shouldClear = urlParams.get('clearSettings') === 'true';
  
  if (shouldClear) {
    clearAllSettingsCache();
    console.log('🧹 Cache limpo via parâmetro URL');
    // Remover parâmetro da URL após limpar
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('clearSettings');
    window.history.replaceState({}, '', newUrl.toString());
  }
  
  // ✅ NOVO: SEMPRE limpar localStorage durante desenvolvimento para forçar uso do settings.json
  // Em produção, o localStorage só será limpo se o settings.json for carregado com sucesso
  try {
    const stored = localStorage.getItem('app_settings');
    if (stored) {
      const oldSettings = JSON.parse(stored);
      console.warn('⚠️ localStorage encontrado com configurações:', oldSettings);
      
      // Se o IP no localStorage for diferente do esperado, limpar
      if (oldSettings.apiBaseUrl && oldSettings.apiBaseUrl.includes('192.168.1.22')) {
        console.warn('⚠️ IP incorreto detectado no localStorage! Limpando...');
        localStorage.removeItem('app_settings');
      } else if (shouldClear) {
        // Se o usuário pediu para limpar, limpar também
        localStorage.removeItem('app_settings');
        console.log('🧹 localStorage limpo');
      }
    }
  } catch (e) {
    // Ignorar erro
  }
  
  loadSettings(true).then(settings => {
    console.log('✅ Configurações finais carregadas:', {
      apiBaseUrl: settings.apiBaseUrl,
      companyName: settings.companyName,
      origem: cachedSettings === DEFAULT_SETTINGS ? 'padrão' : 'settings.json'
    });
    
    // ✅ NOVO: Verificar se o IP está correto e alertar se não for
    if (settings.apiBaseUrl.includes('192.168.1.22')) {
      console.error('❌ ERRO CRÍTICO: App está usando IP incorreto (192.168.1.22)!');
      console.error('❌ Esperado: IP do settings.json (http://10.200.0.184:8000)');
      console.error('❌ Possíveis causas:');
      console.error('   1. settings.json não está sendo carregado');
      console.error('   2. Cache do navegador');
      console.error('   3. localStorage com valores antigos');
      console.error('❌ Solução: Acesse com ?clearSettings=true ou execute:');
      console.error('   localStorage.removeItem("app_settings"); location.reload();');
    } else {
      console.log('✅ IP correto detectado:', settings.apiBaseUrl);
    }
  }).catch(err => {
    console.error('❌ Erro ao carregar configurações iniciais:', err);
  });
}

