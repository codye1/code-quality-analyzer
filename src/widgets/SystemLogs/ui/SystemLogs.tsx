import React from 'react';
import { Terminal } from 'lucide-react';
import { cn } from '../../../shared/lib/utils/cn';
import { Card } from '../../../shared/ui/Card';

interface SystemLogsProps {
  logs: string[];
}

export const SystemLogs = ({ logs }: SystemLogsProps) => {
  return (
    <Card className="bg-slate-900 border-none shadow-xl overflow-hidden" padding="lg">
      <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
        <Terminal className="w-4 h-4" />
        Лог системи
      </h3>
      <div className="h-48 overflow-y-auto font-mono text-xs space-y-1 custom-scrollbar">
        {logs.map((log, i) => (
          <div key={i} className={cn(
            "py-0.5 border-l-2 pl-2",
            log.includes('ERROR') ? "text-red-400 border-red-500" : "text-emerald-400 border-emerald-500/30"
          )}>
            {log}
          </div>
        ))}
        {logs.length === 0 && <div className="text-slate-600 italic">Очікування дій...</div>}
      </div>
    </Card>
  );
};
