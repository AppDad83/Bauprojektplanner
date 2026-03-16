'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLogo from './AppLogo';
import { useData } from '@/lib/DataContext';
import { Projekt } from '@/types';

interface HeaderProps {
  showNavigation?: boolean;
}

interface SuchErgebnis {
  projektId: string;
  projektName: string;
  treffer: string;
  typ: string;
}

const Header: React.FC<HeaderProps> = ({ showNavigation = true }) => {
  const { daten, ladeJSON, speichereJSON, zeigeAutoSaveHinweis, setZeigeAutoSaveHinweis } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [suchbegriff, setSuchbegriff] = useState('');
  const [suchErgebnisse, setSuchErgebnisse] = useState<SuchErgebnis[]>([]);
  const [zeigeSuche, setZeigeSuche] = useState(false);
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await ladeJSON(file);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Fehler beim Laden');
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const durchsucheProjekte = (suche: string): SuchErgebnis[] => {
    if (!daten || !suche.trim() || suche.length < 2) return [];
    const s = suche.toLowerCase();
    const ergebnisse: SuchErgebnis[] = [];

    daten.projekte.forEach(p => {
      // Projektname
      if (p.name.toLowerCase().includes(s)) {
        ergebnisse.push({ projektId: p.id, projektName: p.name, treffer: p.name, typ: 'Projekt' });
      }
      // Beschreibung
      if (p.beschreibung?.toLowerCase().includes(s)) {
        ergebnisse.push({ projektId: p.id, projektName: p.name, treffer: p.beschreibung.substring(0, 50) + '...', typ: 'Beschreibung' });
      }
      // Fachplaner
      p.fachplaner.forEach(fp => {
        if (fp.firma.toLowerCase().includes(s) || fp.name.toLowerCase().includes(s)) {
          ergebnisse.push({ projektId: p.id, projektName: p.name, treffer: fp.firma, typ: 'Fachplaner' });
        }
      });
      // Fachfirmen
      p.fachfirmen.forEach(ff => {
        if (ff.firma.toLowerCase().includes(s) || ff.name.toLowerCase().includes(s)) {
          ergebnisse.push({ projektId: p.id, projektName: p.name, treffer: ff.firma, typ: 'Fachfirma' });
        }
      });
      // Stakeholder
      p.stakeholder.forEach(sh => {
        if (sh.name.toLowerCase().includes(s) || sh.firma.toLowerCase().includes(s)) {
          ergebnisse.push({ projektId: p.id, projektName: p.name, treffer: `${sh.name} (${sh.firma})`, typ: 'Stakeholder' });
        }
      });
      // Mängel
      p.maengel.forEach(m => {
        if (m.beschreibung.toLowerCase().includes(s)) {
          ergebnisse.push({ projektId: p.id, projektName: p.name, treffer: `Mangel #${m.mangelnummer}: ${m.beschreibung.substring(0, 40)}...`, typ: 'Mangel' });
        }
      });
      // Nachträge
      p.nachtraege.forEach(n => {
        if (n.beschreibung.toLowerCase().includes(s) || n.nachtragsnummer.toLowerCase().includes(s)) {
          ergebnisse.push({ projektId: p.id, projektName: p.name, treffer: `${n.nachtragsnummer}: ${n.beschreibung.substring(0, 40)}...`, typ: 'Nachtrag' });
        }
      });
      // Aufgaben
      p.aufgaben.forEach(a => {
        if (a.titel.toLowerCase().includes(s) || a.beschreibung?.toLowerCase().includes(s)) {
          ergebnisse.push({ projektId: p.id, projektName: p.name, treffer: a.titel, typ: 'Aufgabe' });
        }
      });
      // Gewerke
      p.gewerke.forEach(g => {
        if (g.bezeichnung.toLowerCase().includes(s) || g.dinNummer.toLowerCase().includes(s)) {
          ergebnisse.push({ projektId: p.id, projektName: p.name, treffer: `${g.dinNummer} - ${g.bezeichnung}`, typ: 'Gewerk' });
        }
      });
    });

    return ergebnisse.slice(0, 10); // Max 10 Ergebnisse
  };

  const handleSuchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const wert = e.target.value;
    setSuchbegriff(wert);
    setSuchErgebnisse(durchsucheProjekte(wert));
    setZeigeSuche(true);
  };

  const handleErgebnisClick = (projektId: string) => {
    router.push(`/projekt/${projektId}`);
    setSuchbegriff('');
    setSuchErgebnisse([]);
    setZeigeSuche(false);
  };

  return (
    <header className="bg-white border-b border-apleona-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <AppLogo width={140} height={35} />
            <span className="ml-3 text-sm text-apleona-gray-500 hidden sm:block">
              Bauprojektmanagement
            </span>
          </Link>

          {/* Navigation */}
          {showNavigation && daten && (
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/"
                className="text-apleona-gray-600 hover:text-apleona-navy font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/fristen"
                className="text-apleona-gray-600 hover:text-apleona-navy font-medium"
              >
                Fristen-Cockpit
              </Link>
            </nav>
          )}

          {/* Suchfeld */}
          {daten && (
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={suchbegriff}
                  onChange={handleSuchChange}
                  onFocus={() => setZeigeSuche(true)}
                  onBlur={() => setTimeout(() => setZeigeSuche(false), 200)}
                  placeholder="Suchen..."
                  className="input-field pl-9 pr-4 py-1.5 w-48 text-sm"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-apleona-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {/* Suchergebnisse Dropdown */}
              {zeigeSuche && suchErgebnisse.length > 0 && (
                <div className="absolute top-full mt-1 w-80 bg-white rounded-lg shadow-lg border border-apleona-gray-200 z-50 max-h-96 overflow-y-auto">
                  {suchErgebnisse.map((e, i) => (
                    <button
                      key={i}
                      onClick={() => handleErgebnisClick(e.projektId)}
                      className="w-full text-left px-4 py-2 hover:bg-apleona-gray-50 border-b border-apleona-gray-100 last:border-b-0"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-apleona-gray-900 truncate">{e.treffer}</span>
                        <span className="text-xs text-apleona-gray-500 ml-2 whitespace-nowrap">{e.typ}</span>
                      </div>
                      <span className="text-xs text-apleona-gray-500">{e.projektName}</span>
                    </button>
                  ))}
                </div>
              )}
              {zeigeSuche && suchbegriff.length >= 2 && suchErgebnisse.length === 0 && (
                <div className="absolute top-full mt-1 w-80 bg-white rounded-lg shadow-lg border border-apleona-gray-200 z-50 p-4 text-center text-sm text-apleona-gray-500">
                  Keine Ergebnisse gefunden
                </div>
              )}
            </div>
          )}

          {/* Aktionen */}
          <div className="flex items-center space-x-4">
            {/* Versteckter File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />

            {/* Laden Button */}
            {daten && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Laden
              </button>
            )}

            {/* Auto-Save Hinweis */}
            {zeigeAutoSaveHinweis && (
              <div className="flex items-center bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                <svg
                  className="w-4 h-4 text-amber-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="text-sm text-amber-700 mr-2">
                  Vergiss nicht zu speichern!
                </span>
                <button
                  onClick={() => setZeigeAutoSaveHinweis(false)}
                  className="text-amber-500 hover:text-amber-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Speichern Button */}
            {daten && (
              <button
                onClick={speichereJSON}
                className="btn-primary flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Speichern
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
