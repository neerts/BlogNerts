// File: script.js (Versi 2.1 - Performa Server-Side + Logika Beranda Asli)
let articles = []; // Sekarang hanya menyimpan artikel yg sedang ditampilkan
let articlesFromNewestDate = []; // Cache untuk artikel di beranda

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
const latestArticlesContainer = $("#latestArticlesContainer");
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
const perPage = 15;

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
  if (article.date && article.date.trim() !== "") {
    return article.date;
  }
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
  if (!searchGradientOverlay || !searchbox || !siteFooter) return;
  const searchboxRect = searchbox.getBoundingClientRect();
  const footerHeight = siteFooter.offsetHeight;
  searchGradientOverlay.style.top = `${searchboxRect.bottom}px`; 
  searchGradientOverlay.style.bottom = `${footerHeight}px`;
  searchGradientOverlay.style.height = 'auto'; 
  searchGradientOverlay.classList.remove('hiding-up');
  searchGradientOverlay.classList.add('visible');
}

function hideSearchOverlay(animate = false) {
  if (!searchGradientOverlay) return;
  if (animate) {
    searchGradientOverlay.classList.add('hiding-up');
    setTimeout(() => {
      searchGradientOverlay.classList.remove('visible');
      searchGradientOverlay.classList.remove('hiding-up');
    }, 350); 
  } else {
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

const stopAllIframes = () => 
  document.querySelectorAll('iframe').forEach(f => f.src = f.src);
  
/* ====== SEARCH HELPERS (SEKARANG ASYNC) ====== */

// getSuggest (BERTANYA KE SUPABASE)
async function getSuggest(q) {
	const n = normalize(q).trim();
	if (!n) return [];
	
    const { data, error } = await supabase
        .from('articles')
        // PERBAIKAN: Menggunakan select('*') untuk memastikan data terambil
        .select('*') 
        .textSearch('title', `'${n}'`, { 
            type: 'websearch',
            config: 'english'
        })
        .limit(4);

    if (error) {
        console.error("Suggest error:", error);
        return [];
    }
	return data;
}

// getMatches (BERTANYA KE SUPABASE)
async function getMatches(q) {
	const n = norm(q);
	if (!n) return [];
	
    const { data, error } = await supabase
        .from('articles')
        .select('*') // Select * sudah mencakup view_count dan date
        .textSearch('title', `'${n}'`, {
            type: 'websearch',
            config: 'english'
        });
        
    if (error) {
        console.error("Search error:", error);
        return [];
    }
	return data;
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
    const thumb = a.youtube_url ? getYouTubeThumb(a.youtube_url) : (a.image || "");
    
    // PERBAIKAN BUG +3: Mengganti onclick agar HANYA mengubah hash
    row.onclick = (e) => { e.preventDefault(); location.hash = '#/artikel/' + a.slug; };
    
    // PERBAIKAN TAMPILAN: Menambahkan dateString
    let dateString = getArticleDateString(a);
    if (dateString === "no-date") {
        dateString = "Baru";
    }

    row.innerHTML = `
      <div class="result-thumb">
        <img src="${thumb || "https://via.placeholder.com/320x180?text=%20"}" alt="">
      </div>
      <div class="result-main">
        <div class="result-title">${highlight(a.title, kw)}</div>
        <span class="meta-line-list">
          Nerts • ${formatViewCount(a.view_count)} Dilihat • ${dateString}
        </span>
      </div>
    `;
    searchResults.appendChild(row);
  });
}

