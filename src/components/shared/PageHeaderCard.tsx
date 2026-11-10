import type { ReactNode } from 'react';
import { Card } from './Card';

export interface PageHeaderCardProps {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  titleId?: string;
}

export function PageHeaderCard({ icon, title, description, actions, titleId }: PageHeaderCardProps) {
  return (
    <Card className="bg-gradient-to-r from-brand-pink-surface to-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="shrink-0 rounded-xl bg-brand-pink-light p-3 text-brand-highlight">{icon}</span>
          <div>
            <h2 id={titleId} className="text-lg font-bold text-brand-ink">{title}</h2>
            <p className="text-sm text-muted">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 self-start sm:self-auto">{actions}</div>
      </div>
    </Card>
  );
}
