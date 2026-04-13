// ============================================
// BAUPROJEKTMANAGEMENT - DATENMODELL
// ============================================

// Basis-Typen
export type AmpelStatus = 'gruen' | 'gelb' | 'rot';
export type ProjektStatus = 'geplant' | 'beauftragt' | 'abgelehnt' | 'abgeschlossen' | 'abgerechnet';
export type AufgabenStatus = 'offen' | 'in_bearbeitung' | 'erledigt' | 'verzoegert';

// Projektstatus-Labels und Farben
export const PROJEKT_STATUS_CONFIG = {
  geplant: { label: 'Geplant', color: 'bg-status-yellow', textColor: 'text-yellow-800' },
  beauftragt: { label: 'Beauftragt', color: 'bg-status-light-green', textColor: 'text-green-800' },
  abgelehnt: { label: 'Abgelehnt', color: 'bg-status-gray', textColor: 'text-gray-800' },
  abgeschlossen: { label: 'Abgeschlossen', color: 'bg-status-dark-green', textColor: 'text-white' },
  abgerechnet: { label: 'Abgerechnet', color: 'bg-status-light-blue', textColor: 'text-status-dark-blue' },
} as const;
export type MangelStatus = 'offen' | 'in_bearbeitung' | 'behoben' | 'abgenommen';
export type NachtragsStatus = 'gestellt' | 'in_pruefung' | 'genehmigt' | 'abgelehnt' | 'teilweise_genehmigt';
export type RechnungsTyp = 'anzahlung' | 'teilrechnung' | 'schlussrechnung';
export type AngebotStatus = 'verschickt' | 'freigegeben' | 'beauftragt' | 'abgerechnet' | 'abgelehnt';
export type StakeholderTyp = 'intern' | 'extern';

// AHO-Leistungsphasen (fest definiert)
export const AHO_PHASEN = [
  'Projektvorbereitung',
  'Planung',
  'Ausführungsvorbereitung',
  'Ausführung',
  'Projektabschluss'
] as const;
export type AHOPhase = typeof AHO_PHASEN[number];

// ============================================
// BUDGET & FINANZEN
// ============================================

export interface BudgetHistorieEintrag {
  id: string;
  datum: string; // ISO Date
  betragNetto: number;
  freigabeDatum?: string;
  abgelehntAm?: string;
  grund?: string;
}

export interface FeeHistorieEintrag {
  id: string;
  datum: string;
  feePercent: number;
  grund?: string;
}

export interface Rechnung {
  id: string;
  rechnungsnummer: string;
  datum: string;
  betragNetto: number;
  typ: RechnungsTyp;
  geprueft: boolean;
  freigegeben: boolean;
  bereitsInFeeAbgerechnet: boolean;
  sicherheitseinbehaltNetto?: number; // Nur für Fachfirmen
  notizen?: string;
}

export interface Angebot {
  id: string;
  angebotsnummer: string;
  datum: string;
  betragNetto: number;
  beschreibung: string;
  freigabestatus: AngebotStatus;
  istNachtrag: boolean;
  genehmigtAm?: string;
  abgelehntAm?: string;
}

// ============================================
// STAKEHOLDER & BETEILIGTE
// ============================================

export interface Stakeholder {
  id: string;
  name: string;
  firma: string;
  rolle: string;
  telefon?: string;
  email?: string;
  typ: StakeholderTyp;
}

export interface VergabeEmpfehlung {
  gesendetAm?: string;
  genehmigtAm?: string;
  abgelehntAm?: string;
}

// Vertragserfüllung (Fachfirmen)
export interface Vertragserfuellung {
  sicherheitseinbehaltNetto?: number;
  buergschaft: {
    urkundeErhalten: boolean;
    datum?: string;
  };
}

// Gewährleistung (Fachfirmen)
export interface Gewaehrleistung {
  einbehaltNetto?: number;
  buergschaft: {
    urkundeZurueckgesendet: boolean;
    datum?: string;
  };
}

