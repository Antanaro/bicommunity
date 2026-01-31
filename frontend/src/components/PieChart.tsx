import React, { useState, useEffect, useRef } from 'react';

interface PieChartProps {
  size?: number;
  data: number[]; // Массив значений для секторов
  colors?: string[]; // Цвета для секторов
  className?: string;
  initialChartType?: 'pie' | 'bar' | 'line' | 'horizontalBar' | 'donut' | 'area' | 'sankey' | 'scatter' | 'bellCurve' | 'radar';
}

const VIEWBOX_SIZE = 40; // Единая система координат для всех чартов — без прыгания по размеру
const CHART_INSET = 2;   // Отступ от краёв viewBox, чтобы графики не обрезались по границе контейнера

const PieChart: React.FC<PieChartProps> = ({
  size = 40,
  data,
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  className = '',
  initialChartType = 'pie',
}) => {
  // Инициализируем состояние на основе initialChartType
  const getInitialState = () => {
    switch (initialChartType) {
      case 'bar':
        return { isBarChart: true, isLineChart: false, isHorizontalBarChart: false, isDonutChart: false, isAreaChart: false, isSankeyChart: false, isScatterChart: false, isBellCurveChart: false, isRadarChart: false };
      case 'line':
        return { isBarChart: false, isLineChart: true, isHorizontalBarChart: false, isDonutChart: false, isAreaChart: false, isSankeyChart: false, isScatterChart: false, isBellCurveChart: false, isRadarChart: false };
      case 'horizontalBar':
        return { isBarChart: false, isLineChart: false, isHorizontalBarChart: true, isDonutChart: false, isAreaChart: false, isSankeyChart: false, isScatterChart: false, isBellCurveChart: false, isRadarChart: false };
      case 'donut':
        return { isBarChart: false, isLineChart: false, isHorizontalBarChart: false, isDonutChart: true, isAreaChart: false, isSankeyChart: false, isScatterChart: false, isBellCurveChart: false, isRadarChart: false };
      case 'area':
        return { isBarChart: false, isLineChart: false, isHorizontalBarChart: false, isDonutChart: false, isAreaChart: true, isSankeyChart: false, isScatterChart: false, isBellCurveChart: false, isRadarChart: false };
      case 'sankey':
        return { isBarChart: false, isLineChart: false, isHorizontalBarChart: false, isDonutChart: false, isAreaChart: false, isSankeyChart: true, isScatterChart: false, isBellCurveChart: false, isRadarChart: false };
      case 'scatter':
        return { isBarChart: false, isLineChart: false, isHorizontalBarChart: false, isDonutChart: false, isAreaChart: false, isSankeyChart: false, isScatterChart: true, isBellCurveChart: false, isRadarChart: false };
      case 'bellCurve':
        return { isBarChart: false, isLineChart: false, isHorizontalBarChart: false, isDonutChart: false, isAreaChart: false, isSankeyChart: false, isScatterChart: false, isBellCurveChart: true, isRadarChart: false };
      case 'radar':
        return { isBarChart: false, isLineChart: false, isHorizontalBarChart: false, isDonutChart: false, isAreaChart: false, isSankeyChart: false, isScatterChart: false, isBellCurveChart: false, isRadarChart: true };
      default:
        return { isBarChart: false, isLineChart: false, isHorizontalBarChart: false, isDonutChart: false, isAreaChart: false, isSankeyChart: false, isScatterChart: false, isBellCurveChart: false, isRadarChart: false };
    }
  };

  const initialState = getInitialState();
  const [isExploded, setIsExploded] = useState(false);
  const [isBarChart, setIsBarChart] = useState(initialState.isBarChart);
  const [isLineChart, setIsLineChart] = useState(initialState.isLineChart);
  const [isHorizontalBarChart, setIsHorizontalBarChart] = useState(initialState.isHorizontalBarChart);
  const [isDonutChart, setIsDonutChart] = useState(initialState.isDonutChart);
  const [isAreaChart, setIsAreaChart] = useState(initialState.isAreaChart);
  const [isSankeyChart, setIsSankeyChart] = useState(initialState.isSankeyChart);
  const [isScatterChart, setIsScatterChart] = useState(initialState.isScatterChart);
  const [isBellCurveChart, setIsBellCurveChart] = useState(initialState.isBellCurveChart);
  const [isRadarChart, setIsRadarChart] = useState(initialState.isRadarChart);
  const [linePoints, setLinePoints] = useState<Array<Array<{x: number, y: number}>>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const total = data.reduce((sum, value) => sum + value, 0);
  
  // Генерируем случайные точки для линий при первом рендере (в едином viewBox)
  useEffect(() => {
    const generateLinePoints = () => {
      return data.map(() => {
        const points = [];
        const padding = CHART_INSET + (VIEWBOX_SIZE - 2 * CHART_INSET) * 0.08;
        const availableWidth = VIEWBOX_SIZE - 2 * padding;
        const availableHeight = VIEWBOX_SIZE - 2 * padding;
        for (let i = 0; i < 3; i++) {
          const baseX = padding + (i * availableWidth) / 2;
          const randomOffset = (Math.random() - 0.5) * (availableWidth / 6);
          points.push({
            x: baseX + randomOffset,
            y: padding + Math.random() * availableHeight,
          });
        }
        return points;
      });
    };
    setLinePoints(generateLinePoints());
  }, [data]);
  
  useEffect(() => {
    if (isExploded) {
      const timer = setTimeout(() => {
        setIsExploded(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isExploded]);

  const handleClick = () => {
    // Циклическое переключение: pie -> bar -> line -> horizontal bar -> donut -> area -> sankey -> scatter -> bellCurve -> radar -> pie
    if (!isBarChart && !isLineChart && !isHorizontalBarChart && !isDonutChart && !isAreaChart && !isSankeyChart && !isScatterChart && !isBellCurveChart && !isRadarChart) {
      setIsBarChart(true);
    } else if (isBarChart && !isLineChart && !isHorizontalBarChart && !isDonutChart && !isAreaChart && !isSankeyChart && !isScatterChart && !isBellCurveChart && !isRadarChart) {
      setIsBarChart(false);
      setIsLineChart(true);
    } else if (isLineChart && !isHorizontalBarChart && !isDonutChart && !isAreaChart && !isSankeyChart && !isScatterChart && !isBellCurveChart && !isRadarChart) {
      setIsLineChart(false);
      setIsHorizontalBarChart(true);
    } else if (isHorizontalBarChart && !isDonutChart && !isAreaChart && !isSankeyChart && !isScatterChart && !isBellCurveChart && !isRadarChart) {
      setIsHorizontalBarChart(false);
      setIsDonutChart(true);
    } else if (isDonutChart && !isAreaChart && !isSankeyChart && !isScatterChart && !isBellCurveChart && !isRadarChart) {
      setIsDonutChart(false);
      setIsAreaChart(true);
    } else if (isAreaChart && !isSankeyChart && !isScatterChart && !isBellCurveChart && !isRadarChart) {
      setIsAreaChart(false);
      setIsSankeyChart(true);
    } else if (isSankeyChart && !isScatterChart && !isBellCurveChart && !isRadarChart) {
      setIsSankeyChart(false);
      setIsScatterChart(true);
    } else if (isScatterChart && !isBellCurveChart && !isRadarChart) {
      setIsScatterChart(false);
      setIsBellCurveChart(true);
    } else if (isBellCurveChart && !isRadarChart) {
      setIsBellCurveChart(false);
      setIsRadarChart(true);
    } else if (isRadarChart) {
      setIsRadarChart(false);
    }
  };

  if (total === 0) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        preserveAspectRatio="xMidYMid meet"
        className={className}
      >
        <circle
          cx={VIEWBOX_SIZE / 2}
          cy={VIEWBOX_SIZE / 2}
          r={VIEWBOX_SIZE / 2 - CHART_INSET - 1}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="2"
        />
      </svg>
    );
  }

  const radius = VIEWBOX_SIZE / 2 - CHART_INSET - 1;
  const centerX = VIEWBOX_SIZE / 2;
  const centerY = VIEWBOX_SIZE / 2;
  let currentAngle = -90;

  // Направления для разлета в разные стороны (в радианах)
  const directions = [
    -Math.PI / 2,           // Вверх (270°)
    Math.PI / 6,            // Вправо-вверх (30°)
    (5 * Math.PI) / 6,      // Влево-вверх (150°)
  ];

  const segments = data.map((value, index) => {
    const percentage = value / total;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    // Вычисляем координаты для дуги
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    currentAngle += angle;

    // Направление разлета для этого сегмента
    const directionIndex = index % directions.length;
    const direction = directions[directionIndex];

    // Вычисляем смещение для разлета к краям экрана
    const explodeDistance = 1000;
    const translateX = isExploded ? Math.cos(direction) * explodeDistance : 0;
    const translateY = isExploded ? Math.sin(direction) * explodeDistance : 0;

    // Параметры для вертикального bar chart (в едином viewBox, с отступом от краёв)
    const innerW = VIEWBOX_SIZE - 2 * CHART_INSET;
    const innerH = VIEWBOX_SIZE - 2 * CHART_INSET;
    const barWidth = innerW / data.length;
    const barHeight = percentage * innerH;
    const barX = CHART_INSET + index * barWidth;
    const barY = VIEWBOX_SIZE - CHART_INSET - barHeight;

    // Параметры для горизонтального bar chart
    const horizontalBarHeight = innerH / data.length;
    const horizontalBarWidth = percentage * innerW;
    const horizontalBarX = CHART_INSET;
    const horizontalBarY = CHART_INSET + index * horizontalBarHeight;

    return {
      pathData,
      color: colors[index % colors.length],
      translateX,
      translateY,
      index,
      percentage,
      // Вертикальный bar chart параметры
      barWidth,
      barHeight,
      barX,
      barY,
      // Горизонтальный bar chart параметры
      horizontalBarWidth,
      horizontalBarHeight,
      horizontalBarX,
      horizontalBarY,
    };
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // Предотвращаем выделение текста
    e.stopPropagation();
  };

  return (
    <div 
      ref={containerRef}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      style={{ 
        display: 'inline-block', 
        position: 'relative',
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        overflow: 'hidden',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
      className="pie-chart-container"
    >
      {isSankeyChart ? (
        // Sankey: рандомное распределение — узлы в начале и в конце разного размера
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          className={className}
          style={{
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {(() => {
            const padding = CHART_INSET + (VIEWBOX_SIZE - 2 * CHART_INSET) * 0.06;
            const totalH = VIEWBOX_SIZE - 2 * padding;
            const leftX = padding;
            const rightX = VIEWBOX_SIZE - padding;
            const nodeWidth = 4;
            const hash = (n: number) => ((n * 2654435761) % 1000) / 1000;
            const leftRatios = segments.map((_, i) => 0.4 + hash(i) * 0.5);
            const rightRatios = segments.map((_, i) => 0.4 + hash(i + 17) * 0.5);
            const leftRaw = segments.map((s, i) => s.percentage * totalH * leftRatios[i]);
            const rightRaw = segments.map((s, i) => s.percentage * totalH * rightRatios[i]);
            const sumLeft = leftRaw.reduce((a, b) => a + b, 0);
            const sumRight = rightRaw.reduce((a, b) => a + b, 0);
            const leftHeights = leftRaw.map((h) => (totalH / sumLeft) * h);
            const rightHeights = rightRaw.map((h) => (totalH / sumRight) * h);
            let leftY = padding;
            let rightY = padding;

            return segments.map((segment, idx) => {
              const rightNodeHeight = rightHeights[idx];
              const leftNodeHeight = leftHeights[idx];
              const leftNodeY = leftY;
              const rightNodeY = rightY;
              leftY += leftNodeHeight;
              rightY += rightNodeHeight;

              const midX = VIEWBOX_SIZE / 2;
              const flowPath = `M ${rightX - nodeWidth} ${rightNodeY}
                                C ${midX} ${rightNodeY}, ${midX} ${leftNodeY}, ${leftX + nodeWidth} ${leftNodeY}
                                L ${leftX + nodeWidth} ${leftNodeY + leftNodeHeight}
                                C ${midX} ${leftNodeY + leftNodeHeight}, ${midX} ${rightNodeY + rightNodeHeight}, ${rightX - nodeWidth} ${rightNodeY + rightNodeHeight}
                                Z`;

              return (
                <g key={segment.index}>
                  {/* Левый узел (приёмник) — крупнее */}
                  <rect
                    x={leftX}
                    y={leftNodeY}
                    width={nodeWidth}
                    height={leftNodeHeight}
                    fill={segment.color}
                    style={{
                      transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />
                  <path
                    d={flowPath}
                    fill={segment.color}
                    opacity="0.6"
                    style={{
                      transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />
                  {/* Правый узел (источник 100%) — мельче */}
                  <rect
                    x={rightX - nodeWidth}
                    y={rightNodeY}
                    width={nodeWidth}
                    height={rightNodeHeight}
                    fill={segment.color}
                    style={{
                      transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />
                </g>
              );
            });
          })()}
        </svg>
      ) : isScatterChart ? (
        // Scatter plot: 9 точек (3 на цвет), по осям, разный размер
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          className={className}
          style={{
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {(() => {
            const pad = CHART_INSET + (VIEWBOX_SIZE - 2 * CHART_INSET) * 0.1;
            const W = VIEWBOX_SIZE - 2 * pad;
            const H = VIEWBOX_SIZE - 2 * pad;
            // По 3 точки на каждый из 3 цветов — всего 9. Расположены по осям, разный радиус
            const scatterPoints: Array<{ x: number; y: number; r: number; color: string }> = [];
            const colorSet = colors.slice(0, 3);
            const positions = [
              [pad + W * 0.2, pad + H * 0.3], [pad + W * 0.5, pad + H * 0.2], [pad + W * 0.75, pad + H * 0.4],
              [pad + W * 0.25, pad + H * 0.6], [pad + W * 0.55, pad + H * 0.7], [pad + W * 0.8, pad + H * 0.55],
              [pad + W * 0.15, pad + H * 0.85], [pad + W * 0.45, pad + H * 0.8], [pad + W * 0.7, pad + H * 0.9],
            ];
            const radii = [1.2, 2.2, 2.8, 1.8, 2.5, 1.5, 2.0, 2.6, 1.4];
            positions.forEach(([x, y], i) => {
              scatterPoints.push({
                x, y,
                r: radii[i],
                color: colorSet[i % 3],
              });
            });
            return scatterPoints.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill={p.color}
                style={{
                  transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />
            ));
          })()}
        </svg>
      ) : isBellCurveChart ? (
        // Bell Curve: три полупрозрачных колокола
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          className={className}
          style={{
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {(() => {
            const pad = CHART_INSET + (VIEWBOX_SIZE - 2 * CHART_INSET) * 0.06;
            const W = VIEWBOX_SIZE - 2 * pad;
            const H = VIEWBOX_SIZE - 2 * pad;
            const bellCurves = [
              { color: colors[0], mu: 0.3, sigma: 0.12, scale: 0.85 },
              { color: colors[1], mu: 0.55, sigma: 0.14, scale: 0.9 },
              { color: colors[2], mu: 0.75, sigma: 0.1, scale: 0.75 },
            ];
            const steps = 40;
            return bellCurves.map((bell, bi) => {
              const pathD: string[] = [];
              for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const x = pad + t * W;
                const g = Math.exp(-Math.pow(t - bell.mu, 2) / (2 * bell.sigma * bell.sigma));
                const y = pad + H - g * H * bell.scale;
                pathD.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
              }
              pathD.push(`L ${pad + W} ${pad + H} L ${pad} ${pad + H} Z`);
              return (
                <path
                  key={bi}
                  d={pathD.join(' ')}
                  fill={bell.color}
                  opacity={0.45}
                  style={{
                    transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                />
              );
            });
          })()}
        </svg>
      ) : isRadarChart ? (
        // Радар: выпуклый пятиугольник (не обязательно правильный) — углы и радиусы произвольные, вершины по порядку угла
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          className={className}
          preserveAspectRatio="xMidYMid meet"
          style={{
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {(() => {
            const cx = VIEWBOX_SIZE / 2;
            const cy = VIEWBOX_SIZE / 2;
            const Rmin = CHART_INSET + (VIEWBOX_SIZE / 2 - CHART_INSET) * 0.2;
            const Rmax = VIEWBOX_SIZE / 2 - CHART_INSET - 1;
            const hash = (n: number) => ((n * 2654435761) % 1000) / 1000;
            const numSeries = 3;
            const numVertices = 5;
            return Array.from({ length: numSeries }, (_, seriesIndex) => {
              // 5 вершин: угол и радиус (произвольные) — сортируем по углу → выпуклый пятиугольник
              const raw = Array.from({ length: numVertices }, (_, i) => {
                const angle = hash(seriesIndex * 19 + i * 7) * 2 * Math.PI; // произвольный угол
                const r = Rmin + hash(seriesIndex * 31 + i * 13) * (Rmax - Rmin); // произвольный радиус
                return { angle, r };
              });
              raw.sort((a, b) => a.angle - b.angle);
              const points = raw.map(({ angle, r }) => ({
                x: cx + r * Math.cos(angle),
                y: cy + r * Math.sin(angle),
              }));
              const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
              return (
                <g key={seriesIndex}>
                  <path
                    d={d}
                    fill="none"
                    stroke={colors[seriesIndex % colors.length]}
                    strokeWidth="1.2"
                    style={{
                      transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />
                  {points.map((p, pi) => (
                    <circle
                      key={pi}
                      cx={p.x}
                      cy={p.y}
                      r="1.2"
                      fill={colors[seriesIndex % colors.length]}
                      style={{
                        transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    />
                  ))}
                </g>
              );
            });
          })()}
        </svg>
      ) : isAreaChart ? (
        // Area chart — стакнутый, 100% в каждой точке, вписан в размер
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          className={className}
          style={{
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {(() => {
            const pad = CHART_INSET + (VIEWBOX_SIZE - 2 * CHART_INSET) * 0.06;
            const H = VIEWBOX_SIZE - 2 * pad;
            const bottomY = VIEWBOX_SIZE - pad;
            const raw: number[][] = segments.map((_, i) => {
              const pts = linePoints[i] || [];
              return pts.length === 3
                ? [Math.max(0, bottomY - pts[0].y), Math.max(0, bottomY - pts[1].y), Math.max(0, bottomY - pts[2].y)]
                : [0, 0, 0];
            });
            const values: number[][] = raw.map((row) => [...row]);
            for (let j = 0; j < 3; j++) {
              const sumJ = values.reduce((s, row) => s + (row[j] ?? 0), 0);
              if (sumJ > 0) {
                for (let i = 0; i < values.length; i++) {
                  values[i][j] = (values[i][j] / sumJ) * H;
                }
              }
            }
            const cum: number[][] = [];
            for (let j = 0; j < 3; j++) {
              cum[j] = [0];
              let s = 0;
              for (let i = 0; i < segments.length; i++) {
                s += values[i][j] ?? 0;
                cum[j].push(s);
              }
            }
            const basePoints = linePoints[0]?.length === 3 ? linePoints[0] : [{ x: pad, y: bottomY }, { x: VIEWBOX_SIZE / 2, y: pad + H / 2 }, { x: VIEWBOX_SIZE - pad, y: pad }];
            const x0 = basePoints[0].x, x1 = basePoints[1].x, x2 = basePoints[2].x;
            return segments.map((segment, index) => {
              if ((linePoints[index] || []).length < 3) return null;
              const top0 = bottomY - cum[0][index + 1], top1 = bottomY - cum[1][index + 1], top2 = bottomY - cum[2][index + 1];
              const bot0 = bottomY - cum[0][index], bot1 = bottomY - cum[1][index], bot2 = bottomY - cum[2][index];
              const areaPath = `M ${x0} ${bot0} L ${x0} ${top0} L ${x1} ${top1} L ${x2} ${top2} L ${x2} ${bot2} L ${x1} ${bot1} L ${x0} ${bot0} Z`;
              const linePath = `M ${x0} ${top0} L ${x1} ${top1} L ${x2} ${top2}`;
              return (
                <g key={segment.index}>
                  <path
                    d={areaPath}
                    fill={segment.color}
                    opacity="0.4"
                    style={{
                      transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />
                  <path
                    d={linePath}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="1.5"
                    style={{
                      transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />
                  {[top0, top1, top2].map((y, pointIndex) => (
                    <circle
                      key={pointIndex}
                      cx={[x0, x1, x2][pointIndex]}
                      cy={y}
                      r="1.8"
                      fill={segment.color}
                      style={{
                        transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    />
                  ))}
                </g>
              );
            });
          })()}
        </svg>
      ) : isDonutChart ? (
        // Donut chart режим
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          className={className}
          style={{
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {(() => {
            let currentAngle = -90; // Начинаем с верхней точки
            return segments.map((segment) => {
              const percentage = segment.percentage;
              const angle = percentage * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              currentAngle += angle;

              const innerRadius = CHART_INSET + (VIEWBOX_SIZE / 2 - CHART_INSET) * 0.35;
              const outerRadius = VIEWBOX_SIZE / 2 - CHART_INSET - 1;

              const startAngleRad = (startAngle * Math.PI) / 180;
              const endAngleRad = (endAngle * Math.PI) / 180;

              const x1Inner = centerX + innerRadius * Math.cos(startAngleRad);
              const y1Inner = centerY + innerRadius * Math.sin(startAngleRad);
              const x2Inner = centerX + innerRadius * Math.cos(endAngleRad);
              const y2Inner = centerY + innerRadius * Math.sin(endAngleRad);

              const x1Outer = centerX + outerRadius * Math.cos(startAngleRad);
              const y1Outer = centerY + outerRadius * Math.sin(startAngleRad);
              const x2Outer = centerX + outerRadius * Math.cos(endAngleRad);
              const y2Outer = centerY + outerRadius * Math.sin(endAngleRad);

              const largeArcFlag = angle > 180 ? 1 : 0;

              const pathData = [
                `M ${x1Inner} ${y1Inner}`,
                `L ${x1Outer} ${y1Outer}`,
                `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer}`,
                `L ${x2Inner} ${y2Inner}`,
                `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1Inner} ${y1Inner}`,
                'Z',
              ].join(' ');

              return (
                <path
                  key={segment.index}
                  d={pathData}
                  fill={segment.color}
                  style={{
                    transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                />
              );
            });
          })()}
        </svg>
      ) : isHorizontalBarChart ? (
        // Горизонтальный bar chart режим
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          className={className}
          style={{
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {segments.map((segment) => (
            <rect
              key={segment.index}
              x={segment.horizontalBarX}
              y={segment.horizontalBarY}
              width={segment.horizontalBarWidth}
              height={segment.horizontalBarHeight - 2}
              fill={segment.color}
              rx="2"
              style={{
                transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transformOrigin: 'left center',
              }}
            />
          ))}
        </svg>
      ) : isLineChart ? (
        // Line chart режим
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          className={className}
          style={{
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {segments.map((segment, index) => {
            const points = linePoints[index] || [];
            if (points.length === 0) return null;
            
            // Создаем path для линии через три точки
            const pathData = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y}`;
            
            return (
              <g key={segment.index}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="2"
                  style={{
                    transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                />
                {points.map((point, pointIndex) => (
                  <circle
                    key={pointIndex}
                    cx={point.x}
                    cy={point.y}
                    r="2"
                    fill={segment.color}
                    style={{
                      transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      ) : isBarChart ? (
        // Bar chart режим
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          className={className}
          style={{
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {segments.map((segment) => (
            <rect
              key={segment.index}
              x={segment.barX}
              y={segment.barY}
              width={segment.barWidth - 2}
              height={segment.barHeight}
              fill={segment.color}
              rx="2"
              style={{
                transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transformOrigin: 'bottom center',
              }}
            />
          ))}
        </svg>
      ) : (
        // Pie chart режим (с возможностью разлета)
        <>
          {segments.map((segment) => (
            <svg
              key={segment.index}
              width={size}
              height={size}
              viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
              preserveAspectRatio="xMidYMid meet"
              className={className}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: `translate(${segment.translateX}px, ${segment.translateY}px)`,
                transformOrigin: 'center center',
                transition: isExploded 
                  ? 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' 
                  : 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                pointerEvents: 'none',
                overflow: 'visible',
              }}
            >
              <path
                d={segment.pathData}
                fill={segment.color}
                className={`pie-segment pie-segment-${segment.index}`}
              />
            </svg>
          ))}
        </>
      )}
    </div>
  );
};

export default PieChart;
