import sqlite3
from pathlib import Path
from fastapi import FastAPI

app = FastAPI(title="API de Produtos com SQLite")
CAMINHO_BANCO = Path(__file__).resolve().parent / "loja.db"


def conectar():
    conexao = sqlite3.connect(CAMINHO_BANCO)
    conexao.row_factory = sqlite3.Row
    return conexao


@app.get("/produtos")
def listar_produtos():
    conexao = conectar()
    try:
        linhas = conexao.execute(
            "SELECT id, nome, preco FROM produtos ORDER BY id"
        ).fetchall()
        return [dict(linha) for linha in linhas]
    finally: