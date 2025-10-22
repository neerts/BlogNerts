let articles = [];
const initialArticleCount = 4;
let articlesFromNewestDate = [];

/* ====== DOM ====== */
const $ = (s, r = document) => r.querySelector(s);
const siteFooter = $("#siteFooter")
const searchGradientOverlay = $("#searchGradientOverlay");
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const searchbox = $("#searchbox");
const searchWrap = $("#searchWrap");
const searchInput = $("#searchInput");
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
const fontRadios = $$("input[name='fontSize']");
const themeRadios = $$("input[name='themeMode']");
const kebabBtn = document.getElementById('articleKebab');
const kebabMenu = document.getElementById('articleKebabMenu');
const helpMenu = document.getElementById('helpMenu');
const helpPage = document.getElementById('helpPage');
const backFromHelp = document.getElementById('backFromHelp');

function openHelp() {
  closePanel();
  resultsBox?.classList.add('hidden');
  sidebar?.classList.remove('active');
  if (overlay) overlay.style.display = 'none';
  homepage?.classList.add('hidden');
  articlePage?.classList.add('hidden');
  helpPage?.classList.remove('hidden');
  document.body.classList.add('no-scroll');  showArticleKebab(false);
  if (location.hash !== '#/help') location.hash = '#/help';
}

function closeHelpToHome() {
  helpPage?.classList.add('hidden');
  homepage?.classList.remove('hidden');
  document.body.classList.remove('no-scroll');  showArticleKebab(false);
  if (location.hash !== '#/') location.hash = '#/';
}

/* ====== STATE ====== */
let fullMode = false;
let currentResults = [];
let currentPage = 1;
const perPage = 20;

/* ====== UTIL ====== */
const norm = s => (s || "").toLowerCase().trim();
const normalize = t => (t || "").toString().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function slugify(text) {
	return (text || "")
		.toString()
		.normalize("NFD").replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function getArticleDateString(article) {
  if (!article) return "no-date";
  
  // 1. Prioritaskan properti 'date' yang baru
  if (article.date && article.date.trim() !== "") {
    return article.date;
  }
  
  // 2. Fallback: Jika 'date' tidak ada, cari di content (untuk artikel lama)
  if (article.content) {
    const match = article.content.match(/Update Artikel (\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (match) return match[1];
  }
  
  // 3. Jika tidak ada sama sekali
  return "no-date";
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
	} 
	else {
		sp.delete(name);
	}
	history.replaceState({}, "", url.toString());
}

const debounce = (fn, ms=300) => {
  let t; return (...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);}
};

let toastTimer;

function showSearchOverlay() {
  // Pastikan semua elemen ada
  if (!searchGradientOverlay || !searchbox || !siteFooter) return;
  
  // Ambil posisi bawah kotak pencarian (relatif ke layar)
  const searchboxRect = searchbox.getBoundingClientRect();
  
  // Ambil tinggi footer
  const footerHeight = siteFooter.offsetHeight;
  
  // Atur overlay:
  // Mulai TEPAT DI BAWAH kotak pencarian
  searchGradientOverlay.style.top = `${searchboxRect.bottom}px`; 
  
  // Berakhir TEPAT DI ATAS footer
  searchGradientOverlay.style.bottom = `${footerHeight}px`;
  
  // Hapus style 'height' jika ada, biarkan 'top' dan 'bottom' yg mengatur
  searchGradientOverlay.style.height = 'auto'; 
  
  searchGradientOverlay.classList.remove('hiding-up');
  searchGradientOverlay.classList.add('visible');
}

function hideSearchOverlay(animate = false) {
  if (!searchGradientOverlay) return;
  
  if (animate) {
    // Animasi "hilang dari bawah ke atas"
    searchGradientOverlay.classList.add('hiding-up');
    
    // Setelah animasi selesai, sembunyikan total
    setTimeout(() => {
      searchGradientOverlay.classList.remove('visible');
      searchGradientOverlay.classList.remove('hiding-up');
    }, 350); // Samakan dengan durasi transisi CSS
  } else {
    // Sembunyikan langsung (tanpa animasi)
    searchGradientOverlay.classList.remove('visible');
    searchGradientOverlay.classList.remove('hiding-up');
  }
}

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

/* ===== HENTIKAN SEMUA IFRAME (YouTube) ===== */
const stopAllIframes = () => 
  document.querySelectorAll('iframe').forEach(f => f.src = f.src);
  
/* ====== SEARCH HELPERS ====== */
function getSuggest(q) {
	const n = normalize(q).trim();
	if (!n) return [];
	return articles.filter(a => normalize(a.title).includes(n)).slice(0, 4);
}

function getMatches(q) {
	const n = norm(q);
	if (!n) return [];
	return articles.filter(a => norm(a.title).includes(n));
}

/* ====== RENDER ====== */
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
    empty.className = "empty";
    empty.textContent = "Tidak ada hasil ditemukan.";
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
  const total = list.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  if (currentPage > lastPage) currentPage = lastPage;
  const start = (currentPage - 1) * perPage;
  const end   = start + perPage;
  const pageResults = list.slice(start, end);
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
  const closeBtn = resultsBox.querySelector("#closeResultsBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      resultsBox.classList.add("hidden");
      searchInput.value = "";
      clearBtn.classList.add("hidden");
      currentResults = [];
      fullMode = false;
    });
  }
}

