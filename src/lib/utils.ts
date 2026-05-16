import { v4 as uuidv4 } from 'uuid';
import {
  AmpelStatus,
  AppDaten,
  Projekt,
  AHO_PHASEN,
  BudgetUebersicht,
  FristWarnung,
  KostengruppeTyp,
  DIN_KOSTENGRUPPEN_MAPPING,
  ExtendedBudgetUebersicht,
  Kostenstufe,
  PHASE_ZU_KOSTENSTUFE,
  BudgetAllokation
} from '@/types';

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

// Budget aus Angeboten berechnen (freigegeben, beauftragt oder abgerechnet)
// Dies ist der Kostenanschlag = effektives Budget
export const berechneEffektivesBudgetAusAngeboten = (angebote: { betragNetto: number; istNachtrag: boolean; freigabestatus: string }[]): number => {
  const gueltigeStatus = ['freigegeben', 'beauftragt', 'abgerechnet'];
  const summeFreigegebeneHauptangebote = angebote
    .filter(a => !a.istNachtrag && gueltigeStatus.includes(a.freigabestatus))
    .reduce((sum, a) => sum + a.betragNetto, 0);
  const summeFreigegebeneNachtraege = angebote
    .filter(a => a.istNachtrag && gueltigeStatus.includes(a.freigabestatus))
    .reduce((sum, a) => sum + a.betragNetto, 0);
  return summeFreigegebeneHauptangebote + summeFreigegebeneNachtraege;
};

