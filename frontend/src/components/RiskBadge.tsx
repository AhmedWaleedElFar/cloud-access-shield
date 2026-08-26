import type { RiskLevel } from '@shared/types';

interface RiskBadgeProps {
  level: RiskLevel | undefined;
  className?: string;
}

const styles: Record<RiskLevel, string> = {
  HIGH: 'bg-red-100 text-red-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-green-100 text-green-800',
};

const labels: Record<RiskLevel, string> = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
};

export default function RiskBadge({ level, className = '' }: RiskBadgeProps) {
  const style = level ? styles[level] : 'bg-gray-100 text-gray-800';
  const label = level ? labels[level] : 'UNKNOWN';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style} ${className}`}>
      {label}
    </span>
  );
}
