import React from 'react';
import { CheckCircle, Info, AlertTriangle, ShieldAlert, Activity } from 'lucide-react';
import { Badge } from '../../../shared/ui/Badge';

interface RiskBadgeProps {
  level: string;
  showIcon?: boolean;
}

export const RiskBadge = ({ level, showIcon = true }: RiskBadgeProps) => {
  const getRiskVariant = (level: string) => {
    switch (level) {
      case 'Low': return 'success';
      case 'Medium': return 'warning';
      case 'High': return 'error';
      case 'Critical': return 'error';
      default: return 'neutral';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'Low': return <CheckCircle className="w-4 h-4" />;
      case 'Medium': return <Info className="w-4 h-4" />;
      case 'High': return <AlertTriangle className="w-4 h-4" />;
      case 'Critical': return <ShieldAlert className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <Badge variant={getRiskVariant(level)}>
      {showIcon && getRiskIcon(level)}
      Ризик: {level}
    </Badge>
  );
};
