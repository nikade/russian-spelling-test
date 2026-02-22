# -*- coding: utf-8 -*-
import json
import csv
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Читаем CSV
csv_words = set()
with open('2grade_vocabular.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f, delimiter=';')
    for row in reader:
        if len(row) >= 1:
            csv_words.add(row[0])

# Читаем JSON
with open('data/subjects/russian/dictionaries/grade2-vocabulary/index.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

json_words = set(t['targetWord'] for t in data['tasks'])

# Слова в CSV, но не в JSON
only_in_csv = csv_words - json_words
# Слова в JSON, но не в CSV
only_in_json = json_words - csv_words

print(f"Всего слов в CSV: {len(csv_words)}")
print(f"Всего слов в JSON: {len(json_words)}")
print(f"Общих слов: {len(csv_words & json_words)}")

print(f"\nСлова в CSV, но не в JSON ({len(only_in_csv)}):")
for word in sorted(only_in_csv):
    print(f"  - {word}")

print(f"\nСлова в JSON, но не в CSV ({len(only_in_json)}):")
for word in sorted(only_in_json):
    print(f"  - {word}")