// GANTI FUNGSI LAMA ANDA DENGAN YANG INI
function renderResultsBox(list, kw) {
  if (!resultsBox) return;
  latestArticlesContainer?.classList.add("hidden");
  // --- LOGIKA PAGINASI ---
  const totalResults = list.length;
  const totalPages = Math.ceil(totalResults / perPage);
  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  // Ambil hanya artikel untuk halaman ini
  const pageItems = list.slice(start, end); 

  // --- RENDER HEADER (Menampilkan X-Y dari Z) ---
  resultsBox.innerHTML = `
    <div class="result-header">
      <div class="result-info">
        Menampilkan ${start + 1}-${Math.min(end, totalResults)} dari ${totalResults} artikel
      </div>
    </div>
  `;
  resultsBox.classList.remove("hidden");

  // --- JIKA HASIL KOSONG ---
  if (!list.length) {
    searchWrap?.classList.add("error");
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Tidak ada hasil ditemukan.";
    resultsBox.appendChild(empty);
    return;
  }

  searchWrap?.classList.remove("error");
  
  // --- RENDER DAFTAR ARTIKEL (Hanya item halaman ini) ---
  pageItems.forEach((a) => { // <-- Diubah dari 'list' menjadi 'pageItems'
    const row = document.createElement("a");
    row.href = "#";
    row.className = "result-row";
    
    row.onclick = (e) => { e.preventDefault(); location.hash = '#/artikel/' + a.slug; };
    
    const thumb = a.youtube_url ? getYouTubeThumb(a.youtube_url) : (a.image || "");
    
    let dateString = getArticleDateString(a);
    if (dateString === "no-date") {
        dateString = "Baru";
    }

    row.innerHTML = `
      <div class="result-thumb">
        <img src="${thumb || "https://via.placeholder.com/320x180?text=%20"}" alt="">
      </div>
      <div class="result-main">
        <div class="result-title">${highlight(a.title, kw)}</div>
        <span class="meta-line-list">
          Nerts • ${formatViewCount(a.view_count)} Dilihat • ${dateString}
        </span>
      </div>
    `;
    resultsBox.appendChild(row);
  });

  // --- RENDER KONTROL PAGINASI (BARU) ---
  if (totalPages > 1) {
    const paginationContainer = document.createElement("div");
    paginationContainer.className = "pagination-controls";

    // Tombol Sebelumnya
    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.innerHTML = "&laquo; Sebelumnya"; // &laquo; adalah panah «
    if (currentPage === 1) {
      prevBtn.disabled = true; // Nonaktifkan jika di halaman 1
    }
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderResultsBox(list, kw); // Render ulang
        resultsBox.scrollTop = 0;    // <-- TAMBAHKAN BARIS INI
      }
    };
    // Info Halaman
    const pageInfo = document.createElement("span");
    pageInfo.className = "pagination-info";
    pageInfo.textContent = `Hal ${currentPage} / ${totalPages}`;

    // Tombol Berikutnya
    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.innerHTML = "Berikutnya &raquo;"; // &raquo; adalah panah »
    if (currentPage === totalPages) {
      nextBtn.disabled = true; // Nonaktifkan jika di halaman terakhir
    }
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderResultsBox(list, kw); // Render ulang
        resultsBox.scrollTop = 0;    // <-- TAMBAHKAN BARIS INI
      }
    };

    paginationContainer.appendChild(prevBtn);
    paginationContainer.appendChild(pageInfo);
    paginationContainer.appendChild(nextBtn);
    resultsBox.appendChild(paginationContainer); // Tambahkan ke kotak hasil
  }
}

// runFull (SEKARANG ASYNC)
async function runFull() {
  const kw = (searchInput?.value ?? "").trim();
  if (!kw) {
    fullMode = false;
    resultsBox?.classList.add("hidden");
    closePanel();
    searchWrap?.classList.add("error");
    setTimeout(() => searchWrap?.classList.remove("error"), 1200);
    setQueryParam("q", "");
    currentResults = [];
    hideSearchOverlay(false);
    return;
  }

  hideSearchOverlay(true);

  // BERTANYA KE SUPABASE
  currentResults = await getMatches(kw);
  currentPage = 1;
  
  if (currentResults.length === 0) {
    fullMode = false;
    resultsBox?.classList.add("hidden");
    renderSuggest([], kw); // Tampilkan "Tidak ada hasil" di panel suggest
    openPanel();
    setQueryParam("q", "");
    return;
  }
  fullMode = true;
  closePanel();
  setQueryParam("q", kw);
  clearBtn?.classList.remove("hidden");
  renderResultsBox(currentResults, kw);
}

/* ====== KODE BARU (PERBAIKAN) ====== */
document.addEventListener("click", (e) => {
	const clickedInSearchInput = searchWrap?.contains(e.target);
	const clickedInSuggestions = searchResults?.contains(e.target);
	const clickedOnMenuBtn = menuBtn?.contains(e.target) || e.target === menuBtn;
	const clickedOnOverlay = overlay?.contains(e.target) || e.target === overlay;
	const clickedInSidebar = sidebar?.contains(e.target);
	const isSafeClick = clickedInSearchInput || clickedInSuggestions || clickedOnMenuBtn || clickedOnOverlay || clickedInSidebar;
	
	if (!isSafeClick && !fullMode) {
		closePanel();
        hideSearchOverlay(false);
    }
});

