import React from 'react';

import styles from './ModelSelector.module.css';

interface Props {
  models: string[];
  selectedModel: string;
  onChange: (model: string) => void;
}

const ModelSelector: React.FC<Props> = ({
  models,
  selectedModel,
  onChange,
}) => (
  <div className={styles.wrapper}>
    <label htmlFor="model" className={styles.label}>
      Модель:
    </label>
    <select
      id="model"
      value={selectedModel}
      onChange={(e) => onChange(e.target.value)}
      className={styles.select}
    >
      {models.map((model) => (
        <option key={model} value={model}>
          {model}
        </option>
      ))}
    </select>
  </div>
);

export default ModelSelector;
