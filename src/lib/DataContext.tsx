'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AppDaten, Projekt } from '@/types';
import { erstelleLeereAppDaten, getJsonDateiname, generateId } from './utils';

interface DataContextType {
  daten: AppDaten | null;
  istGeladen: boolean;
  ladeJSON: (file: File) => Promise<void>;
  speichereJSON: () => void;
  aktualisiereDaten: (neueDaten: AppDaten) => void;
  fuegeProejktHinzu: (projekt: Projekt) => void;
  aktualisiereProjekt: (projekt: Projekt) => void;
  loescheProjekt: (projektId: string) => void;
  getProjekt: (projektId: string) => Projekt | undefined;
  setzeNeuesDatenObjekt: () => void;
  letztesSpeicherdatum: Date | null;
  zeigeAutoSaveHinweis: boolean;
  setZeigeAutoSaveHinweis: (value: boolean) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [daten, setDaten] = useState<AppDaten | null>(null);
  const [istGeladen, setIstGeladen] = useState(false);
  const [letztesSpeicherdatum, setLetztesSpeicherdatum] = useState<Date | null>(null);
  const [zeigeAutoSaveHinweis, setZeigeAutoSaveHinweis] = useState(false);

  // Auto-Save Hinweis alle 15 Minuten
  useEffect(() => {
    if (!daten) return;

    const interval = setInterval(() => {
      setZeigeAutoSaveHinweis(true);
    }, 15 * 60 * 1000); // 15 Minuten

    return () => clearInterval(interval);
  }, [daten]);

  const ladeJSON = useCallback(async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content) as AppDaten;

          // Versionswarnung prüfen
          if (letztesSpeicherdatum) {
            const dateiTimestamp = extractTimestampFromFilename(file.name);
            if (dateiTimestamp && dateiTimestamp < letztesSpeicherdatum) {
              const confirmed = window.confirm(
                'Achtung: Diese Datei ist älter als die zuletzt gespeicherte Version. Möchten Sie trotzdem fortfahren?'
              );
              if (!confirmed) {
                reject(new Error('Laden abgebrochen'));
                return;
              }
            }
          }

          setDaten(parsed);
          setIstGeladen(true);
          resolve();
        } catch (error) {
          reject(new Error('Ungültiges JSON-Format'));
        }
      };
      reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
      reader.readAsText(file);
    });
  }, [letztesSpeicherdatum]);

  const speichereJSON = useCallback(() => {
    if (!daten) return;

    const aktualisiert: AppDaten = {
      ...daten,
      geaendertAm: new Date().toISOString()
    };

    const jsonString = JSON.stringify(aktualisiert, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = getJsonDateiname();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setLetztesSpeicherdatum(new Date());
    setZeigeAutoSaveHinweis(false);
    setDaten(aktualisiert);
  }, [daten]);

  const aktualisiereDaten = useCallback((neueDaten: AppDaten) => {
    setDaten({
      ...neueDaten,
      geaendertAm: new Date().toISOString()
    });
  }, []);

  const fuegeProejktHinzu = useCallback((projekt: Projekt) => {
    if (!daten) return;
    setDaten({
      ...daten,
      projekte: [...daten.projekte, projekt],
      geaendertAm: new Date().toISOString()
    });
  }, [daten]);

  const aktualisiereProjekt = useCallback((projekt: Projekt) => {
    if (!daten) return;
    setDaten({
      ...daten,
      projekte: daten.projekte.map(p =>
        p.id === projekt.id ? { ...projekt, geaendertAm: new Date().toISOString() } : p
      ),
      geaendertAm: new Date().toISOString()
    });
  }, [daten]);

  const loescheProjekt = useCallback((projektId: string) => {
    if (!daten) return;
    setDaten({
      ...daten,
      projekte: daten.projekte.filter(p => p.id !== projektId),
      geaendertAm: new Date().toISOString()
    });
  }, [daten]);

  const getProjekt = useCallback((projektId: string): Projekt | undefined => {
    return daten?.projekte.find(p => p.id === projektId);
  }, [daten]);

  const setzeNeuesDatenObjekt = useCallback(() => {
    setDaten(erstelleLeereAppDaten());
    setIstGeladen(true);
  }, []);

  return (
    <DataContext.Provider value={{
      daten,
      istGeladen,
      ladeJSON,
      speichereJSON,
      aktualisiereDaten,
      fuegeProejktHinzu,
      aktualisiereProjekt,
      loescheProjekt,
      getProjekt,
      setzeNeuesDatenObjekt,
      letztesSpeicherdatum,
      zeigeAutoSaveHinweis,
      setZeigeAutoSaveHinweis
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData muss innerhalb eines DataProviders verwendet werden');
  }
  return context;
};

// Helper: Timestamp aus Dateiname extrahieren
function extractTimestampFromFilename(filename: string): Date | null {
  const match = filename.match(/(?:apleona_pm|baupm)_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2})\.json/);
  if (!match) return null;

  const [datePart, timePart] = match[1].split('_');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split('-').map(Number);

  return new Date(year, month - 1, day, hours, minutes);
}
