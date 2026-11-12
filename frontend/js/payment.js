(() => {
  "use strict";

  const config = window.SHACHLORO_CONFIG;
  const reference = new URLSearchParams(location.search).get("ref");

  const loading = document.getElementById("paymentLoading");
  const details = document.getElementById("paymentDetails");
  const errorBox = document.getElementById("paymentError");

  const money = value =>
    "MWK " + Number(value || 0).toLocaleString("en-MW");

  function showError(message) {
    loading.hidden = true;
    details.hidden = true;
    errorBox.hidden = false;
    errorBox.textContent = message;
  }

  async function loadPayment() {
    if (!reference || !/^SHS-[A-Fa-f0-9]{32}$/.test(reference)) {
      showError("This payment link is invalid. Please check your order reference.");
      return;
    }

    if (!config || !config.API_BASE_URL) {
      showError("Payment information is temporarily unavailable.");
      return;
    }

    document.getElementById("paymentReference").textContent = reference;

    try {
      const response = await fetch(
        `${config.API_BASE_URL}/api/orders/payment/${encodeURIComponent(reference)}`,
        { credentials: "omit" }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.detail || "Unable to find this order.");
      }

      if (result.quoted_amount === null) {
        throw new Error("Your order is awaiting a quotation from the business.");
      }

      document.getElementById("paymentTotal").textContent =
        money(result.quoted_amount);

      document.getElementById("paymentDeposit").textContent =
        money(result.deposit_amount);

      document.getElementById("paymentPaid").textContent =
        money(result.amount_paid);

      document.getElementById("paymentBalance").textContent =
        money(result.balance);

      document.getElementById("paymentDue").textContent =
        money(result.amount_due);

      document.getElementById("dueLabel").textContent =
        result.deposit_amount > result.amount_paid
          ? "DEPOSIT CURRENTLY DUE"
          : "BALANCE CURRENTLY DUE";

      loading.hidden = true;
      details.hidden = false;

    } catch (error) {
      showError(error.message);
    }
  }

  loadPayment();
})();
