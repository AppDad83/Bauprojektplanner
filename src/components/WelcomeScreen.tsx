'use client';

import React, { useRef, useState } from 'react';
import AppLogo from './AppLogo';
import { useData } from '@/lib/DataContext';

const WelcomeScreen: React.FC = () => {
  const { ladeJSON, setzeNeuesDatenObjekt } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDateiWaehlen = () => {
    fileInputRef.current?.click();
  };

  const handleDateiAendern = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      await ladeJSON(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Datei');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNeuesProjekt = () => {
    setzeNeuesDatenObjekt();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-apleona-navy to-apleona-navy-dark flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <AppLogo width={200} height={50} />
        </div>

        <h1 className="text-2xl font-bold text-apleona-gray-900 text-center mb-2">
          Bauprojektmanagement
        </h1>
        <p className="text-apleona-gray-600 text-center mb-8">
          Projektsteuerung und -management
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Optionen */}
        <div className="space-y-4">
          {/* Neues Projekt */}
          <button
            onClick={handleNeuesProjekt}
            disabled={isLoading}
            className="w-full py-4 bg-apleona-navy text-white rounded-xl font-medium
                       hover:bg-apleona-navy-dark transition-colors duration-200
                       focus:outline-none focus:ring-2 focus:ring-apleona-navy focus:ring-offset-2
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center"
          >
            <svg
              className="w-5 h-5 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Neue Projektdatei erstellen
          </button>

          {/* Trennlinie */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-apleona-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-apleona-gray-500">oder</span>
            </div>
          </div>

          {/* JSON laden */}
          <button
            onClick={handleDateiWaehlen}
            disabled={isLoading}
            className="w-full py-4 bg-white border-2 border-apleona-navy text-apleona-navy rounded-xl font-medium
                       hover:bg-apleona-gray-50 transition-colors duration-200
                       focus:outline-none focus:ring-2 focus:ring-apleona-navy focus:ring-offset-2
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin w-5 h-5 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Wird geladen...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                JSON-Datei laden
              </>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleDateiAendern}
            className="hidden"
          />
        </div>

        {/* Info */}
        <p className="mt-6 text-xs text-apleona-gray-500 text-center">
          Die Daten werden lokal in einer JSON-Datei gespeichert.<br />
          Legen Sie die Datei auf SharePoint ab, um sie mit anderen zu teilen.
        </p>

        {/* Version */}
        <p className="mt-4 text-xs text-apleona-gray-400 text-center">
          Version 0.2.0
        </p>
      </div>
    </div>
  );
};

export default WelcomeScreen;
