'use client';

import React, { useState } from 'react';
import { Projekt, ProjektStatus, AHO_PHASEN, BudgetHistorieEintrag, PROJEKT_STATUS_CONFIG } from '@/types';
import { formatDatum, formatWaehrung, generateId, berechneBudgetUebersicht } from '@/lib/utils';
import { exportProjektZuExcel } from '@/lib/excelExport';

interface Props {
  projekt: Projekt;
  onUpdate: (projekt: Projekt) => void;
}

const TabUebersicht: React.FC<Props> = ({ projekt, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...projekt });
  const [neuerEigentuemer, setNeuerEigentuemer] = useState('');
  const [zeigeBudgetModal, setZeigeBudgetModal] = useState(false);
  const [neuesBudget, setNeuesBudget] = useState({ betrag: '', freigabeDatum: '' });
  const [editierendesBudgetId, setEditierendesBudgetId] = useState<string | null>(null);
  const [editBudgetData, setEditBudgetData] = useState({ betrag: '', freigabeDatum: '' });

  // Berechne das freigegebene Budget als Summe aller genehmigten Budgethistorie-Einträge
  const berechnetesFreigegebenesbudget = projekt.projektbudgetHistorie
    .filter(e => e.freigabeDatum && !e.abgelehntAm)
    .reduce((sum, e) => sum + e.betragNetto, 0);

  const budgetUebersicht = berechneBudgetUebersicht({
    ...projekt,
    projektbudgetFreigegeben: berechnetesFreigegebenesbudget
  });

  const handleSave = () => {
    onUpdate({
      ...formData,
      geaendertAm: new Date().toISOString()
    });
    setIsEditing(false);
  };

  const handleEigentuemerHinzufuegen = () => {
    if (neuerEigentuemer.trim()) {
      setFormData({
        ...formData,
        eigentuemer: [...formData.eigentuemer, neuerEigentuemer.trim()]
      });
      setNeuerEigentuemer('');
    }
  };

  const handleEigentuemerEntfernen = (index: number) => {
    setFormData({
      ...formData,
      eigentuemer: formData.eigentuemer.filter((_, i) => i !== index)
    });
  };

  const handleBudgetHinzufuegen = () => {
    const betrag = parseFloat(neuesBudget.betrag);
    if (isNaN(betrag) || !neuesBudget.freigabeDatum) return;

    const neuerEintrag: BudgetHistorieEintrag = {
      id: generateId(),
      datum: new Date().toISOString().split('T')[0],
      betragNetto: betrag,
      freigabeDatum: neuesBudget.freigabeDatum
    };

    const neueHistorie = [...projekt.projektbudgetHistorie, neuerEintrag];
    const neuesSummenBudget = neueHistorie
      .filter(e => e.freigabeDatum && !e.abgelehntAm)
      .reduce((sum, e) => sum + e.betragNetto, 0);

    const aktualisiert = {
      ...projekt,
      projektbudgetHistorie: neueHistorie,
      projektbudgetFreigegeben: neuesSummenBudget
    };

    onUpdate(aktualisiert);
    setZeigeBudgetModal(false);
    setNeuesBudget({ betrag: '', freigabeDatum: '' });
  };

  const handleBudgetBearbeiten = (eintrag: BudgetHistorieEintrag) => {
    setEditierendesBudgetId(eintrag.id);
    setEditBudgetData({
      betrag: eintrag.betragNetto.toString(),
      freigabeDatum: eintrag.freigabeDatum || ''
    });
  };

  const handleBudgetSpeichern = () => {
    if (!editierendesBudgetId) return;
    const betrag = parseFloat(editBudgetData.betrag);
    if (isNaN(betrag)) return;

    const neueHistorie = projekt.projektbudgetHistorie.map(e =>
      e.id === editierendesBudgetId
        ? { ...e, betragNetto: betrag, freigabeDatum: editBudgetData.freigabeDatum || undefined }
        : e
    );

    const neuesSummenBudget = neueHistorie
      .filter(e => e.freigabeDatum && !e.abgelehntAm)
      .reduce((sum, e) => sum + e.betragNetto, 0);

    onUpdate({
      ...projekt,
      projektbudgetHistorie: neueHistorie,
      projektbudgetFreigegeben: neuesSummenBudget
    });
    setEditierendesBudgetId(null);
  };

  const handleBudgetLoeschen = (id: string) => {
    const neueHistorie = projekt.projektbudgetHistorie.filter(e => e.id !== id);
    const neuesSummenBudget = neueHistorie
      .filter(e => e.freigabeDatum && !e.abgelehntAm)
      .reduce((sum, e) => sum + e.betragNetto, 0);

    onUpdate({
      ...projekt,
      projektbudgetHistorie: neueHistorie,
      projektbudgetFreigegeben: neuesSummenBudget
    });
  };

  return (
    <div className="space-y-6">
      {/* Projektstatus-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-apleona-gray-600">Projektstatus</p>
          <div className="flex items-center mt-2">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              PROJEKT_STATUS_CONFIG[projekt.status]?.color || 'bg-status-gray'
            } ${PROJEKT_STATUS_CONFIG[projekt.status]?.textColor || 'text-gray-800'}`}>
              {PROJEKT_STATUS_CONFIG[projekt.status]?.label || projekt.status}
            </span>
          </div>
        </div>
        <div className="card">
          <p className="text-sm text-apleona-gray-600">Budget-Status</p>
          <div className="flex items-center mt-2">
            <span className={`w-6 h-6 rounded-full ${
              budgetUebersicht.ampel === 'gruen' ? 'bg-status-green' :
              budgetUebersicht.ampel === 'gelb' ? 'bg-status-yellow' : 'bg-status-red'
            }`} />
            <span className="ml-2 font-semibold">{budgetUebersicht.auslastungProzent.toFixed(0)}%</span>
          </div>
        </div>
        <div className="card">
          <p className="text-sm text-apleona-gray-600">Fee</p>
          <p className="text-2xl font-bold text-apleona-navy mt-1">{projekt.feePercent}%</p>
        </div>
        <div className="card">
          <p className="text-sm text-apleona-gray-600">Freigegebenes Budget (Summe)</p>
          <p className="text-2xl font-bold text-apleona-navy mt-1">
            {formatWaehrung(berechnetesFreigegebenesbudget)}
          </p>
        </div>
      </div>

      {/* Excel-Export */}
      <div className="flex justify-end">
        <button
          onClick={() => exportProjektZuExcel(projekt)}
          className="btn-secondary flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Projektdokumentation exportieren (Excel)
        </button>
      </div>

      {/* Projektdetails */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Projektdetails</h2>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="btn-secondary text-sm">
              Bearbeiten
            </button>
          ) : (
            <div className="space-x-2">
              <button onClick={() => setIsEditing(false)} className="btn-secondary text-sm">
                Abbrechen
              </button>
              <button onClick={handleSave} className="btn-primary text-sm">
                Speichern
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Projektname</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Projektnummer (Eigentümer)</label>
              <input
                type="text"
                value={formData.projektnummerEigentuemer}
                onChange={e => setFormData({ ...formData, projektnummerEigentuemer: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Interne Projektnummer</label>
              <input
                type="text"
                value={formData.projektnummerApleona}
                onChange={e => setFormData({ ...formData, projektnummerApleona: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Liegenschaft/Adresse</label>
              <input
                type="text"
                value={formData.liegenschaftAdresse}
                onChange={e => setFormData({ ...formData, liegenschaftAdresse: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Projektstatus</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as ProjektStatus })}
                className="input-field"
              >
                <option value="geplant">Geplant</option>
                <option value="beauftragt">Beauftragt</option>
                <option value="abgelehnt">Abgelehnt</option>
                <option value="abgeschlossen">Abgeschlossen</option>
                <option value="abgerechnet">Abgerechnet</option>
              </select>
            </div>
            <div>
              <label className="label">Aktuelle Phase</label>
              <select
                value={formData.aktuellePhase}
                onChange={e => setFormData({ ...formData, aktuellePhase: e.target.value as any })}
                className="input-field"
              >
                {AHO_PHASEN.map(phase => (
                  <option key={phase} value={phase}>{phase}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Fee %</label>
              <input
                type="number"
                step="0.1"
                value={formData.feePercent}
                onChange={e => setFormData({ ...formData, feePercent: parseFloat(e.target.value) || 0 })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Startdatum (Soll)</label>
              <input
                type="date"
                value={formData.startDatumSoll || ''}
                onChange={e => setFormData({ ...formData, startDatumSoll: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Startdatum (Ist)</label>
              <input
                type="date"
                value={formData.startDatumIst || ''}
                onChange={e => setFormData({ ...formData, startDatumIst: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Enddatum (Soll)</label>
              <input
                type="date"
                value={formData.endDatumSoll || ''}
                onChange={e => setFormData({ ...formData, endDatumSoll: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Enddatum (Ist)</label>
              <input
                type="date"
                value={formData.endDatumIst || ''}
                onChange={e => setFormData({ ...formData, endDatumIst: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Beschreibung</label>
              <textarea
                value={formData.beschreibung || ''}
                onChange={e => setFormData({ ...formData, beschreibung: e.target.value })}
                className="input-field"
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Eigentümer</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.eigentuemer.map((e, i) => (
                  <span key={i} className="badge-info flex items-center">
                    {e}
                    <button
                      onClick={() => handleEigentuemerEntfernen(i)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={neuerEigentuemer}
                  onChange={e => setNeuerEigentuemer(e.target.value)}
                  placeholder="Name hinzufügen"
                  className="input-field flex-1"
                />
                <button onClick={handleEigentuemerHinzufuegen} className="btn-secondary">
                  +
                </button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="label">Notizen</label>
              <textarea
                value={formData.notizen || ''}
                onChange={e => setFormData({ ...formData, notizen: e.target.value })}
                className="input-field"
                rows={3}
              />
            </div>
            <div className="md:col-span-2 border-t pt-4 mt-2">
              <h3 className="font-semibold text-apleona-gray-700 mb-3">Regelungen</h3>
            </div>
            <div className="md:col-span-2">
              <label className="label">Freigabe-Regelung</label>
              <textarea
                value={formData.freigabeRegelung || ''}
                onChange={e => setFormData({ ...formData, freigabeRegelung: e.target.value })}
                className="input-field"
                rows={2}
                placeholder="z.B. Freigabegrenzen, Genehmigungsprozess..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Rechnungsregelung</label>
              <textarea
                value={formData.rechnungsRegelung || ''}
                onChange={e => setFormData({ ...formData, rechnungsRegelung: e.target.value })}
                className="input-field"
                rows={2}
                placeholder="z.B. Zahlungsfristen, Rechnungsadresse..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Fee-Regelung</label>
              <textarea
                value={formData.feeRegelung || ''}
                onChange={e => setFormData({ ...formData, feeRegelung: e.target.value })}
                className="input-field"
                rows={2}
                placeholder="z.B. Fee-Basis, Abrechnungsmodalitäten..."
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-apleona-gray-500">Projektname</p>
              <p className="font-medium">{projekt.name}</p>
            </div>
            <div>
              <p className="text-sm text-apleona-gray-500">Projektnummer (Eigentümer)</p>
              <p className="font-medium">{projekt.projektnummerEigentuemer || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-apleona-gray-500">Interne Projektnummer</p>
              <p className="font-medium">{projekt.projektnummerApleona || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-apleona-gray-500">Liegenschaft/Adresse</p>
              <p className="font-medium">{projekt.liegenschaftAdresse || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-apleona-gray-500">Eigentümer</p>
              <p className="font-medium">
                {projekt.eigentuemer.length > 0 ? projekt.eigentuemer.join(', ') : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-apleona-gray-500">Aktuelle Phase</p>
              <p className="font-medium">{projekt.aktuellePhase}</p>
            </div>
            <div>
              <p className="text-sm text-apleona-gray-500">Zeitraum (Soll)</p>
              <p className="font-medium">
                {formatDatum(projekt.startDatumSoll)} - {formatDatum(projekt.endDatumSoll)}
              </p>
            </div>
            <div>
              <p className="text-sm text-apleona-gray-500">Zeitraum (Ist)</p>
              <p className="font-medium">
                {formatDatum(projekt.startDatumIst)} - {formatDatum(projekt.endDatumIst)}
              </p>
            </div>
            {projekt.beschreibung && (
              <div className="md:col-span-2">
                <p className="text-sm text-apleona-gray-500">Beschreibung</p>
                <p className="font-medium">{projekt.beschreibung}</p>
              </div>
            )}
            {projekt.notizen && (
              <div className="md:col-span-2">
                <p className="text-sm text-apleona-gray-500">Notizen</p>
                <p className="font-medium whitespace-pre-wrap">{projekt.notizen}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Regelungen */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Regelungen</h2>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <div>
            <p className="text-sm text-apleona-gray-500">Freigabe-Regelung</p>
            <p className="font-medium whitespace-pre-wrap">{projekt.freigabeRegelung || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-apleona-gray-500">Rechnungsregelung</p>
            <p className="font-medium whitespace-pre-wrap">{projekt.rechnungsRegelung || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-apleona-gray-500">Fee-Regelung</p>
            <p className="font-medium whitespace-pre-wrap">{projekt.feeRegelung || '-'}</p>
          </div>
        </div>
      </div>

      {/* Budget-Historie */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold">Zusätzliche Budgets</h2>
            <p className="text-sm text-apleona-gray-500">
              Freigegebenes Gesamtbudget: {formatWaehrung(berechnetesFreigegebenesbudget)}
            </p>
          </div>
          <button
            onClick={() => setZeigeBudgetModal(true)}
            className="btn-primary text-sm"
          >
            Zusätzliches Budget
          </button>
        </div>

        {projekt.projektbudgetHistorie.length === 0 ? (
          <p className="text-apleona-gray-500 text-center py-4">
            Noch keine zusätzlichen Budgets erfasst.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-apleona-gray-200">
            <thead className="bg-apleona-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-apleona-gray-500 uppercase">Datum</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-apleona-gray-500 uppercase">Betrag netto</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-apleona-gray-500 uppercase">Freigabe</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-apleona-gray-500 uppercase">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apleona-gray-200">
              {projekt.projektbudgetHistorie.map(eintrag => (
                <tr key={eintrag.id}>
                  <td className="px-4 py-2 text-sm">{formatDatum(eintrag.datum)}</td>
                  <td className="px-4 py-2 text-sm font-medium">
                    {editierendesBudgetId === eintrag.id ? (
                      <input
                        type="number"
                        value={editBudgetData.betrag}
                        onChange={e => setEditBudgetData({ ...editBudgetData, betrag: e.target.value })}
                        className="input-field w-32"
                      />
                    ) : (
                      formatWaehrung(eintrag.betragNetto)
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {editierendesBudgetId === eintrag.id ? (
                      <input
                        type="date"
                        value={editBudgetData.freigabeDatum}
                        onChange={e => setEditBudgetData({ ...editBudgetData, freigabeDatum: e.target.value })}
                        className="input-field w-40"
                      />
                    ) : eintrag.abgelehntAm ? (
                      <span className="badge-danger">Abgelehnt {formatDatum(eintrag.abgelehntAm)}</span>
                    ) : eintrag.freigabeDatum ? (
                      <span className="badge-success">Freigegeben {formatDatum(eintrag.freigabeDatum)}</span>
                    ) : (
                      <span className="badge-warning">Ausstehend</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-right">
                    {editierendesBudgetId === eintrag.id ? (
                      <div className="space-x-2">
                        <button
                          onClick={handleBudgetSpeichern}
                          className="text-status-green hover:underline text-sm"
                        >
                          Speichern
                        </button>
                        <button
                          onClick={() => setEditierendesBudgetId(null)}
                          className="text-apleona-gray-500 hover:underline text-sm"
                        >
                          Abbrechen
                        </button>
                      </div>
                    ) : (
                      <div className="space-x-2">
                        <button
                          onClick={() => handleBudgetBearbeiten(eintrag)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleBudgetLoeschen(eintrag.id)}
                          className="text-status-red hover:underline text-sm"
                        >
                          Löschen
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Budget-Modal */}
      {zeigeBudgetModal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setZeigeBudgetModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Zusätzliches Budget hinzufügen</h2>
            <p className="text-sm text-apleona-gray-500 mb-4">
              Dieses Budget wird zum freigegebenen Gesamtbudget addiert.
            </p>
            <div className="space-y-4">
              <div>
                <label className="label">Zusätzlicher Betrag netto (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={neuesBudget.betrag}
                  onChange={e => setNeuesBudget({ ...neuesBudget, betrag: e.target.value })}
                  className="input-field"
                  placeholder="z.B. 50000"
                />
              </div>
              <div>
                <label className="label">Freigabedatum</label>
                <input
                  type="date"
                  value={neuesBudget.freigabeDatum}
                  onChange={e => setNeuesBudget({ ...neuesBudget, freigabeDatum: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setZeigeBudgetModal(false)} className="btn-secondary">
                Abbrechen
              </button>
              <button onClick={handleBudgetHinzufuegen} className="btn-primary">
                Budget hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabUebersicht;
