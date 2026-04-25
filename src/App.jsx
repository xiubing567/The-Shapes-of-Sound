import { useMemo, useState } from 'react';
import PlantCanvas from './PlantCanvas';
import { detectEmotion, EMOTION_CONFIG } from './emotion';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [activeEmotion, setActiveEmotion] = useState('平静');
  const [isGrowing, setIsGrowing] = useState(false);
  const [resultText, setResultText] = useState('');
  const [runId, setRunId] = useState(0);

  const config = useMemo(() => EMOTION_CONFIG[activeEmotion], [activeEmotion]);

  const handlePlant = () => {
    const emotion = detectEmotion(inputText);
    setActiveEmotion(emotion);
    setResultText('');
    setIsGrowing(true);
    setRunId((prev) => prev + 1);
  };

  const handleReset = () => {
    setInputText('');
    setResultText('');
    setActiveEmotion('平静');
    setIsGrowing(false);
    setRunId((prev) => prev + 1);
  };

  const handleComplete = () => {
    setIsGrowing(false);
    setResultText(EMOTION_CONFIG[activeEmotion].description);
  };

  return (
    <div className="page">
      <header className="hero">
        <h1>情绪植物园</h1>
        <p>写下今天的感受，把它种下来。</p>
      </header>

      <section className="controls">
        <textarea
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          placeholder="你今天感觉怎么样？"
          rows={4}
        />

        <div className="button-row">
          <button type="button" onClick={handlePlant} disabled={isGrowing}>
            {isGrowing ? '生长中...' : '种下植物'}
          </button>
          <button type="button" className="secondary" onClick={handleReset}>
            Reset
          </button>
        </div>
      </section>

      <section className="canvas-panel">
        <PlantCanvas
          emotion={activeEmotion}
          config={config}
          seedText={inputText || activeEmotion}
          runId={runId}
          onComplete={handleComplete}
        />
      </section>

      <footer className="result-text">
        {resultText || `当前花圃：${activeEmotion} · 植物正在等待你的心情。`}
      </footer>
    </div>
  );
}
