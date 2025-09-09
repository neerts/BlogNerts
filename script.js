/* ================== DATA ================== */
const articles = (typeof defaultArticles !== "undefined" && Array.isArray(defaultArticles)) ?
	defaultArticles.map(a => ({
		...a,
		slug: a.slug || slugify(a.title)
	})) :
	[];

/* ================== DOM ================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const searchbox = $("#searchbox");
const searchWrap = $("#searchWrap");
const searchInput = $("#searchInput");
const searchBtn = $("#searchBtn");
const searchResults = $("#searchResults");
const resultsBox = $("#resultsBox");

const homepage = $("#homepage");
const articlePage = $("#articlePage");
const articleContent = $("#articleContent");

const menuBtn = $("#menuBtn");
const sidebar = $("#sidebar");
const overlay = $("#overlay");

const settingsSheet = $("#settingsSheet");
const settingsClose = $("#settingsClose");

/* Pengaturan (radio) */
const fontRadios = $$("input[name='fontSize']");
const themeRadios = $$("input[name='themeMode']");

/* Header kebab (untuk halaman artikel) */
const kebabBtn = document.getElementById('articleKebab');
const kebabMenu = document.getElementById('articleKebabMenu');

/* ====== HELP PAGE (Panduan) ====== */
const helpMenu     = document.getElementById('helpMenu');
const helpPage     = document.getElementById('helpPage');
const backFromHelp = document.getElementById('backFromHelp');

function openHelp() {
  closePanel();
  resultsBox?.classList.add('hidden');
  sidebar?.classList.remove('active');
  if (overlay) overlay.style.display = 'none';

  homepage?.classList.add('hidden');
  articlePage?.classList.add('hidden');
  helpPage?.classList.remove('hidden');

  document.body.classList.add('no-scroll');   // kunci scroll body
  showArticleKebab(false);
  if (location.hash !== '#/help') location.hash = '#/help';
}

function closeHelpToHome() {
  helpPage?.classList.add('hidden');
  homepage?.classList.remove('hidden');
  document.body.classList.remove('no-scroll'); // lepas kunci scroll
  showArticleKebab(false);
  if (location.hash !== '#/') location.hash = '#/';
}

/* ================== STATE ================== */
let fullMode = false; // sedang tampilan hasil penuh
let currentResults = [];
let currentPage = 1;
const perPage = 20;

/* ================== UTIL ================== */
const norm = s => (s || "").toLowerCase().trim();
const normalize = t => (t || "").toString().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/* ===== Translate dropdown ===== */
const LANGUAGES = [{
		code: 'en',
		label: 'English'
	},
	{
		code: 'id',
		label: 'Indonesia'
	},
	{
		code: 'es',
		label: 'Español'
	},
	{
		code: 'pt',
		label: 'Português'
	},
	{
		code: 'fr',
		label: 'Français'
	},
	{
		code: 'de',
		label: 'Deutsch'
	},
	{
		code: 'ru',
		label: 'Русский'
	},
	{
		code: 'ar',
		label: 'العربية'
	},
	{
		code: 'hi',
		label: 'हिन्दी'
	},
	{
		code: 'ja',
		label: '日本語'
	},
	{
		code: 'ko',
		label: '한국어'
	},
	{
		code: 'zh-CN',
		label: '简体中文'
	}
];

function buildLangDropdown() {
	const box = document.getElementById('langDropdown');
	if (!box) return;
	box.innerHTML = LANGUAGES.map(l =>
		`<button class="lang-item" type="button" data-lang="${l.code}">${l.label}</button>`
	).join('');
}

function openTranslate(lang) {
	const turl = `https://translate.google.com/translate?hl=${lang}&sl=auto&tl=${encodeURIComponent(lang)}&u=${encodeURIComponent(location.href)}`;
	window.open(turl, '_blank', 'noopener');
}

