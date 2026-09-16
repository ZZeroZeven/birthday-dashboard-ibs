const $ = id => document.getElementById(id);

let people = [];
let hash = '';

const months = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

async function sha(text) {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text)
  );

  return [...new Uint8Array(buffer)]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}

function esc(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char])
  );
}

function formatDate(value) {
  if (!value) return '-';

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, month - 1, day));
}

function birthdayKey(value) {
  const [, month, day] = value.split('-').map(Number);
  return month * 100 + day;
}

function sortUpcoming(list) {
  const now = new Date();

  const today =
    (now.getMonth() + 1) * 100 +
    now.getDate();

  return [...list].sort((a, b) => {
    let distanceA = birthdayKey(a.tanggalLahir) - today;
    let distanceB = birthdayKey(b.tanggalLahir) - today;

    if (distanceA < 0) distanceA += 1200;
    if (distanceB < 0) distanceB += 1200;

    return (
      distanceA - distanceB ||
      a.nama.localeCompare(b.nama, 'id')
    );
  });
}

function setupFilters() {
  const generations = [
    ...new Set(
      people
        .map(person => person.angkatan)
        .filter(Boolean)
    )
  ].sort((a, b) =>
    a.localeCompare(b, 'id')
  );

  $('generation').innerHTML =
    '<option value="">Semua angkatan</option>' +
    generations
      .map(
        generation =>
          `<option value="${esc(generation)}">${esc(generation)}</option>`
      )
      .join('');

  $('month').innerHTML =
    '<option value="">Semua bulan</option>' +
    months
      .map(
        (month, index) =>
          `<option value="${String(index + 1).padStart(2, '0')}">${month}</option>`
      )
      .join('');

  $('day').innerHTML =
    '<option value="">Semua tanggal</option>' +
    Array.from(
      { length: 31 },
      (_, index) =>
        `<option value="${String(index + 1).padStart(2, '0')}">${index + 1}</option>`
    ).join('');
}

function render() {
  const query = $('search').value
    .toLowerCase()
    .trim();

  const selectedMonth = $('month').value;
  const selectedDay = $('day').value;
  const selectedGeneration = $('generation').value;

  const filtered = sortUpcoming(
    people.filter(person => {
      const parts = person.tanggalLahir.split('-');

      const matchesName =
        !query ||
        person.nama
          .toLowerCase()
          .includes(query);

      const matchesMonth =
        !selectedMonth ||
        parts[1] === selectedMonth;

      const matchesDay =
        !selectedDay ||
        parts[2] === selectedDay;

      const matchesGeneration =
        !selectedGeneration ||
        person.angkatan === selectedGeneration;

      return (
        matchesName &&
        matchesMonth &&
        matchesDay &&
        matchesGeneration
      );
    })
  );

  $('total').textContent = people.length;
  $('shown').textContent = filtered.length;
  $('resultLabel').textContent =
    `(${filtered.length} data)`;

  $('tbody').innerHTML = filtered
    .map(
      (person, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>${esc(person.nama)}</strong>
          </td>
          <td>${formatDate(person.tanggalLahir)}</td>
          <td>${esc(person.angkatan)}</td>
        </tr>
      `
    )
    .join('');

  $('empty').classList.toggle(
    'hide',
    filtered.length > 0
  );
}

async function loadData() {
  const [dataResponse, authResponse] =
    await Promise.all([
      fetch(`data.json?v=${Date.now()}`),
      fetch(`auth.json?v=${Date.now()}`)
    ]);

  if (!dataResponse.ok) {
    throw new Error(
      'data.json tidak ditemukan. Jalankan workflow Update birthday data terlebih dahulu.'
    );
  }

  if (!authResponse.ok) {
    throw new Error(
      'auth.json tidak ditemukan. Jalankan workflow Update birthday data terlebih dahulu.'
    );
  }

  const rawData = await dataResponse.json();
  const authData = await authResponse.json();

  /*
   * update_data.py menghasilkan ARRAY langsung:
   *
   * [
   *   {
   *     "nama": "...",
   *     "tanggalLahir": "...",
   *     "angkatan": "..."
   *   }
   * ]
   *
   * Karena itu kita langsung gunakan rawData.
   */

  if (Array.isArray(rawData)) {
    people = rawData;
  }

  /*
   * Untuk berjaga-jaga jika nanti format data.json
   * berubah menjadi { people: [...] }.
   */
  else if (Array.isArray(rawData.people)) {
    people = rawData.people;
  } else {
    people = [];
  }

  hash = authData.passwordHash || '';

  $('updated').textContent =
    new Date().toLocaleString('id-ID');

  setupFilters();
  render();
}

$('loginBtn').onclick = async () => {
  const password = $('password').value;

  const passwordHash = await sha(password);

  if (passwordHash === hash && hash) {
    sessionStorage.ok = '1';

    $('loginView').classList.add('hide');
    $('appView').classList.remove('hide');

    render();
  } else {
    $('loginError').textContent =
      'Password salah.';
  }
};

$('password').onkeydown = event => {
  if (event.key === 'Enter') {
    $('loginBtn').click();
  }
};

$('logoutBtn').onclick = () => {
  sessionStorage.removeItem('ok');
  location.reload();
};

['search', 'month', 'day', 'generation']
  .forEach(id => {
    $(id).oninput = render;
  });

$('resetBtn').onclick = () => {
  $('search').value = '';
  $('month').value = '';
  $('day').value = '';
  $('generation').value = '';

  render();
};

loadData()
  .then(() => {
    if (sessionStorage.ok === '1') {
      $('loginView').classList.add('hide');
      $('appView').classList.remove('hide');

      render();
    }
  })
  .catch(error => {
    console.error(error);

    $('loginError').textContent =
      error.message;
  });
