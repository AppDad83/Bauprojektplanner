'use client';

import React from 'react';
import Link from 'next/link';
import ApeleonaLogo from './ApeleonaLogo';
import { useData } from '@/lib/DataContext';

interface HeaderProps {
  showNavigation?: boolean;
}

const Header: React.FC<HeaderProps> = ({ showNavigation = true }) => {
  const { daten, speichereJSON, zeigeAutoSaveHinweis, setZeigeAutoSaveHinweis } = useData();

  return (
    <header className="bg-white border-b border-apleona-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <ApeleonaLogo width={140} height={35} />
            <span className="ml-3 text-sm text-apleona-gray-500 hidden sm:block">
              Bauprojektmanagement
            </span>
          </Link>

          {/* Navigation */}
          {showNavigation && daten && (
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/"
                className="text-apleona-gray-600 hover:text-apleona-navy font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/fristen"
                className="text-apleona-gray-600 hover:text-apleona-navy font-medium"
              >
                Fristen-Cockpit
              </Link>
            </nav>
          )}

          {/* Aktionen */}
          <div className="flex items-center space-x-4">
            {/* Auto-Save Hinweis */}
            {zeigeAutoSaveHinweis && (
              <div className="flex items-center bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                <svg
                  className="w-4 h-4 text-amber-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="text-sm text-amber-700 mr-2">
                  Vergiss nicht zu speichern!
                </span>
                <button
                  onClick={() => setZeigeAutoSaveHinweis(false)}
                  className="text-amber-500 hover:text-amber-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Speichern Button */}
            {daten && (
              <button
                onClick={speichereJSON}
                className="btn-primary flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Speichern
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
