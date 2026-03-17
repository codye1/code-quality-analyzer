import React from 'react';
import { Activity, Settings } from 'lucide-react';
import { AppConfig } from '../../../entities/Analysis/model/types';

interface HeaderProps {
  config: AppConfig | null;
}

export const Header = ({ config }: HeaderProps) => {
  return (
    <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
          <Activity className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Software Quality Analyzer</h1>
          <p className="text-slate-500 text-sm">Система оцінки ризиків та якості програмного коду</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {config && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
            <Settings className="w-4 h-4" />
            v{config.version} | {config.language.toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
};
