"use strict";

/* =========================
   KAPE CORNER - APP.JS
========================= */

const STORAGE_KEY = "kapeCorner.orders.v1";
const STATUSES = ["Pending", "Preparing", "Ready", "Completed", "Cancelled"];
const LOCKED = ["Completed", "Cancelled"];
const DELIVERY_FEE = 40;
const MAX_QTY = 20;

const MENU = [
  { id: "d1", name: "Brewed Barako", category: "Drinks", price: 85, emoji: "☕" },
  { id: "d2", name: "Iced Spanish Latte", category: "Drinks", price: 120, emoji: "🧋" },
  { id: "d3", name: "Calamansi Cooler", category: "Drinks", price: 75, emoji: "🍋" },
  { id: "d4", name: "Ube Milk Tea", category: "Drinks", price: 110, emoji: "🥤" },
  { id: "b1", name: "Pandesal (6 pcs)", category: "Bread & Pastry", price: 45, emoji: "🥖" },
  { id: "b2", name: "Ensaymada", category: "Bread & Pastry", price: 65, emoji: "🥐" },
  { id: "b3", name: "Ube Cheese Roll", category: "Bread & Pastry", price: 70, emoji: "🍞" },
  { id: "m1", name: "Tapsilog", category: "Meals", price: 135, emoji: "🍳" },
  { id: "m2", name: "Longsilog", category: "Meals", price: 120, emoji: "🌭" },
  { id: "m3", name: "Chicken Adobo Bowl", category: "Meals", price: 140, emoji: "🍚" }
];

/* =========================
   STATE AND HELPERS
========================= */

let cart = {};
let orders = loadOrders();
let editingRef = null;

const $ = (selector) => document.querySelector(selector);

const peso = (number) => "₱" + Number(number).toFixed(2);

function esc(text) {
  const div = document.createElement("div");
  div.textContent = String(text ?? "");
  return div.innerHTML;
}

function toast(message, isError = false) {
  const el = $("#toast");
  el.textContent = message;
  el.className = "toast show" + (isError ? " error" : "");

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {
    el.className = "toast";
  }, 3000);
}

/* =========================
   LOCAL STORAGE
========================= */

function loadOrders() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const data = JSON.parse(saved);

    if (!Array.isArray(data)) return [];

    return data.filter(order =>
      order &&
      typeof order.ref === "string" &&
      Array.isArray(order.items) &&
      STATUSES.includes(order.status)
    );

  } catch (error) {
    console.error("Unable to load orders:", error);
    return [];
  }
}

function saveOrders() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    return true;
  } catch (error) {
    console.error("Unable to save orders:", error);
    toast("Unable to save orders. Storage may be full.", true);
    return false;
  }
}

/* =========================
   MENU
========================= */

function renderMenu() {
  const filter = $("#menuFilter").value;

  const items = MENU.filter(item =>
    filter === "all" || item.category === filter
  );

  $("#menuGrid").innerHTML = items.map(item => `
    <article class="card">
      <span class="emoji">${item.emoji}</span>
      <h3>${esc(item.name)}</h3>
      <p class="cat">${esc(item.category)}</p>
      <p class="price">${peso(item.price)}</p>
      <button type="button"
        class="btn btn-primary"
        data-add="${item.id}">
        Add to cart
      </button>
    </article>
  `).join("");
}

$("#menuFilter").addEventListener("change", renderMenu);

$("#menuGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-add]");
  if (!button) return;

  const id = button.dataset.add;
  const quantity = cart[id] || 0;

  if (quantity >= MAX_QTY) {
    toast("Maximum quantity is 20.", true);
    return;
  }

  cart[id] = quantity + 1;

  renderCart();

  const item = MENU.find(item => item.id === id);
  toast(item.name + " added to cart.");
});

/* =========================
   CART
========================= */

function getType() {
  return document.querySelector('input[name="type"]:checked').value;
}

