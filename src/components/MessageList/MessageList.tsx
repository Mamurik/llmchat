import MessageBubble from '@components/MessageBubble/MessageBubble';
import { LLMMessage } from '@types';
import React from 'react';

import styles from './MessageList.module.css';

interface Props {
  messages: LLMMessage[];
  refEnd: React.RefObject<HTMLDivElement | null>;
}

const MessageList: React.FC<Props> = ({ messages, refEnd }) => {
  return (
    <div className={styles.list}>
      {messages.length === 0 && (
        <div className={styles.empty}>
          Начните диалог, отправив сообщение...
        </div>
      )}
      {messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} />
      ))}
      <div ref={refEnd} />
    </div>
  );
};

export default MessageList;
