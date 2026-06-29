import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: string[];
  current: number;
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <ol className="mb-8 flex items-center">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber < current;
        const isActive = stepNumber === current;

        return (
          <li
            key={label}
            className={cn('flex items-center', index !== steps.length - 1 && 'flex-1')}
          >
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                  isComplete && 'bg-primary text-primary-foreground',
                  isActive && 'bg-primary text-primary-foreground ring-4 ring-oxblue-100',
                  !isComplete && !isActive && 'bg-secondary text-muted-foreground',
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : stepNumber}
              </div>
              <span
                className={cn(
                  'hidden text-xs font-medium sm:block',
                  isActive || isComplete ? 'text-oxblue-900' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
            {index !== steps.length - 1 && (
              <div className={cn('mx-2 h-0.5 flex-1', isComplete ? 'bg-primary' : 'bg-border')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
