import { useEffect, useMemo, useRef } from 'react';

function createPRNG(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

const EMOTION_STYLE = {
  焦虑: {
    silhouette: 'dense-vine',
    branchBoost: 1.35,
    droop: 0.04,
    sway: 1.2,
    leafSize: 0.65,
    symmetry: 0.35,
  },
  开心: {
    silhouette: 'upright-bloom',
    branchBoost: 1,
    droop: -0.03,
    sway: 0.25,
    leafSize: 1.15,
    symmetry: 0.65,
  },
  疲惫: {
    silhouette: 'ground-spread',
    branchBoost: 0.72,
    droop: 0.09,
    sway: 0.18,
    leafSize: 0.85,
    symmetry: 0.58,
  },
  平静: {
    silhouette: 'balanced',
    branchBoost: 0.84,
    droop: 0,
    sway: 0.1,
    leafSize: 1,
    symmetry: 0.92,
  },
  低落: {
    silhouette: 'cold-droop',
    branchBoost: 0.65,
    droop: 0.13,
    sway: 0.16,
    leafSize: 0.72,
    symmetry: 0.5,
  },
};

function buildPlant({ params, width, height, emotion, seedText }) {
  const rand = createPRNG(seedText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 97));
  const style = EMOTION_STYLE[emotion] ?? EMOTION_STYLE.平静;

  const segments = [];
  const leaves = [];
  const flowers = [];

  const maxDepth = 5 + Math.round(params.energy * 3 + params.chaos * 2);
  const baseLength = 64 + params.energy * 80;
  const branchBase = Math.max(0.4, 1 + (params.chaos - 0.45) * 1.5) * style.branchBoost;
  const angleSpread = (18 + params.chaos * 28 + params.tension * 14) * (Math.PI / 180);

  const baseX = width / 2;
  const baseY = height * (emotion === '疲惫' ? 0.85 : 0.89);

  function addSegment(node, nextNode, depth, side) {
    const bend = (rand() - 0.5) * params.tension * 22;
    const cpX = (node.x + nextNode.x) / 2 + bend;
    const cpY = (node.y + nextNode.y) / 2 + (style.droop * 120 + depth * 1.4);

    segments.push({
      x1: node.x,
      y1: node.y,
      cpX,
      cpY,
      x2: nextNode.x,
      y2: nextNode.y,
      depth,
      side,
      width: Math.max(0.6, 4.4 - depth * 0.45 + params.energy * 0.8),
    });

    const leafChance = 0.1 + (0.28 - params.chaos * 0.14) + params.hope * 0.18;
    if (rand() < leafChance) {
      leaves.push({
        x: nextNode.x,
        y: nextNode.y,
        angle: nextNode.angle + (rand() - 0.5) * 0.55,
        size: (5 + rand() * 10) * style.leafSize,
        depth,
      });
    }

    if (depth >= 3) {
      const flowerChance = params.hope * 0.26 + params.warmth * 0.22;
      if (rand() < flowerChance) {
        flowers.push({
          x: nextNode.x,
          y: nextNode.y,
          size: 2.8 + rand() * 5.8,
          glow: 0.3 + rand() * 0.7,
        });
      }
    }
  }

  function grow(node, depth, side = 0) {
    if (depth > maxDepth) return;

    const tiredFlatten = emotion === '疲惫' ? 0.62 : 1;
    const depthLoss = 0.76 - depth * 0.02;
    const len = baseLength * Math.pow(depthLoss, depth) * tiredFlatten;
    if (len < 6) return;

    const jitter = (rand() - 0.5) * params.chaos * 0.24;
    const droop = style.droop * depth;
    const angle = node.angle + jitter + droop;

    const nextNode = {
      x: node.x + Math.cos(angle) * len,
      y: node.y + Math.sin(angle) * len + (emotion === '疲惫' ? depth * 2.2 : 0),
      angle,
    };

    addSegment(node, nextNode, depth, side);

    const branchCountRaw = 1 + (rand() < branchBase ? 1 : 0) + (rand() < params.chaos * 0.45 ? 1 : 0);
    const branchCount = Math.min(3, branchCountRaw);

    for (let i = 0; i < branchCount; i += 1) {
      const direction = i % 2 === 0 ? 1 : -1;
      const symmetryBlend = style.symmetry;
      const symmetricOffset = direction * angleSpread * (0.7 + i * 0.2);
      const randomOffset = (rand() - 0.5) * angleSpread * 1.35;
      const childAngle = nextNode.angle + symmetricOffset * symmetryBlend + randomOffset * (1 - symmetryBlend);

      grow({ ...nextNode, angle: childAngle }, depth + 1, direction);
    }

    if (depth <= 2 || rand() < 0.7) {
      grow({ ...nextNode, angle: nextNode.angle + (rand() - 0.5) * 0.08 }, depth + 1, 0);
    }
  }

  const rootAngle = -Math.PI / 2 + (emotion === '疲惫' ? 0.25 : 0);
  grow({ x: baseX, y: baseY, angle: rootAngle }, 0, 0);

  if (emotion === '平静') {
    const mirrored = segments
      .filter((seg) => seg.side !== 0)
      .slice(0, 120)
      .map((seg) => ({
        ...seg,
        x1: width - seg.x1,
        x2: width - seg.x2,
        cpX: width - seg.cpX,
      }));
    segments.push(...mirrored);
  }

  return { segments, leaves, flowers, style };
}

