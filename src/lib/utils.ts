import { v4 as uuidv4 } from 'uuid';
import { AmpelStatus, AppDaten, Projekt, AHO_PHASEN, BudgetUebersicht, FristWarnung } from '@/types';

// UUID Generator
export const generateId = (): string => uuidv4();

// Datum formatieren (TT.MM.JJJJ)
export const formatDatum = (isoDate: string | undefined): string => {
  if (!isoDate) return '-';
  const date = new Date(isoDate);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// ISO-Datum aus deutschem Format
export const parseGermanDate = (germanDate: string): string => {
  const [day, month, year] = germanDate.split('.');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

// Währung formatieren
export const formatWaehrung = (betrag: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(betrag);
};

// Prozent formatieren
export const formatProzent = (wert: number): string => {
  return `${wert.toFixed(1)} %`;
};

// Ampel berechnen für Fristen
export const berechneAmpelFuerFrist = (fristDatum: string): AmpelStatus => {
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const frist = new Date(fristDatum);
  frist.setHours(0, 0, 0, 0);

  const diffTage = Math.ceil((frist.getTime() - heute.getTime()) / (1000 * 60 * 60 * 24));

  if (diffTage < 7) return 'rot';
  if (diffTage <= 30) return 'gelb';
  return 'gruen';
};

// Tage bis Frist
export const tageBisFrist = (fristDatum: string): number => {
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const frist = new Date(fristDatum);
  frist.setHours(0, 0, 0, 0);
  return Math.ceil((frist.getTime() - heute.getTime()) / (1000 * 60 * 60 * 24));
};

// Gewährleistungsfrist berechnen (5 Jahre nach Abnahme)
export const berechneGewaehrleistungsfrist = (abnahmeDatum: string): string => {
  const abnahme = new Date(abnahmeDatum);
  abnahme.setFullYear(abnahme.getFullYear() + 5);
  return abnahme.toISOString().split('T')[0];
};

// Budget-Übersicht berechnen
export const berechneBudgetUebersicht = (projekt: Projekt): BudgetUebersicht => {
  const summeFachplanerBudgets = projekt.fachplaner.reduce(
    (sum, fp) => sum + fp.budgetGenehmigt, 0
  );
  const summeFachfirmenBudgets = projekt.fachfirmen.reduce(
    (sum, ff) => sum + ff.budgetGenehmigt, 0
  );

  // Nachträge aus Angeboten (beauftragt)
  const summeBeauftragteNachtraegeAngebote = [
    ...projekt.fachplaner.flatMap(fp => fp.angebote),
    ...projekt.fachfirmen.flatMap(ff => ff.angebote)
  ]
    .filter(a => a.istNachtrag && a.freigabestatus === 'beauftragt')
    .reduce((sum, a) => sum + a.betragNetto, 0);

  // Legacy-Nachträge aus projekt.nachtraege (für Rückwärtskompatibilität)
  const summeGenehmigteNachtraegeLegacy = projekt.nachtraege
    .filter(n => n.status === 'genehmigt' || n.status === 'teilweise_genehmigt')
    .reduce((sum, n) => sum + (n.betragNettoGenehmigt || 0), 0);

  const summeGenehmigteNachtraege = summeBeauftragteNachtraegeAngebote + summeGenehmigteNachtraegeLegacy;

  const summeRechnungen = [
    ...projekt.fachplaner.flatMap(fp => fp.rechnungen),
    ...projekt.fachfirmen.flatMap(ff => ff.rechnungen)
  ].reduce((sum, r) => sum + r.betragNetto, 0);

  // Gesamtbudget = Basis + beauftragte Nachträge
  const gesamtBudget = summeFachplanerBudgets + summeFachfirmenBudgets + summeGenehmigteNachtraege;
  const auslastungProzent = projekt.projektbudgetFreigegeben > 0
    ? (gesamtBudget / projekt.projektbudgetFreigegeben) * 100
    : 0;

  let ampel: AmpelStatus = 'gruen';
  if (auslastungProzent > 100) ampel = 'rot';
  else if (auslastungProzent > 80) ampel = 'gelb';

  return {
    projektbudgetFreigegeben: projekt.projektbudgetFreigegeben,
    summeFachplanerBudgets,
    summeFachfirmenBudgets,
    summeGenehmigteNachtraege,
    summeRechnungen,
    auslastungProzent,
    ampel
  };
};

// Alle Fristwarnungen für ein Projekt sammeln
export const sammleFristwarnungen = (projekt: Projekt): FristWarnung[] => {
  const warnungen: FristWarnung[] = [];
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);

  // Gewährleistungsfristen
  projekt.gewerke.forEach(gewerk => {
    if (gewerk.gewaehrleistungsfristEnde) {
      warnungen.push({
        id: `gew-${gewerk.id}`,
        projektId: projekt.id,
        projektName: projekt.name,
        typ: 'gewaehrleistung',
        beschreibung: `Gewährleistung ${gewerk.bezeichnung} endet`,
        fristDatum: gewerk.gewaehrleistungsfristEnde,
        ampel: berechneAmpelFuerFrist(gewerk.gewaehrleistungsfristEnde)
      });
    }
  });

  // Bürgschaften (nicht zurückgesendet)
  projekt.fachfirmen.forEach(ff => {
    if (ff.gewaehrleistung.buergschaft && !ff.gewaehrleistung.buergschaft.urkundeZurueckgesendet) {
      // Frist: 30 Tage nach Endabnahme des zugeordneten Gewerks
      const gewerk = projekt.gewerke.find(g => g.id === ff.gewerkId);
      if (gewerk?.endabnahmeDatum) {
        const frist = new Date(gewerk.endabnahmeDatum);
        frist.setDate(frist.getDate() + 30);
        warnungen.push({
          id: `buerg-${ff.id}`,
          projektId: projekt.id,
          projektName: projekt.name,
          typ: 'buergschaft',
          beschreibung: `Gewährleistungsbürgschaft ${ff.firma} zurücksenden`,
          fristDatum: frist.toISOString().split('T')[0],
          ampel: berechneAmpelFuerFrist(frist.toISOString().split('T')[0])
        });
      }
    }
  });

  // Offene Eigentümer-Entscheidungen
  [...projekt.fachplaner, ...projekt.fachfirmen].forEach(beteiligter => {
    if (beteiligter.vergabeEmpfehlung.gesendetAm &&
        !beteiligter.vergabeEmpfehlung.genehmigtAm &&
        !beteiligter.vergabeEmpfehlung.abgelehntAm) {
      const gesendet = new Date(beteiligter.vergabeEmpfehlung.gesendetAm);
      const frist = new Date(gesendet);
      frist.setDate(frist.getDate() + 14);
      warnungen.push({
        id: `verg-${beteiligter.id}`,
        projektId: projekt.id,
        projektName: projekt.name,
        typ: 'eigentuemer_entscheidung',
        beschreibung: `Vergabeempfehlung ${beteiligter.firma} - Eigentümer-Entscheidung ausstehend`,
        fristDatum: frist.toISOString().split('T')[0],
        ampel: berechneAmpelFuerFrist(frist.toISOString().split('T')[0])
      });
    }
  });

  // Mängel-Fristen
  projekt.maengel
    .filter(m => m.status === 'offen' || m.status === 'in_bearbeitung')
    .forEach(mangel => {
      warnungen.push({
        id: `mangel-${mangel.id}`,
        projektId: projekt.id,
        projektName: projekt.name,
        typ: 'mangel',
        beschreibung: `Mangel #${mangel.mangelnummer}: ${mangel.beschreibung.substring(0, 50)}...`,
        fristDatum: mangel.fristBehebung,
        ampel: berechneAmpelFuerFrist(mangel.fristBehebung)
      });
    });

  // Nachträge in Prüfung
  projekt.nachtraege
    .filter(n => n.status === 'gestellt' || n.status === 'in_pruefung')
    .forEach(nachtrag => {
      const gestellt = new Date(nachtrag.datumStellung);
      const frist = new Date(gestellt);
      frist.setDate(frist.getDate() + 14);
      warnungen.push({
        id: `nachtrag-${nachtrag.id}`,
        projektId: projekt.id,
        projektName: projekt.name,
        typ: 'nachtrag',
        beschreibung: `Nachtrag ${nachtrag.nachtragsnummer}: ${nachtrag.beschreibung.substring(0, 40)}...`,
        fristDatum: frist.toISOString().split('T')[0],
        ampel: berechneAmpelFuerFrist(frist.toISOString().split('T')[0])
      });
    });

  return warnungen;
};

// Alle Fristen über alle Projekte
export const sammelAlleFristwarnungen = (projekte: Projekt[]): FristWarnung[] => {
  return projekte.flatMap(p => sammleFristwarnungen(p))
    .sort((a, b) => new Date(a.fristDatum).getTime() - new Date(b.fristDatum).getTime());
};

// Leeres Projekt erstellen
export const erstelleLeeresProjekt = (): Projekt => {
  const jetzt = new Date().toISOString();
  return {
    id: generateId(),
    projektnummerEigentuemer: '',
    projektnummerApleona: '',
    name: 'Neues Projekt',
    beschreibung: '',
    liegenschaftAdresse: '',
    eigentuemer: [],
    status: 'geplant',
    aktuellePhase: AHO_PHASEN[0],
    projektbudgetHistorie: [],
    projektbudgetFreigegeben: 0,
    feePercent: 0,
    feeHistorie: [],
    gewerke: [],
    aufgaben: [],
    stakeholder: [],
    fachplaner: [],
    fachfirmen: [],
    nachtraege: [],
    maengel: [],
    feeRechnungen: [],
    erstelltAm: jetzt,
    geaendertAm: jetzt
  };
};

// Leere App-Daten erstellen
export const erstelleLeereAppDaten = (): AppDaten => {
  const jetzt = new Date().toISOString();
  return {
    version: '1.0.0',
    erstelltAm: jetzt,
    geaendertAm: jetzt,
    projekte: []
  };
};

// Projekt kopieren (als Vorlage)
export const kopiereProjektAlsVorlage = (quellProjekt: Projekt, neuerName: string): Projekt => {
  const jetzt = new Date().toISOString();
  const neuesProjekt: Projekt = {
    ...erstelleLeeresProjekt(),
    name: neuerName,
    beschreibung: quellProjekt.beschreibung,
    liegenschaftAdresse: quellProjekt.liegenschaftAdresse,
    feePercent: quellProjekt.feePercent,

    // Gewerke kopieren (ohne Daten)
    gewerke: quellProjekt.gewerke.map(g => ({
      ...g,
      id: generateId(),
      projektId: '', // wird später gesetzt
      endabnahmeDatum: undefined,
      teilabnahmen: [],
      gewaehrleistungsfristEnde: undefined
    })),

    // Aufgaben-Struktur kopieren (ohne Ist-Daten)
    aufgaben: quellProjekt.aufgaben.map(a => ({
      ...a,
      id: generateId(),
      startDatumIst: undefined,
      endDatumIst: undefined,
      fortschrittProzent: 0,
      status: 'offen' as const,
      kommunikationsLog: [],
      unteraufgaben: a.unteraufgaben.map(ua => ({
        ...ua,
        id: generateId(),
        startDatumIst: undefined,
        endDatumIst: undefined,
        fortschrittProzent: 0,
        status: 'offen' as const,
        kommunikationsLog: [],
        details: ua.details.map(d => ({
          ...d,
          id: generateId(),
          startDatumIst: undefined,
          endDatumIst: undefined,
          fortschrittProzent: 0,
          status: 'offen' as const,
          kommunikationsLog: []
        }))
      }))
    })),

    // Stakeholder kopieren
    stakeholder: quellProjekt.stakeholder.map(s => ({
      ...s,
      id: generateId()
    })),

    // Leere Listen für nicht kopierte Daten
    fachplaner: [],
    fachfirmen: [],
    nachtraege: [],
    maengel: [],
    feeRechnungen: [],
    projektbudgetHistorie: [],
    projektbudgetFreigegeben: 0,

    erstelltAm: jetzt,
    geaendertAm: jetzt
  };

  // Projekt-ID in Gewerken setzen
  neuesProjekt.gewerke = neuesProjekt.gewerke.map(g => ({
    ...g,
    projektId: neuesProjekt.id
  }));

  return neuesProjekt;
};

// Timestamp für Dateinamen
export const getTimestamp = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}-${minutes}`;
};

// Dateiname für JSON-Export
export const getJsonDateiname = (): string => {
  return `baupm_${getTimestamp()}.json`;
};
