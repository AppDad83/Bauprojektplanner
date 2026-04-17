'use client';

import React, { useState } from 'react';
import { Projekt, Stakeholder, StakeholderKategorie, Fachplaner, Fachfirma, Ansprechpartner } from '@/types';
import { generateId } from '@/lib/utils';

interface Props {
  projekt: Projekt;
  onUpdate: (projekt: Projekt) => void;
}

// Alle Kategorien inkl. Fachplaner/Fachfirmen (für Anzeige)
const AlleKategorien = [
  'bauherr',
  'gebaeudeverwaltung',
  'fachplaner',
  'fachfirma',
  'sachverstaendiger',
  'behoerde',
  'mieter',
  'sonstige'
] as const;

type AlleKategorienTyp = typeof AlleKategorien[number];

// Labels für Kategorien
const KategorieLabels: Record<AlleKategorienTyp, string> = {
  bauherr: 'Bauherr',
  gebaeudeverwaltung: 'Gebäudeverwaltung',
  fachplaner: 'Fachplaner',
  fachfirma: 'Fachfirmen',
  sachverstaendiger: 'Sachverständige',
  behoerde: 'Behörden',
  mieter: 'Mieter',
  sonstige: 'Sonstige'
};

// Farben für Kategorien
const KategorieFarben: Record<AlleKategorienTyp, string> = {
  bauherr: 'bg-blue-500',
  gebaeudeverwaltung: 'bg-purple-500',
  fachplaner: 'bg-apleona-navy',
  fachfirma: 'bg-green-500',
  sachverstaendiger: 'bg-yellow-500',
  behoerde: 'bg-red-500',
  mieter: 'bg-orange-500',
  sonstige: 'bg-gray-500'
};

// Editierbare Kategorien (ohne fachplaner/fachfirma)
const EditierbareKategorien: StakeholderKategorie[] = [
  'bauherr',
  'gebaeudeverwaltung',
  'sachverstaendiger',
  'behoerde',
  'mieter',
  'sonstige'
];

// Hilfs-Typ für Stakeholder aus Fachplaner/Fachfirmen
interface VirtuellerStakeholder {
  id: string;
  name: string;
  firma: string;
  rolle: string;
  telefon?: string;
  email?: string;
  istReadOnly: true;
  quelleTyp: 'fachplaner' | 'fachfirma';
  quelleId: string; // ID des Fachplaners/Fachfirma
}

