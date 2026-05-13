## 1. ENTRY POINT
### 1.1 main.tsx - Application Bootstrap
Точка входу React додатка. Ініціалізує React 19 з StrictMode для
виявлення проблем.
```typescript
import { StrictMode } from react;
import { createRoot } from react-dom/client;
import App from ./app/App.tsx;
import ./index.css;
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

```
### 1.2 App.tsx - Root Component
Кореневий компонент додатка. Рендерить головну сторінку.
```typescript
// src/app/App.tsx
// ============================================================
// КОРЕНЕВИЙ КОМПОНЕНТ
// Основний компонент приложения, який рендерить MainPage
// ============================================================
import React from react;
import { MainPage } from ../pages/MainPage/ui/MainPage;
## 1. ENTRY POINT
### 1.1 main.tsx - Application Bootstrap
Точка входу React додатка. Ініціалізує StrictMode та підключає App.
```typescript
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './app/App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
```
### 1.2 App.tsx - Root Component
Кореневий компонент додатка. Рендерить головну сторінку.
```typescript
import React from 'react';
import { MainPage } from '../pages/MainPage/ui/MainPage';

export default function App() {
	return <MainPage />;
}
```
---
## 2. MAIN APPLICATION
### 2.1 MainPage.tsx - Main Page Component
Основна сторінка з макетом "2 колони". Додає модальне вікно перегляду коду,
передає експорти JSON/PDF та керує станами через хук.
```typescript
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
		handleExportJson,
		handleExportPdf,
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
								handleExportJson={handleExportJson}
								handleExportPdf={handleExportPdf}
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
```
---
## 3. DOMAIN MODELS (TYPES)
### 3.1 types.ts - Type Definitions
Типові визначення для всієї системи. Забезпечує типобезпечність.
```typescript
export interface AppConfig {
	version: string;
	language: string;
	theme: {
		primaryColor: string;
		darkMode: boolean;
	};
	paths: {
		logFile: string;
		reportsDir: string;
	};
}

export interface SoftwareMetrics {
	loc: number; // Lines of Code
	cyclomaticComplexity: number;
	halsteadVolume: number;
	maintainabilityIndex: number;
	depthOfInheritance: number;
	couplingBetweenObjects: number;
	explanations?: {
		loc?: string;
		cyclomaticComplexity?: string;
		halsteadVolume?: string;
		maintainabilityIndex?: string;
		depthOfInheritance?: string;
		couplingBetweenObjects?: string;
	};
}

export interface CodeIssue {
	line: number;
	description: string;
	severity: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface FileAnalysis {
	fileName: string;
	score: number;
	riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
	summary: string;
	issues?: CodeIssue[];
	metrics?: SoftwareMetrics;
}

export interface AnalysisResult {
	riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
	score: number;
	recommendations: string[];
	summary: string;
	timestamp: string;
	fileAnalyses?: FileAnalysis[];
	extractedMetrics?: SoftwareMetrics;
}
```
---
## 4. CUSTOM HOOKS
### 4.1 useFileAnalysis.ts - Main State Management Hook
Центральний хук для управління станом аналізу файлів, логуванням та експортом JSON/PDF.
```typescript
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
```
---
## 5. AI SERVICE INTEGRATION
### 5.1 aiService.ts - Integration with Google Gemini API
Сервіс для інтеграції з Google Gemini API та аналізу коду, з нормалізацією метрик та fallback-агрегацією.
```typescript
import { GoogleGenAI } from "@google/genai";
import { SoftwareMetrics, AnalysisResult, FileAnalysis } from "../../../entities/Analysis/model/types";

const modelToUse = "gemini-2.5-flash-lite"
//"gemini-3.1-pro-preview"
//"gemini-2.5-flash"

const normalizeNumber = (value: unknown) => {
	if (typeof value === 'number') return value;
	if (typeof value === 'string') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
};

const normalizeMetrics = (metrics: any): SoftwareMetrics => ({
	loc: normalizeNumber(metrics?.loc),
	cyclomaticComplexity: normalizeNumber(metrics?.cyclomaticComplexity),
	halsteadVolume: normalizeNumber(metrics?.halsteadVolume),
	maintainabilityIndex: normalizeNumber(metrics?.maintainabilityIndex),
	depthOfInheritance: normalizeNumber(metrics?.depthOfInheritance),
	couplingBetweenObjects: normalizeNumber(metrics?.couplingBetweenObjects),
});

const metricsAreEmpty = (metrics?: SoftwareMetrics) => {
	if (!metrics) return true;
	const values = [
		metrics.loc,
		metrics.cyclomaticComplexity,
		metrics.halsteadVolume,
		metrics.maintainabilityIndex,
		metrics.depthOfInheritance,
		metrics.couplingBetweenObjects,
	];
	return values.every(value => value === 0 || !Number.isFinite(value));
};

export async function analyzeSoftwareQuality(metrics: SoftwareMetrics): Promise<AnalysisResult> {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) throw new Error("API ключ не налаштовано.");
	const ai = new GoogleGenAI({ apiKey });

