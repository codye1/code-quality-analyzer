import React from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, CheckCircle, FileCode, Activity } from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Cell
} from 'recharts';
import { AnalysisResult, SoftwareMetrics } from '../../../entities/Analysis/model/types';
import { RiskBadge } from '../../../entities/Analysis/ui/RiskBadge';
import { cn } from '../../../shared/lib/utils/cn';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';

interface AnalysisDashboardProps {
  result: AnalysisResult;
  metrics: SoftwareMetrics;
  handleExportJson: () => void;
  handleExportPdf: () => void;
  setSelectedFileIndex: (index: number) => void;
}

export const AnalysisDashboard = ({
  result,
  metrics,
  handleExportJson,
  handleExportPdf,
  setSelectedFileIndex
}: AnalysisDashboardProps) => {
  const radarData = [
    { subject: 'LOC', A: Math.min((metrics?.loc || 0) / 10, 100), fullMark: 100, explanation: metrics?.explanations?.loc },
    { subject: 'Complexity', A: Math.min((metrics?.cyclomaticComplexity || 0) * 5, 100), fullMark: 100, explanation: metrics?.explanations?.cyclomaticComplexity },
    { subject: 'Volume', A: Math.min((metrics?.halsteadVolume || 0) / 20, 100), fullMark: 100, explanation: metrics?.explanations?.halsteadVolume },
    { subject: 'Maintainability', A: metrics?.maintainabilityIndex || 0, fullMark: 100, explanation: metrics?.explanations?.maintainabilityIndex },
    { subject: 'Inheritance', A: Math.min((metrics?.depthOfInheritance || 0) * 10, 100), fullMark: 100, explanation: metrics?.explanations?.depthOfInheritance },
    { subject: 'Coupling', A: Math.min((metrics?.couplingBetweenObjects || 0) * 5, 100), fullMark: 100, explanation: metrics?.explanations?.couplingBetweenObjects },
  ];

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="space-y-6"
    >
      {/* Summary Card */}
      <Card padding="lg">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <RiskBadge level={result.riskLevel} />
              <div className="text-slate-400 text-sm font-medium">
                Оцінка якості: <span className="text-slate-900 font-bold">{result.score}/100</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">Результати аналізу</h2>
            <p className="text-slate-600 leading-relaxed text-lg">
              {result.summary}
            </p>
            <div className="flex gap-4 pt-4">
              <Button onClick={handleExportPdf} variant="secondary" icon={<Download className="w-4 h-4" />}>
                Завантажити PDF
              </Button>
              <Button onClick={handleExportJson} variant="secondary" icon={<Download className="w-4 h-4" />}>
                Завантажити JSON
              </Button>
            </div>
          </div>

          <div className="w-full md:w-80 h-80 bg-slate-50 rounded-3xl p-2 flex flex-col items-center justify-center overflow-visible border border-slate-100">
            <ResponsiveContainer width="100%" height="70%" minWidth={200} minHeight={200}>
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData} margin={{ top: 10, right: 40, bottom: 10, left: 40 }}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} />
                <Radar
                  name="Metrics"
                  dataKey="A"
                  stroke="#059669"
                  fill="#10b981"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>

            <div className="w-full px-4 pb-4 space-y-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] text-slate-500">
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> <b>LOC:</b> Рядки коду</div>
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> <b>Complexity:</b> Логічні шляхи</div>
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> <b>Volume:</b> Складність алг.</div>
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> <b>Maint.:</b> Легкість змін</div>
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> <b>Inherit.:</b> Глибина класів</div>
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> <b>Coupling:</b> Залежності</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card padding="lg">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            Рекомендації AI
          </h3>
          <ul className="space-y-4">
            {(result.recommendations || []).map((rec, i) => (
              <li key={i} className="flex gap-3 text-slate-600 text-sm">
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">
                  {i + 1}
                </div>
                {rec}
              </li>
            ))}
          </ul>
        </Card>

        {/* Per-file Analysis */}
        {result.fileAnalyses && Array.isArray(result.fileAnalyses) && result.fileAnalyses.length > 0 && (
          <Card padding="lg">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <FileCode className="w-5 h-5 text-emerald-600" />
              Аналіз по файлах
            </h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {result.fileAnalyses.map((file, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedFileIndex(i)}
                  className="group p-4 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-700 truncate max-w-[200px]">{file.fileName}</span>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                      file.riskLevel === 'Low' ? "bg-emerald-100 text-emerald-700" :
                      file.riskLevel === 'Medium' ? "bg-amber-100 text-amber-700" :
                      file.riskLevel === 'High' ? "bg-orange-100 text-orange-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {file.score}%
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{file.summary}</p>

                  {file.metrics && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="bg-slate-50 p-1.5 rounded-lg text-center border border-slate-100">
                        <div className="text-[7px] text-slate-400 uppercase font-bold">LOC</div>
                        <div className="text-[10px] font-bold text-slate-700">{file.metrics.loc}</div>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg text-center border border-slate-100">
                        <div className="text-[7px] text-slate-400 uppercase font-bold">Complexity</div>
                        <div className="text-[10px] font-bold text-slate-700">{file.metrics.cyclomaticComplexity}</div>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg text-center border border-slate-100">
                        <div className="text-[7px] text-slate-400 uppercase font-bold">Maint. Index</div>
                        <div className="text-[10px] font-bold text-slate-700">{file.metrics.maintainabilityIndex}</div>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-1000",
                        file.score > 70 ? "bg-emerald-500" : file.score > 40 ? "bg-amber-500" : "bg-red-500"
                      )}
                      style={{ width: `${file.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card padding="lg">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            Аналіз ризиків за метриками
          </h3>
          <div className="h-48 flex items-center justify-center overflow-hidden">
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={160}>
              <BarChart data={radarData}>
                <XAxis dataKey="subject" hide />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', maxWidth: '300px' }}
                  formatter={(value: number, name: string, props: any) => {
                    const subject = props.payload.subject;
                    const explanation = props.payload.explanation;
                    let risk = "Низький";
                    if (subject === 'Maintainability') {
                      risk = value < 30 ? "Високий" : value < 60 ? "Середній" : "Низький";
                    } else {
                      risk = value > 80 ? "Високий" : value > 50 ? "Середній" : "Низький";
                    }
                    return [
                      <div key={subject} className="flex flex-col gap-1">
                        <div className="font-bold">{value}% ({risk} ризик)</div>
                        {explanation && <div className="text-xs text-slate-500 whitespace-pre-wrap">{explanation}</div>}
                      </div>,
                      "Значення"
                    ];
                  }}
                />
                <Bar dataKey="A" radius={[4, 4, 0, 0]}>
                  {radarData.map((entry, index) => {
                    let color = '#10b981'; // Green (Low risk)
                    if (entry.subject === 'Maintainability') {
                      // For Maintainability, LOW is BAD
                      color = entry.A < 30 ? '#ef4444' : entry.A < 60 ? '#f59e0b' : '#10b981';
                    } else {
                      // For others, HIGH is BAD
                      color = entry.A > 80 ? '#ef4444' : entry.A > 50 ? '#f59e0b' : '#10b981';
                    }
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center italic">
            Червоний колір вказує на високий рівень ризику для конкретної метрики. Наведіть на стовпець для пояснення.
          </p>
        </Card>
      </div>
    </motion.div>
  );
};
