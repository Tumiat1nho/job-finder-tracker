# 💼 Job Application Tracker API

API REST completa para gerenciar candidaturas de emprego com autenticação JWT, construída com FastAPI e SQLAlchemy.

> 🔒 **IMPORTANTE**: Este é um repositório público. NUNCA commite o arquivo `.env` com valores reais ou qualquer informação sensível. Veja [SECURITY.md](SECURITY.md) para diretrizes de segurança.

![Python](https://img.shields.io/badge/Python-3.9+-blue?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-00ff9f?style=for-the-badge&logo=fastapi)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-red?style=for-the-badge)

## 🎯 Features

- ✅ **Autenticação JWT** - Sistema seguro de login e registro
- ✅ **CRUD Completo** - Criar, ler, atualizar e deletar candidaturas
- ✅ **Multi-usuário** - Cada usuário vê apenas suas candidaturas
- ✅ **Validação de Dados** - Pydantic schemas para validação robusta
- ✅ **Documentação Automática** - Swagger UI e ReDoc
- ✅ **Status Tracking** - Acompanhe o status (esperando, entrevista, rejeitado)
- ✅ **Design System** - Cores cyber-minimalistas incluídas

## 🛠️ Tech Stack

- **FastAPI** - Framework web moderno e rápido
- **SQLAlchemy** - ORM poderoso para Python
- **SQLite** - Banco de dados leve (fácil trocar por PostgreSQL)
- **JWT** - Autenticação segura com tokens
- **Bcrypt** - Hash seguro de senhas
- **Pydantic** - Validação de dados
- **Uvicorn** - Servidor ASGI de alta performance

## 📁 Estrutura do Projeto

```
job-tracker-api/
├── app/
│   ├── __init__.py
│   ├── main.py              # App principal FastAPI
│   ├── database.py          # Configuração SQLAlchemy
│   ├── models.py            # Models do banco
│   ├── schemas.py           # Schemas Pydantic
│   ├── auth.py              # Autenticação JWT
│   └── routers/
│       ├── __init__.py
│       ├── auth_router.py   # Endpoints de autenticação
│       └── applications.py  # Endpoints de candidaturas
├── requirements.txt
├── .env
└── README.md
```

## 🚀 Instalação e Configuração

### 1. Clone o repositório

```bash
git clone https://github.com/devdiogotumiati/job-tracker-api.git
cd job-tracker-api
```

### 2. Crie ambiente virtual

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 3. Instale as dependências

```bash
pip install -r requirements.txt
```

### 4. Configure o .env (Opção Fácil)

Use o script de setup automático:

```bash
python setup.py
```

Isso vai:
- ✅ Copiar `.env.example` para `.env`
- ✅ Gerar uma SECRET_KEY segura automaticamente
- ✅ Configurar tudo para você

**OU manualmente:**

```bash
# 1. Copie o arquivo de exemplo
cp .env.example .env

# 2. Gere uma SECRET_KEY segura
python -c "import secrets; print(secrets.token_hex(32))"

# 3. Abra o .env e cole a SECRET_KEY gerada
```

**🔒 NUNCA commite o arquivo `.env` no Git!** Ele está no `.gitignore` por segurança.

### 5. Execute a API

```bash
uvicorn app.main:app --reload
```

A API estará disponível em: **http://localhost:8000**

## 📚 Documentação da API

Após iniciar o servidor, acesse:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔐 Autenticação

### Registrar novo usuário

```bash
POST /auth/register
Content-Type: application/json

{
  "email": "diogo@example.com",
  "password": "senha123"
}
```

### Login

```bash
POST /auth/login
Content-Type: application/x-www-form-urlencoded

username=diogo@example.com&password=senha123
```

Retorna:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Usar o token

Adicione o header em todas as requisições autenticadas:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📝 Endpoints de Candidaturas

### Listar todas as candidaturas

```bash
GET /applications
Authorization: Bearer {token}
```

### Criar nova candidatura

```bash
POST /applications
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "Desenvolvedor Python Júnior",
  "empresa": "Tech Company",
  "data": "2024-01-29",
  "role": "Backend Developer",
  "status": "esperando",
  "chance": 70
}
```

### Buscar candidatura específica

```bash
GET /applications/{id}
Authorization: Bearer {token}
```

### Atualizar candidatura

```bash
PUT /applications/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "entrevista",
  "chance": 85
}
```

### Deletar candidatura

```bash
DELETE /applications/{id}
Authorization: Bearer {token}
```

## 🎨 Design System

Cores incluídas na API (endpoint `/`):

```python
{
  "bg_primary": "#0a0e14",
  "bg_secondary": "#0f1419",
  "bg_card": "#151b23",
  "accent_primary": "#00ff9f",
  "text_primary": "#e6edf3",
  "text_secondary": "#8b949e"
}
```

## 📊 Modelo de Dados

### User
- `id`: Integer (PK)
- `email`: String (único)
- `hashed_password`: String
- `created_at`: DateTime

### Application
- `id`: Integer (PK)
- `nome`: String (nome da vaga)
- `empresa`: String
- `data`: String (YYYY-MM-DD)
- `role`: String (cargo)
- `status`: Enum (esperando, entrevista, rejeitado)
- `chance`: Integer (0-100)
- `user_id`: Integer (FK)
- `created_at`: DateTime
- `updated_at`: DateTime

## 🧪 Testando a API

### Com cURL

```bash
# 1. Registrar
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 2. Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=test123"

# 3. Criar candidatura (use o token do login)
curl -X POST http://localhost:8000/applications \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Dev Python","empresa":"Petrobras","data":"2024-01-29","role":"Backend","status":"esperando","chance":80}'
```

### Com Swagger UI

1. Acesse http://localhost:8000/docs
2. Clique em "Authorize" 🔓
3. Faça login e cole o token
4. Teste os endpoints!

## 🔒 Segurança

### Boas Práticas Implementadas

✅ **Senhas hasheadas** com Bcrypt (nunca armazenamos senhas em texto puro)
✅ **JWT tokens** com expiração (30 minutos)
✅ **Validação de dados** com Pydantic
✅ **Isolamento de usuários** (cada um vê apenas suas candidaturas)
✅ **CORS configurado** (personalize para produção)

### ⚠️ Antes de Fazer Deploy

1. **Gere uma SECRET_KEY forte**
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

2. **Configure variáveis de ambiente** no serviço de hosting
   - Nunca exponha a SECRET_KEY no código
   - Use variáveis de ambiente do Railway/Render/Vercel

3. **Configure CORS corretamente**
   - Em `app/main.py`, linha 20
   - Substitua `allow_origins=["*"]` pelos domínios permitidos
   - Exemplo: `allow_origins=["https://seusite.com"]`

4. **Use PostgreSQL em produção**
   - SQLite é apenas para desenvolvimento
   - Altere DATABASE_URL para PostgreSQL

5. **HTTPS obrigatório**
   - Sempre use HTTPS em produção
   - Serviços como Render/Railway já fornecem

## 🚀 Deploy

### Vercel (Recomendado para projetos pequenos)

1. Instale Vercel CLI: `npm i -g vercel`
2. Execute: `vercel`
3. Siga as instruções

### Railway

1. Conecte seu repositório
2. Configure variáveis de ambiente
3. Deploy automático!

### Render

1. Crie novo Web Service
2. Conecte repositório GitHub
3. Configure:
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## 📈 Melhorias Futuras

- [ ] Adicionar filtros e busca nas candidaturas
- [ ] Estatísticas (taxa de sucesso, empresas mais aplicadas)
- [ ] Exportar dados para CSV/Excel
- [ ] Notificações de follow-up
- [ ] Adicionar notas/observações nas candidaturas
- [ ] Dashboard com gráficos

## 📫 Contato

**Diogo Tumiati**
- Email: diogotumiati@gmail.com
- LinkedIn: [linkedin.com/in/devdiogotumiati](https://linkedin.com/in/devdiogotumiati)
- GitHub: [github.com/devdiogotumiati](https://github.com/devdiogotumiati)

## 📝 Licença

Este projeto está sob a licença MIT.

---

⭐ Desenvolvido com ☕ e Python por [Diogo Tumiati](https://github.com/devdiogotumiati)