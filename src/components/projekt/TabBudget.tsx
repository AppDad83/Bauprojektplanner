'use client';

import React from 'react';
import { Projekt } from '@/types';
import { formatDatum, formatWaehrung, berechneBudgetUebersicht } from '@/lib/utils';

interface Props {
  projekt: Projekt;
  onUpdate: (projekt: Projekt) => void;
}

const TabBudget: React.FC<Props> = ({ projekt }) => {
  // Berechne das freigegebene Budget als Summe aller genehmigten Budgethistorie-Einträge
  const berechnetesFreigegebenesbudget = projekt.projektbudgetHistorie
    .filter(e => e.freigabeDatum && !e.abgelehntAm)
    .reduce((sum, e) => sum + e.betragNetto, 0);

  const budget = berechneBudgetUebersicht({
    ...projekt,
    projektbudgetFreigegeben: berechnetesFreigegebenesbudget
  });

  const summeNachtraegeFachplaner = projekt.nachtraege
    .filter(n => n.istFachplaner && (n.status === 'genehmigt' || n.status === 'teilweise_genehmigt'))
    .reduce((s, n) => s + (n.betragNettoGenehmigt || 0), 0);

  const summeNachtraegeFachfirmen = projekt.nachtraege
    .filter(n => !n.istFachplaner && (n.status === 'genehmigt' || n.status === 'teilweise_genehmigt'))
    .reduce((s, n) => s + (n.betragNettoGenehmigt || 0), 0);

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

      {/* Hauptkennzahlen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-apleona-gray-600">Freigegebenes Projektbudget</p>
          <p className="text-2xl font-bold text-apleona-navy">{formatWaehrung(budget.projektbudgetFreigegeben)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-apleona-gray-600">Summe Budgets (FP + FF)</p>
          <p className="text-2xl font-bold text-apleona-navy">
            {formatWaehrung(budget.summeFachplanerBudgets + budget.summeFachfirmenBudgets)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-apleona-gray-600">Genehmigte Nachträge</p>
          <p className="text-2xl font-bold text-status-yellow">{formatWaehrung(budget.summeGenehmigteNachtraege)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-apleona-gray-600">Summe Rechnungen</p>
          <p className="text-2xl font-bold text-status-green">{formatWaehrung(budget.summeRechnungen)}</p>
        </div>
      </div>

      {/* Budgetvergleich visuell */}
      <div className="card">
        <h3 className="font-semibold mb-4">Budget vs. Kosten</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Projektbudget</span>
              <span>{formatWaehrung(budget.projektbudgetFreigegeben)}</span>
            </div>
            <div className="h-4 bg-apleona-gray-200 rounded">
              <div className="h-full bg-apleona-navy rounded" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Aktuelle geplante Projektbudgetauslastung - gestapelter Balken */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">Aktuelle geplante Projektbudgetauslastung</span>
              <span>
                {formatWaehrung(budget.summeFachplanerBudgets + budget.summeFachfirmenBudgets)}
                {budget.projektbudgetFreigegeben > 0 && (
                  <span className="ml-2 text-apleona-gray-500">
                    ({((budget.summeFachplanerBudgets + budget.summeFachfirmenBudgets) / budget.projektbudgetFreigegeben * 100).toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
            <div className="h-5 bg-apleona-gray-200 rounded flex overflow-hidden">
              {/* Blau: Fachplaner-Budgets */}
              <div
                className="h-full bg-blue-500"
                style={{
                  width: `${budget.projektbudgetFreigegeben > 0
                    ? (budget.summeFachplanerBudgets / budget.projektbudgetFreigegeben) * 100
                    : 0}%`
                }}
                title={`Fachplaner: ${formatWaehrung(budget.summeFachplanerBudgets)}`}
              />
              {/* Grün: Fachfirmen-Budgets */}
              <div
                className="h-full bg-green-500"
                style={{
                  width: `${budget.projektbudgetFreigegeben > 0
                    ? (budget.summeFachfirmenBudgets / budget.projektbudgetFreigegeben) * 100
                    : 0}%`
                }}
                title={`Fachfirmen: ${formatWaehrung(budget.summeFachfirmenBudgets)}`}
              />
            </div>
            <div className="flex justify-between text-xs text-apleona-gray-500 mt-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-blue-500 rounded mr-1"></span>
                  Fachplaner: {formatWaehrung(budget.summeFachplanerBudgets)}
                </span>
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded mr-1"></span>
                  Fachfirmen: {formatWaehrung(budget.summeFachfirmenBudgets)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Fachplaner-Budgets</span>
              <span>{formatWaehrung(budget.summeFachplanerBudgets)}</span>
            </div>
            <div className="h-4 bg-apleona-gray-200 rounded">
              <div
                className="h-full bg-blue-500 rounded"
                style={{ width: `${budget.projektbudgetFreigegeben > 0 ? (budget.summeFachplanerBudgets / budget.projektbudgetFreigegeben) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Fachfirmen-Budgets</span>
              <span>{formatWaehrung(budget.summeFachfirmenBudgets)}</span>
            </div>
            <div className="h-4 bg-apleona-gray-200 rounded">
              <div
                className="h-full bg-green-500 rounded"
                style={{ width: `${budget.projektbudgetFreigegeben > 0 ? (budget.summeFachfirmenBudgets / budget.projektbudgetFreigegeben) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">Gesamtauslastung</span>
              <span className={`font-medium ${budget.ampel === 'rot' ? 'text-status-red' : budget.ampel === 'gelb' ? 'text-status-yellow' : ''}`}>
                {budget.auslastungProzent.toFixed(1)}%
              </span>
            </div>
            <div className="h-6 bg-apleona-gray-200 rounded relative">
              <div
                className={`h-full rounded ${
                  budget.ampel === 'rot' ? 'bg-status-red' :
                  budget.ampel === 'gelb' ? 'bg-status-yellow' : 'bg-status-green'
                }`}
                style={{ width: `${Math.min(budget.auslastungProzent, 100)}%` }}
              />
              {/* Markierung bei 80% */}
              <div className="absolute top-0 h-full w-0.5 bg-status-yellow" style={{ left: '80%' }} />
            </div>
            <div className="flex justify-between text-xs text-apleona-gray-500 mt-1">
              <span>0%</span>
              <span>80% Warnung</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

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
                  <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">Rechnungen</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apleona-gray-200">
                {projekt.fachplaner.map(fp => {
                  const summe = fp.rechnungen.reduce((s, r) => s + r.betragNetto, 0);
                  const prozent = fp.budgetGenehmigt > 0 ? (summe / fp.budgetGenehmigt) * 100 : 0;
                  return (
                    <tr key={fp.id} className={prozent > 100 ? 'bg-red-50' : prozent > 80 ? 'bg-yellow-50' : ''}>
                      <td className="px-3 py-2 text-sm">{fp.firma}</td>
                      <td className="px-3 py-2 text-sm text-right">{formatWaehrung(fp.budgetGenehmigt)}</td>
                      <td className="px-3 py-2 text-sm text-right">{formatWaehrung(summe)}</td>
                      <td className="px-3 py-2 text-sm text-right font-medium">{prozent.toFixed(0)}%</td>
                    </tr>
                  );
                })}
                <tr className="bg-apleona-gray-100 font-medium">
                  <td className="px-3 py-2 text-sm">Summe</td>
                  <td className="px-3 py-2 text-sm text-right">{formatWaehrung(budget.summeFachplanerBudgets)}</td>
                  <td className="px-3 py-2 text-sm text-right">
                    {formatWaehrung(projekt.fachplaner.reduce((s, fp) => s + fp.rechnungen.reduce((sr, r) => sr + r.betragNetto, 0), 0))}
                  </td>
                  <td className="px-3 py-2 text-sm text-right">-</td>
                </tr>
              </tbody>
            </table>
          )}
          {summeNachtraegeFachplaner > 0 && (
            <p className="mt-2 text-sm text-status-yellow">
              + {formatWaehrung(summeNachtraegeFachplaner)} genehmigte Nachträge
            </p>
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
                  <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">Rechnungen</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apleona-gray-200">
                {projekt.fachfirmen.map(ff => {
                  const summe = ff.rechnungen.reduce((s, r) => s + r.betragNetto, 0);
                  const prozent = ff.budgetGenehmigt > 0 ? (summe / ff.budgetGenehmigt) * 100 : 0;
                  return (
                    <tr key={ff.id} className={prozent > 100 ? 'bg-red-50' : prozent > 80 ? 'bg-yellow-50' : ''}>
                      <td className="px-3 py-2 text-sm">{ff.firma}</td>
                      <td className="px-3 py-2 text-sm text-right">{formatWaehrung(ff.budgetGenehmigt)}</td>
                      <td className="px-3 py-2 text-sm text-right">{formatWaehrung(summe)}</td>
                      <td className="px-3 py-2 text-sm text-right font-medium">{prozent.toFixed(0)}%</td>
                    </tr>
                  );
                })}
                <tr className="bg-apleona-gray-100 font-medium">
                  <td className="px-3 py-2 text-sm">Summe</td>
                  <td className="px-3 py-2 text-sm text-right">{formatWaehrung(budget.summeFachfirmenBudgets)}</td>
                  <td className="px-3 py-2 text-sm text-right">
                    {formatWaehrung(projekt.fachfirmen.reduce((s, ff) => s + ff.rechnungen.reduce((sr, r) => sr + r.betragNetto, 0), 0))}
                  </td>
                  <td className="px-3 py-2 text-sm text-right">-</td>
                </tr>
              </tbody>
            </table>
          )}
          {summeNachtraegeFachfirmen > 0 && (
            <p className="mt-2 text-sm text-status-yellow">
              + {formatWaehrung(summeNachtraegeFachfirmen)} genehmigte Nachträge
            </p>
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
                      {r.typ === 'schlussrechnung' ? <span className="badge-warning">Schlussrechnung</span> : r.typ}
                    </td>
                    <td className="px-3 py-2 text-sm text-right font-medium">{formatWaehrung(r.betragNetto)}</td>
                    <td className="px-3 py-2 text-center">
                      {r.geprueft ? <span className="text-status-green">✓</span> : <span className="text-apleona-gray-300">-</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.freigegeben ? <span className="text-status-green">✓</span> : <span className="text-apleona-gray-300">-</span>}
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
