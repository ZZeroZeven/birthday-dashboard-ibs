const $ = id => document.getElementById(id);

let people = [];
let hash = '';

const months = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
];

async function sha(value) {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );
  return [...new Uint8Array(buffer)]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function parseDate(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
}

function fmt(value) {
  const date = parseDate(value);
  if (!date) return value || '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date(date.year, date.month - 1, date.day));
}

function birthdayKey(value) {
  const date = parseDate(value);
  return date ? date.month * 100 + date.day : 9999;
}

function todayParts() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate()
  };
}

function daysUntil(value) {
  const date = parseDate(value);
  if (!date) return 0;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(start.getFullYear(), date.month - 1, date.day);

  if (next < start) {
    next = new Date(start.getFullYear() + 1, date.month - 1, date.day);
  }

  return Math.round((next - start) / 86400000);
}

function countdownText(value) {
  const days = daysUntil(value);
  if (days === 0) return 'Hari ini 🎂';
  if (days === 1) return 'Besok';
  return `${days} hari lagi`;
}

function sortUpcoming(list) {
  return [...list].sort((a, b) =>
    birthdayKey(a.birthday) - birthdayKey(b.birthday) ||
    a.name.localeCompare(b.name, 'id')
  ).sort((a, b) => {
    const da = daysUntil(a.birthday);
    const db = daysUntil(b.birthday);
    return da - db || a.name.localeCompare(b.name, 'id');
  });
}

function normalizePeople(data) {
  const source = Array.isArray(data) ? data : (data?.people || []);

  return source.map(item => ({
    name: String(item.name ?? item.nama ?? '').trim(),
    birthday: String(item.birthday ?? item.tanggalLahir ?? '').trim(),
    angkatan: String(item.angkatan ?? item.generation ?? '').trim()
  })).filter(item => item.name && parseDate(item.birthday));
}

function setupFilters() {
  const generations = [...new Set(people.map(p => p.angkatan).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'id'));

  $('generation').innerHTML =
    '<option value="">Semua angkatan</option>' +
    generations.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('');

  $('month').innerHTML =
    '<option value="">Semua bulan</option>' +
    months.map((name, index) =>
      `<option value="${String(index + 1).padStart(2, '0')}">${name}</option>`
    ).join('');

  $('day').innerHTML =
    '<option value="">Semua tanggal</option>' +
    Array.from({ length: 31 }, (_, index) => {
      const day = String(index + 1).padStart(2, '0');
      return `<option value="${day}">${index + 1}</option>`;
    }).join('');
}

function renderTodayBirthdays() {
  const today = todayParts();
  const current = people.filter(person => {
    const date = parseDate(person.birthday);
    return date && date.month === today.month && date.day === today.day;
  });

  $('todayBirthdayDate').textContent = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date(today.year, today.month - 1, today.day));

  $('todayCount').textContent = current.length;

  if (!current.length) {
    $('todayBirthdayList').innerHTML =
      '<div class="today-empty">Tidak ada yang berulang tahun hari ini.</div>';
    return;
  }

  $('todayBirthdayList').innerHTML = current.map((person, index) => `
    <article class="today-person" style="--i:${index}">
      <div class="today-person-name">${esc(person.name)}</div>
      <div class="today-person-date">${esc(fmt(person.birthday))}</div>
      <div class="today-person-generation">🎓 ${esc(person.angkatan || 'Angkatan tidak diketahui')}</div>
    </article>
  `).join('');
}

function animateResults() {
  const rows = $('tbody').querySelectorAll('.result-row');
  rows.forEach((row, index) => {
    row.style.setProperty('--i', index);
  });

  const pulse = $('resultPulse');
  if (pulse) {
    pulse.classList.remove('is-pulsing');
    void pulse.offsetWidth;
    pulse.classList.add('is-pulsing');
  }
}

let directoryPage = 1;
const pageSize = 100;
let selectedCalendarMonth = new Date().getMonth() + 1;

