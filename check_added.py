# -*- coding: utf-8 -*-
import json
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('data/subjects/russian/dictionaries/grade2-vocabulary/index.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Проверяем добавленные слова
test_words = ['Москва', 'воробей', 'карандаш', 'хорошо']

for word in test_words:
    tasks = [t for t in data['tasks'] if t['targetWord'] == word]
    if tasks:
        task = tasks[0]
        print(f"\nСлово: {word}")
        print(f"  hint: {task['hint']}")
        print(f"  letters: {task['letters']}")
