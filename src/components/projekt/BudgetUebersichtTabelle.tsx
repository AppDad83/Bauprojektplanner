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

const BudgetUebersichtTabelle: React.FC<Props> = ({ projekt, budgetUebersicht, onUpdate }) => {
  const [modal, setModal] = useState<ModalState>({ isOpen: false, kategorie: null });
  const [editValues, setEditValues] = useState<BudgetAllokation>({
    weitereBaunebenkostenEstimate: projekt.budgetAllokation?.weitereBaunebenkostenEstimate || 0,
    finanzierungEstimate: projekt.budgetAllokation?.finanzierungEstimate || 0,
    risikoreservePercent: projekt.budgetAllokation?.risikoreservePercent || 0
  });

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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategorie
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kostenschätzung
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kostenberechnung
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diff KB/KS
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kostenfeststellung
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diff KF/KB
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Auslastung
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
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: config.chartColor }}
                        />
                        <span className="text-sm font-medium text-gray-900">{config.label}</span>
                        {bearbeitbar && (
                          <span className="text-xs text-gray-400 ml-1">(bearbeitbar)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {data.kostenschaetzung > 0 ? formatWaehrung(data.kostenschaetzung) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">
                      {data.kostenberechnung > 0 ? formatWaehrung(data.kostenberechnung) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {data.kostenschaetzung > 0 ? formatDifferenz(data.differenzKBProzent) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {data.kostenfeststellung > 0 ? formatWaehrung(data.kostenfeststellung) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {data.kostenberechnung > 0 ? formatDifferenz(data.differenzKFProzent) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {data.kostenberechnung > 0 ? (
                        <span className={`font-medium ${
                          data.auslastungProzent > 100 ? 'text-red-600' :
                          data.auslastungProzent > 80 ? 'text-yellow-600' : 'text-gray-900'
                        }`}>
                          {data.auslastungProzent.toFixed(1)}%
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}

              {/* Summenzeile */}
              <tr className="bg-gray-100 font-semibold">
                <td className="px-4 py-3 text-sm text-gray-900">Gesamt</td>
                <td className="px-4 py-3 text-sm text-right text-gray-900">
                  {formatWaehrung(budgetUebersicht.gesamtKostenschaetzung)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900">
                  {formatWaehrung(budgetUebersicht.gesamtKostenberechnung)}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {budgetUebersicht.gesamtKostenschaetzung > 0
                    ? formatDifferenz(((budgetUebersicht.gesamtKostenberechnung - budgetUebersicht.gesamtKostenschaetzung) / budgetUebersicht.gesamtKostenschaetzung) * 100)
                    : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900">
                  {formatWaehrung(budgetUebersicht.gesamtKostenfeststellung)}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {budgetUebersicht.gesamtKostenberechnung > 0
                    ? formatDifferenz(((budgetUebersicht.gesamtKostenfeststellung - budgetUebersicht.gesamtKostenberechnung) / budgetUebersicht.gesamtKostenberechnung) * 100)
                    : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {budgetUebersicht.gesamtKostenberechnung > 0 ? (
                    <span className={`font-medium ${
                      (budgetUebersicht.gesamtKostenfeststellung / budgetUebersicht.gesamtKostenberechnung * 100) > 100 ? 'text-red-600' :
                      (budgetUebersicht.gesamtKostenfeststellung / budgetUebersicht.gesamtKostenberechnung * 100) > 80 ? 'text-yellow-600' : ''
                    }`}>
                      {((budgetUebersicht.gesamtKostenfeststellung / budgetUebersicht.gesamtKostenberechnung) * 100).toFixed(1)}%
                    </span>
                  ) : '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          <span>KS = Kostenschätzung | KB = Kostenberechnung | KF = Kostenfeststellung (bezahlt)</span>
        </div>
      </div>

      {/* Bearbeitungs-Modal */}
      {modal.isOpen && modal.kategorie && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">
              {BUDGET_KATEGORIE_CONFIG[modal.kategorie].label} bearbeiten
            </h3>

            {modal.kategorie === 'weitereBaunebenkosten' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Geschätzte Baunebenkosten (netto)
                  </label>
                  <input
                    type="number"
                    value={editValues.weitereBaunebenkostenEstimate || 0}
                    onChange={(e) => setEditValues({
                      ...editValues,
                      weitereBaunebenkostenEstimate: parseFloat(e.target.value) || 0
                    })}
                    className="input w-full"
                    min="0"
                    step="1000"
                  />
                </div>
              </div>
            )}

            {modal.kategorie === 'finanzierung' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Geschätzte Finanzierungskosten (netto)
                  </label>
                  <input
                    type="number"
                    value={editValues.finanzierungEstimate || 0}
                    onChange={(e) => setEditValues({
                      ...editValues,
                      finanzierungEstimate: parseFloat(e.target.value) || 0
                    })}
                    className="input w-full"
                    min="0"
                    step="1000"
                  />
                </div>
              </div>
            )}

            {modal.kategorie === 'risikoreserve' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Risikoreserve (% vom Projektbudget)
                  </label>
                  <input
                    type="number"
                    value={editValues.risikoreservePercent || 0}
                    onChange={(e) => setEditValues({
                      ...editValues,
                      risikoreservePercent: parseFloat(e.target.value) || 0
                    })}
                    className="input w-full"
                    min="0"
                    max="50"
                    step="0.5"
                  />
                  {editValues.risikoreservePercent && editValues.risikoreservePercent > 0 && (
                    <p className="mt-1 text-sm text-gray-500">
                      = {formatWaehrung(projekt.projektbudgetFreigegeben * (editValues.risikoreservePercent / 100))}
                    </p>
                  )}
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
