'use client';

import React, { useState } from 'react';
import { Projekt, Stakeholder, StakeholderTyp } from '@/types';
import { generateId } from '@/lib/utils';

interface Props {
  projekt: Projekt;
  onUpdate: (projekt: Projekt) => void;
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
    typ: 'extern'
  });

  const handleNeu = () => {
    setEditStakeholder(null);
    setFormData({ name: '', firma: '', rolle: '', telefon: '', email: '', typ: 'extern' });
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
      typ: s.typ
    });
    setZeigeModal(true);
  };

  const handleSave = () => {
    if (editStakeholder) {
      const aktualisiert = projekt.stakeholder.map(s =>
        s.id === editStakeholder.id ? { ...s, ...formData } : s
      );
      onUpdate({ ...projekt, stakeholder: aktualisiert });
    } else {
      const neu: Stakeholder = {
        id: generateId(),
        ...formData
      };
      onUpdate({ ...projekt, stakeholder: [...projekt.stakeholder, neu] });
    }
    setZeigeModal(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Stakeholder wirklich löschen?')) {
      onUpdate({
        ...projekt,
        stakeholder: projekt.stakeholder.filter(s => s.id !== id)
      });
    }
  };

  const interneStakeholder = projekt.stakeholder.filter(s => s.typ === 'intern');
  const externeStakeholder = projekt.stakeholder.filter(s => s.typ === 'extern');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Projektbeteiligte (Stakeholder)</h2>
        <button onClick={handleNeu} className="btn-primary">
          + Stakeholder hinzufügen
        </button>
      </div>

      {projekt.stakeholder.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-apleona-gray-500">Noch keine Stakeholder angelegt.</p>
          <button onClick={handleNeu} className="btn-primary mt-4">
            Ersten Stakeholder anlegen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Interne Stakeholder */}
          <div className="card">
            <h3 className="font-semibold text-apleona-gray-900 mb-4 flex items-center">
              <span className="w-3 h-3 bg-apleona-navy rounded-full mr-2"></span>
              Intern ({interneStakeholder.length})
            </h3>
            {interneStakeholder.length === 0 ? (
              <p className="text-apleona-gray-500 text-sm">Keine internen Stakeholder</p>
            ) : (
              <div className="space-y-3">
                {interneStakeholder.map(s => (
                  <div key={s.id} className="border border-apleona-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-sm text-apleona-gray-600">{s.firma} - {s.rolle}</p>
                        {s.telefon && <p className="text-sm text-apleona-gray-500">{s.telefon}</p>}
                        {s.email && (
                          <a href={`mailto:${s.email}`} className="text-sm text-apleona-navy hover:underline">
                            {s.email}
                          </a>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => handleEdit(s)} className="text-apleona-navy hover:text-apleona-navy-dark">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="text-apleona-red hover:text-apleona-red-dark">
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
          </div>

          {/* Externe Stakeholder */}
          <div className="card">
            <h3 className="font-semibold text-apleona-gray-900 mb-4 flex items-center">
              <span className="w-3 h-3 bg-apleona-red rounded-full mr-2"></span>
              Extern ({externeStakeholder.length})
            </h3>
            {externeStakeholder.length === 0 ? (
              <p className="text-apleona-gray-500 text-sm">Keine externen Stakeholder</p>
            ) : (
              <div className="space-y-3">
                {externeStakeholder.map(s => (
                  <div key={s.id} className="border border-apleona-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-sm text-apleona-gray-600">{s.firma} - {s.rolle}</p>
                        {s.telefon && <p className="text-sm text-apleona-gray-500">{s.telefon}</p>}
                        {s.email && (
                          <a href={`mailto:${s.email}`} className="text-sm text-apleona-navy hover:underline">
                            {s.email}
                          </a>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => handleEdit(s)} className="text-apleona-navy hover:text-apleona-navy-dark">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="text-apleona-red hover:text-apleona-red-dark">
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
          </div>
        </div>
      )}

      {/* Modal */}
      {zeigeModal && (
        <div className="modal-overlay" onClick={() => setZeigeModal(false)}>
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
                  <label className="label">Typ</label>
                  <select
                    value={formData.typ}
                    onChange={e => setFormData({ ...formData, typ: e.target.value as StakeholderTyp })}
                    className="input-field"
                  >
                    <option value="intern">Intern</option>
                    <option value="extern">Extern</option>
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
