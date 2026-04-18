'use client';

import React, { useState } from 'react';
import { KostengruppeTyp, BUDGET_KATEGORIE_CONFIG, ExtendedBudgetUebersicht } from '@/types';
import { formatWaehrung } from '@/lib/utils';

interface Props {
  budgetUebersicht: ExtendedBudgetUebersicht;
}

interface PieSegment {
  kategorie: KostengruppeTyp;
  wert: number;
  prozent: number;
  startAngle: number;
  endAngle: number;
  color: string;
  label: string;
}

const BudgetPieChart: React.FC<Props> = ({ budgetUebersicht }) => {
  const [hoveredSegment, setHoveredSegment] = useState<KostengruppeTyp | null>(null);

  // Berechne Segmente basierend auf Kostenberechnung
  const kategorien: KostengruppeTyp[] = [
    'fachfirmen', 'fachplaner', 'feeProjectsteuerung',
    'weitereBaunebenkosten', 'finanzierung', 'risikoreserve'
  ];

  const gesamtwert = budgetUebersicht.gesamtKostenberechnung || 1; // Verhindere Division durch 0

  let currentAngle = -90; // Start oben
  const segments: PieSegment[] = kategorien.map(kat => {
    const wert = budgetUebersicht.kategorien[kat].kostenberechnung;
    const prozent = (wert / gesamtwert) * 100;
    const angleSize = (prozent / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleSize;
    currentAngle = endAngle;

    return {
      kategorie: kat,
      wert,
      prozent,
      startAngle,
      endAngle,
      color: BUDGET_KATEGORIE_CONFIG[kat].chartColor,
      label: BUDGET_KATEGORIE_CONFIG[kat].label
    };
  }).filter(s => s.wert > 0);

  // SVG-Pfad für ein Kreissegment berechnen
  const describeArc = (
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ): string => {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M', cx, cy,
      'L', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      'Z'
    ].join(' ');
  };

  const polarToCartesian = (
    cx: number,
    cy: number,
    radius: number,
    angleInDegrees: number
  ) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: cx + radius * Math.cos(angleInRadians),
      y: cy + radius * Math.sin(angleInRadians)
    };
  };

  const cx = 120;
  const cy = 120;
  const radius = 100;
  const innerRadius = 50;

  // Prüfe ob überhaupt Daten vorhanden sind
  const hatDaten = segments.length > 0;

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      {/* SVG Pie Chart */}
      <div className="relative">
        <svg width="240" height="240" viewBox="0 0 240 240">
          {hatDaten ? (
            <>
              {segments.map((segment, index) => (
                <path
                  key={segment.kategorie}
                  d={describeArc(cx, cy, radius, segment.startAngle, segment.endAngle)}
                  fill={segment.color}
                  stroke="white"
                  strokeWidth="2"
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    opacity: hoveredSegment && hoveredSegment !== segment.kategorie ? 0.5 : 1,
                    transform: hoveredSegment === segment.kategorie ? 'scale(1.02)' : 'scale(1)',
                    transformOrigin: `${cx}px ${cy}px`
                  }}
                  onMouseEnter={() => setHoveredSegment(segment.kategorie)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              ))}
              {/* Innerer weißer Kreis (Donut) */}
              <circle cx={cx} cy={cy} r={innerRadius} fill="white" />
            </>
          ) : (
            <>
              <circle cx={cx} cy={cy} r={radius} fill="#E5E7EB" />
              <circle cx={cx} cy={cy} r={innerRadius} fill="white" />
            </>
          )}
          {/* Center Text */}
          <text x={cx} y={cy - 8} textAnchor="middle" className="text-xs fill-gray-500">
            Gesamt
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" className="text-sm font-bold fill-gray-900">
            {hatDaten ? formatWaehrung(gesamtwert) : '-'}
          </text>
        </svg>
      </div>

      {/* Legende */}
      <div className="flex flex-col gap-2 text-sm">
        {kategorien.map(kat => {
          const segment = segments.find(s => s.kategorie === kat);
          const config = BUDGET_KATEGORIE_CONFIG[kat];
          const wert = budgetUebersicht.kategorien[kat].kostenberechnung;
          const prozent = gesamtwert > 0 ? (wert / gesamtwert) * 100 : 0;

          return (
            <div
              key={kat}
              className={`flex items-center gap-2 px-2 py-1 rounded transition-colors cursor-pointer ${
                hoveredSegment === kat ? 'bg-gray-100' : ''
              }`}
              onMouseEnter={() => setHoveredSegment(kat)}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: config.chartColor }}
              />
              <span className="flex-1 text-gray-700">{config.label}</span>
              <span className="font-medium text-gray-900 tabular-nums">
                {formatWaehrung(wert)}
              </span>
              <span className="text-gray-500 tabular-nums w-14 text-right">
                ({prozent.toFixed(1)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BudgetPieChart;
