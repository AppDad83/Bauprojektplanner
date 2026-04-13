'use client';

import React, { useState } from 'react';
import { Projekt, Gewerk, DIN_GEWERKE, Teilabnahme } from '@/types';
import { formatDatum, generateId, berechneGewaehrleistungsfrist } from '@/lib/utils';

interface Props {
  projekt: Projekt;
  onUpdate: (projekt: Projekt) => void;
}

const TabGewerke: React.FC<Props> = ({ projekt, onUpdate }) => {
  const [zeigeModal, setZeigeModal] = useState(false);
  const [editGewerk, setEditGewerk] = useState<Gewerk | null>(null);
  const [formData, setFormData] = useState({
    dinNummer: '',
    bezeichnung: '',
    endabnahmeDatum: '',
    notizen: ''
  });

  const handleNeuesGewerk = () => {
    setEditGewerk(null);
    setFormData({ dinNummer: '', bezeichnung: '', endabnahmeDatum: '', notizen: '' });
    setZeigeModal(true);
  };

  const handleEditGewerk = (gewerk: Gewerk) => {
    setEditGewerk(gewerk);
    setFormData({
      dinNummer: gewerk.dinNummer,
      bezeichnung: gewerk.bezeichnung,
      endabnahmeDatum: gewerk.endabnahmeDatum || '',
      notizen: gewerk.notizen || ''
    });
    setZeigeModal(true);
  };

  const handleDinSelect = (din: string) => {
    const gewerkInfo = DIN_GEWERKE.find(g => g.din === din);
    if (gewerkInfo) {
      setFormData({
        ...formData,
        dinNummer: gewerkInfo.din,
        bezeichnung: gewerkInfo.bezeichnung
      });
    }
  };

  const handleSave = () => {
    const gewaehrleistungsfristEnde = formData.endabnahmeDatum
      ? berechneGewaehrleistungsfrist(formData.endabnahmeDatum)
      : undefined;

    if (editGewerk) {
      const aktualisiert = projekt.gewerke.map(g =>
        g.id === editGewerk.id
          ? {
              ...g,
              dinNummer: formData.dinNummer,
              bezeichnung: formData.bezeichnung,
              endabnahmeDatum: formData.endabnahmeDatum || undefined,
              gewaehrleistungsfristEnde,
              notizen: formData.notizen || undefined
            }
          : g
      );
      onUpdate({ ...projekt, gewerke: aktualisiert });
    } else {
      const neuesGewerk: Gewerk = {
        id: generateId(),
        projektId: projekt.id,
        dinNummer: formData.dinNummer,
        bezeichnung: formData.bezeichnung,
        endabnahmeDatum: formData.endabnahmeDatum || undefined,
        teilabnahmen: [],
        gewaehrleistungsfristEnde,
        notizen: formData.notizen || undefined
      };
      onUpdate({ ...projekt, gewerke: [...projekt.gewerke, neuesGewerk] });
    }
    setZeigeModal(false);
  };

  const handleDelete = (gewerkId: string) => {
    if (window.confirm('Gewerk wirklich löschen?')) {
      onUpdate({
        ...projekt,
        gewerke: projekt.gewerke.filter(g => g.id !== gewerkId)
      });
    }
  };

  const handleTeilabnahmeHinzufuegen = (gewerkId: string) => {
    const datum = prompt('Datum der Teilabnahme (JJJJ-MM-TT):');
    if (!datum) return;

    const teilabnahme: Teilabnahme = {
      id: generateId(),
      datum,
      beschreibung: prompt('Beschreibung (optional):') || undefined
    };

    const aktualisiert = projekt.gewerke.map(g =>
      g.id === gewerkId
        ? { ...g, teilabnahmen: [...g.teilabnahmen, teilabnahme] }
        : g
    );
    onUpdate({ ...projekt, gewerke: aktualisiert });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Gewerke</h2>
        <button onClick={handleNeuesGewerk} className="btn-primary">
          + Gewerk hinzufügen
        </button>
      </div>

      {projekt.gewerke.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-apleona-gray-500">Noch keine Gewerke angelegt.</p>
          <button onClick={handleNeuesGewerk} className="btn-primary mt-4">
            Erstes Gewerk anlegen
          </button>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-apleona-gray-200">
            <thead className="bg-apleona-navy">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">DIN</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Bezeichnung</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Endabnahme</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Gewährl. bis</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Teilabnahmen</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apleona-gray-200">
              {projekt.gewerke.map(gewerk => (
                <tr key={gewerk.id} className="hover:bg-apleona-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{gewerk.dinNummer}</td>
                  <td className="px-4 py-3 text-sm">{gewerk.bezeichnung}</td>
                  <td className="px-4 py-3 text-sm">
                    {gewerk.endabnahmeDatum ? (
                      <span className="badge-success">{formatDatum(gewerk.endabnahmeDatum)}</span>
                    ) : (
                      <span className="text-apleona-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {gewerk.gewaehrleistungsfristEnde ? (
                      formatDatum(gewerk.gewaehrleistungsfristEnde)
                    ) : (
                      <span className="text-apleona-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <span>{gewerk.teilabnahmen.length}</span>
                      <button
                        onClick={() => handleTeilabnahmeHinzufuegen(gewerk.id)}
                        className="text-apleona-navy hover:text-apleona-navy-dark text-xs"
                      >
                        + Hinzufügen
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditGewerk(gewerk)}
                        className="text-apleona-navy hover:text-apleona-navy-dark"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(gewerk.id)}
                        className="text-apleona-red hover:text-apleona-red-dark"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {zeigeModal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setZeigeModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">
              {editGewerk ? 'Gewerk bearbeiten' : 'Neues Gewerk'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="label">DIN-Vorlage auswählen</label>
                <select
                  onChange={e => handleDinSelect(e.target.value)}
                  className="input-field"
                  defaultValue=""
                >
                  <option value="">Aus Vorlagen wählen...</option>
                  {DIN_GEWERKE.map(din => (
                    <option key={din.din} value={din.din}>
                      {din.din} - {din.bezeichnung}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">DIN-Nummer</label>
                  <input
                    type="text"
                    value={formData.dinNummer}
                    onChange={e => setFormData({ ...formData, dinNummer: e.target.value })}
                    className="input-field"
                    placeholder="z.B. 440"
                  />
                </div>
                <div>
                  <label className="label">Bezeichnung</label>
                  <input
                    type="text"
                    value={formData.bezeichnung}
                    onChange={e => setFormData({ ...formData, bezeichnung: e.target.value })}
                    className="input-field"
                    placeholder="z.B. Starkstromanlagen"
                  />
                </div>
              </div>

              <div>
                <label className="label">Endabnahme-Datum</label>
                <input
                  type="date"
                  value={formData.endabnahmeDatum}
                  onChange={e => setFormData({ ...formData, endabnahmeDatum: e.target.value })}
                  className="input-field"
                />
                <p className="text-xs text-apleona-gray-500 mt-1">
                  Die Gewährleistungsfrist wird automatisch berechnet (5 Jahre).
                </p>
              </div>

              <div>
                <label className="label">Notizen</label>
                <textarea
                  value={formData.notizen}
                  onChange={e => setFormData({ ...formData, notizen: e.target.value })}
                  className="input-field"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setZeigeModal(false)} className="btn-secondary">
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.dinNummer || !formData.bezeichnung}
                className="btn-primary disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabGewerke;
