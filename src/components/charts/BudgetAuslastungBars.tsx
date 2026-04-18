'use client';

import React from 'react';
import { KostengruppeTyp, BUDGET_KATEGORIE_CONFIG, ExtendedBudgetUebersicht } from '@/types';
import { formatWaehrung } from '@/lib/utils';

interface Props {
  budgetUebersicht: ExtendedBudgetUebersicht;
  projektbudgetFreigegeben: number;
}

interface AuslastungsBalken {
  label: string;
  budget: number;
  bezahlt: number;
  verbleibend: number;
  auslastungProzent: number;
  farbe: string;
}

const BudgetAuslastungBars: React.FC<Props> = ({ budgetUebersicht, projektbudgetFreigegeben }) => {
  // Gesamt-Auslastung
  const gesamtBudget = projektbudgetFreigegeben || budgetUebersicht.gesamtKostenberechnung || 0;
  const gesamtBezahlt = budgetUebersicht.gesamtKostenfeststellung;

  const balken: AuslastungsBalken[] = [
    {
      label: 'Projektbudgetauslastung',
      budget: gesamtBudget,
      bezahlt: gesamtBezahlt,
      verbleibend: Math.max(0, gesamtBudget - gesamtBezahlt),
      auslastungProzent: gesamtBudget > 0 ? (gesamtBezahlt / gesamtBudget) * 100 : 0,
      farbe: '#1E3A5F' // Navy
    },
    {
      label: 'Fachplaner-Auslastung',
      budget: budgetUebersicht.kategorien.fachplaner.kostenberechnung,
      bezahlt: budgetUebersicht.kategorien.fachplaner.kostenfeststellung,
      verbleibend: Math.max(0, budgetUebersicht.kategorien.fachplaner.kostenberechnung - budgetUebersicht.kategorien.fachplaner.kostenfeststellung),
      auslastungProzent: budgetUebersicht.kategorien.fachplaner.auslastungProzent,
      farbe: BUDGET_KATEGORIE_CONFIG.fachplaner.chartColor
    },
    {
      label: 'Fachfirmen-Auslastung',
      budget: budgetUebersicht.kategorien.fachfirmen.kostenberechnung,
      bezahlt: budgetUebersicht.kategorien.fachfirmen.kostenfeststellung,
      verbleibend: Math.max(0, budgetUebersicht.kategorien.fachfirmen.kostenberechnung - budgetUebersicht.kategorien.fachfirmen.kostenfeststellung),
      auslastungProzent: budgetUebersicht.kategorien.fachfirmen.auslastungProzent,
      farbe: BUDGET_KATEGORIE_CONFIG.fachfirmen.chartColor
    },
    {
      label: 'Baunebenkosten-Auslastung',
      budget: budgetUebersicht.kategorien.weitereBaunebenkosten.kostenberechnung + budgetUebersicht.kategorien.feeProjectsteuerung.kostenberechnung,
      bezahlt: budgetUebersicht.kategorien.weitereBaunebenkosten.kostenfeststellung + budgetUebersicht.kategorien.feeProjectsteuerung.kostenfeststellung,
      verbleibend: Math.max(0,
        (budgetUebersicht.kategorien.weitereBaunebenkosten.kostenberechnung + budgetUebersicht.kategorien.feeProjectsteuerung.kostenberechnung) -
        (budgetUebersicht.kategorien.weitereBaunebenkosten.kostenfeststellung + budgetUebersicht.kategorien.feeProjectsteuerung.kostenfeststellung)
      ),
      auslastungProzent: (() => {
        const budget = budgetUebersicht.kategorien.weitereBaunebenkosten.kostenberechnung + budgetUebersicht.kategorien.feeProjectsteuerung.kostenberechnung;
        const bezahlt = budgetUebersicht.kategorien.weitereBaunebenkosten.kostenfeststellung + budgetUebersicht.kategorien.feeProjectsteuerung.kostenfeststellung;
        return budget > 0 ? (bezahlt / budget) * 100 : 0;
      })(),
      farbe: BUDGET_KATEGORIE_CONFIG.weitereBaunebenkosten.chartColor
    },
    {
      label: 'Finanzierung-Auslastung',
      budget: budgetUebersicht.kategorien.finanzierung.kostenberechnung,
      bezahlt: budgetUebersicht.kategorien.finanzierung.kostenfeststellung,
      verbleibend: Math.max(0, budgetUebersicht.kategorien.finanzierung.kostenberechnung - budgetUebersicht.kategorien.finanzierung.kostenfeststellung),
      auslastungProzent: budgetUebersicht.kategorien.finanzierung.auslastungProzent,
      farbe: BUDGET_KATEGORIE_CONFIG.finanzierung.chartColor
    }
  ];

  // Filtere Balken mit Budget > 0
  const aktiveBalken = balken.filter(b => b.budget > 0);

  return (
    <div className="space-y-4">
      {aktiveBalken.length === 0 ? (
        <p className="text-gray-500 text-sm">Keine Budgetdaten vorhanden</p>
      ) : (
        aktiveBalken.map((balken, index) => {
          const istUeberschritten = balken.auslastungProzent > 100;
          const istWarnung = balken.auslastungProzent > 80 && !istUeberschritten;

          return (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{balken.label}</span>
                <span className={`font-medium ${istUeberschritten ? 'text-red-600' : istWarnung ? 'text-yellow-600' : 'text-gray-700'}`}>
                  {balken.auslastungProzent.toFixed(1)}%
                </span>
              </div>

              {/* Gestapelter Balken */}
              <div className="h-6 bg-gray-200 rounded relative overflow-hidden">
                {/* Bezahlt */}
                <div
                  className="absolute top-0 left-0 h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(balken.auslastungProzent, 100)}%`,
                    backgroundColor: istUeberschritten ? '#DC2626' : balken.farbe
                  }}
                />

                {/* 80% Warnmarker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-yellow-500 z-10"
                  style={{ left: '80%' }}
                />

                {/* Prozent-Label im Balken */}
                {balken.auslastungProzent > 15 && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-white font-medium">
                    {formatWaehrung(balken.bezahlt)}
                  </span>
                )}
              </div>

              {/* Details unterhalb */}
              <div className="flex justify-between text-xs text-gray-500">
                <span>Budget: {formatWaehrung(balken.budget)}</span>
                <span>Bezahlt: {formatWaehrung(balken.bezahlt)}</span>
                <span className={istUeberschritten ? 'text-red-600' : ''}>
                  {istUeberschritten
                    ? `Überschreitung: ${formatWaehrung(balken.bezahlt - balken.budget)}`
                    : `Verbleibend: ${formatWaehrung(balken.verbleibend)}`
                  }
                </span>
              </div>
            </div>
          );
        })
      )}

      {/* Legende */}
      {aktiveBalken.length > 0 && (
        <div className="flex items-center gap-4 pt-2 text-xs text-gray-500 border-t">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-yellow-500 rounded-sm"></span>
            80% Warnung
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-600 rounded-sm"></span>
            Budgetüberschreitung
          </span>
        </div>
      )}
    </div>
  );
};

export default BudgetAuslastungBars;
