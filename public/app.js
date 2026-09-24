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
  pulse.classList.remove('is-pulsing');
  void pulse.offsetWidth;
  pulse.classList.add('is-pulsing');
}

function render() {
  const query = $('search').value.toLowerCase().trim();
  const month = $('month').value;
  const day = $('day').value;
  const generation = $('generation').value;

  const filtered = people.filter(person => {
    const date = parseDate(person.birthday);
    if (!date) return false;

    return (
      (!query || person.name.toLowerCase().includes(query)) &&
      (!month || String(date.month).padStart(2, '0') === month) &&
      (!day || String(date.day).padStart(2, '0') === day) &&
      (!generation || person.angkatan === generation)
    );
  });

  const result = sortUpcoming(filtered);

  $('total').textContent = people.length;
  $('shown').textContent = result.length;
  $('resultLabel').textContent = `(${result.length})`;

  $('tbody').innerHTML = result.map((person, index) => `
    <tr class="result-row" style="--i:${index}">
      <td>${index + 1}</td>
      <td><strong>${esc(person.name)}</strong></td>
      <td>${esc(fmt(person.birthday))}</td>
      <td>${esc(person.angkatan || 'Tidak diketahui')}</td>
      <td><span class="countdown">${esc(countdownText(person.birthday))}</span></td>
    </tr>
  `).join('');

  $('empty').classList.toggle('hide', result.length > 0);
  animateResults();
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

  $('updated').textContent = dataJson.updatedAt
    ? new Date(dataJson.updatedAt).toLocaleString('id-ID')
    : '-';

  setupFilters();
  renderTodayBirthdays();
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
    render
  );
});

$('resetBtn').addEventListener('click', () => {
  $('search').value = '';
  $('month').value = '';
  $('day').value = '';
  $('generation').value = '';
  render();
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
