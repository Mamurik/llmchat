import ModelSelector from '@components/ModelSelector/ModelSelector';
import { LLMSettings } from '@types';
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
  onNewChat: (model: string, settings: LLMSettings) => void; // Добавили settings
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

  // Состояние настроек для нового чата
  const [settings, setSettings] = useState<LLMSettings>({
    temperature: 0.7,
    topP: 1.0,
    topK: 40,
    systemPrompt:
      'Ты — полезный ассистент. Отвечай кратко и используй Markdown.',
  });

  const startCreating = () => {
    if (disabled) return;
    setCreating(true);
    if (models.length > 0) setSelectedModel(models[0]);
  };

  const confirmCreate = () => {
    if (!selectedModel) return;
    onNewChat(selectedModel, settings);
    setCreating(false);
  };

  const cancelCreate = () => {
    setCreating(false);
  };

  return (
    <div className={styles.tabs}>
      {/* Список существующих чатов */}
      <div className={styles.chatList}>
        {chats.map((chat) => (
          <div key={chat.id} className={styles.tabWrapper}>
            <button
              onClick={() => !disabled && onSelectChat(chat.id)}
              disabled={disabled}
              className={`${styles.tab} ${chat.id === activeChatId ? styles.active : ''}`}
              title={`Чат: ${chat.title}, модель: ${chat.model}`}
            >
              <span className={styles.chatTitle}>{chat.title}</span>
              <span className={styles.modelName}>
                {chat.model.split('/').pop()}
              </span>
            </button>
            <button
              onClick={() => !disabled && onDeleteChat(chat.id)}
              disabled={disabled}
              className={styles.closeBtn}
            >
              ×
            </button>
          </div>
        ))}
      </div>

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
          <h3 className={styles.configTitle}>Настройка сессии</h3>

          <ModelSelector
            models={models}
            selectedModel={selectedModel}
            onChange={setSelectedModel}
          />

          <div className={styles.settingsGroup}>
            <div className={styles.field}>
              <label>Системный промпт (Role):</label>
              <textarea
                className={styles.systemTextarea}
                value={settings.systemPrompt}
                onChange={(e) =>
                  setSettings({ ...settings, systemPrompt: e.target.value })
                }
                placeholder="Например: Ты эксперт по технической документации..."
              />
            </div>

            <div className={styles.sliderBox}>
              <div className={styles.sliderLabel}>
                <span>Temperature</span>
                <span className={styles.val}>{settings.temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.temperature}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    temperature: parseFloat(e.target.value),
                  })
                }
              />
            </div>

            <div className={styles.sliderBox}>
              <div className={styles.sliderLabel}>
                <span>Top-P</span>
                <span className={styles.val}>{settings.topP}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.topP}
                onChange={(e) =>
                  setSettings({ ...settings, topP: parseFloat(e.target.value) })
                }
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button onClick={confirmCreate} className={styles.createBtn}>
              Создать чат
            </button>
            <button onClick={cancelCreate} className={styles.cancelBtn}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatTabs;
