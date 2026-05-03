import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ─── Моки зовнішніх залежностей ───────────────────────────────────────────────
vi.mock('../../../shared/api/ai/aiService', () => ({
  analyzeSourceCode: vi.fn(),
  logToBackend: vi.fn(),
}));

import { analyzeSourceCode } from '../../../shared/api/ai/aiService';
import { useFileAnalysis } from './useFileAnalysis';

// ─── Хелпери ──────────────────────────────────────────────────────────────────
function makeFile(name: string, content: string): File {
  return new File([content], name, { type: 'text/plain' });
}

function makeFileList(files: File[]): FileList {
  return {
    length: files.length,
    item: (i: number) => files[i] ?? null,
    ...files,
  } as unknown as FileList;
}

const MOCK_RESULT = {
  riskLevel: 'Low' as const,
  score: 90,
  recommendations: ['Рефактор A'],
  summary: 'Якість висока',
  timestamp: '2024-01-01T00:00:00.000Z',
  fileAnalyses: [],
  extractedMetrics: {
    loc: 200,
    cyclomaticComplexity: 3,
    halsteadVolume: 800,
    maintainabilityIndex: 90,
    depthOfInheritance: 1,
    couplingBetweenObjects: 2,
  },
};

beforeEach(() => {
  vi.clearAllMocks();

  global.fetch = vi.fn().mockResolvedValue({
    json: async () => ({
      version: '1.0.0',
      language: 'uk',
      theme: { primaryColor: 'emerald', darkMode: false },
      paths: { logFile: 'app.log', reportsDir: 'reports' },
    }),
  });

  global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = vi.fn();

  vi.mocked(analyzeSourceCode).mockResolvedValue(MOCK_RESULT);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// 1. НОРМАЛЬНІ УМОВИ
// ══════════════════════════════════════════════════════════════════════════════
describe('useFileAnalysis — нормальні умови', () => {

  it('завантажує конфіг при монтуванні та записує лог', async () => {
    const { result } = renderHook(() => useFileAnalysis());

    await waitFor(() => expect(result.current.config).not.toBeNull());

    expect(result.current.config?.version).toBe('1.0.0');
    expect(result.current.logs[0]).toContain('Конфігурацію завантажено успішно');
  });

  it('handleFileUpload — додає файли та handleAnalyze повертає результат', async () => {
    const { result } = renderHook(() => useFileAnalysis());

    await act(async () => {
      await result.current.handleFileUpload(
        makeFileList([makeFile('app.ts', 'const x = 1;')])
      );
    });

    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(result.current.uploadedFiles).toHaveLength(1);
    expect(result.current.result?.score).toBe(90);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('removeFile і clearFiles коректно змінюють список файлів', async () => {
    const { result } = renderHook(() => useFileAnalysis());

    await act(async () => {
      await result.current.handleFileUpload(
        makeFileList([makeFile('a.ts', 'a'), makeFile('b.ts', 'b')])
      );
    });

    act(() => result.current.removeFile(0));
    expect(result.current.uploadedFiles).toHaveLength(1);
    expect(result.current.uploadedFiles[0].name).toBe('b.ts');

    act(() => result.current.clearFiles());
    expect(result.current.uploadedFiles).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. ГРАНИЧНІ УМОВИ
// ══════════════════════════════════════════════════════════════════════════════
describe('useFileAnalysis — граничні умови', () => {

  it('handleFileUpload з null або порожнім списком нічого не додає', async () => {
    const { result } = renderHook(() => useFileAnalysis());

    await act(async () => { await result.current.handleFileUpload(null); });
    await act(async () => { await result.current.handleFileUpload(makeFileList([])); });

    expect(result.current.uploadedFiles).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('handleFileUpload — 151-й файл викликає помилку ліміту', async () => {
    const { result } = renderHook(() => useFileAnalysis());

    for (let batch = 0; batch < 15; batch++) {
      const files = Array.from({ length: 10 }, (_, i) =>
        makeFile(`file-${batch * 10 + i}.ts`, 'x')
      );
      await act(async () => {
        await result.current.handleFileUpload(makeFileList(files));
      });
    }

    await act(async () => {
      await result.current.handleFileUpload(makeFileList([makeFile('extra.ts', 'x')]));
    });

    expect(result.current.error).toBe('Занадто багато файлів. Ліміт: 150 файлів.');
  });

  it('handleAnalyze — аналіз без extractedMetrics не змінює поточні metrics', async () => {
    vi.mocked(analyzeSourceCode).mockResolvedValueOnce({
      ...MOCK_RESULT,
      extractedMetrics: undefined,
    });

    const { result } = renderHook(() => useFileAnalysis());
    const defaultLoc = result.current.metrics.loc;

    await act(async () => {
      await result.current.handleFileUpload(makeFileList([makeFile('a.ts', 'a')]));
    });
    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(result.current.metrics.loc).toBe(defaultLoc);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. ВИНЯТКОВІ СИТУАЦІЇ
// ══════════════════════════════════════════════════════════════════════════════
describe('useFileAnalysis — виняткові ситуації', () => {

  it('handleAnalyze без файлів встановлює помилку і не викликає API', async () => {
    const { result } = renderHook(() => useFileAnalysis());

    await act(async () => { await result.current.handleAnalyze(); });

    expect(result.current.error).toBe('Будь ласка, завантажте файли для аналізу.');
    expect(analyzeSourceCode).not.toHaveBeenCalled();
  });

  it('handleAnalyze — помилка API записується в error і скидає loading', async () => {
    vi.mocked(analyzeSourceCode).mockRejectedValueOnce(new Error('API недоступний'));

    const { result } = renderHook(() => useFileAnalysis());

    await act(async () => {
      await result.current.handleFileUpload(makeFileList([makeFile('a.ts', 'a')]));
    });
    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(result.current.error).toBe('API недоступний');
    expect(result.current.loading).toBe(false);
  });

  it('handleExport без result нічого не робить; помилка createObjectURL пишеться в лог', async () => {
    const { result } = renderHook(() => useFileAnalysis());

    // Без result — нічого не відбувається
    act(() => result.current.handleExport());
    expect(URL.createObjectURL).not.toHaveBeenCalled();

    // З result, але createObjectURL кидає помилку
    vi.mocked(URL.createObjectURL).mockImplementation(() => {
      throw new Error('blob error');
    });

    await act(async () => {
      await result.current.handleFileUpload(makeFileList([makeFile('a.ts', 'a')]));
    });
    await act(async () => { await result.current.handleAnalyze(); });
    act(() => result.current.handleExport());

    expect(result.current.logs.some(l => l.includes('Помилка експорту звіту'))).toBe(true);
  });
});