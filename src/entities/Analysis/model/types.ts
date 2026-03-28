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
