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

## Загрузка фото в Yandex Object Storage / CDN

Скрипт `scripts/yc-upload` заливает изображения из локальной папки в бакет Object Storage (origin для CDN) с дозагрузкой и ретраями. Подробности: [scripts/yc-upload/README.md](scripts/yc-upload/README.md).

```bash
copy scripts\yc-upload\env.example scripts\yc-upload\env.local
# заполните YC_ACCESS_KEY_ID, YC_SECRET_ACCESS_KEY, YC_BUCKET
npm run upload:yc -- --dry-run
npm run upload:yc
```

## Деплой

При пуше в `main` GitHub Actions собирает сайт и публикует его на GitHub Pages:

https://shappoff.github.io/catalogarchivesgov/

В настройках репозитория: **Settings → Pages → Source: GitHub Actions**.