function runFull() {
  const kw = (searchInput?.value ?? "").trim();
  if (!kw) {
    fullMode = false;
    resultsBox?.classList.add("hidden");
    closePanel();
    searchWrap?.classList.add("error");
    setTimeout(() => searchWrap?.classList.remove("error"), 1200);
    setQueryParam("q", "");
    currentResults = [];
    currentPage = 1;
    hideSearchOverlay(false); // <--- TAMBAHAN
    return;
  }

  // Panggil animasi "hilang dari bawah ke atas"
  hideSearchOverlay(true); // <--- TAMBAHAN

  currentResults = getMatches(kw);
  if (currentResults.length === 0) {
    fullMode = false;
    resultsBox?.classList.add("hidden");
    renderSuggest([], kw);
    openPanel();
    setQueryParam("q", "");
    currentPage = 1;
    return;
  }
  fullMode = true;
  closePanel();
  currentPage = 1;
  setQueryParam("q", kw);
  renderResultsBox(currentResults, kw);
}

/* ====== KODE BARU (PERBAIKAN) ====== */
document.addEventListener("click", (e) => {
    // Definisikan area aman secara lebih spesifik
	const clickedInSearchInput = searchWrap?.contains(e.target); // Hanya area input
	const clickedInSuggestions = searchResults?.contains(e.target); // Hanya panel saran
	const clickedOnMenuBtn = menuBtn?.contains(e.target) || e.target === menuBtn;
	const clickedOnOverlay = overlay?.contains(e.target) || e.target === overlay;
	const clickedInSidebar = sidebar?.contains(e.target);

    // Gabungkan area aman yang baru
	const isSafeClick = clickedInSearchInput || clickedInSuggestions || clickedOnMenuBtn || clickedOnOverlay || clickedInSidebar;
	
	if (!isSafeClick && !fullMode) {
		closePanel();
    hideSearchOverlay(false);
  }
});

/* ====== MINI FITUR ====== */
function openRandomArticle() {
	if (!articles || articles.length === 0) return;
	const idx = Math.floor(Math.random() * articles.length);
	const randomSlug = articles[idx].slug;
	openArticleBySlug(randomSlug);
}

/* ====== ARTIKEL ====== */

function showArticleKebab(show) {
	if (!kebabBtn) return;
	if (show) kebabBtn.classList.remove('hidden');
	else {
		kebabBtn.classList.add('hidden');
		kebabMenu?.classList.add('hidden');
	}
  }
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
            `;
            })()
            : `<div class="preview-box"><span class="preview-media"><img src="${a.image}" alt="${a.title}"></span></div>`
          )
        : `<div class="preview-box"><div class="preview-note">Tidak ada media</div></div>`
    }
    ${a.description ? `<p class="article-desc">${a.description.replace(/\n/g,"<br>")}</p>` : ""}
    <div class="article-prose">${linkify(a.content)}</div>
    <a href="#" class="back-link" onclick="goHome();return false;">← Kembali ke Beranda</a>
  `;
	homepage?.classList.add("hidden");
	articlePage?.classList.remove("hidden");
	setTimeout(() => articlePage?.classList.add("active"), 10);
	closePanel();
	resultsBox?.classList.add("hidden");
	fullMode = false;
	showArticleKebab(true);
}

