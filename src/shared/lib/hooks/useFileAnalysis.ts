import { useState, useEffect } from 'react';
import { SoftwareMetrics, AnalysisResult, AppConfig } from '../../../entities/Analysis/model/types';
import { analyzeSourceCode, logToBackend } from '../../../shared/api/ai/aiService';

const DEFAULT_METRICS: SoftwareMetrics = {
  loc: 100,
  cyclomaticComplexity: 5,
  halsteadVolume: 500,
  maintainabilityIndex: 85,
  depthOfInheritance: 2,
  couplingBetweenObjects: 4,
};

const MAX_CONTEXT_SIZE = 1024 * 1024; // 1MB limit for context

export const useFileAnalysis = () => {
  const [metrics, setMetrics] = useState<SoftwareMetrics>(DEFAULT_METRICS);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('AI обробляє дані');
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string, content: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        setConfig(data);
        addLog('Конфігурацію завантажено успішно');
      } catch (err) {
        addLog('Помилка завантаження конфігурації', 'ERROR');
      }
    };
    fetchConfig();
  }, []);

  const addLog = (msg: string, level: 'INFO' | 'ERROR' | 'WARN' = 'INFO') => {
    const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
    setLogs(prev => [entry, ...prev].slice(0, 50));
    logToBackend(msg, level);
  };

  const handleAnalyze = async () => {
    if (uploadedFiles.length === 0) {
      setError('Будь ласка, завантажте файли для аналізу.');
      return;
    }

    setLoading(true);
    setLoadingMessage('Підготовка до аналізу...');
    setError(null);
    setResult(null);
    addLog('Початок аналізу якості ПЗ...');
    
    const customLog = (msg: string, level: 'INFO' | 'ERROR' | 'WARN' = 'INFO') => {
      addLog(msg, level);
      if (level === 'INFO') setLoadingMessage(msg);
    };

    try {
      const skipList = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.git', 'node_modules', '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot'];
      const filteredFiles = uploadedFiles.filter(f => !skipList.some(skip => f.name.toLowerCase().includes(skip.toLowerCase())));
      
      if (filteredFiles.length === 0) {
        throw new Error("Немає текстових файлів для аналізу.");
      }

      if (filteredFiles.length < uploadedFiles.length) {
        customLog(`Пропущено ${uploadedFiles.length - filteredFiles.length} системних/бінарних файлів`, 'WARN');
      }
      
      customLog(`Аналіз ${filteredFiles.length} файлів коду...`);
      const totalSize = filteredFiles.reduce((acc, f) => acc + f.content.length, 0);
      customLog(`Загальний розмір контексту: ${(totalSize / 1024).toFixed(1)} KB`);
      
      const analysis = await analyzeSourceCode(filteredFiles, customLog);
      
      if (analysis.extractedMetrics) {
        setMetrics(analysis.extractedMetrics);
      }
      setResult(analysis);
      addLog(`Аналіз завершено. Рівень ризику: ${analysis.riskLevel}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Невідома помилка';
      setError(errMsg);
      addLog(`Помилка аналізу: ${errMsg}`, 'ERROR');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    
    setLoading(true);
    addLog(`Завантаження ${files.length} файлів...`);
    
    const newFiles: { name: string, content: string }[] = [];
    let currentTotalSize = uploadedFiles.reduce((acc, f) => acc + f.content.length, 0);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 1024 * 500) {
        addLog(`Файл ${file.name} занадто великий (>500KB)`, 'WARN');
        continue;
      }

      if (currentTotalSize + file.size > MAX_CONTEXT_SIZE) {
        addLog(`Перевищено ліміт контексту (${(MAX_CONTEXT_SIZE / 1024).toFixed(0)} KB). Файл ${file.name} пропущено.`, 'WARN');
        continue;
      }
      
      try {
        const content = await file.text();
        const path = (file as any).webkitRelativePath || file.name;
        newFiles.push({ name: path, content });
        currentTotalSize += content.length;
      } catch (e) {
        addLog(`Не вдалося прочитати файл ${file.name}`, 'WARN');
      }
    }
    
    const totalSize = newFiles.reduce((acc, f) => acc + f.content.length, 0);
    const currentSize = uploadedFiles.reduce((acc, f) => acc + f.content.length, 0);
    
    if (uploadedFiles.length + newFiles.length > 150) {
      setError('Занадто багато файлів. Ліміт: 150 файлів.');
      setLoading(false);
      return;
    }
    
    if (currentSize + totalSize > 2 * 1024 * 1024) {
      setError('Загальний розмір файлів занадто великий. Ліміт: 2MB.');
      setLoading(false);
      return;
    }

    setUploadedFiles(prev => {
      const updated = [...prev];
      newFiles.forEach(newFile => {
        const index = updated.findIndex(f => f.name === newFile.name);
        if (index !== -1) {
          updated[index] = newFile;
        } else {
          updated.push(newFile);
        }
      });
      return updated;
    });
    addLog(`Завантажено ${newFiles.length} нових файлів`);
    setLoading(false);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setUploadedFiles([]);
    addLog('Список файлів очищено');
  };

  const handleExport = () => {
    if (!result) return;
    addLog('Експорт звіту та логів...');
    
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        metrics,
        analysis: result,
        systemLogs: logs
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `software-quality-report-${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addLog('Звіт та логи успішно експортовано');
    } catch (err) {
      addLog('Помилка експорту звіту', 'ERROR');
      console.error('Export failed:', err);
    }
  };

  return {
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
  };
};