	const prompt = `
		Analyze the following software metrics and determine the risk level of defects in the module.
		Metrics:
		- Lines of Code (LOC): ${metrics.loc}
		- Cyclomatic Complexity: ${metrics.cyclomaticComplexity}
		- Halstead Volume: ${metrics.halsteadVolume}
		- Maintainability Index: ${metrics.maintainabilityIndex}
		- Depth of Inheritance: ${metrics.depthOfInheritance}
		- Coupling Between Objects: ${metrics.couplingBetweenObjects}

		IMPORTANT: All text in the response (summary, recommendations, explanations) MUST be in UKRAINIAN language.

		Provide a JSON response with:
		- riskLevel: 'Low', 'Medium', 'High', or 'Critical'
		- score: a quality score from 0 to 100
		- recommendations: an array of strings with specific advice
		- summary: a brief summary of the findings
		- metricExplanations: an object with keys matching the metrics above, explaining WHY each value was assigned and what it means for this specific code.

		CRITICAL: Ensure the riskLevel is consistent with the score (e.g., score > 80 should usually be 'Low' or 'Medium' risk, score < 40 should be 'High' or 'Critical').
	`;

	try {

		const response = await ai.models.generateContent({
			model: modelToUse,
			contents: prompt,
			config: {
				responseMimeType: "application/json",
				systemInstruction: "Ти — професійний аудитор якості ПЗ. Надай детальний аналіз метрик українською мовою. Поясни кожне значення метрики в контексті ризиків."
			},
		});

		const result = JSON.parse(response.text || "{}");
		return {
			riskLevel: typeof result.riskLevel === 'string' ? result.riskLevel : 'Low',
			score: typeof result.score === 'number' ? result.score : 0,
			recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
			summary: typeof result.summary === 'string' ? result.summary : 'Аналіз завершено.',
			timestamp: new Date().toISOString(),
			extractedMetrics: {
				...metrics,
				explanations: result.metricExplanations
			}
		};
	} catch (error) {
		console.error("AI Analysis failed:", error);
		throw new Error("Failed to analyze software quality");
	}
}

