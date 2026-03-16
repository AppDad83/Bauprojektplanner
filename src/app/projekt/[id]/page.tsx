'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useData } from '@/lib/DataContext';
import { Projekt, AmpelStatus, AHO_PHASEN } from '@/types';
import Header from '@/components/Header';
import TabUebersicht from '@/components/projekt/TabUebersicht';
import TabAufgaben from '@/components/projekt/TabAufgaben';
import TabGewerke from '@/components/projekt/TabGewerke';
import TabFachplaner from '@/components/projekt/TabFachplaner';
import TabFachfirmen from '@/components/projekt/TabFachfirmen';
import TabMaengel from '@/components/projekt/TabMaengel';
import TabBudget from '@/components/projekt/TabBudget';
import TabFee from '@/components/projekt/TabFee';
import TabStakeholder from '@/components/projekt/TabStakeholder';

const TABS = [
  { id: 'uebersicht', label: 'Übersicht' },
  { id: 'aufgaben', label: 'Aufgaben & Gantt' },
  { id: 'gewerke', label: 'Gewerke' },
  { id: 'fachplaner', label: 'Fachplaner' },
  { id: 'fachfirmen', label: 'Fachfirmen' },
  { id: 'maengel', label: 'Mängel' },
  { id: 'budget', label: 'Budget' },
  { id: 'fee', label: 'Fee' },
  { id: 'stakeholder', label: 'Stakeholder' },
];

export default function ProjektDetail() {
  const params = useParams();
  const router = useRouter();
  const { getProjekt, aktualisiereProjekt, istGeladen } = useData();
  const [activeTab, setActiveTab] = useState('uebersicht');
  const [projekt, setProjekt] = useState<Projekt | null>(null);

  const projektId = params.id as string;

  useEffect(() => {
    if (istGeladen && projektId) {
      const p = getProjekt(projektId);
      if (p) {
        setProjekt(p);
      } else {
        router.push('/');
      }
    }
  }, [istGeladen, projektId, getProjekt, router]);

  const handleProjektUpdate = (aktualisiertesProjekt: Projekt) => {
    setProjekt(aktualisiertesProjekt);
    aktualisiereProjekt(aktualisiertesProjekt);
  };

  if (!istGeladen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Laden...</p>
      </div>
    );
  }

  if (!projekt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Projekt nicht gefunden</p>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'uebersicht':
        return <TabUebersicht projekt={projekt} onUpdate={handleProjektUpdate} />;
      case 'aufgaben':
        return <TabAufgaben projekt={projekt} onUpdate={handleProjektUpdate} />;
      case 'gewerke':
        return <TabGewerke projekt={projekt} onUpdate={handleProjektUpdate} />;
      case 'fachplaner':
        return <TabFachplaner projekt={projekt} onUpdate={handleProjektUpdate} />;
      case 'fachfirmen':
        return <TabFachfirmen projekt={projekt} onUpdate={handleProjektUpdate} />;
      case 'maengel':
        return <TabMaengel projekt={projekt} onUpdate={handleProjektUpdate} />;
      case 'budget':
        return <TabBudget projekt={projekt} onUpdate={handleProjektUpdate} />;
      case 'fee':
        return <TabFee projekt={projekt} onUpdate={handleProjektUpdate} />;
      case 'stakeholder':
        return <TabStakeholder projekt={projekt} onUpdate={handleProjektUpdate} />;
      default:
        return <TabUebersicht projekt={projekt} onUpdate={handleProjektUpdate} />;
    }
  };

  return (
    <div className="min-h-screen bg-apleona-gray-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-apleona-navy hover:underline text-sm mb-2 inline-block">
            ← Zurück zum Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center">
                <span className={`w-4 h-4 rounded-full mr-3 ${
                  projekt.status === 'gruen' ? 'bg-status-green' :
                  projekt.status === 'gelb' ? 'bg-status-yellow' : 'bg-status-red'
                }`} />
                <h1 className="text-2xl font-bold text-apleona-gray-900">{projekt.name}</h1>
              </div>
              <p className="text-apleona-gray-600 mt-1">
                {projekt.projektnummerApleona && `Apleona: ${projekt.projektnummerApleona} | `}
                {projekt.liegenschaftAdresse}
              </p>
            </div>
            <div className="text-right">
              <span className="badge-info">{projekt.aktuellePhase}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-apleona-gray-200 mb-6 overflow-x-auto">
          <nav className="flex space-x-8 min-w-max">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-apleona-navy text-apleona-navy'
                    : 'border-transparent text-apleona-gray-500 hover:text-apleona-gray-700 hover:border-apleona-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </main>
    </div>
  );
}
