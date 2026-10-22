const productsGrid = document.querySelector("#product-grid");
const catalogMessage = document.querySelector("#catalog-message");
const catalogCount = document.querySelector("#catalog-count");
const retryButton = document.querySelector("#retry-button");
const searchInput = document.querySelector("#search-input");
const cartDrawer = document.querySelector("#cart-drawer");
const drawerScrim = document.querySelector("#drawer-scrim");
const cartItems = document.querySelector("#cart-items");
const cartEmpty = document.querySelector("#cart-empty");
const cartSummary = document.querySelector("#cart-summary");
const toast = document.querySelector("#toast");

const categoryLabels = {
  processadores: "Processadores",
  "placas-de-video": "Placas de vídeo",
  memoria: "Memória RAM",
  armazenamento: "Armazenamento",
  outros: "Componentes",
};

const categoryPatterns = [
  ["processadores", /\b(cpu|processador|ryzen|core\s*i[3579]|pentium|athlon)\b/i],
  ["placas-de-video", /\b(gpu|placa(?:s)? de vídeo|placa(?:s)? de video|geforce|radeon|rtx|gtx)\b/i],
  ["memoria", /\b(memória|memoria|ram|ddr[345])\b/i],
  ["armazenamento", /\b(ssd|nvme|hd|hdd|armazenamento)\b/i],
];

let products = [];
let activeCategory = "todos";
let cart = [];
let toastTimeout;

function categoryFor(name) {
  const match = categoryPatterns.find(([, pattern]) => pattern.test(name));
  return match ? match[0] : "outros";
}

function productSymbol(category) {
  return {
    processadores: "CPU",
    "placas-de-video": "GPU",
    memoria: "RAM",
    armazenamento: "SSD",
    outros: "NX",
  }[category];
}

