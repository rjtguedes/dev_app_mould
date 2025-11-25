#!/bin/bash
# Script para editar settings.json na pasta dist
# Uso: ./editar-settings.sh

# Navegar para a pasta dist
cd "$(dirname "$0")/dist" || exit 1

# Verificar se o arquivo existe
if [ ! -f "settings.json" ]; then
    echo "❌ Arquivo settings.json não encontrado na pasta dist"
    echo "📋 Certifique-se de que o build foi executado primeiro"
    exit 1
fi

# Abrir com nano
echo "📝 Abrindo settings.json com nano..."
echo "💡 Após editar, salve com Ctrl+O e saia com Ctrl+X"
echo ""
nano settings.json

