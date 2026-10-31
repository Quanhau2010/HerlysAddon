/* HerlysAddon — landing site behaviour (vanilla JS, no dependencies) */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ *
   * Theme
   * ------------------------------------------------------------------ */
  const THEME_KEY = "herlys-theme";
  const root = document.documentElement;
  const themeToggle = $("#themeToggle");

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", String(theme === "light"));
      themeToggle.setAttribute("title", theme === "light" ? "Chuyển sang giao diện tối" : "Chuyển sang giao diện sáng");
    }
  };

  let storedTheme = null;
  try { storedTheme = localStorage.getItem(THEME_KEY); } catch (_) { /* private mode */ }
  applyTheme(storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark");

  themeToggle?.addEventListener("click", () => {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (_) { /* ignore */ }
  });

  /* ------------------------------------------------------------------ *
   * Toast
   * ------------------------------------------------------------------ */
  const toast = $("#toast");
  let toastTimer = 0;

  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
  };

  /* ------------------------------------------------------------------ *
   * Header + navigation
   * ------------------------------------------------------------------ */
  const header = $("#siteHeader");
  const nav = $("#primaryNav");
  const navToggle = $("#navToggle");

  const setNavOpen = (open) => {
    if (!nav || !navToggle) return;
    nav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Đóng menu" : "Mở menu");
  };

  navToggle?.addEventListener("click", () => {
    setNavOpen(!nav.classList.contains("is-open"));
  });

  nav?.addEventListener("click", (event) => {
    if (event.target.closest("a")) setNavOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav?.classList.contains("is-open")) {
      setNavOpen(false);
      navToggle?.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (!nav?.classList.contains("is-open")) return;
    if (nav.contains(event.target) || navToggle?.contains(event.target)) return;
    setNavOpen(false);
  });

  const onScroll = () => {
    const stuck = window.scrollY > 12;
    header?.classList.toggle("is-stuck", stuck);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* active section link */
  const navLinks = $$(".nav a");
  const sections = navLinks
    .map((link) => {
      const id = link.getAttribute("href");
      return id && id.startsWith("#") ? $(id) : null;
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const activeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) =>
            link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`)
          );
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((section) => activeObserver.observe(section));
  }

  /* ------------------------------------------------------------------ *
   * Reveal on scroll
   * ------------------------------------------------------------------ */
  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    reveals.forEach((el) => revealObserver.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  /* ------------------------------------------------------------------ *
   * Counters
   * ------------------------------------------------------------------ */
  const animateCount = (el, target) => {
    if (reduceMotion) { el.textContent = String(target); return; }
    const duration = 1200;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const counters = $$("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          animateCount(el, Number(el.dataset.count) || 0);
          counterObserver.unobserve(el);
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach((el) => counterObserver.observe(el));
  } else {
    counters.forEach((el) => { el.textContent = el.dataset.count || ""; });
  }

  /* ------------------------------------------------------------------ *
   * Module explorer
   * ------------------------------------------------------------------ */
  const modules = Array.isArray(window.HERLYS_MODULES) ? window.HERLYS_MODULES : [];
  const grid = $("#moduleGrid");
  const searchInput = $("#moduleSearch");
  const chips = $$(".chip[data-filter]");
  const statusEl = $("#moduleStatus");
  const emptyEl = $("#moduleEmpty");
  const moreBtn = $("#moduleMore");
  const resetBtn = $("#moduleReset");

  const PAGE_SIZE = 24;
  const state = { query: "", category: "all", limit: PAGE_SIZE };

  /* fold Vietnamese diacritics so "totem"/"tôtem" and "esp" match naturally */
  const fold = (value) =>
    String(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");

  const catLabel = { eco: "Kinh tế", pvp: "PvP", esp: "ESP" };

  const counts = modules.reduce((acc, mod) => {
    acc.all += 1;
    acc[mod.c] = (acc[mod.c] || 0) + 1;
    return acc;
  }, { all: 0, eco: 0, pvp: 0, esp: 0 });

  $$("[data-count-for]").forEach((el) => {
    const key = el.dataset.countFor;
    el.textContent = String(counts[key] ?? 0);
  });

  /* keep the hero statistic honest */
  $$('[data-count="110"]').forEach((el) => { el.dataset.count = String(modules.length); });

  const filtered = () => {
    const q = fold(state.query).trim();
    return modules.filter((mod) => {
      if (state.category !== "all" && mod.c !== state.category) return false;
      if (!q) return true;
      return fold(mod.n).includes(q) || fold(mod.d).includes(q);
    });
  };

  const createCard = (mod, index) => {
    const card = document.createElement("article");
    card.className = "module-card";
    card.style.animationDelay = `${Math.min(index, 12) * 22}ms`;
    card.innerHTML = `
      <header>
        <span class="module-dot ${mod.c}" aria-hidden="true"></span>
        <h3 class="module-name"></h3>
        <span class="module-cat">${catLabel[mod.c] || mod.c}</span>
      </header>
      <p class="module-desc"></p>`;
    card.querySelector(".module-name").textContent = mod.n;
    card.querySelector(".module-desc").textContent = mod.d;
    return card;
  };

  const render = () => {
    if (!grid) return;
    const list = filtered();
    const visible = list.slice(0, state.limit);

    grid.replaceChildren(...visible.map(createCard));

    if (emptyEl) emptyEl.hidden = list.length !== 0;
    grid.hidden = list.length === 0;

    if (statusEl) {
      const total = modules.length;
      if (list.length === 0) {
        statusEl.textContent = `Không có module khớp trong ${total} module.`;
      } else {
        statusEl.innerHTML =
          `Hiển thị <strong>${visible.length}</strong> / <strong>${list.length}</strong> module` +
          ` <span class="tx-none-720">· tổng cộng ${total}</span>`;
      }
    }

    if (moreBtn) moreBtn.hidden = visible.length >= list.length;
  };

  const resetFilters = () => {
    state.query = "";
    state.category = "all";
    state.limit = PAGE_SIZE;
    if (searchInput) searchInput.value = "";
    chips.forEach((chip) => {
      const active = chip.dataset.filter === "all";
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", String(active));
    });
    render();
  };

  chips.forEach((chip) => {
    chip.setAttribute("aria-pressed", String(chip.classList.contains("is-active")));
    chip.addEventListener("click", () => {
      state.category = chip.dataset.filter || "all";
      state.limit = PAGE_SIZE;
      chips.forEach((other) => {
        const active = other === chip;
        other.classList.toggle("is-active", active);
        other.setAttribute("aria-pressed", String(active));
      });
      render();
    });
  });

  let searchTimer = 0;
  searchInput?.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      state.query = searchInput.value;
      state.limit = PAGE_SIZE;
      render();
    }, 90);
  });

  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      searchInput.value = "";
      state.query = "";
      state.limit = PAGE_SIZE;
      render();
      searchInput.blur();
    }
  });

  moreBtn?.addEventListener("click", () => {
    state.limit += PAGE_SIZE;
    render();
  });

  resetBtn?.addEventListener("click", resetFilters);

  if (grid) render();

  /* "/" focuses the search field */
  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
    const tag = (event.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || event.target.isContentEditable) return;
    if (!searchInput) return;
    event.preventDefault();
    searchInput.focus();
    searchInput.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
  });

  /* ------------------------------------------------------------------ *
   * Copy buttons
   * ------------------------------------------------------------------ */
  const copyText = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) { /* fall through */ }

    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch (_) {
      return false;
    }
  };

  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const text = btn.dataset.copy || "";
      const ok = await copyText(text);
      showToast(ok ? "Đã sao chép vào clipboard" : "Không sao chép được — hãy chọn thủ công");

      if (ok && btn.classList.contains("copy-btn")) {
        btn.classList.add("is-copied");
        window.setTimeout(() => btn.classList.remove("is-copied"), 1600);
      }
    });
  });

  /* ------------------------------------------------------------------ *
   * Install tabs
   * ------------------------------------------------------------------ */
  const installTabs = $$("[data-install-tab]");
  const installPanels = $$("[data-install-panel]");

  installTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const key = tab.dataset.installTab;
      installTabs.forEach((other) => {
        const active = other === tab;
        other.classList.toggle("is-active", active);
        other.setAttribute("aria-selected", String(active));
      });
      installPanels.forEach((panel) => {
        const active = panel.dataset.installPanel === key;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });
    });
  });

  /* ------------------------------------------------------------------ *
   * Download modal
   * ------------------------------------------------------------------ */
  const modal = $("#downloadModal");
  const platformButtons = $$("[data-platform]");
  const fileName = $("[data-file-name]");
  const fileDesc = $("[data-file-desc]");
  const fileTag = $("[data-file-tag]");
  let lastFocused = null;

  const PLATFORMS = {
    win: {
      name: "HerlysAddon-1.21.11.jar",
      desc: "Miễn phí · bản đầy đủ: payload, native host và guard.",
      tag: "Full"
    },
    mac: {
      name: "HerlysAddon-1.21.11-mac.jar",
      desc: "Miễn phí · jar-only, chạy degraded (chưa có native host cho mac).",
      tag: "Jar-only"
    }
  };

  const openModal = () => {
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    const focusTarget = $(".modal-close", modal);
    window.setTimeout(() => focusTarget?.focus(), 40);
    document.addEventListener("keydown", onModalKeydown);
  };

  const closeModal = () => {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onModalKeydown);
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  };

  function onModalKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== "Tab" || !modal) return;

    const focusable = $$(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      modal
    ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  $$("[data-open-download]").forEach((btn) => btn.addEventListener("click", openModal));
  $$("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault();
      closeModal();
      if (el.getAttribute("href") === "#install") {
        document.getElementById("install")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      }
    });
  });

  platformButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.platform;
      const info = PLATFORMS[key];
      if (!info) return;
      platformButtons.forEach((other) => other.classList.toggle("is-active", other === btn));
      if (fileName) fileName.textContent = info.name;
      if (fileDesc) fileDesc.textContent = info.desc;
      if (fileTag) fileTag.textContent = info.tag;
    });
  });

  /* ------------------------------------------------------------------ *
   * Back to top
   * ------------------------------------------------------------------ */
  const toTop = $("#toTop");
  if (toTop) {
    const syncToTop = () => toTop.classList.toggle("is-visible", window.scrollY > 640);
    syncToTop();
    window.addEventListener("scroll", syncToTop, { passive: true });
    toTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ------------------------------------------------------------------ *
   * Misc
   * ------------------------------------------------------------------ */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* GUI mock tabs: purely cosmetic, but should feel alive */
  const guiTabs = $$(".gui-tab");
  guiTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      guiTabs.forEach((other) => {
        other.classList.toggle("is-active", other === tab);
        other.setAttribute("aria-selected", String(other === tab));
      });
    });
  });
})();
