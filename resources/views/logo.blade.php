<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Редактор логотипа</title>

    {{-- CSRF для JS --}}
    <meta name="csrf-token" content="{{ csrf_token() }}">

    {{-- Tailwind CDN --}}
    <script src="https://cdn.tailwindcss.com"></script>

    {{-- Cropper.js --}}
    <link rel="stylesheet" href="https://unpkg.com/cropperjs@1.6.2/dist/cropper.min.css">
    <script src="https://unpkg.com/cropperjs@1.6.2/dist/cropper.min.js"></script>

    <style>
        #rawImage,
        #preview,
        #resultImage {
            max-width: 100%;
            max-height: 400px;
        }

        #preview,
        #resultImage {
            display: none;
        }
    </style>
</head>

<body class="bg-slate-900 text-slate-100 min-h-screen">
<div
    id="logo-editor-root"
    class="min-h-screen flex items-center justify-center px-4 py-8"
    data-remove-url="{{ url('/remove-bg') }}"
    data-straighten-url="{{ url('/straighten') }}"
>
    <div class="w-full max-w-5xl bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700 p-4 sm:p-6 lg:p-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
                <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight">Редактор логотипа</h1>
                <p class="text-sm text-slate-300 mt-1">
                    Можно просто удалить фон или сначала выровнять перспективу.
                </p>
            </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
            {{-- Левая колонка --}}
            <div class="space-y-5">
                {{-- Шаг 1: загрузка --}}
                <div>
                    <label class="block text-sm font-medium text-slate-200 mb-2">
                        1. Загрузите изображение
                    </label>
                    <label
                        class="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-slate-800/60 transition">
                        <div class="text-center">
                            <div class="text-sm font-medium">
                                Нажмите, чтобы выбрать файл
                            </div>
                            <div class="text-xs text-slate-400 mt-1">
                                JPG, PNG или WEBP
                            </div>
                        </div>
                        <input type="file" id="fileInput" accept="image/*" class="hidden">
                    </label>
                </div>

                {{-- Шаг 2: выравнивание (можно пропустить) --}}
                <div>
                    <div class="flex items-center justify-between mb-2 gap-2">
                        <label class="block text-sm font-medium text-slate-200">
                            2. Отметьте 4 угла логотипа (опционально)
                        </label>
                        <button
                            id="skipWarpBtn"
                            type="button"
                            class="text-xs px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed">
                            Пропустить выравнивание
                        </button>
                    </div>

                    <div id="rawContainer"
                         class="relative w-full bg-slate-900/60 rounded-xl border border-slate-700 flex items-center justify-center overflow-hidden min-h-[200px]">

                        <img id="rawImage" src="" alt="Оригинальное изображение"
                             class="hidden select-none">

                        {{-- SVG-оверлей для точек и линий --}}
                        <svg id="rawOverlay"
                             class="absolute inset-0 hidden pointer-events-none"
                             xmlns="http://www.w3.org/2000/svg">
                            <polyline id="rawPolyline"
                                      fill="none"
                                      stroke="rgb(129, 140, 248)"
                                      stroke-width="2"
                                      stroke-linecap="round"
                                      stroke-linejoin="round"/>
                            <g id="rawPointsLayer"></g>
                        </svg>

                        <span id="rawPlaceholder" class="text-xs text-slate-500 px-3 text-center">
                            При желании выпрямить логотип: кликните по 4 углам (по часовой стрелке).
                            Иначе нажмите «Пропустить выравнивание».
                        </span>
                    </div>

                    <div class="flex items-center justify-between mt-2">
                        <p id="pointsInfo" class="text-xs text-slate-400">
                            Точек выбрано: 0 / 4
                        </p>
                        <div class="flex gap-2">
                            <button
                                id="resetPointsBtn"
                                type="button"
                                class="text-xs px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                                disabled>
                                Сбросить точки
                            </button>
                        </div>
                    </div>
                </div>

                {{-- Шаг 3: кадрирование --}}
                <div>
                    <label class="block text-sm font-medium text-slate-200 mb-2">
                        3. Поверните и кадрируйте логотип
                    </label>
                    <div class="w-full bg-slate-900/60 rounded-xl border border-slate-700 flex items-center justify-center overflow-hidden min-h-[200px]">
                        <img id="preview" src="" alt="Предпросмотр для кадрирования">
                        <span id="previewPlaceholder" class="text-xs text-slate-500 px-3 text-center">
                            Загрузите изображение и либо выровняйте логотип, либо пропустите этот шаг.
                        </span>
                    </div>
                    <div class="flex flex-wrap gap-2 mt-3">
                        <button
                            id="rotateLeft"
                            type="button"
                            disabled
                            class="inline-flex items-center justify-center px-3 py-2 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition">
                            ← Повернуть -90°
                        </button>
                        <button
                            id="rotateRight"
                            type="button"
                            disabled
                            class="inline-flex items-center justify-center px-3 py-2 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition">
                            Повернуть +90° →
                        </button>
                        <button
                            id="sendBtn"
                            type="button"
                            disabled
                            class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition">
                            Удалить фон
                        </button>
                    </div>
                    <p id="statusText" class="text-xs text-slate-400 mt-2"></p>
                </div>
            </div>

            {{-- Правая колонка: результат --}}
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-200 mb-2">
                        4. Результат
                    </label>
                    <div class="w-full bg-slate-900/60 rounded-xl border border-slate-700 flex items-center justify-center overflow-hidden min-h-[200px]">
                        <img id="resultImage" alt="Результат">
                        <span id="resultPlaceholder" class="text-xs text-slate-500">
                            Здесь появится логотип без фона.
                        </span>
                    </div>
                </div>

                <div class="flex flex-wrap gap-3">
                    <a
                        id="downloadLink"
                        download="logo_no_bg.png"
                        class="hidden inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 transition cursor-pointer">
                        Скачать PNG
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>

@vite('resources/js/logo-editor.js')
</body>
</html>
