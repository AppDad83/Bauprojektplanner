'use client';

import React, { useState, useMemo } from 'react';
import { Projekt, Aufgabe, Unteraufgabe, AufgabenStatus, AHO_PHASEN, AHOPhase } from '@/types';
import { formatDatum, generateId } from '@/lib/utils';

interface Props {
  projekt: Projekt;
  onUpdate: (projekt: Projekt) => void;
}

const StatusLabels: Record<AufgabenStatus, string> = {
  offen: 'Offen',
  in_bearbeitung: 'In Bearbeitung',
  erledigt: 'Erledigt',
  verzoegert: 'Verzögert'
};

const StatusColors: Record<AufgabenStatus, string> = {
  offen: 'bg-apleona-gray-400',
  in_bearbeitung: 'bg-apleona-navy',
  erledigt: 'bg-status-green',
  verzoegert: 'bg-status-red'
};

type ZeitskalaTyp = 'tage' | 'wochen' | 'monate';

const TabAufgaben: React.FC<Props> = ({ projekt, onUpdate }) => {
  const [zeigeModal, setZeigeModal] = useState(false);
  const [editAufgabe, setEditAufgabe] = useState<Aufgabe | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [zeitskala, setZeitskala] = useState<ZeitskalaTyp>('wochen');
  const [ansicht, setAnsicht] = useState<'liste' | 'gantt'>('liste');

  const [formData, setFormData] = useState({
    titel: '',
    beschreibung: '',
    gewerkId: '',
    phasen: [] as AHOPhase[],
    startDatumSoll: '',
    endDatumSoll: '',
    status: 'offen' as AufgabenStatus
  });

  // Filter für Gantt-Zeitraum
  const [ganttVon, setGanttVon] = useState('');
  const [ganttBis, setGanttBis] = useState('');

  // Zeitraum für Gantt berechnen
  const { minDatum, maxDatum, tageGesamt } = useMemo(() => {
    // Wenn Filter gesetzt sind, diese verwenden
    if (ganttVon && ganttBis) {
      const min = new Date(ganttVon);
      const max = new Date(ganttBis);
      return {
        minDatum: min,
        maxDatum: max,
        tageGesamt: Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24))
      };
    }

    const alleDaten: Date[] = [];
    projekt.aufgaben.forEach(a => {
      if (a.startDatumSoll) alleDaten.push(new Date(a.startDatumSoll));
      if (a.endDatumSoll) alleDaten.push(new Date(a.endDatumSoll));
      if (a.startDatumIst) alleDaten.push(new Date(a.startDatumIst));
      if (a.endDatumIst) alleDaten.push(new Date(a.endDatumIst));
    });

    if (alleDaten.length === 0) {
      const heute = new Date();
      return { minDatum: heute, maxDatum: new Date(heute.getTime() + 90 * 24 * 60 * 60 * 1000), tageGesamt: 90 };
    }

    const min = new Date(Math.min(...alleDaten.map(d => d.getTime())));
    const max = new Date(Math.max(...alleDaten.map(d => d.getTime())));
    // Puffer hinzufügen
    min.setDate(min.getDate() - 7);
    max.setDate(max.getDate() + 14);

    return {
      minDatum: min,
      maxDatum: max,
      tageGesamt: Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24))
    };
  }, [projekt.aufgaben, ganttVon, ganttBis]);

  // Monate für Gantt-Header generieren
  const monateHeader = useMemo(() => {
    const monate: { label: string; breite: number; startTag: number }[] = [];
    const aktuellesDatum = new Date(minDatum);
    let tagIndex = 0;

    while (aktuellesDatum <= maxDatum) {
      const monatStart = tagIndex;
      const jahr = aktuellesDatum.getFullYear();
      const monat = aktuellesDatum.getMonth();
      const monatName = aktuellesDatum.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });

      // Zum Ende des Monats oder maxDatum gehen
      while (aktuellesDatum.getMonth() === monat && aktuellesDatum <= maxDatum) {
        aktuellesDatum.setDate(aktuellesDatum.getDate() + 1);
        tagIndex++;
      }

      monate.push({
        label: monatName,
        breite: tagIndex - monatStart,
        startTag: monatStart
      });
    }

    return monate;
  }, [minDatum, maxDatum]);

  // Tage/Wochen für Gantt-Header generieren
  const zeiteinheitenHeader = useMemo(() => {
    const einheiten: { label: string; breite: number }[] = [];
    const aktuellesDatum = new Date(minDatum);

    if (zeitskala === 'tage') {
      while (aktuellesDatum <= maxDatum) {
        einheiten.push({ label: aktuellesDatum.getDate().toString(), breite: 1 });
        aktuellesDatum.setDate(aktuellesDatum.getDate() + 1);
      }
    } else if (zeitskala === 'wochen') {
      let wochenNr = 1;
      while (aktuellesDatum <= maxDatum) {
        const kw = getKalenderwoche(aktuellesDatum);
        einheiten.push({ label: `KW ${kw}`, breite: 7 });
        aktuellesDatum.setDate(aktuellesDatum.getDate() + 7);
        wochenNr++;
      }
    } else {
      // Monate - bereits in monateHeader
      monateHeader.forEach(m => {
        einheiten.push({ label: m.label, breite: m.breite });
      });
    }

    return einheiten;
  }, [minDatum, maxDatum, zeitskala, monateHeader]);

  // Kalenderwoche berechnen
  function getKalenderwoche(d: Date): number {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  }

  const toggleExpand = (id: string) => {
    const neu = new Set(expandedIds);
    if (neu.has(id)) neu.delete(id);
    else neu.add(id);
    setExpandedIds(neu);
  };

  const handleNeu = () => {
    setEditAufgabe(null);
    setFormData({
      titel: '',
      beschreibung: '',
      gewerkId: '',
      phasen: [],
      startDatumSoll: '',
      endDatumSoll: '',
      status: 'offen'
    });
    setZeigeModal(true);
  };

  const handleEdit = (a: Aufgabe) => {
    setEditAufgabe(a);
    setFormData({
      titel: a.titel,
      beschreibung: a.beschreibung || '',
      gewerkId: a.gewerkId || '',
      phasen: a.phasen,
      startDatumSoll: a.startDatumSoll || '',
      endDatumSoll: a.endDatumSoll || '',
      status: a.status
    });
    setZeigeModal(true);
  };

  const handleSave = () => {
    if (editAufgabe) {
      const aktualisiert = projekt.aufgaben.map(a =>
        a.id === editAufgabe.id
          ? {
              ...a,
              titel: formData.titel,
              beschreibung: formData.beschreibung || undefined,
              gewerkId: formData.gewerkId || undefined,
              phasen: formData.phasen,
              startDatumSoll: formData.startDatumSoll || undefined,
              endDatumSoll: formData.endDatumSoll || undefined,
              status: formData.status
            }
          : a
      );
      onUpdate({ ...projekt, aufgaben: aktualisiert });
    } else {
      const neu: Aufgabe = {
        id: generateId(),
        ebene: 'aufgabe',
        titel: formData.titel,
        beschreibung: formData.beschreibung || undefined,
        gewerkId: formData.gewerkId || undefined,
        phasen: formData.phasen,
        stakeholderIds: [],
        startDatumSoll: formData.startDatumSoll || undefined,
        endDatumSoll: formData.endDatumSoll || undefined,
        fortschrittProzent: 0,
        abhaengigkeitenIds: [],
        status: formData.status,
        kommunikationsLog: [],
        unteraufgaben: []
      };
      onUpdate({ ...projekt, aufgaben: [...projekt.aufgaben, neu] });
    }
    setZeigeModal(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Aufgabe wirklich löschen?')) {
      onUpdate({ ...projekt, aufgaben: projekt.aufgaben.filter(a => a.id !== id) });
    }
  };

  const handleStatusChange = (aufgabeId: string, neuerStatus: AufgabenStatus) => {
    const aktualisiert = projekt.aufgaben.map(a =>
      a.id === aufgabeId ? { ...a, status: neuerStatus } : a
    );
    onUpdate({ ...projekt, aufgaben: aktualisiert });
  };

  const handleFortschrittChange = (aufgabeId: string, wert: number) => {
    const aktualisiert = projekt.aufgaben.map(a =>
      a.id === aufgabeId ? { ...a, fortschrittProzent: wert } : a
    );
    onUpdate({ ...projekt, aufgaben: aktualisiert });
  };

  const togglePhase = (phase: AHOPhase) => {
    setFormData(prev => ({
      ...prev,
      phasen: prev.phasen.includes(phase)
        ? prev.phasen.filter(p => p !== phase)
        : [...prev.phasen, phase]
    }));
  };

  // Gantt-Balken berechnen
  const berechneBalken = (startDatum: string | undefined, endDatum: string | undefined) => {
    if (!startDatum || !endDatum) return { left: 0, width: 0 };

    const start = new Date(startDatum);
    const end = new Date(endDatum);
    const startOffset = (start.getTime() - minDatum.getTime()) / (1000 * 60 * 60 * 24);
    const dauer = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    return {
      left: (startOffset / tageGesamt) * 100,
      width: (dauer / tageGesamt) * 100
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Aufgaben</h2>
        <div className="flex items-center space-x-4">
          <div className="flex bg-apleona-gray-200 rounded-lg p-1">
            <button
              onClick={() => setAnsicht('liste')}
              className={`px-3 py-1 rounded text-sm ${ansicht === 'liste' ? 'bg-white shadow' : ''}`}
            >
              Liste
            </button>
            <button
              onClick={() => setAnsicht('gantt')}
              className={`px-3 py-1 rounded text-sm ${ansicht === 'gantt' ? 'bg-white shadow' : ''}`}
            >
              Gantt
            </button>
          </div>
          <button onClick={handleNeu} className="btn-primary">+ Aufgabe</button>
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-apleona-gray-600">Gesamt</p>
          <p className="text-2xl font-bold text-apleona-navy">{projekt.aufgaben.length}</p>
        </div>
        <div className="card border-l-4 border-apleona-gray-400">
          <p className="text-sm text-apleona-gray-600">Offen</p>
          <p className="text-2xl font-bold">{projekt.aufgaben.filter(a => a.status === 'offen').length}</p>
        </div>
        <div className="card border-l-4 border-apleona-navy">
          <p className="text-sm text-apleona-gray-600">In Bearbeitung</p>
          <p className="text-2xl font-bold">{projekt.aufgaben.filter(a => a.status === 'in_bearbeitung').length}</p>
        </div>
        <div className="card border-l-4 border-status-green">
          <p className="text-sm text-apleona-gray-600">Erledigt</p>
          <p className="text-2xl font-bold">{projekt.aufgaben.filter(a => a.status === 'erledigt').length}</p>
        </div>
      </div>

      {ansicht === 'liste' ? (
        /* Listenansicht */
        projekt.aufgaben.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-apleona-gray-500">Noch keine Aufgaben angelegt.</p>
            <button onClick={handleNeu} className="btn-primary mt-4">Erste Aufgabe anlegen</button>
          </div>
        ) : (
          <div className="space-y-3">
            {projekt.aufgaben.map(aufgabe => (
              <div key={aufgabe.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleExpand(aufgabe.id)}
                        className="text-apleona-gray-500"
                      >
                        <svg
                          className={`w-5 h-5 transform ${expandedIds.has(aufgabe.id) ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <h3 className="font-semibold">{aufgabe.titel}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs text-white ${StatusColors[aufgabe.status]}`}>
                        {StatusLabels[aufgabe.status]}
                      </span>
                    </div>
                    {aufgabe.beschreibung && (
                      <p className="text-sm text-apleona-gray-600 mt-1 ml-8">{aufgabe.beschreibung}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 ml-8 text-sm text-apleona-gray-500">
                      {aufgabe.startDatumSoll && (
                        <span>Start: {formatDatum(aufgabe.startDatumSoll)}</span>
                      )}
                      {aufgabe.endDatumSoll && (
                        <span>Ende: {formatDatum(aufgabe.endDatumSoll)}</span>
                      )}
                      {aufgabe.phasen.length > 0 && (
                        <span className="badge-info">{aufgabe.phasen.join(', ')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Fortschritt */}
                    <div className="w-32">
                      <div className="flex justify-between text-xs text-apleona-gray-500 mb-1">
                        <span>Fortschritt</span>
                        <span>{aufgabe.fortschrittProzent}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={aufgabe.fortschrittProzent}
                        onChange={e => handleFortschrittChange(aufgabe.id, parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    {/* Status */}
                    <select
                      value={aufgabe.status}
                      onChange={e => handleStatusChange(aufgabe.id, e.target.value as AufgabenStatus)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      {Object.entries(StatusLabels).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>

                    {/* Aktionen */}
                    <div className="flex space-x-2">
                      <button onClick={() => handleEdit(aufgabe)} className="text-apleona-navy hover:text-apleona-navy-dark">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(aufgabe.id)} className="text-apleona-red hover:text-apleona-red-dark">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Unteraufgaben (wenn erweitert) */}
                {expandedIds.has(aufgabe.id) && aufgabe.unteraufgaben.length > 0 && (
                  <div className="mt-4 ml-8 pl-4 border-l-2 border-apleona-gray-200 space-y-2">
                    {aufgabe.unteraufgaben.map(ua => (
                      <div key={ua.id} className="flex items-center justify-between py-2">
                        <span className="text-sm">{ua.titel}</span>
                        <span className={`px-2 py-0.5 rounded text-xs text-white ${StatusColors[ua.status]}`}>
                          {StatusLabels[ua.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        /* Gantt-Ansicht */
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h3 className="font-semibold">Gantt-Diagramm</h3>
            <div className="flex flex-wrap items-center gap-4">
              {/* Zeitraum-Filter */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-apleona-gray-600">Von:</span>
                <input
                  type="date"
                  value={ganttVon}
                  onChange={e => setGanttVon(e.target.value)}
                  className="input-field py-1 px-2 w-36"
                />
                <span className="text-apleona-gray-600">Bis:</span>
                <input
                  type="date"
                  value={ganttBis}
                  onChange={e => setGanttBis(e.target.value)}
                  className="input-field py-1 px-2 w-36"
                />
              </div>
              {/* Zeitskala */}
              <div className="flex space-x-1">
                <button
                  onClick={() => setZeitskala('tage')}
                  className={`px-3 py-1 text-sm rounded ${zeitskala === 'tage' ? 'bg-apleona-navy text-white' : 'bg-apleona-gray-200'}`}
                >
                  Tage
                </button>
                <button
                  onClick={() => setZeitskala('wochen')}
                  className={`px-3 py-1 text-sm rounded ${zeitskala === 'wochen' ? 'bg-apleona-navy text-white' : 'bg-apleona-gray-200'}`}
                >
                  Wochen
                </button>
                <button
                  onClick={() => setZeitskala('monate')}
                  className={`px-3 py-1 text-sm rounded ${zeitskala === 'monate' ? 'bg-apleona-navy text-white' : 'bg-apleona-gray-200'}`}
                >
                  Monate
                </button>
              </div>
            </div>
          </div>

          {projekt.aufgaben.length === 0 ? (
            <p className="text-apleona-gray-500 text-center py-8">Keine Aufgaben für Gantt-Diagramm</p>
          ) : (
            <div className="relative overflow-x-auto">
              <div style={{ minWidth: `${Math.max(800, 200 + tageGesamt * (zeitskala === 'tage' ? 30 : zeitskala === 'wochen' ? 50 : 80))}px` }}>
                {/* Header mit Zeitachse - zwei Zeilen */}
                <div className="flex border-b border-apleona-gray-200">
                  {/* Fixierte Aufgaben-Spalte Header */}
                  <div className="w-52 flex-shrink-0 bg-white sticky left-0 z-10 border-r border-apleona-gray-200">
                    <div className="h-8 border-b border-apleona-gray-100"></div>
                    <div className="h-8 flex items-center font-medium text-sm text-apleona-gray-600 px-2">
                      Aufgabe
                    </div>
                  </div>
                  {/* Zeitachse Header */}
                  <div className="flex-1">
                    {/* Obere Zeile: Monate mit Jahr */}
                    <div className="flex h-8 border-b border-apleona-gray-100">
                      {monateHeader.map((monat, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-center text-xs font-medium text-apleona-gray-700 border-r border-apleona-gray-200 bg-apleona-gray-50"
                          style={{
                            width: zeitskala === 'tage'
                              ? `${monat.breite * 30}px`
                              : zeitskala === 'wochen'
                              ? `${Math.ceil(monat.breite / 7) * 50}px`
                              : `${monat.breite * 3}px`
                          }}
                        >
                          {monat.label}
                        </div>
                      ))}
                    </div>
                    {/* Untere Zeile: Tage/Wochen */}
                    <div className="flex h-8">
                      {zeitskala !== 'monate' && zeiteinheitenHeader.map((einheit, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-center text-xs text-apleona-gray-500 border-r border-apleona-gray-100"
                          style={{ width: zeitskala === 'tage' ? '30px' : '50px' }}
                        >
                          {einheit.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Aufgaben-Zeilen */}
                {projekt.aufgaben.map(aufgabe => {
                  const sollBalken = berechneBalken(aufgabe.startDatumSoll, aufgabe.endDatumSoll);
                  const istBalken = berechneBalken(aufgabe.startDatumIst, aufgabe.endDatumIst);

                  return (
                    <div key={aufgabe.id} className="flex items-center border-b border-apleona-gray-100">
                      {/* Fixierte Aufgaben-Spalte */}
                      <div className="w-52 flex-shrink-0 bg-white sticky left-0 z-10 border-r border-apleona-gray-200 py-2 px-2">
                        <p className="text-sm font-medium truncate" title={aufgabe.titel}>{aufgabe.titel}</p>
                        <p className="text-xs text-apleona-gray-500">{aufgabe.fortschrittProzent}%</p>
                      </div>
                      {/* Balken-Bereich */}
                      <div className="flex-1 relative h-12 bg-apleona-gray-50">
                        {/* Soll-Balken */}
                        {sollBalken.width > 0 && (
                          <div
                            className="absolute top-1 h-4 rounded bg-apleona-navy opacity-40"
                            style={{ left: `${sollBalken.left}%`, width: `${Math.max(sollBalken.width, 0.5)}%` }}
                            title={`Soll: ${formatDatum(aufgabe.startDatumSoll)} - ${formatDatum(aufgabe.endDatumSoll)}`}
                          />
                        )}
                        {/* Ist-Balken */}
                        {istBalken.width > 0 && (
                          <div
                            className={`absolute top-6 h-4 rounded ${
                              aufgabe.status === 'verzoegert' ? 'bg-status-red' : 'bg-apleona-navy'
                            }`}
                            style={{ left: `${istBalken.left}%`, width: `${Math.max(istBalken.width, 0.5)}%` }}
                            title={`Ist: ${formatDatum(aufgabe.startDatumIst)} - ${formatDatum(aufgabe.endDatumIst)}`}
                          >
                            <div
                              className="h-full bg-status-green rounded-l opacity-50"
                              style={{ width: `${aufgabe.fortschrittProzent}%` }}
                            />
                          </div>
                        )}
                        {/* Nur Soll anzeigen wenn kein Ist */}
                        {istBalken.width === 0 && sollBalken.width > 0 && (
                          <div
                            className={`absolute top-4 h-4 rounded ${StatusColors[aufgabe.status]}`}
                            style={{ left: `${sollBalken.left}%`, width: `${Math.max(sollBalken.width, 0.5)}%` }}
                          >
                            <div
                              className="h-full bg-status-green rounded-l"
                              style={{ width: `${aufgabe.fortschrittProzent}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Legende */}
                <div className="flex items-center space-x-6 mt-4 pt-4 border-t border-apleona-gray-200 text-xs text-apleona-gray-600">
                  <div className="flex items-center">
                    <div className="w-4 h-3 bg-apleona-navy opacity-40 rounded mr-2"></div>
                    <span>Soll</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-3 bg-apleona-navy rounded mr-2"></div>
                    <span>Ist</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-3 bg-status-red rounded mr-2"></div>
                    <span>Verzögert</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-3 bg-status-green rounded mr-2"></div>
                    <span>Fortschritt</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {zeigeModal && (
        <div className="modal-overlay" onClick={() => setZeigeModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">
              {editAufgabe ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="label">Titel</label>
                <input
                  type="text"
                  value={formData.titel}
                  onChange={e => setFormData({ ...formData, titel: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Beschreibung</label>
                <textarea
                  value={formData.beschreibung}
                  onChange={e => setFormData({ ...formData, beschreibung: e.target.value })}
                  className="input-field"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Gewerk</label>
                  <select
                    value={formData.gewerkId}
                    onChange={e => setFormData({ ...formData, gewerkId: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Keines</option>
                    {projekt.gewerke.map(g => (
                      <option key={g.id} value={g.id}>{g.dinNummer} - {g.bezeichnung}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as AufgabenStatus })}
                    className="input-field"
                  >
                    {Object.entries(StatusLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Startdatum (Soll)</label>
                  <input
                    type="date"
                    value={formData.startDatumSoll}
                    onChange={e => setFormData({ ...formData, startDatumSoll: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Enddatum (Soll)</label>
                  <input
                    type="date"
                    value={formData.endDatumSoll}
                    onChange={e => setFormData({ ...formData, endDatumSoll: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="label">AHO-Phasen</label>
                <div className="flex flex-wrap gap-2">
                  {AHO_PHASEN.map(phase => (
                    <button
                      key={phase}
                      type="button"
                      onClick={() => togglePhase(phase)}
                      className={`px-3 py-1 rounded text-sm ${
                        formData.phasen.includes(phase)
                          ? 'bg-apleona-navy text-white'
                          : 'bg-apleona-gray-200 text-apleona-gray-700'
                      }`}
                    >
                      {phase}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setZeigeModal(false)} className="btn-secondary">Abbrechen</button>
              <button
                onClick={handleSave}
                disabled={!formData.titel}
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

export default TabAufgaben;
