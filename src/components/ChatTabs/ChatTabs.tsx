import ModelSelector from '@components/ModelSelector/ModelSelector';
import React, { useState } from 'react';

import styles from './ChatTabs.module.css';

interface Chat {
  id: string;
  title: string;
  model: string;
}

interface Props {
  chats: Chat[];
  activeChatId: string;
  onNewChat: (model: string) => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  models: string[];
  disabled?: boolean;
}

const ChatTabs: React.FC<Props> = ({
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  models,
  disabled = false,
}) => {
  const [creating, setCreating] = useState(false);
  const [selectedModel, setSelectedModel] = useState(models[0] || '');

  const startCreating = () => {
    if (disabled) return;
    setCreating(true);
    if (models.length > 0) setSelectedModel(models[0]);
  };

  const confirmCreate = () => {
    if (!selectedModel) return;
    onNewChat(selectedModel);
    setCreating(false);
  };

  const cancelCreate = () => {
    setCreating(false);
  };

  return (
    <div className={styles.tabs}>
      {chats.map((chat) => (
        <div key={chat.id} className={styles.tabWrapper}>
          <button
            onClick={() => !disabled && onSelectChat(chat.id)}
            disabled={disabled}
            className={`${styles.tab} ${chat.id === activeChatId ? styles.active : ''}`}
            title={`Чат: ${chat.title}, модель: ${chat.model}`}
          >
            {chat.title} ({chat.model})
          </button>
          <button
            onClick={() => !disabled && onDeleteChat(chat.id)}
            disabled={disabled}
            className={styles.closeBtn}
            title="Удалить чат"
          >
            ×
          </button>
        </div>
      ))}

      {!creating && (
        <button
          onClick={startCreating}
          disabled={disabled}
          className={styles.newTab}
        >
          + Новый чат
        </button>
      )}

      {creating && (
        <div className={styles.newChatCreation}>
          <ModelSelector
            models={models}
            selectedModel={selectedModel}
            onChange={setSelectedModel}
          />
          <button
            onClick={confirmCreate}
            disabled={!selectedModel}
            className={styles.createBtn}
          >
            Создать
          </button>
          <button onClick={cancelCreate} className={styles.cancelBtn}>
            Отмена
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatTabs;
