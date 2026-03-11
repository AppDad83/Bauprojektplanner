'use client';

import React, { useState } from 'react';
import { Projekt, Nachtrag, NachtragsStatus } from '@/types';
import { formatDatum, formatWaehrung, generateId } from '@/lib/utils';

interface Props {
  projekt: Projekt;
  onUpdate: (projekt: Projekt) => void;
}

const StatusLabels: Record<NachtragsStatus, string> = {
  gestellt: 'Gestellt',
  in_pruefung: 'In Prüfung',
  genehmigt: 'Genehmigt',
  abgelehnt: 'Abgelehnt',
  teilweise_genehmigt: 'Teilweise genehmigt'
};

const StatusBadge: React.FC<{ status: NachtragsStatus }> = ({ status }) => {
  const colors: Record<NachtragsStatus, string> = {
    gestellt: 'badge-info',
    in_pruefung: 'badge-warning',
    genehmigt: 'badge-success',
    abgelehnt: 'badge-danger',
    teilweise_genehmigt: 'badge-warning'
  };
  return <span className={colors[status]}>{StatusLabels[status]}</span>;
};

const TabNachtraege: React.FC<Props> = ({ projekt, onUpdate }) => {
  const [zeigeModal, setZeigeModal] = useState(false);
  const [editNachtrag, setEditNachtrag] = useState<Nachtrag | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('alle');
  const [filterBeteiligter, setFilterBeteiligter] = useState<string>('alle');

  const [formData, setFormData] = useState({
    nachtragsnummer: '',
    datumStellung: '',
    beschreibung: '',
    betragNettoAngefragt: 0,
    status: 'gestellt' as NachtragsStatus,
    betragNettoGenehmigt: 0,
    genehmigtAm: '',
    abgelehntAm: '',
    fachplanerIdOderFachfirmaId: '',
    istFachplaner: true,
    notizen: ''
  });

  const alleBeteiligten = [
    ...projekt.fachplaner.map(fp => ({ id: fp.id, name: fp.firma, istFachplaner: true })),
    ...projekt.fachfirmen.map(ff => ({ id: ff.id, name: ff.firma, istFachplaner: false }))
  ];

  const gefilterteNachtraege = projekt.nachtraege.filter(n => {
    if (filterStatus !== 'alle' && n.status !== filterStatus) return false;
    if (filterBeteiligter !== 'alle' && n.fachplanerIdOderFachfirmaId !== filterBeteiligter) return false;
    return true;
  });

  const summeAngefragt = gefilterteNachtraege.reduce((s, n) => s + n.betragNettoAngefragt, 0);
  const summeGenehmigt = gefilterteNachtraege
    .filter(n => n.status === 'genehmigt' || n.status === 'teilweise_genehmigt')
    .reduce((s, n) => s + (n.betragNettoGenehmigt || 0), 0);

  const handleNeu = () => {
    setEditNachtrag(null);
    const nextNr = projekt.nachtraege.length + 1;
    setFormData({
      nachtragsnummer: `NT-${String(nextNr).padStart(3, '0')}`,
      datumStellung: new Date().toISOString().split('T')[0],
      beschreibung: '',
      betragNettoAngefragt: 0,
      status: 'gestellt',
      betragNettoGenehmigt: 0,
      genehmigtAm: '',
      abgelehntAm: '',
      fachplanerIdOderFachfirmaId: '',
      istFachplaner: true,
      notizen: ''
    });
    setZeigeModal(true);
  };

  const handleEdit = (n: Nachtrag) => {
    setEditNachtrag(n);
    setFormData({
      nachtragsnummer: n.nachtragsnummer,
      datumStellung: n.datumStellung,
      beschreibung: n.beschreibung,
      betragNettoAngefragt: n.betragNettoAngefragt,
      status: n.status,
      betragNettoGenehmigt: n.betragNettoGenehmigt || 0,
      genehmigtAm: n.genehmigtAm || '',
      abgelehntAm: n.abgelehntAm || '',
      fachplanerIdOderFachfirmaId: n.fachplanerIdOderFachfirmaId,
      istFachplaner: n.istFachplaner,
      notizen: n.notizen || ''
    });
    setZeigeModal(true);
  };

  const handleSave = () => {
    const beteiligterInfo = alleBeteiligten.find(b => b.id === formData.fachplanerIdOderFachfirmaId);

    if (editNachtrag) {
      const aktualisiert = projekt.nachtraege.map(n =>
        n.id === editNachtrag.id
          ? {
              ...n,
              ...formData,
              istFachplaner: beteiligterInfo?.istFachplaner ?? true,
              betragNettoGenehmigt: formData.betragNettoGenehmigt || undefined,
              genehmigtAm: formData.genehmigtAm || undefined,
              abgelehntAm: formData.abgelehntAm || undefined,
              notizen: formData.notizen || undefined
            }
          : n
      );
      onUpdate({ ...projekt, nachtraege: aktualisiert });
    } else {
      const neu: Nachtrag = {
        id: generateId(),
        projektId: projekt.id,
        nachtragsnummer: formData.nachtragsnummer,
        datumStellung: formData.datumStellung,
        beschreibung: formData.beschreibung,
        betragNettoAngefragt: formData.betragNettoAngefragt,
        status: formData.status,
        fachplanerIdOderFachfirmaId: formData.fachplanerIdOderFachfirmaId,
        istFachplaner: beteiligterInfo?.istFachplaner ?? true,
        notizen: formData.notizen || undefined
      };
      onUpdate({ ...projekt, nachtraege: [...projekt.nachtraege, neu] });
    }
    setZeigeModal(false);
  };

  const handleStatusChange = (nachtragId: string, neuerStatus: NachtragsStatus) => {
    const aktualisiert = projekt.nachtraege.map(n => {
      if (n.id !== nachtragId) return n;
      const updates: Partial<Nachtrag> = { status: neuerStatus };
      if (neuerStatus === 'genehmigt' || neuerStatus === 'teilweise_genehmigt') {
        updates.genehmigtAm = new Date().toISOString().split('T')[0];
        if (neuerStatus === 'genehmigt') {
          updates.betragNettoGenehmigt = n.betragNettoAngefragt;
        }
      } else if (neuerStatus === 'abgelehnt') {
        updates.abgelehntAm = new Date().toISOString().split('T')[0];
        updates.betragNettoGenehmigt = 0;
      }
      return { ...n, ...updates };
    });
    onUpdate({ ...projekt, nachtraege: aktualisiert });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Nachtrag wirklich löschen?')) {
      onUpdate({ ...projekt, nachtraege: projekt.nachtraege.filter(n => n.id !== id) });
    }
  };

  const getBeteiligterName = (id: string) => {
    return alleBeteiligten.find(b => b.id === id)?.name || 'Unbekannt';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Nachtragsmanagement</h2>
        <button onClick={handleNeu} className="btn-primary">+ Nachtrag anlegen</button>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-apleona-gray-600">Anzahl Nachträge</p>
          <p className="text-2xl font-bold text-apleona-navy">{gefilterteNachtraege.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-apleona-gray-600">Summe angefragt</p>
          <p className="text-2xl font-bold text-apleona-navy">{formatWaehrung(summeAngefragt)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-apleona-gray-600">Summe genehmigt</p>
          <p className="text-2xl font-bold text-status-green">{formatWaehrung(summeGenehmigt)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Status filtern</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field">
              <option value="alle">Alle Status</option>
              {Object.entries(StatusLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Fachplaner/Fachfirma filtern</label>
            <select value={filterBeteiligter} onChange={e => setFilterBeteiligter(e.target.value)} className="input-field">
              <option value="alle">Alle</option>
              {alleBeteiligten.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.istFachplaner ? 'FP' : 'FF'})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabelle */}
      {gefilterteNachtraege.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-apleona-gray-500">Keine Nachträge vorhanden.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-apleona-gray-200">
            <thead className="bg-apleona-navy">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Nr.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Datum</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Beschreibung</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Beteiligter</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase">Angefragt</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase">Genehmigt</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apleona-gray-200">
              {gefilterteNachtraege.map(n => (
                <tr key={n.id} className="hover:bg-apleona-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{n.nachtragsnummer}</td>
                  <td className="px-4 py-3 text-sm">{formatDatum(n.datumStellung)}</td>
                  <td className="px-4 py-3 text-sm max-w-xs truncate">{n.beschreibung}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={n.istFachplaner ? 'badge-info' : 'badge-success'}>
                      {getBeteiligterName(n.fachplanerIdOderFachfirmaId)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatWaehrung(n.betragNettoAngefragt)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    {n.betragNettoGenehmigt ? formatWaehrung(n.betragNettoGenehmigt) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <select
                      value={n.status}
                      onChange={e => handleStatusChange(n.id, e.target.value as NachtragsStatus)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      {Object.entries(StatusLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex space-x-2">
                      <button onClick={() => handleEdit(n)} className="text-apleona-navy hover:text-apleona-navy-dark">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(n.id)} className="text-apleona-red hover:text-apleona-red-dark">
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

      {/* Hinweis für Budgetauswirkung */}
      {summeGenehmigt > 0 && (
        <div className="card bg-amber-50 border-amber-200">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-amber-800">
              Genehmigte Nachträge erhöhen das Projektbudget um {formatWaehrung(summeGenehmigt)}.
              Bitte prüfen Sie, ob eine neue Projektbudget-Freigabe durch den Eigentümer erforderlich ist.
            </span>
          </div>
        </div>
      )}

      {/* Modal */}
      {zeigeModal && (
        <div className="modal-overlay" onClick={() => setZeigeModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">
              {editNachtrag ? 'Nachtrag bearbeiten' : 'Neuer Nachtrag'}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nachtragsnummer</label>
                  <input
                    type="text"
                    value={formData.nachtragsnummer}
                    onChange={e => setFormData({ ...formData, nachtragsnummer: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Datum der Stellung</label>
                  <input
                    type="date"
                    value={formData.datumStellung}
                    onChange={e => setFormData({ ...formData, datumStellung: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="label">Fachplaner / Fachfirma</label>
                <select
                  value={formData.fachplanerIdOderFachfirmaId}
                  onChange={e => setFormData({ ...formData, fachplanerIdOderFachfirmaId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Bitte wählen...</option>
                  <optgroup label="Fachplaner">
                    {projekt.fachplaner.map(fp => (
                      <option key={fp.id} value={fp.id}>{fp.firma}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Fachfirmen">
                    {projekt.fachfirmen.map(ff => (
                      <option key={ff.id} value={ff.id}>{ff.firma}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="label">Beschreibung</label>
                <textarea
                  value={formData.beschreibung}
                  onChange={e => setFormData({ ...formData, beschreibung: e.target.value })}
                  className="input-field"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Betrag angefragt (netto €)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.betragNettoAngefragt}
                    onChange={e => setFormData({ ...formData, betragNettoAngefragt: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as NachtragsStatus })}
                    className="input-field"
                  >
                    {Object.entries(StatusLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(formData.status === 'genehmigt' || formData.status === 'teilweise_genehmigt') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Genehmigter Betrag (netto €)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.betragNettoGenehmigt}
                      onChange={e => setFormData({ ...formData, betragNettoGenehmigt: parseFloat(e.target.value) || 0 })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Genehmigt am</label>
                    <input
                      type="date"
                      value={formData.genehmigtAm}
                      onChange={e => setFormData({ ...formData, genehmigtAm: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
              )}

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
                disabled={!formData.nachtragsnummer || !formData.beschreibung || !formData.fachplanerIdOderFachfirmaId}
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

export default TabNachtraege;
