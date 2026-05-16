'use client';

import React, { useState } from 'react';
import { Projekt, KostengruppeTyp, BUDGET_KATEGORIE_CONFIG, ExtendedBudgetUebersicht, BudgetAllokation } from '@/types';
import { formatWaehrung } from '@/lib/utils';

interface Props {
  projekt: Projekt;
  budgetUebersicht: ExtendedBudgetUebersicht;
  onUpdate: (projekt: Projekt) => void;
}

interface ModalState {
  isOpen: boolean;
  kategorie: KostengruppeTyp | null;
}

// Initialisiere Edit-Werte mit Migration für alte Daten
const initEditValues = (allokation?: BudgetAllokation): BudgetAllokation => {
  const weitereBNK = allokation?.weitereBaunebenkostenEstimate ?? 0;
  const finanz = allokation?.finanzierungEstimate ?? 0;

  return {
    weitereBaunebenkostenKS: allokation?.weitereBaunebenkostenKS ?? weitereBNK,
    weitereBaunebenkostenKB: allokation?.weitereBaunebenkostenKB ?? weitereBNK,
    weitereBaunebenkostenKV: allokation?.weitereBaunebenkostenKV ?? weitereBNK,
    weitereBaunebenkostenKA: allokation?.weitereBaunebenkostenKA ?? weitereBNK,
    finanzierungKS: allokation?.finanzierungKS ?? finanz,
    finanzierungKB: allokation?.finanzierungKB ?? finanz,
    finanzierungKV: allokation?.finanzierungKV ?? finanz,
    finanzierungKA: allokation?.finanzierungKA ?? finanz,
    risikoreserveKS: allokation?.risikoreserveKS ?? 0,
    risikoreserveKB: allokation?.risikoreserveKB ?? 0,
    risikoreserveKV: allokation?.risikoreserveKV ?? 0,
    risikoreserveKA: allokation?.risikoreserveKA ?? 0,
  };
};

