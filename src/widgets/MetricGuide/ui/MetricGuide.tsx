import React from 'react';
import { Info } from 'lucide-react';
import { Card } from '../../../shared/ui/Card';

export const MetricGuide = () => {
  return (
    <Card padding="lg" className="mt-8">
      <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
        <Info className="w-5 h-5 text-indigo-600" />
        Довідник метрик та методологія
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-800">LOC (Lines of Code)</h4>
          <p className="text-sm text-slate-600">Кількість рядків коду. Великі модулі (&gt;500 рядків) важче тестувати та підтримувати.</p>
          <p className="text-xs text-slate-400 italic">Розрахунок: (LOC / 10) % шкали</p>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-800">Cyclomatic Complexity</h4>
          <p className="text-sm text-slate-600">Кількість лінійно незалежних шляхів через код. Значення (&gt;15) вказує на високу складність.</p>
          <p className="text-xs text-slate-400 italic">Розрахунок: Complexity * 5 % шкали</p>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-800">Maintainability Index</h4>
          <p className="text-sm text-slate-600">Індекс придатності до супроводу (0-100). Чим вище, тим легше змінювати код.</p>
          <p className="text-xs text-slate-400 italic">Розрахунок: Пряме значення індексу</p>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-800">Halstead Volume</h4>
          <p className="text-sm text-slate-600">Об'єм коду на основі кількості операторів та операндів. Вимірює інформаційну насиченість.</p>
          <p className="text-xs text-slate-400 italic">Розрахунок: Volume / 20 % шкали</p>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-800">Depth of Inheritance</h4>
          <p className="text-sm text-slate-600">Глибина ієрархії успадкування. Занадто глибоке успадкування (&gt;5) ускладнює розуміння.</p>
          <p className="text-xs text-slate-400 italic">Розрахунок: Depth * 10 % шкали</p>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-800">Coupling (CBO)</h4>
          <p className="text-sm text-slate-600">Зв'язність між об'єктами. Висока зв'язність робить код крихким при змінах.</p>
          <p className="text-xs text-slate-400 italic">Розрахунок: Coupling * 5 % шкали</p>
        </div>
      </div>
    </Card>
  );
};