function slugify(text) {
	return (text || "")
		.toString()
		.normalize("NFD").replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function highlight(text, q) {
	if (!q) return text;
	const L = normalize(text),
		NQ = normalize(q);
	const i = L.indexOf(NQ);
	if (i === -1) return text;
	return text.slice(0, i) + '<span class="hl">' + text.slice(i, i + q.length) + '</span>' + text.slice(q.length + i);
}

function getQueryParam(name) {
	const sp = new URLSearchParams(location.search);
	return sp.get(name);
}

function setQueryParam(name, value) {
	const url = new URL(location.href);
	const sp = url.searchParams;
	if (value && value.trim()) {
		sp.set(name, value);
	} else {
		sp.delete(name);
	}
	history.replaceState({}, "", url.toString());
}

function debounce(fn, ms = 300) {
	let t;
	return (...args) => {
		clearTimeout(t);
		t = setTimeout(() => fn(...args), ms);
	};
}

/* Toast kecil */
let toastTimer;

function showToast(msg) {
	let el = document.querySelector('.toast');
	if (!el) {
		el = document.createElement('div');
		el.className = 'toast';
		document.body.appendChild(el);
	}
	el.textContent = msg;
	el.classList.add('show');
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

// ===== HENTIKAN SEMUA IFRAME (YouTube) =====
function stopAllIframes() {
  document.querySelectorAll('iframe').forEach(f => {
    try { f.src = f.src; } catch {}
  });
}

/* ================== SEARCH HELPERS ================== */
function getSuggest(q) {
	const n = normalize(q).trim();
	if (!n) return [];
	return articles.filter(a => normalize(a.title).includes(n)).slice(0, 5);
}

function getMatches(q) {
	const n = norm(q);
	if (!n) return []; // input kosong TIDAK menampilkan semua
	return articles.filter(a => norm(a.title).includes(n));
}

/* ================== RENDER ================== */
function openPanel() {
	searchbox?.classList.add("open");
}

function closePanel() {
	searchbox?.classList.remove("open");
	if (searchResults) searchResults.innerHTML = "";
	searchWrap?.classList.remove("error");
}

function renderSuggest(list, kw) {
  if (!searchResults) return;
  searchResults.innerHTML = "";

  if (!list.length) {
    searchWrap?.classList.add("error");
    const empty = document.createElement("div");
    empty.className = "result-row";
    empty.innerHTML = `<div></div><div class="result-desc">Tidak ada hasil ditemukan.</div>`;
    searchResults.appendChild(empty);
    return;
  }
  searchWrap?.classList.remove("error");

  list.forEach((a) => {
    const row = document.createElement("a");
    row.href = "#";
    row.className = "result-row";
    row.onclick = (e) => { e.preventDefault(); openArticleBySlug(a.slug); };

    const thumb = a.youtubeUrl ? getYouTubeThumb(a.youtubeUrl) : (a.image || "");

    row.innerHTML = `
      <div class="result-thumb">
        <img src="${thumb || "https://via.placeholder.com/320x180?text=%20"}" alt="">
      </div>
      <div class="result-main">
        <div class="result-title">${highlight(a.title, kw)}</div>
        <div class="result-desc">${truncateText(a.description, 120)}</div>
      </div>
    `;
    searchResults.appendChild(row);
  });
}

function renderResultsBox(list, kw) {
  if (!resultsBox) return;

  // Header hasil
  resultsBox.innerHTML = `
    <div class="result-header">
      <div class="result-info">Menampilkan ${list.length} artikel</div>
      <button id="closeResultsBtn" class="close-results" aria-label="Tutup hasil">✕</button>
    </div>
  `;
  resultsBox.classList.remove("hidden");

  if (!list.length) {
    searchWrap?.classList.add("error");
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Tidak ada hasil ditemukan.";
    resultsBox.appendChild(empty);
    return;
  }
  searchWrap?.classList.remove("error");

  // Pagination
  const total = list.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  if (currentPage > lastPage) currentPage = lastPage;

  const start = (currentPage - 1) * perPage;
  const end   = start + perPage;
  const pageResults = list.slice(start, end);

  // List hasil
  pageResults.forEach((a) => {
    const row = document.createElement("a");
    row.href = "#";
    row.className = "result-row";
    row.onclick = (e) => { e.preventDefault(); openArticleBySlug(a.slug); };

    const thumb = a.youtubeUrl ? getYouTubeThumb(a.youtubeUrl) : (a.image || "");

    row.innerHTML = `
      <div class="result-thumb">
        <img src="${thumb || "https://via.placeholder.com/320x180?text=%20"}" alt="">
      </div>
      <div class="result-main">
        <div class="result-title">${highlight(a.title, kw)}</div>
        <div class="result-desc">${truncateText(a.description, 140)}</div>
      </div>
    `;
    resultsBox.appendChild(row);
  });

  // Navigasi halaman
  const nav = document.createElement("div");
  nav.className = "pagination";

  if (currentPage > 1) {
    const prev = document.createElement("button");
    prev.className = "page-btn";
    prev.textContent = "Sebelumnya";
    prev.onclick = () => { currentPage--; renderResultsBox(currentResults, searchInput.value); };
    nav.appendChild(prev);
  }

  const pi = document.createElement("span");
  pi.className = "page-info";
  pi.textContent = `Halaman ${currentPage} dari ${lastPage}`;
  nav.appendChild(pi);

  if (end < total) {
    const next = document.createElement("button");
    next.className = "page-btn";
    next.textContent = "Berikutnya";
    next.onclick = () => { currentPage++; renderResultsBox(currentResults, searchInput.value); };
    nav.appendChild(next);
  }

  resultsBox.appendChild(nav);

  // Bind tombol tutup
  const closeBtn = resultsBox.querySelector("#closeResultsBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      resultsBox.classList.add("hidden");
      searchInput.value = "";
      currentResults = [];
      fullMode = false;
    });
  }
}

