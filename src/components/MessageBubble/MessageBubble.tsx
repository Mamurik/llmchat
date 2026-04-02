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

      {/* Вывод источников для ответа AI */}
      {!isUser && message.sources && message.sources.length > 0 && (
        <div className={styles.sources}>
          <details>
            <summary>
              Контекст документа ({message.sources.length} чанка)
            </summary>
            <div className={styles.sourceList}>
              {message.sources.map((src, idx) => (
                <div key={idx} className={styles.sourceItem}>
                  <blockquote>{src}</blockquote>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
