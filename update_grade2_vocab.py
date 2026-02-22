# -*- coding: utf-8 -*-
import json
import csv
import sys
import random
import io

# Читаем CSV файл
csv_data = {}
with open('2grade_vocabular.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f, delimiter=';')
    for row in reader:
        if len(row) >= 3:
            word, marked_word, wrong_variants = row[0], row[1], row[2]
            csv_data[word] = {
                'marked': marked_word,
                'wrong': wrong_variants
            }

# Читаем JSON файл
with open('data/subjects/russian/dictionaries/grade2-vocabulary/index.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

updated_count = 0
skipped_words = []

# Обновляем задания
for task in data['tasks']:
    target_word = task.get('targetWord', '')

    if target_word in csv_data:
        csv_entry = csv_data[target_word]

        # Обновляем hint
        old_hint = task.get('hint', '')
        # Извлекаем слово из старого hint (оно в **)
        if '**' in old_hint:
            # Заменяем слово на форматированный вариант
            new_hint = old_hint.replace(f"**{target_word}**", f"**{csv_entry['marked']}**")
            task['hint'] = new_hint

        # Формируем letters: все буквы слова + неправильные варианты
        # Буквы слова - с учетом ударений
        word_letters = list(target_word.replace('́', ''))  # Убираем ударение для разбора на буквы
        # Добавляем неправильные варианты
        wrong_letters = list(csv_entry['wrong'])

        # Объединяем: все буквы слова + неправильные
        all_letters = word_letters + wrong_letters

        # Перемешиваем
        random.shuffle(all_letters)

        task['letters'] = all_letters
        updated_count += 1
    else:
        skipped_words.append(target_word)

# Записываем результат
with open('data/subjects/russian/dictionaries/grade2-vocabulary/index.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# Вывод результатов
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print(f"Обновлено заданий: {updated_count}")
print(f"\nСлова из JSON, не найденные в CSV:")
for word in skipped_words:
    print(f"  - {word}")