/* ====== MINI FITUR (SEKARANG ASYNC) ====== */
async function openRandomArticle() {
	// Ambil 1 artikel acak dari Supabase
    const { data, error } = await supabase.rpc('get_random_article'); // Butuh fungsi SQL
    
    // Fallback sederhana jika RPC gagal
    if (error || !data || data.length === 0) {
        showToast("Gagal memuat artikel acak.");
        return;
    }
    
	const randomSlug = data[0].slug;
    // PERBAIKAN BUG +3: Jangan panggil openArticleBySlug, ubah hash
	location.hash = '#/artikel/' + randomSlug;
}

/* ====== ARTIKEL (SEKARANG ASYNC) ====== */

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
				await navigator.share({ title, text: title, url });
			} else {
				await navigator.clipboard.writeText(url);
				showToast('Tautan disalin');
			}
		} catch { showToast('Gagal membagikan'); }
	}
	
    if (act === 'copy') {
		try {
			await navigator.clipboard.writeText(url);
			showToast('Tautan disalin');
		} catch { showToast('Gagal menyalin'); }
	}

    if (act === 'report') {
		try {
			const FORM_PREFILL_URL = "https://forms.gle/farsH9k9UN2gSdjYA";
			const encodedTitle = encodeURIComponent(title);
			const encodedUrl = encodeURIComponent(url);
			const finalUrl = FORM_PREFILL_URL.replace("JUDUL", encodedTitle).replace("URL", encodedUrl);
			window.open(finalUrl, '_blank');
			showToast('Membuka formulir laporan...');
		} catch (err) { showToast('Gagal membuka formulir'); }
	}
	kebabMenu.classList.add('hidden');
});

// ==========================================================
// PENAMBAHAN FUNGSI BARU (formatViewCount)
// ==========================================================
/**
 * Mengubah angka menjadi format ringkas (Ribuan/Jutaan).
 * @param {number} views Jumlah tampilan.
 */
function formatViewCount(views) {
  const num = Number(views) || 0;

  if (num >= 1000000) {
    // 1.000.000+ (Jutaan)
    const formatted = (num / 1000000).toFixed(1);
    return formatted.replace('.0', '') + ' Jt';
  }
  
  if (num >= 1000) {
    // 1.000 - 999.999 (Ribuan)
    const formatted = (num / 1000).toFixed(1);
    return formatted.replace('.0', '') + ' Rb';
  }
  
  // 0 - 999
  return num.toString();
}

