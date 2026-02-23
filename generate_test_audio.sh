#!/bin/bash
# Генерация аудиофайлов для тестовых заданий

PROJECT_DIR="/mnt/c/work08-projs/russian-spelling-test"
AUDIO_DIR="$PROJECT_DIR/audio/testing"

# Создаём директорию если не существует
mkdir -p "$AUDIO_DIR"

# Загружаем .env из корня проекта
cd "$PROJECT_DIR"
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

cd "$AUDIO_DIR"

# Массив словосочетаний и слов (фраза;слово)
# Для audioToWord заданий (6 слов для всех тестовых заданий)
declare -a words=(
    "это тестовый пример;пример"
    "быстрый тест;тест"
    "учить слова;слово"
    "простая задача;задача"
    "первый вопрос;вопрос"
    "правильный ответ;ответ"
)

total=${#words[@]}
echo "Генерация $total аудиофайлов для тестовых заданий..."
echo "Директория: $AUDIO_DIR"

count=0
for item in "${words[@]}"; do
    IFS=';' read -r phrase word <<< "$item"
    count=$((count + 1))

    echo "[$count/$total] Генерация: $word ($phrase)"

    # Формируем текст с паузами в формате Яндекса (начальное тире обязательно!)
    text="-sil<[400]> ${phrase} sil<[400]>${word}"

    # Генерируем аудио через tts.sh (используем printf и полный путь к tts.sh в WSL)
    TTS_SCRIPT="/mnt/c/work08-projs/russian-spelling-test/tts.sh"
    printf '%s' "$text" | bash "$TTS_SCRIPT" > "${word}.mp3"

    # Небольшая задержка между запросами к API
    sleep 0.2
done

echo ""
echo "Готово! Сгенерировано файлов: $(ls -1 *.mp3 2>/dev/null | wc -l)"
