import ModelSelector from '@components/ModelSelector/ModelSelector';
import React, { useEffect, useRef, useState } from 'react';

import styles from './MessageInput.module.css';

interface Props {
  inputMessage: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSendMessage: (compareModel?: string) => void;
  attachedFiles: File[]; // Теперь массив
  isFileParsing: boolean;
  indexingProgress: number;
  handleFileSelect: (file: File | null) => void;
  isLoading: boolean;
  ragStrategy: 'rag' | 'full' | 'none';
  setRagStrategy: (strategy: 'rag' | 'full' | 'none') => void;
  models: string[]; // Список всех моделей
  selectedModel: string; // Текущая активная модель
}

const MessageInput: React.FC<Props> = ({
  inputMessage,
  handleInputChange,
  handleKeyPress,
  handleSendMessage,
  attachedFiles = [],
  isFileParsing,
  indexingProgress,
  handleFileSelect,
  isLoading,
  ragStrategy,
  setRagStrategy,
  models = [],
  selectedModel,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Состояния для режима сравнения
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [secondModel, setSecondModel] = useState('');

  // Устанавливаем вторую модель по умолчанию (отличную от первой)
  useEffect(() => {
    if (models.length > 1 && !secondModel) {
      const other = models.find((m) => m !== selectedModel);
      if (other) setSecondModel(other);
    }
  }, [models, selectedModel]);

  const onClearFiles = () => {
    handleFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = () => {
    if (isCompareMode && secondModel) {
      handleSendMessage(secondModel);
    } else {
      handleSendMessage();
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. ПАНЕЛЬ НАСТРОЕК (RAG + СРАВНЕНИЕ) */}
      <div className={styles.topControls}>
        {attachedFiles.length > 0 && !isFileParsing && (
          <div className={styles.strategyGroup}>
            <span className={styles.label}>Метод:</span>
            <button
              className={`${styles.toggleBtn} ${ragStrategy === 'rag' ? styles.active : ''}`}
              onClick={() => setRagStrategy('rag')}
            >
              🎯 RAG
            </button>
            <button
              className={`${styles.toggleBtn} ${ragStrategy === 'full' ? styles.active : ''}`}
              onClick={() => setRagStrategy('full')}
            >
              📄 Full
            </button>
          </div>
        )}

        <button
          className={`${styles.compareTrigger} ${isCompareMode ? styles.compareActive : ''}`}
          onClick={() => setIsCompareMode(!isCompareMode)}
          disabled={models.length < 2}
        >
          {isCompareMode ? '⚖️ Режим сравнения ВКЛ' : '⚖️ Сравнить модели'}
        </button>
      </div>

      {/* 2. ПАНЕЛЬ ВЫБОРА ВТОРОЙ МОДЕЛИ (Выпадает при сравнении) */}
      {isCompareMode && (
        <div className={styles.comparePanel}>
          <span className={styles.panelLabel}>Вторая модель для анализа:</span>
          <ModelSelector
            models={models.filter((m) => m !== selectedModel)}
            selectedModel={secondModel}
            onChange={setSecondModel}
          />
        </div>
      )}

      {/* 3. ОСНОВНОЙ БЛОК ВВОДА */}
      <div className={styles.inputWrapper}>
        <div className={styles.fileButton}>
          <input
            id="file-upload"
            type="file"
            accept=".txt,.doc,.docx,.xls,.xlsx,.pdf"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            disabled={isLoading || isFileParsing}
            className={styles.hiddenInput}
            ref={fileInputRef}
          />
          <label
            htmlFor="file-upload"
            className={styles.iconBtn}
            title="Добавить документ"
          >
            📎
          </label>
        </div>

        <div className={styles.textAreaContainer}>
          <textarea
            className={styles.textarea}
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            rows={1}
            placeholder={
              isFileParsing
                ? 'Индексация базы знаний...'
                : 'Задайте вопрос по документам...'
            }
            disabled={isLoading || isFileParsing}
          />

          {/* Список загруженных файлов */}
          {attachedFiles.length > 0 && (
            <div className={styles.fileList}>
              {attachedFiles.map((file, idx) => (
                <div key={idx} className={styles.fileTag}>
                  <span className={styles.fileName}>{file.name}</span>
                </div>
              ))}
              {isFileParsing ? (
                <div className={styles.indexingBox}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${indexingProgress}%` }}
                    />
                  </div>
                  <span className={styles.progressText}>
                    {indexingProgress}%
                  </span>
                </div>
              ) : (
                <button className={styles.clearAll} onClick={onClearFiles}>
                  Очистить всё
                </button>
              )}
            </div>
          )}
        </div>

        <button
          className={`${styles.sendButton} ${isCompareMode ? styles.sendCompare : ''}`}
          onClick={handleSend}
          disabled={
            isLoading ||
            isFileParsing ||
            (!inputMessage.trim() && attachedFiles.length === 0)
          }
        >
          {isLoading ? (
            <div className={styles.spinner} />
          ) : isCompareMode ? (
            'Отправить обоим'
          ) : (
            'Отправить'
          )}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
