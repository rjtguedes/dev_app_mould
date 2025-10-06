import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import hashlib
import json
import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
import os
import pyperclip
import requests
import uuid

class OperatorCreatorGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Criador de Operadores Completos - Sistema Mould")
        self.root.geometry("900x800")
        self.root.configure(bg="#f0f0f0")
        
        # Configurações do Supabase
        self.SUPABASE_URL = "https://oixnkjcvkfdimwoikzgl.supabase.co"
        self.SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9peG5ramN2a2ZkaW13b2lremdsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5NzY1OTkzOCwiZXhwIjoyMDEzMjM1OTM4fQ.-S6GRERKTCpIKHaW1Ma-u_X_0zrYDHnhzAtM3Q2xTZ8"
        self.DEFAULT_PASSWORD = "indus1234"
        self.DEFAULT_EMPRESA_ID = 5
        
        # Configurar estilo
        style = ttk.Style()
        style.theme_use('clam')
        
        self.setup_ui()
    
    def setup_ui(self):
        # Título principal
        title_frame = tk.Frame(self.root, bg="#2563eb", height=80)
        title_frame.pack(fill="x", padx=0, pady=0)
        title_frame.pack_propagate(False)
        
        title_label = tk.Label(
            title_frame, 
            text="🏭 Criador de Operadores Completos - Sistema Mould",
            font=("Arial", 16, "bold"),
            fg="white",
            bg="#2563eb"
        )
        title_label.pack(expand=True)
        
        # Frame principal
        main_frame = tk.Frame(self.root, bg="#f0f0f0")
        main_frame.pack(fill="both", expand=True, padx=20, pady=20)
        
        # Seção de entrada de dados
        input_frame = tk.LabelFrame(
            main_frame, 
            text="👤 Dados do Operador", 
            font=("Arial", 12, "bold"),
            bg="#f0f0f0",
            fg="#333333"
        )
        input_frame.pack(fill="x", pady=(0, 20))
        
        # Nome do operador
        tk.Label(input_frame, text="Nome Completo:", font=("Arial", 10, "bold"), bg="#f0f0f0").grid(row=0, column=0, sticky="w", padx=10, pady=10)
        self.nome_var = tk.StringVar()
        self.nome_entry = tk.Entry(
            input_frame, 
            textvariable=self.nome_var,
            font=("Arial", 12),
            width=40
        )
        self.nome_entry.grid(row=0, column=1, columnspan=2, padx=10, pady=10, sticky="w")
        
        # Email
        tk.Label(input_frame, text="Email:", font=("Arial", 10, "bold"), bg="#f0f0f0").grid(row=1, column=0, sticky="w", padx=10, pady=10)
        self.email_var = tk.StringVar()
        self.email_entry = tk.Entry(
            input_frame, 
            textvariable=self.email_var,
            font=("Arial", 12),
            width=40
        )
        self.email_entry.grid(row=1, column=1, columnspan=2, padx=10, pady=10, sticky="w")
        
        # PIN
        tk.Label(input_frame, text="PIN (4 dígitos):", font=("Arial", 10, "bold"), bg="#f0f0f0").grid(row=2, column=0, sticky="w", padx=10, pady=10)
        self.pin_var = tk.StringVar()
        self.pin_entry = tk.Entry(
            input_frame, 
            textvariable=self.pin_var,
            font=("Arial", 12),
            width=20,
            validate="key",
            validatecommand=(self.root.register(self.validate_pin), '%P')
        )
        self.pin_entry.grid(row=2, column=1, padx=10, pady=10, sticky="w")
        
        # Cargo
        tk.Label(input_frame, text="Cargo:", font=("Arial", 10, "bold"), bg="#f0f0f0").grid(row=3, column=0, sticky="w", padx=10, pady=10)
        self.cargo_var = tk.StringVar()
        self.cargo_entry = tk.Entry(
            input_frame, 
            textvariable=self.cargo_var,
            font=("Arial", 12),
            width=40
        )
        self.cargo_entry.grid(row=3, column=1, columnspan=2, padx=10, pady=10, sticky="w")
        
        # Informações fixas
        info_frame = tk.Frame(input_frame, bg="#e8f4f8", relief="groove", bd=2)
        info_frame.grid(row=4, column=0, columnspan=3, padx=10, pady=15, sticky="ew")
        
        tk.Label(info_frame, text="ℹ️ Configurações Automáticas:", font=("Arial", 10, "bold"), bg="#e8f4f8", fg="#0369a1").pack(anchor="w", padx=10, pady=5)
        tk.Label(info_frame, text=f"• Senha padrão: {self.DEFAULT_PASSWORD}", font=("Arial", 9), bg="#e8f4f8").pack(anchor="w", padx=20)
        tk.Label(info_frame, text=f"• Empresa ID: {self.DEFAULT_EMPRESA_ID}", font=("Arial", 9), bg="#e8f4f8").pack(anchor="w", padx=20)
        tk.Label(info_frame, text="• Criptografia AES-256-CBC compatível com TypeScript", font=("Arial", 9), bg="#e8f4f8").pack(anchor="w", padx=20)
        
        # Botões de ação
        button_frame = tk.Frame(input_frame, bg="#f0f0f0")
        button_frame.grid(row=5, column=0, columnspan=3, pady=20)
        
        self.create_btn = tk.Button(
            button_frame,
            text="🏭 Criar Operador Completo",
            command=self.create_complete_operator,
            font=("Arial", 12, "bold"),
            bg="#10b981",
            fg="white",
            padx=20,
            pady=10,
            cursor="hand2"
        )
        self.create_btn.pack(side="left", padx=10)
        
        self.clear_btn = tk.Button(
            button_frame,
            text="🗑️ Limpar",
            command=self.clear_fields,
            font=("Arial", 12, "bold"),
            bg="#ef4444",
            fg="white",
            padx=20,
            pady=10,
            cursor="hand2"
        )
        self.clear_btn.pack(side="left", padx=10)
        
        self.test_btn = tk.Button(
            button_frame,
            text="🔍 Testar Sistema",
            command=self.test_system,
            font=("Arial", 12, "bold"),
            bg="#3b82f6",
            fg="white",
            padx=20,
            pady=10,
            cursor="hand2",
            state="disabled"
        )
        self.test_btn.pack(side="left", padx=10)
        
        # Seção de resultados
        result_frame = tk.LabelFrame(
            main_frame, 
            text="📋 Log de Execução", 
            font=("Arial", 12, "bold"),
            bg="#f0f0f0",
            fg="#333333"
        )
        result_frame.pack(fill="both", expand=True)
        
        # Área de texto para resultados
        self.result_text = scrolledtext.ScrolledText(
            result_frame,
            height=15,
            font=("Consolas", 9),
            bg="#ffffff",
            fg="#333333",
            wrap=tk.WORD
        )
        self.result_text.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Botões para resultados
        result_button_frame = tk.Frame(result_frame, bg="#f0f0f0")
        result_button_frame.pack(fill="x", padx=10, pady=(0, 10))
        
        self.copy_credentials_btn = tk.Button(
            result_button_frame,
            text="📋 Copiar Credenciais",
            command=self.copy_credentials,
            font=("Arial", 10, "bold"),
            bg="#8b5cf6",
            fg="white",
            padx=15,
            pady=5,
            cursor="hand2",
            state="disabled"
        )
        self.copy_credentials_btn.pack(side="left", padx=5)
        
        self.export_data_btn = tk.Button(
            result_button_frame,
            text="💾 Exportar Dados",
            command=self.export_operator_data,
            font=("Arial", 10, "bold"),
            bg="#f59e0b",
            fg="white",
            padx=15,
            pady=5,
            cursor="hand2",
            state="disabled"
        )
        self.export_data_btn.pack(side="left", padx=5)
        
        # Variáveis para armazenar dados criados
        self.created_operator = None
        
    def validate_pin(self, value):
        """Valida se o PIN tem apenas dígitos e máximo 4 caracteres"""
        if len(value) <= 4 and (value.isdigit() or value == ""):
            return True
        return False
    
    def log_message(self, message, level="INFO"):
        """Adiciona mensagem ao log"""
        timestamp = tk.Toplevel().winfo_toplevel().tk.call('clock', 'format', tk.Toplevel().winfo_toplevel().tk.call('clock', 'seconds'), '-format', '%H:%M:%S')
        tk.Toplevel().destroy()
        
        icons = {"INFO": "ℹ️", "SUCCESS": "✅", "ERROR": "❌", "WARNING": "⚠️"}
        icon = icons.get(level, "📝")
        
        formatted_message = f"[{timestamp}] {icon} {message}\n"
        self.result_text.insert(tk.END, formatted_message)
        self.result_text.see(tk.END)
        self.root.update()
    
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
    
    def create_supabase_user(self, email: str, password: str) -> str:
        """Cria usuário no Supabase Auth"""
        try:
            headers = {
                "Authorization": f"Bearer {self.SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
                "apikey": self.SUPABASE_SERVICE_KEY
            }
            
            payload = {
                "email": email,
                "password": password,
                "email_confirm": True  # Auto-confirma o email
            }
            
            response = requests.post(
                f"{self.SUPABASE_URL}/auth/v1/admin/users",
                headers=headers,
                json=payload
            )
            
            if response.status_code == 200:
                user_data = response.json()
                return user_data["id"]
            else:
                error_data = response.json() if response.content else {}
                raise Exception(f"Erro HTTP {response.status_code}: {error_data.get('message', 'Erro desconhecido')}")
                
        except Exception as e:
            raise Exception(f"Erro ao criar usuário: {str(e)}")
    
    def create_operador_record(self, user_id: str, nome: str, cargo: str) -> int:
        """Cria registro na tabela operador"""
        try:
            headers = {
                "Authorization": f"Bearer {self.SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
                "apikey": self.SUPABASE_SERVICE_KEY,
                "Prefer": "return=representation"
            }
            
            payload = {
                "nome": nome,
                "empresa": self.DEFAULT_EMPRESA_ID,
                "cargo": cargo,
                "user": user_id,
                "em_trabalho": False,
                "Delete": False,
                "dashboard_view_style": "grid"
            }
            
            response = requests.post(
                f"{self.SUPABASE_URL}/rest/v1/operador",
                headers=headers,
                json=payload
            )
            
            if response.status_code == 201:
                operador_data = response.json()
                return operador_data[0]["id"]
            else:
                error_data = response.json() if response.content else {}
                raise Exception(f"Erro HTTP {response.status_code}: {error_data.get('message', 'Erro desconhecido')}")
                
        except Exception as e:
            raise Exception(f"Erro ao criar operador: {str(e)}")
    
    def create_fast_access(self, pin: int, encrypted_acess: str, user_id: str, operador_id: int):
        """Cria registro na tabela operator_fast_acess"""
        try:
            headers = {
                "Authorization": f"Bearer {self.SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
                "apikey": self.SUPABASE_SERVICE_KEY
            }
            
            payload = {
                "PIN": pin,
                "encrypted_acess": encrypted_acess,
                "user": user_id,
                "operador": operador_id
            }
            
            response = requests.post(
                f"{self.SUPABASE_URL}/rest/v1/operator_fast_acess",
                headers=headers,
                json=payload
            )
            
            if response.status_code not in [200, 201]:
                error_data = response.json() if response.content else {}
                raise Exception(f"Erro HTTP {response.status_code}: {error_data.get('message', 'Erro desconhecido')}")
                
        except Exception as e:
            raise Exception(f"Erro ao criar acesso rápido: {str(e)}")
    
    def create_public_user_record(self, user_id: str, email: str, nome: str):
        """Cria registro na tabela public.users (necessário para RLS)"""
        try:
            headers = {
                "Authorization": f"Bearer {self.SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
                "apikey": self.SUPABASE_SERVICE_KEY,
                "Prefer": "return=representation"
            }
            
            # Separar nome em first_name e last_name
            nome_parts = nome.strip().split()
            first_name = nome_parts[0] if nome_parts else ""
            last_name = " ".join(nome_parts[1:]) if len(nome_parts) > 1 else ""
            
            payload = {
                "id": user_id,
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "id_empresa": self.DEFAULT_EMPRESA_ID,
                "Nivel": 2  # Nível padrão para operadores
            }
            
            # Primeiro, tentar fazer UPDATE se o registro já existir
            response = requests.patch(
                f"{self.SUPABASE_URL}/rest/v1/users?id=eq.{user_id}",
                headers=headers,
                json=payload
            )
            
            # Se não encontrou registro para UPDATE (count=0), fazer INSERT
            if response.status_code == 200:
                updated_count = len(response.json()) if response.json() else 0
                if updated_count == 0:
                    # Registro não existe, fazer INSERT
                    response = requests.post(
                        f"{self.SUPABASE_URL}/rest/v1/users",
                        headers=headers,
                        json=payload
                    )
                    
                    if response.status_code != 201:
                        error_data = response.json() if response.content else {}
                        raise Exception(f"Erro HTTP INSERT {response.status_code}: {error_data.get('message', 'Erro desconhecido')}")
                # else: UPDATE foi bem-sucedido
                
                return True
            else:
                error_data = response.json() if response.content else {}
                raise Exception(f"Erro HTTP UPDATE {response.status_code}: {error_data.get('message', 'Erro desconhecido')}")
                
        except Exception as e:
            raise Exception(f"Erro ao criar registro public.users: {str(e)}")
    
    def create_complete_operator(self):
        """Cria operador completo no sistema"""
        try:
            # Validar campos
            nome = self.nome_var.get().strip()
            email = self.email_var.get().strip()
            pin = self.pin_var.get().strip()
            cargo = self.cargo_var.get().strip()
            
            if not nome:
                messagebox.showerror("Erro", "Nome é obrigatório!")
                return
            
            if not email or "@" not in email:
                messagebox.showerror("Erro", "Email inválido!")
                return
            
            if not pin or len(pin) != 4:
                messagebox.showerror("Erro", "PIN deve ter exatamente 4 dígitos!")
                return
            
            if not cargo:
                messagebox.showerror("Erro", "Cargo é obrigatório!")
                return
            
            # Limpar log
            self.result_text.delete(1.0, tk.END)
            self.log_message("🚀 Iniciando criação de operador completo...")
            
            # Etapa 1: Criar credenciais criptografadas
            self.log_message("🔐 Gerando credenciais criptografadas...")
            credentials = self.create_operator_credentials(pin, email, self.DEFAULT_PASSWORD)
            self.log_message("✅ Credenciais criptografadas geradas com sucesso", "SUCCESS")
            
            # Etapa 2: Criar usuário no Supabase
            self.log_message("👤 Criando usuário no Supabase Auth...")
            user_id = self.create_supabase_user(email, self.DEFAULT_PASSWORD)
            self.log_message(f"✅ Usuário criado com ID: {user_id}", "SUCCESS")
            
            # Etapa 3: Criar registro na tabela public.users
            self.log_message("👤 Criando/atualizando registro na tabela public.users...")
            self.create_public_user_record(user_id, email, nome)
            self.log_message(f"✅ Registro public.users processado com ID: {user_id}", "SUCCESS")
            
            # Etapa 4: Criar registro operador
            self.log_message("📝 Criando registro na tabela operador...")
            operador_id = self.create_operador_record(user_id, nome, cargo)
            self.log_message(f"✅ Operador criado com ID: {operador_id}", "SUCCESS")
            
            # Etapa 5: Criar acesso rápido
            self.log_message("🔑 Criando acesso rápido (PIN)...")
            self.create_fast_access(
                credentials["PIN"], 
                credentials["encrypted_acess"], 
                user_id, 
                operador_id
            )
            self.log_message(f"✅ Acesso rápido criado com PIN: {credentials['PIN']}", "SUCCESS")
            
            # Salvar dados criados
            self.created_operator = {
                "nome": nome,
                "email": email,
                "cargo": cargo,
                "pin": credentials["PIN"],
                "password": self.DEFAULT_PASSWORD,
                "user_id": user_id,
                "operador_id": operador_id,
                "empresa_id": self.DEFAULT_EMPRESA_ID
            }
            
            # Exibir resumo final
            self.log_message("", "INFO")
            self.log_message("🎉 OPERADOR CRIADO COM SUCESSO!", "SUCCESS")
            self.log_message("", "INFO")
            self.log_message("📊 RESUMO DOS DADOS CRIADOS:")
            self.log_message(f"• Nome: {nome}")
            self.log_message(f"• Email: {email}")
            self.log_message(f"• Cargo: {cargo}")
            self.log_message(f"• PIN: {credentials['PIN']}")
            self.log_message(f"• Senha: {self.DEFAULT_PASSWORD}")
            self.log_message(f"• User ID: {user_id}")
            self.log_message(f"• Operador ID: {operador_id}")
            self.log_message(f"• Empresa ID: {self.DEFAULT_EMPRESA_ID}")
            self.log_message("", "INFO")
            self.log_message("✅ O operador já pode fazer login no sistema usando o PIN!")
            
            # Habilitar botões
            self.test_btn.config(state="normal")
            self.copy_credentials_btn.config(state="normal")
            self.export_data_btn.config(state="normal")
            
            messagebox.showinfo("Sucesso", f"Operador '{nome}' criado com sucesso!\nPIN: {credentials['PIN']}")
            
        except Exception as e:
            self.log_message(f"❌ ERRO: {str(e)}", "ERROR")
            messagebox.showerror("Erro", f"Erro ao criar operador:\n{str(e)}")
    
    def test_system(self):
        """Testa o sistema completo"""
        if not self.created_operator:
            messagebox.showerror("Erro", "Crie um operador primeiro!")
            return
        
        try:
            self.log_message("", "INFO")
            self.log_message("🔍 INICIANDO TESTE DO SISTEMA...")
            
            # Teste 1: Verificar se usuário existe
            self.log_message("1️⃣ Verificando usuário no Supabase...")
            headers = {
                "Authorization": f"Bearer {self.SUPABASE_SERVICE_KEY}",
                "apikey": self.SUPABASE_SERVICE_KEY
            }
            
            response = requests.get(
                f"{self.SUPABASE_URL}/auth/v1/admin/users/{self.created_operator['user_id']}",
                headers=headers
            )
            
            if response.status_code == 200:
                self.log_message("✅ Usuário encontrado no Supabase Auth", "SUCCESS")
            else:
                self.log_message("❌ Usuário não encontrado", "ERROR")
                return
            
            # Teste 2: Verificar operador
            self.log_message("2️⃣ Verificando registro operador...")
            response = requests.get(
                f"{self.SUPABASE_URL}/rest/v1/operador?id=eq.{self.created_operator['operador_id']}",
                headers=headers
            )
            
            if response.status_code == 200 and response.json():
                self.log_message("✅ Registro operador encontrado", "SUCCESS")
            else:
                self.log_message("❌ Registro operador não encontrado", "ERROR")
                return
            
            # Teste 3: Verificar registro public.users
            self.log_message("3️⃣ Verificando registro public.users...")
            response = requests.get(
                f"{self.SUPABASE_URL}/rest/v1/users?id=eq.{self.created_operator['user_id']}",
                headers=headers
            )
            
            if response.status_code == 200 and response.json():
                user_data = response.json()[0]
                if user_data.get('email') and user_data.get('id_empresa'):
                    self.log_message("✅ Registro public.users encontrado com email e empresa", "SUCCESS")
                else:
                    self.log_message("❌ Registro public.users incompleto (falta email ou empresa)", "ERROR")
                    return
            else:
                self.log_message("❌ Registro public.users não encontrado", "ERROR")
                return
            
            # Teste 4: Verificar acesso rápido
            self.log_message("4️⃣ Verificando acesso rápido...")
            response = requests.get(
                f"{self.SUPABASE_URL}/rest/v1/operator_fast_acess?PIN=eq.{self.created_operator['pin']}",
                headers=headers
            )
            
            if response.status_code == 200 and response.json():
                self.log_message("✅ Acesso rápido encontrado", "SUCCESS")
            else:
                self.log_message("❌ Acesso rápido não encontrado", "ERROR")
                return
            
            # Teste 5: Testar descriptografia
            self.log_message("5️⃣ Testando descriptografia...")
            try:
                credentials = self.create_operator_credentials(
                    str(self.created_operator['pin']), 
                    self.created_operator['email'], 
                    self.DEFAULT_PASSWORD
                )
                self.log_message("✅ Descriptografia funcionando", "SUCCESS")
            except:
                self.log_message("❌ Erro na descriptografia", "ERROR")
                return
            
            self.log_message("", "INFO")
            self.log_message("🎉 TODOS OS TESTES PASSARAM!", "SUCCESS")
            self.log_message("✅ O sistema está funcionando perfeitamente!", "SUCCESS")
            
            messagebox.showinfo("Teste OK", "Todos os testes passaram!\nO operador pode fazer login normalmente.")
            
        except Exception as e:
            self.log_message(f"❌ ERRO NO TESTE: {str(e)}", "ERROR")
            messagebox.showerror("Erro no Teste", f"Falha no teste:\n{str(e)}")
    
    def copy_credentials(self):
        """Copia credenciais para área de transferência"""
        if not self.created_operator:
            messagebox.showerror("Erro", "Crie um operador primeiro!")
            return
        
        credentials_text = f"""CREDENCIAIS DO OPERADOR
Nome: {self.created_operator['nome']}
Email: {self.created_operator['email']}
Cargo: {self.created_operator['cargo']}
PIN: {self.created_operator['pin']}
Senha: {self.created_operator['password']}
User ID: {self.created_operator['user_id']}
Operador ID: {self.created_operator['operador_id']}"""
        
        pyperclip.copy(credentials_text)
        messagebox.showinfo("Copiado", "Credenciais copiadas para a área de transferência!")
    
    def export_operator_data(self):
        """Exporta dados do operador para arquivo"""
        if not self.created_operator:
            messagebox.showerror("Erro", "Crie um operador primeiro!")
            return
        
        try:
            filename = f"operador_{self.created_operator['pin']}.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.created_operator, f, indent=2, ensure_ascii=False)
            
            messagebox.showinfo("Exportado", f"Dados exportados para {filename}")
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao exportar: {str(e)}")
    
    def clear_fields(self):
        """Limpa todos os campos"""
        self.nome_var.set("")
        self.email_var.set("")
        self.pin_var.set("")
        self.cargo_var.set("")
        self.result_text.delete(1.0, tk.END)
        self.created_operator = None
        
        # Desabilitar botões
        self.test_btn.config(state="disabled")
        self.copy_credentials_btn.config(state="disabled")
        self.export_data_btn.config(state="disabled")
        
        self.nome_entry.focus()

def main():
    try:
        import pyperclip
        import requests
    except ImportError:
        print("Instalando dependências...")
        import subprocess
        subprocess.check_call(["pip", "install", "pyperclip", "requests"])
        import pyperclip
        import requests
    
    root = tk.Tk()
    app = OperatorCreatorGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main() 