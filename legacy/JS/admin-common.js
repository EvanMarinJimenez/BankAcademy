document.addEventListener("DOMContentLoaded", () => {

    const sidebar = document.querySelector(".sidebar");

    if (!sidebar) return;

    sidebar.querySelectorAll(".nav-item").forEach(item => {

        const label = item.querySelector("span")?.textContent.trim();

        if (label) {
            item.dataset.label = label;
        }

    });

    if (window.lucide) {
        lucide.createIcons();
    }

});
