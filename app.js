const EVENT_DATA = window.EVENT_DATA;
const columns = EVENT_DATA.columns;
const events = [...EVENT_DATA.events].sort((a, b) => a.id - b.id);
const CARD_MASCOTS = ['09', '01', '08', '12', '13', '14', '05', '10', '02'];

const formatValue = (label, value) => {
  if (value == null || value === '') return '';
  if (label === '期間（開始）' || label === '期間（終了）' || label === '通販終了日') return value.slice(0, 10);
  return value;
};
// 画像キャッシュ対策：内容を差し替えたら IMG_VERSION を上げる（index.html の ?v= も同じ値にそろえる）
const IMG_VERSION = '20261120-2';
const imagePath = (event, file) =>
  file.startsWith('http') ? file : `assets/events/${event.id}/${file}?v=${IMG_VERSION}`;
// 文章中のURLをリンク化して要素へ追加する（備考などのテキスト欄用）
const appendLinkedText = (el, text) => {
  const parts = String(text).split(/(https?:\/\/[^\s、。）)」]+)/g);
  for (const part of parts) {
    if (/^https?:\/\//.test(part)) {
      const a = document.createElement('a');
      a.href = part;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.textContent = part;
      el.append(a);
    } else if (part) {
      el.append(document.createTextNode(part));
    }
  }
};
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

// 締切間近のお知らせ：締切まで14日以内のものを、種類をまぜて近い順に表示する
const daysUntil = (dateStr) =>
  Math.round((new Date(`${dateStr}T00:00:00`) - new Date(`${todayStr}T00:00:00`)) / 86400000);
const jpDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}年${m}月${d}日`;
};
const deadlines = [];
for (const event of events) {
  const end = endOf(event);
  const shopEnd = formatValue('通販終了日', event.fields['通販終了日']);
  if (/^\d{4}-\d{2}-\d{2}$/.test(end) && shopEnd !== end) {
    deadlines.push({ type: '開催終了', chip: 'chip-end', name: event.fields['イベント名'], date: end, href: `#event-${event.id}` });
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(shopEnd)) {
    deadlines.push({ type: '通販終了', chip: 'chip-shop', name: event.fields['イベント名'], date: shopEnd, href: `#event-${event.id}` });
  }
}
for (const product of window.GOODS_DATA?.products ?? []) {
  const date = (product.fields['予約締切'] ?? '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    deadlines.push({ type: '予約締切', chip: 'chip-reserve', name: product.fields['商品名'], date, href: 'goods.html' });
  }
}
const upcoming = deadlines
  .filter((d) => daysUntil(d.date) >= 0 && daysUntil(d.date) <= 14)
  .sort((a, b) => a.date.localeCompare(b.date));
const noticeSection = document.querySelector('#deadline-notice');
const noticeList = document.querySelector('#notice-list');
if (upcoming.length && noticeSection && noticeList) {
  noticeSection.hidden = false;
  for (const d of upcoming) {
    const n = daysUntil(d.date);
    const row = document.createElement('a');
    row.className = 'notice-row';
    row.href = d.href;
    const main = document.createElement('div');
    main.className = 'notice-row-main';
    const chip = document.createElement('span');
    chip.className = `deadline-chip ${d.chip}`;
    chip.textContent = d.type;
    const name = document.createElement('span');
    name.className = 'notice-name';
    name.textContent = d.name;
    const badge = document.createElement('span');
    badge.className = `days-badge${n > 6 ? ' soon' : ''}`;
    badge.textContent = n === 0 ? '本日締切' : `あと${n}日`;
    main.append(chip, name, badge);
    const sub = document.createElement('div');
    sub.className = 'notice-date';
    sub.textContent = `${jpDate(d.date)}まで`;
    row.append(main, sub);
    noticeList.append(row);
  }
}

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
      appendLinkedText(td, value);
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
  const infoColumns = columns.flatMap((c) => (c === '通販' ? [c, '通販終了日'] : [c]));
  for (const column of infoColumns) {
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
      appendLinkedText(dd, value);
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