function drawInkStroke(ctx, seg, color, opacity, sway = 0) {
  ctx.save();
  ctx.strokeStyle = `${color}${opacity.toString(16).padStart(2, '0')}`;
  ctx.lineWidth = seg.width;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(seg.x1, seg.y1);
  ctx.quadraticCurveTo(seg.cpX + sway, seg.cpY, seg.x2 + sway, seg.y2);
  ctx.stroke();

  ctx.globalAlpha = 0.35;
  ctx.lineWidth = Math.max(0.4, seg.width * 0.35);
  ctx.beginPath();
  ctx.moveTo(seg.x1, seg.y1);
  ctx.quadraticCurveTo(seg.cpX + sway * 0.5, seg.cpY + 0.8, seg.x2 + sway * 0.4, seg.y2 + 0.6);
  ctx.stroke();
  ctx.restore();
}

function drawLeaf(ctx, leaf, color, progress, emotion) {
  const leafGrow = Math.min(1, progress * 1.6);
  if (leafGrow <= 0) return;

  ctx.save();
  ctx.translate(leaf.x, leaf.y);
  ctx.rotate(leaf.angle + (emotion === '低落' ? 0.25 : 0));
  ctx.scale(leafGrow, leafGrow);

  ctx.strokeStyle = color;
  ctx.fillStyle = `${color}24`;
  ctx.lineWidth = 0.85;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(leaf.size * 0.5, -leaf.size * 0.55, leaf.size * 1.4, -leaf.size * 0.12, leaf.size * 1.8, 0);
  ctx.bezierCurveTo(leaf.size * 1.2, leaf.size * 0.42, leaf.size * 0.45, leaf.size * 0.55, 0, 0);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawFlower(ctx, flower, color, progress, emotion) {
  const bloom = Math.min(1, progress * 1.8);
  if (bloom <= 0) return;

  ctx.save();
  ctx.translate(flower.x, flower.y);
  const r = flower.size * bloom;
  const petals = emotion === '开心' ? 6 : 4;

  ctx.globalAlpha = 0.45 + flower.glow * 0.35;
  for (let i = 0; i < petals; i += 1) {
    const angle = (Math.PI * 2 * i) / petals;
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.ellipse(Math.cos(angle) * r * 0.6, Math.sin(angle) * r * 0.6, r * 0.54, r * 0.34, angle, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#f6f4ea';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export default function PlantCanvas({ emotion, config, seedText, runId, onComplete }) {
  const canvasRef = useRef(null);
  const doneRef = useRef(false);

  const sceneData = useMemo(() => {
    const width = 760;
    const height = 500;
    return buildPlant({
      params: config.params,
      width,
      height,
      emotion,
      seedText: `${seedText}-${runId}`,
    });
  }, [config.params, emotion, runId, seedText]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;

    doneRef.current = false;
    let rafId;
    const start = performance.now();
    const totalMs = 7000 - config.params.energy * 2100;

    const render = (now) => {
      const elapsed = now - start;
      const p = Math.min(1, elapsed / totalMs);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // stage 1: seed
      const seedP = Math.min(1, p / 0.14);
      ctx.fillStyle = '#b8a98f';
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, canvas.height * 0.9, 4 + seedP * 4, 2.5 + seedP * 3, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // stage 2+3: stem and branches
      const branchP = Math.max(0, (p - 0.1) / 0.52);
      const maxSeg = Math.floor(sceneData.segments.length * branchP);

      for (let i = 0; i < maxSeg; i += 1) {
        const seg = sceneData.segments[i];
        const sway = sceneData.style.sway * Math.sin((elapsed + i * 29) / 165);
        drawInkStroke(ctx, seg, config.palette.stem, 175, emotion === '焦虑' ? sway : sway * 0.3);
      }

      // stage 4: leaves
      const leafP = Math.max(0, (p - 0.44) / 0.26);
      const leafCount = Math.floor(sceneData.leaves.length * leafP);
      for (let i = 0; i < leafCount; i += 1) {
        drawLeaf(ctx, sceneData.leaves[i], config.palette.leaf, leafP, emotion);
      }

      // stage 5: flowers or glow points
      const flowerAllowed = config.params.hope > 0.45 || config.params.warmth > 0.65;
      if (flowerAllowed) {
        const bloomP = Math.max(0, (p - 0.72) / 0.24);
        const flowerCount = Math.floor(sceneData.flowers.length * bloomP);
        for (let i = 0; i < flowerCount; i += 1) {
          drawFlower(ctx, sceneData.flowers[i], config.palette.flower, bloomP, emotion);
        }
      }

      if (p < 1) {
        rafId = requestAnimationFrame(render);
      } else if (!doneRef.current) {
        doneRef.current = true;
        onComplete();
      }
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [config, emotion, onComplete, sceneData]);

  return <canvas ref={canvasRef} width={760} height={500} className="plant-canvas" />;
}