/* ================== EVENTS ================== */
const syncQueryDebounced = debounce((val) => setQueryParam("q", val), 400);

function onType() {
	const kw = searchInput?.value ?? "";
	syncQueryDebounced(kw);

	if (fullMode) {
		fullMode = false;
		resultsBox?.classList.add("hidden");
	}
	if (!kw.trim()) {
		closePanel();
		return;
	}
	const list = getSuggest(kw);
	openPanel();
	renderSuggest(list, kw);
}

function runFull() {
	const kw = (searchInput?.value ?? "").trim();

	// Jika kosong: jangan tampilkan apa pun
	if (!kw) {
		fullMode = false;
		resultsBox?.classList.add("hidden");
		closePanel();
		searchWrap?.classList.add("error");
		setTimeout(() => searchWrap?.classList.remove("error"), 1200);
		setQueryParam("q", "");
		currentResults = [];
		currentPage = 1;
		return;
	}

	// Normal: tampilkan hasil penuh + pagination
	fullMode = true;
	closePanel();
	currentPage = 1;

	setQueryParam("q", kw);
	currentResults = getMatches(kw);
	renderResultsBox(currentResults, kw);
}

document.addEventListener("click", (e) => {
	if (!searchbox?.contains(e.target) && !fullMode) {
		closePanel();
	}
});

/* ================== MINI FITUR ================== */
function openRandomArticle() {
	if (!articles || articles.length === 0) return;
	const idx = Math.floor(Math.random() * articles.length);
	const randomSlug = articles[idx].slug;
	openArticleBySlug(randomSlug);
}

/* ================== ARTIKEL (hero view + YouTube thumb) ================== */

function showArticleKebab(show) {
	if (!kebabBtn) return;
	if (show) kebabBtn.classList.remove('hidden');
	else {
		kebabBtn.classList.add('hidden');
		kebabMenu?.classList.add('hidden');
	}
}

/* kebab header: toggle & klik-luar = tutup */
kebabBtn?.addEventListener('click', (e) => {
	e.stopPropagation();
	kebabMenu.classList.toggle('hidden');
});
document.addEventListener('click', (e) => {
	if (!kebabMenu.classList.contains('hidden')) {
		const inside = e.target === kebabBtn || kebabMenu.contains(e.target);
		if (!inside) kebabMenu.classList.add('hidden');
	}
});

/* aksi menu kebab */
kebabMenu?.addEventListener('click', async (e) => {
	const item = e.target.closest('.menu-item');
	if (!item) return;
	const act = item.dataset.act;
	const url = location.href;
	const title = document.querySelector('.article-title-hero')?.textContent || document.title;

	if (act === 'share') {
		try {
			if (navigator.share) {
				await navigator.share({
					title,
					text: title,
					url
				});
			} else {
				await navigator.clipboard.writeText(url);
				showToast('Tautan disalin');
			}
		} catch {
			showToast('Gagal membagikan');
		}
	}
	if (act === 'copy') {
		try {
			await navigator.clipboard.writeText(url);
			showToast('Tautan disalin');
		} catch {
			showToast('Gagal menyalin');
		}
	}
	kebabMenu.classList.add('hidden');
});

