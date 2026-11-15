const EVENT_DATA = window.EVENT_DATA;
const columns = EVENT_DATA.columns;
const events = [...EVENT_DATA.events].sort((a, b) => a.id - b.id);
const CARD_MASCOTS = ['09', '01', '08', '12', '13', '14', '05', '10', '02'];

const formatValue = (label, value) => {
  if (value == null || value === '') return '';
  if (label === '期間（開始）' || label === '期間（終了）') return value.slice(0, 10);
  return value;
};
// 画像キャッシュ対策：内容を差し替えたら IMG_VERSION を上げる（index.html の ?v= も同じ値にそろえる）
const IMG_VERSION = '20261115-2';
const imagePath = (event, file) =>
  file.startsWith('http') ? file : `assets/events/${event.id}/${file}?v=${IMG_VERSION}`;
const cardMascot = (index) =>
  `assets/decor/mascot-${CARD_MASCOTS[index % CARD_MASCOTS.length]}.png`;

// 終了判定：終了日が「今日」より前ならアーカイブ。終了日が空欄・不明・未定は開催中扱い。
const todayStr = (() => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
})();
const endOf = (event) => formatValue('期間（終了）', event.fields['期間（終了）']);
const isEnded = (event) => {
  const end = endOf(event);
  return /^\d{4}-\d{2}-\d{2}$/.test(end) && end < todayStr;
};
const current = events.filter((e) => !isEnded(e));
const archived = events.filter((e) => isEnded(e));

const rows = document.querySelector('#event-rows');
const details = document.querySelector('#event-details');
const archiveDetails = document.querySelector('#archive-details');
const dialog = document.querySelector('#image-dialog');
const dialogImage = dialog.querySelector('img');
dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

document.querySelector('#event-count-label').textContent =
  `EVENTS ${String(current.length).padStart(2, '0')} ＋ ARCHIVE ${String(archived.length).padStart(2, '0')}`;
document.querySelector('#current-count').innerHTML =
  `EVENTS <i>${String(current.length).padStart(2, '0')}</i> / ${String(events.length).padStart(2, '0')}`;
if (!archived.length) document.querySelector('#archive').style.display = 'none';

for (const event of current) {
  const tr = document.createElement('tr');
  for (const column of columns) {
    const td = document.createElement('td');
    const raw = event.fields[column];
    const value = formatValue(column, raw);
    if (column === 'イベント名') {
      const a = document.createElement('a');
      a.className = 'table-event-link';
      a.href = `#event-${event.id}`;
      a.textContent = value;
      td.append(a);
    } else if ((column === '公式ページ' || column === '通販') && raw?.startsWith('http')) {
      const a = document.createElement('a');
      a.className = 'url-link';
      a.href = raw;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.textContent = column === '公式ページ' ? '公式ページ ↗' : '通販ページ ↗';
      td.append(a);
    } else {
      td.textContent = value;
    }
    tr.append(td);
  }
  rows.append(tr);
}

function buildCard(event, mascotIndex) {
  const article = document.createElement('article');
  article.className = 'event-card';
  article.id = `event-${event.id}`;

  const heading = document.createElement('div');
  heading.className = 'event-heading';
  const number = document.createElement('span');
  number.className = 'event-number';
  number.textContent = String(event.id).padStart(2, '0');
  const titleWrap = document.createElement('div');
  titleWrap.className = 'event-title-wrap';
  const title = document.createElement('h3');
  title.textContent = event.fields['イベント名'];
  const range = document.createElement('p');
  range.className = 'event-range';
  range.textContent =
    `${formatValue('期間（開始）', event.fields['期間（開始）'])} — ${formatValue('期間（終了）', event.fields['期間（終了）']) || '未定'}`;
  const img = document.createElement('img');
  img.className = 'mascot-sticker card-mascot';
  img.src = cardMascot(mascotIndex);
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  const back = document.createElement('a');
  back.className = 'back-top';
  back.href = '#event-list';
  back.textContent = '一覧へ ↑';
  titleWrap.append(title, range);
  heading.append(number, titleWrap, img, back);

  const layout = document.createElement('div');
  layout.className = 'event-layout';
  const gallery = document.createElement('div');
  gallery.className = 'gallery';
  const groups = [
    ['メインビジュアル', event.images.main, true],
    ['グッズ画像', event.images.items, false],
    ['特典・告知画像', event.images.extras, false],
    ['その他の画像', event.images.unclassified, false],
  ];
  let hasImage = false;
  for (const [label, files, featured] of groups) {
    if (!files?.length) continue;
    hasImage = true;
    const group = document.createElement('section');
    group.className = 'gallery-group';
    const h = document.createElement('h4');
    h.textContent = label;
    const grid = document.createElement('div');
    grid.className = `image-grid${featured ? ' featured-grid' : ''}`;
    for (const file of files) {
      const button = document.createElement('button');
      button.className = 'image-button';
      button.type = 'button';
      button.setAttribute('aria-label', `${event.fields['イベント名']} の${label}を拡大表示`);
      const image = document.createElement('img');
      image.src = imagePath(event, file);
      image.alt = `${event.fields['イベント名']} ${label}`;
      image.loading = 'lazy';
      button.append(image);
      button.addEventListener('click', () => {
        dialogImage.src = imagePath(event, file);
        dialogImage.alt = image.alt;
        dialog.showModal();
      });
      grid.append(button);
    }
    group.append(h, grid);
    gallery.append(group);
  }
  if (!hasImage) {
    const note = document.createElement('p');
    note.className = 'gallery-empty';
    note.textContent = 'ビジュアルは順次掲載します。';
    gallery.append(note);
  }

  const info = document.createElement('dl');
  info.className = 'event-info';
  for (const column of columns) {
    if (column === '番号') continue;
    const raw = event.fields[column];
    const value = formatValue(column, raw);
    if (!value) continue;
    const row = document.createElement('div');
    row.className = 'info-row';
    const dt = document.createElement('dt');
    dt.textContent = column;
    const dd = document.createElement('dd');
    if ((column === '公式ページ' || column === '通販') && raw?.startsWith('http')) {
      const a = document.createElement('a');
      a.href = raw;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.textContent = value;
      dd.append(a);
    } else {
      dd.textContent = value;
    }
    row.append(dt, dd);
    info.append(row);
  }
  layout.append(gallery, info);
  article.append(heading, layout);
  return article;
}

current.forEach((event, i) => details.append(buildCard(event, i)));
archived.forEach((event, i) => archiveDetails.append(buildCard(event, current.length + i)));
