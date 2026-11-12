(() => {
  const API_BASE_URL = "https://shachloro-test.onrender.com";

  const form = document.getElementById("trackingForm");
  if (!form) return;

  const referenceInput = document.getElementById("orderReference");
  const button = document.getElementById("trackButton");
  const message = document.getElementById("trackingMessage");
  const resultPanel = document.getElementById("trackingResult");
  const statusBadge = document.getElementById("currentStatus");
  const referenceOutput = document.getElementById("resultReference");
  const createdDate = document.getElementById("createdDate");
  const progressList = document.getElementById("progressList");
  const cancelledMessage = document.getElementById("cancelledMessage");
  const checkAgain = document.getElementById("checkAgain");

  const stages = ["pending", "accepted", "in_progress", "completed"];

  const labels = {
    pending: "Pending",
    accepted: "Accepted",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled"
  };

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
  }

  function renderOrder(order) {
    const status = order.status;

    statusBadge.textContent = labels[status] || status;
    referenceOutput.textContent = order.reference;

    const date = new Date(order.created_at);
    createdDate.textContent = Number.isNaN(date.getTime())
      ? "Unavailable"
      : date.toLocaleString();

    cancelledMessage.hidden = status !== "cancelled";
    progressList.hidden = status === "cancelled";

    const currentIndex = stages.indexOf(status);

    progressList.querySelectorAll(".progress-step").forEach(step => {
      const stage = step.dataset.step;
      const index = stages.indexOf(stage);

      step.classList.toggle(
        "completed",
        currentIndex >= 0 && index < currentIndex
      );

      step.classList.toggle(
        "current",
        currentIndex >= 0 && index === currentIndex
      );

      const marker = step.querySelector(".step-marker");
      marker.textContent =
        currentIndex >= 0 && index < currentIndex ? "✓" : String(index + 1);
    });

    resultPanel.hidden = false;
  }

  async function trackOrder(reference) {
    button.disabled = true;
    button.textContent = "Checking...";
    resultPanel.hidden = true;
    showMessage("Looking up your order...");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/orders/track/${encodeURIComponent(reference)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "omit",
          signal: AbortSignal.timeout(30000)
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 404) {
        throw new Error("We couldn't find that order. Please check your reference number.");
      }

      if (response.status === 429) {
        throw new Error("Too many attempts. Please wait a minute and try again.");
      }

      if (!response.ok) {
        throw new Error(data.detail || "Unable to check your order right now.");
      }

      if (!data.reference || !labels[data.status]) {
        throw new Error("The tracking response was incomplete. Please try again.");
      }

      renderOrder(data);
      showMessage("Your latest order status is shown below.");
    } catch (error) {
      showMessage(
        error.name === "TimeoutError"
          ? "The request took too long. Please try again."
          : error.message || "Unable to connect. Please try again.",
        true
      );
    } finally {
      button.disabled = false;
      button.textContent = "Track my order";
    }
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    const reference = referenceInput.value.trim().toUpperCase();

    if (!/^SHS-[A-F0-9]{32}$/.test(reference)) {
      resultPanel.hidden = true;
      showMessage("Please enter a valid SHS order reference.", true);
      return;
    }

    referenceInput.value = reference;
    trackOrder(reference);
  });

  checkAgain.addEventListener("click", () => {
    const reference = referenceInput.value.trim().toUpperCase();
    if (reference) trackOrder(reference);
  });

  const params = new URLSearchParams(window.location.search);
  const suppliedReference = params.get("reference");

  if (suppliedReference) {
    referenceInput.value = suppliedReference.trim().toUpperCase();
    form.requestSubmit();
  }
})();
