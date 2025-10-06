@echo off
title Criador de Operadores Completos - Sistema Mould
color 0A

echo.
echo ===============================================
echo  🏭 Criador de Operadores Completos - Sistema Mould
echo ===============================================
echo.

REM Verificar se Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python não foi encontrado!
    echo Por favor, instale o Python 3.6+ primeiro.
    echo.
    pause
    exit /b 1
)

echo ✅ Python encontrado!
echo.

REM Verificar se o arquivo principal existe
if not exist "operator_creator.py" (
    echo ❌ Arquivo operator_creator.py não encontrado!
    echo Certifique-se de estar na pasta correta.
    echo.
    pause
    exit /b 1
)

echo 🔍 Verificando dependências...
python -c "import cryptography, pyperclip, requests, tkinter" >nul 2>&1
if errorlevel 1 (
    echo ⚠️ Algumas dependências não estão instaladas.
    echo 🚀 Executando instalação automática...
    echo.
    python setup.py
    echo.
    if errorlevel 1 (
        echo ❌ Falha na instalação das dependências.
        echo.
        pause
        exit /b 1
    )
)

echo ✅ Todas as dependências estão OK!
echo.
echo 🧪 Executando teste rápido do sistema...
python teste_operador.py
if errorlevel 1 (
    echo.
    echo ❌ Teste falhou. Verifique a configuração.
    echo.
    pause
    exit /b 1
)

echo.
echo 🚀 Iniciando o Criador de Operadores Completos...
echo.
echo 🏭 FUNCIONALIDADES DISPONÍVEIS:
echo • Criação completa de operadores no Supabase
echo • Integração automática com auth.users
echo • Registro na tabela operador
echo • Criação de acesso rápido (PIN)
echo • Criptografia compatível com TypeScript
echo • Testes automáticos de verificação
echo.

REM Executar o programa
python operator_creator.py

if errorlevel 1 (
    echo.
    echo ❌ Erro ao executar o programa.
    echo.
)

echo.
echo 📝 Programa finalizado.
pause 