# Nexus Componentes

Painel de gerenciamento de produtos com API FastAPI e banco SQLite.

## Executar no Windows (PowerShell)

```powershell
cd API
.\.venv\Scripts\python.exe -m pip install "fastapi[standard]"
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

Abra <http://127.0.0.1:8000> ou <http://127.0.0.1:8000/gerenciar> para cadastrar, atualizar e excluir peças por formulários.
Não é necessário ativar o ambiente virtual para executar os comandos acima.

## Produtos

O painel consulta os produtos cadastrados no SQLite por `GET /produtos`. A tabela está definida em `API/schema.sql`; se o banco ainda não tiver sido preparado, crie a tabela com:

```powershell
.\.venv\Scripts\python.exe -c "import sqlite3; from pathlib import Path; db = sqlite3.connect('loja.db'); db.executescript(Path('schema.sql').read_text(encoding='utf-8')); db.close()"
```

O catálogo local está vazio inicialmente. Cadastre, atualize e exclua produtos pelo painel em `/gerenciar`, sem precisar interagir diretamente com a API.

> A tela `/gerenciar` e os endpoints de escrita da API ainda não têm autenticação. Use em ambiente local; antes de publicar para outras pessoas, adicione login e controle de acesso.