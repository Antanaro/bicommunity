import React, { useState, useEffect, useRef } from 'react';

interface PieChartProps {
  size?: number;
  data: number[]; // Массив значений для секторов
  colors?: string[]; // Цвета для секторов
  className?: string;
}

const PieChart: React.FC<PieChartProps> = ({
  size = 40,
  data,
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  className = '',
}) => {
  const [isExploded, setIsExploded] = useState(false);
  const [isBarChart, setIsBarChart] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const total = data.reduce((sum, value) => sum + value, 0);
  
  useEffect(() => {
    if (isExploded) {
      const timer = setTimeout(() => {
        setIsExploded(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isExploded]);

  const handleClick = () => {
    if (isBarChart) {
      // Если уже bar chart, возвращаемся к pie
      setIsBarChart(false);
    } else {
      // Переключаемся на bar chart
      setIsBarChart(true);
    }
  };

  if (total === 0) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        className={className}
      >
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="2"
        />
      </svg>
    );
  }

  const radius = 18;
  const centerX = 20;
  const centerY = 20;
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

    // Параметры для bar chart
    const barWidth = size / data.length;
    const barHeight = (percentage * size);
    const barX = index * barWidth;
    const barY = size - barHeight;

    return {
      pathData,
      color: colors[index % colors.length],
      translateX,
      translateY,
      index,
      percentage,
      // Bar chart параметры
      barWidth,
      barHeight,
      barX,
      barY,
    };
  });

  return (
    <div 
      ref={containerRef}
      onClick={handleClick} 
      style={{ 
        display: 'inline-block', 
        position: 'relative',
        width: size,
        height: size,
        overflow: 'visible',
        cursor: 'pointer',
      }}
      className="pie-chart-container"
    >
      {isBarChart ? (
        // Bar chart режим
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
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
              viewBox="0 0 40 40"
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
