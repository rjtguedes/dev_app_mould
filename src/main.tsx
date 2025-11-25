import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { loadSettings } from './config/appSettings';

// Atualizar título da página com nome da empresa configurável
loadSettings().then(settings => {
  document.title = `Industrack - Operador ${settings.companyName}`;
}).catch(err => {
  console.error('Erro ao atualizar título:', err);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
