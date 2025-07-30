import { Check, Play, Upload, Package, MessageSquare, CheckCircle, X } from 'lucide-react';
import { ClaimStep } from './XFXPortal';
import { cn } from '@/lib/utils';

interface SidebarProps {
  steps: ClaimStep[];
  currentStep: string;
  onStepClick: (stepId: string) => void;
}

const iconMap = {
  play: Play,
  upload: Upload,
  package: Package,
  'message-square': MessageSquare,
  'check-circle': CheckCircle,
};

export const Sidebar = ({ steps, currentStep, onStepClick }: SidebarProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Claim Status Card */}
      <div className="rounded-lg bg-gradient-card p-6 shadow-medium border">
        <h2 className="text-lg font-semibold text-foreground mb-2">Invoice workflow status</h2>
        <p className="text-sm text-muted-foreground">Track your progress</p>
        
        <div className="mt-4 space-y-3">
          {steps.map((step, index) => {
            const Icon = iconMap[step.icon as keyof typeof iconMap];
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';
            const isPending = step.status === 'pending';
            const isError = step.status === 'error';
            
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center p-3 rounded-lg transition-all duration-300 cursor-pointer",
                  isCompleted && "bg-success/10 border border-success/20",
                  isCurrent && "bg-primary/10 border border-primary/30 shadow-glow",
                  isPending && "bg-muted/50 border border-border",
                  isError && "bg-destructive/10 border border-destructive/20",
                  "hover:scale-105 hover:shadow-medium"
                )}
                onClick={() => onStepClick(step.id)}
              >
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full mr-3 transition-colors",
                  isCompleted && "bg-success text-success-foreground",
                  isCurrent && "bg-primary text-primary-foreground animate-pulse-glow",
                  isPending && "bg-muted text-muted-foreground",
                  isError && "bg-destructive text-destructive-foreground"
                )}>
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : isError ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className={cn(
                    "text-sm font-medium",
                    isCompleted && "text-success",
                    isCurrent && "text-primary",
                    isPending && "text-muted-foreground",
                    isError && "text-destructive"
                  )}>
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                </div>
                
                {isCurrent && (
                  <div className="ml-2">
                    <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};