const TabStakeholder: React.FC<Props> = ({ projekt, onUpdate }) => {
  const [zeigeModal, setZeigeModal] = useState(false);
  const [editStakeholder, setEditStakeholder] = useState<Stakeholder | null>(null);
  const [formData, setFormData] = useState<Omit<Stakeholder, 'id'>>({
    name: '',
    firma: '',
    rolle: '',
    telefon: '',
    email: '',
    kategorie: 'sonstige'
  });

  // Migration: alte Stakeholder mit "typ" auf "kategorie" umstellen
  const migrierteStakeholder = projekt.stakeholder.map(s => {
    if ('typ' in s && !('kategorie' in s)) {
      const { typ, ...rest } = s as Stakeholder & { typ?: string };
      return { ...rest, kategorie: 'sonstige' as StakeholderKategorie };
    }
    return s;
  });

  // Fachplaner-Ansprechpartner als virtuelle Stakeholder
  const fachplanerAlsStakeholder: VirtuellerStakeholder[] = projekt.fachplaner.flatMap(fp => {
    // Wenn Ansprechpartner vorhanden, diese verwenden
    if (fp.ansprechpartner && fp.ansprechpartner.length > 0) {
      return fp.ansprechpartner.map(ap => ({
        id: `fp-${fp.id}-${ap.id}`,
        name: ap.name,
        firma: fp.firma,
        rolle: ap.rolle || 'Fachplaner',
        telefon: ap.telefon || fp.kontakt.telefon,
        email: ap.email || fp.kontakt.email,
        istReadOnly: true as const,
        quelleTyp: 'fachplaner' as const,
        quelleId: fp.id
      }));
    }
    // Fallback: Legacy-Ansprechpartner oder Firmenname
    return [{
      id: `fp-${fp.id}`,
      name: fp.kontakt.ansprechpartner || fp.name,
      firma: fp.firma,
      rolle: 'Fachplaner',
      telefon: fp.kontakt.telefon,
      email: fp.kontakt.email,
      istReadOnly: true as const,
      quelleTyp: 'fachplaner' as const,
      quelleId: fp.id
    }];
  });

  // Fachfirmen-Ansprechpartner als virtuelle Stakeholder
  const fachfirmenAlsStakeholder: VirtuellerStakeholder[] = projekt.fachfirmen.flatMap(ff => {
    // Wenn Ansprechpartner vorhanden, diese verwenden
    if (ff.ansprechpartner && ff.ansprechpartner.length > 0) {
      return ff.ansprechpartner.map(ap => ({
        id: `ff-${ff.id}-${ap.id}`,
        name: ap.name,
        firma: ff.firma,
        rolle: ap.rolle || 'Fachfirma',
        telefon: ap.telefon || ff.kontakt.telefon,
        email: ap.email || ff.kontakt.email,
        istReadOnly: true as const,
        quelleTyp: 'fachfirma' as const,
        quelleId: ff.id
      }));
    }
    // Fallback: Legacy-Ansprechpartner oder Firmenname
    return [{
      id: `ff-${ff.id}`,
      name: ff.kontakt.ansprechpartner || ff.name,
      firma: ff.firma,
      rolle: 'Fachfirma',
      telefon: ff.kontakt.telefon,
      email: ff.kontakt.email,
      istReadOnly: true as const,
      quelleTyp: 'fachfirma' as const,
      quelleId: ff.id
    }];
  });

  // Stakeholder nach Kategorie gruppieren
  const stakeholderNachKategorie = (kategorie: AlleKategorienTyp): (Stakeholder | VirtuellerStakeholder)[] => {
    if (kategorie === 'fachplaner') {
      return fachplanerAlsStakeholder;
    }
    if (kategorie === 'fachfirma') {
      return fachfirmenAlsStakeholder;
    }
    return migrierteStakeholder.filter(s => s.kategorie === kategorie);
  };

  const handleNeu = () => {
    setEditStakeholder(null);
    setFormData({ name: '', firma: '', rolle: '', telefon: '', email: '', kategorie: 'sonstige' });
    setZeigeModal(true);
  };

  const handleEdit = (s: Stakeholder) => {
    setEditStakeholder(s);
    setFormData({
      name: s.name,
      firma: s.firma,
      rolle: s.rolle,
      telefon: s.telefon || '',
      email: s.email || '',
      kategorie: s.kategorie
    });
    setZeigeModal(true);
  };

  const handleSave = () => {
    if (editStakeholder) {
      const aktualisiert = migrierteStakeholder.map(s =>
        s.id === editStakeholder.id ? { ...s, ...formData } : s
      );
      onUpdate({ ...projekt, stakeholder: aktualisiert });
    } else {
      const neu: Stakeholder = {
        id: generateId(),
        ...formData
      };
      onUpdate({ ...projekt, stakeholder: [...migrierteStakeholder, neu] });
    }
    setZeigeModal(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Stakeholder wirklich löschen?')) {
      onUpdate({
        ...projekt,
        stakeholder: migrierteStakeholder.filter(s => s.id !== id)
      });
    }
  };

  // Prüfen ob Stakeholder editierbar ist (nicht read-only)
  const istEditierbar = (s: Stakeholder | VirtuellerStakeholder): s is Stakeholder => {
    return !('istReadOnly' in s && s.istReadOnly);
  };

  // Gesamtanzahl aller Stakeholder
  const gesamtAnzahl = migrierteStakeholder.length + fachplanerAlsStakeholder.length + fachfirmenAlsStakeholder.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Projektbeteiligte (Stakeholder)</h2>
        <button onClick={handleNeu} className="btn-primary">
          + Stakeholder hinzufügen
        </button>
      </div>

      {gesamtAnzahl === 0 ? (
        <div className="card text-center py-12">
          <p className="text-apleona-gray-500">Noch keine Stakeholder angelegt.</p>
          <button onClick={handleNeu} className="btn-primary mt-4">
            Ersten Stakeholder anlegen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {AlleKategorien.map(kategorie => {
            const stakeholder = stakeholderNachKategorie(kategorie);
            const istAutoKategorie = kategorie === 'fachplaner' || kategorie === 'fachfirma';

            return (
              <div key={kategorie} className="card">
                <h3 className="font-semibold text-apleona-gray-900 mb-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`w-3 h-3 ${KategorieFarben[kategorie]} rounded-full mr-2`}></span>
                    {KategorieLabels[kategorie]} ({stakeholder.length})
                  </div>
                  {istAutoKategorie && stakeholder.length > 0 && (
                    <span className="text-xs text-apleona-gray-400" title="Read-only - aus Fachplaner/Fachfirmen-Tab">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                  )}
                </h3>

                {stakeholder.length === 0 ? (
                  <p className="text-apleona-gray-400 text-sm italic">
                    {istAutoKategorie
                      ? `Keine ${KategorieLabels[kategorie]} im Projekt`
                      : 'Keine Einträge'}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {stakeholder.map(s => (
                      <div
                        key={s.id}
                        className={`border border-apleona-gray-200 rounded-lg p-2 text-sm ${istAutoKategorie ? 'bg-apleona-gray-50' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{s.name}</p>
                            <p className="text-apleona-gray-600 truncate">{s.firma}</p>
                            {s.rolle && <p className="text-apleona-gray-500 truncate">{s.rolle}</p>}
                            {s.telefon && <p className="text-apleona-gray-500 truncate">{s.telefon}</p>}
                            {s.email && (
                              <a
                                href={`mailto:${s.email}`}
                                className="text-apleona-navy hover:underline truncate block"
                              >
                                {s.email}
                              </a>
                            )}
                          </div>
                          {istEditierbar(s) && (
                            <div className="flex space-x-1 ml-2 flex-shrink-0">
                              <button
                                onClick={() => handleEdit(s)}
                                className="text-apleona-navy hover:text-apleona-navy-dark p-1"
                                title="Bearbeiten"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(s.id)}
                                className="text-apleona-red hover:text-apleona-red-dark p-1"
                                title="Löschen"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {zeigeModal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setZeigeModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">
              {editStakeholder ? 'Stakeholder bearbeiten' : 'Neuer Stakeholder'}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Firma</label>
                  <input
                    type="text"
                    value={formData.firma}
                    onChange={e => setFormData({ ...formData, firma: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Rolle</label>
                  <input
                    type="text"
                    value={formData.rolle}
                    onChange={e => setFormData({ ...formData, rolle: e.target.value })}
                    className="input-field"
                    placeholder="z.B. Projektleiter, Architekt"
                  />
                </div>
                <div>
                  <label className="label">Kategorie</label>
                  <select
                    value={formData.kategorie}
                    onChange={e => setFormData({ ...formData, kategorie: e.target.value as StakeholderKategorie })}
                    className="input-field font-sans"
                  >
                    {EditierbareKategorien.map(kat => (
                      <option key={kat} value={kat} className="font-sans">{KategorieLabels[kat]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Telefon</label>
                  <input
                    type="tel"
                    value={formData.telefon}
                    onChange={e => setFormData({ ...formData, telefon: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">E-Mail</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setZeigeModal(false)} className="btn-secondary">
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name || !formData.firma || !formData.rolle}
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

export default TabStakeholder;
