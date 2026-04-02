import MessageInput from '@components/MessageInput/MessageInput';
import MessageList from '@components/MessageList/MessageList';
import { useChat } from '@hooks/useChat';
import { LLMMessage } from '@types';
import React, { useEffect, useState } from 'react';

import styles from './Chat.module.css';

interface Props {
  chatId: string;
  initialMessages: LLMMessage[];
  onUpdateMessages: (messages: LLMMessage[]) => void;
  onLoadingChange?: (loading: boolean) => void;
  selectedModel: string;
  models: string[]; // <-- Добавляем это
}

const Chat: React.FC<Props> = ({
  chatId,
  initialMessages,
  onUpdateMessages,
  onLoadingChange,
  selectedModel,
  models, // <-- Получаем из ChatLayout
}) => {
  const [localMessages, setLocalMessages] =
    useState<LLMMessage[]>(initialMessages);

  useEffect(() => {
    setLocalMessages(initialMessages);
  }, [chatId]);

  useEffect(() => {
    onUpdateMessages(localMessages);
  }, [localMessages]);

  const chat = useChat(localMessages, setLocalMessages, selectedModel);

  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(chat.isLoading);
    }
  }, [chat.isLoading, onLoadingChange]);

  return (
    <div className={styles.wrapper}>
      <MessageList messages={chat.messages} refEnd={chat.messagesEndRef} />
      {chat.isLoading && <p className={styles.loading}>AI думает...</p>}
      {chat.error && <p className={styles.error}>Ошибка: {chat.error}</p>}

      {/* Передаем все нужные пропсы в MessageInput */}
      <MessageInput {...chat} models={models} selectedModel={selectedModel} />
    </div>
  );
};

export default Chat;
