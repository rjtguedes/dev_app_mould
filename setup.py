#!/usr/bin/env python3
"""
Setup script para o Criador de Operadores Completos - Sistema Mould
Instala automaticamente todas as dependências necessárias
"""

import subprocess
import sys
import os

def install_package(package):
    """Instala um pacote usando pip"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print(f"✅ {package} instalado com sucesso!")
        return True
    except subprocess.CalledProcessError:
        print(f"❌ Erro ao instalar {package}")
        return False

def check_python_version():
    """Verifica se a versão do Python é compatível"""
    if sys.version_info < (3, 6):
        print("❌ Python 3.6 ou superior é necessário!")
        print(f"Versão atual: {sys.version}")
        return False
    
    print(f"✅ Python {sys.version.split()[0]} - Compatível!")
    return True

def main():
    print("🏭 Criador de Operadores Completos - Sistema Mould")
    print("=" * 60)
    print("Instalando dependências...\n")
    
    # Verificar versão do Python
    if not check_python_version():
        sys.exit(1)
    
    # Lista de dependências
    packages = [
        "cryptography",
        "pyperclip",
        "requests"
    ]
    
    # Tentar instalar tkinter se não estiver disponível
    try:
        import tkinter
        print("✅ tkinter já está disponível!")
    except ImportError:
        print("⚠️ tkinter não encontrado. Tentando instalar...")
        packages.append("tk")
    
    # Instalar pacotes
    success_count = 0
    for package in packages:
        if install_package(package):
            success_count += 1
    
    print(f"\n📊 Resultado: {success_count}/{len(packages)} pacotes instalados")
    
    if success_count == len(packages):
        print("\n🎉 Instalação concluída com sucesso!")
        print("\nPara executar o programa:")
        print("python operator_creator.py")
        print("\n🏭 FUNCIONALIDADES:")
        print("• Criação completa de operadores no Supabase")
        print("• Integração automática com auth.users")
        print("• Registro na tabela operador")
        print("• Criação de acesso rápido (PIN)")
        print("• Criptografia compatível com TypeScript")
        print("• Testes automáticos de verificação")
        
        # Perguntar se quer executar agora
        if input("\n🚀 Executar o programa agora? (s/n): ").lower() in ['s', 'sim', 'y', 'yes']:
            try:
                import operator_creator
                operator_creator.main()
            except ImportError:
                print("❌ Arquivo operator_creator.py não encontrado!")
                print("Certifique-se de que está na pasta correta.")
    else:
        print("\n❌ Algumas dependências falharam na instalação.")
        print("Tente instalar manualmente:")
        for package in packages:
            print(f"pip install {package}")

if __name__ == "__main__":
    main() 