function currentFilteredPeople() {
  const query = $('search').value.toLowerCase().trim();
  const month = $('month').value, day = $('day').value, generation = $('generation').value;
  return sortUpcoming(people.filter(person => {
    const date = parseDate(person.birthday);
    return date && (!query || person.name.toLowerCase().includes(query)) &&
      (!month || String(date.month).padStart(2, '0') === month) &&
      (!day || String(date.day).padStart(2, '0') === day) &&
      (!generation || person.angkatan === generation);
  }));
}

function renderPagination(total) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  directoryPage = Math.min(directoryPage, pages);
  const first = total ? (directoryPage - 1) * pageSize + 1 : 0;
  const last = Math.min(directoryPage * pageSize, total);
  $('directoryRange').textContent = total ? `${first}–${last} dari ${total} nama` : '0 nama';
  $('pagination').innerHTML = pages <= 1 ? '' : `
    <button class="page-button" type="button" data-page="${directoryPage - 1}" ${directoryPage === 1 ? 'disabled' : ''} aria-label="Halaman sebelumnya">←</button>
    <span>Halaman <strong>${directoryPage}</strong> dari ${pages}</span>
    <button class="page-button" type="button" data-page="${directoryPage + 1}" ${directoryPage === pages ? 'disabled' : ''} aria-label="Halaman berikutnya">→</button>`;
}

function render() {
  const result = currentFilteredPeople();
  const pages = Math.max(1, Math.ceil(result.length / pageSize));
  directoryPage = Math.min(directoryPage, pages);
  const visible = result.slice((directoryPage - 1) * pageSize, directoryPage * pageSize);
  $('total').textContent = people.length;
  $('navTotal').textContent = people.length;
  $('resultLabel').textContent = `(${result.length})`;
  $('tbody').innerHTML = visible.map((person, index) => `
    <tr class="result-row" style="--i:${index}">
      <td>${String((directoryPage - 1) * pageSize + index + 1).padStart(2, '0')}</td>
      <td><strong>${esc(person.name)}</strong></td><td>${esc(fmt(person.birthday))}</td>
      <td>${esc(person.angkatan || 'Tidak diketahui')}</td>
      <td><span class="countdown">${esc(countdownText(person.birthday))}</span></td>
    </tr>`).join('');
  $('empty').classList.toggle('hide', result.length > 0);
  renderPagination(result.length);
  animateResults();
}

function renderCalendar() {
  $('monthPicker').innerHTML = months.map((name, index) =>
    `<button type="button" class="month-chip ${selectedCalendarMonth === index + 1 ? 'is-selected' : ''}" data-month="${index + 1}" aria-pressed="${selectedCalendarMonth === index + 1}">${name.slice(0, 3)}</button>`
  ).join('');
  const list = people.filter(person => parseDate(person.birthday)?.month === selectedCalendarMonth)
    .sort((a, b) => parseDate(a.birthday).day - parseDate(b.birthday).day || a.name.localeCompare(b.name, 'id'));
  $('calendarEyebrow').textContent = `MONTH ${String(selectedCalendarMonth).padStart(2, '0')} / BIRTHDAYS`;
  $('calendarTitle').textContent = months[selectedCalendarMonth - 1];
  $('calendarCount').textContent = `${list.length} nama`;
  $('calendarList').innerHTML = list.length ? list.map(person => {
    const date = parseDate(person.birthday);
    return `<article class="calendar-person"><span class="calendar-day">${String(date.day).padStart(2, '0')}</span><div><strong>${esc(person.name)}</strong><small>${esc(person.angkatan || 'Angkatan tidak diketahui')}</small></div><span class="calendar-date">${String(date.day).padStart(2, '0')} ${months[date.month - 1].slice(0,3)}</span></article>`;
  }).join('') : '<div class="calendar-empty">Belum ada ulang tahun yang tercatat di bulan ini.</div>';
}

