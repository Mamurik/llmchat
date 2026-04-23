import ModelSelector from '@components/ModelSelector/ModelSelector';
import React, { useEffect, useRef, useState } from 'react';

import styles from './MessageInput.module.css';

interface Props {
  inputMessage: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSendMessage: (compareModel?: string) => void;
  attachedFiles: File[];
  isFileParsing: boolean;
  indexingProgress: number;
  handleFileSelect: (file: File | null) => void;
  handleRemoveFile: (fileName: string) => void; // Добавлено
  clearAllFiles: () => void; // Добавлено
  isLoading: boolean;
  ragStrategy: 'rag' | 'full' | 'none';
  setRagStrategy: (strategy: 'rag' | 'full' | 'none') => void;
  models: string[];
  selectedModel: string;
}

const MessageInput: React.FC<Props> = ({
  inputMessage,
  handleInputChange,
  handleKeyPress,
  handleSendMessage,
  attachedFiles = [],
  isFileParsing,
  handleRemoveFile,
  clearAllFiles,
  indexingProgress,
  handleFileSelect,
  isLoading,
  ragStrategy,
  setRagStrategy,
  models = [],
  selectedModel,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [secondModel, setSecondModel] = useState('');

  // Установка второй модели по умолчанию
  useEffect(() => {
    if (models.length > 1 && !secondModel) {
      const other = models.find((m) => m !== selectedModel);
      if (other) setSecondModel(other);
    }
  }, [models, selectedModel]);

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
        <div className={styles.leftControls}>
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
        </div>

        <button
          className={`${styles.compareTrigger} ${isCompareMode ? styles.compareActive : ''}`}
          onClick={() => setIsCompareMode(!isCompareMode)}
          disabled={models.length < 2}
        >
          {isCompareMode ? '⚖️ Сравнение ВКЛ' : '⚖️ Сравнить модели'}
        </button>
      </div>

      {/* 2. ПАНЕЛЬ ВЫБОРА ВТОРОЙ МОДЕЛИ */}
      {isCompareMode && (
        <div className={styles.comparePanel}>
          <span className={styles.panelLabel}>
            Вторая модель для сравнения:
          </span>
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
            onChange={(e) => {
              handleFileSelect(e.target.files?.[0] ?? null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            disabled={isLoading || isFileParsing}
            className={styles.hiddenInput}
            ref={fileInputRef}
          />
          <label
            htmlFor="file-upload"
            className={styles.iconBtn}
            title="Добавить файл"
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
              isFileParsing ? 'Индексация базы знаний...' : 'Задайте вопрос...'
            }
            disabled={isLoading || isFileParsing}
          />

          {/* Список загруженных файлов в виде тегов */}
          {attachedFiles.length > 0 && (
            <div className={styles.fileList}>
              {attachedFiles.map((file, idx) => (
                <div key={idx} className={styles.fileTag}>
                  <span className={styles.fileName} title={file.name}>
                    {file.name}
                  </span>
                  {!isFileParsing && (
                    <button
                      className={styles.removeFile}
                      onClick={() => handleRemoveFile(file.name)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              {!isFileParsing && (
                <button className={styles.clearAll} onClick={clearAllFiles}>
                  Очистить всё
                </button>
              )}

              {isFileParsing && (
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
          {isLoading ? <div className={styles.spinner} /> : 'Отправить'}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
