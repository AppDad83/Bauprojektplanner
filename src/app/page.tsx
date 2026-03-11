'use client';

import { useData } from '@/lib/DataContext';
import WelcomeScreen from '@/components/WelcomeScreen';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const { istGeladen } = useData();

  if (!istGeladen) {
    return <WelcomeScreen />;
  }

  return <Dashboard />;
}
