# catalogarchivesgov

Next.js SSG-сайт с деплоем на GitHub Pages.

## Локальная разработка

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Сборка

Локально без префикса:

```bash
npm run build
```

С префиксом как на GitHub Pages:

```bash
BASE_PATH=/catalogarchivesgov npm run build
```

Статика попадает в `out/`. Предпросмотр:

```bash
npm run preview
```

## Деплой

При пуше в `main` GitHub Actions собирает сайт и публикует его на GitHub Pages:

https://shappoff.github.io/catalogarchivesgov/

В настройках репозитория: **Settings → Pages → Source: GitHub Actions**.
