@echo off
echo === Настройка локального Python-окружения для RemLogo ===
echo.

cd /d %~dp0

echo Создаем виртуальное окружение .venv на базе Python 3.10...
py -3.10 -m venv .venv

echo.
echo Обновляем pip в локальном окружении...
call .venv\Scripts\python.exe -m pip install --upgrade pip

echo.
echo Устанавливаем зависимости из requirements.txt...
call .venv\Scripts\pip.exe install -r requirements.txt

echo.
echo === Готово! ===
echo Локальное окружение py-rembg\.venv настроено.
echo.

pause