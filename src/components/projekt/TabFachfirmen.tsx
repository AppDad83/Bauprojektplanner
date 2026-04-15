'use client';

import React, { useState } from 'react';
import { Projekt, Fachfirma, Rechnung, Angebot, RechnungsTyp, AngebotStatus, FachfirmaAbnahme, AbnahmeArt, RechnungSicherheiten, BuergschaftDaten } from '@/types';
import { formatDatum, formatWaehrung, generateId, berechneEffektivesBudgetAusAngeboten } from '@/lib/utils';

interface Props {
  projekt: Projekt;
  onUpdate: (projekt: Projekt) => void;
}

const AngebotStatusLabels: Record<AngebotStatus, string> = {
  verschickt: 'Verschickt',
  freigegeben: 'Freigegeben',
  beauftragt: 'Beauftragt',
  abgerechnet: 'Abgerechnet',
  abgelehnt: 'Abgelehnt'
};

const AngebotStatusColors: Record<AngebotStatus, string> = {
  verschickt: 'bg-blue-100 text-blue-800',
  freigegeben: 'bg-yellow-100 text-yellow-800',
  beauftragt: 'bg-green-100 text-green-800',
  abgerechnet: 'bg-gray-100 text-gray-800',
  abgelehnt: 'bg-red-100 text-red-800'
};

const RechnungsTypLabels: Record<RechnungsTyp, string> = {
  anzahlung: 'Anzahlung',
  teilrechnung: 'Abschlagrechnung',
  schlussrechnung: 'Schlussrechnung'
};

// Sicherungsart-Typen
type SicherungsArt = 'keine' | 'einbehalt' | 'buergschaft';