// openArticleBySlug (SEKARANG ASYNC + PERBAIKAN)
async function openArticleBySlug(slug) {
    // 1. Cek dulu di cache beranda (articlesFromNewestDate)
	let a = articlesFromNewestDate.find(x => x.slug === slug);

    // 2. Jika tidak ada (misal link langsung ke artikel lama), AMBIL DARI SUPABASE
    if (!a) {
        try {
            const { data, error } = await supabase
                .from('articles')
                .select('*')
                .eq('slug', slug)
                .single();
            if (error) throw error;
            a = data;
        } catch (error) {
            console.error("Gagal memuat artikel:", error.message);
            showToast("Artikel tidak ditemukan.");
            goHome(); // Kembali ke beranda jika slug salah
            return;
        }
    }
    
    // 3. Lanjutkan render seperti biasa
	if (!a) return;
    stopAllIframes();

    // PERBAIKAN BUG +3: Hapus pengecekan hash
	// if (location.hash !== `#/artikel/${slug}`) { ... }
  
    // ==========================================================
    // PENAMBAHAN FITUR: Memanggil RPC untuk increment view count
    // ==========================================================
    try {
        const { error } = await supabase.rpc('increment_view_count', { p_slug: slug });
        if (error) {
        console.error('Gagal menambah view_count:', error.message);
        }
    } catch (err) {
        console.error('Error saat memanggil RPC increment_view_count:', err);
    }
    // ==========================================================

    const thumb = a.youtube_url ? getYouTubeThumb(a.youtube_url) : (a.image || "img/nerts-mark.png");
    const plainDescription = (a.description || "").split('\n')[0]; 

    document.title = `${a.title} - Nerts`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', plainDescription);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', a.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', plainDescription);
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', thumb);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', location.href);

    const hasMedia = !!(a.youtube_url || a.image);
    articleContent.className = "article-view";
    articleContent.innerHTML = `
        <h1 class="article-title-hero">${a.title}</h1>
        ${
        hasMedia
            ? (a.youtube_url
                ? (() => {
                    let vid = "";
                    try {
                    const u = new URL(a.youtube_url);
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
	hideSearchOverlay(false);
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
  setQueryParam("q", "");
  if (searchInput) searchInput.value = "";
  if (clearBtn) clearBtn.classList.add("hidden");

  articlePage?.classList.remove("active");
  setTimeout(() => {
    articlePage?.classList.add("hidden");
    homepage?.classList.remove("hidden");
    helpPage?.classList.add('hidden');
    resultsBox?.classList.add("hidden");
    closePanel(); 
    hideSearchOverlay(false);
    fullMode = false;
    currentResults = [];
    latestArticlesContainer?.classList.remove("hidden"); // <-- TAMBAHKAN BARIS INI
    showArticleKebab(false);
    
    if (location.hash && location.hash !== "#/") {
      location.hash = "#/";
    } else {
      closePanel();
      resultsBox?.classList.add("hidden");
    }
  }, 200);
};

/* ====== ROUTER (SEKARANG ASYNC) ====== */
function parseHash() {
	const h = location.hash || "#/";
	const parts = h.replace(/^#\/?/, "").split("/");
	return {
		route: parts[0] || "",
		param: parts[1] || ""
	};
}

// loadFromURL (SEKARANG ASYNC)
async function loadFromURL(initial = false) {
  const { route, param } = parseHash();
  const q = getQueryParam("q") || "";

  if (route === "artikel" && param) {
    await openArticleBySlug(param); // Tunggu artikel selesai dimuat
    return;
  }
  if (route === "help") {
    openHelp();
    return;
  }

  // Jika bukan halaman artikel, pastikan kembali ke beranda
  articlePage?.classList.remove("active");
  articlePage?.classList.add("hidden");
  helpPage?.classList.add('hidden');
  homepage?.classList.remove("hidden");
  showArticleKebab(false);
  stopAllIframes();
  if (articleContent) { articleContent.innerHTML = ""; articleContent.className = ""; }

	if (q) {
        // Jika ada query 'q', jalankan pencarian penuh
		if (searchInput) searchInput.value = q;
        await runFull(); // Tunggu hasil pencarian
  } else {
    // Jika tidak ada 'q', pastikan tampilan beranda bersih
    resultsBox?.classList.add("hidden");
    fullMode = false;
    if (initial) {
      if (searchInput) searchInput.value = "";
        closePanel();
    } else {
      const currentSearchValue = searchInput ? searchInput.value : "";
      if (currentSearchValue.trim()) {
        await onType(); // Panggil onType (async)
      } else {
        closePanel(); 
      }
    }
  }
}

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
            // PERBAIKAN BUG +3: Panggil goHome jika dari artikel acak
			goHome();
            // Panggil openRandomArticle (yang akan mengubah hash)
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
		const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
		savedTheme = prefersLight ? 'light' : 'dark';
		localStorage.setItem('themeMode', savedTheme);
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

/* ====== KATEGORI (SEKARANG ASYNC) ====== */
async function getAllCategories() {
    // Kategori sekarang diambil dari Supabase
    // Ini membutuhkan fungsi RPC di Supabase:
    const { data, error } = await supabase.rpc('get_all_categories');
    if (error) {
        console.error("Gagal memuat kategori:", error);
        return [];
    }
	return data;
}

// renderCategoryList (SEKARANG ASYNC)
async function renderCategoryList(filterText = "") {
	const listEl = document.getElementById('categoryList');
	if (!listEl) return;
    listEl.innerHTML = '<div class="result-desc" style="padding:12px; text-align:center;">Memuat...</div>';
    
	const q = (filterText || "").toLowerCase().trim();
    const allCats = await getAllCategories();
	const cats = allCats.filter(c => c.name.toLowerCase().includes(q));
	
    listEl.innerHTML = ""; // Bersihkan 'Memuat...'
	cats.forEach(c => {
		const btn = document.createElement('button');
		btn.className = 'category-item';
		btn.setAttribute('role', 'option');
		btn.innerHTML = `
      <span class="category-dot"></span>
      <span class="category-name">${c.name}</span>
      <span class="category-count">${c.count}</span>
    `;
		btn.addEventListener('click', async () => {
			const categoryName = c.name;
            
            // Lakukan pencarian berdasarkan kategori (server-side)
            const { data } = await supabase
                .from('articles')
                .select('*')
                .contains('categories', [categoryName]); // Cari di array
                
			currentResults = data || [];
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
			renderCategoryList(""); // Panggil render async
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
        // Debounce pencarian kategori agar tidak terlalu sering query
		searchIn.addEventListener('input', debounce((e) => {
            renderCategoryList(e.target.value);
        }, 300));
	}
})();

/* ====== INIT (SEKARANG ASYNC) ====== */
document.addEventListener('DOMContentLoaded', () => {
	const searchIcon = document.getElementById("searchIcon");
	const clearBtn = document.getElementById("clearBtn");
    const loadMoreBtn = document.getElementById("loadMoreBtn");
	let typingTimer;
	const doneTypingDelay = 400;

    // handleSearchInput (SEKARANG ASYNC)
	const handleSearchInput = debounce(async (value) => {
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
      // BERTANYA KE SUPABASE
	  const suggestions = await getSuggest(val);
	  renderSuggest(suggestions, val);
	  openPanel();
	}, 300);

	async function onType() {
	  await handleSearchInput(searchInput.value);
	}
	
	searchInput?.addEventListener("input", () => {
	  onType(); // Panggil onType (async)
	  
	  clearBtn.classList.toggle("hidden", searchInput.value.trim() === "");
	  searchIcon.classList.add("loading");
	  clearTimeout(typingTimer);
	  typingTimer = setTimeout(() => {
		searchIcon.classList.remove("loading");
	  }, doneTypingDelay);
	});

	searchInput?.addEventListener("keydown", (e) => {
	  if (e.key === "Enter") {
		e.preventDefault();
		runFull(); // Panggil runFull (async)
	  }
	});

    clearBtn?.addEventListener("click", goHome);

    searchInput?.addEventListener("focus", () => {
        showSearchOverlay(); 
        if (searchInput.value.trim() !== "") {
            onType(); // Panggil onType (async)
        }
    });
  
    initSettings();
    helpMenu?.addEventListener('click', (e) => {
        e.preventDefault();
        openHelp();
    });
  
    backFromHelp?.addEventListener('click', (e) => {
        e.preventDefault();
        closeHelpToHome();
    });
  
    // HAPUS LISTENER TOMBOL "Muat Lebih Banyak" KARENA LOGIKA ANDA
    // loadMoreBtn?.addEventListener('click', () => { ... });
    
    // Panggil fungsi pemuat utama (async)
    // loadInitialData() dipindahkan ke akhir file
});

function appendArticlesToHomepage(articleList, container) {
  articleList.forEach((a) => {
    const card = document.createElement("div");
    card.className = "latest-card-list"; 

    const thumb = a.youtube_url ? getYouTubeThumb(a.youtube_url) : (a.image || "");
    let dateString = getArticleDateString(a);
    if (dateString === "no-date") dateString = "Baru";

    card.innerHTML = `
      <a href="#" class="thumb-wrapper-list" onclick="location.hash = '#/artikel/${a.slug}'; return false;">
        <img src="${thumb || 'https://via.placeholder.com/320x180?text=%20'}" alt="${a.title}" loading="lazy">
        </a>
      <div class="details-wrapper-list">
        <div class="meta-list">
          <a href="#" class="title-list" onclick="location.hash = '#/artikel/${a.slug}'; return false;">
            ${a.title}
          </a>
          <span class="meta-line-list">
            Nerts • ${formatViewCount(a.view_count)} Dilihat • ${dateString}
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

