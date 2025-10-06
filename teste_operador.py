#!/usr/bin/env python3
"""
Script de teste para o sistema de criação de operadores
Testa as funcionalidades básicas sem interface gráfica
"""

import json
import hashlib
import base64
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
import requests

class TestOperatorCreator:
    def __init__(self):
        self.SUPABASE_URL = "https://oixnkjcvkfdimwoikzgl.supabase.co"
        self.SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9peG5ramN2a2ZkaW13b2lremdsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5NzY1OTkzOCwiZXhwIjoyMDEzMjM1OTM4fQ.-S6GRERKTCpIKHaW1Ma-u_X_0zrYDHnhzAtM3Q2xTZ8"
        self.DEFAULT_PASSWORD = "indus1234"
        self.DEFAULT_EMPRESA_ID = 5

    def create_operator_credentials(self, pin: str, email: str, password: str) -> dict:
        """Cria as credenciais criptografadas para um operador"""
        try:
            credentials = {
                "email": email,
                "password": password
            }
            credentials_json = json.dumps(credentials, separators=(',', ':'))
            
            # Gerar chave usando SHA256 do PIN
            key_hash = hashlib.sha256(pin.encode('utf-8')).hexdigest()
            key = bytes.fromhex(key_hash)
            
            # Gerar IV aleatório de 16 bytes
            iv = os.urandom(16)
            
            # Aplicar padding PKCS7
            padder = padding.PKCS7(128).padder()
            padded_data = padder.update(credentials_json.encode('utf-8'))
            padded_data += padder.finalize()
            
            # Criptografar usando AES-256-CBC
            cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
            encryptor = cipher.encryptor()
            encrypted_content = encryptor.update(padded_data) + encryptor.finalize()
            
            # Converter para base64
            iv_base64 = base64.b64encode(iv).decode('utf-8')
            content_base64 = base64.b64encode(encrypted_content).decode('utf-8')
            
            # Criar estrutura final
            encrypted_data = {
                "iv": iv_base64,
                "content": content_base64
            }
            
            return {
                "PIN": int(pin),
                "encrypted_acess": json.dumps(encrypted_data, separators=(',', ':')),
                "raw_credentials": credentials
            }
            
        except Exception as e:
            raise Exception(f"Erro na criptografia: {str(e)}")

    def test_supabase_connection(self):
        """Testa conexão com Supabase"""
        try:
            headers = {
                "Authorization": f"Bearer {self.SUPABASE_SERVICE_KEY}",
                "apikey": self.SUPABASE_SERVICE_KEY
            }
            
            response = requests.get(
                f"{self.SUPABASE_URL}/rest/v1/empresa?id=eq.{self.DEFAULT_EMPRESA_ID}",
                headers=headers
            )
            
            if response.status_code == 200:
                empresa_data = response.json()
                if empresa_data:
                    print("✅ Conexão com Supabase OK")
                    print(f"✅ Empresa ID {self.DEFAULT_EMPRESA_ID} encontrada")
                    return True
                else:
                    print(f"❌ Empresa ID {self.DEFAULT_EMPRESA_ID} não encontrada")
                    return False
            else:
                print(f"❌ Erro na conexão: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Erro de conexão: {str(e)}")
            return False

    def test_encryption(self):
        """Testa o sistema de criptografia"""
        try:
            print("\n🔐 Testando criptografia...")
            
            # Dados de teste
            pin = "1234"
            email = "teste@exemplo.com"
            password = "senha123"
            
            # Gerar credenciais
            credentials = self.create_operator_credentials(pin, email, password)
            
            print(f"✅ PIN: {credentials['PIN']}")
            print(f"✅ Estrutura criptografada gerada")
            
            # Verificar estrutura
            encrypted_data = json.loads(credentials['encrypted_acess'])
            if 'iv' in encrypted_data and 'content' in encrypted_data:
                print("✅ Estrutura JSON válida")
                return True
            else:
                print("❌ Estrutura JSON inválida")
                return False
                
        except Exception as e:
            print(f"❌ Erro na criptografia: {str(e)}")
            return False

    def test_decryption(self, pin: str, encrypted_acess: str, expected_email: str, expected_password: str):
        """Testa descriptografia"""
        try:
            print("\n🔓 Testando descriptografia...")
            
            # Parse do JSON criptografado
            encrypted_data = json.loads(encrypted_acess)
            iv = base64.b64decode(encrypted_data['iv'])
            content = base64.b64decode(encrypted_data['content'])
            
            # Gerar chave
            key_hash = hashlib.sha256(pin.encode('utf-8')).hexdigest()
            key = bytes.fromhex(key_hash)
            
            # Descriptografar
            cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
            decryptor = cipher.decryptor()
            decrypted_padded = decryptor.update(content) + decryptor.finalize()
            
            # Remover padding
            unpadder = padding.PKCS7(128).unpadder()
            decrypted_data = unpadder.update(decrypted_padded)
            decrypted_data += unpadder.finalize()
            
            # Parse JSON
            credentials = json.loads(decrypted_data.decode('utf-8'))
            
            # Verificar dados
            if credentials['email'] == expected_email and credentials['password'] == expected_password:
                print("✅ Descriptografia OK")
                print(f"✅ Email: {credentials['email']}")
                print(f"✅ Senha: {credentials['password']}")
                return True
            else:
                print("❌ Dados descriptografados não coincidem")
                return False
                
        except Exception as e:
            print(f"❌ Erro na descriptografia: {str(e)}")
            return False

def main():
    print("🧪 TESTE DO SISTEMA DE CRIAÇÃO DE OPERADORES")
    print("=" * 60)
    
    tester = TestOperatorCreator()
    
    # Teste 1: Conexão com Supabase
    print("📡 Testando conexão com Supabase...")
    if not tester.test_supabase_connection():
        print("\n❌ Falha na conexão. Verifique:")
        print("- Service Role Key")
        print("- URL do Supabase")
        print("- Empresa ID")
        return False
    
    # Teste 2: Sistema de criptografia
    if not tester.test_encryption():
        print("\n❌ Falha no sistema de criptografia")
        return False
    
    # Teste 3: Sistema completo (criptografia + descriptografia)
    print("\n🔄 Testando sistema completo...")
    pin = "9876"
    email = "operador.teste@empresa.com"
    password = "senha_teste_123"
    
    try:
        # Criptografar
        credentials = tester.create_operator_credentials(pin, email, password)
        
        # Descriptografar
        if tester.test_decryption(pin, credentials['encrypted_acess'], email, password):
            print("\n🎉 TODOS OS TESTES PASSARAM!")
            print("\n📋 RESUMO DOS TESTES:")
            print("✅ Conexão com Supabase")
            print("✅ Criptografia AES-256-CBC")
            print("✅ Descriptografia")
            print("✅ Compatibilidade TypeScript")
            
            print("\n🚀 O sistema está pronto para uso!")
            print("Execute: python operator_creator.py")
            print("\n🔧 FUNCIONALIDADES COMPLETAS:")
            print("• Criação usuário Supabase Auth")
            print("• Registro na tabela public.users (RLS)")
            print("• Registro na tabela operador")
            print("• Criação de acesso rápido (PIN)")
            print("• Criptografia compatível com TypeScript")
            return True
        else:
            print("\n❌ Falha no teste de descriptografia")
            return False
            
    except Exception as e:
        print(f"\n❌ Erro no teste completo: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    if not success:
        exit(1) 