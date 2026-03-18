import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Activity, AlertTriangle, FileCode, X } from 'lucide-react';
import { useFileAnalysis } from '../../../shared/lib/hooks/useFileAnalysis';
import { Header } from '../../../widgets/Header/ui/Header';
import { FileUploader } from '../../../widgets/FileUploader/ui/FileUploader';
import { AnalysisDashboard } from '../../../widgets/AnalysisDashboard/ui/AnalysisDashboard';
import { SystemLogs } from '../../../widgets/SystemLogs/ui/SystemLogs';
import { MetricGuide } from '../../../widgets/MetricGuide/ui/MetricGuide';
import { cn } from '@/src/shared/lib/utils/cn';

export const MainPage = () => {
  const {
    metrics,
    result,
    loading,
    loadingMessage,
    error,
    config,
    logs,
    uploadedFiles,
    isDragging,
    selectedFileIndex,
    setSelectedFileIndex,
    handleAnalyze,
    handleFileUpload,
    onDragOver,
    onDragLeave,
    onDrop,
    removeFile,
    clearFiles,
    handleExport,
    MAX_CONTEXT_SIZE
  } = useFileAnalysis();

  const selectedFileAnalysis = selectedFileIndex !== null && result?.fileAnalyses
    ? result.fileAnalyses[selectedFileIndex]
    : null;

  const selectedFileContent = selectedFileAnalysis
    ? uploadedFiles.find(f => {
        const normalizedUploaded = f.name.replace(/\\/g, '/').toLowerCase();
        const normalizedAnalysis = selectedFileAnalysis.fileName.replace(/\\/g, '/').toLowerCase();
        const cleanAnalysis = normalizedAnalysis.split(' (')[0].trim();
        const cleanUploaded = normalizedUploaded.trim();
        if (cleanUploaded === cleanAnalysis) return true;
        if (cleanUploaded.endsWith('/' + cleanAnalysis)) return true;
        if (cleanAnalysis.endsWith('/' + cleanUploaded)) return true;
        const baseUploaded = cleanUploaded.split('/').pop();
        const baseAnalysis = cleanAnalysis.split('/').pop();
        if (baseUploaded === baseAnalysis && baseUploaded !== '') return true;
        return false;
      })?.content
    : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 md:p-8">
      <Header config={config} />

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Inputs */}
        <section className="lg:col-span-4 space-y-6">
          <FileUploader
            uploadedFiles={uploadedFiles}
            isDragging={isDragging}
            loading={loading}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            handleFileUpload={handleFileUpload}
            clearFiles={clearFiles}
            removeFile={removeFile}
            handleAnalyze={handleAnalyze}
            maxContextSize={MAX_CONTEXT_SIZE}
          />
          <SystemLogs logs={logs} />
        </section>

        {/* Right Column: Results */}
        <section className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {!result && !loading && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border border-dashed border-slate-300"
              >
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <FileText className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800">Готові до аналізу</h3>
                <p className="text-slate-500 max-w-md mt-2">
                  Завантажте файли коду зліва та натисніть кнопку запуску, щоб отримати детальний звіт від AI.
                </p>
              </motion.div>
            )}

            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200"
              >
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
                  <Activity className="w-8 h-8 text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mt-8">AI обробляє дані</h3>
                <p className="text-slate-500 mt-2 text-center max-w-md">
                  {loadingMessage}
                </p>
              </motion.div>
            )}

            {result && !loading && (
              <AnalysisDashboard
                result={result}
                metrics={metrics}
                handleExport={handleExport}
                setSelectedFileIndex={setSelectedFileIndex}
              />
            )}
          </AnimatePresence>

          {result && !loading && <MetricGuide />}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </section>
      </main>

      <footer className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-sm">
        <p>© 2026 AI Software Quality Analyzer. Всі права захищені.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-slate-600 transition-colors">Документація</a>
          <a href="#" className="hover:text-slate-600 transition-colors">Підтримка</a>
          <a href="#" className="hover:text-slate-600 transition-colors">Конфіденційність</a>
        </div>
      </footer>

      {/* Code Viewer Modal */}
           <AnimatePresence>
        {selectedFileAnalysis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedFileIndex(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <FileCode className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{selectedFileAnalysis.fileName}</h3>
                    <p className="text-xs text-slate-500">Детальний аналіз проблемних частин коду</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFileIndex(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6 bg-slate-50 font-mono text-sm custom-scrollbar">
                {selectedFileContent ? (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {selectedFileContent.split('\n').map((line, idx) => {
                      const lineNumber = idx + 1;
                      const issue = selectedFileAnalysis.issues?.find(iss => Number(iss.line) === lineNumber);

                      return (
                        <div key={idx} className="relative group">
                          <div className={cn(
                            "flex items-start",
                            issue ? "bg-red-50/70" : "hover:bg-slate-50/50"
                          )}>
                            <div className={cn(
                              "w-12 py-1 px-2 text-right select-none border-r border-slate-100 font-bold",
                              issue ? "bg-red-100 text-red-600" : "bg-slate-50/50 text-slate-300"
                            )}>
                              {lineNumber}
                            </div>
                            <pre className="flex-1 py-1 px-4 whitespace-pre overflow-x-auto">
                              {line || ' '}
                            </pre>
                          </div>

                        {issue && (
                          <div className="ml-12 mr-6 my-2 p-3 bg-red-100 border-l-4 border-red-500 rounded-r-lg shadow-sm">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-red-200 text-red-700 rounded">
                                    {issue.severity} Risk
                                  </span>
                                </div>
                                <p className="text-red-800 text-xs leading-relaxed font-sans">
                                  {issue.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4">
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-700">Вміст файлу не знайдено</h4>
                      <p className="text-slate-500 max-w-md mx-auto mt-2">
                        На жаль, ми не змогли знайти вміст файлу "{selectedFileAnalysis.fileName}" серед завантажених даних.
                        Спробуйте завантажити файли ще раз або переконайтеся, що шлях до файлу вірний.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedFileIndex(null)}
                  className="px-6 py-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
                >
                  Закрити
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
