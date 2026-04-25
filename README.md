# 情绪植物园 Emotion Botanical Garden

一个单页互动网页作品：输入一句心情，点击「种下植物」，画布会基于关键词情绪识别与 L-system 规则生成一株实时生长的植物动画。

## 技术栈

- React
- HTML Canvas
- CSS
- Vite

## 本地运行

```bash
npm install
npm run dev
```

## 功能说明

- 支持五类情绪：焦虑、开心、疲惫、平静、低落。
- 情绪文本通过关键词匹配识别；无法识别时默认平静。
- 情绪参数映射为生成参数（energy / chaos / warmth / tension / hope）。
- 植物分阶段生长：种子 → 主茎 → 分枝 → 叶片 → 花朵/光点。
- 点击 Reset 可清空输入并重置画布。
