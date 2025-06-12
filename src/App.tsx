import ChatLayout from '@components/ChatLayout/ChatLayout';
import { useModels } from '@hooks/useModels';
import { ChatSession, LLMMessage } from '@types';
import React, { useEffect, useState } from 'react';

const MAX_CHATS = 5;
const DEFAULT_MODEL = 'qwen/qwen3-4b';
const LOCAL_STORAGE_CHATS_KEY = 'chatApp_chats';
const LOCAL_STORAGE_ACTIVE_CHAT_KEY = 'chatApp_activeChatId';

const App: React.FC = () => {
  // Сначала пытаемся загрузить из localStorage
  const [chats, setChats] = useState<ChatSession[]>(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_CHATS_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as ChatSession[];
      } catch {
        // игнорируем ошибку парсинга
      }
    }
    // Если нет сохранённых чатов — дефолтный чат
    return [
      { id: 'chat-1', title: 'Чат 1', messages: [], model: DEFAULT_MODEL },
    ];
  });

  const [activeChatId, setActiveChatId] = useState<string>(() => {
    const storedId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_CHAT_KEY);
    if (storedId) return storedId;
    return chats[0].id;
  });

  const [isLoading, setIsLoading] = useState(false);
  const { models, loading: modelsLoading } = useModels();

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_CHATS_KEY, JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_CHAT_KEY, activeChatId);
  }, [activeChatId]);

  const handleNewChat = (model: string) => {
    if (isLoading) return;
    if (chats.length >= MAX_CHATS) {
      alert('Можно создать не более 5 чатов.');
      return;
    }
    if (!model) {
      alert('Выберите модель.');
      return;
    }

    const id = `chat-${Date.now()}`;
    const newChat: ChatSession = {
      id,
      title: `Чат ${chats.length + 1}`,
      messages: [],
      model,
    };

    setChats((prev) => [...prev, newChat]);
    setActiveChatId(id);
  };

  const updateChatMessages = (id: string, messages: LLMMessage[]) => {
    setChats((prev) =>
      prev.map((chat) => (chat.id === id ? { ...chat, messages } : chat))
    );
  };

  const handleDeleteChat = (id: string) => {
    if (isLoading) return;
    if (chats.length === 1) return;
    setChats((prev) => prev.filter((chat) => chat.id !== id));

    if (activeChatId === id) {
      const remaining = chats.filter((chat) => chat.id !== id);
      if (remaining.length > 0) setActiveChatId(remaining[0].id);
    }
  };

  const handleSelectChat = (id: string) => {
    if (isLoading) return;
    setActiveChatId(id);
  };

  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? chats[0];

  return (
    <ChatLayout
      chats={chats}
      activeChatId={activeChatId}
      onNewChat={handleNewChat}
      onSelectChat={handleSelectChat}
      onDeleteChat={handleDeleteChat}
      onUpdateMessages={updateChatMessages}
      onLoadingChange={setIsLoading}
      disabled={isLoading || modelsLoading}
      models={models}
      selectedModel={activeChat.model}
    />
  );
};

export default App;
