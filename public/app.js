const $ = id => document.getElementById(id);

let people = [];
let passwordHash = '';

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


// ==============================
// SHA-256
// ==============================

async function sha256(text) {
  const data = new TextEncoder().encode(text);

  const hash = await crypto.subtle.digest(
    'SHA-256',
    data
  );

  return Array.from(new Uint8Array(hash))
    .map(byte =>
      byte.toString(16).padStart(2, '0')
    )
    .join('');
}


// ==============================
// HTML ESCAPE
// ==============================

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
}


// ==============================
// DATE
// ==============================

function parseBirthday(value) {
  if (!value) return null;

  // Format ISO: 2013-02-28
  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return value;
  }

  // Format dd/mm/yyyy
  if (
    typeof value === 'string' &&
    /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)
  ) {
    const [day, month, year] =
      value.split('/');

    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Format dd-mm-yyyy
  if (
    typeof value === 'string' &&
    /^\d{1,2}-\d{1,2}-\d{4}$/.test(value)
  ) {
    const [day, month, year] =
      value.split('-');

    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}


function formatDate(value) {
  const date = parseBirthday(value);

  if (!date) return '-';

  const [year, month, day] =
    date.split('-').map(Number);

  return new Intl.DateTimeFormat(
    'id-ID',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }
  ).format(
    new Date(year, month - 1, day)
  );
}


function birthdayKey(value) {
  const date = parseBirthday(value);

  if (!date) return 9999;

  const [, month, day] =
    date.split('-').map(Number);

  return month * 100 + day;
}


// ==============================
// NORMALIZE DATA
// ==============================

function normalizePeople(data) {

  let source = [];

  // Format baru:
  // [
  //   {
  //     nama: "...",
  //     tanggalLahir: "...",
  //     angkatan: "..."
  //   }
  // ]

  if (Array.isArray(data)) {
    source = data;
  }

  // Format lama:
  // {
  //   people: [...]
  // }

  else if (Array.isArray(data.people)) {
    source = data.people;
  }

  return source
    .map(person => {

      // Support format baru
      const name =
        person.nama ??
        person.name ??
        person['Nama Siswa'] ??
        '';

      const birthday =
        person.tanggalLahir ??
        person.birthday ??
        person['Tanggal Lahir'] ??
        '';

      const generation =
        person.angkatan ??
        person.generation ??
        person.ANGKATAN ??
        person['ANGKATAN'] ??
        '';

      return {
        nama: String(name).trim(),
        tanggalLahir: parseBirthday(birthday),
        angkatan: String(generation).trim()
      };
    })
    .filter(person =>
      person.nama &&
      person.tanggalLahir
    );
}


// ==============================
// SORT UPCOMING BIRTHDAYS
// ==============================

function sortUpcoming(list) {

  const now = new Date();

  const today =
    (now.getMonth() + 1) * 100 +
    now.getDate();

  return [...list].sort(
    (a, b) => {

      let distanceA =
        birthdayKey(a.tanggalLahir) -
        today;

      let distanceB =
        birthdayKey(b.tanggalLahir) -
        today;

      if (distanceA < 0) {
        distanceA += 1200;
      }

      if (distanceB < 0) {
        distanceB += 1200;
      }

      if (distanceA !== distanceB) {
        return distanceA - distanceB;
      }

      return a.nama.localeCompare(
        b.nama,
        'id'
      );
    }
  );
}


// ==============================
// FILTER OPTIONS
// ==============================

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
      .map(generation =>
        `<option value="${escapeHtml(generation)}">
          ${escapeHtml(generation)}
        </option>`
      )
      .join('');


  $('month').innerHTML =
    '<option value="">Semua bulan</option>' +

    months
      .map((month, index) =>
        `<option value="${String(index + 1).padStart(2, '0')}">
          ${month}
        </option>`
      )
      .join('');


  $('day').innerHTML =
    '<option value="">Semua tanggal</option>' +

    Array.from(
      { length: 31 },
      (_, index) => {

        const day =
          String(index + 1).padStart(2, '0');

        return `
          <option value="${day}">
            ${index + 1}
          </option>
        `;
      }
    ).join('');
}


// ==============================
// RENDER
// ==============================