export interface BaseBeteiligter {
  id: string;
  name: string;
  firma: string;
  kontakt: {
    telefon?: string;
    email?: string;
    ansprechpartner?: string;
  };
  gewerkId?: string; // Zugeordnetes Gewerk
  angebote: Angebot[];
  vergabeEmpfehlung: VergabeEmpfehlung;
  budgetGenehmigt: number;
  budgetHistorie: BudgetHistorieEintrag[];
  rechnungen: Rechnung[];
  notizen?: string;
}

export interface Fachplaner extends BaseBeteiligter {
  typ: 'fachplaner';
}

export interface Fachfirma extends BaseBeteiligter {
  typ: 'fachfirma';
  vertragserfuellung: Vertragserfuellung;
  gewaehrleistung: Gewaehrleistung;
}

// ============================================
// GEWERKE
// ============================================

export interface Teilabnahme {
  id: string;
  datum: string;
  beschreibung?: string;
}

export interface Gewerk {
  id: string;
  projektId: string;
  dinNummer: string;
  bezeichnung: string;
  endabnahmeDatum?: string;
  teilabnahmen: Teilabnahme[];
  gewaehrleistungsfristEnde?: string; // Berechnet aus Endabnahme + 5 Jahre
  notizen?: string;
}

// ============================================
// AUFGABEN (3 Ebenen: Aufgabe → Unteraufgabe → Detail)
// ============================================

export interface KommunikationsEintrag {
  id: string;
  datum: string;
  text: string;
  autor?: string;
}

export interface BaseAufgabe {
  id: string;
  titel: string;
  beschreibung?: string;
  gewerkId?: string;
  phasen: AHOPhase[];
  stakeholderIds: string[];
  startDatumSoll?: string;
  startDatumIst?: string;
  endDatumSoll?: string;
  endDatumIst?: string;
  fortschrittProzent: number; // 0-100
  abhaengigkeitenIds: string[]; // IDs anderer Aufgaben
  status: AufgabenStatus;
  kommunikationsLog: KommunikationsEintrag[];
}

export interface DetailAufgabe extends BaseAufgabe {
  ebene: 'detail';
}

export interface Unteraufgabe extends BaseAufgabe {
  ebene: 'unteraufgabe';
  details: DetailAufgabe[];
}

export interface Aufgabe extends BaseAufgabe {
  ebene: 'aufgabe';
  unteraufgaben: Unteraufgabe[];
}

// ============================================
// NACHTRAGSMANAGEMENT
// ============================================

export interface Nachtrag {
  id: string;
  projektId: string;
  nachtragsnummer: string;
  datumStellung: string;
  beschreibung: string;
  betragNettoAngefragt: number;
  status: NachtragsStatus;
  betragNettoGenehmigt?: number;
  genehmigtAm?: string;
  abgelehntAm?: string;
  // Verknüpfung zu Fachplaner ODER Fachfirma
  fachplanerIdOderFachfirmaId: string;
  istFachplaner: boolean;
  notizen?: string;
}

// ============================================
// MÄNGELMANAGEMENT
// ============================================

export interface Mangel {
  id: string;
  projektId: string;
  mangelnummer: number; // Automatisch vergeben
  datumFeststellung: string;
  beschreibung: string;
  ortBauteil: string;
  fotos: string[]; // Base64-encoded Bilder
  fachfirmaId: string; // Verantwortliche Fachfirma
  gewerkId: string;
  fristBehebung: string;
  status: MangelStatus;
  behebungsDatumIst?: string;
  abnahmeId?: string; // Verknüpft mit Teil- oder Endabnahme
  notizen?: string;
}

// ============================================
// FEE-ABRECHNUNG
// ============================================

export interface FeeRechnung {
  id: string;
  projektId: string;
  rechnungsnummer: string;
  datum: string;
  betragNetto: number;
  // IDs der Fachplaner-/Fachfirmen-Rechnungen, auf die sich diese Fee bezieht
  bezugRechnungIds: string[];
  feePercent: number;
  notizen?: string;
}

// ============================================
// PROJEKT
// ============================================

