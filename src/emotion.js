export const EMOTION_CONFIG = {
  焦虑: {
    keywords: ['乱', '焦虑', '压', '积压', '拉扯', '紧张', '忙', '赶'],
    params: { energy: 0.8, chaos: 0.9, warmth: 0.2, tension: 0.9, hope: 0.2 },
    description: '今天你的情绪长成了一株分叉的藤蔓。',
    palette: { stem: '#355d3a', leaf: '#567a4f', flower: '#7ea07a' },
  },
  开心: {
    keywords: ['开心', '阳光', '发亮', '高兴', '快乐', '轻松', '喜欢'],
    params: { energy: 0.9, chaos: 0.3, warmth: 0.9, tension: 0.2, hope: 0.8 },
    description: '今天你的情绪长成了一株向阳开花的植物。',
    palette: { stem: '#4a8f45', leaf: '#79b96d', flower: '#f7d98e' },
  },
  疲惫: {
    keywords: ['累', '疲惫', '没力气', '躺平', '休息', '不想做'],
    params: { energy: 0.2, chaos: 0.2, warmth: 0.4, tension: 0.5, hope: 0.2 },
    description: '今天你的情绪长成了一株低矮缓慢的小草木。',
    palette: { stem: '#5f7562', leaf: '#7f9780', flower: '#a8b4a6' },
  },
  平静: {
    keywords: ['平静', '安静', '呼吸', '慢慢', '草地', '夏天', '放松'],
    params: { energy: 0.4, chaos: 0.1, warmth: 0.6, tension: 0.1, hope: 0.5 },
    description: '今天你的情绪长成了一株对称舒展的植物。',
    palette: { stem: '#4f7c56', leaf: '#76a87d', flower: '#d7e8c4' },
  },
  低落: {
    keywords: ['低落', '难过', '提不起劲', '沉', '想哭', '不知道为什么'],
    params: { energy: 0.2, chaos: 0.3, warmth: 0.2, tension: 0.4, hope: 0.2 },
    description: '今天你的情绪长成了一株微微下垂的灰绿枝叶。',
    palette: { stem: '#506567', leaf: '#7f9194', flower: '#9fabb0' },
  },
};

export function detectEmotion(inputText = '') {
  const text = inputText.trim();
  if (!text) return '平静';

  let bestEmotion = '平静';
  let bestScore = -1;

  Object.entries(EMOTION_CONFIG).forEach(([emotion, config]) => {
    const score = config.keywords.reduce(
      (total, keyword) => total + (text.includes(keyword) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestEmotion = emotion;
    }
  });

  return bestScore <= 0 ? '平静' : bestEmotion;
}