function render() {

  const query =
    $('search').value
      .toLowerCase()
      .trim();

  const selectedMonth =
    $('month').value;

  const selectedDay =
    $('day').value;

  const selectedGeneration =
    $('generation').value;


  const filtered =
    sortUpcoming(
      people.filter(person => {

        const date =
          parseBirthday(
            person.tanggalLahir
          );

        if (!date) return false;

        const parts =
          date.split('-');


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
          person.angkatan ===
            selectedGeneration;


        return (
          matchesName &&
          matchesMonth &&
          matchesDay &&
          matchesGeneration
        );
      })
    );


  $('total').textContent =
    people.length;

  $('shown').textContent =
    filtered.length;

  $('resultLabel').textContent =
    `(${filtered.length} data)`;


  $('tbody').innerHTML =
    filtered
      .map(
        (person, index) => `
          <tr>
            <td>${index + 1}</td>

            <td>
              <strong>
                ${escapeHtml(person.nama)}
              </strong>
            </td>

            <td>
              ${formatDate(person.tanggalLahir)}
            </td>

            <td>
              ${escapeHtml(person.angkatan)}
            </td>
          </tr>
        `
      )
      .join('');


  $('empty').classList.toggle(
    'hide',
    filtered.length !== 0
  );
}


// ==============================
// LOAD DATA
// ==============================

async function loadData() {

  const dataResponse =
    await fetch(
      `data.json?v=${Date.now()}`
    );

  if (!dataResponse.ok) {
    throw new Error(
      'data.json tidak ditemukan.'
    );
  }


  const authResponse =
    await fetch(
      `auth.json?v=${Date.now()}`
    );

  if (!authResponse.ok) {
    throw new Error(
      'auth.json tidak ditemukan.'
    );
  }


  const data =
    await dataResponse.json();

  const auth =
    await authResponse.json();


  people =
    normalizePeople(data);


  passwordHash =
    String(
      auth.passwordHash || ''
    ).trim();


  if (!passwordHash) {
    throw new Error(
      'Password belum dikonfigurasi.'
    );
  }


  if (
    data.updatedAt &&
    $('updated')
  ) {
    $('updated').textContent =
      new Date(
        data.updatedAt
      ).toLocaleString('id-ID');
  }


  setupFilters();
}


// ==============================
// LOGIN
// ==============================

async function login() {

  const password =
    $('password').value;


  $('loginError').textContent = '';


  if (!password) {
    $('loginError').textContent =
      'Masukkan password.';

    return;
  }


  try {

    const enteredHash =
      await sha256(password);


    if (
      !passwordHash ||
      enteredHash !== passwordHash
    ) {

      $('loginError').textContent =
        'Password salah.';

      return;
    }


    // Password benar
    sessionStorage.setItem(
      'birthday_logged_in',
      '1'
    );


    // Masuk dashboard
    $('loginView')
      .classList
      .add('hidden');

    $('appView')
      .classList
      .remove('hidden');


    render();

  } catch (error) {

    console.error(
      'Login error:',
      error
    );

    $('loginError').textContent =
      'Terjadi kesalahan saat login.';
  }
}


// ==============================
// LOGOUT
// ==============================

function logout() {

  sessionStorage.removeItem(
    'birthday_logged_in'
  );

  location.reload();
}


// ==============================
// EVENTS
// ==============================

$('loginBtn').addEventListener(
  'click',
  login
);


$('password').addEventListener(
  'keydown',
  event => {

    if (event.key === 'Enter') {
      login();
    }

  }
);


$('logoutBtn').addEventListener(
  'click',
  logout
);


[
  'search',
  'month',
  'day',
  'generation'
].forEach(id => {

  $(id).addEventListener(
    'input',
    render
  );

});


$('resetBtn').addEventListener(
  'click',
  () => {

    $('search').value = '';
    $('month').value = '';
    $('day').value = '';
    $('generation').value = '';

    render();
  }
);


// ==============================
// START
// ==============================

async function start() {

  try {

    await loadData();


    // Jika sebelumnya sudah login
    if (
      sessionStorage.getItem(
        'birthday_logged_in'
      ) === '1'
    ) {

      $('loginView')
        .classList
        .add('hide');

      $('appView')
        .classList
        .remove('hide');

      render();
    }

  } catch (error) {

    console.error(
      'Startup error:',
      error
    );

    $('loginError').textContent =
      error.message;
  }
}


start();
