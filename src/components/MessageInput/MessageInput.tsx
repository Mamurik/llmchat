import React from 'react';

import styles from './MessageInput.module.css';
interface Props {
  inputMessage: string;
  setInputMessage: (msg: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSendMessage: () => void;
  isLoading: boolean;
}

const MessageInput: React.FC<Props> = ({
  inputMessage,
  handleInputChange,
  handleKeyPress,
  handleSendMessage,
  isLoading,
}) => {
  return (
    <div className={styles.wrapper}>
      <textarea
        className={styles.textarea}
        value={inputMessage}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        rows={1}
        placeholder="Введите ваше сообщение..."
        disabled={isLoading}
      />
      <button
        className={styles.button}
        onClick={handleSendMessage}
        disabled={isLoading || inputMessage.trim() === ''}
      >
        {isLoading ? '...' : 'Отправить'}
      </button>
    </div>
  );
};

export default MessageInput;
