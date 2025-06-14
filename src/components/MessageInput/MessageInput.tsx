import React, { useRef } from 'react';

import styles from './MessageInput.module.css';

interface Props {
  inputMessage: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSendMessage: () => void;
  attachedFile: File | null;
  isFileParsing: boolean;
  handleFileSelect: (file: File | null) => void;
  isLoading: boolean;
}

const MessageInput: React.FC<Props> = ({
  inputMessage,
  handleInputChange,
  handleKeyPress,
  handleSendMessage,
  attachedFile,
  isFileParsing,
  handleFileSelect,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onRemoveFile = () => {
    handleFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.wrapper}>
      <textarea
        className={styles.textarea}
        value={inputMessage}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        rows={1}
        placeholder="Введите ваше сообщение..."
        disabled={isLoading || isFileParsing}
      />

      <div className={styles.fileInputWrapper}>
        <input
          id="file-upload"
          type="file"
          accept=".txt,.doc,.docx,.xls,.xlsx,.pdf"
          onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
          disabled={isLoading || isFileParsing}
          className={styles.hiddenFileInput}
          ref={fileInputRef}
        />
        <label
          htmlFor="file-upload"
          className={styles.fileLabel}
          title="Прикрепить файл"
        >
          📎
        </label>
      </div>

      {attachedFile && (
        <div className={styles.attachment}>
          <span>{attachedFile.name}</span>
          {isFileParsing ? (
            <span className={styles.spinner} />
          ) : (
            <button
              className={styles.remove}
              onClick={onRemoveFile}
              type="button"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <button
        className={styles.button}
        onClick={handleSendMessage}
        disabled={
          isLoading || isFileParsing || (!inputMessage.trim() && !attachedFile)
        }
        type="button"
      >
        {isLoading ? '...' : 'Отправить'}
      </button>
    </div>
  );
};

export default MessageInput;
