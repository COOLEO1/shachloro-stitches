(() => {
  "use strict";

  const config = window.SHACHLORO_CONFIG;

  const loginPanel = document.getElementById("loginPanel");
  const dashboardPanel = document.getElementById("dashboardPanel");
  const loginForm = document.getElementById("loginForm");
  const loginButton = document.getElementById("loginButton");
  const loginStatus = document.getElementById("loginStatus");
  const dashboardStatus = document.getElementById("dashboardStatus");
  const ordersList = document.getElementById("ordersList");
  const statusFilter = document.getElementById("statusFilter");
  const refreshButton = document.getElementById("refreshButton");
  const logoutButton = document.getElementById("logoutButton");

  const SESSION_KEY = "shachloro_admin_access_token";
  let accessToken = sessionStorage.getItem(SESSION_KEY);

  const statusLabels = {
    pending: "Pending",
    accepted: "Accepted",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled"
  };

  function showMessage(element, message) {
    element.textContent = message || "";
  }

  function showLogin(message = "") {
    dashboardPanel.hidden = true;
    loginPanel.hidden = false;
    showMessage(loginStatus, message);
  }

  function showDashboard() {
    loginPanel.hidden = true;
    dashboardPanel.hidden = false;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function formatDate(value) {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return date.toLocaleString();
  }

  function formatStatus(value) {
    return statusLabels[value] || value;
  }

  function updateStats(orders) {
    document.getElementById("totalCount").textContent = orders.length;
    document.getElementById("pendingCount").textContent =
      orders.filter(order => order.status === "pending").length;
    document.getElementById("progressCount").textContent =
      orders.filter(order => order.status === "in_progress").length;
    document.getElementById("completedCount").textContent =
      orders.filter(order => order.status === "completed").length;
  }

  function renderOrders(orders) {
    updateStats(orders);

    if (!orders.length) {
      ordersList.innerHTML =
        '<div class="orders-empty">No orders found for this filter.</div>';
      return;
    }

    ordersList.innerHTML = orders.map(order => {
      const reference = escapeHTML(order.reference);
      const currentStatus = statusLabels[order.status]
        ? order.status
        : "pending";

      const options = Object.entries(statusLabels).map(([value, label]) =>
        `<option value="${value}" ${value === currentStatus ? "selected" : ""}>${label}</option>`
      ).join("");

      return `
        <article class="order-card">
          <div class="order-card-top">
            <div>
              <div class="order-reference">${reference}</div>
              <div class="order-date">${escapeHTML(formatDate(order.created_at))}</div>
            </div>
            <span class="order-status">${escapeHTML(formatStatus(order.status))}</span>
          </div>

          <div class="order-details">
            <div class="order-detail">
              <span>Customer</span>
              <strong>${escapeHTML(order.customer_name)}</strong>
            </div>
            <div class="order-detail">
              <span>Phone</span>
              <strong>${escapeHTML(order.phone)}</strong>
            </div>
            <div class="order-detail">
              <span>Location</span>
              <strong>${escapeHTML(order.location)}</strong>
            </div>
            <div class="order-detail">
              <span>Garment / Size</span>
              <strong>${escapeHTML(order.garment)} · ${escapeHTML(order.size)}</strong>
            </div>
            <div class="order-detail order-description">
              <span>Design description</span>
              <strong>${escapeHTML(order.description)}</strong>
            </div>
          </div>

          <div class="order-actions">
            <label class="visually-hidden" for="status-${reference}">Change order status</label>
            <select id="status-${reference}" data-status-select="${reference}">
              ${options}
            </select>
            <button class="button button-dark" type="button"
                    data-update-reference="${reference}">
              Save status
            </button>
          </div>
        </article>
      `;
    }).join("");
  }

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${config.API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`
      },
      credentials: "omit"
    });

    const result = await response.json().catch(() => ({}));

    if (response.status === 401) {
      sessionStorage.removeItem(SESSION_KEY);
      accessToken = null;
      showLogin("Your session expired. Please sign in again.");
      throw new Error("Your session has expired.");
    }

    if (!response.ok) {
      throw new Error(result.detail || "The request could not be completed.");
    }

    return result;
  }

  async function loadOrders() {
    showMessage(dashboardStatus, "Loading orders...");
    ordersList.innerHTML =
      '<div class="orders-empty">Loading customer orders...</div>';

    try {
      const filter = statusFilter.value;
      const query = filter ? `?status=${encodeURIComponent(filter)}` : "";
      const result = await apiRequest(`/api/admin/orders${query}`);

      renderOrders(result.orders || []);
      showMessage(
        dashboardStatus,
        `Loaded ${result.count || 0} order(s).`
      );
    } catch (error) {
      showMessage(dashboardStatus, error.message);
      if (accessToken) {
        ordersList.innerHTML =
          '<div class="orders-empty">Unable to load orders. Please try refreshing.</div>';
      }
    }
  }

  async function login(email, password) {
    if (
      !config ||
      !config.SUPABASE_URL ||
      !config.SUPABASE_ANON_KEY ||
      config.SUPABASE_URL.includes("PASTE_") ||
      config.SUPABASE_ANON_KEY.includes("PASTE_")
    ) {
      throw new Error("Admin login configuration is incomplete.");
    }

    const response = await fetch(
      `${config.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: config.SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ email, password }),
        credentials: "omit"
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.access_token) {
      throw new Error(
        result.msg ||
        result.message ||
        result.error_description ||
        "Sign-in failed. Check your email and password."
      );
    }

    accessToken = result.access_token;
    sessionStorage.setItem(SESSION_KEY, accessToken);

    showDashboard();
    await loadOrders();
  }

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";
    showMessage(loginStatus, "");

    try {
      const email = document.getElementById("adminEmail").value.trim();
      const password = document.getElementById("adminPassword").value;

      await login(email, password);
      loginForm.reset();
    } catch (error) {
      showLogin(error.message);
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Sign in securely";
    }
  });

  logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    accessToken = null;
    showLogin("You have signed out.");
  });

  refreshButton.addEventListener("click", loadOrders);
  statusFilter.addEventListener("change", loadOrders);

  ordersList.addEventListener("click", async event => {
    const button = event.target.closest("[data-update-reference]");
    if (!button) return;

    const reference = button.dataset.updateReference;
    const select = ordersList.querySelector(
      `[data-status-select="${CSS.escape(reference)}"]`
    );

    if (!select) return;

    button.disabled = true;
    button.textContent = "Saving...";

    try {
      await apiRequest(
        `/api/admin/orders/${encodeURIComponent(reference)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: select.value })
        }
      );

      showMessage(dashboardStatus, "Order status updated.");
      await loadOrders();
    } catch (error) {
      showMessage(dashboardStatus, error.message);
      button.disabled = false;
      button.textContent = "Save status";
    }
  });

  if (accessToken) {
    showDashboard();
    loadOrders();
  } else {
    showLogin();
  }
})();