export interface Projekt {
  id: string;
  projektnummerEigentuemer: string;
  projektnummerApleona: string;
  name: string;
  beschreibung?: string;
  liegenschaftAdresse: string;
  eigentuemer: string[]; // Kann mehrere Personen sein
  status: ProjektStatus;
  aktuellePhase: AHOPhase;
  startDatumSoll?: string;
  startDatumIst?: string;
  endDatumSoll?: string;
  endDatumIst?: string;

  // Budget
  projektbudgetHistorie: BudgetHistorieEintrag[];
  projektbudgetFreigegeben: number; // Aktuell gültiges Budget

  // Fee
  feePercent: number;
  feeHistorie: FeeHistorieEintrag[];

  // Verknüpfte Daten
  gewerke: Gewerk[];
  aufgaben: Aufgabe[];
  stakeholder: Stakeholder[];
  fachplaner: Fachplaner[];
  fachfirmen: Fachfirma[];
  nachtraege: Nachtrag[];
  maengel: Mangel[];
  feeRechnungen: FeeRechnung[];

  // Regelungen
  freigabeRegelung?: string;
  rechnungsRegelung?: string;
  feeRegelung?: string;

  // Meta
  notizen?: string;
  erstelltAm: string;
  geaendertAm: string;
}

// ============================================
// APP-DATEN (Root-Objekt für JSON-Speicherung)
// ============================================

export interface AppDaten {
  version: string;
  erstelltAm: string;
  geaendertAm: string;
  projekte: Projekt[];
}

// ============================================
// HELPER TYPES FÜR UI
// ============================================

export interface FristWarnung {
  id: string;
  projektId: string;
  projektName: string;
  typ: 'gewaehrleistung' | 'buergschaft' | 'zahlung' | 'eigentuemer_entscheidung' | 'abnahme' | 'mangel' | 'nachtrag';
  beschreibung: string;
  fristDatum: string;
  ampel: AmpelStatus;
  linkUrl?: string;
}

export interface BudgetUebersicht {
  projektbudgetFreigegeben: number;
  summeFachplanerBudgets: number;
  summeFachfirmenBudgets: number;
  summeGenehmigteNachtraege: number;
  summeRechnungen: number;
  auslastungProzent: number;
  ampel: AmpelStatus;
}

// Standard DIN 276 Gewerke-Liste
export const DIN_GEWERKE = [
  { din: '300', bezeichnung: 'Bauwerk - Baukonstruktionen' },
  { din: '310', bezeichnung: 'Baugrube/Erdbau' },
  { din: '320', bezeichnung: 'Gründung' },
  { din: '330', bezeichnung: 'Außenwände' },
  { din: '340', bezeichnung: 'Innenwände' },
  { din: '350', bezeichnung: 'Decken' },
  { din: '360', bezeichnung: 'Dächer' },
  { din: '370', bezeichnung: 'Baukonstruktive Einbauten' },
  { din: '390', bezeichnung: 'Sonstige Maßnahmen Baukonstruktion' },
  { din: '400', bezeichnung: 'Bauwerk - Technische Anlagen' },
  { din: '410', bezeichnung: 'Abwasser-, Wasser-, Gasanlagen' },
  { din: '420', bezeichnung: 'Wärmeversorgungsanlagen' },
  { din: '430', bezeichnung: 'Lufttechnische Anlagen' },
  { din: '440', bezeichnung: 'Starkstromanlagen' },
  { din: '450', bezeichnung: 'Fernmelde- und IT-Anlagen' },
  { din: '460', bezeichnung: 'Förderanlagen' },
  { din: '470', bezeichnung: 'Nutzungsspezifische Anlagen' },
  { din: '480', bezeichnung: 'Gebäudeautomation' },
  { din: '490', bezeichnung: 'Sonstige Maßnahmen techn. Anlagen' },
  { din: '500', bezeichnung: 'Außenanlagen' },
  { din: '600', bezeichnung: 'Ausstattung und Kunstwerke' },
  { din: '700', bezeichnung: 'Baunebenkosten' },
] as const;
