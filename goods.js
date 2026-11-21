const GOODS_DATA = window.GOODS_DATA;
const products = GOODS_DATA.products ?? [];

// 画像キャッシュ対策：内容を差し替えたら IMG_VERSION を上げる（goods.html の ?v= も同じ値にそろえる）
const IMG_VERSION = '20261121-1';
const imagePath = (product, file) =>
  file.startsWith('http') ? file : `assets/goods/${product.id}/${file}?v=${IMG_VERSION}`;
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

const todayStr = (() => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
})();
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? '');
const daysUntil = (dateStr) =>
  Math.round((new Date(`${dateStr}T00:00:00`) - new Date(`${todayStr}T00:00:00`)) / 86400000);
const jpDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}年${m}月${d}日`;
};

const dialog = document.querySelector('#image-dialog');
const dialogImage = dialog.querySelector('img');
dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
const openImage = (src, alt) => {
  dialogImage.src = src;
  dialogImage.alt = alt;
  dialog.showModal();
};

// 締切間近のお知らせ（予約締切まで14日以内、近い順）
const noticeSection = document.querySelector('#deadline-notice');
const noticeList = document.querySelector('#notice-list');
const upcoming = products
  .map((p) => ({ product: p, date: (p.fields['予約締切'] ?? '').slice(0, 10) }))
  .filter(({ date }) => isDate(date) && daysUntil(date) >= 0 && daysUntil(date) <= 14)
  .sort((a, b) => a.date.localeCompare(b.date));
if (upcoming.length) {
  noticeSection.hidden = false;
  for (const { product, date } of upcoming) {
    const n = daysUntil(date);
    const row = document.createElement('a');
    row.className = 'notice-row';
    row.href = `#goods-${product.id}`;
    const main = document.createElement('div');
    main.className = 'notice-row-main';
    const chip = document.createElement('span');
    chip.className = 'deadline-chip chip-reserve';
    chip.textContent = '予約締切';
    const name = document.createElement('span');
    name.className = 'notice-name';
    name.textContent = product.fields['商品名'];
    const badge = document.createElement('span');
    badge.className = `days-badge${n > 6 ? ' soon' : ''}`;
    badge.textContent = n === 0 ? '本日締切' : `あと${n}日`;
    main.append(chip, name, badge);
    const sub = document.createElement('div');
    sub.className = 'notice-date';
    sub.textContent = `${jpDate(date)}まで`;
    row.append(main, sub);
    noticeList.append(row);
  }
}

const list = document.querySelector('#goods-list');
if (!products.length) document.querySelector('#goods-empty').hidden = false;

function buildCard(product) {
  const article = document.createElement('article');
  article.className = 'event-card';
  article.id = `goods-${product.id}`;

  const heading = document.createElement('div');
  heading.className = 'event-heading';
  const titleWrap = document.createElement('div');
  titleWrap.className = 'event-title-wrap';
  const title = document.createElement('h3');
  title.textContent = product.fields['商品名'];
  const range = document.createElement('p');
  range.className = 'event-range';
  range.textContent = product.fields['発売時期']
    ? `発売時期：${product.fields['発売時期']}`
    : '';
  const back = document.createElement('a');
  back.className = 'back-top';
  back.href = 'index.html';
  back.textContent = 'イベントまとめへ ↑';
  titleWrap.append(title, range);
  heading.append(titleWrap, back);

  const layout = document.createElement('div');
  layout.className = 'event-layout';
  const gallery = document.createElement('div');
  gallery.className = 'gallery';

  const addGalleryGroup = (label, items, featured, withCaptions) => {
    if (!items?.length) return false;
    const group = document.createElement('section');
    group.className = 'gallery-group';
    const h = document.createElement('h4');
    h.textContent = label;
    const grid = document.createElement('div');
    grid.className = `image-grid${featured ? ' featured-grid' : ''}`;
    for (const item of items) {
      const file = typeof item === 'string' ? item : item.file;
      const caption = typeof item === 'string' ? '' : item.label;
      const figure = document.createElement('figure');
      figure.className = 'bonus-item';
      const button = document.createElement('button');
      button.className = 'image-button';
      button.type = 'button';
      button.setAttribute('aria-label', `${product.fields['商品名']} の${label}を拡大表示`);
      const image = document.createElement('img');
      image.src = imagePath(product, file);
      image.alt = `${product.fields['商品名']} ${label}${caption ? ` ${caption}` : ''}`;
      image.loading = 'lazy';
      button.append(image);
      button.addEventListener('click', () => openImage(imagePath(product, file), image.alt));
      figure.append(button);
      if (withCaptions && caption) {
        const figcaption = document.createElement('figcaption');
        figcaption.textContent = caption;
        figure.append(figcaption);
      }
      grid.append(figure);
    }
    group.append(h, grid);
    gallery.append(group);
    return true;
  };

  let hasImage = addGalleryGroup('メインビジュアル', product.images.main, true, false);
  hasImage = addGalleryGroup('予約特典', product.images.bonuses, false, true) || hasImage;
  hasImage = addGalleryGroup('その他の画像', product.images.extras, false, false) || hasImage;
  if (!hasImage) {
    const note = document.createElement('p');
    note.className = 'gallery-empty';
    note.textContent = 'ビジュアルは順次掲載します。';
    gallery.append(note);
  }

  const info = document.createElement('dl');
  info.className = 'event-info';
  for (const label of ['発売時期', '予約締切', '価格', 'メーカー', '備考']) {
    const value = product.fields[label];
    if (!value) continue;
    const row = document.createElement('div');
    row.className = 'info-row';
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    appendLinkedText(dd, value);
    row.append(dt, dd);
    info.append(row);
  }
  if (product.fields['予約・販売ページ']) {
    const actions = document.createElement('p');
    actions.className = 'goods-actions';
    const a = document.createElement('a');
    a.className = 'primary-link';
    a.href = product.fields['予約・販売ページ'];
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.textContent = '予約・販売ページ →';
    actions.append(a);
    info.append(actions);
  }

  layout.append(gallery, info);
  article.append(heading, layout);
  return article;
}

products.forEach((product) => list.append(buildCard(product)));
