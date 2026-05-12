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
