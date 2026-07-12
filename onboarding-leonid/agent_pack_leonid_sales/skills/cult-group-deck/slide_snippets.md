# Cult Group Deck — HTML Snippets

Вставлять в `<div class="deck">`. На case/divider/about: `glow-tl` + `glow-br`.

## Cover

```html
<section class="slide slide-cover">
  <div class="glow-tl"></div>
  <div class="glow-br"></div>
  <div class="glow-center"></div>
  <span class="chrome chrome-tl">Cult Group</span>
  <span class="chrome chrome-tr">2026</span>
  <span class="chrome chrome-bl">Production</span>
  <span class="chrome chrome-br">Portfolio</span>
  <div class="cover-center">
    <img class="cover-logo" src="_assets/cult_group_logo.png" alt="Cult Group"/>
  </div>
</section>
```

## About (3 студии + сайты)

```html
<section class="slide slide-about">
  <div class="glow-tl"></div><div class="glow-br"></div>
  <!-- chrome -->
  <div class="about-inner">
    <h1 class="about-h1">Группа<br/>технологичных продакшнов</h1>
    <div class="about-rule"></div>
    <p class="about-lead">…</p>
    <div class="studios"><div class="studio-col">…</div>×3</div>
    <div class="studio-sites">
      <a class="btn" href="https://cult.team">Сайт <span class="btn-arrow">→</span></a>
      <a class="btn" href="https://blasterstudio.ru">Сайт <span class="btn-arrow">→</span></a>
      <a class="btn" href="https://sputnikfilms.ru">Сайт <span class="btn-arrow">→</span></a>
    </div>
  </div>
</section>
```

## Section divider

```html
<section class="slide slide-divider">
  <div class="glow-tl"></div><div class="glow-br"></div>
  <!-- chrome br = Section -->
  <div class="divider-center">
    <h2 class="divider-title">Рекламные ролики</h2>
    <div class="divider-meta"><span class="dot"></span>Избранные работы Cult Group · до 5 млн ₽</div>
  </div>
</section>
```

## Case — Cult/Blaster (detailed: Background / Execution)

```html
<section class="slide slide-case">
  <div class="glow-tl"></div><div class="glow-br"></div>
  <!-- chrome br = Case -->
  <div class="media">
    <a class="hero" href="{url}" target="_blank" rel="noopener"
       style="background-image:url('_assets/{slug}_hero.jpg')">
      <span class="play"></span>
    </a>
    <div class="thumbs">
      <a class="thumb" href="{url}" style="background-image:url('_assets/{slug}_t1.jpg')"></a>
      <a class="thumb" href="{url}" style="background-image:url('_assets/{slug}_t2.jpg')"></a>
    </div>
  </div>
  <div class="copy">
    <img class="case-logo case-logo--cult" src="_assets/cult_logo.png" alt="Cult"/>
    <h2 class="h2--detailed">{Client} <span class="slash">/</span> {Project}</h2>
    <!-- опционально вилка бюджета: -->
    <p class="case-price">
      <span class="case-price-label">ориентир бюджета</span>
      <span class="case-price-range">3–4 <em>млн ₽</em></span>
    </p>
    <div class="block-label">Background</div>
    <p class="block-text">…</p>
    <div class="block-label">Execution</div>
    <p class="block-text">…</p>
    <div class="btn-row"><a class="btn" href="{url}">Смотреть</a></div>
  </div>
</section>
```

## Case — Sputnik (короткий body)

```html
<div class="copy copy--sputnik">
  <img class="case-logo" src="_assets/sputnik_logo_ink.png" alt="Sputnik Films"/>
  <h2>{Title} <span class="slash">/</span> {Subtitle}</h2>
  <p class="body">…</p>
  <div class="btn-row"><a class="btn" href="{url}">Смотреть</a></div>
</div>
```

## Case — 3 кнопки (Танцы, Kiss)

```html
<div class="btn-row btn-row--three">
  <a class="btn" href="{u1}">Ролик 1</a>
  <a class="btn" href="{u2}">Ролик 2</a>
  <a class="btn" href="{u3}">Ролик 3</a>
</div>
```

## Case — 2 кнопки (Брусника, Дети)

```html
<div class="btn-row">
  <a class="btn" href="{video}">Смотреть</a>
  <a class="btn" href="{breakdown}">Breakdown</a>
</div>
```

## Media — vertical 9:16 (3 ролика)

```html
<div class="media media--vertical">
  <a class="vthumb" href="{u1}" style="background-image:url('_assets/{slug}_v1.jpeg')"><span class="play"></span></a>
  <a class="vthumb" href="{u2}" style="background-image:url('_assets/{slug}_v2.jpeg')"></a>
  <a class="vthumb" href="{u3}" style="background-image:url('_assets/{slug}_v3.jpeg')"></a>
</div>
```

## Media — grid 2×2 (Рокетбанк)

```html
<div class="media media--grid">
  <a class="gthumb" href="{u1}" style="background-image:url('_assets/rocket_1.png')"></a>
  <a class="gthumb" href="{u2}" style="background-image:url('_assets/rocket_2.png')"></a>
  <a class="gthumb" href="{u3}" style="background-image:url('_assets/rocket_3.png')"></a>
  <a class="gthumb" href="{u4}" style="background-image:url('_assets/rocket_4.png')"></a>
</div>
```

## Contacts (финал)

```html
<section class="slide slide-contacts">
  <div class="glow-tl"></div><div class="glow-br"></div>
  <!-- chrome br = Contacts -->
  <h1 class="contacts-h1">Контакты</h1>
  <p class="contacts-sub">Cult Group · Production</p>
  <!-- rules l0–l4, rows r1–r4, telegram -->
</section>
```

## HTML head (минимум)

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=1920"/>
  <title>Cult Group — {название}</title>
  <style>
    @font-face { font-family: "Unbounded"; src: url("_assets/fonts/Unbounded-Variable.ttf") format("truetype"); font-weight: 200 900; }
    @font-face { font-family: "JetBrains Mono"; src: url("_assets/fonts/JetBrainsMono-Variable.ttf") format("truetype"); font-weight: 100 800; }
    /* :root tokens + полный CSS из канона или deck_base */
    @page { size: 1920px 1080px; margin: 0; }
    @media print { * { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body><div class="deck">…</div></body>
</html>
```
