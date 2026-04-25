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

## PR 合并失败排查（“合并不了 PR”）

如果 GitHub 提示无法合并，通常是目标分支有新提交导致冲突。可以在本地这样处理：

```bash
# 1) 拉取最新主分支
git fetch origin

# 2) 在你的工作分支上 rebase 到最新 main
git rebase origin/main

# 3) 如果有冲突，修复后继续
git add <冲突文件>
git rebase --continue

# 4) rebase 完成后强推当前分支
git push --force-with-lease
```

如果不想 rebase，也可以合并 main：

```bash
git fetch origin
git merge origin/main
git push
```

然后回到 PR 页面刷新，一般就可以合并。
