'use client';

import React, { useState, useEffect } from 'react';
import { Projekt, FeeRechnung, FeeHistorieEintrag, Rechnung } from '@/types';
import { formatDatum, formatWaehrung, generateId } from '@/lib/utils';

interface Props {
  projekt: Projekt;
  onUpdate: (projekt: Projekt) => void;
}

// Erweiterte Rechnung mit Metadaten
interface ErweiterteRechnung extends Rechnung {
  beteiligterName: string;
  beteiligterTyp: string;
  beteiligterId: string;
}

const TabFee: React.FC<Props> = ({ projekt, onUpdate }) => {
  const [zeigeModal, setZeigeModal] = useState(false);
  const [zeigeFeeModal, setZeigeFeeModal] = useState(false);
  const [neuerFeePercent, setNeuerFeePercent] = useState(projekt.feePercent.toString());
  const [feeGrund, setFeeGrund] = useState('');
  const [gueltigAbDatum, setGueltigAbDatum] = useState(new Date().toISOString().split('T')[0]);

  const [formData, setFormData] = useState({
    rechnungsnummer: '',
    datum: '',
    bezugRechnungIds: [] as string[],
    notizen: ''
  });

  // Individuelle Fee-Sätze pro Rechnung im Modal
  const [feeProRechnung, setFeeProRechnung] = useState<{ [id: string]: number }>({});
  const [globalerFeeSatz, setGlobalerFeeSatz] = useState(projekt.feePercent);

  // Alle Rechnungen von Fachplanern und Fachfirmen
  const alleRechnungen: ErweiterteRechnung[] = [
    ...projekt.fachplaner.flatMap(fp =>
      fp.rechnungen.map(r => ({
        ...r,
        beteiligterName: fp.firma,
        beteiligterTyp: 'Fachplaner',
        beteiligterId: fp.id
      }))
    ),
    ...projekt.fachfirmen.flatMap(ff =>
      ff.rechnungen.map(r => ({
        ...r,
        beteiligterName: ff.firma,
        beteiligterTyp: 'Fachfirma',
        beteiligterId: ff.id
      }))
    )
  ];

  // Initialisiere feeProRechnung wenn Modal geöffnet wird
  useEffect(() => {
    if (zeigeModal) {
      const initial: { [id: string]: number } = {};
      alleRechnungen.forEach(r => {
        initial[r.id] = projekt.feePercent;
      });
      setFeeProRechnung(initial);
      setGlobalerFeeSatz(projekt.feePercent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zeigeModal]);

  // Nur freigegebene und nicht-abgerechnete für Auswahl
  const auswaehlbareRechnungen = alleRechnungen.filter(r =>
    !r.bereitsInFeeAbgerechnet && r.freigegeben
  );

  // Bereits abgerechnete Rechnungen
  const abgerechneteRechnungen = alleRechnungen.filter(r =>
    r.bereitsInFeeAbgerechnet && r.freigegeben
  );

  const summeNichtAbgerechnet = auswaehlbareRechnungen.reduce((s, r) => s + r.betragNetto, 0);
  const offenerFeeBetrag = summeNichtAbgerechnet * (projekt.feePercent / 100);

  const handleFeeAendern = () => {
    const neuerWert = parseFloat(neuerFeePercent);
    if (isNaN(neuerWert)) return;

    const eintrag: FeeHistorieEintrag = {
      id: generateId(),
      datum: new Date().toISOString().split('T')[0],
      gueltigAb: gueltigAbDatum,
      feePercent: neuerWert,
      grund: feeGrund || undefined
    };

    onUpdate({
      ...projekt,
      feePercent: neuerWert,
      feeHistorie: [...projekt.feeHistorie, eintrag]
    });
    setZeigeFeeModal(false);
    setFeeGrund('');
    setGueltigAbDatum(new Date().toISOString().split('T')[0]);
  };

  const handleRechnungErstellen = () => {
    if (formData.bezugRechnungIds.length === 0) return;

    const bezugRechnungen = alleRechnungen.filter(r => formData.bezugRechnungIds.includes(r.id));

    // Berechne Betrag basierend auf individuellen Fee-Sätzen
    let betragNetto = 0;
    const feePerRechnungMap: { [rechnungId: string]: number } = {};

    bezugRechnungen.forEach(r => {
      const feeSatz = feeProRechnung[r.id] ?? projekt.feePercent;
      feePerRechnungMap[r.id] = feeSatz;
      betragNetto += r.betragNetto * (feeSatz / 100);
    });

    const neueRechnung: FeeRechnung = {
      id: generateId(),
      projektId: projekt.id,
      rechnungsnummer: formData.rechnungsnummer,
      datum: formData.datum,
      betragNetto,
      bezugRechnungIds: formData.bezugRechnungIds,
      feePerRechnung: feePerRechnungMap,
      feePercent: projekt.feePercent, // Legacy/Fallback
      notizen: formData.notizen || undefined
    };

    // Markiere bezogene Rechnungen als abgerechnet
    const aktualisiert = { ...projekt };
    aktualisiert.fachplaner = aktualisiert.fachplaner.map(fp => ({
      ...fp,
      rechnungen: fp.rechnungen.map(r =>
        formData.bezugRechnungIds.includes(r.id)
          ? { ...r, bereitsInFeeAbgerechnet: true }
          : r
      )
    }));
    aktualisiert.fachfirmen = aktualisiert.fachfirmen.map(ff => ({
      ...ff,
      rechnungen: ff.rechnungen.map(r =>
        formData.bezugRechnungIds.includes(r.id)
          ? { ...r, bereitsInFeeAbgerechnet: true }
          : r
      )
    }));
    aktualisiert.feeRechnungen = [...aktualisiert.feeRechnungen, neueRechnung];

    onUpdate(aktualisiert);
    setZeigeModal(false);
    setFormData({ rechnungsnummer: '', datum: '', bezugRechnungIds: [], notizen: '' });
  };

  const toggleBezugRechnung = (rechnungId: string) => {
    setFormData(prev => ({
      ...prev,
      bezugRechnungIds: prev.bezugRechnungIds.includes(rechnungId)
        ? prev.bezugRechnungIds.filter(id => id !== rechnungId)
        : [...prev.bezugRechnungIds, rechnungId]
    }));
  };

  const toggleAlleAuswaehlen = () => {
    if (formData.bezugRechnungIds.length === auswaehlbareRechnungen.length) {
      setFormData(prev => ({ ...prev, bezugRechnungIds: [] }));
    } else {
      setFormData(prev => ({ ...prev, bezugRechnungIds: auswaehlbareRechnungen.map(r => r.id) }));
    }
  };

  const handleFeeFuerAlleSetzen = () => {
    const neueWerte: { [id: string]: number } = {};
    alleRechnungen.forEach(r => {
      neueWerte[r.id] = globalerFeeSatz;
    });
    setFeeProRechnung(neueWerte);
  };

  const berechneBezugSumme = () => {
    return alleRechnungen
      .filter(r => formData.bezugRechnungIds.includes(r.id))
      .reduce((s, r) => s + r.betragNetto, 0);
  };

  const berechneFeeSumme = () => {
    return alleRechnungen
      .filter(r => formData.bezugRechnungIds.includes(r.id))
      .reduce((s, r) => {
        const feeSatz = feeProRechnung[r.id] ?? projekt.feePercent;
        return s + r.betragNetto * (feeSatz / 100);
      }, 0);
  };

  const getBezugRechnungenFuerFeeRechnung = (feeRechnung: FeeRechnung) => {
    return alleRechnungen.filter(r => feeRechnung.bezugRechnungIds.includes(r.id));
  };

  // Historien-Anzeige mit gueltigAb
  const renderHistorie = () => {
    return projekt.feeHistorie.slice(-5).reverse().map(e => (
      <div key={e.id} className="text-sm text-apleona-gray-600 flex justify-between">
        <span>
          {formatDatum(e.gueltigAb || e.datum)}: {e.feePercent}%
          {e.gueltigAb && e.gueltigAb !== e.datum && (
            <span className="text-apleona-gray-400 ml-1">(erstellt: {formatDatum(e.datum)})</span>
          )}
        </span>
        {e.grund && <span className="text-apleona-gray-400">{e.grund}</span>}
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Fee-Abrechnung</h2>
        <button onClick={() => setZeigeModal(true)} className="btn-primary" disabled={auswaehlbareRechnungen.length === 0}>
          + Fee-Rechnung erstellen
        </button>
      </div>

      {/* Fee-Einstellung */}
      <div className="card">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold">Aktueller Fee-Satz</h3>
            <p className="text-3xl font-bold text-apleona-navy">{projekt.feePercent}%</p>
          </div>
          <button onClick={() => {
            setNeuerFeePercent(projekt.feePercent.toString());
            setGueltigAbDatum(new Date().toISOString().split('T')[0]);
            setZeigeFeeModal(true);
          }} className="btn-secondary">
            Fee ändern
          </button>
        </div>

        {projekt.feeHistorie.length > 0 && (
          <div className="mt-4 pt-4 border-t border-apleona-gray-200">
            <h4 className="font-medium text-sm mb-2">Änderungshistorie</h4>
            <div className="space-y-1">
              {renderHistorie()}
            </div>
          </div>
        )}
      </div>

      {/* Offener Fee-Betrag */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card border-l-4 border-status-yellow">
          <p className="text-sm text-apleona-gray-600">Nicht abgerechnete Rechnungen</p>
          <p className="text-2xl font-bold text-apleona-navy">{auswaehlbareRechnungen.length}</p>
        </div>
        <div className="card border-l-4 border-status-yellow">
          <p className="text-sm text-apleona-gray-600">Summe (Basis für Fee)</p>
          <p className="text-2xl font-bold text-apleona-navy">{formatWaehrung(summeNichtAbgerechnet)}</p>
        </div>
        <div className="card border-l-4 border-status-green">
          <p className="text-sm text-apleona-gray-600">Offener Fee-Betrag</p>
          <p className="text-2xl font-bold text-status-green">{formatWaehrung(offenerFeeBetrag)}</p>
          <p className="text-xs text-apleona-gray-500">({projekt.feePercent}% von {formatWaehrung(summeNichtAbgerechnet)})</p>
        </div>
      </div>

      {/* Fee-Rechnungen */}
      <div className="card">
        <h3 className="font-semibold mb-4">Eigene Fee-Rechnungen</h3>
        {projekt.feeRechnungen.length === 0 ? (
          <p className="text-apleona-gray-500 text-center py-8">Noch keine Fee-Rechnungen erstellt.</p>
        ) : (
          <div className="space-y-4">
            {projekt.feeRechnungen.map(fr => {
              const bezugRechnungen = getBezugRechnungenFuerFeeRechnung(fr);
              return (
                <div key={fr.id} className="border border-apleona-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{fr.rechnungsnummer}</p>
                      <p className="text-sm text-apleona-gray-600">{formatDatum(fr.datum)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-status-green">{formatWaehrung(fr.betragNetto)}</p>
                      <p className="text-xs text-apleona-gray-500">
                        {fr.feePerRechnung && Object.keys(fr.feePerRechnung).length > 0
                          ? 'Individuelle Fee-Sätze'
                          : `${fr.feePercent}% Fee`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-apleona-gray-200">
                    <p className="text-sm text-apleona-gray-600 mb-2">Bezogene Rechnungen ({bezugRechnungen.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {bezugRechnungen.slice(0, 5).map(br => (
                        <span key={br.id} className="text-xs bg-apleona-gray-100 px-2 py-1 rounded">
                          {br.rechnungsnummer} ({br.beteiligterName})
                          {fr.feePerRechnung && fr.feePerRechnung[br.id] && (
                            <span className="ml-1 text-apleona-gray-500">@ {fr.feePerRechnung[br.id]}%</span>
                          )}
                        </span>
                      ))}
                      {bezugRechnungen.length > 5 && (
                        <span className="text-xs text-apleona-gray-500">
                          +{bezugRechnungen.length - 5} weitere
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Alle Rechnungen (auswählbar + bereits abgerechnet) */}
      {(auswaehlbareRechnungen.length > 0 || abgerechneteRechnungen.length > 0) && (
        <div className="card">
          <h3 className="font-semibold mb-4">Alle Rechnungen</h3>
          <table className="min-w-full divide-y divide-apleona-gray-200">
            <thead className="bg-apleona-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Nr.</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Datum</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Beteiligter</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">Betrag netto</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apleona-gray-200">
              {/* Nicht abgerechnete Rechnungen */}
              {auswaehlbareRechnungen.map(r => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-sm">{r.rechnungsnummer}</td>
                  <td className="px-3 py-2 text-sm">{formatDatum(r.datum)}</td>
                  <td className="px-3 py-2 text-sm">
                    <span className={r.beteiligterTyp === 'Fachplaner' ? 'badge-info' : 'badge-success'}>
                      {r.beteiligterName}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-right">{formatWaehrung(r.betragNetto)}</td>
                  <td className="px-3 py-2 text-sm text-right">
                    <span className="text-status-yellow">Offen</span>
                  </td>
                </tr>
              ))}
              {/* Bereits abgerechnete Rechnungen (verblasst) */}
              {abgerechneteRechnungen.map(r => (
                <tr key={r.id} className="opacity-50">
                  <td className="px-3 py-2 text-sm">{r.rechnungsnummer}</td>
                  <td className="px-3 py-2 text-sm">{formatDatum(r.datum)}</td>
                  <td className="px-3 py-2 text-sm">
                    <span className={r.beteiligterTyp === 'Fachplaner' ? 'badge-info' : 'badge-success'}>
                      {r.beteiligterName}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-right">{formatWaehrung(r.betragNetto)}</td>
                  <td className="px-3 py-2 text-sm text-right">
                    <span className="text-status-green">Abgerechnet</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Fee-Ändern Modal */}
      {zeigeFeeModal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setZeigeFeeModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Fee-Satz ändern</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Neuer Fee-Satz (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={neuerFeePercent}
                  onChange={e => setNeuerFeePercent(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Gültig ab</label>
                <input
                  type="date"
                  value={gueltigAbDatum}
                  onChange={e => setGueltigAbDatum(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Grund für Änderung (optional)</label>
                <input
                  type="text"
                  value={feeGrund}
                  onChange={e => setFeeGrund(e.target.value)}
                  className="input-field"
                  placeholder="z.B. Vertragsanpassung"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setZeigeFeeModal(false)} className="btn-secondary">Abbrechen</button>
              <button onClick={handleFeeAendern} className="btn-primary">Speichern</button>
            </div>
          </div>
        </div>
      )}

      {/* Fee-Rechnung erstellen Modal */}
      {zeigeModal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setZeigeModal(false)}>
          <div className="modal-content p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Neue Fee-Rechnung erstellen</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Rechnungsnummer</label>
                  <input
                    type="text"
                    value={formData.rechnungsnummer}
                    onChange={e => setFormData({ ...formData, rechnungsnummer: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Datum</label>
                  <input
                    type="date"
                    value={formData.datum}
                    onChange={e => setFormData({ ...formData, datum: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Fee-Satz für alle setzen */}
              <div className="bg-apleona-gray-50 p-3 rounded-lg flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.bezugRechnungIds.length === auswaehlbareRechnungen.length && auswaehlbareRechnungen.length > 0}
                    onChange={toggleAlleAuswaehlen}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Alle auswählen</span>
                </label>
                <div className="flex-1" />
                <span className="text-sm">Fee-Satz für alle:</span>
                <input
                  type="number"
                  step="0.1"
                  value={globalerFeeSatz}
                  onChange={e => setGlobalerFeeSatz(parseFloat(e.target.value) || 0)}
                  className="input-field w-20 py-1 text-sm"
                />
                <span className="text-sm">%</span>
                <button
                  onClick={handleFeeFuerAlleSetzen}
                  className="btn-secondary py-1 px-2 text-sm"
                >
                  Anwenden
                </button>
              </div>

              <div>
                <label className="label">Rechnungen auswählen</label>
                <div className="max-h-80 overflow-y-auto border border-apleona-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-apleona-gray-200">
                    <thead className="bg-apleona-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500 w-10"></th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Rechnung</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Beteiligter</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">Betrag</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-apleona-gray-500 w-24">Fee %</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">Fee</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-apleona-gray-200">
                      {/* Auswählbare Rechnungen */}
                      {auswaehlbareRechnungen.map(r => {
                        const isSelected = formData.bezugRechnungIds.includes(r.id);
                        const feeSatz = feeProRechnung[r.id] ?? projekt.feePercent;
                        const feeBetrag = r.betragNetto * (feeSatz / 100);
                        return (
                          <tr key={r.id} className={`hover:bg-apleona-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleBezugRechnung(r.id)}
                                className="w-4 h-4"
                              />
                            </td>
                            <td className="px-3 py-2 text-sm">
                              <div className="font-medium">{r.rechnungsnummer}</div>
                              <div className="text-xs text-apleona-gray-500">{formatDatum(r.datum)}</div>
                            </td>
                            <td className="px-3 py-2 text-sm">
                              <span className={r.beteiligterTyp === 'Fachplaner' ? 'badge-info' : 'badge-success'}>
                                {r.beteiligterName}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm text-right">{formatWaehrung(r.betragNetto)}</td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                step="0.1"
                                value={feeSatz}
                                onChange={e => setFeeProRechnung(prev => ({
                                  ...prev,
                                  [r.id]: parseFloat(e.target.value) || 0
                                }))}
                                className="input-field w-16 py-1 text-sm text-center"
                              />
                            </td>
                            <td className="px-3 py-2 text-sm text-right text-status-green font-medium">
                              {formatWaehrung(feeBetrag)}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Bereits abgerechnete Rechnungen (verblasst, nicht auswählbar) */}
                      {abgerechneteRechnungen.length > 0 && (
                        <>
                          <tr>
                            <td colSpan={6} className="px-3 py-2 bg-apleona-gray-100 text-xs text-apleona-gray-500 font-medium">
                              Bereits abgerechnet
                            </td>
                          </tr>
                          {abgerechneteRechnungen.map(r => (
                            <tr key={r.id} className="opacity-50">
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={false}
                                  disabled
                                  className="w-4 h-4 opacity-50"
                                />
                              </td>
                              <td className="px-3 py-2 text-sm">
                                <div className="font-medium">{r.rechnungsnummer}</div>
                                <div className="text-xs text-apleona-gray-500">{formatDatum(r.datum)}</div>
                              </td>
                              <td className="px-3 py-2 text-sm">
                                <span className={r.beteiligterTyp === 'Fachplaner' ? 'badge-info' : 'badge-success'}>
                                  {r.beteiligterName}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-sm text-right">{formatWaehrung(r.betragNetto)}</td>
                              <td className="px-3 py-2 text-sm text-center text-apleona-gray-400" colSpan={2}>
                                bereits abgerechnet
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {formData.bezugRechnungIds.length > 0 && (
                <div className="bg-apleona-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span>Ausgewählte Rechnungen:</span>
                    <span className="font-medium">{formData.bezugRechnungIds.length}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Summe Rechnungsbeträge:</span>
                    <span className="font-medium">{formatWaehrung(berechneBezugSumme())}</span>
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-apleona-gray-300 text-lg">
                    <span>Fee-Betrag gesamt:</span>
                    <span className="font-bold text-status-green">
                      {formatWaehrung(berechneFeeSumme())}
                    </span>
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
                onClick={handleRechnungErstellen}
                disabled={!formData.rechnungsnummer || !formData.datum || formData.bezugRechnungIds.length === 0}
                className="btn-primary disabled:opacity-50"
              >
                Rechnung erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabFee;
