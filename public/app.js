const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
const dateOnly = value => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
let medicines = [];
let cart = [];

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}
function notify(message, isError = false) {
  const box = $("notice"); box.textContent = message; box.classList.toggle("error", isError); box.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => box.classList.add("hidden"), 4500);
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
}
function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  $(`${name}-view`).classList.remove("hidden");
  document.querySelectorAll(".nav").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  $("page-title").textContent = ({ dashboard:"Dashboard", inventory:"Medicine Inventory", sales:"Sales & Billing", reports:"MongoDB Reports" })[name];
  if (name === "dashboard") loadDashboard();
  if (name === "inventory") loadMedicines();
  if (name === "sales") { loadMedicines().then(renderMedicineSelect); loadSales(); }
  if (name === "reports") loadReports();
}
document.querySelectorAll(".nav").forEach(b => b.addEventListener("click", () => showView(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => showView(b.dataset.go)));
async function checkHealth() {
  try { const h = await api("/api/health"); $("db-status").textContent = h.database === "connected" ? "● MongoDB connected" : "● Database offline"; }
  catch { $("db-status").textContent = "● API unavailable"; }
}
async function loadDashboard() {
  try {
    const d = await api("/api/dashboard");
    $("stat-medicines").textContent = d.medicineCount;
    $("stat-low").textContent = d.lowStockCount;
    $("stat-expiring").textContent = d.expiringSoonCount;
    $("stat-sales").textContent = money(d.salesToday);
    $("stat-bills").textContent = `${d.billsToday} bill(s) today`;
    $("stock-value").textContent = money(d.stockValue);
    $("units-stock").textContent = d.unitsInStock.toLocaleString("en-IN");
    $("expired-count").textContent = d.expiredCount;
    const list = await api("/api/medicines");
    const today = new Date(); today.setHours(0,0,0,0);
    const alertItems = list.filter(m => m.quantity <= m.reorderLevel || new Date(m.expiryDate) < new Date(today.getTime() + 30*86400000))
      .slice(0, 6);
    $("alerts").innerHTML = alertItems.length ? alertItems.map(m => {
      const expired = new Date(m.expiryDate) < today;
      const low = m.quantity <= m.reorderLevel;
      return `<div class="alert-item"><span class="alert-symbol">${expired ? "◷" : low ? "!" : "⌁"}</span><div><strong>${escapeHtml(m.name)}</strong><small>${expired ? "Expired" : low ? `Low stock · ${m.quantity} left` : `Expires ${dateOnly(m.expiryDate)}`}</small></div></div>`;
    }).join("") : '<p class="muted">No current alerts. Inventory looks good!</p>';
  } catch (e) { notify(e.message, true); }
}
async function loadMedicines() {
  const search = encodeURIComponent($("medicine-search")?.value || "");
  const stock = encodeURIComponent($("stock-filter")?.value || "");
  try {
    medicines = await api(`/api/medicines?search=${search}&stock=${stock}`);
    renderMedicines();
    return medicines;
  } catch (e) { notify(e.message, true); return []; }
}
function renderMedicines() {
  const rows = $("medicine-rows");
  if (!medicines.length) { rows.innerHTML = '<tr><td colspan="7">No medicines found. Add your first medicine.</td></tr>'; return; }
  const today = new Date(); today.setHours(0,0,0,0);
  rows.innerHTML = medicines.map(m => {
    const expired = new Date(m.expiryDate) < today;
    const low = m.quantity <= m.reorderLevel;
    return `<tr><td class="medicine-cell"><strong>${escapeHtml(m.name)}</strong><small>${escapeHtml(m.genericName || m.manufacturer || "")}</small></td><td>${escapeHtml(m.batchNumber)}</td><td><span class="pill">${escapeHtml(m.category)}</span></td><td>${money(m.sellingPrice)}</td><td><span class="pill ${expired ? "expired" : low ? "low" : ""}">${m.quantity} ${low ? "· Low" : ""}</span></td><td><span class="${expired ? "pill expired" : ""}">${dateOnly(m.expiryDate)}</span></td><td><button class="action-btn" data-edit="${m._id}">Edit</button><button class="action-btn delete-btn" data-delete="${m._id}">Delete</button></td></tr>`;
  }).join("");
  rows.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openMedicine(medicines.find(m => m._id === b.dataset.edit))));
  rows.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", async () => {
    const m = medicines.find(x => x._id === b.dataset.delete);
    if (!confirm(`Delete ${m.name}?`)) return;
    try { await api(`/api/medicines/${m._id}`, { method: "DELETE" }); notify("Medicine deleted."); await loadMedicines(); await loadDashboard(); }
    catch (e) { notify(e.message, true); }
  }));
}
$("medicine-search").addEventListener("input", debounce(loadMedicines, 250));
$("stock-filter").addEventListener("change", loadMedicines);
$("refresh-medicines").addEventListener("click", loadMedicines);
function debounce(fn, wait) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); }; }
function openMedicine(m = null) {
  $("medicine-form").reset(); $("medicine-id").value = m?._id || "";
  $("medicine-dialog-title").textContent = m ? "Edit medicine" : "Add medicine";
  $("m-name").value = m?.name || ""; $("m-generic").value = m?.genericName || "";
  $("m-batch").value = m?.batchNumber || ""; $("m-category").value = m?.category || "";
  $("m-manufacturer").value = m?.manufacturer || ""; $("m-expiry").value = m?.expiryDate ? new Date(m.expiryDate).toISOString().slice(0,10) : "";
  $("m-purchase").value = m?.purchasePrice ?? ""; $("m-selling").value = m?.sellingPrice ?? "";
  $("m-quantity").value = m?.quantity ?? 0; $("m-reorder").value = m?.reorderLevel ?? 10;
  $("m-prescription").checked = Boolean(m?.prescriptionRequired);
  $("medicine-dialog").showModal();
}
$("add-medicine").addEventListener("click", () => openMedicine());
$("quick-add").addEventListener("click", () => { showView("inventory"); openMedicine(); });
$("close-dialog").addEventListener("click", () => $("medicine-dialog").close());
$("cancel-dialog").addEventListener("click", () => $("medicine-dialog").close());
$("medicine-form").addEventListener("submit", async e => {
  e.preventDefault();
  const id = $("medicine-id").value;
  const body = {
    name: $("m-name").value.trim(), genericName: $("m-generic").value.trim(), batchNumber: $("m-batch").value.trim(),
    category: $("m-category").value.trim(), manufacturer: $("m-manufacturer").value.trim(),
    expiryDate: $("m-expiry").value, purchasePrice: Number($("m-purchase").value), sellingPrice: Number($("m-selling").value),
    quantity: Number($("m-quantity").value), reorderLevel: Number($("m-reorder").value),
    prescriptionRequired: $("m-prescription").checked
  };
  try {
    await api(id ? `/api/medicines/${id}` : "/api/medicines", { method: id ? "PUT" : "POST", body: JSON.stringify(body) });
    $("medicine-dialog").close(); notify(id ? "Medicine updated." : "Medicine added.");
    await loadMedicines(); await loadDashboard();
  } catch (err) { notify(err.message, true); }
});
async function renderMedicineSelect() {
  const select = $("sale-medicine"); const previous = select.value;
  select.innerHTML = '<option value="">Select medicine…</option>' + medicines.filter(m => m.quantity > 0 && new Date(m.expiryDate) >= new Date()).map(m =>
    `<option value="${m._id}">${escapeHtml(m.name)} · ${money(m.sellingPrice)} · ${m.quantity} in stock</option>`).join("");
  if (previous) select.value = previous;
}
$("add-sale-item").addEventListener("click", () => {
  const id = $("sale-medicine").value, qty = Number($("sale-quantity").value);
  const m = medicines.find(x => x._id === id);
  if (!m) return notify("Select a medicine first.", true);
  if (!Number.isInteger(qty) || qty < 1) return notify("Quantity must be a positive whole number.", true);
  const existing = cart.find(x => x.medicineId === id);
  const newQty = qty + (existing?.quantity || 0);
  if (newQty > m.quantity) return notify(`Only ${m.quantity} unit(s) are available.`, true);
  if (existing) existing.quantity = newQty; else cart.push({ medicineId: id, quantity: qty, name: m.name, price: m.sellingPrice });
  $("sale-quantity").value = 1; renderCart();
});
function renderCart() {
  $("sale-items").innerHTML = cart.length ? cart.map((item, i) =>
    `<div class="sale-line"><span>${escapeHtml(item.name)} × ${item.quantity}</span><strong>${money(item.price * item.quantity)} <button type="button" data-remove="${i}">×</button></strong></div>`).join("") : '<p class="muted">No items added yet.</p>';
  $("sale-items").querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => { cart.splice(Number(b.dataset.remove),1); renderCart(); }));
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = Math.max(0, Number($("discount").value || 0));
  $("bill-subtotal").textContent = money(subtotal);
  $("bill-total").textContent = money(Math.max(0, subtotal - discount));
}
$("discount").addEventListener("input", renderCart);
$("sale-form").addEventListener("submit", async e => {
  e.preventDefault();
  if (!cart.length) return notify("Add at least one item to the bill.", true);
  try {
    const sale = await api("/api/sales", { method: "POST", body: JSON.stringify({
      items: cart.map(i => ({ medicineId: i.medicineId, quantity: i.quantity })),
      discount: Number($("discount").value || 0), paymentMethod: $("payment-method").value,
      customerName: $("customer-name").value.trim() || "Walk-in customer"
    })});
    cart = []; $("discount").value = 0; $("customer-name").value = ""; renderCart();
    notify(`Sale completed. Bill ${sale.billNumber} · Total ${money(sale.total)}`);
    await loadMedicines(); await renderMedicineSelect(); await loadSales(); await loadDashboard();
  } catch (err) { notify(err.message, true); await loadMedicines(); await renderMedicineSelect(); }
});
async function loadSales() {
  try {
    const sales = await api("/api/sales");
    $("sales-rows").innerHTML = sales.length ? sales.map(s => `<tr><td>${escapeHtml(s.billNumber)}</td><td>${dateOnly(s.createdAt)}</td><td>${s.items.reduce((n,i)=>n+i.quantity,0)} unit(s)</td><td>${escapeHtml(s.paymentMethod)}</td><td><strong>${money(s.total)}</strong></td></tr>`).join("") : '<tr><td colspan="5">No sales recorded yet.</td></tr>';
  } catch (e) { notify(e.message, true); }
}
$("refresh-sales").addEventListener("click", loadSales);
async function loadReports() {
  try {
    const [categories, top] = await Promise.all([api("/api/reports/category-stock"), api("/api/reports/top-selling")]);
    $("category-rows").innerHTML = categories.length ? categories.map(r => `<tr><td>${escapeHtml(r._id || "Uncategorized")}</td><td>${r.medicineCount}</td><td>${r.units}</td><td>${money(r.stockValue)}</td></tr>`).join("") : '<tr><td colspan="4">No inventory data yet.</td></tr>';
    $("top-rows").innerHTML = top.length ? top.map(r => `<tr><td>${escapeHtml(r._id)}</td><td>${r.unitsSold}</td><td>${money(r.revenue)}</td></tr>`).join("") : '<tr><td colspan="3">Record sales to see top-selling medicines.</td></tr>';
  } catch (e) { notify(e.message, true); }
}
$("refresh-reports").addEventListener("click", loadReports);
checkHealth(); loadDashboard();
