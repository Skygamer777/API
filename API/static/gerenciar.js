const productForm = document.querySelector("#product-form");
const nameInput = document.querySelector("#product-name");
const priceInput = document.querySelector("#product-price");
const formTitle = document.querySelector("#form-title");
const submitButton = document.querySelector("#submit-button");
const cancelEditButton = document.querySelector("#cancel-edit");
const formFeedback = document.querySelector("#form-feedback");
const inventoryList = document.querySelector("#inventory-list");
const inventoryCount = document.querySelector("#inventory-count");
const inventoryFeedback = document.querySelector("#inventory-feedback");
const retryInventoryButton = document.querySelector("#retry-inventory");

let products = [];
let editingProductId = null;

function formatPrice(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`O servidor respondeu com status ${response.status}.`);
  }

  if (!response.ok) {
    const detail = result.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).join(" ")
      : typeof detail === "string"
        ? detail
        : `O servidor respondeu com status ${response.status}.`;
    throw new Error(message);
  }
  return result;
}

function displayFeedback(element, message, state = "") {
  element.textContent = message;
  element.classList.toggle("is-error", state === "error");
  element.classList.toggle("is-success", state === "success");
}

function resetForm() {
  editingProductId = null;
  productForm.reset();
  formTitle.textContent = "Adicionar produto";
  submitButton.innerHTML = 'Cadastrar produto <span aria-hidden="true">↗</span>';
  cancelEditButton.hidden = true;
  displayFeedback(formFeedback, "");
}

function startEditing(product) {
  editingProductId = product.id;
  nameInput.value = product.nome;
  priceInput.value = product.preco.toFixed(2);
  formTitle.textContent = "Editar produto";
  submitButton.innerHTML = 'Salvar alterações <span aria-hidden="true">↗</span>';
  cancelEditButton.hidden = false;
  displayFeedback(formFeedback, `Editando: ${product.nome}`);
  document.querySelector(".form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  nameInput.focus({ preventScroll: true });
}

function renderInventory() {
  inventoryList.replaceChildren();
  inventoryFeedback.classList.remove("is-error");
  inventoryCount.textContent = `${products.length} ${products.length === 1 ? "produto" : "produtos"}`;
  retryInventoryButton.hidden = true;

  if (products.length === 0) {
    const empty = makeElement("div", "inventory-empty");
    empty.append(makeElement("span", "inventory-empty-icon", "⌑"));
    empty.append(makeElement("strong", "", "Seu catálogo está vazio"));
    empty.append(makeElement("p", "", "Preencha o formulário ao lado para cadastrar a primeira peça."));
    inventoryList.append(empty);
    return;
  }

  products.forEach((product) => {
    const row = makeElement("article", "inventory-item");
    const symbol = makeElement("span", "inventory-symbol", "NX");
    symbol.setAttribute("aria-hidden", "true");
    const details = makeElement("div", "inventory-item-details");
    details.append(makeElement("h3", "inventory-item-name", product.nome));
    details.append(makeElement("span", "inventory-item-id", `CÓDIGO #${String(product.id).padStart(4, "0")}`));
    const price = makeElement("strong", "inventory-item-price", formatPrice(product.preco));
    const actions = makeElement("div", "inventory-item-actions");
    const editButton = makeElement("button", "inventory-action", "Editar");
    editButton.type = "button";
    editButton.dataset.action = "edit";
    editButton.dataset.productId = String(product.id);
    editButton.setAttribute("aria-label", `Editar ${product.nome}`);
    const deleteButton = makeElement("button", "inventory-action inventory-delete", "Excluir");
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.productId = String(product.id);
    deleteButton.setAttribute("aria-label", `Excluir ${product.nome}`);
    actions.append(editButton, deleteButton);
    row.append(symbol, details, price, actions);
    inventoryList.append(row);
  });
}

async function loadInventory() {
  inventoryList.setAttribute("aria-busy", "true");
  inventoryList.replaceChildren(makeElement("p", "inventory-loading", "Carregando produtos..."));
  inventoryCount.textContent = "Carregando...";
  displayFeedback(inventoryFeedback, "");
  retryInventoryButton.hidden = true;

  try {
    const result = await requestJson("/produtos");
    if (!Array.isArray(result)) {
      throw new Error("A resposta do catálogo está em um formato inesperado.");
    }
    products = result;
    renderInventory();
  } catch (error) {
    inventoryCount.textContent = "Catálogo indisponível";
    displayFeedback(inventoryFeedback, `Não foi possível carregar os produtos: ${error.message}`, "error");
    retryInventoryButton.hidden = false;
  } finally {
    inventoryList.setAttribute("aria-busy", "false");
  }
}

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!productForm.reportValidity()) return;

  const payload = {
    nome: nameInput.value.trim(),
    preco: Number(priceInput.value),
  };
  if (!payload.nome || !Number.isFinite(payload.preco) || payload.preco <= 0) {
    displayFeedback(formFeedback, "Informe um nome e um preço maior que zero.", "error");
    return;
  }

  const productId = editingProductId;
  const url = productId === null ? "/produtos" : `/produtos/${productId}`;
  const method = productId === null ? "POST" : "PUT";
  submitButton.disabled = true;
  displayFeedback(formFeedback, productId === null ? "Cadastrando produto..." : "Salvando alterações...");

  try {
    const product = await requestJson(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    resetForm();
    displayFeedback(
      formFeedback,
      productId === null
        ? `${product.nome} foi cadastrado no catálogo.`
        : `${product.nome} foi atualizado.`,
      "success",
    );
    await loadInventory();
  } catch (error) {
    displayFeedback(formFeedback, `Não foi possível salvar o produto: ${error.message}`, "error");
  } finally {
    submitButton.disabled = false;
  }
});

inventoryList.addEventListener("click", async (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const productId = Number(button.dataset.productId);
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  if (button.dataset.action === "edit") {
    startEditing(product);
    return;
  }

  if (button.dataset.action === "delete") {
    const confirmed = window.confirm(`Excluir "${product.nome}" do catálogo? Essa ação não pode ser desfeita.`);
    if (!confirmed) return;

    button.disabled = true;
    displayFeedback(inventoryFeedback, `Excluindo ${product.nome}...`);
    try {
      await requestJson(`/produtos/${product.id}`, { method: "DELETE" });
      if (editingProductId === product.id) resetForm();
      displayFeedback(inventoryFeedback, `${product.nome} foi excluído do catálogo.`, "success");
      await loadInventory();
    } catch (error) {
      displayFeedback(inventoryFeedback, `Não foi possível excluir o produto: ${error.message}`, "error");
    }
  }
});

cancelEditButton.addEventListener("click", resetForm);
retryInventoryButton.addEventListener("click", loadInventory);

loadInventory();
