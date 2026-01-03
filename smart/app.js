// ===== Util =====
const $ = (sel, scope = document) => scope.querySelector(sel);
const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
const pad = (n) => String(n).padStart(2, "0");

// ===== Countdown =====
(function initCountdown() {
  const target = new Date(window.EVENT_DATE);
  const dd = $("#dd"), hh = $("#hh"), mm = $("#mm"), ss = $("#ss");
  function tick() {
    const now = new Date();
    const diff = Math.max(0, target - now);
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);
    dd.textContent = pad(d); hh.textContent = pad(h); mm.textContent = pad(m); ss.textContent = pad(s);
  }
  tick();
  setInterval(tick, 1000);
})();

// ===== Music Toggle =====
(function initMusic() {
  const btn = $("#musicToggle");
  const audio = $("#bgAudio");
  let playing = false;
  btn.addEventListener("click", async () => {
    try {
      if (!playing) { await audio.play(); playing = true; btn.textContent = "🎵 Musik: On"; }
      else { audio.pause(); playing = false; btn.textContent = "🎵 Musik: Off"; }
    } catch (e) {
      alert("Autoplay diblokir, silakan klik lagi untuk memutar.");
    }
  });
})();

// ===== Gallery Lightbox =====
(function initGallery() {
  const lb = $("#lightbox");
  const lbImg = $("#lightboxImg");
  const lbClose = $("#lightboxClose");
  $$(".gallery img").forEach(img => {
    img.addEventListener("click", () => {
      lbImg.src = img.dataset.large || img.src;
      lb.classList.remove("hidden");
    });
  });
  lbClose.addEventListener("click", () => lb.classList.add("hidden"));
  lb.addEventListener("click", (e) => { if (e.target === lb) lb.classList.add("hidden"); });
})();

// ===== RSVP Storage =====
const STORAGE_KEY = "event_rsvp_list_v1";
function loadList() { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
function saveList(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

// ===== Render Table & Stats =====
function render() {
  const tbody = $("#guestTable tbody");
  const list = loadList();
  tbody.innerHTML = "";
  list.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.email}</td>
      <td>${item.attendees}</td>
      <td>${item.status}</td>
      <td>${item.notes || "-"}</td>
      <td>
        <div class="row-actions">
          <button class="btn" data-action="edit" data-idx="${idx}">Edit</button>
          <button class="btn danger" data-action="del" data-idx="${idx}">Hapus</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  // Stats
  const total = list.length;
  const hadir = list.filter(x => x.status === "hadir").length;
  const tidak = list.filter(x => x.status === "tidak_hadir").length;
  const pending = list.filter(x => x.status === "pending").length;
  const guests = list.reduce((sum, x) => sum + Number(x.attendees || 0), 0);
  $("#statTotal").textContent = total;
  $("#statHadir").textContent = hadir;
  $("#statTidak").textContent = tidak;
  $("#statPending").textContent = pending;
  $("#statGuests").textContent = guests;
}

// ===== Form Submit =====
(function initForm() {
  const form = $("#rsvpForm");
  const msg = $("#rsvpMsg");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    // Validation
    if (!data.name || !data.email) { msg.textContent = "Nama dan email wajib diisi."; return; }
    if (!/^\S+@\S+\.\S+$/.test(data.email)) { msg.textContent = "Format email tidak valid."; return; }
    data.attendees = Math.max(1, Math.min(10, Number(data.attendees || 1)));
    data.status = data.status || "pending";
    data.notes = (data.notes || "").trim();

    const list = loadList();
    // Upsert by email
    const idx = list.findIndex(x => x.email === data.email);
    if (idx >= 0) { list[idx] = data; msg.textContent = "Data RSVP diperbarui."; }
    else { list.push({ ...data, createdAt: new Date().toISOString() }); msg.textContent = "RSVP berhasil disimpan."; }
    saveList(list);
    render();
    form.reset();
    setTimeout(() => msg.textContent = "", 2500);
  });

  // Row actions: edit, delete
  $("#guestTable").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const list = loadList();
    if (btn.dataset.action === "del") {
      if (confirm("Hapus RSVP ini?")) {
        list.splice(idx, 1);
        saveList(list);
        render();
      }
    } else if (btn.dataset.action === "edit") {
      const item = list[idx];
      $("#name").value = item.name;
      $("#email").value = item.email;
      $("#attendees").value = item.attendees;
      $("#status").value = item.status;
      $("#notes").value = item.notes || "";
      window.scrollTo({ top: $("#rsvp").offsetTop - 20, behavior: "smooth" });
    }
  });

  // Export CSV
  $("#exportCsv").addEventListener("click", () => {
    const list = loadList();
    const headers = ["Nama","Email","Jumlah Tamu","Status","Catatan","Created At"];
    const rows = list.map(x => [x.name, x.email, x.attendees, x.status, (x.notes||"").replace(/\n/g," "), x.createdAt || ""]);
    const csv = [headers.join(","), ...rows.map(r => r.map(field => `"${String(field).replace(/"/g,'""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "rsvp.csv"; a.click();
    URL.revokeObjectURL(url);
  });

  // Clear list
  $("#clearList").addEventListener("click", () => {
    if (confirm("Hapus semua data RSVP di perangkat ini?")) {
      localStorage.removeItem(STORAGE_KEY);
      render();
    }
  });

  render();
})();

// ===== Share Buttons =====
(function initShare() {
  const shareData = {
    title: "Bandung Tech Gathering 2026",
    text: "Yuk gabung di Bandung Tech Gathering 2026! RSVP & detail di halaman ini.",
    url: location.href
  };
  $("#shareBtn").addEventListener("click", async () => {
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (_) {}
    } else {
      alert("Perangkat belum mendukung Web Share API. Gunakan tombol WhatsApp/Telegram di Analytics.");
    }
  });

  $("#waShare").addEventListener("click", () => {
    const text = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
    const href = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(href, "_blank");
  });
  $("#tgShare").addEventListener("click", () => {
    const text = `${shareData.title} — ${shareData.text}`;
    const href = `https://t.me/share/url?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(text)}`;
    window.open(href, "_blank");
  });
})();

// ===== Optional: hook untuk notifikasi real-time =====
// Misal WebSocket endpoint => ws://yourserver/rsvp
// function initRealtime() {
//   const ws = new WebSocket("wss://example.com/rsvp");
//   ws.onmessage = (ev) => { /* update render(), show toast, etc. */ };
// }
// initRealtime();
