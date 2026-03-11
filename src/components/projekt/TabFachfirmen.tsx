'use client';

import React, { useState } from 'react';
import { Projekt, Fachfirma, Rechnung, RechnungsTyp } from '@/types';
import { formatDatum, formatWaehrung, generateId } from '@/lib/utils';

interface Props {
  projekt: Projekt;
  onUpdate: (projekt: Projekt) => void;
}

const TabFachfirmen: React.FC<Props> = ({ projekt, onUpdate }) => {
  const [zeigeModal, setZeigeModal] = useState(false);
  const [editFachfirma, setEditFachfirma] = useState<Fachfirma | null>(null);
  const [zeigeRechnungModal, setZeigeRechnungModal] = useState(false);
  const [aktiveFachfirmaId, setAktiveFachfirmaId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    firma: '',
    ansprechpartner: '',
    telefon: '',
    email: '',
    gewerkId: '',
    budgetGenehmigt: 0,
    sicherheitseinbehaltNetto: 0,
    vertragserfuellungBuergschaft: false,
    vertragserfuellungUrkundeDatum: '',
    gewleistungseinbehaltNetto: 0,
    gewleistungBuergschaft: false,
    gewleistungUrkundeZurueck: false,
    gewleistungUrkundeDatum: '',
    notizen: ''
  });

  const [rechnungForm, setRechnungForm] = useState({
    rechnungsnummer: '',
    datum: '',
    betragNetto: 0,
    sicherheitseinbehaltNetto: 0,
    typ: 'teilrechnung' as RechnungsTyp
  });

  const handleNeu = () => {
    setEditFachfirma(null);
    setFormData({
      name: '', firma: '', ansprechpartner: '', telefon: '', email: '',
      gewerkId: '', budgetGenehmigt: 0, sicherheitseinbehaltNetto: 0,
      vertragserfuellungBuergschaft: false, vertragserfuellungUrkundeDatum: '',
      gewleistungseinbehaltNetto: 0, gewleistungBuergschaft: false,
      gewleistungUrkundeZurueck: false, gewleistungUrkundeDatum: '', notizen: ''
    });
    setZeigeModal(true);
  };

  const handleEdit = (ff: Fachfirma) => {
    setEditFachfirma(ff);
    setFormData({
      name: ff.name,
      firma: ff.firma,
      ansprechpartner: ff.kontakt.ansprechpartner || '',
      telefon: ff.kontakt.telefon || '',
      email: ff.kontakt.email || '',
      gewerkId: ff.gewerkId || '',
      budgetGenehmigt: ff.budgetGenehmigt,
      sicherheitseinbehaltNetto: ff.vertragserfuellung.sicherheitseinbehaltNetto || 0,
      vertragserfuellungBuergschaft: ff.vertragserfuellung.buergschaft.urkundeErhalten,
      vertragserfuellungUrkundeDatum: ff.vertragserfuellung.buergschaft.datum || '',
      gewleistungseinbehaltNetto: ff.gewaehrleistung.einbehaltNetto || 0,
      gewleistungBuergschaft: !!ff.gewaehrleistung.buergschaft,
      gewleistungUrkundeZurueck: ff.gewaehrleistung.buergschaft?.urkundeZurueckgesendet || false,
      gewleistungUrkundeDatum: ff.gewaehrleistung.buergschaft?.datum || '',
      notizen: ff.notizen || ''
    });
    setZeigeModal(true);
  };

  const handleSave = () => {
    const kontakt = {
      ansprechpartner: formData.ansprechpartner || undefined,
      telefon: formData.telefon || undefined,
      email: formData.email || undefined
    };

    const vertragserfuellung = {
      sicherheitseinbehaltNetto: formData.sicherheitseinbehaltNetto || undefined,
      buergschaft: {
        urkundeErhalten: formData.vertragserfuellungBuergschaft,
        datum: formData.vertragserfuellungUrkundeDatum || undefined
      }
    };

    const gewaehrleistung = {
      einbehaltNetto: formData.gewleistungseinbehaltNetto || undefined,
      buergschaft: {
        urkundeZurueckgesendet: formData.gewleistungUrkundeZurueck,
        datum: formData.gewleistungUrkundeDatum || undefined
      }
    };

    if (editFachfirma) {
      const aktualisiert = projekt.fachfirmen.map(ff =>
        ff.id === editFachfirma.id
          ? { ...ff, name: formData.name, firma: formData.firma, kontakt,
              gewerkId: formData.gewerkId || undefined, budgetGenehmigt: formData.budgetGenehmigt,
              vertragserfuellung, gewaehrleistung, notizen: formData.notizen || undefined }
          : ff
      );
      onUpdate({ ...projekt, fachfirmen: aktualisiert });
    } else {
      const neu: Fachfirma = {
        id: generateId(),
        typ: 'fachfirma',
        name: formData.name,
        firma: formData.firma,
        kontakt,
        gewerkId: formData.gewerkId || undefined,
        angebote: [],
        vergabeEmpfehlung: {},
        budgetGenehmigt: formData.budgetGenehmigt,
        budgetHistorie: [],
        rechnungen: [],
        vertragserfuellung,
        gewaehrleistung,
        notizen: formData.notizen || undefined
      };
      onUpdate({ ...projekt, fachfirmen: [...projekt.fachfirmen, neu] });
    }
    setZeigeModal(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Fachfirma wirklich löschen?')) {
      onUpdate({ ...projekt, fachfirmen: projekt.fachfirmen.filter(ff => ff.id !== id) });
    }
  };

  const handleRechnungHinzufuegen = (fachfirmaId: string) => {
    setAktiveFachfirmaId(fachfirmaId);
    setRechnungForm({ rechnungsnummer: '', datum: '', betragNetto: 0, sicherheitseinbehaltNetto: 0, typ: 'teilrechnung' });
    setZeigeRechnungModal(true);
  };

  const handleRechnungSave = () => {
    if (!aktiveFachfirmaId) return;

    const neueRechnung: Rechnung = {
      id: generateId(),
      rechnungsnummer: rechnungForm.rechnungsnummer,
      datum: rechnungForm.datum,
      betragNetto: rechnungForm.betragNetto,
      sicherheitseinbehaltNetto: rechnungForm.sicherheitseinbehaltNetto || undefined,
      typ: rechnungForm.typ,
      geprueft: false,
      freigegeben: false,
      bereitsInFeeAbgerechnet: false
    };

    const aktualisiert = projekt.fachfirmen.map(ff =>
      ff.id === aktiveFachfirmaId
        ? { ...ff, rechnungen: [...ff.rechnungen, neueRechnung] }
        : ff
    );
    onUpdate({ ...projekt, fachfirmen: aktualisiert });
    setZeigeRechnungModal(false);
  };

  const berechneAuslastung = (ff: Fachfirma) => {
    const summe = ff.rechnungen.reduce((s, r) => s + r.betragNetto, 0);
    if (ff.budgetGenehmigt === 0) return 0;
    return (summe / ff.budgetGenehmigt) * 100;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Fachfirmen</h2>
        <button onClick={handleNeu} className="btn-primary">+ Fachfirma hinzufügen</button>
      </div>

      {projekt.fachfirmen.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-apleona-gray-500">Noch keine Fachfirmen angelegt.</p>
          <button onClick={handleNeu} className="btn-primary mt-4">Erste Fachfirma anlegen</button>
        </div>
      ) : (
        <div className="space-y-4">
          {projekt.fachfirmen.map(ff => {
            const auslastung = berechneAuslastung(ff);
            const gewerk = projekt.gewerke.find(g => g.id === ff.gewerkId);
            const summeRechnungen = ff.rechnungen.reduce((s, r) => s + r.betragNetto, 0);
            const buergschaftOffen = ff.gewaehrleistung.buergschaft && !ff.gewaehrleistung.buergschaft.urkundeZurueckgesendet;

            return (
              <div key={ff.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <h3 className="font-semibold text-lg">{ff.firma}</h3>
                      {auslastung > 100 && <span className="badge-danger">Budget überschritten!</span>}
                      {auslastung > 80 && auslastung <= 100 && <span className="badge-warning">&gt;80% Budget</span>}
                      {buergschaftOffen && (
                        <span className="badge-warning">Bürgschaft zurücksenden!</span>
                      )}
                    </div>
                    <p className="text-sm text-apleona-gray-600">{ff.name}</p>
                    {gewerk && <span className="badge-info mt-1">{gewerk.dinNummer} - {gewerk.bezeichnung}</span>}
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-apleona-gray-500">Budget</p>
                      <p className="font-semibold">{formatWaehrung(ff.budgetGenehmigt)}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => setExpandedId(expandedId === ff.id ? null : ff.id)} className="text-apleona-navy">
                        <svg className={`w-5 h-5 transform ${expandedId === ff.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button onClick={() => handleEdit(ff)} className="text-apleona-navy hover:text-apleona-navy-dark">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(ff.id)} className="text-apleona-red hover:text-apleona-red-dark">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Fortschrittsbalken */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-apleona-gray-600 mb-1">
                    <span>Budgetauslastung</span>
                    <span>{auslastung.toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${auslastung > 100 ? 'bg-status-red' : auslastung > 80 ? 'bg-status-yellow' : 'bg-status-green'}`}
                      style={{ width: `${Math.min(auslastung, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Erweiterte Ansicht */}
                {expandedId === ff.id && (
                  <div className="mt-6 border-t border-apleona-gray-200 pt-4 space-y-4">
                    {/* Sicherheiten */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-apleona-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">Vertragserfüllung</h4>
                        {ff.vertragserfuellung.sicherheitseinbehaltNetto ? (
                          <p className="text-sm">Sicherheitseinbehalt: {formatWaehrung(ff.vertragserfuellung.sicherheitseinbehaltNetto)}</p>
                        ) : ff.vertragserfuellung.buergschaft.urkundeErhalten ? (
                          <p className="text-sm text-status-green">Bürgschaft erhalten {ff.vertragserfuellung.buergschaft.datum && `am ${formatDatum(ff.vertragserfuellung.buergschaft.datum)}`}</p>
                        ) : (
                          <p className="text-sm text-apleona-gray-500">Nicht festgelegt</p>
                        )}
                      </div>
                      <div className="p-3 bg-apleona-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">Gewährleistung</h4>
                        {ff.gewaehrleistung.einbehaltNetto ? (
                          <p className="text-sm">Einbehalt: {formatWaehrung(ff.gewaehrleistung.einbehaltNetto)}</p>
                        ) : ff.gewaehrleistung.buergschaft ? (
                          ff.gewaehrleistung.buergschaft.urkundeZurueckgesendet ? (
                            <p className="text-sm text-status-green">Bürgschaft zurückgesendet</p>
                          ) : (
                            <p className="text-sm text-status-yellow">Bürgschaft noch zurückzusenden!</p>
                          )
                        ) : (
                          <p className="text-sm text-apleona-gray-500">Nicht festgelegt</p>
                        )}
                      </div>
                    </div>

                    {/* Rechnungen */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">Rechnungen</h4>
                        <button onClick={() => handleRechnungHinzufuegen(ff.id)} className="btn-secondary text-sm">+ Rechnung</button>
                      </div>

                      {ff.rechnungen.length === 0 ? (
                        <p className="text-apleona-gray-500 text-sm">Keine Rechnungen vorhanden</p>
                      ) : (
                        <table className="min-w-full divide-y divide-apleona-gray-200">
                          <thead className="bg-apleona-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Nr.</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Datum</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Typ</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">Betrag</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">Einbehalt</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-apleona-gray-200">
                            {ff.rechnungen.map(r => (
                              <tr key={r.id} className={r.typ === 'schlussrechnung' ? 'schlussrechnung' : ''}>
                                <td className="px-3 py-2 text-sm">{r.rechnungsnummer}</td>
                                <td className="px-3 py-2 text-sm">{formatDatum(r.datum)}</td>
                                <td className="px-3 py-2 text-sm">
                                  {r.typ === 'schlussrechnung' ? <span className="badge-warning">Schlussrechnung</span> : r.typ}
                                </td>
                                <td className="px-3 py-2 text-sm text-right">{formatWaehrung(r.betragNetto)}</td>
                                <td className="px-3 py-2 text-sm text-right">{r.sicherheitseinbehaltNetto ? formatWaehrung(r.sicherheitseinbehaltNetto) : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fachfirma Modal */}
      {zeigeModal && (
        <div className="modal-overlay" onClick={() => setZeigeModal(false)}>
          <div className="modal-content p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">{editFachfirma ? 'Fachfirma bearbeiten' : 'Neue Fachfirma'}</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Firma</label>
                  <input type="text" value={formData.firma} onChange={e => setFormData({ ...formData, firma: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="label">Name / Bezeichnung</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field" />
                </div>
              </div>

              <div>
                <label className="label">Zugeordnetes Gewerk</label>
                <select value={formData.gewerkId} onChange={e => setFormData({ ...formData, gewerkId: e.target.value })} className="input-field">
                  <option value="">Kein Gewerk zugeordnet</option>
                  {projekt.gewerke.map(g => <option key={g.id} value={g.id}>{g.dinNummer} - {g.bezeichnung}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Genehmigtes Budget (netto €)</label>
                <input type="number" step="0.01" value={formData.budgetGenehmigt} onChange={e => setFormData({ ...formData, budgetGenehmigt: parseFloat(e.target.value) || 0 })} className="input-field" />
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Vertragserfüllung</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Sicherheitseinbehalt (netto €)</label>
                    <input type="number" step="0.01" value={formData.sicherheitseinbehaltNetto} onChange={e => setFormData({ ...formData, sicherheitseinbehaltNetto: parseFloat(e.target.value) || 0 })} className="input-field" />
                  </div>
                  <div>
                    <label className="label">Bürgschaft</label>
                    <div className="flex items-center mt-2">
                      <input type="checkbox" checked={formData.vertragserfuellungBuergschaft} onChange={e => setFormData({ ...formData, vertragserfuellungBuergschaft: e.target.checked })} className="mr-2" />
                      <span className="text-sm">Urkunde erhalten</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Gewährleistung</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Einbehalt (netto €)</label>
                    <input type="number" step="0.01" value={formData.gewleistungseinbehaltNetto} onChange={e => setFormData({ ...formData, gewleistungseinbehaltNetto: parseFloat(e.target.value) || 0 })} className="input-field" />
                  </div>
                  <div>
                    <label className="label">Bürgschaft</label>
                    <div className="flex items-center mt-2">
                      <input type="checkbox" checked={formData.gewleistungUrkundeZurueck} onChange={e => setFormData({ ...formData, gewleistungUrkundeZurueck: e.target.checked })} className="mr-2" />
                      <span className="text-sm">Urkunde zurückgesendet</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setZeigeModal(false)} className="btn-secondary">Abbrechen</button>
              <button onClick={handleSave} disabled={!formData.firma || !formData.name} className="btn-primary disabled:opacity-50">Speichern</button>
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
                  <input type="text" value={rechnungForm.rechnungsnummer} onChange={e => setRechnungForm({ ...rechnungForm, rechnungsnummer: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="label">Datum</label>
                  <input type="date" value={rechnungForm.datum} onChange={e => setRechnungForm({ ...rechnungForm, datum: e.target.value })} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Betrag netto (€)</label>
                  <input type="number" step="0.01" value={rechnungForm.betragNetto} onChange={e => setRechnungForm({ ...rechnungForm, betragNetto: parseFloat(e.target.value) || 0 })} className="input-field" />
                </div>
                <div>
                  <label className="label">Sicherheitseinbehalt (€)</label>
                  <input type="number" step="0.01" value={rechnungForm.sicherheitseinbehaltNetto} onChange={e => setRechnungForm({ ...rechnungForm, sicherheitseinbehaltNetto: parseFloat(e.target.value) || 0 })} className="input-field" />
                </div>
                <div>
                  <label className="label">Typ</label>
                  <select value={rechnungForm.typ} onChange={e => setRechnungForm({ ...rechnungForm, typ: e.target.value as RechnungsTyp })} className="input-field">
                    <option value="anzahlung">Anzahlung</option>
                    <option value="teilrechnung">Teilrechnung</option>
                    <option value="schlussrechnung">Schlussrechnung</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setZeigeRechnungModal(false)} className="btn-secondary">Abbrechen</button>
              <button onClick={handleRechnungSave} disabled={!rechnungForm.rechnungsnummer || !rechnungForm.datum} className="btn-primary disabled:opacity-50">Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabFachfirmen;
