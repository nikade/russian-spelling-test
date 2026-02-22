# -*- coding: utf-8 -*-
import re
from pathlib import Path

# Правила для неправильных вариантов (в одну сторону для каждой буквы)
WRONG_VARIANTS = {
    # Гласные (созвучные пары)
    'а': 'о',
    'е': 'и',
    'ё': 'о',
    'и': 'ы',
    'о': 'а',
    'у': 'ю',
    'ы': 'и',
    'э': 'е',
    'ю': 'у',
    'я': 'а',
    # Согласные (парные по глухости/звонкости - звонкая -> глухая)
    'б': 'п',
    'в': 'ф',
    'г': 'к',
    'д': 'т',
    'ж': 'ш',
    'з': 'с',
}

def get_wrong_variant(letter: str):
    """Возвращает неправильный вариант для буквы или None если нельзя подобрать"""
    letter_lower = letter.lower()
    return WRONG_VARIANTS.get(letter_lower)

def process_file(input_file: str, output_file: str):
    """Обрабатывает файл и добавляет столбец с неправильными вариантами"""
    input_path = Path(input_file)
    skipped_words = []
    no_orthogram_words = []

    with open(input_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    result_lines = []
    for line in lines:
        line = line.rstrip('\n')
        if not line.strip():
            result_lines.append(line)
            continue

        parts = line.split(';')
        if len(parts) < 2:
            result_lines.append(line)
            continue

        word, marked_word = parts[0], parts[1]

        # Находим все орфограммы (буквы внутри !! и __)
        # Поддерживает удвоенные согласные: !!бб!! или __сс__
        matches = re.findall(r'!!([а-яёА-ЯЁ]+)!!|__([а-яёА-ЯЁ]+)__', marked_word)
        # Разворачиваем группы букв в отдельные символы
        all_letters = []
        for m in matches:
            # m - это кортеж (group1, group2), где одна из групп пустая
            letters = m[0] if m[0] else m[1]
            all_letters.extend(list(letters))
        matches = all_letters

        if not matches:
            # Нет орфограмм - оставляем как есть
            result_lines.append(line)
            no_orthogram_words.append(word)
            continue

        # Собираем неправильные варианты
        wrong_variants = []

        for letter in matches:
            wrong = get_wrong_variant(letter)
            if wrong is not None:
                wrong_variants.append(wrong)
            # Если wrong is None - просто пропускаем эту букву, не всё слово

        if not wrong_variants:
            # Не удалось подобрать ни одного неправильного варианта
            skipped_words.append(f"{word} ({', '.join(matches)})")
            result_lines.append(line)
        else:
            # Добавляем столбец с неправильными вариантами
            wrong_column = ''.join(wrong_variants)
            if len(parts) >= 3:
                # Уже есть третий столбец - заменяем
                parts[2] = wrong_column
                result_lines.append(';'.join(parts[:3]))
            else:
                # Добавляем новый столбец
                result_lines.append(f"{word};{marked_word};{wrong_column}")

    # Записываем результат
    with open(output_file, 'w', encoding='utf-8') as f:
        for line in result_lines:
            f.write(line + '\n')

    return skipped_words, no_orthogram_words

if __name__ == '__main__':
    input_file = '2grade_vocabular.csv'
    output_file = '2grade_vocabular.csv'

    skipped, no_ortho = process_file(input_file, output_file)

    # Вывод в UTF-8
    import sys
    import io
    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    print(f"Обработка завершена!")
    print(f"\nПропущенные слова (нет неправильного варианта для всех орфограмм):")
    if skipped:
        for word in skipped:
            print(f"  - {word}")
    else:
        print("  Нет пропущенных слов")

    print(f"\nСлова без орфограмм: {len(no_ortho)}")
