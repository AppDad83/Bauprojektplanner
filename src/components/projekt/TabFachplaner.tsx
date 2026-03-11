'use client';

import React, { useState } from 'react';
import { Projekt, Fachplaner, Rechnung, Angebot, RechnungsTyp } from '@/types';
import { formatDatum, formatWaehrung, generateId } from '@/lib/utils';

interface Props {
  projekt: Projekt;
  onUpdate: (projekt: Projekt) => void;
}

const TabFachplaner: React.FC<Props> = ({ projekt, onUpdate }) => {
  const [zeigeModal, setZeigeModal] = useState(false);
  const [editFachplaner, setEditFachplaner] = useState<Fachplaner | null>(null);
  const [zeigeRechnungModal, setZeigeRechnungModal] = useState(false);
  const [aktiverFachplanerId, setAktiverFachplanerId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    firma: '',
    ansprechpartner: '',
    telefon: '',
    email: '',
    gewerkId: '',
    budgetGenehmigt: 0,
    notizen: ''
  });

  const [rechnungForm, setRechnungForm] = useState({
    rechnungsnummer: '',
    datum: '',
    betragNetto: 0,
    typ: 'teilrechnung' as RechnungsTyp
  });

  const handleNeu = () => {
    setEditFachplaner(null);
    setFormData({
      name: '', firma: '', ansprechpartner: '', telefon: '', email: '',
      gewerkId: '', budgetGenehmigt: 0, notizen: ''
    });
    setZeigeModal(true);
  };

  const handleEdit = (fp: Fachplaner) => {
    setEditFachplaner(fp);
    setFormData({
      name: fp.name,
      firma: fp.firma,
      ansprechpartner: fp.kontakt.ansprechpartner || '',
      telefon: fp.kontakt.telefon || '',
      email: fp.kontakt.email || '',
      gewerkId: fp.gewerkId || '',
      budgetGenehmigt: fp.budgetGenehmigt,
      notizen: fp.notizen || ''
    });
    setZeigeModal(true);
  };

  const handleSave = () => {
    const kontakt = {
      ansprechpartner: formData.ansprechpartner || undefined,
      telefon: formData.telefon || undefined,
      email: formData.email || undefined
    };

    if (editFachplaner) {
      const aktualisiert = projekt.fachplaner.map(fp =>
        fp.id === editFachplaner.id
          ? {
              ...fp,
              name: formData.name,
              firma: formData.firma,
              kontakt,
              gewerkId: formData.gewerkId || undefined,
              budgetGenehmigt: formData.budgetGenehmigt,
              notizen: formData.notizen || undefined
            }
          : fp
      );
      onUpdate({ ...projekt, fachplaner: aktualisiert });
    } else {
      const neu: Fachplaner = {
        id: generateId(),
        typ: 'fachplaner',
        name: formData.name,
        firma: formData.firma,
        kontakt,
        gewerkId: formData.gewerkId || undefined,
        angebote: [],
        vergabeEmpfehlung: {},
        budgetGenehmigt: formData.budgetGenehmigt,
        budgetHistorie: [],
        rechnungen: [],
        notizen: formData.notizen || undefined
      };
      onUpdate({ ...projekt, fachplaner: [...projekt.fachplaner, neu] });
    }
    setZeigeModal(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Fachplaner wirklich löschen?')) {
      onUpdate({ ...projekt, fachplaner: projekt.fachplaner.filter(fp => fp.id !== id) });
    }
  };

  const handleRechnungHinzufuegen = (fachplanerId: string) => {
    setAktiverFachplanerId(fachplanerId);
    setRechnungForm({ rechnungsnummer: '', datum: '', betragNetto: 0, typ: 'teilrechnung' });
    setZeigeRechnungModal(true);
  };

  const handleRechnungSave = () => {
    if (!aktiverFachplanerId) return;

    const neueRechnung: Rechnung = {
      id: generateId(),
      rechnungsnummer: rechnungForm.rechnungsnummer,
      datum: rechnungForm.datum,
      betragNetto: rechnungForm.betragNetto,
      typ: rechnungForm.typ,
      geprueft: false,
      freigegeben: false,
      bereitsInFeeAbgerechnet: false
    };

    const aktualisiert = projekt.fachplaner.map(fp =>
      fp.id === aktiverFachplanerId
        ? { ...fp, rechnungen: [...fp.rechnungen, neueRechnung] }
        : fp
    );
    onUpdate({ ...projekt, fachplaner: aktualisiert });
    setZeigeRechnungModal(false);
  };

  const toggleRechnungStatus = (fachplanerId: string, rechnungId: string, feld: 'geprueft' | 'freigegeben') => {
    const aktualisiert = projekt.fachplaner.map(fp => {
      if (fp.id !== fachplanerId) return fp;
      return {
        ...fp,
        rechnungen: fp.rechnungen.map(r =>
          r.id === rechnungId ? { ...r, [feld]: !r[feld] } : r
        )
      };
    });
    onUpdate({ ...projekt, fachplaner: aktualisiert });
  };

  const berechneAuslastung = (fp: Fachplaner) => {
    const summeRechnungen = fp.rechnungen.reduce((sum, r) => sum + r.betragNetto, 0);
    if (fp.budgetGenehmigt === 0) return 0;
    return (summeRechnungen / fp.budgetGenehmigt) * 100;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Fachplaner</h2>
        <button onClick={handleNeu} className="btn-primary">
          + Fachplaner hinzufügen
        </button>
      </div>

      {projekt.fachplaner.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-apleona-gray-500">Noch keine Fachplaner angelegt.</p>
          <button onClick={handleNeu} className="btn-primary mt-4">
            Ersten Fachplaner anlegen
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {projekt.fachplaner.map(fp => {
            const auslastung = berechneAuslastung(fp);
            const gewerk = projekt.gewerke.find(g => g.id === fp.gewerkId);
            const summeRechnungen = fp.rechnungen.reduce((s, r) => s + r.betragNetto, 0);

            return (
              <div key={fp.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="font-semibold text-lg">{fp.firma}</h3>
                      {auslastung > 100 && (
                        <span className="ml-2 badge-danger">Budget überschritten!</span>
                      )}
                      {auslastung > 80 && auslastung <= 100 && (
                        <span className="ml-2 badge-warning">Warnung: &gt;80% Budget</span>
                      )}
                    </div>
                    <p className="text-sm text-apleona-gray-600">{fp.name}</p>
                    {gewerk && (
                      <span className="badge-info mt-1">{gewerk.dinNummer} - {gewerk.bezeichnung}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-apleona-gray-500">Budget</p>
                      <p className="font-semibold">{formatWaehrung(fp.budgetGenehmigt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-apleona-gray-500">Rechnungen</p>
                      <p className="font-semibold">{formatWaehrung(summeRechnungen)}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setExpandedId(expandedId === fp.id ? null : fp.id)}
                        className="text-apleona-navy"
                      >
                        <svg className={`w-5 h-5 transform ${expandedId === fp.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button onClick={() => handleEdit(fp)} className="text-apleona-navy hover:text-apleona-navy-dark">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(fp.id)} className="text-apleona-red hover:text-apleona-red-dark">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Budget-Fortschrittsbalken */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-apleona-gray-600 mb-1">
                    <span>Budgetauslastung</span>
                    <span>{auslastung.toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${
                        auslastung > 100 ? 'bg-status-red' :
                        auslastung > 80 ? 'bg-status-yellow' : 'bg-status-green'
                      }`}
                      style={{ width: `${Math.min(auslastung, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Erweiterte Ansicht */}
                {expandedId === fp.id && (
                  <div className="mt-6 border-t border-apleona-gray-200 pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">Rechnungen</h4>
                      <button
                        onClick={() => handleRechnungHinzufuegen(fp.id)}
                        className="btn-secondary text-sm"
                      >
                        + Rechnung
                      </button>
                    </div>

                    {fp.rechnungen.length === 0 ? (
                      <p className="text-apleona-gray-500 text-sm">Keine Rechnungen vorhanden</p>
                    ) : (
                      <table className="min-w-full divide-y divide-apleona-gray-200">
                        <thead className="bg-apleona-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Nr.</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Datum</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Typ</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">Betrag netto</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-apleona-gray-500">Geprüft</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-apleona-gray-500">Freigegeben</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-apleona-gray-200">
                          {fp.rechnungen.map(r => (
                            <tr key={r.id} className={r.typ === 'schlussrechnung' ? 'schlussrechnung' : ''}>
                              <td className="px-3 py-2 text-sm">{r.rechnungsnummer}</td>
                              <td className="px-3 py-2 text-sm">{formatDatum(r.datum)}</td>
                              <td className="px-3 py-2 text-sm">
                                {r.typ === 'schlussrechnung' ? (
                                  <span className="badge-warning">Schlussrechnung</span>
                                ) : r.typ === 'anzahlung' ? 'Anzahlung' : 'Teilrechnung'}
                              </td>
                              <td className="px-3 py-2 text-sm text-right font-medium">
                                {formatWaehrung(r.betragNetto)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={r.geprueft}
                                  onChange={() => toggleRechnungStatus(fp.id, r.id, 'geprueft')}
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={r.freigegeben}
                                  onChange={() => toggleRechnungStatus(fp.id, r.id, 'freigegeben')}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* Kontaktdaten */}
                    <div className="mt-4 pt-4 border-t border-apleona-gray-200">
                      <h4 className="font-medium mb-2">Kontakt</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-apleona-gray-500">Ansprechpartner:</span>
                          <span className="ml-2">{fp.kontakt.ansprechpartner || '-'}</span>
                        </div>
                        <div>
                          <span className="text-apleona-gray-500">Telefon:</span>
                          <span className="ml-2">{fp.kontakt.telefon || '-'}</span>
                        </div>
                        <div>
                          <span className="text-apleona-gray-500">E-Mail:</span>
                          <span className="ml-2">{fp.kontakt.email || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fachplaner Modal */}
      {zeigeModal && (
        <div className="modal-overlay" onClick={() => setZeigeModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">
              {editFachplaner ? 'Fachplaner bearbeiten' : 'Neuer Fachplaner'}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Firma</label>
                  <input
                    type="text"
                    value={formData.firma}
                    onChange={e => setFormData({ ...formData, firma: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Name / Bezeichnung</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="label">Zugeordnetes Gewerk</label>
                <select
                  value={formData.gewerkId}
                  onChange={e => setFormData({ ...formData, gewerkId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Kein Gewerk zugeordnet</option>
                  {projekt.gewerke.map(g => (
                    <option key={g.id} value={g.id}>{g.dinNummer} - {g.bezeichnung}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Ansprechpartner</label>
                  <input
                    type="text"
                    value={formData.ansprechpartner}
                    onChange={e => setFormData({ ...formData, ansprechpartner: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Telefon</label>
                  <input
                    type="tel"
                    value={formData.telefon}
                    onChange={e => setFormData({ ...formData, telefon: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">E-Mail</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="label">Genehmigtes Budget (netto €)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.budgetGenehmigt}
                  onChange={e => setFormData({ ...formData, budgetGenehmigt: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                />
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
              <button onClick={() => setZeigeModal(false)} className="btn-secondary">Abbrechen</button>
              <button
                onClick={handleSave}
                disabled={!formData.firma || !formData.name}
                className="btn-primary disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rechnung Modal */}
      {zeigeRechnungModal && (
        <div className="modal-overlay" onClick={() => setZeigeRechnungModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Neue Rechnung</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Rechnungsnummer</label>
                  <input
                    type="text"
                    value={rechnungForm.rechnungsnummer}
                    onChange={e => setRechnungForm({ ...rechnungForm, rechnungsnummer: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Datum</label>
                  <input
                    type="date"
                    value={rechnungForm.datum}
                    onChange={e => setRechnungForm({ ...rechnungForm, datum: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Betrag netto (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rechnungForm.betragNetto}
                    onChange={e => setRechnungForm({ ...rechnungForm, betragNetto: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Typ</label>
                  <select
                    value={rechnungForm.typ}
                    onChange={e => setRechnungForm({ ...rechnungForm, typ: e.target.value as RechnungsTyp })}
                    className="input-field"
                  >
                    <option value="anzahlung">Anzahlung</option>
                    <option value="teilrechnung">Teilrechnung</option>
                    <option value="schlussrechnung">Schlussrechnung</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setZeigeRechnungModal(false)} className="btn-secondary">Abbrechen</button>
              <button
                onClick={handleRechnungSave}
                disabled={!rechnungForm.rechnungsnummer || !rechnungForm.datum}
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

export default TabFachplaner;