function formatPrice(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function showCatalogMessage(message) {
  catalogMessage.replaceChildren();
  catalogMessage.append(message);
  catalogMessage.hidden = false;
}

function renderProducts() {
  const query = searchInput.value.trim().toLocaleLowerCase("pt-BR");
  const visibleProducts = products.filter((product) => {
    const matchesCategory = activeCategory === "todos" || product.category === activeCategory;
    const matchesSearch = product.nome.toLocaleLowerCase("pt-BR").includes(query);
    return matchesCategory && matchesSearch;
  });

  productsGrid.replaceChildren();
  catalogMessage.hidden = true;
  catalogCount.textContent = `${visibleProducts.length} ${visibleProducts.length === 1 ? "produto" : "produtos"}`;

  if (visibleProducts.length === 0) {
    if (products.length === 0) {
      const message = document.createElement("span");
      message.append("Nosso catálogo ainda está sendo preparado. ");
      const link = createElement("a", "", "Acesse o formulário de produtos");
      link.href = "/gerenciar";
      message.append(link, " para adicionar os primeiros produtos.");
      showCatalogMessage(message);
      return;
    }
    showCatalogMessage("Nenhum produto encontrado. Tente outra busca ou categoria.");
    return;
  }

  visibleProducts.forEach((product) => {
    const card = createElement("article", "product-card");
    const visual = createElement("div", "product-visual");
    visual.setAttribute("aria-hidden", "true");
    visual.append(createElement("span", "product-category", categoryLabels[product.category]));
    visual.append(createElement("span", "product-symbol", productSymbol(product.category)));

    const info = createElement("div", "product-info");
    info.append(createElement("h3", "product-name", product.nome));
    info.append(createElement("p", "product-id", `CÓDIGO #${String(product.id).padStart(4, "0")}`));

    const buyRow = createElement("div", "product-buy");
    buyRow.append(createElement("span", "product-price", formatPrice(product.preco)));
    const addButton = createElement("button", "add-cart", "+");
    addButton.type = "button";
    addButton.dataset.addProduct = String(product.id);
    addButton.setAttribute("aria-label", `Adicionar ${product.nome} ao carrinho`);
    buyRow.append(addButton);

    info.append(buyRow);
    card.append(visual, info);
    productsGrid.append(card);
  });
}

async function loadProducts() {
  productsGrid.setAttribute("aria-busy", "true");
  productsGrid.replaceChildren(createElement("p", "catalog-message", "Carregando produtos..."));
  catalogMessage.hidden = true;
  retryButton.hidden = true;

  try {
    const response = await fetch("/produtos");
    if (!response.ok) {
      throw new Error(`A API respondeu com o status ${response.status}.`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("A resposta da API não contém uma lista de produtos.");
    }

    products = data.map((product) => {
      if (
        !Number.isInteger(product.id) ||
        typeof product.nome !== "string" ||
        typeof product.preco !== "number" ||
        !Number.isFinite(product.preco) ||
        product.preco <= 0
      ) {
        throw new Error("A API retornou um produto com dados inválidos.");
      }
      return { ...product, category: categoryFor(product.nome) };
    });

    renderProducts();
  } catch (error) {
    catalogCount.textContent = "Catálogo indisponível";
    showCatalogMessage(`Não foi possível carregar os produtos: ${error.message}`);
    retryButton.hidden = false;
  } finally {
    productsGrid.setAttribute("aria-busy", "false");
  }
}

function renderCart() {
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.preco * item.quantity, 0);

  document.querySelector("#cart-count").textContent = String(itemCount);
  document.querySelector("#drawer-count").textContent = `(${itemCount})`;
  cartEmpty.hidden = cart.length > 0;
  cartSummary.hidden = cart.length === 0;
  cartItems.replaceChildren();

  cart.forEach((item) => {
    const row = createElement("article", "cart-item");
    row.append(createElement("span", "cart-item-symbol", productSymbol(item.category)));
    const details = document.createElement("div");
    details.append(createElement("h3", "cart-item-name", item.nome));
    details.append(createElement("p", "cart-item-price", formatPrice(item.preco)));
    const quantity = createElement("div", "cart-item-quantity");
    const decrease = createElement("button", "", "−");
    decrease.type = "button";
    decrease.dataset.cartAction = "decrease";
    decrease.dataset.productId = String(item.id);
    decrease.setAttribute("aria-label", `Diminuir quantidade de ${item.nome}`);
    const quantityValue = createElement("span", "", String(item.quantity));
    const increase = createElement("button", "", "+");
    increase.type = "button";
    increase.dataset.cartAction = "increase";
    increase.dataset.productId = String(item.id);
    increase.setAttribute("aria-label", `Aumentar quantidade de ${item.nome}`);
    quantity.append(decrease, quantityValue, increase);
    details.append(quantity);
    row.append(details);

    const remove = createElement("button", "remove-item", "Remover");
    remove.type = "button";
    remove.dataset.cartAction = "remove";
    remove.dataset.productId = String(item.id);
    row.append(remove);
    cartItems.append(row);
  });

  document.querySelector("#cart-subtotal").textContent = formatPrice(subtotal);
}

function announce(message) {
  window.clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

function setCartOpen(open) {
  cartDrawer.classList.toggle("is-open", open);
  cartDrawer.setAttribute("aria-hidden", String(!open));
  drawerScrim.hidden = !open;
  document.body.style.overflow = open ? "hidden" : "";
  if (open) document.querySelector("#cart-close").focus();
}

function setCategory(category) {
  activeCategory = category;
  document.querySelectorAll(".filter-chip").forEach((button) => {
    const active = button.dataset.category === category;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderProducts();
  document.querySelector("#produtos").scrollIntoView({ behavior: "smooth" });
}

document.querySelectorAll(".filter-chip").forEach((button) => {
  button.setAttribute("aria-pressed", String(button.dataset.category === "todos"));
  button.addEventListener("click", () => setCategory(button.dataset.category));
});

document.querySelectorAll(".category-card").forEach((button) => {
  button.addEventListener("click", () => setCategory(button.dataset.category));
});

searchInput.addEventListener("input", renderProducts);
retryButton.addEventListener("click", loadProducts);
document.querySelector("#cart-open").addEventListener("click", () => setCartOpen(true));
document.querySelector("#cart-close").addEventListener("click", () => setCartOpen(false));
drawerScrim.addEventListener("click", () => setCartOpen(false));
document.querySelector("#continue-shopping").addEventListener("click", () => setCartOpen(false));

productsGrid.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest("[data-add-product]");
  if (!button) return;
  const product = products.find((item) => item.id === Number(button.dataset.addProduct));
  if (!product) {
    announce("Este produto não está mais disponível no catálogo.");
    return;
  }

  const cartItem = cart.find((item) => item.id === product.id);
  if (cartItem) cartItem.quantity += 1;
  else cart.push({ ...product, quantity: 1 });
  renderCart();
  announce(`${product.nome} adicionado ao carrinho.`);
});

cartItems.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest("[data-cart-action]");
  if (!button) return;
  const productId = Number(button.dataset.productId);
  const item = cart.find((entry) => entry.id === productId);
  if (!item) return;

  if (button.dataset.cartAction === "increase") item.quantity += 1;
  if (button.dataset.cartAction === "decrease") item.quantity -= 1;
  if (button.dataset.cartAction === "remove" || item.quantity <= 0) {
    cart = cart.filter((entry) => entry.id !== productId);
  }
  renderCart();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setCartOpen(false);
  if (event.key === "/" && document.activeElement !== searchInput) {
    event.preventDefault();
    searchInput.focus();
  }
});

renderCart();
loadProducts();