function linkify(text) {
  if (!text) return "";
  return text
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, "<br>");
}

function truncateText(str, max) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max).trim() + "…" : str;
}

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
  stopAllIframes();
  if (articleContent) {
    articleContent.innerHTML = "";
    articleContent.className = "";
  }
  
  // 1. HAPUS PARAMETER 'q' DARI URL
  setQueryParam("q", "");
  
  // 2. BERSIHKAN KOTAK INPUT
  if (searchInput) searchInput.value = "";
  if (clearBtn) clearBtn.classList.add("hidden");

  articlePage?.classList.remove("active");
  setTimeout(() => {
    articlePage?.classList.add("hidden");
    homepage?.classList.remove("hidden");
    helpPage?.classList.add('hidden');
    
    // 3. SEMBUNYIKAN SEMUA PANEL & RESET STATE
    resultsBox?.classList.add("hidden");
    closePanel(); 
    hideSearchOverlay(false);
    fullMode = false;
    currentResults = [];
    
    showArticleKebab(false);
    
    // 4. NAVIGASI (sekarang loadFromURL akan melihat q="" dan menampilkan beranda bersih)
    if (location.hash && location.hash !== "#/") {
      location.hash = "#/";
    } else {
      // Jika hash sudah #/, paksa tutup panel (jaga-jaga)
      closePanel();
      resultsBox?.classList.add("hidden");
    }
  }, 200);
};

/* ====== ROUTER (HASH + QUERY) ====== */
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
  if (route === "artikel" && param) {
    openArticleBySlug(param);
    return;
  }
  if (route === "help") {
    openHelp();
    return;
  }
  articlePage?.classList.remove("active");
  articlePage?.classList.add("hidden");
  helpPage?.classList.add('hidden');
  homepage?.classList.remove("hidden");
  showArticleKebab(false);
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
    fullMode = false;
    if (initial) {
      if (searchInput) searchInput.value = "";
        closePanel();
    } else {
      const currentSearchValue = searchInput ? searchInput.value : "";
      if (currentSearchValue.trim()) {
        onType(); 
      } else {
        closePanel(); 
      }
    }
  }
}

window.addEventListener("hashchange", () => loadFromURL(false));
window.addEventListener("popstate", () => loadFromURL(false));

