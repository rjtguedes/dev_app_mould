import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oixnkjcvkfdimwoikzgl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9peG5ramN2a2ZkaW13b2lremdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTc2NTk5MzgsImV4cCI6MjAxMzIzNTkzOH0.fVO0xa3_ZQDydPYdravbHX1j_vb1y52vIhgmbPZcdf4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'industrack_auth',
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

// Função utilitária para tratar erros de JWT expirado
export const handleJWTError = async (error: any) => {
  if (error.code === 'PGRST301' || error.message?.includes('JWT expired')) {
    console.log('JWT expirado, redirecionando para login...');
    // Limpar dados da sessão
    localStorage.removeItem('industrack_session');
    // Fazer logout e recarregar página
    await supabase.auth.signOut();
    window.location.reload();
    return true; // Indica que o erro foi tratado
  }
  return false; // Indica que o erro não foi tratado
};