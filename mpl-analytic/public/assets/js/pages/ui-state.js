/* =====================================================
   UiState — komponen state seragam untuk semua halaman
   Pakai:  UiState.render(elemen, "empty|error|loading", { title, text, onRetry })
   Simulasi (hanya di localhost): ?state=empty|error|loading|partial[&section=build,stats]
   ===================================================== */
(function (w) {
    "use strict";

    const SVG = {
        empty: '<svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><rect x="4" y="10" width="4" height="10" rx="1"/><rect x="10" y="4" width="4" height="16" rx="1"/><rect x="16" y="12" width="4" height="8" rx="1"/></svg>',
        error: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D42626" stroke-width="2.4" stroke-linecap="round"><path d="M12 6v8"/><circle cx="12" cy="18.2" r="0.6" fill="#D42626"/></svg>',
        loading: '<span class="ui-state__spinner"></span>'
    };

    const COPY = {
        empty:   { title: "Data belum tersedia", text: "Saat ini belum ada data untuk ditampilkan." },
        error:   { title: "Data gagal dimuat", text: "Terjadi kendala saat mengambil data. Periksa koneksi internet Anda lalu coba lagi." },
        loading: { title: "Memuat data...", text: "" }
    };

    function render(target, type, opts) {
        if (!target) return;
        opts = opts || {};
        const t = COPY[type] ? type : "empty";
        const title = opts.title || COPY[t].title;
        const text = opts.text !== undefined ? opts.text : COPY[t].text;

        const wrap = document.createElement("div");
        wrap.className = "ui-state ui-state--" + t;
        wrap.setAttribute("role", t === "error" ? "alert" : "status");

        const icon = document.createElement("span");
        icon.className = "ui-state__icon";
        icon.setAttribute("aria-hidden", "true");
        icon.innerHTML = SVG[t];
        wrap.appendChild(icon);

        const h = document.createElement("p");
        h.className = "ui-state__title";
        h.textContent = title;
        wrap.appendChild(h);

        if (text) {
            const p = document.createElement("p");
            p.className = "ui-state__text";
            p.textContent = text;
            wrap.appendChild(p);
        }

        // Tombol "Coba Lagi" hanya untuk error
        if (t === "error" && typeof opts.onRetry === "function") {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "ui-state__button";
            btn.textContent = "Coba Lagi";
            btn.addEventListener("click", function () {
                btn.disabled = true;
                btn.textContent = "Memuat...";
                opts.onRetry();
            });
            wrap.appendChild(btn);
        }

        target.replaceChildren(wrap);
    }

    // Simulasi state lewat URL — otomatis nonaktif di server production
    function simulate() {
        if (!["localhost", "127.0.0.1"].includes(w.location.hostname)) return null;
        const q = new URLSearchParams(w.location.search);
        const state = q.get("state");
        if (!["empty", "error", "loading", "partial"].includes(state)) return null;
        const sec = q.get("section");
        return { state: state, sections: sec ? sec.split(",").map(function (s) { return s.trim(); }) : null };
    }

    w.UiState = { render: render, simulate: simulate, COPY: COPY };
})(window);