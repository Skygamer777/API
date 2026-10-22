# Nexus Componentes

Loja demonstrativa de peças para computador, com vitrine conectada à API FastAPI e ao banco SQLite.

## Executar no Windows (PowerShell)

```powershell
cd API
.\.venv\Scripts\python.exe -m pip install "fastapi[standard]"
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

Abra <http://127.0.0.1:8000> para ver a loja, <http://127.0.0.1:8000/gerenciar> para cadastrar e gerenciar peças por formulários ou <http://127.0.0.1:8000/docs> para acessar a documentação técnica da API.
Não é necessário ativar o ambiente virtual para executar os comandos acima.

## Produtos

A vitrine carrega os produtos cadastrados no SQLite por `GET /produtos`. A tabela está definida em `API/schema.sql`; se o banco ainda não tiver sido preparado, crie a tabela com:

```powershell
.\.venv\Scripts\python.exe -c "import sqlite3; from pathlib import Path; db = sqlite3.connect('loja.db'); db.executescript(Path('schema.sql').read_text(encoding='utf-8')); db.close()"
```

O catálogo local está vazio inicialmente. Cadastre e gerencie produtos pelo formulário em `/gerenciar`, sem precisar interagir diretamente com o Swagger. A documentação técnica continua disponível em `/docs`.
Categorias da vitrine são identificadas pelo nome do produto. O carrinho funciona no navegador, mas a finalização da compra ainda não está integrada.

> A tela `/gerenciar` e os endpoints de escrita da API ainda não têm autenticação. Use em ambiente local; antes de publicar para outras pessoas, adicione login e controle de acesso.