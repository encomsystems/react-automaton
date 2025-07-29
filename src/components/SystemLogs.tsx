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
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {logs.map((log, index) => {            
            return (
              <div 
                key={`${log.id}-${index}`} 
                className="text-green-400 text-sm leading-relaxed animate-slide-in"
              >
                <span className="text-green-500">[{formatTime(log.timestamp)}]</span> {log.message}
              </div>
            );
          })}
        </div>
        
        {logs.length === 0 && (
          <div className="text-center py-8 text-green-400/60">
            <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Waiting for workflow to start...</p>
          </div>
        )}
      </div>
    </div>
  );
};