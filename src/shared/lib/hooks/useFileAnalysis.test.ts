import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ─── Моки зовнішніх залежностей ───────────────────────────────────────────────
vi.mock('../../../shared/api/ai/aiService', () => ({
  analyzeSourceCode: vi.fn(),
  logToBackend: vi.fn(),
}));

vi.mock('html2canvas', () => ({
  default: vi.fn(async () => ({
    width: 800,
    height: 1200,
    toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
  })),
}));

vi.mock('jspdf', () => {
  class MockJsPdf {
    internal = {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    };
    addImage = vi.fn();
    addPage = vi.fn();
    save = vi.fn();
  }

  let lastInstance: MockJsPdf | null = null;
  let nextSaveError: Error | null = null;

  class jsPDF {
    constructor() {
      lastInstance = new MockJsPdf();
      if (nextSaveError) {
        const err = nextSaveError;
        nextSaveError = null;
        lastInstance.save.mockImplementationOnce(() => { throw err; });
      }
      return lastInstance as unknown as jsPDF;
    }
  }

  return {
    jsPDF,
    __getLastJsPdfInstance: () => lastInstance,
    __setNextJsPdfSaveError: (error: Error) => { nextSaveError = error; }
  };
});

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

  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
  })) as unknown as HTMLCanvasElement['getContext'];
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock');

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

  it('handleExportPdf після аналізу зберігає PDF', async () => {
    const { result } = renderHook(() => useFileAnalysis());

    await act(async () => {
      await result.current.handleFileUpload(makeFileList([makeFile('app.ts', 'const x = 1;')]))
    });
    await act(async () => { await result.current.handleAnalyze(); });

    const { __getLastJsPdfInstance } = await import('jspdf');

    await act(async () => { await result.current.handleExportPdf(); });
    const pdfInstance = __getLastJsPdfInstance();
    expect(pdfInstance?.save).toHaveBeenCalledTimes(1);
  });

  it('handleExportPdf пише лог про успішний експорт', async () => {
    const { result } = renderHook(() => useFileAnalysis());

    await act(async () => {
      await result.current.handleFileUpload(makeFileList([makeFile('app.ts', 'const x = 1;')]))
    });
    await act(async () => { await result.current.handleAnalyze(); });
    await act(async () => { await result.current.handleExportPdf(); });

    expect(result.current.logs.some(l => l.includes('PDF звіт успішно експортовано'))).toBe(true);
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

  it('handleExportPdf генерує кілька сторінок для великого контенту', async () => {
    const html2canvas = (await import('html2canvas')).default as unknown as ReturnType<typeof vi.fn>;
    html2canvas.mockResolvedValueOnce({
      width: 800,
      height: 6000,
      toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
    });

    const { result } = renderHook(() => useFileAnalysis());

    await act(async () => {
      await result.current.handleFileUpload(makeFileList([makeFile('app.ts', 'const x = 1;')]))
    });
    await act(async () => { await result.current.handleAnalyze(); });
    await act(async () => { await result.current.handleExportPdf(); });

    const { __getLastJsPdfInstance } = await import('jspdf');
    const pdfInstance = __getLastJsPdfInstance();
    expect(pdfInstance?.addPage).toHaveBeenCalled();
  });

  it('handleExportPdf працює навіть коли файлАналізи порожні', async () => {
    vi.mocked(analyzeSourceCode).mockResolvedValueOnce({
      ...MOCK_RESULT,
      fileAnalyses: [],
    });

    const { result } = renderHook(() => useFileAnalysis());

    await act(async () => {
      await result.current.handleFileUpload(makeFileList([makeFile('app.ts', 'const x = 1;')]))
    });
    await act(async () => { await result.current.handleAnalyze(); });
    await act(async () => { await result.current.handleExportPdf(); });

    expect(result.current.logs.some(l => l.includes('PDF звіт успішно експортовано'))).toBe(true);
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

  it('handleExportPdf без result нічого не робить; помилка експорту пишеться в лог', async () => {
    const { result } = renderHook(() => useFileAnalysis());

    // Без result — нічого не відбувається
    await act(async () => { await result.current.handleExportPdf(); });

    await act(async () => {
      await result.current.handleFileUpload(makeFileList([makeFile('a.ts', 'a')]));
    });
    await act(async () => { await result.current.handleAnalyze(); });

    const html2canvas = (await import('html2canvas')).default as unknown as ReturnType<typeof vi.fn>;
    html2canvas.mockRejectedValueOnce(new Error('pdf error'));

    await act(async () => { await result.current.handleExportPdf(); });
    expect(result.current.logs.some(l => l.includes('Помилка експорту PDF звіту'))).toBe(true);
  });

  it('handleExportPdf фіксує помилку, якщо pdf.save кидає помилку', async () => {
    const { result } = renderHook(() => useFileAnalysis());

    await act(async () => {
      await result.current.handleFileUpload(makeFileList([makeFile('app.ts', 'const x = 1;')]))
    });
    await act(async () => { await result.current.handleAnalyze(); });

    const { __setNextJsPdfSaveError } = await import('jspdf');
    __setNextJsPdfSaveError(new Error('save failed'));

    await act(async () => { await result.current.handleExportPdf(); });
    expect(result.current.logs.some(l => l.includes('Помилка експорту PDF звіту'))).toBe(true);
  });

  it('handleExportJson без result нічого не робить; помилка експорту пишеться в лог', async () => {
    const { result } = renderHook(() => useFileAnalysis());

    // Без result — нічого не відбувається
    act(() => result.current.handleExportJson());
    expect(URL.createObjectURL).not.toHaveBeenCalled();

    // З result, але createObjectURL кидає помилку
    vi.mocked(URL.createObjectURL).mockImplementation(() => {
      throw new Error('blob error');
    });

    await act(async () => {
      await result.current.handleFileUpload(makeFileList([makeFile('a.ts', 'a')]));
    });
    await act(async () => { await result.current.handleAnalyze(); });
    act(() => result.current.handleExportJson());

    expect(result.current.logs.some(l => l.includes('Помилка експорту JSON звіту'))).toBe(true);
  });
});