function calcTotals() {
  const subtotal = Object.entries(cart).reduce((total, [id, qty]) => {
    const item = MENU.find(item => item.id === id);
    return total + (item ? item.price * qty : 0);
  }, 0);

  const fee = subtotal > 0 && getType() === "Delivery"
    ? DELIVERY_FEE
    : 0;

  return {
    subtotal,
    fee,
    total: subtotal + fee
  };
}

function renderCart() {
  const ids = Object.keys(cart);

  if (ids.length === 0) {
    $("#cartBox").innerHTML = `
      <p class="empty">
        Your cart is empty.
        <a href="#menu">Browse the menu</a> to start an order.
      </p>
    `;
    return;
  }

  const rows = ids.map(id => {
    const item = MENU.find(item => item.id === id);

    return `
      <div class="cart-row">
        <strong>${esc(item.name)}</strong>

        <span>${peso(item.price * cart[id])}</span>

        <div class="qty">
          <button type="button" class="btn btn-small"
            data-dec="${id}">−</button>

          <input type="number"
            min="1"
            max="${MAX_QTY}"
            value="${cart[id]}"
            data-qty="${id}">

          <button type="button" class="btn btn-small"
            data-inc="${id}">+</button>
        </div>

        <button type="button"
          class="btn btn-small btn-danger"
          data-remove="${id}">
          Remove
        </button>
      </div>
    `;
  }).join("");

  const totals = calcTotals();

  $("#cartBox").innerHTML = rows + `
    <div class="totals">
      <div>
        <span>Subtotal</span>
        <span>${peso(totals.subtotal)}</span>
      </div>

      <div>
        <span>Delivery fee</span>
        <span>${peso(totals.fee)}</span>
      </div>

      <div class="grand">
        <span>Total</span>
        <span>${peso(totals.total)}</span>
      </div>
    </div>
  `;
}

$("#cartBox").addEventListener("click", event => {
  const inc = event.target.closest("[data-inc]");
  const dec = event.target.closest("[data-dec]");
  const remove = event.target.closest("[data-remove]");

  if (inc) {
    const id = inc.dataset.inc;

    if (cart[id] >= MAX_QTY) {
      toast("Maximum quantity is 20.", true);
      return;
    }

    cart[id]++;
  }

  else if (dec) {
    const id = dec.dataset.dec;

    if (cart[id] > 1) {
      cart[id]--;
    } else {
      delete cart[id];
    }
  }

  else if (remove) {
    delete cart[remove.dataset.remove];
  }

  else {
    return;
  }

  renderCart();
});

$("#cartBox").addEventListener("change", event => {
  const input = event.target.closest("[data-qty]");
  if (!input) return;

  const qty = Number(input.value);
  const id = input.dataset.qty;

  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
    toast("Enter a quantity from 1 to 20.", true);
  } else {
    cart[id] = qty;
  }

  renderCart();
});

/* =========================
   DELIVERY OPTIONS
========================= */

document.querySelectorAll('input[name="type"]').forEach(radio => {
  radio.addEventListener("change", () => {
    $("#addressField").hidden = getType() !== "Delivery";
    renderCart();
  });
});

/* =========================
   FORM VALIDATION
========================= */

const PHONE_RE = /^(09|\+639)\d{9}$/;

