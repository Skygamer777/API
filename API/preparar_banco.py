import sqlite3
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, field_validator

app = FastAPI(
    title="Nexus Componentes",
    summary="API para consultar e gerenciar o catálogo de peças.",
    description=(
        "## Comece por aqui\n"
        "Esta API permite cadastrar e manter os produtos exibidos na loja Nexus. "
        "Os dados ficam armazenados no banco SQLite local.\n\n"
        "### Fluxo recomendado\n"
        "1. Use **Listar produtos** para consultar o catálogo.\n"
        "2. Use **Criar produto** para adicionar uma peça; informe o nome e o preço.\n"
        "3. Use o **ID** retornado para consultar, atualizar ou remover essa peça.\n\n"
        "### Como testar\n"
        "Abra uma operação, selecione **Try it out**, preencha os campos e pressione "
        "**Execute**. Os exemplos abaixo mostram o formato esperado.\n\n"
        "### Regras dos dados\n"
        "- `nome` é obrigatório e não pode conter apenas espaços.\n"
        "- `preco` deve ser um número maior que zero.\n"
        "- Operações que recebem um ID respondem **404** quando o produto não existe.\n\n"
        "> Atenção: **Excluir produto** remove o registro do banco de dados."
    ),
    openapi_tags=[
        {
            "name": "Produtos",
            "description": (
                "Catálogo de peças da loja. Consulte a lista para encontrar o ID "
                "de um item antes de buscar, atualizar ou excluir."
            ),
        }
    ],
    docs_url=None,
)
CAMINHO_BANCO = Path(__file__).resolve().parent / "loja.db"
CAMINHO_STATIC = Path(__file__).resolve().parent / "static"

app.mount("/static", StaticFiles(directory=CAMINHO_STATIC), name="static")


class ProdutoEntrada(BaseModel):
    """Dados necessários para cadastrar ou atualizar um produto."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"nome": "Processador Ryzen 7", "preco": 1299.90}
            ]
        }
    )

    nome: str = Field(
        min_length=1,
        description="Nome da peça. Não pode ficar vazio ou conter apenas espaços.",
        examples=["Processador Ryzen 7"],
    )
    preco: float = Field(
        gt=0,
        allow_inf_nan=False,
        description="Preço em reais. Deve ser maior que zero.",
        examples=[1299.90],
    )

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, valor):
        valor = valor.strip()
        if not valor:
            raise ValueError("O nome não pode conter apenas espaços")
        return valor


class ProdutoResposta(BaseModel):
    """Produto retornado pela API."""

    id: int = Field(description="Identificador único do produto.", examples=[1])
    nome: str = Field(description="Nome cadastrado para a peça.")
    preco: float = Field(description="Preço do produto em reais.", examples=[1299.90])

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"id": 1, "nome": "Processador Ryzen 7", "preco": 1299.90}
            ]
        }
    )


class MensagemResposta(BaseModel):
    mensagem: str = Field(description="Resultado da operação.")


def conectar():
    conexao = sqlite3.connect(CAMINHO_BANCO)
    conexao.row_factory = sqlite3.Row
    return conexao


@app.get("/", include_in_schema=False)
def inicio():
    return FileResponse(CAMINHO_STATIC / "index.html")


@app.get("/docs", include_in_schema=False, response_class=HTMLResponse)
def documentacao():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} | Documentação",
        swagger_css_url="/static/docs.css",
        swagger_favicon_url="/static/favicon.svg",
        swagger_ui_parameters={
            "deepLinking": True,
            "displayRequestDuration": True,
            "filter": True,
            "docExpansion": "list",
            "defaultModelsExpandDepth": 1,
        },
    )


@app.get("/api/health", include_in_schema=False)
def verificar_api():
    return {"mensagem": "API de produtos com SQLite funcionando!"}


@app.get(
    "/produtos",
    tags=["Produtos"],
    summary="Listar produtos",
    description=(
        "Retorna todos os produtos cadastrados, ordenados pelo ID. "
        "Use o ID de um item nas operações de consulta, atualização ou exclusão."
    ),
    response_model=list[ProdutoResposta],
    response_description="Lista de produtos cadastrados. Pode estar vazia.",
)
def listar_produtos():
    conexao = conectar()
    try:
        linhas = conexao.execute(
            "SELECT id, nome, preco FROM produtos ORDER BY id"
        ).fetchall()
        return [dict(linha) for linha in linhas]
    finally:
        conexao.close()


@app.get(
    "/produtos/{produto_id}",
    tags=["Produtos"],
    summary="Buscar produto pelo ID",
    description="Consulta os dados de um único produto usando o ID retornado no cadastro ou na listagem.",
    response_model=ProdutoResposta,
    response_description="Dados do produto encontrado.",
    responses={404: {"description": "Não existe produto com esse ID."}},
)
def buscar_produto(produto_id: int):
    conexao = conectar()
    try:
        linha = conexao.execute(
            "SELECT id, nome, preco FROM produtos WHERE id = ?",
            (produto_id,),
        ).fetchone()
        if linha is None:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        return dict(linha)
    finally:
        conexao.close()


@app.post(
    "/produtos",
    tags=["Produtos"],
    summary="Criar produto",
    description=(
        "Adiciona uma peça ao catálogo. Informe `nome` e `preco` no corpo da "
        "requisição. O ID criado será incluído na resposta."
    ),
    status_code=201,
    response_model=ProdutoResposta,
    response_description="Produto criado com sucesso.",
)
def criar_produto(produto: ProdutoEntrada):
    conexao = conectar()
    try:
        cursor = conexao.execute(
            "INSERT INTO produtos (nome, preco) VALUES (?, ?)",
            (produto.nome, produto.preco),
        )
        conexao.commit()
        return {"id": cursor.lastrowid, "nome": produto.nome, "preco": produto.preco}
    finally:
        conexao.close()


@app.put(
    "/produtos/{produto_id}",
    tags=["Produtos"],
    summary="Atualizar produto",
    description=(
        "Substitui o nome e o preço do produto indicado pelo ID. "
        "Envie os dois campos no corpo da requisição."
    ),
    response_model=ProdutoResposta,
    response_description="Produto atualizado com sucesso.",
    responses={404: {"description": "Não existe produto com esse ID."}},
)
def atualizar_produto(produto_id: int, produto: ProdutoEntrada):
    conexao = conectar()
    try:
        cursor = conexao.execute(
            "UPDATE produtos SET nome = ?, preco = ? WHERE id = ?",
            (produto.nome, produto.preco, produto_id),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        conexao.commit()
        return {"id": produto_id, "nome": produto.nome, "preco": produto.preco}
    finally:
        conexao.close()


@app.delete(
    "/produtos/{produto_id}",
    tags=["Produtos"],
    summary="Excluir produto",
    description=(
        "Remove permanentemente o produto indicado pelo ID do banco de dados. "
        "Essa ação não pode ser desfeita."
    ),
    response_model=MensagemResposta,
    response_description="Confirmação da exclusão.",
    responses={404: {"description": "Não existe produto com esse ID."}},
)
def excluir_produto(produto_id: int):
    conexao = conectar()
    try:
        cursor = conexao.execute(
            "DELETE FROM produtos WHERE id = ?", (produto_id,)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        conexao.commit()
        return {"mensagem": "Produto excluído com sucesso"}
    finally:
        conexao.close()