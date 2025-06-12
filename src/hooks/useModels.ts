import { useEffect, useState } from 'react';

interface Model {
  id: string;
}

export const useModels = () => {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:1234/v1/models')
      .then((res) => res.json())
      .then((data) => {
        const modelNames = (data?.data as Model[])?.map((m) => m.id) || [];
        const filteredModels = modelNames.filter(
          (name) => name !== 'text-embedding-nomic-embed-text-v1.5'
        );
        setModels(filteredModels);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Ошибка загрузки моделей');
        setLoading(false);
      });
  }, []);

  return { models, loading, error };
};
