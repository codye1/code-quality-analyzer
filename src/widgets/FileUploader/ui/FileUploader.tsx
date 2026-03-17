import React from 'react';
import { Layout, Upload, FileCode, FolderOpen, X, Activity, RefreshCw } from 'lucide-react';
import { cn } from '../../../shared/lib/utils/cn';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';

interface FileUploaderProps {
  uploadedFiles: { name: string, content: string }[];
  isDragging: boolean;
  loading: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  handleFileUpload: (files: FileList | null) => void;
  clearFiles: () => void;
  removeFile: (index: number) => void;
  handleAnalyze: () => void;
  maxContextSize: number;
}

export const FileUploader = ({
  uploadedFiles,
  isDragging,
  loading,
  onDragOver,
  onDragLeave,
  onDrop,
  handleFileUpload,
  clearFiles,
  removeFile,
  handleAnalyze,
  maxContextSize
}: FileUploaderProps) => {
  const currentTotalSize = uploadedFiles.reduce((acc, f) => acc + f.content.length, 0);

  return (
    <Card className="space-y-6">
      <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
        <Layout className="w-5 h-5 text-emerald-600" />
        Вхідні дані
      </h2>

      <div className="mb-8 space-y-4">
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center text-center gap-3",
            isDragging ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-emerald-400 hover:bg-slate-50"
          )}
        >
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Завантажте код</p>
            <p className="text-xs text-slate-400 mt-1">Перетягніть файли або папку сюди</p>
          </div>
          
          <div className="flex gap-2 mt-2">
            <label className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5" />
              Файли
              <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
            </label>
            <label className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              Папка
              <input 
                type="file" 
                multiple 
                // @ts-ignore
                webkitdirectory="" 
                directory="" 
                className="hidden" 
                onChange={(e) => handleFileUpload(e.target.files)} 
              />
            </label>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="w-full mt-4 space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Використання контексту</span>
                <span>
                  {(currentTotalSize / 1024).toFixed(1)} / {(maxContextSize / 1024).toFixed(0)} KB
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500",
                    (currentTotalSize / maxContextSize) > 0.9 ? "bg-red-500" :
                    (currentTotalSize / maxContextSize) > 0.7 ? "bg-amber-500" :
                    "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min((currentTotalSize / maxContextSize) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {uploadedFiles.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Завантажено: {uploadedFiles.length}
              </span>
              <button 
                onClick={clearFiles}
                className="text-xs text-red-500 hover:text-red-600 font-medium"
              >
                Очистити
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {uploadedFiles.map((file, i) => (
                <div key={i} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100 text-[10px]">
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className="w-3 h-3 text-emerald-500" />
                    <span className="truncate font-medium text-slate-700">{file.name}</span>
                  </div>
                  <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button
        onClick={handleAnalyze}
        disabled={loading || uploadedFiles.length === 0}
        loading={loading}
        className="w-full mt-8"
        icon={!loading && <Activity className="w-5 h-5" />}
      >
        {loading ? 'Аналізуємо...' : 'Запустити AI Аналіз'}
      </Button>
    </Card>
  );
};
