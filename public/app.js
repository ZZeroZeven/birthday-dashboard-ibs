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

  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return value;
  }

  if (
    typeof value === 'string' &&
    /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)
  ) {
    const [day, month, year] =
      value.split('/');

    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

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


// ==============================
// TODAY
// ==============================

function getTodayParts() {
  const now = new Date();

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate()
  };
}


function birthdayParts(value) {
  const date = parseBirthday(value);

  if (!date) return null;

  const [, month, day] =
    date.split('-').map(Number);

  return {
    month,
    day
  };
}


function isBirthdayToday(value) {
  const birthday = birthdayParts(value);

  if (!birthday) return false;

  const today = getTodayParts();

  return (
    birthday.month === today.month &&
    birthday.day === today.day
  );
}


// ==============================
// NEXT BIRTHDAY
// ==============================

function getNextBirthday(value) {
  const birthday = birthdayParts(value);

  if (!birthday) return null;

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  let year = today.getFullYear();

  let next = new Date(
    year,
    birthday.month - 1,
    birthday.day
  );

  next.setHours(0, 0, 0, 0);

  if (next < today) {
    year++;

    next = new Date(
      year,
      birthday.month - 1,
      birthday.day
    );

    next.setHours(0, 0, 0, 0);
  }

  return next;
}


function daysUntilBirthday(value) {
  const next = getNextBirthday(value);

  if (!next) return null;

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const difference =
    next.getTime() - today.getTime();

  return Math.round(
    difference / (1000 * 60 * 60 * 24)
  );
}


function countdownText(days) {
  if (days === null) {
    return '';
  }

  if (days === 0) {
    return 'Hari ini';
  }

  if (days === 1) {
    return 'Besok';
  }

  return `${days} hari lagi`;
}


// ==============================
// SORT
// ==============================

function sortUpcoming(list) {

  return [...list].sort(
    (a, b) => {

      const daysA =
        daysUntilBirthday(
          a.tanggalLahir
        );

      const daysB =
        daysUntilBirthday(
          b.tanggalLahir
        );

      if (daysA !== daysB) {
        return daysA - daysB;
      }

      return a.nama.localeCompare(
        b.nama,
        'id'
      );
    }
  );
}


// ==============================
// NORMALIZE DATA
// ==============================

function normalizePeople(data) {

  let source = [];

  if (Array.isArray(data)) {
    source = data;
  } else if (
    data &&
    Array.isArray(data.people)
  ) {
    source = data.people;
  }

  return source
    .map(person => {

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

        tanggalLahir:
          parseBirthday(birthday),

        angkatan:
          String(generation).trim()
      };
    })
    .filter(person =>
      person.nama &&
      person.tanggalLahir
    );
}


// ==============================
// FILTERS
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
        `<option value="${escapeHtml(generation)}">${escapeHtml(generation)}</option>`
      )
      .join('');


  $('month').innerHTML =
    '<option value="">Semua bulan</option>' +

    months
      .map((month, index) =>
        `<option value="${String(index + 1).padStart(2, '0')}">${month}</option>`
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
// TODAY BIRTHDAY SECTION
// ==============================

function renderTodayBirthdays() {

  const todayPeople =
    people.filter(person =>
      isBirthdayToday(
        person.tanggalLahir
      )
    );


  const today =
    new Date();


  $('todayBirthdayDate').textContent =
    new Intl.DateTimeFormat(
      'id-ID',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }
    ).format(today);


  $('todayCount').textContent =
    todayPeople.length;


  if (todayPeople.length === 0) {

    $('todayBirthdayList').innerHTML = `
      <div class="today-empty">
        Tidak ada yang berulang tahun hari ini.
      </div>
    `;

    return;
  }


  $('todayBirthdayList').innerHTML =
    todayPeople
      .sort((a, b) =>
        a.nama.localeCompare(
          b.nama,
          'id'
        )
      )
      .map(person => `
        <div class="today-person">

          <div class="today-person-name">
            🎉 ${escapeHtml(person.nama)}
          </div>

          <div class="today-person-date">
            ${formatDate(person.tanggalLahir)}
          </div>

          ${
            person.angkatan
              ? `
                <div class="today-person-generation">
                  ${escapeHtml(person.angkatan)}
                </div>
              `
              : ''
          }

        </div>
      `)
      .join('');
}


// ==============================
// RENDER TABLE
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
        (person, index) => {

          const days =
            daysUntilBirthday(
              person.tanggalLahir
            );

          return `
            <tr>

              <td>
                ${index + 1}
              </td>

              <td>
                <strong>
                  ${escapeHtml(person.nama)}
                </strong>
              </td>

              <td>
                ${formatDate(
                  person.tanggalLahir
                )}

                <br>

                <span class="countdown">
                  ${countdownText(days)}
                </span>
              </td>

              <td>
                ${escapeHtml(
                  person.angkatan
                )}
              </td>

            </tr>
          `;
        }
      )
      .join('');


  $('empty').classList.toggle(
    'hidden',
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

  renderTodayBirthdays();
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


    sessionStorage.setItem(
      'birthday_logged_in',
      '1'
    );


    $('loginView')
      .classList
      .add('hidden');


    $('appView')
      .classList
      .remove('hidden');


    renderTodayBirthdays();

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


    if (
      sessionStorage.getItem(
        'birthday_logged_in'
      ) === '1'
    ) {

      $('loginView')
        .classList
        .add('hidden');


      $('appView')
        .classList
        .remove('hidden');


      renderTodayBirthdays();

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
