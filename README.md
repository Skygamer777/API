# Nexus Componentes

Loja demonstrativa de peças para computador, com vitrine conectada à API FastAPI e ao banco SQLite.

## Executar no Windows (PowerShell)

```powershell
cd API
.\.venv\Scripts\python.exe -m pip install "fastapi[standard]"
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

Abra <http://127.0.0.1:8000> para ver a loja ou <http://127.0.0.1:8000/docs> para acessar a documentação interativa da API, estilizada com a identidade visual da Nexus.
Não é necessário ativar o ambiente virtual para executar os comandos acima.

## Produtos

A vitrine carrega os produtos cadastrados no SQLite por `GET /produtos`. A tabela está definida em `API/schema.sql`; se o banco ainda não tiver sido preparado, crie a tabela com:

```powershell
.\.venv\Scripts\python.exe -c "import sqlite3; from pathlib import Path; db = sqlite3.connect('loja.db'); db.executescript(Path('schema.sql').read_text(encoding='utf-8')); db.close()"
```

O catálogo local está vazio inicialmente. Cadastre produtos pela documentação interativa em `/docs` ou pelos endpoints `POST`, `GET`, `PUT` e `DELETE /produtos`.
Categorias da vitrine são identificadas pelo nome do produto. O carrinho funciona no navegador, mas a finalização da compra ainda não está integrada.