// Budget-Übersicht berechnen
export const berechneBudgetUebersicht = (projekt: Projekt): BudgetUebersicht => {
  // Fachplaner-Budget: Summe freigegebener Hauptangebote + Nachträge
  const summeFachplanerBudgets = projekt.fachplaner.reduce(
    (sum, fp) => sum + berechneEffektivesBudgetAusAngeboten(fp.angebote), 0
  );

  // Fachfirmen-Budget: Summe freigegebener Hauptangebote + Nachträge
  const summeFachfirmenBudgets = projekt.fachfirmen.reduce(
    (sum, ff) => sum + berechneEffektivesBudgetAusAngeboten(ff.angebote), 0
  );

  // Legacy-Nachträge aus projekt.nachtraege (für Rückwärtskompatibilität)
  const summeGenehmigteNachtraegeLegacy = projekt.nachtraege
    .filter(n => n.status === 'genehmigt' || n.status === 'teilweise_genehmigt')
    .reduce((sum, n) => sum + (n.betragNettoGenehmigt || 0), 0);

  // Nachträge sind jetzt in den Budgets enthalten, Legacy nur noch für alte Daten
  const summeGenehmigteNachtraege = summeGenehmigteNachtraegeLegacy;

  // BUG FIX: Nur bezahlte Rechnungen zählen zur Summe
  const summeRechnungen = [
    ...projekt.fachplaner.flatMap(fp => fp.rechnungen),
    ...projekt.fachfirmen.flatMap(ff => ff.rechnungen)
  ]
    .filter(r => r.bezahltDatum) // NUR bezahlte Rechnungen
    .reduce((sum, r) => sum + r.betragNetto, 0);

  // Gesamtbudget = Fachplaner + Fachfirmen + Legacy-Nachträge
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
        beschreibung: `Mangel ${mangel.mangelnummer}: ${mangel.beschreibung.substring(0, 50)}...`,
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

// ============================================
// EXTENDED BUDGET-FUNKTIONEN (DIN 276)
// ============================================

// Mappt eine DIN-Nummer zur Kostengruppen-Kategorie
export const getKostengruppeFromDIN = (dinNummer: string): KostengruppeTyp | null => {
  // Prüfe nur die ersten 3 Ziffern (Hauptgruppe)
  const dinPrefix = dinNummer.substring(0, 3);

  for (const [kategorie, dinNummern] of Object.entries(DIN_KOSTENGRUPPEN_MAPPING)) {
    if (dinNummern.includes(dinPrefix)) {
      return kategorie as KostengruppeTyp;
    }
  }
  return null;
};

// Hilfsfunktion: Normalisiert budgetAllokation mit Migration für alte Daten
const normalizeAllokation = (allokation?: BudgetAllokation): BudgetAllokation => {
  if (!allokation) {
    return {
      weitereBaunebenkostenKS: 0, weitereBaunebenkostenKB: 0, weitereBaunebenkostenKV: 0, weitereBaunebenkostenKA: 0,
      finanzierungKS: 0, finanzierungKB: 0, finanzierungKV: 0, finanzierungKA: 0,
      risikoreserveKS: 0, risikoreserveKB: 0, risikoreserveKV: 0, risikoreserveKA: 0
    };
  }

  // Migration: alte Estimate-Felder auf alle 4 Stufen übertragen
  const weitereBNK = allokation.weitereBaunebenkostenEstimate ?? 0;
  const finanz = allokation.finanzierungEstimate ?? 0;

  return {
    weitereBaunebenkostenKS: allokation.weitereBaunebenkostenKS ?? weitereBNK,
    weitereBaunebenkostenKB: allokation.weitereBaunebenkostenKB ?? weitereBNK,
    weitereBaunebenkostenKV: allokation.weitereBaunebenkostenKV ?? weitereBNK,
    weitereBaunebenkostenKA: allokation.weitereBaunebenkostenKA ?? weitereBNK,
    finanzierungKS: allokation.finanzierungKS ?? finanz,
    finanzierungKB: allokation.finanzierungKB ?? finanz,
    finanzierungKV: allokation.finanzierungKV ?? finanz,
    finanzierungKA: allokation.finanzierungKA ?? finanz,
    // Risikoreserve: alte Prozent-Berechnung NICHT übernehmen → mit 0 initialisieren
    risikoreserveKS: allokation.risikoreserveKS ?? 0,
    risikoreserveKB: allokation.risikoreserveKB ?? 0,
    risikoreserveKV: allokation.risikoreserveKV ?? 0,
    risikoreserveKA: allokation.risikoreserveKA ?? 0,
    // deprecated Felder behalten
    ...allokation
  };
};

// Berechnet Kostenschätzung pro Kategorie aus Gewerken
export const berechneKostenschaetzungNachKategorie = (projekt: Projekt): Record<KostengruppeTyp, number> => {
  const result: Record<KostengruppeTyp, number> = {
    fachplaner: 0,
    fachfirmen: 0,
    feeProjectsteuerung: 0,
    weitereBaunebenkosten: 0,
    finanzierung: 0,
    risikoreserve: 0
  };

  // Summiere Kostenschätzung aus Gewerken nach DIN-Nummer
  projekt.gewerke.forEach(gewerk => {
    const kategorie = getKostengruppeFromDIN(gewerk.dinNummer);
    if (kategorie && gewerk.kostenschaetzung) {
      result[kategorie] += gewerk.kostenschaetzung;
    }
  });

  // Manuelle Allokationen hinzufügen (KS-Felder)
  const allokation = normalizeAllokation(projekt.budgetAllokation);
  result.weitereBaunebenkosten += allokation.weitereBaunebenkostenKS ?? 0;
  result.finanzierung += allokation.finanzierungKS ?? 0;
  result.risikoreserve = allokation.risikoreserveKS ?? 0;

  // Fee-Berechnung: Fee = (Baukosten + Risiko) × feePercent
  // NICHT: projektbudgetFreigegeben × feePercent
  const zwischensumme = result.fachplaner + result.fachfirmen +
    result.weitereBaunebenkosten + result.finanzierung + result.risikoreserve;
  result.feeProjectsteuerung = zwischensumme * (projekt.feePercent / 100);

  return result;
};

// Berechnet Kostenberechnung pro Kategorie (aus Gewerken)
export const berechneKostenberechnungNachKategorie = (projekt: Projekt): Record<KostengruppeTyp, number> => {
  const result: Record<KostengruppeTyp, number> = {
    fachplaner: 0,
    fachfirmen: 0,
    feeProjectsteuerung: 0,
    weitereBaunebenkosten: 0,
    finanzierung: 0,
    risikoreserve: 0
  };

  // Kostenberechnung aus Gewerken nach DIN-Nummer
  projekt.gewerke.forEach(gewerk => {
    const kategorie = getKostengruppeFromDIN(gewerk.dinNummer);
    if (kategorie && gewerk.kostenberechnung) {
      result[kategorie] += gewerk.kostenberechnung;
    }
  });

  // Manuelle Allokationen (KB-Felder)
  const allokation = normalizeAllokation(projekt.budgetAllokation);
  result.weitereBaunebenkosten += allokation.weitereBaunebenkostenKB ?? 0;
  result.finanzierung += allokation.finanzierungKB ?? 0;
  result.risikoreserve = allokation.risikoreserveKB ?? 0;

  // BUG FIX: Fee-Berechnung fehlte komplett!
  // Fee = (Baukosten + Risiko) × feePercent
  const zwischensumme = result.fachplaner + result.fachfirmen +
    result.weitereBaunebenkosten + result.finanzierung + result.risikoreserve;
  result.feeProjectsteuerung = zwischensumme * (projekt.feePercent / 100);

  return result;
};

// Berechnet Kostenvoranschlag pro Kategorie (KV – LP5)
export const berechneKostenvoranschlagNachKategorie = (projekt: Projekt): Record<KostengruppeTyp, number> => {
  const result: Record<KostengruppeTyp, number> = {
    fachplaner: 0,
    fachfirmen: 0,
    feeProjectsteuerung: 0,
    weitereBaunebenkosten: 0,
    finanzierung: 0,
    risikoreserve: 0
  };

  // KV aus Gewerken lesen
  projekt.gewerke.forEach(gewerk => {
    const kategorie = getKostengruppeFromDIN(gewerk.dinNummer);
    if (kategorie && gewerk.kostenvoranschlag) {
      result[kategorie] += gewerk.kostenvoranschlag;
    }
  });

  // Manuelle Allokationen (KV-Felder)
  const allokation = normalizeAllokation(projekt.budgetAllokation);
  result.weitereBaunebenkosten += allokation.weitereBaunebenkostenKV ?? 0;
  result.finanzierung += allokation.finanzierungKV ?? 0;
  result.risikoreserve = allokation.risikoreserveKV ?? 0;

  // Fee auf Zwischensumme (Baukosten + Risiko), NICHT auf Gesamtbudget
  const zwischensumme = result.fachplaner + result.fachfirmen +
    result.weitereBaunebenkosten + result.finanzierung + result.risikoreserve;
  result.feeProjectsteuerung = zwischensumme * (projekt.feePercent / 100);

  return result;
};

// Berechnet Kostenanschlag pro Kategorie (aus freigegebenen/beauftragten/abgerechneten Angeboten)
export const berechneKostenanschlagNachKategorie = (projekt: Projekt): Record<KostengruppeTyp, number> => {
  const result: Record<KostengruppeTyp, number> = {
    fachplaner: 0,
    fachfirmen: 0,
    feeProjectsteuerung: 0,
    weitereBaunebenkosten: 0,
    finanzierung: 0,
    risikoreserve: 0
  };

  // Fachplaner-Kostenanschlag: Summe freigegebener/beauftragter/abgerechneter Angebote
  result.fachplaner = projekt.fachplaner.reduce(
    (sum, fp) => sum + berechneEffektivesBudgetAusAngeboten(fp.angebote), 0
  );

  // Fachfirmen-Kostenanschlag: Summe freigegebener/beauftragter/abgerechneter Angebote
  result.fachfirmen = projekt.fachfirmen.reduce(
    (sum, ff) => sum + berechneEffektivesBudgetAusAngeboten(ff.angebote), 0
  );

  // Manuelle Allokationen (KA-Felder)
  const allokation = normalizeAllokation(projekt.budgetAllokation);
  result.weitereBaunebenkosten = allokation.weitereBaunebenkostenKA ?? 0;
  result.finanzierung = allokation.finanzierungKA ?? 0;
  result.risikoreserve = allokation.risikoreserveKA ?? 0;

  // Fee auf Zwischensumme (Baukosten + Risiko), NICHT auf Gesamtbudget
  const zwischensumme = result.fachplaner + result.fachfirmen +
    result.weitereBaunebenkosten + result.finanzierung + result.risikoreserve;
  result.feeProjectsteuerung = zwischensumme * (projekt.feePercent / 100);

  return result;
};

// Berechnet Kostenfeststellung pro Kategorie (bezahlte Rechnungen)
export const berechneKostenfeststellungNachKategorie = (projekt: Projekt): Record<KostengruppeTyp, number> => {
  const result: Record<KostengruppeTyp, number> = {
    fachplaner: 0,
    fachfirmen: 0,
    feeProjectsteuerung: 0,
    weitereBaunebenkosten: 0,
    finanzierung: 0,
    risikoreserve: 0
  };

  // Fachplaner: Summe bezahlter Rechnungen
  result.fachplaner = projekt.fachplaner.reduce((sum, fp) => {
    return sum + fp.rechnungen
      .filter(r => r.bezahltDatum)
      .reduce((s, r) => s + r.betragNetto, 0);
  }, 0);

  // Fachfirmen: Summe bezahlter Rechnungen
  result.fachfirmen = projekt.fachfirmen.reduce((sum, ff) => {
    return sum + ff.rechnungen
      .filter(r => r.bezahltDatum)
      .reduce((s, r) => s + r.betragNetto, 0);
  }, 0);

  // Fee Projektsteuerung: Summe aller Fee-Rechnungen
  result.feeProjectsteuerung = projekt.feeRechnungen.reduce((sum, r) => sum + r.betragNetto, 0);

  return result;
};

// Kombinierte Extended Budget-Übersicht
export const berechneExtendedBudgetUebersicht = (projekt: Projekt): ExtendedBudgetUebersicht => {
  const kostenschaetzung = berechneKostenschaetzungNachKategorie(projekt);
  const kostenberechnung = berechneKostenberechnungNachKategorie(projekt);
  const kostenvoranschlag = berechneKostenvoranschlagNachKategorie(projekt);
  const kostenanschlag = berechneKostenanschlagNachKategorie(projekt);
  const kostenfeststellung = berechneKostenfeststellungNachKategorie(projekt);

  const kategorien = {} as ExtendedBudgetUebersicht['kategorien'];
  const alleKategorien: KostengruppeTyp[] = [
    'fachplaner', 'fachfirmen', 'feeProjectsteuerung',
    'weitereBaunebenkosten', 'finanzierung', 'risikoreserve'
  ];

  let gesamtKostenschaetzung = 0;
  let gesamtKostenberechnung = 0;
  let gesamtKostenvoranschlag = 0;
  let gesamtKostenanschlag = 0;
  let gesamtKostenfeststellung = 0;

  alleKategorien.forEach(kat => {
    const ks = kostenschaetzung[kat];
    const kb = kostenberechnung[kat];
    const kv = kostenvoranschlag[kat];
    const ka = kostenanschlag[kat];
    const kf = kostenfeststellung[kat];

    // Differenz KB zu KS in Prozent (KS ist 100%)
    const differenzKBProzent = ks > 0 ? ((kb - ks) / ks) * 100 : 0;
    // Differenz KV zu KB in Prozent (KB ist 100%) - NEU
    const differenzKVProzent = kb > 0 ? ((kv - kb) / kb) * 100 : 0;
    // Differenz KA zu KV in Prozent (KV ist 100%) - GEÄNDERT: jetzt KA vs KV
    const differenzKAProzent = kv > 0 ? ((ka - kv) / kv) * 100 : 0;
    // Differenz KF zu KA in Prozent (KA ist 100%)
    const differenzKFProzent = ka > 0 ? ((kf - ka) / ka) * 100 : 0;
    // Auslastung KF/KA in Prozent (bezogen auf Kostenanschlag)
    const auslastungProzent = ka > 0 ? (kf / ka) * 100 : 0;

    kategorien[kat] = {
      kostenschaetzung: ks,
      kostenberechnung: kb,
      kostenvoranschlag: kv,
      kostenanschlag: ka,
      kostenfeststellung: kf,
      differenzKBProzent,
      differenzKVProzent,
      differenzKAProzent,
      differenzKFProzent,
      auslastungProzent
    };

    gesamtKostenschaetzung += ks;
    gesamtKostenberechnung += kb;
    gesamtKostenvoranschlag += kv;
    gesamtKostenanschlag += ka;
    gesamtKostenfeststellung += kf;
  });

  return {
    kategorien,
    gesamtKostenschaetzung,
    gesamtKostenberechnung,
    gesamtKostenvoranschlag,
    gesamtKostenanschlag,
    gesamtKostenfeststellung
  };
};

// Berechnet die aktuelle Kostenstufe aus der Projektphase
export const berechneAktuelleKostenstufe = (aktuellePhase: string): Kostenstufe => {
  return PHASE_ZU_KOSTENSTUFE[aktuellePhase as keyof typeof PHASE_ZU_KOSTENSTUFE] ?? 'ks';
};

// Berechnet das Projektbudget basierend auf der aktuellen Phase
export const berechneProjektbudgetFreigegeben = (projekt: Projekt): number => {
  const kostenstufe = berechneAktuelleKostenstufe(projekt.aktuellePhase);
  const extended = berechneExtendedBudgetUebersicht(projekt);

  switch (kostenstufe) {
    case 'ks': return extended.gesamtKostenschaetzung;
    case 'kb': return extended.gesamtKostenberechnung;
    case 'kv': return extended.gesamtKostenvoranschlag;
    case 'ka': return extended.gesamtKostenanschlag;
    case 'kf': return extended.gesamtKostenfeststellung;
    default: return extended.gesamtKostenschaetzung;
  }
};
