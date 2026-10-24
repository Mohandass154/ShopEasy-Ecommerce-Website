const productGrid = document.getElementById("product-grid");
const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");
const cartCount = document.getElementById("cart-count");
const cartItems = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");

let products = [];
let cart = [];

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
}

async function loadProducts() {
    try {
        const response = await fetch("/api/products");

        if (!response.ok) {
            throw new Error("Could not load products.");
        }

        products = await response.json();
        renderProducts();
    } catch (error) {
        productGrid.textContent =
            "Unable to load products. Please refresh the page.";
    }
}

function renderProducts() {
    const search = searchInput.value.toLowerCase().trim();
    const category = categoryFilter.value;

    const filtered = products.filter(product => {
        const matchesSearch =
            product.name.toLowerCase().includes(search) ||
            product.description.toLowerCase().includes(search);

        const matchesCategory =
            category === "All" || product.category === category;

        return matchesSearch && matchesCategory;
    });

    productGrid.replaceChildren();

    document.getElementById("product-count").textContent =
        `${filtered.length} products`;

    if (filtered.length === 0) {
        productGrid.textContent = "No products found.";
        return;
    }

    filtered.forEach(product => {
        const card = createElement("article", "product-card");

        const image = createElement("img");
        image.src = product.image;
        image.alt = product.name;
        image.loading = "lazy";

        const info = createElement("div", "product-info");
        const categoryLabel = createElement(
            "span", "category", product.category
        );
        const name = createElement("h3", "", product.name);
        const description = createElement(
            "p", "", product.description
        );

        const bottom = createElement("div", "product-bottom");
        const price = createElement(
            "span", "price", `₹${product.price.toLocaleString("en-IN")}`
        );

        const button = createElement("button", "add-button", "Add to Cart");
        button.addEventListener("click", () => addToCart(product.id));

        bottom.append(price, button);
        info.append(categoryLabel, name, description, bottom);
        card.append(image, info);
        productGrid.append(card);
    });
}

function addToCart(productId) {
    const existing = cart.find(item => item.id === productId);

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ id: productId, quantity: 1 });
    }

    updateCart();
}

function updateCart() {
    cartCount.textContent = cart.reduce(
        (sum, item) => sum + item.quantity, 0
    );

    cartItems.replaceChildren();

    let total = 0;

    cart.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (!product) return;

        total += product.price * item.quantity;

        const row = createElement("div", "cart-row");
        const details = createElement(
            "span", "", `${product.name} — ₹${product.price * item.quantity}`
        );

        const controls = createElement("div", "quantity-controls");

        const decrease = createElement("button", "", "−");
        decrease.setAttribute("aria-label", `Remove one ${product.name}`);
        decrease.addEventListener("click", () => changeQuantity(item.id, -1));

        const quantity = createElement("span", "", item.quantity);

        const increase = createElement("button", "", "+");
        increase.setAttribute("aria-label", `Add one ${product.name}`);
        increase.addEventListener("click", () => changeQuantity(item.id, 1));

        controls.append(decrease, quantity, increase);
        row.append(details, controls);
        cartItems.append(row);
    });

    cartTotal.textContent = total.toLocaleString("en-IN");
}

function changeQuantity(productId, amount) {
    const item = cart.find(item => item.id === productId);

    if (!item) return;

    item.quantity += amount;

    if (item.quantity <= 0) {
        cart = cart.filter(item => item.id !== productId);
    }

    updateCart();
}

function openModal(id) {
    document.getElementById(id).classList.remove("hidden");
}

function closeModal(id) {
    document.getElementById(id).classList.add("hidden");
}

document.getElementById("cart-button").addEventListener("click", () => {
    updateCart();
    openModal("cart-modal");
});

document.getElementById("checkout-button").addEventListener("click", () => {
    if (cart.length === 0) {
        alert("Your cart is empty. Add a product first.");
        return;
    }

    closeModal("cart-modal");
    openModal("checkout-modal");
});

document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => {
        closeModal(button.dataset.close);
    });
});

document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closeModal(modal.id);
        }
    });
});

searchInput.addEventListener("input", renderProducts);
categoryFilter.addEventListener("change", renderProducts);

document.getElementById("checkout-form").addEventListener(
    "submit", async event => {
        event.preventDefault();

        const message = document.getElementById("checkout-message");
        const submitButton = event.target.querySelector(
            'button[type="submit"]'
        );

        submitButton.disabled = true;
        message.textContent = "Processing your demo order...";

        const formData = new FormData(event.target);

        try {
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.get("name"),
                    email: formData.get("email"),
                    address: formData.get("address"),
                    items: cart
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Order failed.");
            }

            message.textContent =
                `${result.message} Order ID: ${result.order_id}. Total: ₹${result.total}`;

            cart = [];
            updateCart();
            event.target.reset();
        } catch (error) {
            message.textContent = error.message;
        } finally {
            submitButton.disabled = false;
        }
    }
);

loadProducts();