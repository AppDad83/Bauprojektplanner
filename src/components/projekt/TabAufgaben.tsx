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
    endDatumIst: '',
    status: 'offen' as AufgabenStatus,
    abhaengigkeitenIds: [] as string[]
  });

  // Filter für Gantt-Zeitraum
  const [ganttVon, setGanttVon] = useState('');
  const [ganttBis, setGanttBis] = useState('');

  // Zeitraum für Gantt berechnen
  const { minDatum, maxDatum, tageGesamt } = useMemo(() => {
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
      const monat = aktuellesDatum.getMonth();
      const monatName = aktuellesDatum.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });

      while (aktuellesDatum.getMonth() === monat && aktuellesDatum <= maxDatum) {
        aktuellesDatum.setDate(aktuellesDatum.getDate() + 1);
        tagIndex++;
      }

      monate.push({ label: monatName, breite: tagIndex - monatStart, startTag: monatStart });
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
      while (aktuellesDatum <= maxDatum) {
        const kw = getKalenderwoche(aktuellesDatum);
        einheiten.push({ label: `KW ${kw}`, breite: 7 });
        aktuellesDatum.setDate(aktuellesDatum.getDate() + 7);
      }
    } else {
      monateHeader.forEach(m => {
        einheiten.push({ label: m.label, breite: m.breite });
      });
    }

    return einheiten;
  }, [minDatum, maxDatum, zeitskala, monateHeader]);

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
      titel: '', beschreibung: '', gewerkId: '', phasen: [],
      startDatumSoll: '', endDatumSoll: '', endDatumIst: '', status: 'offen', abhaengigkeitenIds: []
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
      endDatumIst: a.endDatumIst || '',
      status: a.status,
      abhaengigkeitenIds: a.abhaengigkeitenIds || []
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
              endDatumIst: formData.endDatumIst || undefined,
              status: formData.status,
              abhaengigkeitenIds: formData.abhaengigkeitenIds
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
        endDatumIst: formData.endDatumIst || undefined,
        fortschrittProzent: 0,
        abhaengigkeitenIds: formData.abhaengigkeitenIds,
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

  const toggleAbhaengigkeit = (aufgabeId: string) => {
    setFormData(prev => ({
      ...prev,
      abhaengigkeitenIds: prev.abhaengigkeitenIds.includes(aufgabeId)
        ? prev.abhaengigkeitenIds.filter(id => id !== aufgabeId)
        : [...prev.abhaengigkeitenIds, aufgabeId]
    }));
  };

  // Konflikt-Berechnung
  const berechneKonflikte = (aufgabe: Aufgabe): { konfliktTage: number; konfliktStart: Date } | null => {
    if (aufgabe.abhaengigkeitenIds.length === 0) return null;
    if (!aufgabe.startDatumSoll) return null;

    const aufgabeStart = new Date(aufgabe.startDatumSoll);

    const vorgaengerEndenDaten = aufgabe.abhaengigkeitenIds
      .map(vorgaengerId => {
        const vorgaenger = projekt.aufgaben.find(a => a.id === vorgaengerId);
        return vorgaenger?.endDatumSoll ? new Date(vorgaenger.endDatumSoll) : null;
      })
      .filter((d): d is Date => d !== null);

    if (vorgaengerEndenDaten.length === 0) return null;

    const spaetestesVorgaengerEnde = vorgaengerEndenDaten.reduce((a, b) => a > b ? a : b);

    // Konflikt: Aufgabe startet vor oder am Ende des Vorgängers
    if (aufgabeStart <= spaetestesVorgaengerEnde) {
      const konfliktTage = Math.ceil(
        (spaetestesVorgaengerEnde.getTime() - aufgabeStart.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      return { konfliktTage, konfliktStart: aufgabeStart };
    }

    return null;
  };

  // Gantt-Breiten
  const ganttBreite = useMemo(() => {
    if (zeitskala === 'tage') return tageGesamt * 30;
    if (zeitskala === 'wochen') return Math.ceil(tageGesamt / 7) * 50;
    return monateHeader.reduce((sum, m) => sum + m.breite * 3, 0);
  }, [zeitskala, tageGesamt, monateHeader]);

  const berechneBalken = (startDatum: string | undefined, endDatum: string | undefined) => {
    if (!startDatum || !endDatum) return { left: 0, width: 0 };

    const start = new Date(startDatum);
    const end = new Date(endDatum);
    const startOffset = (start.getTime() - minDatum.getTime()) / (1000 * 60 * 60 * 24);
    const dauer = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    if (zeitskala === 'tage') {
      return { left: startOffset * 30, width: Math.max(dauer * 30, 10) };
    } else if (zeitskala === 'wochen') {
      return { left: (startOffset / 7) * 50, width: Math.max((dauer / 7) * 50, 10) };
    } else {
      const pixelProTag = ganttBreite / tageGesamt;
      return { left: startOffset * pixelProTag, width: Math.max(dauer * pixelProTag, 10) };
    }
  };

  // Helper: Vorgänger-Namen
  const getVorgaengerNamen = (aufgabe: Aufgabe): string[] => {
    return aufgabe.abhaengigkeitenIds
      .map(id => projekt.aufgaben.find(a => a.id === id)?.titel)
      .filter(Boolean) as string[];
  };

  // Helper: Berechne Pfeil-Koordinaten für Abhängigkeiten
  const berechneAbhaengigkeitsPfeile = () => {
    const pfeile: { vonX: number; vonY: number; nachX: number; nachY: number; aufgabeId: string }[] = [];
    const zeilenHoehe = 48; // h-12 = 48px

    projekt.aufgaben.forEach((aufgabe, aufgabeIndex) => {
      aufgabe.abhaengigkeitenIds.forEach(vorgaengerId => {
        const vorgaengerIndex = projekt.aufgaben.findIndex(a => a.id === vorgaengerId);
        if (vorgaengerIndex === -1) return;

        const vorgaenger = projekt.aufgaben[vorgaengerIndex];
        if (!vorgaenger.endDatumSoll || !aufgabe.startDatumSoll) return;

        const vorgaengerBalken = berechneBalken(vorgaenger.startDatumSoll, vorgaenger.endDatumSoll);
        const aufgabeBalken = berechneBalken(aufgabe.startDatumSoll, aufgabe.endDatumSoll);

        if (vorgaengerBalken.width === 0 || aufgabeBalken.width === 0) return;

        pfeile.push({
          vonX: vorgaengerBalken.left + vorgaengerBalken.width,
          vonY: vorgaengerIndex * zeilenHoehe + 24, // Mitte der Zeile
          nachX: aufgabeBalken.left,
          nachY: aufgabeIndex * zeilenHoehe + 24,
          aufgabeId: aufgabe.id
        });
      });
    });

    return pfeile;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Aufgaben</h2>
        <div className="flex items-center space-x-4">
          <div className="flex bg-apleona-gray-200 rounded-lg p-1">
            <button onClick={() => setAnsicht('liste')} className={`px-3 py-1 rounded text-sm ${ansicht === 'liste' ? 'bg-white shadow' : ''}`}>Liste</button>
            <button onClick={() => setAnsicht('gantt')} className={`px-3 py-1 rounded text-sm ${ansicht === 'gantt' ? 'bg-white shadow' : ''}`}>Gantt</button>
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
        /* Listenansicht - Neues Layout */
        projekt.aufgaben.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-apleona-gray-500">Noch keine Aufgaben angelegt.</p>
            <button onClick={handleNeu} className="btn-primary mt-4">Erste Aufgabe anlegen</button>
          </div>
        ) : (
          <div className="space-y-3">
            {projekt.aufgaben.map(aufgabe => {
              const gewerk = projekt.gewerke.find(g => g.id === aufgabe.gewerkId);
              const vorgaenger = getVorgaengerNamen(aufgabe);
              const konflikt = berechneKonflikte(aufgabe);

              return (
                <div key={aufgabe.id} className="card">
                  <div className="flex gap-6">
                    {/* Linke Seite - Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <button onClick={() => toggleExpand(aufgabe.id)} className="text-apleona-gray-500">
                          <svg className={`w-5 h-5 transform ${expandedIds.has(aufgabe.id) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <h3 className="font-semibold text-lg">{aufgabe.titel}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs text-white ${StatusColors[aufgabe.status]}`}>
                          {StatusLabels[aufgabe.status]}
                        </span>
                        {konflikt && (
                          <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">
                            {konflikt.konfliktTage} Tage Konflikt
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm ml-8">
                        <div><span className="text-apleona-gray-500">Start:</span> {formatDatum(aufgabe.startDatumSoll)}</div>
                        <div><span className="text-apleona-gray-500">Ende:</span> {formatDatum(aufgabe.endDatumSoll)}</div>
                        {gewerk && <div><span className="text-apleona-gray-500">Gewerk:</span> {gewerk.dinNummer}</div>}
                        {aufgabe.phasen.length > 0 && <div><span className="text-apleona-gray-500">Phasen:</span> {aufgabe.phasen.join(', ')}</div>}
                      </div>

                      {vorgaenger.length > 0 && (
                        <div className="mt-2 ml-8 text-sm">
                          <span className="text-apleona-gray-500">Abhängig von:</span>
                          <span className="ml-2 text-apleona-navy">{vorgaenger.join(', ')}</span>
                        </div>
                      )}

                      {/* Fortschritt und Aktionen */}
                      <div className="flex items-center space-x-4 mt-3 ml-8">
                        <div className="w-32">
                          <div className="flex justify-between text-xs text-apleona-gray-500 mb-1">
                            <span>Fortschritt</span>
                            <span>{aufgabe.fortschrittProzent}%</span>
                          </div>
                          <input type="range" min="0" max="100" value={aufgabe.fortschrittProzent}
                            onChange={e => handleFortschrittChange(aufgabe.id, parseInt(e.target.value))} className="w-full" />
                        </div>
                        <select value={aufgabe.status} onChange={e => handleStatusChange(aufgabe.id, e.target.value as AufgabenStatus)}
                          className="text-sm border rounded px-2 py-1">
                          {Object.entries(StatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
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

                    {/* Rechte Seite - Beschreibung */}
                    <div className="w-2/5 min-w-[280px] border-l border-apleona-gray-200 pl-6">
                      <label className="text-xs font-medium text-apleona-gray-500 uppercase tracking-wide">Beschreibung</label>
                      <div className="mt-1 bg-apleona-gray-50 rounded-lg p-3 min-h-[100px] text-sm whitespace-pre-wrap">
                        {aufgabe.beschreibung || <span className="text-apleona-gray-400 italic">Keine Beschreibung vorhanden</span>}
                      </div>
                    </div>
                  </div>

                  {/* Unteraufgaben */}
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
              );
            })}
          </div>
        )
      ) : (
        /* Gantt-Ansicht */
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h3 className="font-semibold">Gantt-Diagramm</h3>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-apleona-gray-600">Von:</span>
                <input type="date" value={ganttVon} onChange={e => setGanttVon(e.target.value)} className="input-field py-1 px-2 w-36" />
                <span className="text-apleona-gray-600">Bis:</span>
                <input type="date" value={ganttBis} onChange={e => setGanttBis(e.target.value)} className="input-field py-1 px-2 w-36" />
              </div>
              <div className="flex space-x-1">
                {(['tage', 'wochen', 'monate'] as ZeitskalaTyp[]).map(z => (
                  <button key={z} onClick={() => setZeitskala(z)}
                    className={`px-3 py-1 text-sm rounded ${zeitskala === z ? 'bg-apleona-navy text-white' : 'bg-apleona-gray-200'}`}>
                    {z.charAt(0).toUpperCase() + z.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {projekt.aufgaben.length === 0 ? (
            <p className="text-apleona-gray-500 text-center py-8">Keine Aufgaben für Gantt-Diagramm</p>
          ) : (
            <div className="relative overflow-x-auto">
              <div style={{ minWidth: `${Math.max(800, 208 + ganttBreite)}px` }}>
                {/* Header */}
                <div className="flex border-b border-apleona-gray-200">
                  <div className="w-52 flex-shrink-0 bg-white sticky left-0 z-10 border-r border-apleona-gray-200">
                    <div className="h-8 border-b border-apleona-gray-100"></div>
                    <div className="h-8 flex items-center font-medium text-sm text-apleona-gray-600 px-2">Aufgabe</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex h-8 border-b border-apleona-gray-100">
                      {monateHeader.map((monat, i) => (
                        <div key={i} className={`flex items-center justify-center text-xs font-medium text-apleona-gray-700 border-r border-apleona-gray-200 ${i % 2 === 0 ? 'bg-apleona-gray-50' : 'bg-white'}`}
                          style={{ width: zeitskala === 'tage' ? `${monat.breite * 30}px` : zeitskala === 'wochen' ? `${Math.ceil(monat.breite / 7) * 50}px` : `${monat.breite * 3}px` }}>
                          {monat.label}
                        </div>
                      ))}
                    </div>
                    <div className="flex h-8">
                      {zeitskala !== 'monate' && zeiteinheitenHeader.map((einheit, i) => (
                        <div key={i} className={`flex items-center justify-center text-xs text-apleona-gray-500 border-r border-apleona-gray-100 ${i % 2 === 0 ? 'bg-blue-50' : 'bg-white'}`}
                          style={{ width: zeitskala === 'tage' ? '30px' : '50px' }}>
                          {einheit.label}
                        </div>
                      ))}
                      {zeitskala === 'monate' && monateHeader.map((monat, i) => (
                        <div key={i} className={`${i % 2 === 0 ? 'bg-blue-50' : 'bg-white'} border-r border-apleona-gray-100`}
                          style={{ width: `${monat.breite * 3}px` }} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Aufgaben-Zeilen mit Pfeilen */}
                <div className="relative">
                  {/* SVG-Overlay für Abhängigkeits-Pfeile */}
                  <svg
                    className="absolute pointer-events-none"
                    style={{
                      left: '208px',
                      top: 0,
                      width: `${ganttBreite}px`,
                      height: `${projekt.aufgaben.length * 48}px`,
                      zIndex: 5
                    }}
                  >
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                      >
                        <polygon points="0 0, 10 3.5, 0 7" fill="#002D5A" />
                      </marker>
                    </defs>
                    {berechneAbhaengigkeitsPfeile().map((pfeil, i) => {
                      // Berechne Pfad: von Ende Vorgänger nach Start Nachfolger
                      const dx = pfeil.nachX - pfeil.vonX;
                      const dy = pfeil.nachY - pfeil.vonY;

                      // Wenn Nachfolger links vom Vorgänger-Ende startet (Konflikt), zeichne Bogen
                      if (dx < 20) {
                        const midY = (pfeil.vonY + pfeil.nachY) / 2;
                        return (
                          <path
                            key={i}
                            d={`M ${pfeil.vonX} ${pfeil.vonY}
                                C ${pfeil.vonX + 30} ${pfeil.vonY},
                                  ${pfeil.vonX + 30} ${midY},
                                  ${pfeil.vonX + 15} ${midY}
                                L ${pfeil.nachX - 15} ${midY}
                                C ${pfeil.nachX - 30} ${midY},
                                  ${pfeil.nachX - 30} ${pfeil.nachY},
                                  ${pfeil.nachX} ${pfeil.nachY}`}
                            fill="none"
                            stroke="#002D5A"
                            strokeWidth="2"
                            markerEnd="url(#arrowhead)"
                            opacity="0.6"
                          />
                        );
                      }

                      // Normaler Pfeil mit Kurve
                      return (
                        <path
                          key={i}
                          d={`M ${pfeil.vonX} ${pfeil.vonY}
                              C ${pfeil.vonX + dx/3} ${pfeil.vonY},
                                ${pfeil.nachX - dx/3} ${pfeil.nachY},
                                ${pfeil.nachX} ${pfeil.nachY}`}
                          fill="none"
                          stroke="#002D5A"
                          strokeWidth="2"
                          markerEnd="url(#arrowhead)"
                          opacity="0.6"
                        />
                      );
                    })}
                  </svg>

                  {projekt.aufgaben.map(aufgabe => {
                    const sollBalken = berechneBalken(aufgabe.startDatumSoll, aufgabe.endDatumSoll);
                    const istBalken = berechneBalken(aufgabe.startDatumIst, aufgabe.endDatumIst);
                    const konflikt = berechneKonflikte(aufgabe);

                    let konfliktBalken = null;
                    if (konflikt && aufgabe.startDatumSoll) {
                      const konfliktEnde = new Date(aufgabe.startDatumSoll);
                      konfliktEnde.setDate(konfliktEnde.getDate() + konflikt.konfliktTage - 1);
                      konfliktBalken = berechneBalken(aufgabe.startDatumSoll, konfliktEnde.toISOString().split('T')[0]);
                    }

                    return (
                      <div key={aufgabe.id} className="flex items-center border-b border-apleona-gray-100">
                        <div className="w-52 flex-shrink-0 bg-white sticky left-0 z-10 border-r border-apleona-gray-200 py-2 px-2">
                          <p className="text-sm font-medium truncate" title={aufgabe.titel}>{aufgabe.titel}</p>
                          <p className="text-xs text-apleona-gray-500">
                            {aufgabe.fortschrittProzent}%
                            {konflikt && <span className="text-red-600 ml-2">({konflikt.konfliktTage}d Konflikt)</span>}
                          </p>
                        </div>
                        <div className="relative h-12" style={{ width: `${ganttBreite}px` }}>
                          {/* Hintergrund-Streifen */}
                          <div className="absolute inset-0 flex">
                            {zeitskala === 'monate' ? (
                              monateHeader.map((monat, i) => (
                                <div key={i} className={`h-full border-r border-apleona-gray-100 ${i % 2 === 0 ? 'bg-blue-50' : 'bg-white'}`}
                                  style={{ width: `${monat.breite * 3}px` }} />
                              ))
                            ) : (
                              zeiteinheitenHeader.map((_, i) => (
                                <div key={i} className={`h-full border-r border-apleona-gray-100 ${i % 2 === 0 ? 'bg-blue-50' : 'bg-white'}`}
                                  style={{ width: zeitskala === 'tage' ? '30px' : '50px' }} />
                              ))
                            )}
                          </div>

                          {/* Konflikt-Balken (grau gestreift) - klickbar */}
                          {konfliktBalken && konfliktBalken.width > 0 && (
                            <div
                              className="absolute top-4 h-4 rounded border border-gray-400 cursor-pointer hover:opacity-80 z-10"
                              style={{
                                left: `${konfliktBalken.left}px`,
                                width: `${konfliktBalken.width}px`,
                                background: 'repeating-linear-gradient(45deg, #9ca3af, #9ca3af 4px, #d1d5db 4px, #d1d5db 8px)'
                              }}
                              title={`Konflikt: ${konflikt!.konfliktTage} Tage - Klicken zum Bearbeiten`}
                              onClick={() => handleEdit(aufgabe)}
                            />
                          )}

                          {/* Soll-Balken - klickbar */}
                          {sollBalken.width > 0 && !konfliktBalken && (
                            <div
                              className="absolute top-1 h-4 rounded bg-apleona-navy opacity-40 cursor-pointer hover:opacity-60 z-10"
                              style={{ left: `${sollBalken.left}px`, width: `${sollBalken.width}px` }}
                              title={`Soll: ${formatDatum(aufgabe.startDatumSoll)} - ${formatDatum(aufgabe.endDatumSoll)} - Klicken zum Bearbeiten`}
                              onClick={() => handleEdit(aufgabe)}
                            />
                          )}

                          {/* Ist-Balken oder Haupt-Balken - klickbar */}
                          {istBalken.width > 0 ? (
                            <div
                              className={`absolute top-6 h-4 rounded cursor-pointer hover:opacity-80 z-10 ${aufgabe.status === 'verzoegert' ? 'bg-status-red' : 'bg-apleona-navy'}`}
                              style={{ left: `${istBalken.left}px`, width: `${istBalken.width}px` }}
                              title={`Ist: ${formatDatum(aufgabe.startDatumIst)} - ${formatDatum(aufgabe.endDatumIst)} - Klicken zum Bearbeiten`}
                              onClick={() => handleEdit(aufgabe)}
                            >
                              <div className="h-full bg-status-green rounded-l opacity-50" style={{ width: `${aufgabe.fortschrittProzent}%` }} />
                            </div>
                          ) : sollBalken.width > 0 && !konfliktBalken && (
                            <div
                              className={`absolute top-4 h-4 rounded cursor-pointer hover:opacity-80 z-10 ${StatusColors[aufgabe.status]}`}
                              style={{ left: `${sollBalken.left}px`, width: `${sollBalken.width}px` }}
                              title={`Klicken zum Bearbeiten`}
                              onClick={() => handleEdit(aufgabe)}
                            >
                              <div className="h-full bg-status-green rounded-l" style={{ width: `${aufgabe.fortschrittProzent}%` }} />
                            </div>
                          )}

                          {/* Bei Konflikt: Rest-Balken nach Konflikt - klickbar */}
                          {konfliktBalken && sollBalken.width > konfliktBalken.width && (
                            <div
                              className={`absolute top-4 h-4 rounded-r cursor-pointer hover:opacity-80 z-10 ${StatusColors[aufgabe.status]}`}
                              style={{
                                left: `${konfliktBalken.left + konfliktBalken.width}px`,
                                width: `${sollBalken.width - konfliktBalken.width}px`
                              }}
                              title={`Klicken zum Bearbeiten`}
                              onClick={() => handleEdit(aufgabe)}
                            >
                              <div className="h-full bg-status-green rounded-l" style={{ width: `${aufgabe.fortschrittProzent}%` }} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legende */}
                <div className="flex items-center flex-wrap gap-6 mt-4 pt-4 border-t border-apleona-gray-200 text-xs text-apleona-gray-600">
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
                  <div className="flex items-center">
                    <div className="w-4 h-3 rounded border border-gray-400 mr-2"
                      style={{ background: 'repeating-linear-gradient(45deg, #9ca3af, #9ca3af 2px, #d1d5db 2px, #d1d5db 4px)' }}></div>
                    <span>Konflikt (Vorgänger nicht beendet)</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-6 h-3 mr-2" viewBox="0 0 24 12">
                      <defs>
                        <marker id="arrowhead-legend" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                          <polygon points="0 0, 6 2, 0 4" fill="#002D5A" />
                        </marker>
                      </defs>
                      <path d="M 2 6 L 18 6" stroke="#002D5A" strokeWidth="2" markerEnd="url(#arrowhead-legend)" />
                    </svg>
                    <span>Abhängigkeit</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {zeigeModal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setZeigeModal(false)}>
          <div className="modal-content p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">{editAufgabe ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</h2>

            <div className="space-y-4">
              <div>
                <label className="label">Titel</label>
                <input type="text" value={formData.titel} onChange={e => setFormData({ ...formData, titel: e.target.value })} className="input-field" />
              </div>

              <div>
                <label className="label">Beschreibung</label>
                <textarea value={formData.beschreibung} onChange={e => setFormData({ ...formData, beschreibung: e.target.value })}
                  className="input-field" rows={4} placeholder="Detaillierte Beschreibung der Aufgabe..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Gewerk</label>
                  <select value={formData.gewerkId} onChange={e => setFormData({ ...formData, gewerkId: e.target.value })} className="input-field">
                    <option value="">Keines</option>
                    {projekt.gewerke.map(g => <option key={g.id} value={g.id}>{g.dinNummer} - {g.bezeichnung}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as AufgabenStatus })} className="input-field">
                    {Object.entries(StatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Startdatum (Soll)</label>
                  <input type="date" value={formData.startDatumSoll} onChange={e => setFormData({ ...formData, startDatumSoll: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="label">Enddatum (Soll)</label>
                  <input type="date" value={formData.endDatumSoll} onChange={e => setFormData({ ...formData, endDatumSoll: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="label">Enddatum (Ist)</label>
                  <input type="date" value={formData.endDatumIst} onChange={e => setFormData({ ...formData, endDatumIst: e.target.value })} className="input-field" />
                  {formData.endDatumSoll && formData.endDatumIst && formData.endDatumIst > formData.endDatumSoll && (
                    <p className="text-xs text-status-red mt-1">
                      Verzögert um {Math.ceil((new Date(formData.endDatumIst).getTime() - new Date(formData.endDatumSoll).getTime()) / (1000 * 60 * 60 * 24))} Tage
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="label">AHO-Phasen</label>
                <div className="flex flex-wrap gap-2">
                  {AHO_PHASEN.map(phase => (
                    <button key={phase} type="button" onClick={() => togglePhase(phase)}
                      className={`px-3 py-1 rounded text-sm ${formData.phasen.includes(phase) ? 'bg-apleona-navy text-white' : 'bg-apleona-gray-200 text-apleona-gray-700'}`}>
                      {phase}
                    </button>
                  ))}
                </div>
              </div>

              {/* Abhängigkeiten */}
              <div>
                <label className="label">Abhängigkeiten (Vorgänger-Aufgaben)</label>
                <p className="text-xs text-apleona-gray-500 mb-2">Diese Aufgabe kann erst starten, wenn die ausgewählten Vorgänger abgeschlossen sind.</p>
                <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1 bg-apleona-gray-50">
                  {projekt.aufgaben.filter(a => a.id !== editAufgabe?.id).length === 0 ? (
                    <p className="text-sm text-apleona-gray-500 italic">Keine anderen Aufgaben vorhanden</p>
                  ) : (
                    projekt.aufgaben.filter(a => a.id !== editAufgabe?.id).map(a => (
                      <label key={a.id} className="flex items-center space-x-2 cursor-pointer hover:bg-white p-1 rounded">
                        <input type="checkbox" checked={formData.abhaengigkeitenIds.includes(a.id)} onChange={() => toggleAbhaengigkeit(a.id)} />
                        <span className="text-sm">{a.titel}</span>
                        {a.endDatumSoll && <span className="text-xs text-apleona-gray-500">(bis {formatDatum(a.endDatumSoll)})</span>}
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setZeigeModal(false)} className="btn-secondary">Abbrechen</button>
              <button onClick={handleSave} disabled={!formData.titel} className="btn-primary disabled:opacity-50">Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabAufgaben;