function openArticleBySlug(slug) {
	const a = articles.find(x => x.slug === slug);
	if (!a) return;
  stopAllIframes();

	if (location.hash !== `#/artikel/${slug}`) {
		location.hash = `#/artikel/${slug}`;
	}

	const thumb = a.youtubeUrl ? getYouTubeThumb(a.youtubeUrl) : (a.image || "");
  const hasMedia = !!(a.youtubeUrl || a.image);
  
  articleContent.className = "article-view";
  articleContent.innerHTML = `
    <h1 class="article-title-hero">${a.title}</h1>
    ${
      hasMedia
        ? (a.youtubeUrl
            ? (() => {
                // ambil ID video
                let vid = "";
                try {
                  const u = new URL(a.youtubeUrl);
                  if (u.hostname.includes("youtu.be")) {
                    vid = u.pathname.slice(1);
                  } else if (u.searchParams.get("v")) {
                    vid = u.searchParams.get("v");
                  }
                } catch {}
            return `
              <div class="preview-box video-wrapper">
                <iframe 
                  src="https://www.youtube.com/embed/${vid}" 
                  frameborder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowfullscreen>
                </iframe>
              </div>
              <a href="${a.youtubeUrl}" target="_blank" rel="noopener" class="yt-continue">
                Tonton di YouTube
              </a>
            `;
            })()
            : `<div class="preview-box"><span class="preview-media"><img src="${a.image}" alt="${a.title}"></span></div>`
          )
        : `<div class="preview-box"><div class="preview-note">Tidak ada media</div></div>`
    }
    ${a.description ? `<p class="article-desc">${a.description}</p>` : ""}
    <div class="article-prose">${(a.content || "").replace(/\n/g,"<br>")}</div>
    <a href="#" class="back-link" onclick="goHome();return false;">← Kembali ke Beranda</a>
  `;

	// tampilkan halaman artikel
	homepage?.classList.add("hidden");
	articlePage?.classList.remove("hidden");
	setTimeout(() => articlePage?.classList.add("active"), 10);

	// bersihkan panel hasil
	closePanel();
	resultsBox?.classList.add("hidden");
	fullMode = false;

	// tampilkan kebab header
	showArticleKebab(true);
}

// Helper untuk memotong teks panjang → tambahkan "…" di akhir
function truncateText(str, max) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max).trim() + "…" : str;
}

/* helper: ambil thumbnail dari url youtube */
function getYouTubeThumb(url) {
	try {
		const u = new URL(url);
		let id = "";
		if (u.hostname.includes("youtu.be")) {
			id = u.pathname.slice(1);
		} else if (u.searchParams.get("v")) {
			id = u.searchParams.get("v");
		} else if (u.pathname.startsWith("/embed/")) {
			id = u.pathname.split("/embed/")[1];
		}
		return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
	} catch (e) {
		return "";
	}
}

window.goHome = function() {
  // hentikan audio/video
  stopAllIframes();

  // kosongkan konten artikel supaya iframe benar-benar hilang
  if (articleContent) {
    articleContent.innerHTML = "";
    articleContent.className = "";
  }

  // animasi tutup + kembali ke beranda
  articlePage?.classList.remove("active");
  setTimeout(() => {
    articlePage?.classList.add("hidden");
    homepage?.classList.remove("hidden");
    helpPage?.classList.add('hidden');
    closePanel();
    resultsBox?.classList.add("hidden");
    fullMode = false;
    if (searchInput) searchInput.value = "";
    showArticleKebab(false);
    if (location.hash && location.hash !== "#/") {
      location.hash = "#/";
    }
  }, 200);
};

