'use client';

import React, { useState, useRef } from 'react';
import { Projekt, Mangel, MangelStatus } from '@/types';
import { formatDatum, generateId, berechneAmpelFuerFrist, tageBisFrist } from '@/lib/utils';

interface Props {
  projekt: Projekt;
  onUpdate: (projekt: Projekt) => void;
}

const StatusLabels: Record<MangelStatus, string> = {
  offen: 'Offen',
  in_bearbeitung: 'In Bearbeitung',
  behoben: 'Behoben',
  abgenommen: 'Abgenommen'
};

const TabMaengel: React.FC<Props> = ({ projekt, onUpdate }) => {
  const [zeigeModal, setZeigeModal] = useState(false);
  const [editMangel, setEditMangel] = useState<Mangel | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('alle');
  const [filterGewerk, setFilterGewerk] = useState<string>('alle');
  const [filterFachfirma, setFilterFachfirma] = useState<string>('alle');
  const [zeigeForoModal, setZeigeFotoModal] = useState<string | null>(null);
  const [fullscreenFoto, setFullscreenFoto] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    beschreibung: '',
    ortBauteil: '',
    fachfirmaId: '',
    gewerkId: '',
    fristBehebung: '',
    status: 'offen' as MangelStatus,
    behebungsDatumIst: '',
    fotos: [] as string[],
    notizen: ''
  });

  const naechsteMangelnummer = Math.max(0, ...projekt.maengel.map(m => m.mangelnummer)) + 1;

  const gefiltert = projekt.maengel.filter(m => {
    if (filterStatus !== 'alle' && m.status !== filterStatus) return false;
    if (filterGewerk !== 'alle' && m.gewerkId !== filterGewerk) return false;
    if (filterFachfirma !== 'alle' && m.fachfirmaId !== filterFachfirma) return false;
    return true;
  });

  const handleNeu = () => {
    setEditMangel(null);
    setFormData({
      beschreibung: '',
      ortBauteil: '',
      fachfirmaId: '',
      gewerkId: '',
      fristBehebung: '',
      status: 'offen',
      behebungsDatumIst: '',
      fotos: [],
      notizen: ''
    });
    setZeigeModal(true);
  };

  const handleEdit = (m: Mangel) => {
    setEditMangel(m);
    setFormData({
      beschreibung: m.beschreibung,
      ortBauteil: m.ortBauteil,
      fachfirmaId: m.fachfirmaId,
      gewerkId: m.gewerkId,
      fristBehebung: m.fristBehebung,
      status: m.status,
      behebungsDatumIst: m.behebungsDatumIst || '',
      fotos: m.fotos || [],
      notizen: m.notizen || ''
    });
    setZeigeModal(true);
  };

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string;
        setFormData(prev => ({ ...prev, fotos: [...prev.fotos, base64] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFotoEntfernen = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fotos: prev.fotos.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    if (editMangel) {
      const aktualisiert = projekt.maengel.map(m =>
        m.id === editMangel.id
          ? {
              ...m,
              ...formData,
              behebungsDatumIst: formData.behebungsDatumIst || undefined,
              notizen: formData.notizen || undefined
            }
          : m
      );
      onUpdate({ ...projekt, maengel: aktualisiert });
    } else {
      const neu: Mangel = {
        id: generateId(),
        projektId: projekt.id,
        mangelnummer: naechsteMangelnummer,
        datumFeststellung: new Date().toISOString().split('T')[0],
        beschreibung: formData.beschreibung,
        ortBauteil: formData.ortBauteil,
        fotos: formData.fotos,
        fachfirmaId: formData.fachfirmaId,
        gewerkId: formData.gewerkId,
        fristBehebung: formData.fristBehebung,
        status: formData.status,
        behebungsDatumIst: formData.behebungsDatumIst || undefined,
        notizen: formData.notizen || undefined
      };
      onUpdate({ ...projekt, maengel: [...projekt.maengel, neu] });
    }
    setZeigeModal(false);
  };

  const handleStatusChange = (mangelId: string, neuerStatus: MangelStatus) => {
    const aktualisiert = projekt.maengel.map(m => {
      if (m.id !== mangelId) return m;
      const updates: Partial<Mangel> = { status: neuerStatus };
      if (neuerStatus === 'behoben' && !m.behebungsDatumIst) {
        updates.behebungsDatumIst = new Date().toISOString().split('T')[0];
      }
      return { ...m, ...updates };
    });
    onUpdate({ ...projekt, maengel: aktualisiert });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Mangel wirklich löschen?')) {
      onUpdate({ ...projekt, maengel: projekt.maengel.filter(m => m.id !== id) });
    }
  };

  const getFachfirmaName = (id: string) => projekt.fachfirmen.find(ff => ff.id === id)?.firma || 'Unbekannt';
  const getGewerkName = (id: string) => {
    const g = projekt.gewerke.find(gw => gw.id === id);
    return g ? `${g.dinNummer} - ${g.bezeichnung}` : 'Unbekannt';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Mängelmanagement</h2>
        <button onClick={handleNeu} className="btn-primary">+ Mangel erfassen</button>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-apleona-gray-600">Gesamt</p>
          <p className="text-2xl font-bold text-apleona-navy">{projekt.maengel.length}</p>
        </div>
        <div className="card border-l-4 border-status-red">
          <p className="text-sm text-apleona-gray-600">Offen</p>
          <p className="text-2xl font-bold text-status-red">
            {projekt.maengel.filter(m => m.status === 'offen').length}
          </p>
        </div>
        <div className="card border-l-4 border-status-yellow">
          <p className="text-sm text-apleona-gray-600">In Bearbeitung</p>
          <p className="text-2xl font-bold text-status-yellow">
            {projekt.maengel.filter(m => m.status === 'in_bearbeitung').length}
          </p>
        </div>
        <div className="card border-l-4 border-status-green">
          <p className="text-sm text-apleona-gray-600">Abgenommen</p>
          <p className="text-2xl font-bold text-status-green">
            {projekt.maengel.filter(m => m.status === 'abgenommen').length}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field">
              <option value="alle">Alle</option>
              {Object.entries(StatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Gewerk</label>
            <select value={filterGewerk} onChange={e => setFilterGewerk(e.target.value)} className="input-field">
              <option value="alle">Alle</option>
              {projekt.gewerke.map(g => <option key={g.id} value={g.id}>{g.dinNummer} - {g.bezeichnung}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Fachfirma</label>
            <select value={filterFachfirma} onChange={e => setFilterFachfirma(e.target.value)} className="input-field">
              <option value="alle">Alle</option>
              {projekt.fachfirmen.map(ff => <option key={ff.id} value={ff.id}>{ff.firma}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabelle */}
      {gefiltert.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-apleona-gray-500">Keine Mängel erfasst.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-apleona-gray-200">
            <thead className="bg-apleona-navy">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Nr.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Ampel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Beschreibung</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Ort</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Fachfirma</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Frist</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Fotos</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apleona-gray-200">
              {gefiltert.map(m => {
                const ampel = m.status === 'behoben' || m.status === 'abgenommen'
                  ? 'gruen'
                  : berechneAmpelFuerFrist(m.fristBehebung);
                const tage = tageBisFrist(m.fristBehebung);

                return (
                  <tr key={m.id} className="hover:bg-apleona-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">#{m.mangelnummer}</td>
                    <td className="px-4 py-3">
                      <span className={`w-4 h-4 rounded-full inline-block ${
                        ampel === 'gruen' ? 'bg-status-green' :
                        ampel === 'gelb' ? 'bg-status-yellow' : 'bg-status-red'
                      }`} />
                    </td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{m.beschreibung}</td>
                    <td className="px-4 py-3 text-sm">{m.ortBauteil}</td>
                    <td className="px-4 py-3 text-sm">{getFachfirmaName(m.fachfirmaId)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={tage < 0 ? 'text-status-red font-medium' : ''}>
                        {formatDatum(m.fristBehebung)}
                        {tage < 0 && <span className="ml-1">({Math.abs(tage)}d überfällig)</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <select
                        value={m.status}
                        onChange={e => handleStatusChange(m.id, e.target.value as MangelStatus)}
                        className="text-sm border rounded px-2 py-1"
                      >
                        {Object.entries(StatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {m.fotos.length > 0 && (
                        <button
                          onClick={() => setZeigeFotoModal(m.id)}
                          className="text-apleona-navy hover:underline"
                        >
                          {m.fotos.length} Foto(s)
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex space-x-2">
                        <button onClick={() => handleEdit(m)} className="text-apleona-navy hover:text-apleona-navy-dark">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="text-apleona-red hover:text-apleona-red-dark">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {zeigeModal && (
        <div className="modal-overlay" onClick={() => setZeigeModal(false)}>
          <div className="modal-content p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">
              {editMangel ? `Mangel #${editMangel.mangelnummer} bearbeiten` : `Neuer Mangel #${naechsteMangelnummer}`}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="label">Beschreibung</label>
                <textarea value={formData.beschreibung} onChange={e => setFormData({ ...formData, beschreibung: e.target.value })} className="input-field" rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Ort / Bauteil</label>
                  <input type="text" value={formData.ortBauteil} onChange={e => setFormData({ ...formData, ortBauteil: e.target.value })} className="input-field" placeholder="z.B. EG Flur, Fenster Nord" />
                </div>
                <div>
                  <label className="label">Gewerk</label>
                  <select value={formData.gewerkId} onChange={e => setFormData({ ...formData, gewerkId: e.target.value })} className="input-field">
                    <option value="">Bitte wählen...</option>
                    {projekt.gewerke.map(g => <option key={g.id} value={g.id}>{g.dinNummer} - {g.bezeichnung}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Verantwortliche Fachfirma</label>
                  <select value={formData.fachfirmaId} onChange={e => setFormData({ ...formData, fachfirmaId: e.target.value })} className="input-field">
                    <option value="">Bitte wählen...</option>
                    {projekt.fachfirmen.map(ff => <option key={ff.id} value={ff.id}>{ff.firma}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Frist zur Behebung</label>
                  <input type="date" value={formData.fristBehebung} onChange={e => setFormData({ ...formData, fristBehebung: e.target.value })} className="input-field" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Status</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as MangelStatus })} className="input-field">
                    {Object.entries(StatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {(formData.status === 'behoben' || formData.status === 'abgenommen') && (
                  <div>
                    <label className="label">Behebungsdatum (Ist)</label>
                    <input type="date" value={formData.behebungsDatumIst} onChange={e => setFormData({ ...formData, behebungsDatumIst: e.target.value })} className="input-field" />
                  </div>
                )}
              </div>

              {/* Fotos */}
              <div>
                <label className="label">Fotos</label>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFotoUpload} className="mb-2" />
                {formData.fotos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {formData.fotos.map((foto, i) => (
                      <div key={i} className="relative">
                        <img src={foto} alt={`Foto ${i + 1}`} className="w-full h-20 object-cover rounded" />
                        <button
                          onClick={() => handleFotoEntfernen(i)}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="label">Notizen</label>
                <textarea value={formData.notizen} onChange={e => setFormData({ ...formData, notizen: e.target.value })} className="input-field" rows={2} />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setZeigeModal(false)} className="btn-secondary">Abbrechen</button>
              <button
                onClick={handleSave}
                disabled={!formData.beschreibung || !formData.fachfirmaId || !formData.gewerkId || !formData.fristBehebung}
                className="btn-primary disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Foto-Modal mit Übersicht */}
      {zeigeForoModal && !fullscreenFoto && (
        <div className="modal-overlay" onClick={() => setZeigeFotoModal(null)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Fotos</h2>
            <p className="text-sm text-apleona-gray-500 mb-4">Klicken Sie auf ein Foto für die Vollbildansicht</p>
            <div className="grid grid-cols-2 gap-4">
              {projekt.maengel.find(m => m.id === zeigeForoModal)?.fotos.map((foto, i) => (
                <img
                  key={i}
                  src={foto}
                  alt={`Foto ${i + 1}`}
                  className="w-full rounded cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setFullscreenFoto(foto);
                    setZoomLevel(1);
                    setPanPosition({ x: 0, y: 0 });
                  }}
                />
              ))}
            </div>
            <button onClick={() => setZeigeFotoModal(null)} className="btn-secondary mt-4 w-full">Schließen</button>
          </div>
        </div>
      )}

      {/* Fullscreen Foto-Viewer */}
      {fullscreenFoto && (
        <div
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          onClick={() => {
            setFullscreenFoto(null);
            setZoomLevel(1);
            setPanPosition({ x: 0, y: 0 });
          }}
        >
          {/* Toolbar */}
          <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); setZoomLevel(z => Math.max(0.5, z - 0.25)); }}
              className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2"
              title="Verkleinern"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-white text-sm bg-white/20 px-2 py-1 rounded">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={(e) => { e.stopPropagation(); setZoomLevel(z => Math.min(4, z + 0.25)); }}
              className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2"
              title="Vergrößern"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setZoomLevel(1); setPanPosition({ x: 0, y: 0 }); }}
              className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2"
              title="Zurücksetzen"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFullscreenFoto(null);
                setZoomLevel(1);
                setPanPosition({ x: 0, y: 0 });
              }}
              className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2"
              title="Schließen"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Hinweis */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            Scrollen zum Zoomen • Ziehen zum Verschieben • Klicken zum Schließen
          </div>

          {/* Bild */}
          <div
            className="overflow-hidden w-full h-full flex items-center justify-center cursor-move"
            onClick={e => e.stopPropagation()}
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY > 0 ? -0.1 : 0.1;
              setZoomLevel(z => Math.max(0.5, Math.min(4, z + delta)));
            }}
            onMouseDown={(e) => {
              setIsDragging(true);
              setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
            }}
            onMouseMove={(e) => {
              if (isDragging) {
                setPanPosition({
                  x: e.clientX - dragStart.x,
                  y: e.clientY - dragStart.y
                });
              }
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            <img
              src={fullscreenFoto}
              alt="Vollbild"
              className="max-w-none"
              style={{
                transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
              draggable={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TabMaengel;
