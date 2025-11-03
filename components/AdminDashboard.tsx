"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchAdminLogs, type LLMLogEntry } from "@/lib/admin-logger"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"

interface AdminDashboardProps {
  userId: string
  onClose: () => void
}

export default function AdminDashboard({ userId, onClose }: AdminDashboardProps) {
  const [logs, setLogs] = useState<LLMLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState<'all' | 'error' | 'response' | 'request'>('all')

  useEffect(() => {
    loadLogs()
  }, [userId])

  const loadLogs = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const fetchedLogs = await fetchAdminLogs(userId, 200)
      setLogs(fetchedLogs)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "Unknown"
    if (timestamp.toDate) {
      // Firestore Timestamp
      return timestamp.toDate().toLocaleString()
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString()
    }
    return "Invalid date"
  }

  const filteredLogs = logs.filter(log => {
    if (filterType === 'all') return true
    return log.type === filterType
  })

  const errorLogs = logs.filter(log => log.type === 'error')
  const responseLogs = logs.filter(log => log.type === 'response')
  const requestLogs = logs.filter(log => log.type === 'request')

  return (
    <div className="fixed inset-0 z-50 bg-background/80 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Admin Dashboard - LLM Logs</CardTitle>
              <CardDescription>
                View detailed logs of LLM requests, responses, and errors
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadLogs} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mb-4 flex gap-4 items-center">
            <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)}>
              <TabsList>
                <TabsTrigger value="all">
                  All ({logs.length})
                </TabsTrigger>
                <TabsTrigger value="error">
                  Errors ({errorLogs.length})
                </TabsTrigger>
                <TabsTrigger value="response">
                  Responses ({responseLogs.length})
                </TabsTrigger>
                <TabsTrigger value="request">
                  Requests ({requestLogs.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No logs found</AlertTitle>
              <AlertDescription>
                {filterType === 'all' 
                  ? "No logs have been recorded yet. Try analyzing a sentence to generate logs."
                  : `No ${filterType} logs found.`}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4">
              {filteredLogs.map((log, index) => {
                const logId = log.id || `${log.timestamp?.toMillis?.() || index}-${log.type}`
                const isExpanded = expandedLogs.has(logId)
                const isError = log.type === 'error' || log.error

                return (
                  <Card key={logId} className={isError ? "border-red-500" : ""}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={isError ? "destructive" : log.type === 'response' ? "default" : "secondary"}>
                            {log.type}
                          </Badge>
                          <Badge variant="outline">
                            {log.endpoint}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLogExpansion(logId)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="space-y-4">
                        {log.requestData && (
                          <div>
                            <h4 className="font-semibold mb-2">Request Data</h4>
                            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                              {JSON.stringify(log.requestData, null, 2)}
                            </pre>
                          </div>
                        )}

                        {log.error && (
                          <div>
                            <h4 className="font-semibold mb-2 text-red-500">Error</h4>
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md space-y-2">
                              <div>
                                <span className="font-semibold">Message: </span>
                                <span>{log.error.message}</span>
                              </div>
                              {log.error.stack && (
                                <div>
                                  <span className="font-semibold">Stack: </span>
                                  <pre className="text-xs mt-1 overflow-x-auto">
                                    {log.error.stack}
                                  </pre>
                                </div>
                              )}
                              {log.error.details && (
                                <div>
                                  <span className="font-semibold">Details: </span>
                                  <pre className="text-xs mt-1 overflow-x-auto">
                                    {JSON.stringify(log.error.details, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {log.responseData && (
                          <div>
                            <h4 className="font-semibold mb-2">Response Data</h4>
                            {log.responseData.rawFunctionArguments && (
                              <div className="mb-2">
                                <span className="font-semibold">Raw Function Arguments: </span>
                                <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto mt-1">
                                  {typeof log.responseData.rawFunctionArguments === 'string'
                                    ? log.responseData.rawFunctionArguments
                                    : JSON.stringify(log.responseData.rawFunctionArguments, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.responseData.parsedBeforeValidation && (
                              <div className="mb-2">
                                <span className="font-semibold">Parsed Before Validation: </span>
                                <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto mt-1">
                                  {JSON.stringify(log.responseData.parsedBeforeValidation, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.responseData.responseTime !== undefined && (
                              <div className="text-sm text-muted-foreground">
                                Response Time: {log.responseData.responseTime}ms
                              </div>
                            )}
                          </div>
                        )}

                        {log.metadata && (
                          <div>
                            <h4 className="font-semibold mb-2">Metadata</h4>
                            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