const TabFachfirmen: React.FC<Props> = ({ projekt, onUpdate }) => {
  const [zeigeModal, setZeigeModal] = useState(false);
  const [editFachfirma, setEditFachfirma] = useState<Fachfirma | null>(null);
  const [zeigeRechnungModal, setZeigeRechnungModal] = useState(false);
  const [zeigeAngebotModal, setZeigeAngebotModal] = useState(false);
  const [zeigeAbnahmeModal, setZeigeAbnahmeModal] = useState(false);
  const [aktiveFachfirmaId, setAktiveFachfirmaId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editAngebot, setEditAngebot] = useState<Angebot | null>(null);
  const [editRechnung, setEditRechnung] = useState<Rechnung | null>(null);
  const [editAbnahme, setEditAbnahme] = useState<FachfirmaAbnahme | null>(null);

  // Fachfirma Form
  const [formData, setFormData] = useState({
    name: '',
    firma: '',
    ansprechpartner: '',
    telefon: '',
    email: '',
    gewerkId: '',
    // Vertragserfüllung
    sicherheitseinbehaltNetto: 0,
    veBuergschaftUrkundeErhalten: false,
    veBuergschaftUrkundeErhaltenDatum: '',
    veBuergschaftUrkundeZurueck: false,
    veBuergschaftUrkundeZurueckDatum: '',
    // Gewährleistung
    gewleistungseinbehaltNetto: 0,
    gwBuergschaftUrkundeErhalten: false,
    gwBuergschaftUrkundeErhaltenDatum: '',
    gwBuergschaftUrkundeZurueck: false,
    gwBuergschaftUrkundeZurueckDatum: '',
    notizen: ''
  });

  // Rechnung Form mit erweiterten Sicherheiten
  const [rechnungForm, setRechnungForm] = useState({
    rechnungsnummer: '',
    datum: '',
    betragNetto: 0,
    typ: 'teilrechnung' as RechnungsTyp,
    geprueftDatum: '',
    bezahltDatum: '',
    info: '',
    // Sicherheiten
    veArt: 'keine' as SicherungsArt,
    veBetrag: 0,
    gwArt: 'keine' as SicherungsArt,
    gwBetrag: 0
  });

  // Angebot Form
  const [angebotForm, setAngebotForm] = useState({
    angebotsnummer: '',
    datum: '',
    betragNetto: 0,
    beschreibung: '',
    freigabestatus: 'verschickt' as AngebotStatus,
    istNachtrag: false
  });

  // Abnahme Form
  const [abnahmeForm, setAbnahmeForm] = useState({
    abnahmeart: 'teilabnahme' as AbnahmeArt,
    termin: '',
    leistungen: '',
    maengelIds: [] as string[],
    gewaehrleistungBis: ''
  });

  const handleNeu = () => {
    setEditFachfirma(null);
    setFormData({
      name: '', firma: '', ansprechpartner: '', telefon: '', email: '',
      gewerkId: '', sicherheitseinbehaltNetto: 0,
      veBuergschaftUrkundeErhalten: false, veBuergschaftUrkundeErhaltenDatum: '',
      veBuergschaftUrkundeZurueck: false, veBuergschaftUrkundeZurueckDatum: '',
      gewleistungseinbehaltNetto: 0,
      gwBuergschaftUrkundeErhalten: false, gwBuergschaftUrkundeErhaltenDatum: '',
      gwBuergschaftUrkundeZurueck: false, gwBuergschaftUrkundeZurueckDatum: '',
      notizen: ''
    });
    setZeigeModal(true);
  };

  const handleEdit = (ff: Fachfirma) => {
    setEditFachfirma(ff);
    setFormData({
      name: ff.name,
      firma: ff.firma,
      ansprechpartner: ff.kontakt.ansprechpartner || '',
      telefon: ff.kontakt.telefon || '',
      email: ff.kontakt.email || '',
      gewerkId: ff.gewerkId || '',
      sicherheitseinbehaltNetto: ff.vertragserfuellung.sicherheitseinbehaltNetto || 0,
      veBuergschaftUrkundeErhalten: ff.vertragserfuellung.buergschaft.urkundeErhalten,
      veBuergschaftUrkundeErhaltenDatum: ff.vertragserfuellung.buergschaft.urkundeErhaltenDatum || '',
      veBuergschaftUrkundeZurueck: ff.vertragserfuellung.buergschaft.urkundeZurueckgesendet,
      veBuergschaftUrkundeZurueckDatum: ff.vertragserfuellung.buergschaft.urkundeZurueckgesendetDatum || '',
      gewleistungseinbehaltNetto: ff.gewaehrleistung.einbehaltNetto || 0,
      gwBuergschaftUrkundeErhalten: ff.gewaehrleistung.buergschaft.urkundeErhalten,
      gwBuergschaftUrkundeErhaltenDatum: ff.gewaehrleistung.buergschaft.urkundeErhaltenDatum || '',
      gwBuergschaftUrkundeZurueck: ff.gewaehrleistung.buergschaft.urkundeZurueckgesendet,
      gwBuergschaftUrkundeZurueckDatum: ff.gewaehrleistung.buergschaft.urkundeZurueckgesendetDatum || '',
      notizen: ff.notizen || ''
    });
    setZeigeModal(true);
  };

  const handleSave = () => {
    const kontakt = {
      ansprechpartner: formData.ansprechpartner || undefined,
      telefon: formData.telefon || undefined,
      email: formData.email || undefined
    };

    const veBuergschaft: BuergschaftDaten = {
      urkundeErhalten: formData.veBuergschaftUrkundeErhalten,
      urkundeErhaltenDatum: formData.veBuergschaftUrkundeErhaltenDatum || undefined,
      urkundeZurueckgesendet: formData.veBuergschaftUrkundeZurueck,
      urkundeZurueckgesendetDatum: formData.veBuergschaftUrkundeZurueckDatum || undefined
    };

    const gwBuergschaft: BuergschaftDaten = {
      urkundeErhalten: formData.gwBuergschaftUrkundeErhalten,
      urkundeErhaltenDatum: formData.gwBuergschaftUrkundeErhaltenDatum || undefined,
      urkundeZurueckgesendet: formData.gwBuergschaftUrkundeZurueck,
      urkundeZurueckgesendetDatum: formData.gwBuergschaftUrkundeZurueckDatum || undefined
    };

    const vertragserfuellung = {
      sicherheitseinbehaltNetto: formData.sicherheitseinbehaltNetto || undefined,
      buergschaft: veBuergschaft
    };

    const gewaehrleistung = {
      einbehaltNetto: formData.gewleistungseinbehaltNetto || undefined,
      buergschaft: gwBuergschaft
    };

    if (editFachfirma) {
      const aktualisiert = projekt.fachfirmen.map(ff =>
        ff.id === editFachfirma.id
          ? { ...ff, name: formData.name, firma: formData.firma, kontakt,
              gewerkId: formData.gewerkId || undefined,
              vertragserfuellung, gewaehrleistung, notizen: formData.notizen || undefined }
          : ff
      );
      onUpdate({ ...projekt, fachfirmen: aktualisiert });
    } else {
      const neu: Fachfirma = {
        id: generateId(),
        typ: 'fachfirma',
        name: formData.name,
        firma: formData.firma,
        kontakt,
        gewerkId: formData.gewerkId || undefined,
        angebote: [],
        vergabeEmpfehlung: {},
        budgetHistorie: [],
        rechnungen: [],
        vertragserfuellung,
        gewaehrleistung,
        abnahmen: [],
        notizen: formData.notizen || undefined
      };
      onUpdate({ ...projekt, fachfirmen: [...projekt.fachfirmen, neu] });
    }
    setZeigeModal(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Fachfirma wirklich löschen?')) {
      onUpdate({ ...projekt, fachfirmen: projekt.fachfirmen.filter(ff => ff.id !== id) });
    }
  };

  // Rechnung Funktionen
  const handleRechnungHinzufuegen = (fachfirmaId: string) => {
    setAktiveFachfirmaId(fachfirmaId);
    setEditRechnung(null);
    setRechnungForm({
      rechnungsnummer: '', datum: '', betragNetto: 0, typ: 'teilrechnung',
      geprueftDatum: '', bezahltDatum: '', info: '',
      veArt: 'keine', veBetrag: 0, gwArt: 'keine', gwBetrag: 0
    });
    setZeigeRechnungModal(true);
  };

  const handleRechnungEdit = (fachfirmaId: string, rechnung: Rechnung) => {
    setAktiveFachfirmaId(fachfirmaId);
    setEditRechnung(rechnung);

    // Sicherheiten auslesen
    let veArt: SicherungsArt = 'keine';
    let veBetrag = 0;
    let gwArt: SicherungsArt = 'keine';
    let gwBetrag = 0;

    if (rechnung.sicherheiten) {
      if (rechnung.sicherheiten.vertragserfuellungEinbehalt) {
        veArt = 'einbehalt';
        veBetrag = rechnung.sicherheiten.vertragserfuellungEinbehalt;
      } else if (rechnung.sicherheiten.vertragserfuellungBuergschaft) {
        veArt = 'buergschaft';
        veBetrag = rechnung.sicherheiten.vertragserfuellungBuergschaft;
      }
      if (rechnung.sicherheiten.gewaehrleistungEinbehalt) {
        gwArt = 'einbehalt';
        gwBetrag = rechnung.sicherheiten.gewaehrleistungEinbehalt;
      } else if (rechnung.sicherheiten.gewaehrleistungBuergschaft) {
        gwArt = 'buergschaft';
        gwBetrag = rechnung.sicherheiten.gewaehrleistungBuergschaft;
      }
    } else if (rechnung.sicherheitseinbehaltNetto) {
      // Legacy: alter sicherheitseinbehaltNetto
      veArt = 'einbehalt';
      veBetrag = rechnung.sicherheitseinbehaltNetto;
    }

    setRechnungForm({
      rechnungsnummer: rechnung.rechnungsnummer,
      datum: rechnung.datum,
      betragNetto: rechnung.betragNetto,
      typ: rechnung.typ,
      geprueftDatum: rechnung.geprueftDatum || '',
      bezahltDatum: rechnung.bezahltDatum || '',
      info: rechnung.info || '',
      veArt, veBetrag, gwArt, gwBetrag
    });
    setZeigeRechnungModal(true);
  };

  const handleRechnungSave = () => {
    if (!aktiveFachfirmaId) return;

    // Sicherheiten zusammenbauen
    const sicherheiten: RechnungSicherheiten = {};
    if (rechnungForm.veArt === 'einbehalt' && rechnungForm.veBetrag > 0) {
      sicherheiten.vertragserfuellungEinbehalt = rechnungForm.veBetrag;
    } else if (rechnungForm.veArt === 'buergschaft' && rechnungForm.veBetrag > 0) {
      sicherheiten.vertragserfuellungBuergschaft = rechnungForm.veBetrag;
    }
    if (rechnungForm.gwArt === 'einbehalt' && rechnungForm.gwBetrag > 0) {
      sicherheiten.gewaehrleistungEinbehalt = rechnungForm.gwBetrag;
    } else if (rechnungForm.gwArt === 'buergschaft' && rechnungForm.gwBetrag > 0) {
      sicherheiten.gewaehrleistungBuergschaft = rechnungForm.gwBetrag;
    }

    const hatSicherheiten = Object.keys(sicherheiten).length > 0;

    const rechnungData: Rechnung = {
      id: editRechnung?.id || generateId(),
      rechnungsnummer: rechnungForm.rechnungsnummer,
      datum: rechnungForm.datum,
      betragNetto: rechnungForm.betragNetto,
      typ: rechnungForm.typ,
      geprueft: !!rechnungForm.geprueftDatum,
      geprueftDatum: rechnungForm.geprueftDatum || undefined,
      freigegeben: !!rechnungForm.bezahltDatum,
      bezahltDatum: rechnungForm.bezahltDatum || undefined,
      bereitsInFeeAbgerechnet: editRechnung?.bereitsInFeeAbgerechnet || false,
      sicherheiten: hatSicherheiten ? sicherheiten : undefined,
      info: rechnungForm.info || undefined
    };

    const aktualisiert = projekt.fachfirmen.map(ff => {
      if (ff.id !== aktiveFachfirmaId) return ff;
      if (editRechnung) {
        return { ...ff, rechnungen: ff.rechnungen.map(r => r.id === editRechnung.id ? rechnungData : r) };
      } else {
        return { ...ff, rechnungen: [...ff.rechnungen, rechnungData] };
      }
    });
    onUpdate({ ...projekt, fachfirmen: aktualisiert });
    setZeigeRechnungModal(false);
  };

  const handleRechnungDelete = (fachfirmaId: string, rechnungId: string) => {
    if (!window.confirm('Rechnung wirklich löschen?')) return;
    const aktualisiert = projekt.fachfirmen.map(ff => {
      if (ff.id !== fachfirmaId) return ff;
      return { ...ff, rechnungen: ff.rechnungen.filter(r => r.id !== rechnungId) };
    });
    onUpdate({ ...projekt, fachfirmen: aktualisiert });
  };

  // Angebot Funktionen
  const handleAngebotHinzufuegen = (fachfirmaId: string, istNachtrag: boolean) => {
    setAktiveFachfirmaId(fachfirmaId);
    const ff = projekt.fachfirmen.find(f => f.id === fachfirmaId);
    const nextNr = (ff?.angebote.length || 0) + 1;

    setAngebotForm({
      angebotsnummer: istNachtrag ? `NT-${String(nextNr).padStart(3, '0')}` : `ANG-${String(nextNr).padStart(3, '0')}`,
      datum: new Date().toISOString().split('T')[0],
      betragNetto: 0,
      beschreibung: '',
      freigabestatus: 'verschickt',
      istNachtrag
    });
    setEditAngebot(null);
    setZeigeAngebotModal(true);
  };

  const handleAngebotEdit = (fachfirmaId: string, angebot: Angebot) => {
    setAktiveFachfirmaId(fachfirmaId);
    setEditAngebot(angebot);
    setAngebotForm({
      angebotsnummer: angebot.angebotsnummer,
      datum: angebot.datum,
      betragNetto: angebot.betragNetto,
      beschreibung: angebot.beschreibung,
      freigabestatus: angebot.freigabestatus,
      istNachtrag: angebot.istNachtrag
    });
    setZeigeAngebotModal(true);
  };

  const handleAngebotSave = () => {
    if (!aktiveFachfirmaId) return;

    const neuesAngebot: Angebot = {
      id: editAngebot?.id || generateId(),
      angebotsnummer: angebotForm.angebotsnummer,
      datum: angebotForm.datum,
      betragNetto: angebotForm.betragNetto,
      beschreibung: angebotForm.beschreibung,
      freigabestatus: angebotForm.freigabestatus,
      istNachtrag: angebotForm.istNachtrag,
      genehmigtAm: (angebotForm.freigabestatus === 'freigegeben' || angebotForm.freigabestatus === 'beauftragt')
        ? editAngebot?.genehmigtAm || new Date().toISOString().split('T')[0]
        : undefined,
      abgelehntAm: angebotForm.freigabestatus === 'abgelehnt'
        ? editAngebot?.abgelehntAm || new Date().toISOString().split('T')[0]
        : undefined
    };

    const aktualisiert = projekt.fachfirmen.map(ff => {
      if (ff.id !== aktiveFachfirmaId) return ff;

      if (editAngebot) {
        return { ...ff, angebote: ff.angebote.map(a => a.id === editAngebot.id ? neuesAngebot : a) };
      } else {
        return { ...ff, angebote: [...ff.angebote, neuesAngebot] };
      }
    });

    onUpdate({ ...projekt, fachfirmen: aktualisiert });
    setZeigeAngebotModal(false);
  };

  const handleAngebotStatusChange = (fachfirmaId: string, angebotId: string, neuerStatus: AngebotStatus) => {
    const aktualisiert = projekt.fachfirmen.map(ff => {
      if (ff.id !== fachfirmaId) return ff;
      return {
        ...ff,
        angebote: ff.angebote.map(a => {
          if (a.id !== angebotId) return a;
          return {
            ...a,
            freigabestatus: neuerStatus,
            genehmigtAm: (neuerStatus === 'freigegeben' || neuerStatus === 'beauftragt')
              ? a.genehmigtAm || new Date().toISOString().split('T')[0]
              : a.genehmigtAm,
            abgelehntAm: neuerStatus === 'abgelehnt'
              ? new Date().toISOString().split('T')[0]
              : undefined
          };
        })
      };
    });
    onUpdate({ ...projekt, fachfirmen: aktualisiert });
  };

  const handleAngebotDelete = (fachfirmaId: string, angebotId: string) => {
    if (!window.confirm('Angebot wirklich löschen?')) return;

    const aktualisiert = projekt.fachfirmen.map(ff => {
      if (ff.id !== fachfirmaId) return ff;
      return { ...ff, angebote: ff.angebote.filter(a => a.id !== angebotId) };
    });
    onUpdate({ ...projekt, fachfirmen: aktualisiert });
  };

  // Abnahme Funktionen
  const handleAbnahmeHinzufuegen = (fachfirmaId: string) => {
    setAktiveFachfirmaId(fachfirmaId);
    setEditAbnahme(null);
    setAbnahmeForm({
      abnahmeart: 'teilabnahme',
      termin: '',
      leistungen: '',
      maengelIds: [],
      gewaehrleistungBis: ''
    });
    setZeigeAbnahmeModal(true);
  };

  const handleAbnahmeEdit = (fachfirmaId: string, abnahme: FachfirmaAbnahme) => {
    setAktiveFachfirmaId(fachfirmaId);
    setEditAbnahme(abnahme);
    setAbnahmeForm({
      abnahmeart: abnahme.abnahmeart,
      termin: abnahme.termin,
      leistungen: abnahme.leistungen || '',
      maengelIds: abnahme.maengelIds || [],
      gewaehrleistungBis: abnahme.gewaehrleistungBis || ''
    });
    setZeigeAbnahmeModal(true);
  };

  const handleAbnahmeSave = () => {
    if (!aktiveFachfirmaId) return;

    const abnahmeData: FachfirmaAbnahme = {
      id: editAbnahme?.id || generateId(),
      abnahmeart: abnahmeForm.abnahmeart,
      termin: abnahmeForm.termin,
      leistungen: abnahmeForm.leistungen || undefined,
      maengelIds: abnahmeForm.maengelIds,
      gewaehrleistungBis: abnahmeForm.gewaehrleistungBis || undefined
    };

    const aktualisiert = projekt.fachfirmen.map(ff => {
      if (ff.id !== aktiveFachfirmaId) return ff;
      const abnahmen = ff.abnahmen || [];
      if (editAbnahme) {
        return { ...ff, abnahmen: abnahmen.map(a => a.id === editAbnahme.id ? abnahmeData : a) };
      } else {
        return { ...ff, abnahmen: [...abnahmen, abnahmeData] };
      }
    });
    onUpdate({ ...projekt, fachfirmen: aktualisiert });
    setZeigeAbnahmeModal(false);
  };

  const handleAbnahmeDelete = (fachfirmaId: string, abnahmeId: string) => {
    if (!window.confirm('Abnahme wirklich löschen?')) return;
    const aktualisiert = projekt.fachfirmen.map(ff => {
      if (ff.id !== fachfirmaId) return ff;
      return { ...ff, abnahmen: (ff.abnahmen || []).filter(a => a.id !== abnahmeId) };
    });
    onUpdate({ ...projekt, fachfirmen: aktualisiert });
  };

  // Prüft ob ein Mangel bereits einer anderen Firma zugeordnet ist
  const findeMangelZuordnung = (mangelId: string): string | null => {
    // Prüfe alle Fachfirmen-Abnahmen (außer der aktuellen)
    for (const ff of projekt.fachfirmen) {
      if (ff.id === aktiveFachfirmaId) continue; // Aktuelle Firma überspringen
      for (const abnahme of (ff.abnahmen || [])) {
        if (abnahme.maengelIds.includes(mangelId)) {
          return `Fachfirma "${ff.firma}"`;
        }
      }
    }
    // Prüfe alle Fachplaner-Abnahmen
    for (const fp of projekt.fachplaner) {
      for (const abnahme of (fp.abnahmen || [])) {
        if (abnahme.maengelIds.includes(mangelId)) {
          return `Fachplaner "${fp.firma}"`;
        }
      }
    }
    return null;
  };

  const toggleMangelSelection = (mangelId: string) => {
    // Wenn Mangel abgewählt wird, keine Prüfung nötig
    if (abnahmeForm.maengelIds.includes(mangelId)) {
      setAbnahmeForm(prev => ({
        ...prev,
        maengelIds: prev.maengelIds.filter(id => id !== mangelId)
      }));
      return;
    }

    // Prüfe ob Mangel bereits zugeordnet
    const zuordnung = findeMangelZuordnung(mangelId);
    if (zuordnung) {
      const mangel = projekt.maengel.find(m => m.id === mangelId);
      const bestaetigt = window.confirm(
        `Mangel #${mangel?.mangelnummer} ist bereits ${zuordnung} zugeordnet.\n\nTrotzdem dieser Fachfirma zuordnen?`
      );
      if (!bestaetigt) return;
    }

    setAbnahmeForm(prev => ({
      ...prev,
      maengelIds: [...prev.maengelIds, mangelId]
    }));
  };

  // Budget aus freigegebenen Angeboten + Nachträgen berechnen
  const berechneEffektivesBudget = (ff: Fachfirma): number => {
    return berechneEffektivesBudgetAusAngeboten(ff.angebote);
  };

  const berechneAuslastung = (ff: Fachfirma) => {
    const summe = ff.rechnungen.reduce((s, r) => s + r.betragNetto, 0);
    const effektivesBudget = berechneEffektivesBudget(ff);
    if (effektivesBudget === 0) return 0;
    return (summe / effektivesBudget) * 100;
  };

  // Sicherheiten aus Rechnung formatieren
  const formatSicherheiten = (rechnung: Rechnung): string => {
    const parts: string[] = [];
    if (rechnung.sicherheiten) {
      if (rechnung.sicherheiten.vertragserfuellungEinbehalt) {
        parts.push(`VE-Einb: ${formatWaehrung(rechnung.sicherheiten.vertragserfuellungEinbehalt)}`);
      }
      if (rechnung.sicherheiten.vertragserfuellungBuergschaft) {
        parts.push(`VE-Bürg: ${formatWaehrung(rechnung.sicherheiten.vertragserfuellungBuergschaft)}`);
      }
      if (rechnung.sicherheiten.gewaehrleistungEinbehalt) {
        parts.push(`GW-Einb: ${formatWaehrung(rechnung.sicherheiten.gewaehrleistungEinbehalt)}`);
      }
      if (rechnung.sicherheiten.gewaehrleistungBuergschaft) {
        parts.push(`GW-Bürg: ${formatWaehrung(rechnung.sicherheiten.gewaehrleistungBuergschaft)}`);
      }
    } else if (rechnung.sicherheitseinbehaltNetto) {
      parts.push(formatWaehrung(rechnung.sicherheitseinbehaltNetto));
    }
    return parts.join(', ') || '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Fachfirmen</h2>
        <button onClick={handleNeu} className="btn-primary">+ Fachfirma hinzufügen</button>
      </div>

      {projekt.fachfirmen.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-apleona-gray-500">Noch keine Fachfirmen angelegt.</p>
          <button onClick={handleNeu} className="btn-primary mt-4">Erste Fachfirma anlegen</button>
        </div>
      ) : (
        <div className="space-y-4">
          {projekt.fachfirmen.map(ff => {
            const auslastung = berechneAuslastung(ff);
            const effektivesBudget = berechneEffektivesBudget(ff);
            const gewerk = projekt.gewerke.find(g => g.id === ff.gewerkId);
            const summeRechnungen = ff.rechnungen.reduce((s, r) => s + r.betragNetto, 0);
            const buergschaftVeOffen = ff.vertragserfuellung.buergschaft.urkundeErhalten && !ff.vertragserfuellung.buergschaft.urkundeZurueckgesendet;
            const buergschaftGwOffen = ff.gewaehrleistung.buergschaft.urkundeErhalten && !ff.gewaehrleistung.buergschaft.urkundeZurueckgesendet;
            const summeFreigegebeneNachtraege = ff.angebote
              .filter(a => a.istNachtrag && (a.freigabestatus === 'freigegeben' || a.freigabestatus === 'beauftragt'))
              .reduce((s, a) => s + a.betragNetto, 0);

            return (
              <div key={ff.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <h3 className="font-semibold text-lg">{ff.firma}</h3>
                      {auslastung > 100 && <span className="badge-danger">Budget überschritten!</span>}
                      {auslastung > 80 && auslastung <= 100 && <span className="badge-warning">&gt;80% Budget</span>}
                      {buergschaftVeOffen && (
                        <span className="badge-warning">VE-Bürgschaft zurücksenden!</span>
                      )}
                      {buergschaftGwOffen && (
                        <span className="badge-warning">GW-Bürgschaft zurücksenden!</span>
                      )}
                    </div>
                    <p className="text-sm text-apleona-gray-600">{ff.name}</p>
                    {gewerk && <span className="badge-info mt-1">{gewerk.dinNummer} - {gewerk.bezeichnung}</span>}
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-apleona-gray-500">Eff. Budget</p>
                      <p className="font-semibold">{formatWaehrung(effektivesBudget)}</p>
                      {summeFreigegebeneNachtraege > 0 && (
                        <p className="text-xs text-amber-600">inkl. {formatWaehrung(summeFreigegebeneNachtraege)} NT</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-apleona-gray-500">Rechnungen</p>
                      <p className="font-semibold">{formatWaehrung(summeRechnungen)}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => setExpandedId(expandedId === ff.id ? null : ff.id)} className="text-apleona-navy">
                        <svg className={`w-5 h-5 transform ${expandedId === ff.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button onClick={() => handleEdit(ff)} className="text-apleona-navy hover:text-apleona-navy-dark">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(ff.id)} className="text-apleona-red hover:text-apleona-red-dark">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Fortschrittsbalken */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-apleona-gray-600 mb-1">
                    <span>Budgetauslastung</span>
                    <span>{auslastung.toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${auslastung > 100 ? 'bg-status-red' : auslastung > 80 ? 'bg-status-yellow' : 'bg-status-green'}`}
                      style={{ width: `${Math.min(auslastung, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Erweiterte Ansicht */}
                {expandedId === ff.id && (
                  <div className="mt-6 border-t border-apleona-gray-200 pt-4 space-y-6">

                    {/* Angebote */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">Angebote</h4>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAngebotHinzufuegen(ff.id, false)}
                            className="btn-secondary text-sm"
                          >
                            + Hauptangebot
                          </button>
                          <button
                            onClick={() => handleAngebotHinzufuegen(ff.id, true)}
                            className="px-3 py-1 text-sm rounded bg-amber-100 hover:bg-amber-200 text-amber-800"
                          >
                            + Nachtrag
                          </button>
                        </div>
                      </div>

                      {ff.angebote.length === 0 ? (
                        <p className="text-apleona-gray-500 text-sm">Keine Angebote vorhanden</p>
                      ) : (
                        <div className="space-y-4">
                          {/* Hauptangebote */}
                          {ff.angebote.filter(a => !a.istNachtrag).length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-600 mb-2">Hauptangebote</h5>
                              <table className="min-w-full divide-y divide-apleona-gray-200">
                                <thead className="bg-apleona-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Nr.</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Datum</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Beschreibung</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">Betrag</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-apleona-gray-500">Status</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-apleona-gray-500">Aktionen</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-apleona-gray-200">
                                  {ff.angebote.filter(a => !a.istNachtrag).map(angebot => (
                                    <tr key={angebot.id}>
                                      <td className="px-3 py-2 text-sm">{angebot.angebotsnummer}</td>
                                      <td className="px-3 py-2 text-sm">{formatDatum(angebot.datum)}</td>
                                      <td className="px-3 py-2 text-sm max-w-xs truncate" title={angebot.beschreibung}>{angebot.beschreibung}</td>
                                      <td className="px-3 py-2 text-sm text-right font-medium">{formatWaehrung(angebot.betragNetto)}</td>
                                      <td className="px-3 py-2 text-center">
                                        <select
                                          value={angebot.freigabestatus}
                                          onChange={e => handleAngebotStatusChange(ff.id, angebot.id, e.target.value as AngebotStatus)}
                                          className={`text-xs px-2 py-1 rounded border-0 ${AngebotStatusColors[angebot.freigabestatus]}`}
                                        >
                                          {Object.entries(AngebotStatusLabels).map(([k, v]) => (
                                            <option key={k} value={k}>{v}</option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <div className="flex justify-center space-x-2">
                                          <button onClick={() => handleAngebotEdit(ff.id, angebot)} className="text-apleona-navy hover:text-apleona-navy-dark">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                          <button onClick={() => handleAngebotDelete(ff.id, angebot.id)} className="text-apleona-red hover:text-apleona-red-dark">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Nachträge */}
                          {ff.angebote.filter(a => a.istNachtrag).length > 0 && (
                            <div className="bg-amber-50 rounded-lg p-3">
                              <h5 className="text-sm font-medium text-amber-800 mb-2">
                                Nachträge
                                <span className="ml-2 text-xs font-normal">
                                  (Summe freigegeben: {formatWaehrung(summeFreigegebeneNachtraege)})
                                </span>
                              </h5>
                              <table className="min-w-full">
                                <thead className="bg-amber-100/50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-amber-800">Nr.</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-amber-800">Datum</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-amber-800">Beschreibung</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-amber-800">Betrag</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-amber-800">Status</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-amber-800">Aktionen</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-amber-200">
                                  {ff.angebote.filter(a => a.istNachtrag).map(angebot => (
                                    <tr key={angebot.id}>
                                      <td className="px-3 py-2 text-sm">{angebot.angebotsnummer}</td>
                                      <td className="px-3 py-2 text-sm">{formatDatum(angebot.datum)}</td>
                                      <td className="px-3 py-2 text-sm max-w-xs truncate" title={angebot.beschreibung}>{angebot.beschreibung}</td>
                                      <td className="px-3 py-2 text-sm text-right font-medium">{formatWaehrung(angebot.betragNetto)}</td>
                                      <td className="px-3 py-2 text-center">
                                        <select
                                          value={angebot.freigabestatus}
                                          onChange={e => handleAngebotStatusChange(ff.id, angebot.id, e.target.value as AngebotStatus)}
                                          className={`text-xs px-2 py-1 rounded border-0 ${AngebotStatusColors[angebot.freigabestatus]}`}
                                        >
                                          {Object.entries(AngebotStatusLabels).map(([k, v]) => (
                                            <option key={k} value={k}>{v}</option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <div className="flex justify-center space-x-2">
                                          <button onClick={() => handleAngebotEdit(ff.id, angebot)} className="text-apleona-navy hover:text-apleona-navy-dark">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                          <button onClick={() => handleAngebotDelete(ff.id, angebot.id)} className="text-apleona-red hover:text-apleona-red-dark">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Sicherheiten - Gesamtübersicht */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-apleona-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">Vertragserfüllung</h4>
                        {ff.vertragserfuellung.sicherheitseinbehaltNetto ? (
                          <p className="text-sm">Einbehalt: {formatWaehrung(ff.vertragserfuellung.sicherheitseinbehaltNetto)}</p>
                        ) : null}
                        {ff.vertragserfuellung.buergschaft.urkundeErhalten && (
                          <div className="text-sm space-y-1">
                            <p className="text-status-green">
                              Bürgschaft erhalten
                              {ff.vertragserfuellung.buergschaft.urkundeErhaltenDatum && ` am ${formatDatum(ff.vertragserfuellung.buergschaft.urkundeErhaltenDatum)}`}
                            </p>
                            {ff.vertragserfuellung.buergschaft.urkundeZurueckgesendet ? (
                              <p className="text-status-green">
                                Zurückgesendet
                                {ff.vertragserfuellung.buergschaft.urkundeZurueckgesendetDatum && ` am ${formatDatum(ff.vertragserfuellung.buergschaft.urkundeZurueckgesendetDatum)}`}
                              </p>
                            ) : (
                              <p className="text-status-yellow">Noch zurückzusenden!</p>
                            )}
                          </div>
                        )}
                        {!ff.vertragserfuellung.sicherheitseinbehaltNetto && !ff.vertragserfuellung.buergschaft.urkundeErhalten && (
                          <p className="text-sm text-apleona-gray-500">Nicht festgelegt</p>
                        )}
                      </div>
                      <div className="p-3 bg-apleona-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">Gewährleistung</h4>
                        {ff.gewaehrleistung.einbehaltNetto ? (
                          <p className="text-sm">Einbehalt: {formatWaehrung(ff.gewaehrleistung.einbehaltNetto)}</p>
                        ) : null}
                        {ff.gewaehrleistung.buergschaft.urkundeErhalten && (
                          <div className="text-sm space-y-1">
                            <p className="text-status-green">
                              Bürgschaft erhalten
                              {ff.gewaehrleistung.buergschaft.urkundeErhaltenDatum && ` am ${formatDatum(ff.gewaehrleistung.buergschaft.urkundeErhaltenDatum)}`}
                            </p>
                            {ff.gewaehrleistung.buergschaft.urkundeZurueckgesendet ? (
                              <p className="text-status-green">
                                Zurückgesendet
                                {ff.gewaehrleistung.buergschaft.urkundeZurueckgesendetDatum && ` am ${formatDatum(ff.gewaehrleistung.buergschaft.urkundeZurueckgesendetDatum)}`}
                              </p>
                            ) : (
                              <p className="text-status-yellow">Noch zurückzusenden!</p>
                            )}
                          </div>
                        )}
                        {!ff.gewaehrleistung.einbehaltNetto && !ff.gewaehrleistung.buergschaft.urkundeErhalten && (
                          <p className="text-sm text-apleona-gray-500">Nicht festgelegt</p>
                        )}
                      </div>
                    </div>

                    {/* Rechnungen */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">Rechnungen</h4>
                        <button onClick={() => handleRechnungHinzufuegen(ff.id)} className="btn-secondary text-sm">+ Rechnung</button>
                      </div>

                      {ff.rechnungen.length === 0 ? (
                        <p className="text-apleona-gray-500 text-sm">Keine Rechnungen vorhanden</p>
                      ) : (
                        <table className="min-w-full divide-y divide-apleona-gray-200">
                          <thead className="bg-apleona-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Re-Nr.</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Re-Datum</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Rechnungsart</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">Zahlbetrag</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-apleona-gray-500">Geprüft</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-apleona-gray-500">Bezahlt</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Sicherheiten</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Info</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-apleona-gray-500">Aktionen</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-apleona-gray-200">
                            {ff.rechnungen.map(r => (
                              <tr key={r.id} className={r.typ === 'schlussrechnung' ? 'bg-amber-50' : ''}>
                                <td className="px-3 py-2 text-sm">
                                  <button
                                    onClick={() => handleRechnungEdit(ff.id, r)}
                                    className="text-apleona-navy hover:underline font-medium"
                                  >
                                    {r.rechnungsnummer}
                                  </button>
                                </td>
                                <td className="px-3 py-2 text-sm">{formatDatum(r.datum)}</td>
                                <td className="px-3 py-2 text-sm">
                                  {r.typ === 'schlussrechnung' ? (
                                    <span className="badge-warning">Schlussrechnung</span>
                                  ) : RechnungsTypLabels[r.typ]}
                                </td>
                                <td className="px-3 py-2 text-sm text-right font-medium">{formatWaehrung(r.betragNetto)}</td>
                                <td className="px-3 py-2 text-center text-sm">{r.geprueftDatum ? formatDatum(r.geprueftDatum) : '-'}</td>
                                <td className="px-3 py-2 text-center text-sm">{r.bezahltDatum ? formatDatum(r.bezahltDatum) : '-'}</td>
                                <td className="px-3 py-2 text-sm text-apleona-gray-600 max-w-xs truncate" title={formatSicherheiten(r)}>
                                  {formatSicherheiten(r)}
                                </td>
                                <td className="px-3 py-2 text-sm text-apleona-gray-600 max-w-xs truncate" title={r.info}>
                                  {r.info || '-'}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <div className="flex justify-center space-x-2">
                                    <button onClick={() => handleRechnungEdit(ff.id, r)} className="text-apleona-navy hover:text-apleona-navy-dark">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button onClick={() => handleRechnungDelete(ff.id, r.id)} className="text-apleona-red hover:text-apleona-red-dark">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Abnahmen */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">Abnahmen</h4>
                        <button
                          onClick={() => handleAbnahmeHinzufuegen(ff.id)}
                          className="btn-secondary text-sm"
                        >
                          + Abnahme
                        </button>
                      </div>

                      {(!ff.abnahmen || ff.abnahmen.length === 0) ? (
                        <p className="text-apleona-gray-500 text-sm">Keine Abnahmen vorhanden</p>
                      ) : (
                        <div className="space-y-3">
                          {ff.abnahmen.map(abnahme => {
                            const verknuepfteMaengel = projekt.maengel.filter(m => abnahme.maengelIds.includes(m.id));
                            return (
                              <div key={abnahme.id} className={`border rounded-lg p-3 ${abnahme.abnahmeart === 'endabnahme' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${abnahme.abnahmeart === 'endabnahme' ? 'bg-green-200 text-green-800' : 'bg-blue-200 text-blue-800'}`}>
                                        {abnahme.abnahmeart === 'endabnahme' ? 'Endabnahme' : 'Teilabnahme'}
                                      </span>
                                      <span className="text-sm font-medium">{formatDatum(abnahme.termin)}</span>
                                      {abnahme.gewaehrleistungBis && (
                                        <span className="text-xs text-apleona-gray-600">
                                          (GW bis {formatDatum(abnahme.gewaehrleistungBis)})
                                        </span>
                                      )}
                                    </div>
                                    {abnahme.leistungen && (
                                      <p className="text-sm text-apleona-gray-600 mt-1">
                                        <span className="font-medium">Leistungen:</span> {abnahme.leistungen}
                                      </p>
                                    )}
                                    {verknuepfteMaengel.length > 0 && (
                                      <div className="mt-2">
                                        <span className="text-xs font-medium text-apleona-gray-500">Mängel ({verknuepfteMaengel.length}):</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {verknuepfteMaengel.map(m => (
                                            <span
                                              key={m.id}
                                              title={m.beschreibung}
                                              className={`text-xs px-2 py-0.5 rounded cursor-help ${m.status === 'behoben' || m.status === 'abgenommen' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                            >
                                              #{m.mangelnummer}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex space-x-2">
                                    <button onClick={() => handleAbnahmeEdit(ff.id, abnahme)} className="text-apleona-navy hover:text-apleona-navy-dark">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button onClick={() => handleAbnahmeDelete(ff.id, abnahme.id)} className="text-apleona-red hover:text-apleona-red-dark">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Kontaktdaten */}
                    <div className="pt-4 border-t border-apleona-gray-200">
                      <h4 className="font-medium mb-2">Kontakt</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-apleona-gray-500">Ansprechpartner:</span>
                          <span className="ml-2">{ff.kontakt.ansprechpartner || '-'}</span>
                        </div>
                        <div>
                          <span className="text-apleona-gray-500">Telefon:</span>
                          <span className="ml-2">{ff.kontakt.telefon || '-'}</span>
                        </div>
                        <div>
                          <span className="text-apleona-gray-500">E-Mail:</span>
                          <span className="ml-2">{ff.kontakt.email || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fachfirma Modal */}
      {zeigeModal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setZeigeModal(false)}>
          <div className="modal-content p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">{editFachfirma ? 'Fachfirma bearbeiten' : 'Neue Fachfirma'}</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Firma</label>
                  <input type="text" value={formData.firma} onChange={e => setFormData({ ...formData, firma: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="label">Name / Bezeichnung</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field" />
                </div>
              </div>

              <div>
                <label className="label">Zugeordnetes Gewerk</label>
                <select value={formData.gewerkId} onChange={e => setFormData({ ...formData, gewerkId: e.target.value })} className="input-field">
                  <option value="">Kein Gewerk zugeordnet</option>
                  {projekt.gewerke.map(g => <option key={g.id} value={g.id}>{g.dinNummer} - {g.bezeichnung}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Ansprechpartner</label>
                  <input type="text" value={formData.ansprechpartner} onChange={e => setFormData({ ...formData, ansprechpartner: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="label">Telefon</label>
                  <input type="tel" value={formData.telefon} onChange={e => setFormData({ ...formData, telefon: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="label">E-Mail</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-field" />
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                <strong>Hinweis:</strong> Das Budget wird automatisch aus den freigegebenen Hauptangeboten und Nachträgen berechnet.
              </div>

              {/* Vertragserfüllung */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Vertragserfüllung</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Sicherheitseinbehalt (netto EUR)</label>
                    <input type="number" step="0.01" value={formData.sicherheitseinbehaltNetto} onChange={e => setFormData({ ...formData, sicherheitseinbehaltNetto: parseFloat(e.target.value) || 0 })} className="input-field" />
                  </div>
                  <div className="space-y-2">
                    <label className="label">Bürgschaft</label>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input type="checkbox" checked={formData.veBuergschaftUrkundeErhalten} onChange={e => setFormData({ ...formData, veBuergschaftUrkundeErhalten: e.target.checked })} className="mr-2" />
                        <span className="text-sm">Erhalten</span>
                      </label>
                      {formData.veBuergschaftUrkundeErhalten && (
                        <input type="date" value={formData.veBuergschaftUrkundeErhaltenDatum} onChange={e => setFormData({ ...formData, veBuergschaftUrkundeErhaltenDatum: e.target.value })} className="input-field text-sm py-1" placeholder="Datum" />
                      )}
                    </div>
                    {formData.veBuergschaftUrkundeErhalten && (
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input type="checkbox" checked={formData.veBuergschaftUrkundeZurueck} onChange={e => setFormData({ ...formData, veBuergschaftUrkundeZurueck: e.target.checked })} className="mr-2" />
                          <span className="text-sm">Zurückgesendet</span>
                        </label>
                        {formData.veBuergschaftUrkundeZurueck && (
                          <input type="date" value={formData.veBuergschaftUrkundeZurueckDatum} onChange={e => setFormData({ ...formData, veBuergschaftUrkundeZurueckDatum: e.target.value })} className="input-field text-sm py-1" placeholder="Datum" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Gewährleistung */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Gewährleistung</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Einbehalt (netto EUR)</label>
                    <input type="number" step="0.01" value={formData.gewleistungseinbehaltNetto} onChange={e => setFormData({ ...formData, gewleistungseinbehaltNetto: parseFloat(e.target.value) || 0 })} className="input-field" />
                  </div>
                  <div className="space-y-2">
                    <label className="label">Bürgschaft</label>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input type="checkbox" checked={formData.gwBuergschaftUrkundeErhalten} onChange={e => setFormData({ ...formData, gwBuergschaftUrkundeErhalten: e.target.checked })} className="mr-2" />
                        <span className="text-sm">Erhalten</span>
                      </label>
                      {formData.gwBuergschaftUrkundeErhalten && (
                        <input type="date" value={formData.gwBuergschaftUrkundeErhaltenDatum} onChange={e => setFormData({ ...formData, gwBuergschaftUrkundeErhaltenDatum: e.target.value })} className="input-field text-sm py-1" placeholder="Datum" />
                      )}
                    </div>
                    {formData.gwBuergschaftUrkundeErhalten && (
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input type="checkbox" checked={formData.gwBuergschaftUrkundeZurueck} onChange={e => setFormData({ ...formData, gwBuergschaftUrkundeZurueck: e.target.checked })} className="mr-2" />
                          <span className="text-sm">Zurückgesendet</span>
                        </label>
                        {formData.gwBuergschaftUrkundeZurueck && (
                          <input type="date" value={formData.gwBuergschaftUrkundeZurueckDatum} onChange={e => setFormData({ ...formData, gwBuergschaftUrkundeZurueckDatum: e.target.value })} className="input-field text-sm py-1" placeholder="Datum" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Notizen</label>
                <textarea value={formData.notizen} onChange={e => setFormData({ ...formData, notizen: e.target.value })} className="input-field" rows={2} />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setZeigeModal(false)} className="btn-secondary">Abbrechen</button>
              <button onClick={handleSave} disabled={!formData.firma || !formData.name} className="btn-primary disabled:opacity-50">Speichern</button>
            </div>
          </div>
        </div>
      )}

      {/* Rechnung Modal */}
      {zeigeRechnungModal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setZeigeRechnungModal(false)}>
          <div className="modal-content p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">{editRechnung ? 'Rechnung bearbeiten' : 'Neue Rechnung'}</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Re-Nr.</label>
                  <input type="text" value={rechnungForm.rechnungsnummer} onChange={e => setRechnungForm({ ...rechnungForm, rechnungsnummer: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="label">Re-Datum</label>
                  <input type="date" value={rechnungForm.datum} onChange={e => setRechnungForm({ ...rechnungForm, datum: e.target.value })} className="input-field" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Zahlbetrag netto (EUR)</label>
                  <input type="number" step="0.01" value={rechnungForm.betragNetto} onChange={e => setRechnungForm({ ...rechnungForm, betragNetto: parseFloat(e.target.value) || 0 })} className="input-field" />
                </div>
                <div>
                  <label className="label">Rechnungsart</label>
                  <select value={rechnungForm.typ} onChange={e => setRechnungForm({ ...rechnungForm, typ: e.target.value as RechnungsTyp })} className="input-field">
                    <option value="anzahlung">Anzahlung</option>
                    <option value="teilrechnung">Abschlagrechnung</option>
                    <option value="schlussrechnung">Schlussrechnung</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Geprüft (Datum)</label>
                  <input type="date" value={rechnungForm.geprueftDatum} onChange={e => setRechnungForm({ ...rechnungForm, geprueftDatum: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="label">Bezahlt (Datum)</label>
                  <input type="date" value={rechnungForm.bezahltDatum} onChange={e => setRechnungForm({ ...rechnungForm, bezahltDatum: e.target.value })} className="input-field" />
                </div>
              </div>

              {/* Sicherheiten */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Sicherheiten</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Vertragserfüllung */}
                  <div className="p-3 bg-apleona-gray-50 rounded">
                    <label className="label">Vertragserfüllung</label>
                    <select
                      value={rechnungForm.veArt}
                      onChange={e => setRechnungForm({ ...rechnungForm, veArt: e.target.value as SicherungsArt, veBetrag: e.target.value === 'keine' ? 0 : rechnungForm.veBetrag })}
                      className="input-field mb-2"
                    >
                      <option value="keine">Keine</option>
                      <option value="einbehalt">Sicherheitseinbehalt</option>
                      <option value="buergschaft">Vertragserfüllungsbürgschaft</option>
                    </select>
                    {rechnungForm.veArt !== 'keine' && (
                      <div>
                        <label className="label text-xs">Betrag (EUR netto)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={rechnungForm.veBetrag}
                          onChange={e => setRechnungForm({ ...rechnungForm, veBetrag: parseFloat(e.target.value) || 0 })}
                          className="input-field"
                        />
                      </div>
                    )}
                  </div>

                  {/* Gewährleistung */}
                  <div className="p-3 bg-apleona-gray-50 rounded">
                    <label className="label">Gewährleistung</label>
                    <select
                      value={rechnungForm.gwArt}
                      onChange={e => setRechnungForm({ ...rechnungForm, gwArt: e.target.value as SicherungsArt, gwBetrag: e.target.value === 'keine' ? 0 : rechnungForm.gwBetrag })}
                      className="input-field mb-2"
                    >
                      <option value="keine">Keine</option>
                      <option value="einbehalt">Gewährleistungseinbehalt</option>
                      <option value="buergschaft">Gewährleistungsbürgschaft</option>
                    </select>
                    {rechnungForm.gwArt !== 'keine' && (
                      <div>
                        <label className="label text-xs">Betrag (EUR netto)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={rechnungForm.gwBetrag}
                          onChange={e => setRechnungForm({ ...rechnungForm, gwBetrag: parseFloat(e.target.value) || 0 })}
                          className="input-field"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Info</label>
                <textarea value={rechnungForm.info} onChange={e => setRechnungForm({ ...rechnungForm, info: e.target.value })} className="input-field" rows={2} placeholder="Zusätzliche Informationen..." />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setZeigeRechnungModal(false)} className="btn-secondary">Abbrechen</button>
              <button onClick={handleRechnungSave} disabled={!rechnungForm.rechnungsnummer || !rechnungForm.datum} className="btn-primary disabled:opacity-50">Speichern</button>
            </div>
          </div>
        </div>
      )}

      {/* Angebot Modal */}
      {zeigeAngebotModal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setZeigeAngebotModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">
              {editAngebot ? 'Angebot bearbeiten' : (angebotForm.istNachtrag ? 'Neuer Nachtrag' : 'Neues Angebot')}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Angebotsnummer</label>
                  <input
                    type="text"
                    value={angebotForm.angebotsnummer}
                    onChange={e => setAngebotForm({ ...angebotForm, angebotsnummer: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Datum</label>
                  <input
                    type="date"
                    value={angebotForm.datum}
                    onChange={e => setAngebotForm({ ...angebotForm, datum: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Betrag netto (EUR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={angebotForm.betragNetto}
                    onChange={e => setAngebotForm({ ...angebotForm, betragNetto: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    value={angebotForm.freigabestatus}
                    onChange={e => setAngebotForm({ ...angebotForm, freigabestatus: e.target.value as AngebotStatus })}
                    className="input-field"
                  >
                    {Object.entries(AngebotStatusLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Beschreibung</label>
                <textarea
                  value={angebotForm.beschreibung}
                  onChange={e => setAngebotForm({ ...angebotForm, beschreibung: e.target.value })}
                  className="input-field"
                  rows={3}
                />
              </div>

              {angebotForm.istNachtrag && (
                <div className="bg-amber-50 p-3 rounded text-sm text-amber-800">
                  <strong>Hinweis:</strong> Freigegebene Nachträge erhöhen automatisch das effektive Budget.
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setZeigeAngebotModal(false)} className="btn-secondary">Abbrechen</button>
              <button
                onClick={handleAngebotSave}
                disabled={!angebotForm.angebotsnummer || !angebotForm.datum}
                className="btn-primary disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Abnahme Modal */}
      {zeigeAbnahmeModal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setZeigeAbnahmeModal(false)}>
          <div className="modal-content p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">{editAbnahme ? 'Abnahme bearbeiten' : 'Neue Abnahme'}</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Abnahmeart</label>
                  <select
                    value={abnahmeForm.abnahmeart}
                    onChange={e => setAbnahmeForm({ ...abnahmeForm, abnahmeart: e.target.value as AbnahmeArt })}
                    className="input-field"
                  >
                    <option value="teilabnahme">Teilabnahme</option>
                    <option value="endabnahme">Endabnahme</option>
                  </select>
                </div>
                <div>
                  <label className="label">Termin</label>
                  <input
                    type="date"
                    value={abnahmeForm.termin}
                    onChange={e => setAbnahmeForm({ ...abnahmeForm, termin: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="label">Gewährleistung bis</label>
                <input
                  type="date"
                  value={abnahmeForm.gewaehrleistungBis}
                  onChange={e => setAbnahmeForm({ ...abnahmeForm, gewaehrleistungBis: e.target.value })}
                  className="input-field"
                />
                <p className="text-xs text-apleona-gray-500 mt-1">In der Regel 5 Jahre nach Abnahme</p>
              </div>

              <div>
                <label className="label">Leistungen</label>
                <textarea
                  value={abnahmeForm.leistungen}
                  onChange={e => setAbnahmeForm({ ...abnahmeForm, leistungen: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="Beschreibung der abzunehmenden Leistungen..."
                />
              </div>

              <div>
                <label className="label">Mängel zuordnen</label>
                <p className="text-xs text-apleona-gray-500 mb-2">Wählen Sie Mängel aus dem Projekt aus, die bei dieser Abnahme festgestellt wurden.</p>
                <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1 bg-apleona-gray-50">
                  {projekt.maengel.length === 0 ? (
                    <p className="text-sm text-apleona-gray-500 italic">Keine Mängel im Projekt vorhanden</p>
                  ) : (
                    projekt.maengel.map(mangel => (
                      <label key={mangel.id} className="flex items-center space-x-2 cursor-pointer hover:bg-white p-1 rounded">
                        <input
                          type="checkbox"
                          checked={abnahmeForm.maengelIds.includes(mangel.id)}
                          onChange={() => toggleMangelSelection(mangel.id)}
                        />
                        <span className={`text-xs px-1.5 py-0.5 rounded ${mangel.status === 'behoben' || mangel.status === 'abgenommen' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          #{mangel.mangelnummer}
                        </span>
                        <span className="text-sm truncate">{mangel.beschreibung}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setZeigeAbnahmeModal(false)} className="btn-secondary">Abbrechen</button>
              <button
                onClick={handleAbnahmeSave}
                disabled={!abnahmeForm.termin}
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

export default TabFachfirmen;
