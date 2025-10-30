/**
 * Recurring Payment Timer Control Panel
 *
 * UI component to control the recurring payment timer service
 * Add this to your dashboard or settings page
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useRecurringPaymentTimer } from '../hooks/useRecurringPaymentTimer';
import { PlayIcon, StopIcon, RefreshCwIcon, TrashIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function RecurringPaymentTimerPanel() {
  const {
    isRunning,
    lastCheckTime,
    executionHistory,
    error,
    isConnected,
    start,
    stop,
    refreshStatus,
    clearHistory,
  } = useRecurringPaymentTimer();

  const recentExecutions = executionHistory.slice(-5).reverse();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recurring Payment Timer</CardTitle>
            <CardDescription>
              Automated payment execution service running in your browser
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isRunning ? 'default' : 'secondary'}>
              {isRunning ? '🟢 Active' : '⚪ Stopped'}
            </Badge>
            {isConnected && (
              <Badge variant="outline">
                Wallet Connected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Wallet Connection Status */}
        {!isConnected && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
            ℹ️ Connect your wallet to enable automated payments
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={start}
            disabled={isRunning || !isConnected}
            variant="default"
            size="sm"
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            Start Timer
          </Button>

          <Button
            onClick={stop}
            disabled={!isRunning}
            variant="destructive"
            size="sm"
          >
            <StopIcon className="h-4 w-4 mr-2" />
            Stop Timer
          </Button>

          <Button
            onClick={refreshStatus}
            variant="outline"
            size="sm"
          >
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          {executionHistory.length > 0 && (
            <Button
              onClick={clearHistory}
              variant="ghost"
              size="sm"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Clear History
            </Button>
          )}
        </div>

        {/* Status Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">Status</div>
            <div className="font-medium">
              {isRunning ? 'Checking every 60 seconds' : 'Not running'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground">Last Check</div>
            <div className="font-medium">
              {lastCheckTime > 0
                ? formatDistanceToNow(lastCheckTime, { addSuffix: true })
                : 'Never'}
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md space-y-2">
          <div className="font-medium text-blue-900 text-sm">💡 How it works</div>
          <ul className="text-blue-800 text-xs space-y-1 list-disc list-inside">
            <li>Checks ICP timer every 60 seconds for due payments</li>
            <li>Gets cryptographic signatures from ICP canister</li>
            <li>Executes payments directly to Solana blockchain</li>
            <li>All transactions are cryptographically verified on-chain</li>
            <li>Runs in your browser - fully decentralized!</li>
          </ul>
        </div>

        {/* Execution History */}
        {recentExecutions.length > 0 && (
          <div className="space-y-2">
            <div className="font-medium text-sm">Recent Executions</div>
            <div className="space-y-2">
              {recentExecutions.map((execution, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-2 bg-muted rounded-md text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={execution.success ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {execution.success ? '✓' : '✗'}
                      </Badge>
                      <span className="font-mono text-xs truncate">
                        {execution.subscriptionId.slice(0, 12)}...
                      </span>
                    </div>
                    {execution.txSignature && (
                      <div className="mt-1 text-muted-foreground">
                        <a
                          href={`https://explorer.solana.com/tx/${execution.txSignature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          View transaction ↗
                        </a>
                      </div>
                    )}
                    {execution.error && (
                      <div className="mt-1 text-red-600">
                        {execution.error}
                      </div>
                    )}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {formatDistanceToNow(execution.timestamp, { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
            {executionHistory.length > 5 && (
              <div className="text-xs text-muted-foreground text-center">
                Showing 5 of {executionHistory.length} executions
              </div>
            )}
          </div>
        )}

        {/* No History */}
        {isRunning && executionHistory.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-4">
            No payments executed yet. Timer is monitoring...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