function validateName(value) {
  const name = value.trim();

  if (!name) return "Enter your full name.";
  if (name.length < 2) return "Name must have at least 2 characters.";
  if (!/^[A-Za-zÀ-ÿñÑ .'-]+$/.test(name)) {
    return "Please enter a valid name.";
  }

  return "";
}

function validatePhone(value) {
  const phone = value.trim();

  if (!phone) return "Enter your mobile number.";
  if (!PHONE_RE.test(phone)) {
    return "Use a valid Philippine mobile number.";
  }

  return "";
}

function setError(field, message) {
  const ids = {
    name: "custName",
    phone: "custPhone",
    address: "custAddress",
    editName: "editName",
    editPhone: "editPhone"
  };

  const input = $("#" + ids[field]);
  const error = $("#err-" + field);

  error.textContent = message;
  input.classList.toggle("invalid", Boolean(message));

  if (message) {
    input.setAttribute("aria-invalid", "true");
  } else {
    input.removeAttribute("aria-invalid");
  }
}

/* =========================
   REFERENCE NUMBER
========================= */

function generateRef() {
  const date = new Date();

  const stamp =
    date.getFullYear() +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0");

  let ref;

  do {
    ref = "KC-" + stamp + "-" +
      String(Math.floor(Math.random() * 10000)).padStart(4, "0");

  } while (orders.some(order => order.ref === ref));

  return ref;
}

/* =========================
   PLACE ORDER
========================= */

$("#orderForm").addEventListener("submit", event => {
  event.preventDefault();

  if (Object.keys(cart).length === 0) {
    toast("Please add items to your cart first.", true);
    return;
  }

  const name = $("#custName").value.trim();
  const phone = $("#custPhone").value.trim();
  const type = getType();
  const address = $("#custAddress").value.trim();

  const nameErr = validateName(name);
  const phoneErr = validatePhone(phone);

  const addressErr =
    type === "Delivery" && address.length < 5
      ? "Enter a complete delivery address."
      : "";

  setError("name", nameErr);
  setError("phone", phoneErr);
  setError("address", addressErr);

  if (nameErr || phoneErr || addressErr) {
    toast("Please check the highlighted fields.", true);
    $(".invalid")?.focus();
    return;
  }

  const totals = calcTotals();

  const order = {
    ref: generateRef(),
    createdAt: new Date().toISOString(),
    name,
    phone,
    type,
    address: type === "Delivery" ? address : "",
    payment: $("#custPayment").value,
    notes: $("#custNotes").value.trim(),

    items: Object.entries(cart).map(([id, qty]) => {
      const item = MENU.find(item => item.id === id);

      return {
        name: item.name,
        price: item.price,
        qty
      };
    }),

    subtotal: totals.subtotal,
    fee: totals.fee,
    total: totals.total,
    status: "Pending"
  };

  orders.unshift(order);

  if (!saveOrders()) {
    orders.shift();
    return;
  }

  showConfirmation(order);

  cart = {};

  $("#orderForm").reset();
  $("#addressField").hidden = true;

  renderCart();
  renderRecords();

  toast("Order placed successfully!");
});

/* =========================
   ORDER CONFIRMATION
========================= */

function showConfirmation(order) {
  const lines = order.items.map(item => `
    <li>
      ${esc(item.name)} × ${item.qty}
      — ${peso(item.price * item.qty)}
    </li>
  `).join("");

  $("#confirmBox").innerHTML = `
    <p>Reference number</p>
    <p class="ref">${esc(order.ref)}</p>

    <p>
      <strong>${esc(order.name)}</strong>
      · ${esc(order.phone)}
    </p>

    <p>
      ${esc(order.type)}
      ${order.address ? " to " + esc(order.address) : ""}
    </p>

    <p>Payment: ${esc(order.payment)} (simulated)</p>

    <ul>${lines}</ul>

    <p>Subtotal: ${peso(order.subtotal)}</p>
    <p>Delivery: ${peso(order.fee)}</p>
    <p><strong>Total: ${peso(order.total)}</strong></p>

    <p>
      Status:
      <span class="status ${order.status}">
        ${order.status}
      </span>
    </p>

    <p class="muted">
      Confirmation is simulated. No real SMS or email is sent.
    </p>

    <a class="btn btn-primary" href="#records">
      Go to my orders
    </a>
  `;

  $("#confirmation").hidden = false;
  $("#confirmation").scrollIntoView({ behavior: "smooth" });
  $("#confirmBox").focus();
}

/* =========================
   ORDER RECORDS
========================= */

function findOrder(ref) {
  return orders.find(order => order.ref === ref);
}

function renderRecords() {
  $("#orderCount").textContent = orders.length;

  const query = $("#searchBox").value.trim().toLowerCase();
  const status = $("#statusFilter").value;

  const list = orders.filter(order =>
    (status === "all" || order.status === status) &&
    (
      !query ||
      order.name.toLowerCase().includes(query) ||
      order.ref.toLowerCase().includes(query)
    )
  );

  const box = $("#recordsList");

  if (orders.length === 0) {
    box.innerHTML = `
      <p class="empty">
        No orders yet.
        <a href="#menu">Browse the menu</a> to place your first order.
      </p>
    `;
    return;
  }

  if (list.length === 0) {
    box.innerHTML = `
      <p class="empty">
        No orders match your search or filter.
      </p>
    `;
    return;
  }

  box.innerHTML = list.map(order => {
    const locked = LOCKED.includes(order.status);

    const options = STATUSES
      .filter(status => status !== "Cancelled")
      .map(status => `
        <option value="${status}"
          ${status === order.status ? "selected" : ""}>
          ${status}
        </option>
      `).join("");

    return `
      <article class="record">

        <h3>${esc(order.ref)}</h3>

        <p>
          <span class="status ${order.status}">
            ${order.status}
          </span>
        </p>

        <p>
          <strong>${esc(order.name)}</strong>
          · ${esc(order.type)}
        </p>

        <p>
          ${order.items.reduce((sum, item) => sum + item.qty, 0)}
          item(s) · ${peso(order.total)}
        </p>

        <p class="muted">
          ${new Date(order.createdAt).toLocaleString()}
        </p>

        <label for="st-${esc(order.ref)}">
          Update status
        </label>

        <select id="st-${esc(order.ref)}"
          data-status="${esc(order.ref)}"
          ${locked ? "disabled" : ""}>
          ${options}
        </select>

        <div class="row-actions">

          <button type="button"
            class="btn btn-small"
            data-view="${esc(order.ref)}">
            View / edit
          </button>

          <button type="button"
            class="btn btn-small btn-danger"
            data-cancel="${esc(order.ref)}"
            ${locked ? "disabled" : ""}>
            Cancel order
          </button>

          <button type="button"
            class="btn btn-small btn-danger"
            data-delete="${esc(order.ref)}">
            Delete
          </button>

        </div>
      </article>
    `;
  }).join("");
}

/* =========================
   UPDATE STATUS
========================= */

$("#recordsList").addEventListener("change", event => {
  const select = event.target.closest("[data-status]");
  if (!select) return;

  const order = findOrder(select.dataset.status);

  if (!order || LOCKED.includes(order.status)) return;

  const previousStatus = order.status;
  order.status = select.value;

  if (!saveOrders()) {
    order.status = previousStatus;
    renderRecords();
    return;
  }

  renderRecords();
  toast(order.ref + " updated to " + order.status);
});

/* =========================
   CANCEL / DELETE / VIEW
========================= */

$("#recordsList").addEventListener("click", event => {
  const view = event.target.closest("[data-view]");
  const cancel = event.target.closest("[data-cancel]");
  const del = event.target.closest("[data-delete]");

  if (view) {
    openDialog(view.dataset.view);
  }

  if (cancel) {
    const order = findOrder(cancel.dataset.cancel);

    if (!order || LOCKED.includes(order.status)) return;

    if (confirm("Cancel order " + order.ref + "?")) {
      const previousStatus = order.status;
      order.status = "Cancelled";

      if (!saveOrders()) {
        order.status = previousStatus;
        renderRecords();
        return;
      }

      renderRecords();
      toast("Order cancelled.");
    }
  }

  if (del) {
    const order = findOrder(del.dataset.delete);

    if (!order) return;

    if (confirm("Delete order " + order.ref + " permanently?")) {
      const previousOrders = orders;
      orders = orders.filter(item => item.ref !== order.ref);

      if (!saveOrders()) {
        orders = previousOrders;
        renderRecords();
        return;
      }

      renderRecords();
      toast("Order deleted.");
    }
  }
});

/* =========================
   SEARCH AND FILTER
========================= */

$("#searchBox").addEventListener("input", renderRecords);
$("#statusFilter").addEventListener("change", renderRecords);

// Reset search and filter when opening My Orders
document.querySelectorAll('a[href="#records"]').forEach(link => {
  link.addEventListener("click", () => {
    $("#searchBox").value = "";
    $("#statusFilter").value = "all";
    renderRecords();
  });
});



/* =========================
   EDIT ORDER
========================= */

function openDialog(ref) {
  const order = findOrder(ref);
  if (!order) return;

  editingRef = ref;

  $("#dlgTitle").textContent = "Order " + order.ref;

  $("#dlgItems").innerHTML = `
    <ul class="dlg-items">
      ${order.items.map(item => `
        <li>
          ${esc(item.name)} × ${item.qty}
          — ${peso(item.price * item.qty)}
        </li>
      `).join("")}
    </ul>

    <p>
      ${esc(order.type)}
      ${order.address ? " to " + esc(order.address) : ""}
    </p>

    <p>Payment: ${esc(order.payment)}</p>
    <p>Total: <strong>${peso(order.total)}</strong></p>
  `;

  $("#editName").value = order.name;
  $("#editPhone").value = order.phone;
  $("#editNotes").value = order.notes;

  setError("editName", "");
  setError("editPhone", "");

  const locked = LOCKED.includes(order.status);

  ["#editName", "#editPhone", "#editNotes"].forEach(selector => {
    $(selector).disabled = locked;
  });

  $("#editForm button[type=submit]").disabled = locked;

  $("#detailsDialog").showModal();
}

$("#editForm").addEventListener("submit", event => {
  event.preventDefault();

  const order = findOrder(editingRef);
  if (!order || LOCKED.includes(order.status)) return;

  const name = $("#editName").value.trim();
  const phone = $("#editPhone").value.trim();

  const nameErr = validateName(name);
  const phoneErr = validatePhone(phone);

  setError("editName", nameErr);
  setError("editPhone", phoneErr);

  if (nameErr || phoneErr) return;

  const previous = {
    name: order.name,
    phone: order.phone,
    notes: order.notes
  };

  order.name = name;
  order.phone = phone;
  order.notes = $("#editNotes").value.trim();

  if (!saveOrders()) {
    Object.assign(order, previous);
    return;
  }

  renderRecords();
  $("#detailsDialog").close();

  toast("Order details updated.");
});

$("#dlgClose").addEventListener("click", () => {
  $("#detailsDialog").close();
});

/* =========================
   SAMPLE ORDERS
========================= */

$("#loadSample").addEventListener("click", () => {
  const samples = [
    {
      name: "Maria Santos",
      phone: "09171234567",
      type: "Pickup",
      status: "Preparing",
      items: [
        ["Brewed Barako", 85, 2],
        ["Pandesal (6 pcs)", 45, 1]
      ]
    },
    {
      name: "Juan Dela Cruz",
      phone: "09281234567",
      type: "Delivery",
      address: "12 Sampaguita St., Sample City",
      status: "Pending",
      items: [
        ["Tapsilog", 135, 1],
        ["Calamansi Cooler", 75, 1]
      ]
    },
    {
      name: "Ana Reyes",
      phone: "09391234567",
      type: "Pickup",
      status: "Completed",
      items: [
        ["Ube Milk Tea", 110, 2]
      ]
    }
  ];

  const added = samples.map(sample => {
    const subtotal = sample.items.reduce(
      (sum, [, price, qty]) => sum + price * qty,
      0
    );

    const fee = sample.type === "Delivery" ? DELIVERY_FEE : 0;

    return {
      ref: generateRef(),
      createdAt: new Date().toISOString(),
      name: sample.name,
      phone: sample.phone,
      type: sample.type,
      address: sample.address || "",
      payment: "Cash",
      notes: "",
      status: sample.status,

      items: sample.items.map(([name, price, qty]) => ({
        name,
        price,
        qty
      })),

      subtotal,
      fee,
      total: subtotal + fee
    };
  });

  orders.unshift(...added);

  if (!saveOrders()) {
    orders.splice(0, added.length);
    return;
  }

  renderRecords();
  toast("3 sample orders added.");
});

/* =========================
   INITIALIZE SYSTEM
========================= */

renderMenu();
renderCart();
renderRecords();

console.log("Kape Corner system is ready!");