/* ====== SIDEBAR + SHEET ====== */
function closeSidebar() {
	sidebar?.classList.remove('active');
	if (overlay) overlay.style.display = 'none';
}
if (menuBtn && sidebar && overlay) {
	menuBtn.addEventListener("click", () => {
		closePanel();
		hideSearchOverlay(false);
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
        goHome();
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

/* ====== PENGATURAN ====== */
function applyFontSize(val) {
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

/* ====== KATEGORI ====== */
function getAllCategories() {
	const map = new Map();
	articles.forEach(a => {
		(a.categories || []).forEach(k => {
			const key = (k || "").trim();
			if (!key) return;
			map.set(key, (map.get(key) || 0) + 1);
		});
	});
	return Array.from(map.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([name, count]) => ({
			name,
			count
		}));
}

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
			const categoryName = c.name;
			const list = articles.filter(a => (a.categories || []).some(x => (x || "").toLowerCase() === categoryName.toLowerCase()));
			currentResults = list;
			currentPage = 1;
			fullMode = true;
			closePanel();
			hideSearchOverlay(false);
			searchInput.value = categoryName;
			clearBtn.classList.remove("hidden");
			setQueryParam("q", categoryName);
			renderResultsBox(currentResults, categoryName);
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
		const inp = document.getElementById('categorySearchInput');
		if (inp) {
			inp.value = "";
			renderCategoryList("");
			setTimeout(() => inp.focus(), 50);
		}
	}
}

(function bindCategoryUI() {
	const closeBtn = document.getElementById('categoryClose');
  const filterBtn = document.getElementById('filterBtn');
	const modal = document.getElementById('categoryModal');
	const searchIn = document.getElementById('categorySearchInput');
  if (filterBtn) filterBtn.addEventListener('click', () => toggleCategoryModal(true));
	if (closeBtn) closeBtn.addEventListener('click', () => toggleCategoryModal(false));
	if (modal) {
		modal.addEventListener('click', (e) => {
			if (e.target === modal) toggleCategoryModal(false);
		});
	}
	if (searchIn) {
		searchIn.addEventListener('input', (e) => renderCategoryList(e.target.value));
	}
})();

/* ====== INIT ====== */
document.addEventListener('DOMContentLoaded', () => {
	const searchIcon = document.getElementById("searchIcon");
	const clearBtn = document.getElementById("clearBtn");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
	let typingTimer;
	const doneTypingDelay = 400;

	const handleSearchInput = debounce((value) => {
	  if (fullMode) {
		fullMode = false;
		resultsBox?.classList.add("hidden");
		currentResults = [];
	  }
	  const val = value.trim();
	  if (!val) {
		closePanel();
		return;
	  }
	  const suggestions = getSuggest(val);
	  renderSuggest(suggestions, val);
	  openPanel();
	}, 300);

	function onType() {
	  handleSearchInput(searchInput.value);
	}
	// --- Listener 1: Input (Gabungan) ---
	searchInput?.addEventListener("input", () => {
	  // 1. Panggil onType untuk sugesti
	  onType();
	  
	  // 2. Logika untuk loading icon & clear button
	  clearBtn.classList.toggle("hidden", searchInput.value.trim() === "");
	  searchIcon.classList.add("loading");
	  clearTimeout(typingTimer);
	  typingTimer = setTimeout(() => {
		searchIcon.classList.remove("loading");
	  }, doneTypingDelay);
	});

	// --- Listener 2: Keydown (Enter) ---
	searchInput?.addEventListener("keydown", (e) => {
	  if (e.key === "Enter") {
		e.preventDefault();
		runFull();
	  }
	});

    // --- Listener 3: Tombol Clear (X) ---
  clearBtn?.addEventListener("click", goHome);

    // --- Listener 4: Fokus (BARU) ---
  searchInput?.addEventListener("focus", () => {
    // 1. Tampilkan overlay (seperti sebelumnya)
    showSearchOverlay(); 
    
    // 2. TAMBAHAN: Jika sudah ada teks, panggil onType() untuk memunculkan suggest
    if (searchInput.value.trim() !== "") {
      onType();
    }
  });
  
  initSettings(); //
  helpMenu?.addEventListener('click', (e) => { //
    e.preventDefault();
    openHelp();
  });
  
  backFromHelp?.addEventListener('click', (e) => { //
    e.preventDefault();
    closeHelpToHome();
  });
  
  loadMoreBtn?.addEventListener('click', () => {
    const container = document.getElementById('latestArticlesList');
    if (!container) return;
    const remainingArticles = articlesFromNewestDate.slice(initialArticleCount);
    appendArticlesToHomepage(remainingArticles, container);
    loadMoreBtn.classList.add('hidden');
  });
});

function appendArticlesToHomepage(articleList, container) {
  articleList.forEach((a) => {
    const card = document.createElement("div");
    card.className = "latest-card-list"; 

    const thumb = a.youtubeUrl ? getYouTubeThumb(a.youtubeUrl) : (a.image || "");

    let dateString = getArticleDateString(a);
    if (dateString === "no-date") {
        dateString = "Baru";
    }

    // Struktur HTML (List View)
    card.innerHTML = `
      <a href="#" class="thumb-wrapper-list" onclick="openArticleBySlug('${a.slug}'); return false;">
        <img src="${thumb || 'https://via.placeholder.com/320x180?text=%20'}" alt="${a.title}">
        </a>
      <div class="details-wrapper-list">
        <div class="meta-list">
          <a href="#" class="title-list" onclick="openArticleBySlug('${a.slug}'); return false;">
            ${a.title}
          </a>
          <span class="meta-line-list">
            Nerts • ${dateString}
          </span>
        </div>
        <div class="dots-menu-yt">
          <button class="dots-btn-yt" data-slug="${a.slug}">⋮</button>
          <div class="kebab-menu dropdown-yt">
            <button class="menu-item" data-act="share" data-slug="${a.slug}">Bagikan</button>
            <hr class="menu-sep">
            <button class="menu-item" data-act="copy" data-slug="${a.slug}">Salin tautan</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderLatestArticles() {
  const container = document.getElementById('latestArticlesList');
  const loadMoreBtn = document.getElementById("loadMoreBtn"); 
  if (!container || !loadMoreBtn) return; 
  container.innerHTML = ""; // Bersihkan
  const latest = articlesFromNewestDate.slice(0, initialArticleCount); 
  
  appendArticlesToHomepage(latest, container);
  if (articlesFromNewestDate.length > initialArticleCount) { 
    loadMoreBtn.classList.remove('hidden'); 
  } else {
    loadMoreBtn.classList.add('hidden'); 
  }
}

function loadDatabase() {
  const script = document.createElement('script');
  script.src = 'articles.js?v=' + Date.now(); // Ambil versi baru
  script.onload = () => {
    if (typeof defaultArticles !== "undefined" && Array.isArray(defaultArticles)) {
      
      // 1. Siapkan semua artikel (seperti sebelumnya)
      articles = defaultArticles.map(a => ({
        ...a,
        slug: a.slug || slugify(a.title)
      }));

      // 2. LOGIKA BARU: Filter berdasarkan tanggal terbaru
      if (articles.length > 0) {
        // Ambil tanggal artikel pertama (paling baru)
        const newestDate = getArticleDateString(articles[0]);
        
        // Buat daftar baru HANYA berisi artikel dgn tanggal yg sama
        articlesFromNewestDate = articles.filter(a => getArticleDateString(a) === newestDate);
      }
      // Selesai filter

      // 3. Render (sekarang renderLatestArticles akan pakai daftar baru)
      renderLatestArticles();
      loadFromURL(true);
      
    } else {
      console.error("Variabel 'defaultArticles' tidak ditemukan di articles.js");
      homepage.innerHTML = `<div class="empty" style="padding:20px; text-align:center; color: var(--fg-muted);">Gagal memproses data.</div>`;
    }
  };
  script.onerror = () => {
    console.error("Gagal memuat file articles.js");
    homepage.innerHTML = `<div class="empty" style="padding:20px; text-align:center; color: var(--fg-muted);">Gagal memuat data. Silakan refresh halaman.</div>`;
  };
  document.body.appendChild(script);
}

loadDatabase();
document.addEventListener('click', (e) => {
  // Cek apakah yang diklik adalah tombol titik tiga
  const dotsBtn = e.target.closest('.dots-btn-yt');
  if (dotsBtn) {
    e.preventDefault();
    const dropdown = dotsBtn.nextElementSibling; // Ambil .dropdown-yt
    
    // Tutup semua dropdown lain dulu
    $$('.dropdown-yt').forEach(d => {
      if (d !== dropdown) d.style.display = 'none';
    });

    // Toggle (buka/tutup) dropdown yang ini
    dropdown.style.display = (dropdown.style.display === 'block') ? 'none' : 'block';
    return; // Berhenti agar klik luar tidak langsung menutupnya
  }

  // Jika klik di luar dropdown, tutup semua
  if (!e.target.closest('.dots-menu-yt')) {
    $$('.dropdown-yt').forEach(d => d.style.display = 'none');
  }
  
  // -----------------------------------------------------------------
  // INI ADALAH BLOK YANG SEBELUMNYA ANDA SALIN DI TEMPAT YANG SALAH
  // -----------------------------------------------------------------
  // Cek apakah yang diklik adalah item menu di dalam .dots-menu-yt
  const menuItem = e.target.closest('.dots-menu-yt .menu-item');
  if (menuItem) {
    e.preventDefault();
    const act = menuItem.dataset.act;
    const slug = menuItem.dataset.slug;
    
    // Berhenti jika tidak ada slug (pengaman)
    if (!slug) return; 

    const article = articles.find(a => a.slug === slug);
    const url = `${location.origin}${location.pathname}#/artikel/${slug}`;
    
    if (act === 'copy') {
      try {
        navigator.clipboard.writeText(url);
        showToast('Tautan berhasil disalin');
      } catch (err) {
        showToast('Gagal menyalin tautan');
      }
    }
    
    if (act === 'share') {
      if (navigator.share && article) {
        navigator.share({
          title: article.title,
          text: article.description.split('\n')[0], // Ambil baris pertama deskripsi
          url: url
        }).catch(err => console.error('Gagal bagikan:', err));
      } else {
        // Fallback: Salin link jika share gagal atau tidak didukung
        try {
          navigator.clipboard.writeText(url);
          showToast('Tautan disalin (Share tidak didukung)');
        } catch (err) {
          showToast('Gagal membagikan');
        }
      }
    }

    menuItem.blur();
    $$('.dropdown-yt').forEach(d => d.style.display = 'none');
  }
});