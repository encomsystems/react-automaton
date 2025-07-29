import { Info, CheckCircle, AlertTriangle, XCircle, Terminal } from 'lucide-react';
import { LogEntry } from './ClaimsPortal';
import { cn } from '@/lib/utils';

interface SystemLogsProps {
  logs: LogEntry[];
}

const iconMap = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const colorMap = {
  info: 'text-blue-500',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
};

const bgMap = {
  info: 'bg-blue-500/10 border-blue-500/20',
  success: 'bg-success/10 border-success/20',
  warning: 'bg-warning/10 border-warning/20',
  error: 'bg-destructive/10 border-destructive/20',
};

export const SystemLogs = ({ logs }: SystemLogsProps) => {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center space-x-2">
        <Terminal className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">System Logs</h3>
      </div>

      <div className="bg-black rounded-lg p-4 shadow-medium border font-mono text-sm">
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {logs.map((log) => {
            const Icon = iconMap[log.type];
            
            return (
              <div 
                key={log.id} 
                className={cn(
                  "flex items-start space-x-3 p-2 rounded border transition-all duration-300",
                  bgMap[log.type],
                  "animate-slide-in"
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <Icon className={cn("h-4 w-4", colorMap[log.type])} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-1">
                    <span className={cn("font-medium", colorMap[log.type])}>
                      [{log.type.toUpperCase()}]
                    </span>
                    <span>{formatTime(log.timestamp)}</span>
                  </div>
                  <p className="text-foreground text-sm leading-relaxed">
                    {log.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        {logs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No system logs yet</p>
          </div>
        )}
      </div>
    </div>
  );
};