/* ================== ROUTER (HASH + QUERY) ================== */
function parseHash() {
	const h = location.hash || "#/";
	const parts = h.replace(/^#\/?/, "").split("/");
	return {
		route: parts[0] || "",
		param: parts[1] || ""
	};
}

function loadFromURL(initial = false) {
  const { route, param } = parseHash();
  const q = getQueryParam("q") || "";

  // === BUKA ARTIKEL ===
  if (route === "artikel" && param) {
    openArticleBySlug(param);
    return;
  }

  // === BUKA PANDUAN ===
  if (route === "help") {
    openHelp();
    return;
  }

  // === KEMBALI KE BERANDA ===
  articlePage?.classList.remove("active");
  articlePage?.classList.add("hidden");
  helpPage?.classList.add('hidden');   // <-- pastikan help disembunyikan
  homepage?.classList.remove("hidden");
  showArticleKebab(false);

  // hentikan & bersihkan iframe jika ada
  stopAllIframes();
  if (articleContent) { articleContent.innerHTML = ""; articleContent.className = ""; }

	if (q) {
		if (searchInput) searchInput.value = q;
		fullMode = true;
		currentPage = 1;
		currentResults = getMatches(q);
		renderResultsBox(currentResults, q);
	} else {
		resultsBox?.classList.add("hidden");
		closePanel();
		if (initial && searchInput) searchInput.value = "";
	}
}

window.addEventListener("hashchange", () => loadFromURL(false));
window.addEventListener("popstate", () => loadFromURL(false));

/* ================== SIDEBAR + SHEET ================== */
function closeSidebar() {
	sidebar?.classList.remove('active');
	if (overlay) overlay.style.display = 'none';
}
if (menuBtn && sidebar && overlay) {
	menuBtn.addEventListener("click", () => {
		sidebar.classList.add("active");
		overlay.style.display = "block";
	});
	overlay.addEventListener("click", () => {
		if (sidebar.classList.contains("active")) sidebar.classList.remove("active");
		if (!settingsSheet.classList.contains("hidden")) settingsSheet.classList.add("hidden");
		overlay.style.display = "none";
	});
}

$$('#sidebar .side-item').forEach(el => {
	el.addEventListener('click', (e) => {
		const act = el.dataset.action;
		sidebar.classList.remove('active');
		overlay.style.display = 'none';
		if (act === 'home') {
			e.preventDefault();
			location.hash = "#/";
			loadFromURL(false);
		}
		if (act === 'settings') {
			e.preventDefault();
			openSettingsSheet();
		}
		if (act === 'random') {
			e.preventDefault();
			openRandomArticle();
			closeSidebar();
		}
	});
});

function openSettingsSheet() {
	settingsSheet.classList.remove('hidden');
	overlay.style.display = 'block';
}
settingsClose?.addEventListener('click', () => {
	settingsSheet.classList.add('hidden');
	overlay.style.display = 'none';
});

/* ================== PENGATURAN (font & tema) ================== */
function applyFontSize(val) {
	// Standar=1.00, Normal=1.10, Besar=1.25
	const scale = val === 'besar' ? 1.25 : (val === 'normal' ? 1.10 : 1.00);
	document.documentElement.style.setProperty('--article-scale', scale);
	localStorage.setItem('fontSize', val);
}

function applyTheme(mode) {
	document.body.classList.toggle('light-mode', mode === 'light');
	localStorage.setItem('themeMode', mode);
}

function initSettings() {
	let savedTheme = localStorage.getItem('themeMode');
	if (!savedTheme) {
		// Pertama kali: pakai dark, lalu simpan agar konsisten next load
		savedTheme = 'dark';
		localStorage.setItem('themeMode', 'dark');
	}
	const savedFont = localStorage.getItem('fontSize') || 'standar';

	applyTheme(savedTheme);
	applyFontSize(savedFont);

	fontRadios.forEach(r => {
		r.checked = (r.value === savedFont);
		r.addEventListener('change', () => applyFontSize(r.value));
	});
	themeRadios.forEach(r => {
		r.checked = (r.value === savedTheme);
		r.addEventListener('change', (e) => {
			applyTheme(e.target.value);
		});
	});
}

/* ========== KATEGORI ========== */

// Ambil kategori unik dari data articles (wajib: tiap artikel punya a.categories = ["...","..."])
function getAllCategories() {
	const map = new Map();
	articles.forEach(a => {
		(a.categories || []).forEach(k => {
			const key = (k || "").trim();
			if (!key) return;
			map.set(key, (map.get(key) || 0) + 1);
		});
	});
	// urutkan alfabet
	return Array.from(map.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([name, count]) => ({
			name,
			count
		}));
}

// Render ke daftar dalam modal (dengan optional filter teks)
function renderCategoryList(filterText = "") {
	const listEl = document.getElementById('categoryList');
	if (!listEl) return;

	const q = (filterText || "").toLowerCase().trim();
	const cats = getAllCategories().filter(c => c.name.toLowerCase().includes(q));

	listEl.innerHTML = "";
	cats.forEach(c => {
		const btn = document.createElement('button');
		btn.className = 'category-item';
		btn.setAttribute('role', 'option');
		btn.innerHTML = `
      <span class="category-dot"></span>
      <span class="category-name">${c.name}</span>
      <span class="category-count">${c.count}</span>
    `;
		btn.addEventListener('click', () => {
			// filter artikel sesuai kategori lalu tampilkan dengan renderer hasil penuh
			const list = articles.filter(a => (a.categories || []).some(x => (x || "").toLowerCase() === c.name.toLowerCase()));
			currentResults = list;
			currentPage = 1;
			fullMode = true;
			// sembunyikan panel suggest
			closePanel();
			// kosongkan query-string q biar tidak membingungkan
			setQueryParam("q", "");
			// tampilkan hasil penuh (pakai komponen existing)
			renderResultsBox(currentResults, "");
			// tutup modal
			toggleCategoryModal(false);
		});
		listEl.appendChild(btn);
	});

	if (cats.length === 0) {
		const empty = document.createElement('div');
		empty.className = 'result-desc';
		empty.style.padding = '12px';
		empty.textContent = 'Kategori tidak ditemukan.';
		listEl.appendChild(empty);
	}
}

function toggleCategoryModal(show) {
	const modal = document.getElementById('categoryModal');
	if (!modal) return;
	modal.classList.toggle('hidden', !show);
	if (show) {
		// reset pencarian kategori
		const inp = document.getElementById('categorySearchInput');
		if (inp) {
			inp.value = "";
			renderCategoryList("");
			setTimeout(() => inp.focus(), 50);
		}
	}
}

/* Event kategori */
(function bindCategoryUI() {
	const openBtn = document.getElementById('openCategoryBtn');
	const closeBtn = document.getElementById('categoryClose');
	const modal = document.getElementById('categoryModal');
	const searchIn = document.getElementById('categorySearchInput');

	if (openBtn) openBtn.addEventListener('click', () => toggleCategoryModal(true));
	if (closeBtn) closeBtn.addEventListener('click', () => toggleCategoryModal(false));
	if (modal) {
		modal.addEventListener('click', (e) => {
			if (e.target === modal) toggleCategoryModal(false); // klik backdrop tutup
		});
	}
	if (searchIn) {
		searchIn.addEventListener('input', (e) => renderCategoryList(e.target.value));
	}
})();

/* ================== INIT ================== */
document.addEventListener('DOMContentLoaded', () => {
	// Search
	searchInput?.addEventListener('input', onType);
	searchBtn?.addEventListener('click', runFull);
	searchInput?.addEventListener('keydown', e => {
		if (e.key === 'Enter') {
			e.preventDefault();
			runFull();
		}
	});

	// Settings
	initSettings();

	// Build dropdown bahasa
	buildLangDropdown();
	const langToggle = document.getElementById('langToggle');
	const langDropdown = document.getElementById('langDropdown');

	// buka/tutup dropdown
	langToggle?.addEventListener('click', (e) => {
		e.stopPropagation();
		langDropdown?.classList.toggle('hidden');
	});

	// klik bahasa (delegate di kebabMenu)
	kebabMenu?.addEventListener('click', (e) => {
		const btn = e.target.closest('.lang-item');
		if (!btn) return;
		const lang = btn.getAttribute('data-lang');
		openTranslate(lang);
		langDropdown?.classList.add('hidden');
		kebabMenu?.classList.add('hidden');
	});

	// klik di luar → tutup dropdown & menu
	document.addEventListener('click', (e) => {
		if (!kebabMenu || kebabMenu.classList.contains('hidden')) return;
		const inside = kebabMenu.contains(e.target) || e.target === kebabBtn;
		if (!inside) {
			langDropdown?.classList.add('hidden');
			kebabMenu.classList.add('hidden');
		}
	});

  const closeResultsBtn = document.getElementById('closeResultsBtn');
  if (closeResultsBtn) {
    closeResultsBtn.addEventListener('click', () => {
      resultsBox?.classList.add("hidden");
      searchInput.value = "";
      currentResults = [];
      fullMode = false;
    });
  }
  
  // Menu Panduan
  helpMenu?.addEventListener('click', (e) => {
    e.preventDefault();
    openHelp();
  });
  backFromHelp?.addEventListener('click', (e) => {
    e.preventDefault();
    closeHelpToHome();
  });

  // Router awal
  loadFromURL(true);
});
