'use client';

import React from 'react';
import { Projekt, KOSTENSTUFE_LABELS } from '@/types';
import {
  formatDatum,
  formatWaehrung,
  berechneBudgetUebersicht,
  berechneEffektivesBudgetAusAngeboten,
  berechneExtendedBudgetUebersicht,
  berechneAktuelleKostenstufe,
  berechneProjektbudgetFreigegeben
} from '@/lib/utils';
import BudgetPieChart from '@/components/charts/BudgetPieChart';
import BudgetAuslastungBars from '@/components/charts/BudgetAuslastungBars';
import BudgetUebersichtTabelle from './BudgetUebersichtTabelle';

interface Props {
  projekt: Projekt;
  onUpdate: (projekt: Projekt) => void;
}

const TabBudget: React.FC<Props> = ({ projekt, onUpdate }) => {
  // Aktuelle Kostenstufe aus Projektphase
  const aktuelleKostenstufe = berechneAktuelleKostenstufe(projekt.aktuellePhase);

  // Projektbudget aus aktueller Phase berechnen (nicht mehr aus projektbudgetHistorie)
  const berechnetesFreigegebenesbudget = berechneProjektbudgetFreigegeben(projekt);

  const budget = berechneBudgetUebersicht({
    ...projekt,
    projektbudgetFreigegeben: berechnetesFreigegebenesbudget
  });

  // Extended Budget-Übersicht für neue Komponenten
  const extendedBudget = berechneExtendedBudgetUebersicht({
    ...projekt,
    projektbudgetFreigegeben: berechnetesFreigegebenesbudget
  });

  // Summe freigegebener Rechnungen (neues Feld freigegebenDatum)
  const summeFreigegeben = [
    ...projekt.fachplaner.flatMap(fp => fp.rechnungen),
    ...projekt.fachfirmen.flatMap(ff => ff.rechnungen)
  ]
    .filter(r => r.freigegebenDatum)
    .reduce((sum, r) => sum + r.betragNetto, 0);

  // Summe bezahlter Rechnungen (KF)
  const summeBezahlt = [
    ...projekt.fachplaner.flatMap(fp => fp.rechnungen),
    ...projekt.fachfirmen.flatMap(ff => ff.rechnungen)
  ]
    .filter(r => r.bezahltDatum)
    .reduce((sum, r) => sum + r.betragNetto, 0)
    + projekt.feeRechnungen.reduce((sum, r) => sum + r.betragNetto, 0);

  const alleRechnungen = [
    ...projekt.fachplaner.flatMap(fp => fp.rechnungen.map(r => ({
      ...r,
      beteiligter: fp.firma,
      typ_beteiligter: 'Fachplaner' as const
    }))),
    ...projekt.fachfirmen.flatMap(ff => ff.rechnungen.map(r => ({
      ...r,
      beteiligter: ff.firma,
      typ_beteiligter: 'Fachfirma' as const
    })))
  ].sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Budgetübersicht</h2>

      {/* Hauptkennzahlen - 4 neue KPI-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Karte 1: Freigegebenes Projektbudget */}
        <div className="card">
          <p className="text-sm text-apleona-gray-600">Projektbudget</p>
          <p className="text-2xl font-bold text-apleona-navy">{formatWaehrung(berechnetesFreigegebenesbudget)}</p>
          <p className="text-xs text-apleona-gray-500 mt-1">
            {KOSTENSTUFE_LABELS[aktuelleKostenstufe]}
          </p>
        </div>
        {/* Karte 2: Gesamtkosten (Kostenanschlag) */}
        <div className="card">
          <p className="text-sm text-apleona-gray-600">Kostenanschlag (KA)</p>
          <p className="text-2xl font-bold text-apleona-navy">
            {formatWaehrung(extendedBudget.gesamtKostenanschlag)}
          </p>
          <p className="text-xs text-apleona-gray-500 mt-1">
            Genehmigte Angebote
          </p>
        </div>
        {/* Karte 3: Freigegeben an Kunde */}
        <div className="card">
          <p className="text-sm text-apleona-gray-600">Freigegeben an Kunde</p>
          <p className="text-2xl font-bold text-status-yellow">{formatWaehrung(summeFreigegeben)}</p>
          <p className="text-xs text-apleona-gray-500 mt-1">
            Zur Zahlung freigegeben
          </p>
        </div>
        {/* Karte 4: Bezahlt (KF) */}
        <div className="card">
          <p className="text-sm text-apleona-gray-600">Bezahlt (KF)</p>
          <p className="text-2xl font-bold text-status-green">{formatWaehrung(summeBezahlt)}</p>
          <p className="text-xs text-apleona-gray-500 mt-1">
            Kostenfeststellung
          </p>
        </div>
      </div>

      {/* NEU: Kreisdiagramm und Auslastungsbalken */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kreisdiagramm */}
        <div className="card">
          <h3 className="font-semibold mb-4">Projektbudget-Verteilung</h3>
          <BudgetPieChart
            budgetUebersicht={extendedBudget}
            aktuelleKostenstufe={aktuelleKostenstufe}
          />
        </div>

        {/* Auslastungsbalken */}
        <div className="card">
          <h3 className="font-semibold mb-4">Budgetauslastung</h3>
          <BudgetAuslastungBars
            budgetUebersicht={extendedBudget}
            projektbudgetFreigegeben={berechnetesFreigegebenesbudget}
            aktuelleKostenstufe={aktuelleKostenstufe}
          />
        </div>
      </div>

      {/* NEU: Budgetübersicht-Tabelle nach DIN 276 */}
      <BudgetUebersichtTabelle
        projekt={{ ...projekt, projektbudgetFreigegeben: berechnetesFreigegebenesbudget }}
        budgetUebersicht={extendedBudget}
        onUpdate={onUpdate}
      />

      {/* Budget nach Beteiligten */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fachplaner */}
        <div className="card">
          <h3 className="font-semibold mb-4">Fachplaner-Budgets</h3>
          {projekt.fachplaner.length === 0 ? (
            <p className="text-apleona-gray-500 text-sm">Keine Fachplaner angelegt</p>
          ) : (
            <table className="min-w-full divide-y divide-apleona-gray-200">
              <thead className="bg-apleona-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Firma</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">Budget</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">Bezahlt (KF)</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apleona-gray-200">
                {projekt.fachplaner.map(fp => {
                  // BUG FIX: Nur bezahlte Rechnungen zählen
                  const summe = fp.rechnungen
                    .filter(r => r.bezahltDatum)
                    .reduce((s, r) => s + r.betragNetto, 0);
                  const effBudget = berechneEffektivesBudgetAusAngeboten(fp.angebote);
                  const prozent = effBudget > 0 ? (summe / effBudget) * 100 : 0;
                  return (
                    <tr key={fp.id} className={prozent > 100 ? 'bg-red-50' : prozent > 80 ? 'bg-yellow-50' : ''}>
                      <td className="px-3 py-2 text-sm">{fp.firma}</td>
                      <td className="px-3 py-2 text-sm text-right">{formatWaehrung(effBudget)}</td>
                      <td className="px-3 py-2 text-sm text-right">{formatWaehrung(summe)}</td>
                      <td className="px-3 py-2 text-sm text-right font-medium">{prozent.toFixed(0)}%</td>
                    </tr>
                  );
                })}
                <tr className="bg-apleona-gray-100 font-medium">
                  <td className="px-3 py-2 text-sm">Summe</td>
                  <td className="px-3 py-2 text-sm text-right">{formatWaehrung(budget.summeFachplanerBudgets)}</td>
                  <td className="px-3 py-2 text-sm text-right">
                    {formatWaehrung(projekt.fachplaner.reduce((s, fp) =>
                      s + fp.rechnungen.filter(r => r.bezahltDatum).reduce((sr, r) => sr + r.betragNetto, 0), 0))}
                  </td>
                  <td className="px-3 py-2 text-sm text-right">-</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Fachfirmen */}
        <div className="card">
          <h3 className="font-semibold mb-4">Fachfirmen-Budgets</h3>
          {projekt.fachfirmen.length === 0 ? (
            <p className="text-apleona-gray-500 text-sm">Keine Fachfirmen angelegt</p>
          ) : (
            <table className="min-w-full divide-y divide-apleona-gray-200">
              <thead className="bg-apleona-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Firma</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">Budget</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">Bezahlt (KF)</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apleona-gray-200">
                {projekt.fachfirmen.map(ff => {
                  // BUG FIX: Nur bezahlte Rechnungen zählen
                  const summe = ff.rechnungen
                    .filter(r => r.bezahltDatum)
                    .reduce((s, r) => s + r.betragNetto, 0);
                  const effBudget = berechneEffektivesBudgetAusAngeboten(ff.angebote);
                  const prozent = effBudget > 0 ? (summe / effBudget) * 100 : 0;
                  return (
                    <tr key={ff.id} className={prozent > 100 ? 'bg-red-50' : prozent > 80 ? 'bg-yellow-50' : ''}>
                      <td className="px-3 py-2 text-sm">{ff.firma}</td>
                      <td className="px-3 py-2 text-sm text-right">{formatWaehrung(effBudget)}</td>
                      <td className="px-3 py-2 text-sm text-right">{formatWaehrung(summe)}</td>
                      <td className="px-3 py-2 text-sm text-right font-medium">{prozent.toFixed(0)}%</td>
                    </tr>
                  );
                })}
                <tr className="bg-apleona-gray-100 font-medium">
                  <td className="px-3 py-2 text-sm">Summe</td>
                  <td className="px-3 py-2 text-sm text-right">{formatWaehrung(budget.summeFachfirmenBudgets)}</td>
                  <td className="px-3 py-2 text-sm text-right">
                    {formatWaehrung(projekt.fachfirmen.reduce((s, ff) =>
                      s + ff.rechnungen.filter(r => r.bezahltDatum).reduce((sr, r) => sr + r.betragNetto, 0), 0))}
                  </td>
                  <td className="px-3 py-2 text-sm text-right">-</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Alle Rechnungen */}
      <div className="card">
        <h3 className="font-semibold mb-4">Alle Rechnungen</h3>
        {alleRechnungen.length === 0 ? (
          <p className="text-apleona-gray-500 text-sm">Keine Rechnungen vorhanden</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-apleona-gray-200">
              <thead className="bg-apleona-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Nr.</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Datum</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Beteiligter</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Typ</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">Betrag netto</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-apleona-gray-500">Geprüft</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-apleona-gray-500">Freigegeben</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-apleona-gray-500">Bezahlt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apleona-gray-200">
                {alleRechnungen.slice(0, 20).map(r => (
                  <tr key={r.id} className={r.typ === 'schlussrechnung' ? 'schlussrechnung' : ''}>
                    <td className="px-3 py-2 text-sm">{r.rechnungsnummer}</td>
                    <td className="px-3 py-2 text-sm">{formatDatum(r.datum)}</td>
                    <td className="px-3 py-2 text-sm">
                      <span className={r.typ_beteiligter === 'Fachplaner' ? 'badge-info' : 'badge-success'}>
                        {r.beteiligter}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {r.typ === 'schlussrechnung' ? (
                        <span className="badge-warning">Schlussrechnung</span>
                      ) : r.typ === 'teilrechnung' ? (
                        'Teilrechnung'
                      ) : r.typ === 'anzahlung' ? (
                        'Anzahlung'
                      ) : r.typ}
                    </td>
                    <td className="px-3 py-2 text-sm text-right font-medium">{formatWaehrung(r.betragNetto)}</td>
                    {/* BUG FIX: Korrekte Felder lesen */}
                    <td className="px-3 py-2 text-center text-xs">
                      {r.geprueftDatum
                        ? <span className="text-status-green" title={formatDatum(r.geprueftDatum)}>✓</span>
                        : <span className="text-apleona-gray-300">–</span>}
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      {r.freigegebenDatum
                        ? <span className="text-status-green" title={formatDatum(r.freigegebenDatum)}>✓</span>
                        : <span className="text-apleona-gray-300">–</span>}
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      {r.bezahltDatum
                        ? <span className="text-status-green" title={formatDatum(r.bezahltDatum)}>✓</span>
                        : <span className="text-apleona-gray-300">–</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {alleRechnungen.length > 20 && (
              <p className="mt-2 text-sm text-apleona-gray-500 text-center">
                ... und {alleRechnungen.length - 20} weitere Rechnungen
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TabBudget;
