'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useData } from '@/lib/DataContext';
import { FristWarnung, AmpelStatus } from '@/types';
import { formatDatum, sammelAlleFristwarnungen, tageBisFrist } from '@/lib/utils';
import Header from '@/components/Header';

const FristenTypLabels: Record<FristWarnung['typ'], string> = {
  gewaehrleistung: 'Gewährleistung',
  buergschaft: 'Bürgschaft',
  zahlung: 'Zahlung',
  eigentuemer_entscheidung: 'Eigentümer-Entscheidung',
  abnahme: 'Abnahme',
  mangel: 'Mangel',
  nachtrag: 'Nachtrag'
};

const AmpelBadge: React.FC<{ status: AmpelStatus }> = ({ status }) => {
  const config = {
    gruen: { bg: 'bg-status-green', text: 'text-white', label: 'Grün' },
    gelb: { bg: 'bg-status-yellow', text: 'text-gray-900', label: 'Gelb' },
    rot: { bg: 'bg-status-red', text: 'text-white', label: 'Rot' }
  };

  const { bg, text, label } = config[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
};

export default function FristenCockpit() {
  const { daten, istGeladen } = useData();
  const [filterProjekt, setFilterProjekt] = useState<string>('alle');
  const [filterTyp, setFilterTyp] = useState<string>('alle');
  const [filterAmpel, setFilterAmpel] = useState<string>('alle');
  const [sortierung, setSortierung] = useState<'datum' | 'projekt' | 'typ'>('datum');

  const alleFristen = useMemo(() => {
    if (!daten) return [];
    return sammelAlleFristwarnungen(daten.projekte);
  }, [daten]);

  const gefiltert = useMemo(() => {
    let result = [...alleFristen];

    if (filterProjekt !== 'alle') {
      result = result.filter(f => f.projektId === filterProjekt);
    }
    if (filterTyp !== 'alle') {
      result = result.filter(f => f.typ === filterTyp);
    }
    if (filterAmpel !== 'alle') {
      result = result.filter(f => f.ampel === filterAmpel);
    }

    // Sortierung
    if (sortierung === 'datum') {
      result.sort((a, b) => new Date(a.fristDatum).getTime() - new Date(b.fristDatum).getTime());
    } else if (sortierung === 'projekt') {
      result.sort((a, b) => a.projektName.localeCompare(b.projektName));
    } else if (sortierung === 'typ') {
      result.sort((a, b) => a.typ.localeCompare(b.typ));
    }

    return result;
  }, [alleFristen, filterProjekt, filterTyp, filterAmpel, sortierung]);

  if (!istGeladen || !daten) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Bitte laden Sie zuerst eine Projektdatei.</p>
      </div>
    );
  }

  const fristenTypen = Array.from(new Set(alleFristen.map(f => f.typ)));
  const anzahlRot = alleFristen.filter(f => f.ampel === 'rot').length;
  const anzahlGelb = alleFristen.filter(f => f.ampel === 'gelb').length;
  const anzahlGruen = alleFristen.filter(f => f.ampel === 'gruen').length;

  return (
    <div className="min-h-screen bg-apleona-gray-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-apleona-navy hover:underline text-sm mb-2 inline-block">
            ← Zurück zum Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-apleona-gray-900">Fristen-Cockpit</h1>
          <p className="text-apleona-gray-600">Alle zeitkritischen Fristen über alle Projekte</p>
        </div>

        {/* Statistik-Karten */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="card flex items-center">
            <div className="w-12 h-12 rounded-full bg-status-red flex items-center justify-center text-white font-bold text-xl">
              {anzahlRot}
            </div>
            <div className="ml-4">
              <p className="text-sm text-apleona-gray-600">Kritisch</p>
              <p className="font-semibold text-apleona-gray-900">&lt; 7 Tage</p>
            </div>
          </div>
          <div className="card flex items-center">
            <div className="w-12 h-12 rounded-full bg-status-yellow flex items-center justify-center text-gray-900 font-bold text-xl">
              {anzahlGelb}
            </div>
            <div className="ml-4">
              <p className="text-sm text-apleona-gray-600">Warnung</p>
              <p className="font-semibold text-apleona-gray-900">8-30 Tage</p>
            </div>
          </div>
          <div className="card flex items-center">
            <div className="w-12 h-12 rounded-full bg-status-green flex items-center justify-center text-white font-bold text-xl">
              {anzahlGruen}
            </div>
            <div className="ml-4">
              <p className="text-sm text-apleona-gray-600">OK</p>
              <p className="font-semibold text-apleona-gray-900">&gt; 30 Tage</p>
            </div>
          </div>
          <div className="card flex items-center">
            <div className="w-12 h-12 rounded-full bg-apleona-navy flex items-center justify-center text-white font-bold text-xl">
              {alleFristen.length}
            </div>
            <div className="ml-4">
              <p className="text-sm text-apleona-gray-600">Gesamt</p>
              <p className="font-semibold text-apleona-gray-900">Alle Fristen</p>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Projekt</label>
              <select
                value={filterProjekt}
                onChange={e => setFilterProjekt(e.target.value)}
                className="input-field"
              >
                <option value="alle">Alle Projekte</option>
                {daten.projekte.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Fristentyp</label>
              <select
                value={filterTyp}
                onChange={e => setFilterTyp(e.target.value)}
                className="input-field"
              >
                <option value="alle">Alle Typen</option>
                {fristenTypen.map(typ => (
                  <option key={typ} value={typ}>{FristenTypLabels[typ]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={filterAmpel}
                onChange={e => setFilterAmpel(e.target.value)}
                className="input-field"
              >
                <option value="alle">Alle</option>
                <option value="rot">Kritisch (Rot)</option>
                <option value="gelb">Warnung (Gelb)</option>
                <option value="gruen">OK (Grün)</option>
              </select>
            </div>
            <div>
              <label className="label">Sortierung</label>
              <select
                value={sortierung}
                onChange={e => setSortierung(e.target.value as any)}
                className="input-field"
              >
                <option value="datum">Nach Datum</option>
                <option value="projekt">Nach Projekt</option>
                <option value="typ">Nach Typ</option>
              </select>
            </div>
          </div>
        </div>

        {/* Fristen-Tabelle */}
        <div className="card">
          {gefiltert.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-apleona-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-apleona-gray-900">Keine Fristen</h3>
              <p className="mt-1 text-sm text-apleona-gray-500">
                Es gibt keine Fristen, die den Filterkriterien entsprechen.
              </p>
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
                      Frist
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Tage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Typ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Projekt
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Beschreibung
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-apleona-gray-200">
                  {gefiltert.map(frist => {
                    const tage = tageBisFrist(frist.fristDatum);
                    return (
                      <tr key={frist.id} className="hover:bg-apleona-gray-50">
                        <td className="px-4 py-4">
                          <AmpelBadge status={frist.ampel} />
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-apleona-gray-900">
                          {formatDatum(frist.fristDatum)}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span className={`font-medium ${tage < 0 ? 'text-status-red' : tage < 7 ? 'text-status-yellow' : 'text-apleona-gray-600'}`}>
                            {tage < 0 ? `${Math.abs(tage)} überfällig` : `${tage} Tage`}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="badge-info">
                            {FristenTypLabels[frist.typ]}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <Link
                            href={`/projekt/${frist.projektId}`}
                            className="text-apleona-navy hover:underline"
                          >
                            {frist.projektName}
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-sm text-apleona-gray-600">
                          {frist.beschreibung}
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
    </div>
  );
}
