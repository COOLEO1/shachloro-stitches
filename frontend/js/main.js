const currentPage = window.location.pathname.split("/").pop() || "index.html";

const navigation = [
  ["index.html", "Home"],
  ["collections.html", "Collections"],
  ["about.html", "Our story"],
  ["track-order.html", "Track order"],
  ["contact.html", "Contact"]
];

const header = document.getElementById("site-header");

if (header) {
  header.innerHTML = `
    <header class="site-header">
      <div class="nav-wrap">
        <a class="brand" href="index.html" aria-label="SHACHLORO STITCHES home">
          <span class="brand-name">SHACHLORO STITCHES</span>
          <span class="brand-tag">The home of elegant designs</span>
        </a>

        <button class="menu-toggle" id="menuToggle"
          type="button" aria-expanded="false" aria-controls="navLinks">
          Menu ☰
        </button>

        <nav class="nav-links" id="navLinks" aria-label="Main navigation">
          ${navigation.map(([url, label]) =>
            `<a href="${url}" class="${currentPage === url ? "active" : ""}">${label}</a>`
          ).join("")}
          <a class="nav-cta" href="custom-order.html">Custom order</a>
        </nav>
      </div>
    </header>
  `;

  const toggle = document.getElementById("menuToggle");
  const links = document.getElementById("navLinks");

  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.textContent = isOpen ? "Close ✕" : "Menu ☰";
  });
}

const footer = document.getElementById("site-footer");

if (footer) {
  footer.innerHTML = `
    <footer class="site-footer">
      <div class="footer-inner">
        <div>
          <a class="brand" href="index.html">
            <span class="brand-name">SHACHLORO STITCHES</span>
            <span class="brand-tag">The home of elegant designs</span>
          </a>
          <p>Traditional inspiration, personal expression and elegant designs.</p>
        </div>
        <div class="footer-links">
          <a href="index.html">Home</a>
          <a href="collections.html">Collections</a>
          <a href="custom-order.html">Custom order</a>
          <a href="about.html">Our story</a>
          <a href="track-order.html">Track an order</a>
          <a href="contact.html">Contact</a>
        </div>
      </div>
      <div class="footer-bottom">
        © ${new Date().getFullYear()} SHACHLORO STITCHES. All rights reserved.
        <div class="photo-credit">
          Hero photograph: Rwebogora, Wikimedia Commons,
          <a href="https://creativecommons.org/licenses/by-sa/4.0/"
             target="_blank" rel="noopener">CC BY-SA 4.0</a>.
        </div>
      </div>
    </footer>
  `;
}


const orderForm = document.getElementById("orderForm");

if (orderForm) {
  const API_BASE_URL = "https://shachloro-test.onrender.com";
  const submitButton = orderForm.querySelector('button[type="submit"]');
  const status = document.getElementById("formStatus");

  orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!orderForm.reportValidity()) return;

    const form = new FormData(orderForm);

    const order = {
      customer_name: form.get("customerName").trim(),
      phone: form.get("phone").trim(),
      location: form.get("location").trim(),
      garment: form.get("garment"),
      size: form.get("size"),
      description: form.get("description").trim()
    };

    submitButton.disabled = true;
    submitButton.textContent = "Submitting order...";
    status.textContent = "Connecting to SHACHLORO STITCHES...";

    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "omit",
        body: JSON.stringify(order),
        signal: AbortSignal.timeout(90000)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many attempts. Please wait a minute before trying again.");
        }

        throw new Error(
          result.detail || "We couldn't submit your order. Please try again."
        );
      }

      status.textContent =
        `Your order has been received! Your reference number is ${result.reference}. Please keep it safe to track your order.`;

      orderForm.reset();

    } catch (error) {
      console.error("Order submission failed:", error);

      status.textContent =
        error.name === "TimeoutError"
          ? "The server took too long to respond. Please check your connection and try again."
          : error.message === "Failed to fetch"
            ? "We couldn't connect to the order service. Please check your internet connection and try again."
            : error.message || "Something went wrong. Please try again.";

    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Submit custom order";
    }
  });
}
