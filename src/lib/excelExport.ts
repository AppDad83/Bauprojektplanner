import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Projekt, AppDaten } from '@/types';
import { formatDatum, formatWaehrung, berechneBudgetUebersicht } from './utils';

export const exportProjektZuExcel = (projekt: Projekt) => {
  const workbook = XLSX.utils.book_new();

  // 1. Projektübersicht
  const uebersichtDaten = [
    ['BAUPROJEKTMANAGEMENT - PROJEKTDOKUMENTATION'],
    [''],
    ['Projektname', projekt.name],
    ['Projektnummer (Eigentümer)', projekt.projektnummerEigentuemer || '-'],
    ['Interne Projektnummer', projekt.projektnummerApleona || '-'],
    ['Liegenschaft/Adresse', projekt.liegenschaftAdresse || '-'],
    ['Eigentümer', projekt.eigentuemer.join(', ') || '-'],
    ['Status', projekt.status],
    ['Aktuelle Phase', projekt.aktuellePhase],
    ['Startdatum (Soll)', formatDatum(projekt.startDatumSoll)],
    ['Startdatum (Ist)', formatDatum(projekt.startDatumIst)],
    ['Enddatum (Soll)', formatDatum(projekt.endDatumSoll)],
    ['Enddatum (Ist)', formatDatum(projekt.endDatumIst)],
    ['Freigegebenes Budget', formatWaehrung(projekt.projektbudgetFreigegeben)],
    ['Fee %', `${projekt.feePercent}%`],
    [''],
    ['Erstellt am', formatDatum(projekt.erstelltAm)],
    ['Letzte Änderung', formatDatum(projekt.geaendertAm)],
  ];
  const wsUebersicht = XLSX.utils.aoa_to_sheet(uebersichtDaten);
  wsUebersicht['!cols'] = [{ wch: 25 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, wsUebersicht, 'Projektübersicht');

  // 2. Aufgabenliste
  const aufgabenHeader = ['Titel', 'Beschreibung', 'Status', 'Fortschritt', 'Start (Soll)', 'Ende (Soll)', 'Phasen'];
  const aufgabenDaten = projekt.aufgaben.map(a => [
    a.titel,
    a.beschreibung || '',
    a.status,
    `${a.fortschrittProzent}%`,
    formatDatum(a.startDatumSoll),
    formatDatum(a.endDatumSoll),
    a.phasen.join(', ')
  ]);
  const wsAufgaben = XLSX.utils.aoa_to_sheet([aufgabenHeader, ...aufgabenDaten]);
  wsAufgaben['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, wsAufgaben, 'Aufgaben');

  // 3. Fachplaner & Rechnungen
  const fachplanerHeader = ['Firma', 'Name', 'Gewerk', 'Budget', 'Summe Rechnungen', 'Auslastung %'];
  const fachplanerDaten = projekt.fachplaner.map(fp => {
    const summe = fp.rechnungen.reduce((s, r) => s + r.betragNetto, 0);
    const auslastung = fp.budgetGenehmigt > 0 ? (summe / fp.budgetGenehmigt) * 100 : 0;
    const gewerk = projekt.gewerke.find(g => g.id === fp.gewerkId);
    return [
      fp.firma,
      fp.name,
      gewerk ? `${gewerk.dinNummer} - ${gewerk.bezeichnung}` : '-',
      formatWaehrung(fp.budgetGenehmigt),
      formatWaehrung(summe),
      `${auslastung.toFixed(1)}%`
    ];
  });
  const wsFachplaner = XLSX.utils.aoa_to_sheet([fachplanerHeader, ...fachplanerDaten]);
  XLSX.utils.book_append_sheet(workbook, wsFachplaner, 'Fachplaner');

  // 4. Fachfirmen & Rechnungen
  const fachfirmenHeader = ['Firma', 'Name', 'Gewerk', 'Budget', 'Summe Rechnungen', 'Auslastung %', 'Bürgschaft zurück'];
  const fachfirmenDaten = projekt.fachfirmen.map(ff => {
    const summe = ff.rechnungen.reduce((s, r) => s + r.betragNetto, 0);
    const auslastung = ff.budgetGenehmigt > 0 ? (summe / ff.budgetGenehmigt) * 100 : 0;
    const gewerk = projekt.gewerke.find(g => g.id === ff.gewerkId);
    return [
      ff.firma,
      ff.name,
      gewerk ? `${gewerk.dinNummer} - ${gewerk.bezeichnung}` : '-',
      formatWaehrung(ff.budgetGenehmigt),
      formatWaehrung(summe),
      `${auslastung.toFixed(1)}%`,
      ff.gewaehrleistung.buergschaft?.urkundeZurueckgesendet ? 'Ja' : 'Nein'
    ];
  });
  const wsFachfirmen = XLSX.utils.aoa_to_sheet([fachfirmenHeader, ...fachfirmenDaten]);
  XLSX.utils.book_append_sheet(workbook, wsFachfirmen, 'Fachfirmen');

  // 5. Nachtragsübersicht
  const nachtraegeHeader = ['Nr.', 'Datum', 'Beschreibung', 'Beteiligter', 'Angefragt', 'Genehmigt', 'Status'];
  const nachtraegeDaten = projekt.nachtraege.map(n => {
    const beteiligter = n.istFachplaner
      ? projekt.fachplaner.find(fp => fp.id === n.fachplanerIdOderFachfirmaId)?.firma
      : projekt.fachfirmen.find(ff => ff.id === n.fachplanerIdOderFachfirmaId)?.firma;
    return [
      n.nachtragsnummer,
      formatDatum(n.datumStellung),
      n.beschreibung,
      beteiligter || '-',
      formatWaehrung(n.betragNettoAngefragt),
      n.betragNettoGenehmigt ? formatWaehrung(n.betragNettoGenehmigt) : '-',
      n.status
    ];
  });
  const wsNachtraege = XLSX.utils.aoa_to_sheet([nachtraegeHeader, ...nachtraegeDaten]);
  XLSX.utils.book_append_sheet(workbook, wsNachtraege, 'Nachträge');

  // 6. Mängelliste
  const maengelHeader = ['Nr.', 'Datum', 'Beschreibung', 'Ort', 'Fachfirma', 'Frist', 'Status', 'Behoben am'];
  const maengelDaten = projekt.maengel.map(m => [
    `#${m.mangelnummer}`,
    formatDatum(m.datumFeststellung),
    m.beschreibung,
    m.ortBauteil,
    projekt.fachfirmen.find(ff => ff.id === m.fachfirmaId)?.firma || '-',
    formatDatum(m.fristBehebung),
    m.status,
    formatDatum(m.behebungsDatumIst)
  ]);
  const wsMaengel = XLSX.utils.aoa_to_sheet([maengelHeader, ...maengelDaten]);
  XLSX.utils.book_append_sheet(workbook, wsMaengel, 'Mängel');

  // 7. Budgetübersicht
  const budget = berechneBudgetUebersicht(projekt);
  const budgetDaten = [
    ['BUDGETÜBERSICHT'],
    [''],
    ['Freigegebenes Projektbudget', formatWaehrung(budget.projektbudgetFreigegeben)],
    ['Summe Fachplaner-Budgets', formatWaehrung(budget.summeFachplanerBudgets)],
    ['Summe Fachfirmen-Budgets', formatWaehrung(budget.summeFachfirmenBudgets)],
    ['Genehmigte Nachträge', formatWaehrung(budget.summeGenehmigteNachtraege)],
    ['Summe Rechnungen', formatWaehrung(budget.summeRechnungen)],
    [''],
    ['Auslastung', `${budget.auslastungProzent.toFixed(1)}%`],
    ['Status', budget.ampel]
  ];
  const wsBudget = XLSX.utils.aoa_to_sheet(budgetDaten);
  XLSX.utils.book_append_sheet(workbook, wsBudget, 'Budget');

  // 8. Fee-Abrechnung
  const feeHeader = ['Rechnungsnummer', 'Datum', 'Betrag netto', 'Fee %', 'Anzahl Bezugsrechnungen'];
  const feeDaten = projekt.feeRechnungen.map(fr => [
    fr.rechnungsnummer,
    formatDatum(fr.datum),
    formatWaehrung(fr.betragNetto),
    `${fr.feePercent}%`,
    fr.bezugRechnungIds.length.toString()
  ]);
  const wsFee = XLSX.utils.aoa_to_sheet([feeHeader, ...feeDaten]);
  XLSX.utils.book_append_sheet(workbook, wsFee, 'Fee-Abrechnung');

  // 9. Gewährleistungsfristen
  const gewHeader = ['Gewerk', 'DIN', 'Endabnahme', 'Gewährleistung bis'];
  const gewDaten = projekt.gewerke
    .filter(g => g.endabnahmeDatum)
    .map(g => [
      g.bezeichnung,
      g.dinNummer,
      formatDatum(g.endabnahmeDatum),
      formatDatum(g.gewaehrleistungsfristEnde)
    ]);
  const wsGew = XLSX.utils.aoa_to_sheet([gewHeader, ...gewDaten]);
  XLSX.utils.book_append_sheet(workbook, wsGew, 'Gewährleistung');

  // Export
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const timestamp = new Date().toISOString().split('T')[0];
  saveAs(blob, `Projektdokumentation_${projekt.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.xlsx`);
};
