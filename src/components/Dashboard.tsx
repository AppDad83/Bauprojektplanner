'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useData } from '@/lib/DataContext';
import { Projekt, AmpelStatus, ProjektStatus, PROJEKT_STATUS_CONFIG } from '@/types';
import {
  formatDatum,
  formatWaehrung,
  sammelAlleFristwarnungen,
  erstelleLeeresProjekt,
  kopiereProjektAlsVorlage,
  berechneBudgetUebersicht
} from '@/lib/utils';
import Header from './Header';

const AmpelBadge: React.FC<{ status: AmpelStatus }> = ({ status }) => {
  const colors = {
    gruen: 'bg-status-green',
    gelb: 'bg-status-yellow',
    rot: 'bg-status-red'
  };

  return (
    <span className={`inline-block w-4 h-4 rounded-full ${colors[status]}`} />
  );
};

const ProjektStatusBadge: React.FC<{ status: ProjektStatus }> = ({ status }) => {
  const config = PROJEKT_STATUS_CONFIG[status];
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${config?.color || 'bg-status-gray'} ${config?.textColor || 'text-gray-800'}`}>
      {config?.label || status}
    </span>
  );
};

const Dashboard: React.FC = () => {
  const { daten, fuegeProejktHinzu, loescheProjekt, aktualisiereProjekt } = useData();
  const [zeigeProjektModal, setZeigeProjektModal] = useState(false);
  const [zeigeKopieModal, setZeigeKopieModal] = useState(false);
  const [ausgewaehltesProjektId, setAusgewaehltesProjektId] = useState<string | null>(null);
  const [neuerProjektname, setNeuerProjektname] = useState('');
  const [suchbegriff, setSuchbegriff] = useState('');

  if (!daten) return null;

  // Erweiterte Suchfunktion - sucht in vielen Feldern
  const sucheProjekte = (projekte: Projekt[], suche: string): Projekt[] => {
    if (!suche.trim()) return projekte;
    const s = suche.toLowerCase();

    return projekte.filter(p => {
      // Projektname, Nummern, Adresse
      if (p.name.toLowerCase().includes(s)) return true;
      if (p.projektnummerApleona?.toLowerCase().includes(s)) return true;
      if (p.projektnummerEigentuemer?.toLowerCase().includes(s)) return true;
      if (p.liegenschaftAdresse?.toLowerCase().includes(s)) return true;
      if (p.beschreibung?.toLowerCase().includes(s)) return true;
      if (p.notizen?.toLowerCase().includes(s)) return true;

      // Eigentümer
      if (p.eigentuemer.some(e => e.toLowerCase().includes(s))) return true;

      // Phase
      if (p.aktuellePhase.toLowerCase().includes(s)) return true;

      // Stakeholder
      if (p.stakeholder.some(sh =>
        sh.name.toLowerCase().includes(s) ||
        sh.firma.toLowerCase().includes(s) ||
        sh.rolle.toLowerCase().includes(s)
      )) return true;

      // Fachplaner
      if (p.fachplaner.some(fp =>
        fp.firma.toLowerCase().includes(s) ||
        fp.name.toLowerCase().includes(s) ||
        fp.kontakt.ansprechpartner?.toLowerCase().includes(s) ||
        fp.notizen?.toLowerCase().includes(s)
      )) return true;

      // Fachfirmen
      if (p.fachfirmen.some(ff =>
        ff.firma.toLowerCase().includes(s) ||
        ff.name.toLowerCase().includes(s) ||
        ff.kontakt.ansprechpartner?.toLowerCase().includes(s) ||
        ff.notizen?.toLowerCase().includes(s)
      )) return true;

      // Gewerke
      if (p.gewerke.some(g =>
        g.bezeichnung.toLowerCase().includes(s) ||
        g.dinNummer.toLowerCase().includes(s) ||
        g.notizen?.toLowerCase().includes(s)
      )) return true;

      // Mängel
      if (p.maengel.some(m =>
        m.beschreibung.toLowerCase().includes(s) ||
        m.ortBauteil.toLowerCase().includes(s) ||
        m.notizen?.toLowerCase().includes(s)
      )) return true;

      // Nachträge
      if (p.nachtraege.some(n =>
        n.beschreibung.toLowerCase().includes(s) ||
        n.nachtragsnummer.toLowerCase().includes(s) ||
        n.notizen?.toLowerCase().includes(s)
      )) return true;

      // Aufgaben (inkl. Unteraufgaben)
      if (p.aufgaben.some(a =>
        a.titel.toLowerCase().includes(s) ||
        a.beschreibung?.toLowerCase().includes(s) ||
        a.unteraufgaben.some(ua =>
          ua.titel.toLowerCase().includes(s) ||
          ua.beschreibung?.toLowerCase().includes(s)
        )
      )) return true;

      return false;
    });
  };

  const alleProjekte = daten.projekte;
  const projekte = sucheProjekte(alleProjekte, suchbegriff);
  const alleFristwarnungen = sammelAlleFristwarnungen(alleProjekte);
  const dringendeFristen = alleFristwarnungen.filter(w => w.ampel === 'rot' || w.ampel === 'gelb').slice(0, 5);

  // Offene Eigentümer-Entscheidungen
  const offeneEntscheidungen = alleProjekte.flatMap(p => {
    const beteiligter = [...p.fachplaner, ...p.fachfirmen].filter(
      b => b.vergabeEmpfehlung.gesendetAm &&
           !b.vergabeEmpfehlung.genehmigtAm &&
           !b.vergabeEmpfehlung.abgelehntAm
    );
    return beteiligter.map(b => ({
      projektName: p.name,
      firma: b.firma,
      gesendetAm: b.vergabeEmpfehlung.gesendetAm!
    }));
  });

  // Bürgschaften die noch zurückgesendet werden müssen
  const offeneBuergschaften = alleProjekte.flatMap(p =>
    p.fachfirmen
      .filter(ff => ff.gewaehrleistung.buergschaft && !ff.gewaehrleistung.buergschaft.urkundeZurueckgesendet)
      .map(ff => ({
        projektName: p.name,
        firma: ff.firma
      }))
  );

  // Offene Mängel mit überschrittener Frist
  const ueberfaelligeMaengel = alleProjekte.flatMap(p =>
    p.maengel
      .filter(m => {
        if (m.status === 'behoben' || m.status === 'abgenommen') return false;
        const frist = new Date(m.fristBehebung);
        return frist < new Date();
      })
      .map(m => ({
        projektName: p.name,
        mangelnummer: m.mangelnummer,
        beschreibung: m.beschreibung.substring(0, 50)
      }))
  );

  // Offene Nachträge in Prüfung
  const offeneNachtraege = alleProjekte.flatMap(p =>
    p.nachtraege
      .filter(n => n.status === 'gestellt' || n.status === 'in_pruefung')
      .map(n => ({
        projektName: p.name,
        nachtragsnummer: n.nachtragsnummer,
        betrag: n.betragNettoAngefragt
      }))
  );

  const handleNeuesProjekt = () => {
    const neuesProjekt = erstelleLeeresProjekt();
    fuegeProejktHinzu(neuesProjekt);
    setZeigeProjektModal(false);
  };

  const handleProjektKopieren = () => {
    if (!ausgewaehltesProjektId || !neuerProjektname.trim()) return;
    const quellProjekt = projekte.find(p => p.id === ausgewaehltesProjektId);
    if (!quellProjekt) return;

    const kopie = kopiereProjektAlsVorlage(quellProjekt, neuerProjektname);
    fuegeProejktHinzu(kopie);
    setZeigeKopieModal(false);
    setNeuerProjektname('');
    setAusgewaehltesProjektId(null);
  };

  const handleProjektLoeschen = (projektId: string) => {
    if (window.confirm('Möchten Sie dieses Projekt wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      loescheProjekt(projektId);
    }
  };

  return (
    <div className="min-h-screen bg-apleona-gray-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Überschrift und Aktionen */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-apleona-gray-900">Dashboard</h1>
            <p className="text-apleona-gray-600">Projektübersicht und Warnungen</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setZeigeProjektModal(true)}
              className="btn-primary flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neues Projekt
            </button>
            {projekte.length > 0 && (
              <button
                onClick={() => setZeigeKopieModal(true)}
                className="btn-secondary flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Projekt kopieren
              </button>
            )}
          </div>
        </div>

        {/* Warnungen Grid */}
        {(dringendeFristen.length > 0 || offeneEntscheidungen.length > 0 ||
          offeneBuergschaften.length > 0 || ueberfaelligeMaengel.length > 0 ||
          offeneNachtraege.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* Dringende Fristen */}
            {dringendeFristen.length > 0 && (
              <div className="card border-l-4 border-l-status-red">
                <h3 className="font-semibold text-apleona-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-status-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Dringende Fristen
                </h3>
                <ul className="space-y-2">
                  {dringendeFristen.map(f => (
                    <li key={f.id} className="text-sm flex items-start">
                      <AmpelBadge status={f.ampel} />
                      <span className="ml-2">
                        <span className="font-medium">{f.projektName}:</span>{' '}
                        {f.beschreibung} ({formatDatum(f.fristDatum)})
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href="/fristen" className="text-sm text-apleona-navy hover:underline mt-3 inline-block">
                  Alle Fristen anzeigen →
                </Link>
              </div>
            )}

            {/* Offene Eigentümer-Entscheidungen */}
            {offeneEntscheidungen.length > 0 && (
              <div className="card border-l-4 border-l-status-yellow">
                <h3 className="font-semibold text-apleona-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-status-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Ausstehende Entscheidungen
                </h3>
                <ul className="space-y-2">
                  {offeneEntscheidungen.slice(0, 5).map((e, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium">{e.projektName}:</span>{' '}
                      {e.firma} (seit {formatDatum(e.gesendetAm)})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Bürgschaften zurücksenden */}
            {offeneBuergschaften.length > 0 && (
              <div className="card border-l-4 border-l-apleona-navy">
                <h3 className="font-semibold text-apleona-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-apleona-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Bürgschaften zurücksenden
                </h3>
                <ul className="space-y-2">
                  {offeneBuergschaften.slice(0, 5).map((b, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium">{b.projektName}:</span> {b.firma}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Überfällige Mängel */}
            {ueberfaelligeMaengel.length > 0 && (
              <div className="card border-l-4 border-l-status-red">
                <h3 className="font-semibold text-apleona-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-status-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Überfällige Mängel
                </h3>
                <ul className="space-y-2">
                  {ueberfaelligeMaengel.slice(0, 5).map((m, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium">{m.projektName}:</span>{' '}
                      Mangel #{m.mangelnummer} - {m.beschreibung}...
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Offene Nachträge */}
            {offeneNachtraege.length > 0 && (
              <div className="card border-l-4 border-l-status-yellow">
                <h3 className="font-semibold text-apleona-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-status-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Nachträge in Prüfung
                </h3>
                <ul className="space-y-2">
                  {offeneNachtraege.slice(0, 5).map((n, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium">{n.projektName}:</span>{' '}
                      {n.nachtragsnummer} ({formatWaehrung(n.betrag)})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Projektliste */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-apleona-gray-900">Projekte</h2>
            {/* Suchfeld */}
            <div className="relative">
              <input
                type="text"
                value={suchbegriff}
                onChange={e => setSuchbegriff(e.target.value)}
                placeholder="Suchen..."
                className="input-field pl-10 w-64"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-apleona-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {suchbegriff && (
                <button
                  onClick={() => setSuchbegriff('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-apleona-gray-400 hover:text-apleona-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Suchhinweis */}
          {suchbegriff && (
            <p className="text-sm text-apleona-gray-500 mb-4">
              {projekte.length} von {alleProjekte.length} Projekten gefunden für &ldquo;{suchbegriff}&rdquo;
            </p>
          )}

          {projekte.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-apleona-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-apleona-gray-900">Keine Projekte</h3>
              <p className="mt-1 text-sm text-apleona-gray-500">
                Erstellen Sie Ihr erstes Projekt, um loszulegen.
              </p>
              <button
                onClick={() => setZeigeProjektModal(true)}
                className="mt-4 btn-primary"
              >
                Neues Projekt erstellen
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-apleona-gray-200">
                <thead className="bg-apleona-navy">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Projektname
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Projektnummer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Phase
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-apleona-gray-200">
                  {projekte.map(projekt => {
                    const budget = berechneBudgetUebersicht(projekt);
                    return (
                      <tr key={projekt.id} className="hover:bg-apleona-gray-50">
                        <td className="px-4 py-4">
                          <ProjektStatusBadge status={projekt.status} />
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            href={`/projekt/${projekt.id}`}
                            className="text-apleona-navy hover:underline font-medium"
                          >
                            {projekt.name}
                          </Link>
                          <p className="text-xs text-apleona-gray-500">{projekt.liegenschaftAdresse}</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-apleona-gray-600">
                          {projekt.projektnummerApleona || '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-apleona-gray-600">
                          {projekt.aktuellePhase}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <AmpelBadge status={budget.ampel} />
                            <span className="ml-2 text-sm">
                              {formatWaehrung(budget.summeFachplanerBudgets + budget.summeFachfirmenBudgets)} /
                              {formatWaehrung(budget.projektbudgetFreigegeben)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex space-x-2">
                            <Link
                              href={`/projekt/${projekt.id}`}
                              className="text-apleona-navy hover:text-apleona-navy-dark"
                              title="Bearbeiten"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Link>
                            <button
                              onClick={() => handleProjektLoeschen(projekt.id)}
                              className="text-apleona-red hover:text-apleona-red-dark"
                              title="Löschen"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal: Neues Projekt */}
      {zeigeProjektModal && (
        <div className="modal-overlay" onClick={() => setZeigeProjektModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Neues Projekt erstellen</h2>
            <p className="text-apleona-gray-600 mb-6">
              Ein leeres Projekt wird erstellt. Sie können die Details anschließend bearbeiten.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setZeigeProjektModal(false)}
                className="btn-secondary"
              >
                Abbrechen
              </button>
              <button
                onClick={handleNeuesProjekt}
                className="btn-primary"
              >
                Projekt erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Projekt kopieren */}
      {zeigeKopieModal && (
        <div className="modal-overlay" onClick={() => setZeigeKopieModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Projekt als Vorlage kopieren</h2>
            <p className="text-apleona-gray-600 mb-4">
              Kopiert: Gewerke-Struktur, Aufgaben-Struktur, Stakeholder, Fee %<br />
              <span className="text-apleona-red">Nicht kopiert: Rechnungen, Budgets, Ist-Daten, Mängel, Nachträge</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="label">Quellprojekt</label>
                <select
                  value={ausgewaehltesProjektId || ''}
                  onChange={e => setAusgewaehltesProjektId(e.target.value)}
                  className="input-field"
                >
                  <option value="">Bitte wählen...</option>
                  {projekte.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Name des neuen Projekts</label>
                <input
                  type="text"
                  value={neuerProjektname}
                  onChange={e => setNeuerProjektname(e.target.value)}
                  className="input-field"
                  placeholder="z.B. Sanierung Hauptstraße 15"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setZeigeKopieModal(false);
                  setNeuerProjektname('');
                  setAusgewaehltesProjektId(null);
                }}
                className="btn-secondary"
              >
                Abbrechen
              </button>
              <button
                onClick={handleProjektKopieren}
                disabled={!ausgewaehltesProjektId || !neuerProjektname.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Projekt kopieren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