// renderLatestArticles (Sesuai file asli Anda)
function renderLatestArticles() {
  const container = document.getElementById('latestArticlesList');
  const loadMoreBtn = document.getElementById("loadMoreBtn"); 
  if (!container || !loadMoreBtn) return; 

  container.innerHTML = ""; // Bersihkan daftar
  
  // Ambil dari cache 'articlesFromNewestDate'
  const latest = articlesFromNewestDate; 
  
  appendArticlesToHomepage(latest, container);
  
  // Sembunyikan tombol "Muat Lebih Banyak" (sesuai logika asli Anda)
  loadMoreBtn.classList.add('hidden'); 
}

// 
// ==========================================================
// FUNGSI PEMUAT DATA UTAMA (BARU)
// ==========================================================
//
function parseClientDate(dateString) {
  if (typeof dateString !== 'string') {
    return new Date(0);
  }
  const parts = dateString.split('/');
  if (parts.length !== 3) {
    return new Date(0);
  }
  return new Date(parts[2], parts[1] - 1, parts[0]);
}

// Ini adalah FUNGSI UTAMA yang menggantikan loadDatabase()
async function loadInitialData() {
    const container = document.getElementById('latestArticlesList');
    const loadMoreBtn = document.getElementById("loadMoreBtn");
    
    if (container) {
        container.innerHTML = '<div class="result-desc" style="padding:12px; text-align:center;">Memuat artikel terbaru...</div>';
    }
    if (loadMoreBtn) loadMoreBtn.classList.add('hidden'); // Sembunyikan

    try {
        // LANGKAH 1: Ambil HANYA tanggal terbaru
        // (Ini sangat cepat)
        const { data: newest, error: dateError } = await supabase
            .from('articles')
            .select('date')
            .order('date', { ascending: false }) // Urutkan berdasarkan 'date'
            .limit(1)
            .single();

        if (dateError) throw dateError;
        if (!newest) {
             if (container) container.innerHTML = '<div class="empty">Belum ada artikel.</div>';
             return;
        }

        const newestDate = newest.date;

        // LANGKAH 2: Ambil SEMUA artikel HANYA dari tanggal terbaru itu
        // (Ini juga cepat)
        const { data, error } = await supabase
            .from('articles')
            .select('*') // Select * sudah otomatis mencakup view_count
            .eq('date', newestDate)
            .order('id', { ascending: true }); // Urutkan berdasarkan ID (seperti file asli Anda)

        if (error) throw error;

        // Simpan hasil ini ke cache beranda
        articlesFromNewestDate = data; 
        
        // Panggil render beranda (sesuai logika asli Anda)
        renderLatestArticles();
        
        // Cek URL (hash/query) SETELAH beranda dimuat
        await loadFromURL(true);

    } catch (error) {
        console.error("Gagal memuat database:", error.message);
        if (container) container.innerHTML = `<div class="empty" style="padding:20px; text-align:center; color: var(--fg-muted);">Gagal memuat artikel. Coba refresh.</div>`;
    }
}