function showPage(page) {
  document.querySelectorAll('[data-page]').forEach(panel => panel.classList.toggle('is-active', panel.dataset.page === page));
  document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('is-active', link.dataset.pageTarget === page));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function load() {
  const [dataResponse, authResponse] = await Promise.all([
    fetch(`data.json?v=${Date.now()}`),
    fetch(`auth.json?v=${Date.now()}`)
  ]);

  if (!dataResponse.ok || !authResponse.ok) {
    throw new Error('Data belum tersedia. Jalankan workflow Update birthday data terlebih dahulu.');
  }

  const dataJson = await dataResponse.json();
  const authJson = await authResponse.json();

  people = normalizePeople(dataJson);
  hash = authJson.passwordHash || '';

  $('updated').textContent = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  setupFilters();
  renderTodayBirthdays();
  renderCalendar();
  render();
}

function showDashboard(animated = true) {
  $('loginView').classList.remove('is-exiting', 'is-entering');
  $('appView').classList.remove('is-exiting');
  $('appView').classList.remove('hide');
  $('appView').setAttribute('aria-hidden', 'false');

  if (animated) {
    $('appView').classList.remove('is-entering');
    void $('appView').offsetWidth;
    $('appView').classList.add('is-entering');

    $('loginView').classList.add('is-exiting');
    $('loginView').addEventListener('animationend', () => {
      $('loginView').classList.add('hide');
    }, { once: true });
  } else {
    $('loginView').classList.add('hide');
  }

  render();
}

async function login() {
  $('loginError').textContent = '';

  const password = $('password').value;
  if (!password) {
    $('loginError').textContent = 'Masukkan password.';
    $('password').focus();
    return;
  }

  const enteredHash = await sha(password);

  if (enteredHash !== hash || !hash) {
    $('loginError').textContent = 'Password salah.';
    $('password').select();
    return;
  }

  sessionStorage.ok = '1';
  showDashboard(true);
}

$('loginBtn').addEventListener('click', login);
$('password').addEventListener('keydown', event => {
  if (event.key === 'Enter') login();
});

$('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('ok');
  $('appView').classList.add('is-exiting');

  setTimeout(() => {
    location.reload();
  }, 420);
});

['search', 'month', 'day', 'generation'].forEach(id => {
  const element = $(id);
  element.addEventListener(
    id === 'search' ? 'input' : 'change',
    () => { directoryPage = 1; render(); }
  );
});

$('resetBtn').addEventListener('click', () => {
  $('search').value = '';
  $('month').value = '';
  $('day').value = '';
  $('generation').value = '';
  directoryPage = 1;
  render();
});

document.querySelectorAll('[data-page-target]').forEach(button => button.addEventListener('click', () => showPage(button.dataset.pageTarget)));
document.getElementById('pagination').addEventListener('click', event => {
  const button = event.target.closest('[data-page]');
  if (!button || button.disabled) return;
  directoryPage = Number(button.dataset.page);
  render();
  document.querySelector('.results-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.getElementById('monthPicker').addEventListener('click', event => {
  const button = event.target.closest('[data-month]');
  if (!button) return;
  selectedCalendarMonth = Number(button.dataset.month);
  renderCalendar();
});

load()
  .then(() => {
    if (sessionStorage.ok === '1') {
      showDashboard(false);
    }
  })
  .catch(error => {
    $('loginError').textContent = error.message;
  });


function applyTheme(theme) {
  const selected = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = selected;
  try { localStorage.setItem('birthday-theme', selected); } catch {}
  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    const nextLabel = selected === 'dark' ? 'Mode terang' : 'Mode gelap';
    button.innerHTML = `${selected === 'dark' ? '☀' : '☾'} <span>${nextLabel}</span>`;
    button.setAttribute('aria-label', `Ganti ke ${nextLabel.toLowerCase()}`);
  });
}

document.querySelectorAll('[data-theme-toggle]').forEach(button => {
  button.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });
});
applyTheme(document.documentElement.dataset.theme);
