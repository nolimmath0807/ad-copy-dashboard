import { useState, useEffect } from 'react';
import { auditLogsApi } from '@/lib/api-client';
import type { AuditLog } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollText } from 'lucide-react';

const TABLE_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'checklists', label: 'Checklists' },
  { value: 'products', label: 'Products' },
  { value: 'copies', label: 'Copies' },
  { value: 'copy_types', label: 'Copy Types' },
  { value: 'teams', label: 'Teams' },
  { value: 'team_products', label: 'Team Products' },
  { value: 'best_copies', label: 'Best Copies' },
  { value: 'users', label: 'Users' },
];

const ACTION_BADGE: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [tableFilter, setTableFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const PAGE_SIZE = 50;

  const fetchLogs = async (offset = 0, append = false) => {
    setLoading(true);
    try {
      const tableName = tableFilter === 'all' ? undefined : tableFilter;
      const data = await auditLogsApi.list(tableName, PAGE_SIZE, offset);
      setLogs(prev => append ? [...prev, ...data] : data);
      setHasMore(data.length === PAGE_SIZE);
    } catch (e) {
      console.error('Failed to fetch audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(0, false);
  }, [tableFilter]);

  const filteredLogs = logs.filter(log => {
    if (startDate && log.created_at < startDate) return false;
    if (endDate && log.created_at > endDate + 'T23:59:59') return false;
    if (userFilter && !(log.user_name || '').toLowerCase().includes(userFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ScrollText className="h-6 w-6" />
          <h1 className="text-2xl font-bold">감사 로그</h1>
        </div>
        <Select value={tableFilter} onValueChange={v => setTableFilter(v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="테이블 필터" />
          </SelectTrigger>
          <SelectContent>
            {TABLE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
        <span className="self-center text-muted-foreground">~</span>
        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
        <Input placeholder="사용자 이름" value={userFilter} onChange={e => setUserFilter(e.target.value)} className="w-40" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">변경 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">시간</TableHead>
                <TableHead className="w-28">사용자</TableHead>
                <TableHead className="w-24">액션</TableHead>
                <TableHead className="w-32">테이블</TableHead>
                <TableHead className="w-28">레코드 ID</TableHead>
                <TableHead>변경 내용</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(log.created_at)}</TableCell>
                  <TableCell className="text-sm">{log.user_name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={ACTION_BADGE[log.action] || ''}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-mono">{log.table_name}</TableCell>
                  <TableCell className="text-xs font-mono truncate max-w-28">{log.record_id ? log.record_id.slice(0, 8) + '...' : '-'}</TableCell>
                  <TableCell
                    className="text-xs font-mono max-w-xs truncate cursor-pointer hover:underline"
                    onClick={() => setDetailLog(log)}
                  >
                    {log.changes ? JSON.stringify(log.changes).slice(0, 100) : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    감사 로그가 없습니다
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {hasMore && logs.length > 0 && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => fetchLogs(logs.length, true)} disabled={loading}>
                {loading ? '로딩 중...' : '더 보기'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detailLog} onOpenChange={(open) => !open && setDetailLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>변경 내용 상세</DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">시간:</span> {new Date(detailLog.created_at).toLocaleString('ko-KR')}</p>
              <p><span className="font-medium">사용자:</span> {detailLog.user_name || '-'}</p>
              <p><span className="font-medium">액션:</span> {detailLog.action}</p>
              <p><span className="font-medium">테이블:</span> {detailLog.table_name}</p>
              <p><span className="font-medium">레코드 ID:</span> {detailLog.record_id || '-'}</p>
              <pre className="bg-muted p-3 rounded-md overflow-auto max-h-64 text-xs">
                {JSON.stringify(detailLog.changes, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
