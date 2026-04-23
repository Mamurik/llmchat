import { Citation } from '@types';
import React, { useState } from 'react';

import styles from './SourceDisplay.module.css';

interface Props {
  citations: Citation[];
}

const SourceDisplay: React.FC<Props> = ({ citations }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!citations || citations.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.toggle}
        type="button"
      >
        {isOpen
          ? '🔽 Скрыть источники'
          : `▶ Показать источники (${citations.length})`}
      </button>

      {isOpen && (
        <div className={styles.list}>
          {citations.map((c, i) => (
            <div key={i} className={styles.item}>
              <div className={styles.sourceName}>Источник: {c.source}</div>
              <div className={styles.sourceText}>«{c.text}»</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SourceDisplay;
