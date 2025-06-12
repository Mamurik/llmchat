import { LLMMessage } from '@types';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import styles from './MessageBubble.module.css';

const MessageBubble: React.FC<{ message: LLMMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`${styles.bubble} ${isUser ? styles.user : styles.ai}`}>
      <strong>{isUser ? 'Вы' : `AI (${message.model})`}</strong>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {message.content}
      </ReactMarkdown>
    </div>
  );
};

export default MessageBubble;