export async function analyzeSourceCode(
	files: { name: string, content: string }[],
	onLog?: (msg: string, level?: 'INFO' | 'ERROR' | 'WARN') => void
): Promise<AnalysisResult> {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		if (onLog) onLog("Помилка: API ключ Gemini не знайдено. Перевірте налаштування секретів.", 'ERROR');
		throw new Error("API ключ не налаштовано.");
	}
	const ai = new GoogleGenAI({ apiKey });
	// Constants for chunking
	const MAX_FILES_PER_CHUNK = 10;
	const MAX_CHARS_PER_CHUNK = 150000;

	// Split files into chunks
	const chunks: { name: string, content: string }[][] = [];
	let currentChunk: { name: string, content: string }[] = [];
	let currentChunkChars = 0;

	files.forEach(file => {
		const fileChars = file.content.length;
		if (currentChunk.length >= MAX_FILES_PER_CHUNK || (currentChunkChars + fileChars > MAX_CHARS_PER_CHUNK && currentChunk.length > 0)) {
			chunks.push(currentChunk);
			currentChunk = [];
			currentChunkChars = 0;
		}
		currentChunk.push(file);
		currentChunkChars += fileChars;
	});
	if (currentChunk.length > 0) chunks.push(currentChunk);

	if (onLog) onLog(`Проект розділено на ${chunks.length} частин для стабільного аналізу.`, 'INFO');

	const allFileAnalyses: FileAnalysis[] = [];

	// Process each chunk
	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i];
		if (onLog) onLog(`Аналіз частини ${i + 1} з ${chunks.length} (${chunk.length} файлів)...`, 'INFO');

		const codeContext = chunk.map(f => {
			const linesWithNumbers = f.content.split('\n').map((line, i) => `${i + 1}: ${line}`).join('\n');
			return `File: ${f.name}\nContent (with line numbers):\n${linesWithNumbers}`;
		}).join('\n\n');

		const chunkPrompt = `
			Analyze the following source code files and determine the software quality metrics and risk level of defects.

			IMPORTANT: All text in the response MUST be in UKRAINIAN language.

			Code Context (Chunk ${i + 1}/${chunks.length}):
			${codeContext}

			Provide a JSON response with:
			- fileAnalyses: an array of objects for EVERY SINGLE FILE provided in this chunk:
					{
						fileName: string,
						score: number,
						riskLevel: 'Low', 'Medium', 'High', or 'Critical',
						summary: string,
						issues: array of { line: number, description: string, severity: 'Low', 'Medium', 'High', or 'Critical' },
						metrics: { loc: number, cyclomaticComplexity: number, halsteadVolume: number, maintainabilityIndex: number, depthOfInheritance: number, couplingBetweenObjects: number }
					}

			CRITICAL INSTRUCTIONS:
			1. If the score is less than 90, you MUST provide specific 'issues' with line numbers.
			2. Use the EXACT line numbers provided in the 'Content (with line numbers)' section.
			3. Ensure the JSON is complete and not truncated.
		`;

		try {
			const response = await ai.models.generateContent({
				model: modelToUse,
				contents: chunkPrompt,
				config: {
					responseMimeType: "application/json",
					systemInstruction: "You are a professional software quality auditor. Analyze code for defects, complexity, and maintainability. Always respond in valid JSON format as requested. All descriptive text must be in Ukrainian."
				},
			});

			const rawText = response.text;
			if (!rawText || rawText.trim() === "" || rawText.trim() === "{}") {
				if (onLog) onLog(`Попередження: Частина ${i + 1} повернула порожню відповідь.`, 'WARN');
				continue;
			}

			let chunkResult: any;
			try {
				chunkResult = JSON.parse(rawText);
			} catch (e) {
				const jsonMatch = rawText.match(/\{[\s\S]*\}/);
				if (jsonMatch) chunkResult = JSON.parse(jsonMatch[0]);
				else throw new Error("Invalid JSON");
			}

			if (Array.isArray(chunkResult.fileAnalyses)) {
				chunkResult.fileAnalyses.forEach((f: any) => {
					allFileAnalyses.push({
						...f,
						score: typeof f.score === 'number' ? f.score : parseInt(String(f.score || '0')),
						issues: Array.isArray(f.issues) ? f.issues : [],
						metrics: f.metrics ? normalizeMetrics(f.metrics) : undefined
					});
				});
			}
		} catch (error) {
			if (onLog) onLog(`Помилка при аналізі частини ${i + 1}: ${error instanceof Error ? error.message : String(error)}`, 'ERROR');
		}
	}

	if (allFileAnalyses.length === 0) {
		throw new Error("Не вдалося проаналізувати жодного файлу. Спробуйте завантажити менше файлів або перевірте з'єднання.");
	}

	// Final step: Global Analysis based on aggregated results
	if (onLog) onLog(`Формування фінального звіту на основі ${allFileAnalyses.length} проаналізованих файлів...`, 'INFO');

	const summariesForFinal = allFileAnalyses.map(f =>
		`File: ${f.fileName}, Score: ${f.score}, Risk: ${f.riskLevel}, Summary: ${f.summary}`
	).join('\n');

	const finalPrompt = `
		Based on the following individual file analyses, provide a global software quality report for the entire project.

		Individual File Summaries:
		${summariesForFinal.slice(0, 50000)}

		IMPORTANT: All text in the response MUST be in UKRAINIAN language.

		Provide a JSON response with:
		- riskLevel: 'Low', 'Medium', 'High', or 'Critical' (overall project risk)
		- score: a quality score from 0 to 100 (overall project score)
		- recommendations: an array of at least 8-10 detailed strings with specific advice for the whole project
		- summary: a comprehensive summary of the project's quality (overall)
		- extractedMetrics: { loc: number, cyclomaticComplexity: number, halsteadVolume: number, maintainabilityIndex: number, depthOfInheritance: number, couplingBetweenObjects: number }
	`;

	try {
		const finalResponse = await ai.models.generateContent({
			model: modelToUse,
			contents: finalPrompt,
			config: {
				responseMimeType: "application/json",
				systemInstruction: "You are a lead software architect. Summarize multiple file analyses into a single comprehensive project report. Always respond in valid JSON format. All descriptive text must be in Ukrainian."
			},
		});

		const finalRawText = finalResponse.text || "{}";
		let finalResult: any;
		try {
			finalResult = JSON.parse(finalRawText);
		} catch (e) {
			const jsonMatch = finalRawText.match(/\{[\s\S]*\}/);
			if (jsonMatch) finalResult = JSON.parse(jsonMatch[0]);
			else finalResult = {};
		}

		const aggregated = allFileAnalyses.reduce((acc: SoftwareMetrics, file: FileAnalysis) => {
			if (file.metrics) {
				acc.loc += file.metrics.loc || 0;
				acc.cyclomaticComplexity = Math.max(acc.cyclomaticComplexity, file.metrics.cyclomaticComplexity || 0);
				acc.halsteadVolume += file.metrics.halsteadVolume || 0;
				acc.maintainabilityIndex = acc.maintainabilityIndex === 0
					? (file.metrics.maintainabilityIndex || 0)
					: (acc.maintainabilityIndex + (file.metrics.maintainabilityIndex || 0)) / 2;
				acc.depthOfInheritance = Math.max(acc.depthOfInheritance, file.metrics.depthOfInheritance || 0);
				acc.couplingBetweenObjects = Math.max(acc.couplingBetweenObjects, file.metrics.couplingBetweenObjects || 0);
			}
			return acc;
		}, { loc: 0, cyclomaticComplexity: 0, halsteadVolume: 0, maintainabilityIndex: 0, depthOfInheritance: 0, couplingBetweenObjects: 0 });

		const normalizedFinalMetrics = finalResult.extractedMetrics
			? normalizeMetrics(finalResult.extractedMetrics)
			: undefined;

		if (!normalizedFinalMetrics || metricsAreEmpty(normalizedFinalMetrics)) {
			finalResult.extractedMetrics = aggregated;
		} else {
			finalResult.extractedMetrics = normalizedFinalMetrics;
		}

		return {
			riskLevel: typeof finalResult.riskLevel === 'string' ? finalResult.riskLevel : 'Low',
			score: typeof finalResult.score === 'number' ? finalResult.score : parseInt(String(finalResult.score || '0')),
			recommendations: Array.isArray(finalResult.recommendations) ? finalResult.recommendations : [],
			summary: typeof finalResult.summary === 'string' ? finalResult.summary : 'Аналіз завершено успішно.',
			fileAnalyses: allFileAnalyses,
			extractedMetrics: finalResult.extractedMetrics,
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		if (onLog) onLog(`Помилка при формуванні фінального звіту. Використовуються агреговані дані.`, 'WARN');

		// Fallback: return aggregated data if final call fails
		const avgScore = Math.round(allFileAnalyses.reduce((acc, f) => acc + f.score, 0) / allFileAnalyses.length);
		return {
			riskLevel: avgScore > 80 ? 'Low' : avgScore > 60 ? 'Medium' : avgScore > 40 ? 'High' : 'Critical',
			score: avgScore,
			recommendations: ["Рекомендації недоступні через помилку фінального аналізу.", "Перевірте окремі файли на наявність проблем."],
			summary: "Аналіз завершено частково. Фінальний звіт не вдалося сформувати, але доступні дані по окремих файлах.",
			fileAnalyses: allFileAnalyses,
			timestamp: new Date().toISOString(),
		};
	}
}

export async function logToBackend(message: string, level: 'INFO' | 'ERROR' | 'WARN' = 'INFO') {
	try {
		await fetch('/api/log', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message, level }),
		});
	} catch (e) {
		console.error("Failed to log to backend", e);
	}
}
```