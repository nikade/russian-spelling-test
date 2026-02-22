# -*- coding: utf-8 -*-
import json
import csv
import random
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

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

# Слова, которые уже есть в JSON
existing_words = set(task['targetWord'] for task in data['tasks'])

# Слова из CSV, которых нет в JSON
words_to_add = [word for word in csv_data.keys() if word not in existing_words]

print(f"Слов для добавления: {len(words_to_add)}")
print(f"Слова: {', '.join(words_to_add)}")

# Функция для создания задания
def create_task(word, csv_entry):
    # Формируем letters: все буквы слова + неправильные варианты
    word_letters = list(word.replace('́', ''))  # Убираем ударение
    wrong_letters = list(csv_entry['wrong'])
    all_letters = word_letters + wrong_letters
    random.shuffle(all_letters)

    return {
        "type": "audioToWord",
        "mode": "buildWord",
        "prompt": "Прослушай и собери слово",
        "audioSrc": f"audio/ru/{word}.mp3",
        "targetWord": word,
        "hint": f"**{csv_entry['marked']}** - словарное слово, необходимо запомнить написание.",
        "letters": all_letters
    }

# Добавляем новые слова в конец списка задач
added_count = 0
for word in words_to_add:
    task = create_task(word, csv_data[word])
    data['tasks'].append(task)
    added_count += 1
    print(f"  Добавлено: {word}")

# Записываем результат
with open('data/subjects/russian/dictionaries/grade2-vocabulary/index.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"\n✅ Добавлено заданий: {added_count}")
print(f"Всего заданий в файле: {len(data['tasks'])}")
