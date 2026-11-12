const currentPage = window.location.pathname.split("/").pop() || "index.html";

const navigation = [
  ["index.html", "Home"],
  ["collections.html", "Collections"],
  ["about.html", "Our story"],
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
  orderForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const status = document.getElementById("formStatus");
    status.textContent =
      "Frontend preview only. No order has been sent or saved. Backend connection is still required.";
  });
}