const BudgetUebersichtTabelle: React.FC<Props> = ({ projekt, budgetUebersicht, onUpdate }) => {
  const [modal, setModal] = useState<ModalState>({ isOpen: false, kategorie: null });
  const [editValues, setEditValues] = useState<BudgetAllokation>(() =>
    initEditValues(projekt.budgetAllokation)
  );

  // Reihenfolge der Kategorien für die Tabelle
  const kategorienReihenfolge: KostengruppeTyp[] = [
    'fachfirmen',
    'fachplaner',
    'feeProjectsteuerung',
    'weitereBaunebenkosten',
    'finanzierung',
    'risikoreserve'
  ];

  // Prüfen ob eine Kategorie bearbeitbar ist
  const istBearbeitbar = (kat: KostengruppeTyp): boolean => {
    return ['weitereBaunebenkosten', 'finanzierung', 'risikoreserve'].includes(kat);
  };

  const handleRowClick = (kat: KostengruppeTyp) => {
    if (istBearbeitbar(kat)) {
      setModal({ isOpen: true, kategorie: kat });
    }
  };

  const handleSave = () => {
    const updatedProjekt: Projekt = {
      ...projekt,
      budgetAllokation: {
        ...projekt.budgetAllokation,
        ...editValues
      },
      geaendertAm: new Date().toISOString()
    };
    onUpdate(updatedProjekt);
    setModal({ isOpen: false, kategorie: null });
  };

  // Differenz formatieren mit Farbcodierung
  const formatDifferenz = (prozent: number): React.ReactNode => {
    if (prozent === 0) return <span className="text-gray-500">-</span>;

    const prefix = prozent > 0 ? '+' : '';
    const className = prozent > 0 ? 'text-red-600' : 'text-green-600';

    return (
      <span className={className}>
        {prefix}{prozent.toFixed(1)}%
      </span>
    );
  };

  return (
    <>
      <div className="card">
        <h3 className="font-semibold mb-4">Budgetübersicht nach DIN 276</h3>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategorie
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  KS
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  KB
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diff
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  KV
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diff
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  KA
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diff
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  KF
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diff
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {kategorienReihenfolge.map((kat) => {
                const data = budgetUebersicht.kategorien[kat];
                const config = BUDGET_KATEGORIE_CONFIG[kat];
                const bearbeitbar = istBearbeitbar(kat);

                return (
                  <tr
                    key={kat}
                    className={`${bearbeitbar ? 'cursor-pointer hover:bg-gray-50' : ''} ${
                      data.auslastungProzent > 100 ? 'bg-red-50' : data.auslastungProzent > 80 ? 'bg-yellow-50' : ''
                    }`}
                    onClick={() => handleRowClick(kat)}
                    title={bearbeitbar ? 'Klicken zum Bearbeiten' : undefined}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: config.chartColor }}
                        />
                        <span className="text-sm font-medium text-gray-900">{config.label}</span>
                        {bearbeitbar && (
                          <span className="text-xs text-gray-400 ml-1">✏️</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-sm text-right text-gray-900">
                      {data.kostenschaetzung > 0 ? formatWaehrung(data.kostenschaetzung) : '-'}
                    </td>
                    <td className="px-2 py-2 text-sm text-right text-gray-900">
                      {data.kostenberechnung > 0 ? formatWaehrung(data.kostenberechnung) : '-'}
                    </td>
                    <td className="px-2 py-2 text-sm text-right">
                      {data.kostenschaetzung > 0 ? formatDifferenz(data.differenzKBProzent) : '-'}
                    </td>
                    {/* NEU: KV-Spalte */}
                    <td className="px-2 py-2 text-sm text-right text-gray-900">
                      {data.kostenvoranschlag > 0 ? formatWaehrung(data.kostenvoranschlag) : '-'}
                    </td>
                    <td className="px-2 py-2 text-sm text-right">
                      {data.kostenberechnung > 0 ? formatDifferenz(data.differenzKVProzent) : '-'}
                    </td>
                    <td className="px-2 py-2 text-sm text-right text-gray-900 font-medium">
                      {data.kostenanschlag > 0 ? formatWaehrung(data.kostenanschlag) : '-'}
                    </td>
                    <td className="px-2 py-2 text-sm text-right">
                      {data.kostenvoranschlag > 0 ? formatDifferenz(data.differenzKAProzent) : '-'}
                    </td>
                    <td className="px-2 py-2 text-sm text-right text-gray-900">
                      {data.kostenfeststellung > 0 ? formatWaehrung(data.kostenfeststellung) : '-'}
                    </td>
                    <td className="px-2 py-2 text-sm text-right">
                      {data.kostenanschlag > 0 ? formatDifferenz(data.differenzKFProzent) : '-'}
                    </td>
                    <td className="px-2 py-2 text-sm text-right">
                      {data.kostenanschlag > 0 ? (
                        <span className={`font-medium ${
                          data.auslastungProzent > 100 ? 'text-red-600' :
                          data.auslastungProzent > 80 ? 'text-yellow-600' : 'text-gray-900'
                        }`}>
                          {data.auslastungProzent.toFixed(0)}%
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}

              {/* Summenzeile */}
              <tr className="bg-gray-100 font-semibold">
                <td className="px-3 py-2 text-sm text-gray-900">Gesamt</td>
                <td className="px-2 py-2 text-sm text-right text-gray-900">
                  {formatWaehrung(budgetUebersicht.gesamtKostenschaetzung)}
                </td>
                <td className="px-2 py-2 text-sm text-right text-gray-900">
                  {formatWaehrung(budgetUebersicht.gesamtKostenberechnung)}
                </td>
                <td className="px-2 py-2 text-sm text-right">
                  {budgetUebersicht.gesamtKostenschaetzung > 0
                    ? formatDifferenz(((budgetUebersicht.gesamtKostenberechnung - budgetUebersicht.gesamtKostenschaetzung) / budgetUebersicht.gesamtKostenschaetzung) * 100)
                    : '-'}
                </td>
                {/* NEU: KV-Spalte */}
                <td className="px-2 py-2 text-sm text-right text-gray-900">
                  {formatWaehrung(budgetUebersicht.gesamtKostenvoranschlag)}
                </td>
                <td className="px-2 py-2 text-sm text-right">
                  {budgetUebersicht.gesamtKostenberechnung > 0
                    ? formatDifferenz(((budgetUebersicht.gesamtKostenvoranschlag - budgetUebersicht.gesamtKostenberechnung) / budgetUebersicht.gesamtKostenberechnung) * 100)
                    : '-'}
                </td>
                <td className="px-2 py-2 text-sm text-right text-gray-900">
                  {formatWaehrung(budgetUebersicht.gesamtKostenanschlag)}
                </td>
                <td className="px-2 py-2 text-sm text-right">
                  {budgetUebersicht.gesamtKostenvoranschlag > 0
                    ? formatDifferenz(((budgetUebersicht.gesamtKostenanschlag - budgetUebersicht.gesamtKostenvoranschlag) / budgetUebersicht.gesamtKostenvoranschlag) * 100)
                    : '-'}
                </td>
                <td className="px-2 py-2 text-sm text-right text-gray-900">
                  {formatWaehrung(budgetUebersicht.gesamtKostenfeststellung)}
                </td>
                <td className="px-2 py-2 text-sm text-right">
                  {budgetUebersicht.gesamtKostenanschlag > 0
                    ? formatDifferenz(((budgetUebersicht.gesamtKostenfeststellung - budgetUebersicht.gesamtKostenanschlag) / budgetUebersicht.gesamtKostenanschlag) * 100)
                    : '-'}
                </td>
                <td className="px-2 py-2 text-sm text-right">
                  {budgetUebersicht.gesamtKostenanschlag > 0 ? (
                    <span className={`font-medium ${
                      (budgetUebersicht.gesamtKostenfeststellung / budgetUebersicht.gesamtKostenanschlag * 100) > 100 ? 'text-red-600' :
                      (budgetUebersicht.gesamtKostenfeststellung / budgetUebersicht.gesamtKostenanschlag * 100) > 80 ? 'text-yellow-600' : ''
                    }`}>
                      {((budgetUebersicht.gesamtKostenfeststellung / budgetUebersicht.gesamtKostenanschlag) * 100).toFixed(0)}%
                    </span>
                  ) : '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          <span>KS = Kostenschätzung (LP2) | KB = Kostenberechnung (LP3) | KV = Kostenvoranschlag (LP5) | KA = Kostenanschlag (LP7) | KF = Kostenfeststellung (LP8/9)</span>
        </div>
      </div>

      {/* Bearbeitungs-Modal */}
      {modal.isOpen && modal.kategorie && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">
              {BUDGET_KATEGORIE_CONFIG[modal.kategorie].label} bearbeiten
            </h3>

            {/* Weitere Baunebenkosten: 4 Felder für KS/KB/KV/KA */}
            {modal.kategorie === 'weitereBaunebenkosten' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-2">Geben Sie die Baunebenkosten für jede Kostenstufe ein (netto):</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">KS (Schätzung)</label>
                    <input
                      type="number"
                      value={editValues.weitereBaunebenkostenKS || 0}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        weitereBaunebenkostenKS: parseFloat(e.target.value) || 0
                      })}
                      className="input w-full"
                      min="0"
                      step="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">KB (Berechnung)</label>
                    <input
                      type="number"
                      value={editValues.weitereBaunebenkostenKB || 0}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        weitereBaunebenkostenKB: parseFloat(e.target.value) || 0
                      })}
                      className="input w-full"
                      min="0"
                      step="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">KV (Voranschlag)</label>
                    <input
                      type="number"
                      value={editValues.weitereBaunebenkostenKV || 0}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        weitereBaunebenkostenKV: parseFloat(e.target.value) || 0
                      })}
                      className="input w-full"
                      min="0"
                      step="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">KA (Anschlag)</label>
                    <input
                      type="number"
                      value={editValues.weitereBaunebenkostenKA || 0}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        weitereBaunebenkostenKA: parseFloat(e.target.value) || 0
                      })}
                      className="input w-full"
                      min="0"
                      step="1000"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Finanzierung: 4 Felder für KS/KB/KV/KA */}
            {modal.kategorie === 'finanzierung' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-2">Geben Sie die Finanzierungskosten für jede Kostenstufe ein (netto):</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">KS (Schätzung)</label>
                    <input
                      type="number"
                      value={editValues.finanzierungKS || 0}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        finanzierungKS: parseFloat(e.target.value) || 0
                      })}
                      className="input w-full"
                      min="0"
                      step="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">KB (Berechnung)</label>
                    <input
                      type="number"
                      value={editValues.finanzierungKB || 0}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        finanzierungKB: parseFloat(e.target.value) || 0
                      })}
                      className="input w-full"
                      min="0"
                      step="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">KV (Voranschlag)</label>
                    <input
                      type="number"
                      value={editValues.finanzierungKV || 0}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        finanzierungKV: parseFloat(e.target.value) || 0
                      })}
                      className="input w-full"
                      min="0"
                      step="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">KA (Anschlag)</label>
                    <input
                      type="number"
                      value={editValues.finanzierungKA || 0}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        finanzierungKA: parseFloat(e.target.value) || 0
                      })}
                      className="input w-full"
                      min="0"
                      step="1000"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Risikoreserve: 4 Felder für KS/KB/KV/KA (EUR-Beträge, kein Prozent mehr) */}
            {modal.kategorie === 'risikoreserve' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-2">Geben Sie die Risikoreserve für jede Kostenstufe ein (netto):</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">KS (Schätzung)</label>
                    <input
                      type="number"
                      value={editValues.risikoreserveKS || 0}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        risikoreserveKS: parseFloat(e.target.value) || 0
                      })}
                      className="input w-full"
                      min="0"
                      step="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">KB (Berechnung)</label>
                    <input
                      type="number"
                      value={editValues.risikoreserveKB || 0}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        risikoreserveKB: parseFloat(e.target.value) || 0
                      })}
                      className="input w-full"
                      min="0"
                      step="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">KV (Voranschlag)</label>
                    <input
                      type="number"
                      value={editValues.risikoreserveKV || 0}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        risikoreserveKV: parseFloat(e.target.value) || 0
                      })}
                      className="input w-full"
                      min="0"
                      step="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">KA (Anschlag)</label>
                    <input
                      type="number"
                      value={editValues.risikoreserveKA || 0}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        risikoreserveKA: parseFloat(e.target.value) || 0
                      })}
                      className="input w-full"
                      min="0"
                      step="1000"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModal({ isOpen: false, kategorie: null })}
                className="btn-secondary"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                className="btn-primary"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BudgetUebersichtTabelle;
