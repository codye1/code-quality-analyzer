import { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
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
      const isGeneratedReportFile = (name: string) => {
        const normalized = name.replace(/\\/g, '/').toLowerCase();
        const baseName = normalized.split('/').pop() || normalized;
        return /^software-quality-report-\d+\.(json|pdf)$/i.test(baseName);
      };
      const filteredFiles = uploadedFiles.filter(f => !skipList.some(skip => f.name.toLowerCase().includes(skip.toLowerCase())) && !isGeneratedReportFile(f.name));

      if (filteredFiles.length === 0) {
        throw new Error("Немає текстових файлів для аналізу.");
      }

      if (filteredFiles.length < uploadedFiles.length) {
        customLog(`Пропущено ${uploadedFiles.length - filteredFiles.length} системних/бінарних/звітних файлів`, 'WARN');
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

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const buildReportHtml = () => {
    if (!result) return '';

    const recommendations = (result.recommendations || [])
      .map((rec) => `<li>${escapeHtml(rec)}</li>`)
      .join('');

    const fileList = uploadedFiles
      .map((file) => `<li>${escapeHtml(file.name)}</li>`)
      .join('');

    const fileAnalyses = (result.fileAnalyses || [])
      .map((file) => {
        const issues = (file.issues || [])
          .map((issue) => {
            return `
              <li>
                <b>Line ${issue.line} (${escapeHtml(issue.severity)}):</b> ${escapeHtml(issue.description)}
              </li>
            `;
          })
          .join('');

        return `
          <div class="block">
            <h3>${escapeHtml(file.fileName)}</h3>
            <p><b>Score:</b> ${file.score}% | <b>Risk:</b> ${escapeHtml(file.riskLevel)}</p>
            <p>${escapeHtml(file.summary)}</p>
            ${file.metrics ? `
              <div class="metrics">
                <span>LOC: ${file.metrics.loc}</span>
                <span>Complexity: ${file.metrics.cyclomaticComplexity}</span>
                <span>Halstead: ${file.metrics.halsteadVolume}</span>
                <span>Maintainability: ${file.metrics.maintainabilityIndex}</span>
                <span>Inheritance: ${file.metrics.depthOfInheritance}</span>
                <span>Coupling: ${file.metrics.couplingBetweenObjects}</span>
              </div>
            ` : ''}
            ${issues ? `<ul class="issues">${issues}</ul>` : ''}
          </div>
        `;
      })
      .join('');

    const systemLogs = logs
      .map((log) => `<li>${escapeHtml(log)}</li>`)
      .join('');

    return `
      <div class="report">
        <div class="header">
          <h1>AI Software Quality Report</h1>
          <div class="meta">Generated: ${new Date().toLocaleString()}</div>
          <div class="meta">Risk: ${escapeHtml(result.riskLevel)} | Score: ${result.score}/100</div>
        </div>

        <div class="section">
          <h2>Summary</h2>
          <p>${escapeHtml(result.summary)}</p>
        </div>

        <div class="section">
          <h2>Metrics</h2>
          <div class="metrics">
            <span>LOC: ${metrics.loc}</span>
            <span>Complexity: ${metrics.cyclomaticComplexity}</span>
            <span>Halstead: ${metrics.halsteadVolume}</span>
            <span>Maintainability: ${metrics.maintainabilityIndex}</span>
            <span>Inheritance: ${metrics.depthOfInheritance}</span>
            <span>Coupling: ${metrics.couplingBetweenObjects}</span>
          </div>
        </div>

        <div class="section">
          <h2>Uploaded Files</h2>
          <ul>${fileList || '<li>No files</li>'}</ul>
        </div>

        <div class="section">
          <h2>AI Recommendations</h2>
          <ul>${recommendations || '<li>No recommendations</li>'}</ul>
        </div>

        <div class="section">
          <h2>Per-file Analysis</h2>
          ${fileAnalyses || '<p>No per-file analysis</p>'}
        </div>

        <div class="section">
          <h2>System Logs</h2>
          <ul class="logs">${systemLogs || '<li>No logs</li>'}</ul>
        </div>
      </div>
    `;
  };

  const handleExportJson = () => {
    if (!result) return;
    addLog('Експорт JSON звіту...');

    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        metrics,
        analysis: result,
        uploadedFiles: uploadedFiles.map(file => file.name),
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

      addLog('JSON звіт успішно експортовано');
    } catch (err) {
      addLog('Помилка експорту JSON звіту', 'ERROR');
      console.error('JSON export failed:', err);
    }
  };

  const handleExportPdf = async () => {
    if (!result) return;
    addLog('Експорт PDF звіту...');

    let container: HTMLDivElement | null = null;

    try {
      container = document.createElement('div');
      container.innerHTML = buildReportHtml();
      container.style.position = 'fixed';
      container.style.left = '0';
      container.style.top = '0';
      container.style.width = '794px';
      container.style.minHeight = '1123px';
      container.style.opacity = '1';
      container.style.pointerEvents = 'none';
      container.style.background = '#ffffff';
      container.style.zIndex = '0';
      container.style.transform = 'translateX(-200vw)';
      document.body.appendChild(container);

      const style = document.createElement('style');
      style.textContent = `
        .report { font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5; }
        .header { padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; margin-bottom: 16px; }
        .header h1 { margin: 0 0 6px; font-size: 22px; font-weight: 700; }
        .meta { color: #475569; font-size: 12px; }
        .section { margin: 16px 0; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; }
        .section h2 { font-size: 16px; margin: 0 0 8px; font-weight: 700; letter-spacing: 0.2px; }
        .metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 12px; font-size: 12px; }
        ul { padding-left: 18px; margin: 6px 0; }
        li { margin: 4px 0; font-size: 12px; }
        .block { padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; background: #ffffff; }
        .block h3 { margin: 0 0 4px; font-size: 13px; font-weight: 700; }
        .issues { margin-top: 6px; }
        .logs { font-family: "Courier New", monospace; font-size: 11px; }
      `;
      container.appendChild(style);

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      await new Promise<void>(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const renderScale = 2;
      const blockBreaks = Array.from(container.querySelectorAll('.block, .section')).map((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const bottomPx = rect.bottom - containerRect.top;
        return Math.max(0, Math.floor(bottomPx * renderScale));
      }).filter((value, index, arr) => value > 0 && arr.indexOf(value) === index).sort((a, b) => a - b);

      const sections = Array.from(container.querySelectorAll('.section')).map((el, index) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const topPx = Math.max(0, Math.floor((rect.top - containerRect.top) * renderScale));
        const bottomPx = Math.max(0, Math.floor((rect.bottom - containerRect.top) * renderScale));
        const title = (el.querySelector('h2')?.textContent || `Section ${index + 1}`).trim();
        return { id: `section-${index}`, top: topPx, bottom: bottomPx, title };
      });

      const canvas = await html2canvas(container, {
        scale: renderScale,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight,
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const mmPerPx = imgWidth / canvas.width;
      const pageHeightPx = Math.floor((pageHeight - margin * 2) / mmPerPx);
      const continuationHeaderMm = 8;
      const continuationHeaderPx = Math.floor(continuationHeaderMm / mmPerPx);
      const startedSections = new Set<string>();

      let renderedHeight = 0;
      let pageIndex = 0;

      while (renderedHeight < canvas.height) {
        const currentSection = sections.find(section => renderedHeight >= section.top && renderedHeight < section.bottom);
        const isContinuation = currentSection ? startedSections.has(currentSection.id) : false;
        const availablePageHeightPx = pageHeightPx - (isContinuation ? continuationHeaderPx : 0);

        const desiredBreak = Math.min(renderedHeight + availablePageHeightPx, canvas.height);
        const breakCandidate = blockBreaks
          .filter((value) => value > renderedHeight && value < desiredBreak)
          .pop();
        const minPagePx = Math.floor(availablePageHeightPx * 0.5);
        const sliceHeight = breakCandidate && breakCandidate - renderedHeight >= minPagePx
          ? breakCandidate - renderedHeight
          : Math.min(availablePageHeightPx, canvas.height - renderedHeight);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            canvas,
            0,
            renderedHeight,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight
          );
        }

        let outputCanvas = pageCanvas;
        let outputHeightPx = sliceHeight;

        if (isContinuation && currentSection) {
          const headerCanvas = document.createElement('canvas');
          headerCanvas.width = pageCanvas.width;
          headerCanvas.height = sliceHeight + continuationHeaderPx;
          const headerCtx = headerCanvas.getContext('2d');
          if (headerCtx) {
            headerCtx.fillStyle = '#ffffff';
            headerCtx.fillRect(0, 0, headerCanvas.width, headerCanvas.height);
            headerCtx.fillStyle = '#0f172a';
            headerCtx.font = `${Math.max(12, Math.round(11 * renderScale))}px Arial`;
            headerCtx.textBaseline = 'top';
            headerCtx.fillText(`${currentSection.title} (продовження)`, Math.round(12 * renderScale), Math.round(4 * renderScale));
            headerCtx.drawImage(pageCanvas, 0, continuationHeaderPx);
            outputCanvas = headerCanvas;
            outputHeightPx = headerCanvas.height;
          }
        }

        const sliceData = outputCanvas.toDataURL('image/png');
        const sliceHeightMm = outputHeightPx * mmPerPx;

        if (pageIndex > 0) {
          pdf.addPage();
        }

        pdf.addImage(sliceData, 'PNG', margin, margin, imgWidth, sliceHeightMm);

        const sliceEnd = renderedHeight + sliceHeight;
        sections.forEach((section) => {
          if (section.top < sliceEnd && section.bottom > renderedHeight) {
            startedSections.add(section.id);
          }
        });

        renderedHeight += sliceHeight;
        pageIndex += 1;
      }

      pdf.save(`software-quality-report-${new Date().getTime()}.pdf`);

      addLog('PDF звіт успішно експортовано');
    } catch (err) {
      addLog('Помилка експорту PDF звіту', 'ERROR');
      console.error('PDF export failed:', err);
    } finally {
      if (container && document.body.contains(container)) {
        document.body.removeChild(container);
      }
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
    handleExportJson,
    handleExportPdf,
    MAX_CONTEXT_SIZE
  };
};
