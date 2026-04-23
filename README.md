# Программное средство для автоматизации процессов контекстного поиска и анализа информации (RAG System)

Дипломный проект, представляющий собой интеллектуальную систему на базе нейросетевых моделей с применением метода **Retrieval-Augmented Generation (RAG)**. Система позволяет загружать пользовательские документы, индексировать их в локальном векторном хранилище и проводить глубокий анализ данных через диалоговый интерфейс с использованием LLM.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![WASM](https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white)

## 🌟 Ключевые возможности

- **Multi-document RAG**: Загрузка и одновременный анализ нескольких файлов форматов `.pdf`, `.docx`, `.xlsx`, `.txt`.
- **Векторный поиск на стороне клиента**: Использование библиотеки **Voy (WASM)** для мгновенного поиска релевантных фрагментов текста без передачи данных на сервер.
- **Side-by-Side Comparison**: Режим сравнения ответов двух разных моделей в реальном времени для оценки качества генерации.
- **Persistent Cache**: Кэширование векторов и эмбеддингов в **IndexedDB**, что исключает необходимость повторной обработки документов после перезагрузки страницы.
- **Расширенные настройки LLM**: Управление параметрами генерации (`Temperature`, `Top-P`, `System Prompt`) для каждой чат-сессии.
- **Интерактивные источники**: Ссылки на конкретные фрагменты документов (цитирование), на основе которых был сформирован ответ.

## 🛠 Технологический стек

- **Frontend**: React 18, TypeScript, Vite.
- **NLP & RAG**:
  - **Voy**: Высокопроизводительный движок векторного поиска (WebAssembly).
  - **LM Studio / OpenAI API**: Бэкенд для работы с локальными или облачными LLM.
  - **Nomic Embeddings**: Модель для создания векторных представлений текста.
  - **Parsing**:
  - `pdfjs-dist`: Извлечение текста из PDF.
  - `mammoth`: Обработка DOCX.
  - `xlsx`: Парсинг табличных данных.
- **Storage**: IndexedDB (для хранения эмбеддингов документов).

## 🚀 Быстрый старт

### 1. Требования

- Установленный [Node.js](https://nodejs.org/) (v18+).
- Запущенный локальный сервер моделей (рекомендуется [LM Studio](https://lmstudio.ai/)).

### 2. Настройка LM Studio

Для корректной работы системы в LM Studio должны быть запущены:

1. **Embedding Model**: `nomic-embed-text-v1.5` (на порту 1234).
2. **Inference Model**: Любая LLM (например, `Llama-3`, `Qwen-2` или `Gemma`).
3. Включен параметр **CORS** в настройках сервера.

### 3. Установка и запуск

```bash
# Клонировать репозиторий
git clone https://github.com/Mamurik/llmchat.git

# Перейти в папку проекта
cd llmchat

# Установить зависимости
npm install

# Запустить проект в режиме разработки
npm run dev
```
