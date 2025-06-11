import React, { useEffect, useRef, useState } from 'react'

// --- Настройка API для LM Studio ---
// Базовый URL вашего LM Studio сервера.
// Пожалуйста, убедитесь, что ваш LM Studio запущен и доступен по этому адресу.
const BASE_URL = 'http://127.0.0.1:1234/v1/'

// Определение типа для сообщения LLM
interface LLMMessage {
	role: 'user' | 'assistant' | 'system'
	content: string
}

// Определение типа для ответа LLM, основанное на структуре ответа OpenAI-совместимого API
interface LLMCompletionResponse {
	id: string
	object: string
	created: number
	model: string
	choices: Array<{
		index: number
		message: LLMMessage
		finish_reason: string
	}>
	usage: {
		prompt_tokens: number
		completion_tokens: number
		total_tokens: number
	}
}

// --- Основной компонент App ---
const App: React.FC = () => {
	const [messages, setMessages] = useState<LLMMessage[]>([])
	const [inputMessage, setInputMessage] = useState<string>('')
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [error, setError] = useState<string | null>(null)

	const messagesEndRef = useRef<HTMLDivElement>(null) // Ссылка для прокрутки чата

	// Эффект для автоматической прокрутки к последнему сообщению
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	// Обработчик изменения текста в поле ввода
	const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInputMessage(e.target.value)
	}

	/**
	 * Функция для удаления блоков <think>...</think> из ответа AI.
	 * @param text Исходный текст ответа AI.
	 * @returns Текст ответа без блоков <think>.
	 */
	const filterAssistantResponse = (text: string): string => {
		// Используем регулярное выражение для поиска и удаления всего между <think> и </think> (включая сами теги)
		// Флаг 's' (dotAll) позволяет '.' соответствовать символам новой строки.
		// Флаг 'g' (global) для замены всех вхождений.
		const filteredText = text.replace(/<think>.*?<\/think>/gs, '').trim()
		return filteredText
	}

	// Обработчик отправки сообщения
	const handleSendMessage = async () => {
		if (inputMessage.trim() === '') return

		const userMessage: LLMMessage = {
			role: 'user',
			content: inputMessage.trim(),
		}
		// Обновляем состояние сообщений немедленно
		setMessages(prevMessages => [...prevMessages, userMessage])

		// Очищаем поле ввода
		setInputMessage('')
		setIsLoading(true) // Устанавливаем состояние загрузки
		setError(null) // Сбрасываем ошибку

		try {
			// Создаем полный список сообщений для отправки, включая опциональное системное сообщение.
			// Важно: 'messages' здесь - это *текущее* состояние `messages` из предыдущего рендера,
			// плюс только что отправленное сообщение пользователя.
			// Для корректной истории чата в LLM, нужно использовать `messages` из текущего замыкания
			// и добавить к нему `userMessage`.

			const currentMessagesToSend = [...messages] // Сообщения до текущего userMessage

			// Добавляем опциональное системное сообщение, если история чата пуста.
			// Это может помочь некоторым LLM, которые ожидают начальный контекст.
			if (currentMessagesToSend.length === 0) {
				currentMessagesToSend.unshift({
					role: 'system',
					content:
						'Вы — полезный ассистент, который старается быть максимально полезным.',
				})
			}

			// Добавляем текущее сообщение пользователя в список для отправки
			currentMessagesToSend.push(userMessage)

			const requestBody = {
				model: 'Qwen/Qwen1.5-4B-Chat-GGUF', // Убедитесь, что это имя вашей модели в LM Studio
				messages: currentMessagesToSend,
				temperature: 0.7,
				max_tokens: 500,
			}

			// console.log('Отправка запроса в LM Studio:', requestBody); // Отладочная информация, убрана

			const response = await fetch(`${BASE_URL}chat/completions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
			})

			if (!response.ok) {
				const errorData = await response.json()
				const serverErrorMessage =
					errorData.error?.message || response.statusText
				throw new Error(`LM Studio вернул ошибку: ${serverErrorMessage}`)
			}

			const data: LLMCompletionResponse = await response.json()

			// Извлекаем ответ от ассистента и фильтруем его
			const rawAssistantResponseContent = data.choices[0].message.content
			const filteredAssistantResponseContent = filterAssistantResponse(
				rawAssistantResponseContent
			)

			const assistantMessage: LLMMessage = {
				role: 'assistant',
				content: filteredAssistantResponseContent,
			}

			// Обновляем состояние сообщений, добавляя ответ ассистента
			setMessages(prevMessages => [...prevMessages, assistantMessage])
		} catch (err) {
			console.error('Не удалось отправить сообщение:', err)
			let errorMessage = 'Неизвестная ошибка.'
			if (err instanceof Error) {
				errorMessage = err.message
			} else if (typeof err === 'object' && err !== null) {
				errorMessage = JSON.stringify(err)
			}
			setError(errorMessage)
			// Добавляем сообщение об ошибке в чат для пользователя
			setMessages(prevMessages => [
				...prevMessages,
				{
					role: 'assistant',
					content: `Ошибка: Не удалось получить ответ от LLM. ${errorMessage}`,
				},
			])
		} finally {
			setIsLoading(false) // Завершаем состояние загрузки
		}
	}

	// Обработчик нажатия Enter для отправки сообщения
	const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault() // Предотвращаем перенос строки
			handleSendMessage()
		}
	}

	return (
		<div>
			{/* Tailwind CSS CDN для базового стиля */}
			<script src='https://cdn.tailwindcss.com'></script>
			{/* Используем шрифт Inter */}
			<link
				href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
				rel='stylesheet'
			/>
			<style>
				{`
        body { font-family: 'Inter', sans-serif; }
        /* Пользовательские стили для прокрутки (можно настроить) */
        .message-area::-webkit-scrollbar {
            width: 8px;
        }
        .message-area::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
        }
        .message-area::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 10px;
        }
        .message-area::-webkit-scrollbar-thumb:hover {
            background: #555;
        }
        `}
			</style>

			<div className='flex flex-col h-screen bg-gray-100 p-4 font-inter'>
				{/* Заголовок */}
				<h1 className='text-3xl font-bold text-center text-blue-800 mb-6 rounded-lg p-3 bg-white shadow-md'>
					Простейший AI Чат
				</h1>

				{/* Область для сообщений */}
				<div className='flex-1 overflow-y-auto bg-white p-6 rounded-lg shadow-inner mb-4 flex flex-col space-y-4 message-area'>
					{messages.length === 0 && (
						<div className='text-center text-gray-500 italic mt-auto'>
							Начните диалог, отправив сообщение...
						</div>
					)}
					{messages.map((msg, index) => (
						<div
							key={index}
							className={`p-3 rounded-lg max-w-lg shadow-sm ${
								msg.role === 'user'
									? 'bg-blue-500 text-white self-end rounded-br-none'
									: 'bg-gray-200 text-gray-800 self-start rounded-tl-none'
							}`}
						>
							<p className='font-semibold mb-1'>
								{msg.role === 'user' ? 'Вы' : 'AI'}
							</p>
							<p className='whitespace-pre-wrap'>{msg.content}</p>
						</div>
					))}
					<div ref={messagesEndRef} /> {/* Пустой div для прокрутки */}
				</div>

				{/* Индикатор загрузки */}
				{isLoading && (
					<div className='text-center text-blue-600 font-semibold mb-2'>
						AI думает...
					</div>
				)}

				{/* Индикатор ошибки */}
				{error && (
					<div className='text-center text-red-600 font-semibold mb-2'>
						Ошибка: {error}
					</div>
				)}

				{/* Область ввода сообщения */}
				<div className='flex items-center space-x-3 p-3 bg-white rounded-lg shadow-md'>
					<textarea
						className='flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-14 overflow-hidden'
						value={inputMessage}
						onChange={handleInputChange}
						onKeyPress={handleKeyPress}
						placeholder='Введите ваше сообщение...'
						rows={1}
						disabled={isLoading}
					/>
					<button
						onClick={handleSendMessage}
						className='px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed'
						disabled={isLoading || inputMessage.trim() === ''}
					>
						{isLoading ? 'Отправка...' : 'Отправить'}
					</button>
				</div>
			</div>
		</div>
	)
}

export default App
