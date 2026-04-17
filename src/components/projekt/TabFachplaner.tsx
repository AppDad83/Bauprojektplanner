'use client';

import React, { useState } from 'react';
import { Projekt, Fachplaner, Rechnung, Angebot, RechnungsTyp, AngebotStatus, FachplanerAbnahme, AbnahmeArt, Ansprechpartner } from '@/types';
import { formatDatum, formatWaehrung, generateId } from '@/lib/utils';

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

const TabFachplaner: React.FC<Props> = ({ projekt, onUpdate }) => {
  const [zeigeModal, setZeigeModal] = useState(false);
  const [editFachplaner, setEditFachplaner] = useState<Fachplaner | null>(null);
  const [zeigeRechnungModal, setZeigeRechnungModal] = useState(false);
  const [zeigeAngebotModal, setZeigeAngebotModal] = useState(false);
  const [zeigeAbnahmeModal, setZeigeAbnahmeModal] = useState(false);
  const [aktiverFachplanerId, setAktiverFachplanerId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editAngebot, setEditAngebot] = useState<Angebot | null>(null);
  const [editRechnung, setEditRechnung] = useState<Rechnung | null>(null);
  const [editAbnahme, setEditAbnahme] = useState<FachplanerAbnahme | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    firma: '',
    telefon: '',
    email: '',
    gewerkId: '',
    notizen: '',
    ansprechpartner: [] as Ansprechpartner[]
  });

  // Ansprechpartner Form für Inline-Bearbeitung
  const [neuerAnsprechpartner, setNeuerAnsprechpartner] = useState({
    name: '',
    rolle: '',
    telefon: '',
    email: '',
    notizen: ''
  });
  const [editAnsprechpartnerId, setEditAnsprechpartnerId] = useState<string | null>(null);

  const [rechnungForm, setRechnungForm] = useState({
    rechnungsnummer: '',
    datum: '',
    betragNetto: 0,
    typ: 'teilrechnung' as RechnungsTyp,
    geprueftDatum: '',
    bezahltDatum: '',
    info: ''
  });

  const [abnahmeForm, setAbnahmeForm] = useState({
    abnahmeart: 'teilabnahme' as AbnahmeArt,
    termin: '',
    leistungen: '',
    maengelIds: [] as string[]
  });

  const [angebotForm, setAngebotForm] = useState({
    angebotsnummer: '',
    datum: '',
    betragNetto: 0,
    beschreibung: '',
    freigabestatus: 'verschickt' as AngebotStatus,
    istNachtrag: false
  });

  const handleNeu = () => {
    setEditFachplaner(null);
    setFormData({
      name: '', firma: '', telefon: '', email: '',
      gewerkId: '', notizen: '', ansprechpartner: []
    });
    setNeuerAnsprechpartner({ name: '', rolle: '', telefon: '', email: '', notizen: '' });
    setEditAnsprechpartnerId(null);
    setZeigeModal(true);
  };

  const handleEdit = (fp: Fachplaner) => {
    setEditFachplaner(fp);
    setFormData({
      name: fp.name,
      firma: fp.firma,
      telefon: fp.kontakt.telefon || '',
      email: fp.kontakt.email || '',
      gewerkId: fp.gewerkId || '',
      notizen: fp.notizen || '',
      ansprechpartner: fp.ansprechpartner || []
    });
    setNeuerAnsprechpartner({ name: '', rolle: '', telefon: '', email: '', notizen: '' });
    setEditAnsprechpartnerId(null);
    setZeigeModal(true);
  };

  const handleSave = () => {
    // Hauptkontakt aus Ansprechpartnern ermitteln für Legacy-Feld
    const hauptkontakt = formData.ansprechpartner.find(ap => ap.istHauptkontakt);

    const kontakt = {
      ansprechpartner: hauptkontakt?.name || undefined, // Legacy-Feld für Rückwärtskompatibilität
      telefon: formData.telefon || undefined,
      email: formData.email || undefined
    };

    if (editFachplaner) {
      const aktualisiert = projekt.fachplaner.map(fp =>
        fp.id === editFachplaner.id
          ? {
              ...fp,
              name: formData.name,
              firma: formData.firma,
              kontakt,
              ansprechpartner: formData.ansprechpartner,
              gewerkId: formData.gewerkId || undefined,
              notizen: formData.notizen || undefined
            }
          : fp
      );
      onUpdate({ ...projekt, fachplaner: aktualisiert });
    } else {
      const neu: Fachplaner = {
        id: generateId(),
        typ: 'fachplaner',
        name: formData.name,
        firma: formData.firma,
        kontakt,
        ansprechpartner: formData.ansprechpartner,
        gewerkId: formData.gewerkId || undefined,
        angebote: [],
        vergabeEmpfehlung: {},
        budgetGenehmigt: 0, // Wird aus Angeboten berechnet
        budgetHistorie: [],
        rechnungen: [],
        abnahmen: [],
        notizen: formData.notizen || undefined
      };
      onUpdate({ ...projekt, fachplaner: [...projekt.fachplaner, neu] });
    }
    setZeigeModal(false);
  };

  // Ansprechpartner-Verwaltung
  const handleAnsprechpartnerHinzufuegen = () => {
    if (!neuerAnsprechpartner.name.trim()) return;

    const neuer: Ansprechpartner = {
      id: generateId(),
      name: neuerAnsprechpartner.name,
      rolle: neuerAnsprechpartner.rolle || undefined,
      telefon: neuerAnsprechpartner.telefon || undefined,
      email: neuerAnsprechpartner.email || undefined,
      notizen: neuerAnsprechpartner.notizen || undefined,
      istHauptkontakt: formData.ansprechpartner.length === 0 // Erster wird Hauptkontakt
    };

    setFormData(prev => ({
      ...prev,
      ansprechpartner: [...prev.ansprechpartner, neuer]
    }));
    setNeuerAnsprechpartner({ name: '', rolle: '', telefon: '', email: '', notizen: '' });
  };

  const handleAnsprechpartnerBearbeiten = (ap: Ansprechpartner) => {
    setEditAnsprechpartnerId(ap.id);
    setNeuerAnsprechpartner({
      name: ap.name,
      rolle: ap.rolle || '',
      telefon: ap.telefon || '',
      email: ap.email || '',
      notizen: ap.notizen || ''
    });
  };

  const handleAnsprechpartnerSpeichern = () => {
    if (!editAnsprechpartnerId || !neuerAnsprechpartner.name.trim()) return;

    setFormData(prev => ({
      ...prev,
      ansprechpartner: prev.ansprechpartner.map(ap =>
        ap.id === editAnsprechpartnerId
          ? {
              ...ap,
              name: neuerAnsprechpartner.name,
              rolle: neuerAnsprechpartner.rolle || undefined,
              telefon: neuerAnsprechpartner.telefon || undefined,
              email: neuerAnsprechpartner.email || undefined,
              notizen: neuerAnsprechpartner.notizen || undefined
            }
          : ap
      )
    }));
    setEditAnsprechpartnerId(null);
    setNeuerAnsprechpartner({ name: '', rolle: '', telefon: '', email: '', notizen: '' });
  };

  const handleAnsprechpartnerLoeschen = (id: string) => {
    setFormData(prev => {
      const gefiltert = prev.ansprechpartner.filter(ap => ap.id !== id);
      // Falls gelöschter Hauptkontakt war, ersten zum neuen Hauptkontakt machen
      if (gefiltert.length > 0 && !gefiltert.some(ap => ap.istHauptkontakt)) {
        gefiltert[0].istHauptkontakt = true;
      }
      return { ...prev, ansprechpartner: gefiltert };
    });
    if (editAnsprechpartnerId === id) {
      setEditAnsprechpartnerId(null);
      setNeuerAnsprechpartner({ name: '', rolle: '', telefon: '', email: '', notizen: '' });
    }
  };

  const handleHauptkontaktSetzen = (id: string) => {
    setFormData(prev => ({
      ...prev,
      ansprechpartner: prev.ansprechpartner.map(ap => ({
        ...ap,
        istHauptkontakt: ap.id === id
      }))
    }));
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Fachplaner wirklich löschen?')) {
      onUpdate({ ...projekt, fachplaner: projekt.fachplaner.filter(fp => fp.id !== id) });
    }
  };

  const handleRechnungHinzufuegen = (fachplanerId: string) => {
    setAktiverFachplanerId(fachplanerId);
    setEditRechnung(null);
    setRechnungForm({
      rechnungsnummer: '',
      datum: '',
      betragNetto: 0,
      typ: 'teilrechnung',
      geprueftDatum: '',
      bezahltDatum: '',
      info: ''
    });
    setZeigeRechnungModal(true);
  };

  const handleRechnungEdit = (fachplanerId: string, rechnung: Rechnung) => {
    setAktiverFachplanerId(fachplanerId);
    setEditRechnung(rechnung);
    setRechnungForm({
      rechnungsnummer: rechnung.rechnungsnummer,
      datum: rechnung.datum,
      betragNetto: rechnung.betragNetto,
      typ: rechnung.typ,
      geprueftDatum: rechnung.geprueftDatum || '',
      bezahltDatum: rechnung.bezahltDatum || '',
      info: rechnung.info || ''
    });
    setZeigeRechnungModal(true);
  };

  const handleRechnungSave = () => {
    if (!aktiverFachplanerId) return;

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
      info: rechnungForm.info || undefined
    };

    const aktualisiert = projekt.fachplaner.map(fp => {
      if (fp.id !== aktiverFachplanerId) return fp;
      if (editRechnung) {
        return { ...fp, rechnungen: fp.rechnungen.map(r => r.id === editRechnung.id ? rechnungData : r) };
      } else {
        return { ...fp, rechnungen: [...fp.rechnungen, rechnungData] };
      }
    });
    onUpdate({ ...projekt, fachplaner: aktualisiert });
    setZeigeRechnungModal(false);
  };

  const handleRechnungDelete = (fachplanerId: string, rechnungId: string) => {
    if (!window.confirm('Rechnung wirklich löschen?')) return;
    const aktualisiert = projekt.fachplaner.map(fp => {
      if (fp.id !== fachplanerId) return fp;
      return { ...fp, rechnungen: fp.rechnungen.filter(r => r.id !== rechnungId) };
    });
    onUpdate({ ...projekt, fachplaner: aktualisiert });
  };

  // Angebot Funktionen
  const handleAngebotHinzufuegen = (fachplanerId: string, istNachtrag: boolean) => {
    setAktiverFachplanerId(fachplanerId);
    const fp = projekt.fachplaner.find(f => f.id === fachplanerId);
    const nextNr = (fp?.angebote.length || 0) + 1;

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

  const handleAngebotEdit = (fachplanerId: string, angebot: Angebot) => {
    setAktiverFachplanerId(fachplanerId);
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
    if (!aktiverFachplanerId) return;

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

    const aktualisiert = projekt.fachplaner.map(fp => {
      if (fp.id !== aktiverFachplanerId) return fp;

      if (editAngebot) {
        return { ...fp, angebote: fp.angebote.map(a => a.id === editAngebot.id ? neuesAngebot : a) };
      } else {
        return { ...fp, angebote: [...fp.angebote, neuesAngebot] };
      }
    });

    onUpdate({ ...projekt, fachplaner: aktualisiert });
    setZeigeAngebotModal(false);
  };

  const handleAngebotStatusChange = (fachplanerId: string, angebotId: string, neuerStatus: AngebotStatus) => {
    const aktualisiert = projekt.fachplaner.map(fp => {
      if (fp.id !== fachplanerId) return fp;
      return {
        ...fp,
        angebote: fp.angebote.map(a => {
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
    onUpdate({ ...projekt, fachplaner: aktualisiert });
  };

  const handleAngebotDelete = (fachplanerId: string, angebotId: string) => {
    if (!window.confirm('Angebot wirklich löschen?')) return;

    const aktualisiert = projekt.fachplaner.map(fp => {
      if (fp.id !== fachplanerId) return fp;
      return { ...fp, angebote: fp.angebote.filter(a => a.id !== angebotId) };
    });
    onUpdate({ ...projekt, fachplaner: aktualisiert });
  };

  // Abnahme Funktionen
  const handleAbnahmeHinzufuegen = (fachplanerId: string) => {
    setAktiverFachplanerId(fachplanerId);
    setEditAbnahme(null);
    setAbnahmeForm({
      abnahmeart: 'teilabnahme',
      termin: '',
      leistungen: '',
      maengelIds: []
    });
    setZeigeAbnahmeModal(true);
  };

  const handleAbnahmeEdit = (fachplanerId: string, abnahme: FachplanerAbnahme) => {
    setAktiverFachplanerId(fachplanerId);
    setEditAbnahme(abnahme);
    setAbnahmeForm({
      abnahmeart: abnahme.abnahmeart,
      termin: abnahme.termin,
      leistungen: abnahme.leistungen || '',
      maengelIds: abnahme.maengelIds || []
    });
    setZeigeAbnahmeModal(true);
  };

  const handleAbnahmeSave = () => {
    if (!aktiverFachplanerId) return;

    const abnahmeData: FachplanerAbnahme = {
      id: editAbnahme?.id || generateId(),
      abnahmeart: abnahmeForm.abnahmeart,
      termin: abnahmeForm.termin,
      leistungen: abnahmeForm.leistungen || undefined,
      maengelIds: abnahmeForm.maengelIds
    };

    const aktualisiert = projekt.fachplaner.map(fp => {
      if (fp.id !== aktiverFachplanerId) return fp;
      const abnahmen = fp.abnahmen || [];
      if (editAbnahme) {
        return { ...fp, abnahmen: abnahmen.map(a => a.id === editAbnahme.id ? abnahmeData : a) };
      } else {
        return { ...fp, abnahmen: [...abnahmen, abnahmeData] };
      }
    });
    onUpdate({ ...projekt, fachplaner: aktualisiert });
    setZeigeAbnahmeModal(false);
  };

  const handleAbnahmeDelete = (fachplanerId: string, abnahmeId: string) => {
    if (!window.confirm('Abnahme wirklich löschen?')) return;
    const aktualisiert = projekt.fachplaner.map(fp => {
      if (fp.id !== fachplanerId) return fp;
      return { ...fp, abnahmen: (fp.abnahmen || []).filter(a => a.id !== abnahmeId) };
    });
    onUpdate({ ...projekt, fachplaner: aktualisiert });
  };

  // Prüft ob ein Mangel bereits einer anderen Firma zugeordnet ist
  const findeMangelZuordnung = (mangelId: string): string | null => {
    // Prüfe alle Fachplaner-Abnahmen (außer der aktuellen)
    for (const fp of projekt.fachplaner) {
      if (fp.id === aktiverFachplanerId) continue; // Aktuelle Firma überspringen
      for (const abnahme of (fp.abnahmen || [])) {
        if (abnahme.maengelIds.includes(mangelId)) {
          return `Fachplaner "${fp.firma}"`;
        }
      }
    }
    // Prüfe alle Fachfirmen-Abnahmen
    for (const ff of projekt.fachfirmen) {
      for (const abnahme of (ff.abnahmen || [])) {
        if (abnahme.maengelIds.includes(mangelId)) {
          return `Fachfirma "${ff.firma}"`;
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
        `Mangel #${mangel?.mangelnummer} ist bereits ${zuordnung} zugeordnet.\n\nTrotzdem diesem Fachplaner zuordnen?`
      );
      if (!bestaetigt) return;
    }

    setAbnahmeForm(prev => ({
      ...prev,
      maengelIds: [...prev.maengelIds, mangelId]
    }));
  };

  // Budget aus freigegebenen Angeboten + Nachträgen berechnen
  const berechneEffektivesBudget = (fp: Fachplaner): number => {
    const summeFreigegebeneHauptangebote = fp.angebote
      .filter(a => !a.istNachtrag && (a.freigabestatus === 'freigegeben' || a.freigabestatus === 'beauftragt'))
      .reduce((sum, a) => sum + a.betragNetto, 0);
    const summeBeauftragteNachtraege = fp.angebote
      .filter(a => a.istNachtrag && a.freigabestatus === 'beauftragt')
      .reduce((sum, a) => sum + a.betragNetto, 0);
    return summeFreigegebeneHauptangebote + summeBeauftragteNachtraege;
  };

  const berechneAuslastung = (fp: Fachplaner) => {
    const summeRechnungen = fp.rechnungen.reduce((sum, r) => sum + r.betragNetto, 0);
    const effektivesBudget = berechneEffektivesBudget(fp);
    if (effektivesBudget === 0) return 0;
    return (summeRechnungen / effektivesBudget) * 100;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Fachplaner</h2>
        <button onClick={handleNeu} className="btn-primary">
          + Fachplaner hinzufügen
        </button>
      </div>

      {projekt.fachplaner.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-apleona-gray-500">Noch keine Fachplaner angelegt.</p>
          <button onClick={handleNeu} className="btn-primary mt-4">
            Ersten Fachplaner anlegen
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {projekt.fachplaner.map(fp => {
            const auslastung = berechneAuslastung(fp);
            const effektivesBudget = berechneEffektivesBudget(fp);
            const gewerk = projekt.gewerke.find(g => g.id === fp.gewerkId);
            const summeRechnungen = fp.rechnungen.reduce((s, r) => s + r.betragNetto, 0);
            const summeBeauftragteNachtraege = fp.angebote
              .filter(a => a.istNachtrag && a.freigabestatus === 'beauftragt')
              .reduce((s, a) => s + a.betragNetto, 0);

            return (
              <div key={fp.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="font-semibold text-lg">{fp.firma}</h3>
                      {auslastung > 100 && (
                        <span className="ml-2 badge-danger">Budget überschritten!</span>
                      )}
                      {auslastung > 80 && auslastung <= 100 && (
                        <span className="ml-2 badge-warning">Warnung: &gt;80% Budget</span>
                      )}
                    </div>
                    <p className="text-sm text-apleona-gray-600">{fp.name}</p>
                    {gewerk && (
                      <span className="badge-info mt-1">{gewerk.dinNummer} - {gewerk.bezeichnung}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-apleona-gray-500">Eff. Budget</p>
                      <p className="font-semibold">{formatWaehrung(effektivesBudget)}</p>
                      {summeBeauftragteNachtraege > 0 && (
                        <p className="text-xs text-amber-600">+{formatWaehrung(summeBeauftragteNachtraege)} NT</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-apleona-gray-500">Rechnungen</p>
                      <p className="font-semibold">{formatWaehrung(summeRechnungen)}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setExpandedId(expandedId === fp.id ? null : fp.id)}
                        className="text-apleona-navy"
                      >
                        <svg className={`w-5 h-5 transform ${expandedId === fp.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button onClick={() => handleEdit(fp)} className="text-apleona-navy hover:text-apleona-navy-dark">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(fp.id)} className="text-apleona-red hover:text-apleona-red-dark">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Budget-Fortschrittsbalken */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-apleona-gray-600 mb-1">
                    <span>Budgetauslastung</span>
                    <span>{auslastung.toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${
                        auslastung > 100 ? 'bg-status-red' :
                        auslastung > 80 ? 'bg-status-yellow' : 'bg-status-green'
                      }`}
                      style={{ width: `${Math.min(auslastung, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Erweiterte Ansicht */}
                {expandedId === fp.id && (
                  <div className="mt-6 border-t border-apleona-gray-200 pt-4 space-y-6">

                    {/* Angebote */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">Angebote</h4>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAngebotHinzufuegen(fp.id, false)}
                            className="btn-secondary text-sm"
                          >
                            + Hauptangebot
                          </button>
                          <button
                            onClick={() => handleAngebotHinzufuegen(fp.id, true)}
                            className="px-3 py-1 text-sm rounded bg-amber-100 hover:bg-amber-200 text-amber-800"
                          >
                            + Nachtrag
                          </button>
                        </div>
                      </div>

                      {fp.angebote.length === 0 ? (
                        <p className="text-apleona-gray-500 text-sm">Keine Angebote vorhanden</p>
                      ) : (
                        <div className="space-y-4">
                          {/* Hauptangebote */}
                          {fp.angebote.filter(a => !a.istNachtrag).length > 0 && (
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
                                  {fp.angebote.filter(a => !a.istNachtrag).map(angebot => (
                                    <tr key={angebot.id}>
                                      <td className="px-3 py-2 text-sm">{angebot.angebotsnummer}</td>
                                      <td className="px-3 py-2 text-sm">{formatDatum(angebot.datum)}</td>
                                      <td className="px-3 py-2 text-sm max-w-xs truncate" title={angebot.beschreibung}>{angebot.beschreibung}</td>
                                      <td className="px-3 py-2 text-sm text-right font-medium">{formatWaehrung(angebot.betragNetto)}</td>
                                      <td className="px-3 py-2 text-center">
                                        <select
                                          value={angebot.freigabestatus}
                                          onChange={e => handleAngebotStatusChange(fp.id, angebot.id, e.target.value as AngebotStatus)}
                                          className={`text-xs px-2 py-1 rounded border-0 ${AngebotStatusColors[angebot.freigabestatus]}`}
                                        >
                                          {Object.entries(AngebotStatusLabels).map(([k, v]) => (
                                            <option key={k} value={k}>{v}</option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <div className="flex justify-center space-x-2">
                                          <button onClick={() => handleAngebotEdit(fp.id, angebot)} className="text-apleona-navy hover:text-apleona-navy-dark">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                          <button onClick={() => handleAngebotDelete(fp.id, angebot.id)} className="text-apleona-red hover:text-apleona-red-dark">
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
                          {fp.angebote.filter(a => a.istNachtrag).length > 0 && (
                            <div className="bg-amber-50 rounded-lg p-3">
                              <h5 className="text-sm font-medium text-amber-800 mb-2">
                                Nachträge
                                <span className="ml-2 text-xs font-normal">
                                  (Summe beauftragt: {formatWaehrung(
                                    fp.angebote
                                      .filter(a => a.istNachtrag && a.freigabestatus === 'beauftragt')
                                      .reduce((s, a) => s + a.betragNetto, 0)
                                  )})
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
                                  {fp.angebote.filter(a => a.istNachtrag).map(angebot => (
                                    <tr key={angebot.id}>
                                      <td className="px-3 py-2 text-sm">{angebot.angebotsnummer}</td>
                                      <td className="px-3 py-2 text-sm">{formatDatum(angebot.datum)}</td>
                                      <td className="px-3 py-2 text-sm max-w-xs truncate" title={angebot.beschreibung}>{angebot.beschreibung}</td>
                                      <td className="px-3 py-2 text-sm text-right font-medium">{formatWaehrung(angebot.betragNetto)}</td>
                                      <td className="px-3 py-2 text-center">
                                        <select
                                          value={angebot.freigabestatus}
                                          onChange={e => handleAngebotStatusChange(fp.id, angebot.id, e.target.value as AngebotStatus)}
                                          className={`text-xs px-2 py-1 rounded border-0 ${AngebotStatusColors[angebot.freigabestatus]}`}
                                        >
                                          {Object.entries(AngebotStatusLabels).map(([k, v]) => (
                                            <option key={k} value={k}>{v}</option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <div className="flex justify-center space-x-2">
                                          <button onClick={() => handleAngebotEdit(fp.id, angebot)} className="text-apleona-navy hover:text-apleona-navy-dark">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                          <button onClick={() => handleAngebotDelete(fp.id, angebot.id)} className="text-apleona-red hover:text-apleona-red-dark">
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

                    {/* Rechnungen */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">Rechnungen</h4>
                        <button
                          onClick={() => handleRechnungHinzufuegen(fp.id)}
                          className="btn-secondary text-sm"
                        >
                          + Rechnung
                        </button>
                      </div>

                      {fp.rechnungen.length === 0 ? (
                        <p className="text-apleona-gray-500 text-sm">Keine Rechnungen vorhanden</p>
                      ) : (
                        <table className="min-w-full divide-y divide-apleona-gray-200">
                          <thead className="bg-apleona-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Re-Nr.</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Re-Datum</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Rechnungsart</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-apleona-gray-500">Zahlbetrag (€ netto)</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-apleona-gray-500">Geprüft</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-apleona-gray-500">Bezahlt</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-apleona-gray-500">Info</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-apleona-gray-500">Aktionen</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-apleona-gray-200">
                            {fp.rechnungen.map(r => (
                              <tr key={r.id} className={r.typ === 'schlussrechnung' ? 'bg-amber-50' : ''}>
                                <td className="px-3 py-2 text-sm">
                                  <button
                                    onClick={() => handleRechnungEdit(fp.id, r)}
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
                                <td className="px-3 py-2 text-sm text-right font-medium">
                                  {formatWaehrung(r.betragNetto)}
                                </td>
                                <td className="px-3 py-2 text-center text-sm">
                                  {r.geprueftDatum ? formatDatum(r.geprueftDatum) : '-'}
                                </td>
                                <td className="px-3 py-2 text-center text-sm">
                                  {r.bezahltDatum ? formatDatum(r.bezahltDatum) : '-'}
                                </td>
                                <td className="px-3 py-2 text-sm text-apleona-gray-600 max-w-xs truncate" title={r.info}>
                                  {r.info || '-'}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <div className="flex justify-center space-x-2">
                                    <button onClick={() => handleRechnungEdit(fp.id, r)} className="text-apleona-navy hover:text-apleona-navy-dark">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button onClick={() => handleRechnungDelete(fp.id, r.id)} className="text-apleona-red hover:text-apleona-red-dark">
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
                          onClick={() => handleAbnahmeHinzufuegen(fp.id)}
                          className="btn-secondary text-sm"
                        >
                          + Abnahme
                        </button>
                      </div>

                      {(!fp.abnahmen || fp.abnahmen.length === 0) ? (
                        <p className="text-apleona-gray-500 text-sm">Keine Abnahmen vorhanden</p>
                      ) : (
                        <div className="space-y-3">
                          {fp.abnahmen.map(abnahme => {
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
                                    <button onClick={() => handleAbnahmeEdit(fp.id, abnahme)} className="text-apleona-navy hover:text-apleona-navy-dark">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button onClick={() => handleAbnahmeDelete(fp.id, abnahme.id)} className="text-apleona-red hover:text-apleona-red-dark">
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

                      {/* Firmenkontakt */}
                      {(fp.kontakt.telefon || fp.kontakt.email) && (
                        <div className="mb-3 text-sm text-apleona-gray-600">
                          <span className="font-medium">Firma: </span>
                          {fp.kontakt.telefon && <span className="mr-4">Tel: {fp.kontakt.telefon}</span>}
                          {fp.kontakt.email && <span>E-Mail: {fp.kontakt.email}</span>}
                        </div>
                      )}

                      {/* Ansprechpartner */}
                      {fp.ansprechpartner && fp.ansprechpartner.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {fp.ansprechpartner.map(ap => (
                            <div
                              key={ap.id}
                              className={`p-2 rounded text-sm ${ap.istHauptkontakt ? 'bg-green-50 border border-green-200' : 'bg-apleona-gray-50'}`}
                            >
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{ap.name}</span>
                                {ap.rolle && <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">{ap.rolle}</span>}
                                {ap.istHauptkontakt && <span className="text-xs px-1.5 py-0.5 bg-green-200 text-green-800 rounded">Hauptkontakt</span>}
                              </div>
                              <div className="text-apleona-gray-600 mt-1">
                                {ap.telefon && <span className="mr-3">Tel: {ap.telefon}</span>}
                                {ap.email && <span>E-Mail: {ap.email}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-apleona-gray-500">Keine Ansprechpartner hinterlegt</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fachplaner Modal */}
      {zeigeModal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setZeigeModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">
              {editFachplaner ? 'Fachplaner bearbeiten' : 'Neuer Fachplaner'}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Firma</label>
                  <input
                    type="text"
                    value={formData.firma}
                    onChange={e => setFormData({ ...formData, firma: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Name / Bezeichnung</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="label">Zugeordnetes Gewerk</label>
                <select
                  value={formData.gewerkId}
                  onChange={e => setFormData({ ...formData, gewerkId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Kein Gewerk zugeordnet</option>
                  {projekt.gewerke.map(g => (
                    <option key={g.id} value={g.id}>{g.dinNummer} - {g.bezeichnung}</option>
                  ))}
                </select>
              </div>

              {/* Firmenkontakt (Zentrale) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Telefon (Zentrale)</label>
                  <input
                    type="tel"
                    value={formData.telefon}
                    onChange={e => setFormData({ ...formData, telefon: e.target.value })}
                    className="input-field"
                    placeholder="Telefon der Firma"
                  />
                </div>
                <div>
                  <label className="label">E-Mail (Zentrale)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    placeholder="E-Mail der Firma"
                  />
                </div>
              </div>

              {/* Ansprechpartner-Verwaltung */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Ansprechpartner</h3>

                {/* Liste der Ansprechpartner */}
                {formData.ansprechpartner.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {formData.ansprechpartner.map(ap => (
                      <div
                        key={ap.id}
                        className={`p-3 rounded-lg border ${ap.istHauptkontakt ? 'bg-green-50 border-green-200' : 'bg-apleona-gray-50 border-apleona-gray-200'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{ap.name}</span>
                              {ap.rolle && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">{ap.rolle}</span>}
                              {ap.istHauptkontakt && <span className="text-xs px-2 py-0.5 bg-green-200 text-green-800 rounded">Hauptkontakt</span>}
                            </div>
                            <div className="text-sm text-apleona-gray-600 mt-1 space-x-4">
                              {ap.telefon && <span>Tel: {ap.telefon}</span>}
                              {ap.email && <span>E-Mail: {ap.email}</span>}
                            </div>
                            {ap.notizen && <p className="text-xs text-apleona-gray-500 mt-1">{ap.notizen}</p>}
                          </div>
                          <div className="flex space-x-1">
                            {!ap.istHauptkontakt && (
                              <button
                                type="button"
                                onClick={() => handleHauptkontaktSetzen(ap.id)}
                                className="p-1 text-green-600 hover:bg-green-100 rounded"
                                title="Als Hauptkontakt setzen"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleAnsprechpartnerBearbeiten(ap)}
                              className="p-1 text-apleona-navy hover:bg-blue-100 rounded"
                              title="Bearbeiten"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAnsprechpartnerLoeschen(ap.id)}
                              className="p-1 text-apleona-red hover:bg-red-100 rounded"
                              title="Löschen"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formular für neuen/bearbeiteten Ansprechpartner */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">
                    {editAnsprechpartnerId ? 'Ansprechpartner bearbeiten' : 'Neuer Ansprechpartner'}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Name *</label>
                      <input
                        type="text"
                        value={neuerAnsprechpartner.name}
                        onChange={e => setNeuerAnsprechpartner({ ...neuerAnsprechpartner, name: e.target.value })}
                        className="input-field text-sm"
                        placeholder="Name des Ansprechpartners"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Rolle</label>
                      <input
                        type="text"
                        value={neuerAnsprechpartner.rolle}
                        onChange={e => setNeuerAnsprechpartner({ ...neuerAnsprechpartner, rolle: e.target.value })}
                        className="input-field text-sm"
                        placeholder="z.B. Projektleiter, Bauleiter"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Telefon</label>
                      <input
                        type="tel"
                        value={neuerAnsprechpartner.telefon}
                        onChange={e => setNeuerAnsprechpartner({ ...neuerAnsprechpartner, telefon: e.target.value })}
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">E-Mail</label>
                      <input
                        type="email"
                        value={neuerAnsprechpartner.email}
                        onChange={e => setNeuerAnsprechpartner({ ...neuerAnsprechpartner, email: e.target.value })}
                        className="input-field text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="label text-xs">Notizen</label>
                    <input
                      type="text"
                      value={neuerAnsprechpartner.notizen}
                      onChange={e => setNeuerAnsprechpartner({ ...neuerAnsprechpartner, notizen: e.target.value })}
                      className="input-field text-sm"
                      placeholder="Zusätzliche Informationen..."
                    />
                  </div>
                  <div className="mt-3 flex space-x-2">
                    {editAnsprechpartnerId ? (
                      <>
                        <button
                          type="button"
                          onClick={handleAnsprechpartnerSpeichern}
                          disabled={!neuerAnsprechpartner.name.trim()}
                          className="btn-primary text-sm disabled:opacity-50"
                        >
                          Speichern
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditAnsprechpartnerId(null);
                            setNeuerAnsprechpartner({ name: '', rolle: '', telefon: '', email: '', notizen: '' });
                          }}
                          className="btn-secondary text-sm"
                        >
                          Abbrechen
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleAnsprechpartnerHinzufuegen}
                        disabled={!neuerAnsprechpartner.name.trim()}
                        className="btn-secondary text-sm disabled:opacity-50"
                      >
                        + Hinzufügen
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                <strong>Hinweis:</strong> Das Budget wird automatisch aus den freigegebenen Hauptangeboten und beauftragten Nachträgen berechnet.
              </div>

              <div>
                <label className="label">Notizen</label>
                <textarea
                  value={formData.notizen}
                  onChange={e => setFormData({ ...formData, notizen: e.target.value })}
                  className="input-field"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setZeigeModal(false)} className="btn-secondary">Abbrechen</button>
              <button
                onClick={handleSave}
                disabled={!formData.firma || !formData.name}
                className="btn-primary disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rechnung Modal */}
      {zeigeRechnungModal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setZeigeRechnungModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">{editRechnung ? 'Rechnung bearbeiten' : 'Neue Rechnung'}</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Re-Nr.</label>
                  <input
                    type="text"
                    value={rechnungForm.rechnungsnummer}
                    onChange={e => setRechnungForm({ ...rechnungForm, rechnungsnummer: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Re-Datum</label>
                  <input
                    type="date"
                    value={rechnungForm.datum}
                    onChange={e => setRechnungForm({ ...rechnungForm, datum: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Zahlbetrag netto (EUR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rechnungForm.betragNetto}
                    onChange={e => setRechnungForm({ ...rechnungForm, betragNetto: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Rechnungsart</label>
                  <select
                    value={rechnungForm.typ}
                    onChange={e => setRechnungForm({ ...rechnungForm, typ: e.target.value as RechnungsTyp })}
                    className="input-field"
                  >
                    <option value="anzahlung">Anzahlung</option>
                    <option value="teilrechnung">Abschlagrechnung</option>
                    <option value="schlussrechnung">Schlussrechnung</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Geprüft (Datum)</label>
                  <input
                    type="date"
                    value={rechnungForm.geprueftDatum}
                    onChange={e => setRechnungForm({ ...rechnungForm, geprueftDatum: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Bezahlt (Datum)</label>
                  <input
                    type="date"
                    value={rechnungForm.bezahltDatum}
                    onChange={e => setRechnungForm({ ...rechnungForm, bezahltDatum: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="label">Info</label>
                <textarea
                  value={rechnungForm.info}
                  onChange={e => setRechnungForm({ ...rechnungForm, info: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder="Zusätzliche Informationen zur Rechnung..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setZeigeRechnungModal(false)} className="btn-secondary">Abbrechen</button>
              <button
                onClick={handleRechnungSave}
                disabled={!rechnungForm.rechnungsnummer || !rechnungForm.datum}
                className="btn-primary disabled:opacity-50"
              >
                Speichern
              </button>
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
                  <strong>Hinweis:</strong> Beauftragte Nachträge erhöhen automatisch das effektive Budget.
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

export default TabFachplaner;
