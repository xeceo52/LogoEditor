document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('logo-editor-root');
    if (!root) return;

    const removeUrl = root.dataset.removeUrl;
    const straightenUrl = root.dataset.straightenUrl;
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    let cropper = null;
    let cornerPoints = [];      // координаты в пикселях исходного изображения
    let screenPoints = [];      // координаты внутри контейнера (для SVG)
    let originalFile = null;
    let originalDataUrl = null;
    let draggingIndex = null;   // индекс перетаскиваемой точки

    const fileInput          = document.getElementById('fileInput');

    const rawContainer       = document.getElementById('rawContainer');
    const rawImg             = document.getElementById('rawImage');
    const rawOverlay         = document.getElementById('rawOverlay');
    const rawPolyline        = document.getElementById('rawPolyline');
    const rawPointsLayer     = document.getElementById('rawPointsLayer');
    const rawPlaceholder     = document.getElementById('rawPlaceholder');

    const pointsInfo         = document.getElementById('pointsInfo');
    const resetPointsBtn     = document.getElementById('resetPointsBtn');
    const skipWarpBtn        = document.getElementById('skipWarpBtn');

    const preview            = document.getElementById('preview');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    const btnLeft            = document.getElementById('rotateLeft');
    const btnRight           = document.getElementById('rotateRight');
    const sendBtn            = document.getElementById('sendBtn');

    const resultImg          = document.getElementById('resultImage');
    const resultPlaceholder  = document.getElementById('resultPlaceholder');
    const downloadLink       = document.getElementById('downloadLink');
    const statusText         = document.getElementById('statusText');

    // --- Вспомогательные функции ---

    function resetAllPoints() {
        cornerPoints = [];
        screenPoints = [];
        pointsInfo.textContent = 'Точек выбрано: 0 / 4';
        resetPointsBtn.disabled = false;
        draggingIndex = null;

        rawPointsLayer.innerHTML = '';
        rawPolyline.setAttribute('points', '');
    }

    function resetPreview() {
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        preview.src = '';
        preview.style.display = 'none';
        previewPlaceholder.style.display = 'block';

        btnLeft.disabled = true;
        btnRight.disabled = true;
        sendBtn.disabled = true;
    }

    function resetResult() {
        resultImg.style.display = 'none';
        resultImg.src = '';
        resultPlaceholder.style.display = 'block';
        downloadLink.classList.add('hidden');
    }

    function renderOverlay() {
        rawPointsLayer.innerHTML = '';

        const ns = 'http://www.w3.org/2000/svg';

        screenPoints.forEach(([sx, sy], index) => {
            const circle = document.createElementNS(ns, 'circle');
            circle.setAttribute('cx', sx);
            circle.setAttribute('cy', sy);
            circle.setAttribute('r', 6);
            circle.setAttribute('fill', 'rgb(129, 140, 248)');
            circle.setAttribute('stroke', 'white');
            circle.setAttribute('stroke-width', '1.5');
            circle.dataset.index = index.toString();
            circle.style.cursor = 'move';
            circle.style.pointerEvents = 'auto';

            circle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                draggingIndex = parseInt(circle.dataset.index, 10);
            });

            const text = document.createElementNS(ns, 'text');
            text.setAttribute('x', sx);
            text.setAttribute('y', sy + 3);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '9');
            text.setAttribute('fill', 'black');
            text.textContent = (index + 1).toString();

            rawPointsLayer.appendChild(circle);
            rawPointsLayer.appendChild(text);
        });

        // поли-линия
        if (screenPoints.length === 0) {
            rawPolyline.setAttribute('points', '');
        } else {
            let pts = screenPoints.map(([sx, sy]) => `${sx},${sy}`).join(' ');
            if (screenPoints.length === 4) {
                const [sx0, sy0] = screenPoints[0];
                pts += ` ${sx0},${sy0}`;
            }
            rawPolyline.setAttribute('points', pts);
        }
    }

    function sendForStraighten() {
        const formData = new FormData();
        formData.append('image', originalFile);
        formData.append('points', JSON.stringify(cornerPoints));

        fetch(straightenUrl, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRF-TOKEN': csrfToken
            }
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error('Ошибка при выпрямлении логотипа');
                }
                return res.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);

                preview.src = url;
                preview.style.display = 'block';
                previewPlaceholder.style.display = 'none';

                rawImg.classList.add('hidden');

                if (cropper) cropper.destroy();
                cropper = new Cropper(preview, {
                    viewMode: 1,
                    autoCropArea: 1,
                    responsive: true,
                });

                btnLeft.disabled = false;
                btnRight.disabled = false;
                sendBtn.disabled = false;

                statusText.textContent = 'Кадрируйте логотип и нажмите «Удалить фон».';
            })
            .catch(err => {
                console.error(err);
                statusText.textContent = 'Ошибка: ' + err.message;
            });
    }

    // --- Шаг 1: загрузка ---

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;

        originalFile = file;
        resetAllPoints();
        resetResult();
        resetPreview();

        statusText.textContent = 'Можно выровнять логотип по 4 точкам или сразу перейти к кадрированию.';

        const reader = new FileReader();
        reader.onload = (e) => {
            originalDataUrl = e.target.result;
            rawImg.src = originalDataUrl;
            rawImg.classList.remove('hidden');
            rawPlaceholder.style.display = 'none';
            rawOverlay.classList.remove('hidden');

            setTimeout(() => {
                const contRect = rawContainer.getBoundingClientRect();
                rawOverlay.setAttribute('viewBox', `0 0 ${contRect.width} ${contRect.height}`);
            }, 0);
        };
        reader.readAsDataURL(file);
    });

    // --- Сброс точек ---
    resetPointsBtn.addEventListener('click', () => {
        resetAllPoints();
        statusText.textContent = 'Точки сброшены. Кликните по углам логотипа ещё раз.';
    });

    // --- Клик по изображению: добавление точек ---
    rawImg.addEventListener('click', (e) => {
        if (!rawImg.src || !originalFile) return;
        if (cornerPoints.length >= 4) return;

        const contRect = rawContainer.getBoundingClientRect();
        const imgRect  = rawImg.getBoundingClientRect();

        // координаты в контейнере (для SVG)
        const sx = e.clientX - contRect.left;
        const sy = e.clientY - contRect.top;

        // координаты относительно картинки (для Python)
        const relX = e.clientX - imgRect.left;
        const relY = e.clientY - imgRect.top;
        const scaleX = rawImg.naturalWidth / imgRect.width;
        const scaleY = rawImg.naturalHeight / imgRect.height;

        const x = relX * scaleX;
        const y = relY * scaleY;

        cornerPoints.push([x, y]);
        screenPoints.push([sx, sy]);

        renderOverlay();
        pointsInfo.textContent = 'Точек выбрано: ' + cornerPoints.length + ' / 4';

        if (cornerPoints.length === 4) {
            statusText.textContent = 'Выпрямляем логотип...';
            sendForStraighten();
        }
    });

    // --- Перетаскивание точек ---
    rawOverlay.addEventListener('mousemove', (e) => {
        if (draggingIndex === null) return;
        if (!rawImg.src) return;

        const contRect = rawContainer.getBoundingClientRect();
        const imgRect  = rawImg.getBoundingClientRect();

        const sx = e.clientX - contRect.left;
        const sy = e.clientY - contRect.top;

        screenPoints[draggingIndex] = [sx, sy];

        const relX = e.clientX - imgRect.left;
        const relY = e.clientY - imgRect.top;
        const scaleX = rawImg.naturalWidth / imgRect.width;
        const scaleY = rawImg.naturalHeight / imgRect.height;
        const x = relX * scaleX;
        const y = relY * scaleY;
        cornerPoints[draggingIndex] = [x, y];

        renderOverlay();
    });

    window.addEventListener('mouseup', () => {
        draggingIndex = null;
    });

    // --- Пропустить выравнивание ---
    skipWarpBtn.addEventListener('click', () => {
        if (!originalDataUrl) {
            statusText.textContent = 'Сначала загрузите изображение.';
            return;
        }

        resetAllPoints();

        preview.src = originalDataUrl;
        preview.style.display = 'block';
        previewPlaceholder.style.display = 'none';

        if (cropper) cropper.destroy();
        cropper = new Cropper(preview, {
            viewMode: 1,
            autoCropArea: 1,
            responsive: true,
        });

        btnLeft.disabled = false;
        btnRight.disabled = false;
        sendBtn.disabled = false;

        statusText.textContent = 'Кадрируйте логотип и нажмите «Удалить фон».';
    });

    // --- Поворот ---
    btnLeft.addEventListener('click', () => {
        if (!cropper) return;
        cropper.rotate(-90);
    });

    btnRight.addEventListener('click', () => {
        if (!cropper) return;
        cropper.rotate(90);
    });

    // --- Удаление фона ---
    sendBtn.addEventListener('click', () => {
        if (!cropper) return;

        sendBtn.disabled = true;
        sendBtn.textContent = 'Обработка...';
        statusText.textContent = 'Удаляем фон, подождите...';

        cropper.getCroppedCanvas().toBlob((blob) => {
            const formData = new FormData();
            formData.append('image', blob, 'crop.png');

            fetch(removeUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-TOKEN': csrfToken
                }
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Ошибка сервера при удалении фона');
                    }
                    return response.blob();
                })
                .then(blob => {
                    const url = URL.createObjectURL(blob);

                    resultPlaceholder.style.display = 'none';
                    resultImg.src = url;
                    resultImg.style.display = 'block';

                    downloadLink.href = url;
                    downloadLink.classList.remove('hidden');

                    statusText.textContent = 'Готово! Можете скачать результат.';
                })
                .catch(err => {
                    console.error(err);
                    statusText.textContent = 'Ошибка: ' + err.message;
                })
                .finally(() => {
                    sendBtn.disabled = false;
                    sendBtn.textContent = 'Удалить фон';
                });

        }, 'image/png');
    });
});