// Panggil fungsi inisialisasi
loadInitialData();

// ==========================================================
// PENAMBAHAN ROUTER LISTENER (Memperbaiki bug +3)
// ==========================================================
// Kita HANYA menggunakan 'hashchange' untuk routing.
// Ini menangani klik link, tombol back/forward, dan bookmark.
window.addEventListener("hashchange", () => loadFromURL(false));
// Kita TIDAK menambahkan listener 'popstate' karena itu redundant
// dan menyebabkan bug panggilan ganda (increment +3).
// ==========================================================


// --- (Sisa event listener untuk menu '...' di beranda) ---
document.addEventListener('click', (e) => {
  const dotsBtn = e.target.closest('.dots-btn-yt');
  if (dotsBtn) {
    e.preventDefault();
    const dropdown = dotsBtn.nextElementSibling;
    $$('.dropdown-yt').forEach(d => {
      if (d !== dropdown) d.style.display = 'none';
    });
    dropdown.style.display = (dropdown.style.display === 'block') ? 'none' : 'block';
    return;
  }

  if (!e.target.closest('.dots-menu-yt')) {
    $$('.dropdown-yt').forEach(d => d.style.display = 'none');
  }
  
  const menuItem = e.target.closest('.dots-menu-yt .menu-item');
  if (menuItem) {
    e.preventDefault();
    const act = menuItem.dataset.act;
    const slug = menuItem.dataset.slug;
    
    if (!slug) return; 

    // Ambil dari cache 'articlesFromNewestDate'
    const article = articlesFromNewestDate.find(a => a.slug === slug);
    const url = `${location.origin}${location.pathname}#/artikel/${slug}`;
    
    if (act === 'copy') {
      try {
        navigator.clipboard.writeText(url);
        showToast('Tautan berhasil disalin');
      } catch (err) { showToast('Gagal menyalin tautan'); }
    }
    
    if (act === 'share') {
      if (navigator.share && article) {
        navigator.share({
          title: article.title,
          text: article.description.split('\n')[0],
          url: url
        }).catch(err => console.error('Gagal bagikan:', err));
      } else {
        try {
          navigator.clipboard.writeText(url);
          showToast('Tautan disalin (Share tidak didukung)');
        } catch (err) { showToast('Gagal membagikan'); }
      }
    }

    menuItem.blur();
    $$('.dropdown-yt').forEach(d => d.style.display = 'none');
  }
});