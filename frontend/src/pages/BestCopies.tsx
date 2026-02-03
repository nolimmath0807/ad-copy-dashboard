import { useEffect, useState, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { adPerformanceApi, checklistsApi, userPreferencesApi } from '@/lib/api-client';
import type { AdPerformance, Checklist } from '@/types';
import { Trophy, Settings2, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const ALL_COLUMNS = [
  { key: 'product', label: '상품' },
  { key: 'copy_type', label: '원고 유형' },
  { key: 'utm_code', label: 'UTM코드' },
  { key: 'impressions', label: '노출' },
  { key: 'clicks', label: '클릭' },
  { key: 'cpc', label: 'CPC' },
  { key: 'ctr', label: 'CTR' },
  { key: 'spend', label: '광고비' },
  { key: 'conversions', label: '전환수' },
  { key: 'revenue', label: '매출액' },
  { key: 'roas', label: 'ROAS' },
] as const;

type ColumnKey = (typeof ALL_COLUMNS)[number]['key'];

const DEFAULT_COLUMNS: ColumnKey[] = ALL_COLUMNS.map(c => c.key);


interface TableRowData {
  id: string;
  product: string;
  copy_type: string;
  utm_code: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  revenue: number;
  conversions: number;
  roas: number;
}

type SortDir = 'asc' | 'desc';

function generateMonthOptions() {
  const options: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    options.push(`${year}-${month}`);
  }
  return options;
}

function formatMonth(month: string) {
  const [year, m] = month.split('-');
  return `${year}년 ${parseInt(m)}월`;
}

const currencyFmt = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

function formatCell(key: ColumnKey, value: string | number): string {
  if (typeof value === 'string') return value;
  switch (key) {
    case 'spend':
    case 'revenue':
    case 'cpc':
      return currencyFmt.format(value);
    case 'ctr':
    case 'roas':
      return `${value}%`;
    case 'impressions':
    case 'clicks':
    case 'conversions':
      return value.toLocaleString();
    default:
      return String(value);
  }
}

function parseUtmCodes(utmCode: string | null): string[] {
  if (!utmCode) return [];
  try {
    const parsed = JSON.parse(utmCode);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === 'string') return [parsed];
  } catch {
    if (utmCode) return [utmCode];
  }
  return [];
}

function loadColumnPrefs(): ColumnKey[] {
  // Sync fallback from localStorage while API loads
  try {
    const raw = localStorage.getItem('bestCopiesColumns');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_COLUMNS;
}

function saveColumnPrefs(cols: ColumnKey[]) {
  localStorage.setItem('bestCopiesColumns', JSON.stringify(cols));
  userPreferencesApi.update({ bestCopiesColumns: cols }).catch(() => {});
}

export function BestCopies() {
  const [rows, setRows] = useState<TableRowData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(loadColumnPrefs);
  const [sortKey, setSortKey] = useState<ColumnKey>('revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    userPreferencesApi.get().then(data => {
      const saved = data?.preferences?.bestCopiesColumns;
      if (Array.isArray(saved) && saved.length > 0) {
        setVisibleColumns(saved as ColumnKey[]);
        localStorage.setItem('bestCopiesColumns', JSON.stringify(saved));
      }
    }).catch(() => {});
  }, []);

  const monthOptions = generateMonthOptions();

  const toggleColumn = useCallback((key: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => saveColumnPrefs(next), 500);
      return next;
    });
  }, []);

  const handleSort = useCallback((key: ColumnKey) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('desc');
      return key;
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  async function fetchData() {
    setLoading(true);
    const checklists = await checklistsApi.listWithUtm();

    const utmMap = new Map<string, { utmCode: string; checklist: Checklist }>();
    for (const cl of checklists) {
      const codes = parseUtmCodes(cl.utm_code);
      for (const code of codes) {
        if (!utmMap.has(code)) {
          utmMap.set(code, { utmCode: code, checklist: cl });
        }
      }
    }
    const utmRows = [...utmMap.values()];

    const uniqueUtmCodes = [...new Set(utmRows.map(r => r.utmCode))];

    let perfData: Record<string, AdPerformance> = {};
    if (uniqueUtmCodes.length > 0) {
      try {
        perfData = await adPerformanceApi.getByUtmCodes(uniqueUtmCodes, selectedMonth);
      } catch {
        perfData = {};
      }
    }

    const result: TableRowData[] = utmRows.map(row => {
      const perf = perfData[row.utmCode];
      return {
        id: `${row.checklist.id}-${row.utmCode}`,
        product: row.checklist.product?.name || (row.checklist as any).products?.name || '-',
        copy_type: row.checklist.copy_type?.code || (row.checklist as any).copy_types?.code || '-',
        utm_code: row.utmCode,
        spend: perf?.spend ?? 0,
        impressions: perf?.impressions ?? 0,
        clicks: perf?.clicks ?? 0,
        ctr: perf?.ctr ?? 0,
        cpc: perf?.cpc ?? 0,
        revenue: perf?.revenue ?? 0,
        conversions: perf?.conversions ?? 0,
        roas: perf?.roas ?? 0,
      };
    });

    setRows(result);
    setLoading(false);
  }

  const sortedRows = [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const totalSpend = rows.reduce((s, r) => s + r.spend, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalConversions = rows.reduce((s, r) => s + r.conversions, 0);
  const avgRoas = totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 10000) / 100 : 0;

  function handleExport() {
    const visibleCols = ALL_COLUMNS.filter(c => visibleColumns.includes(c.key));
    const headers = visibleCols.map(c => c.label);
    const data = sortedRows.map(row =>
      visibleCols.map(col => {
        const val = row[col.key];
        return val;
      })
    );
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '등록소재성과');
    XLSX.writeFile(wb, `등록소재성과_${selectedMonth}.xlsx`);
  }

  const SortIcon = ({ col }: { col: ColumnKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3 inline" />
      : <ArrowDown className="ml-1 h-3 w-3 inline" />;
  };

  return (
    <>
      <Header title="등록소재 성과추적" />
      <div className="p-6 space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="font-medium">{formatMonth(selectedMonth)} 등록소재 성과</span>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48" align="end">
                <div className="space-y-2">
                  <p className="text-sm font-medium mb-2">표시할 컬럼</p>
                  {ALL_COLUMNS.map(col => (
                    <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={visibleColumns.includes(col.key)}
                        onCheckedChange={() => toggleColumn(col.key)}
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체기간</SelectItem>
                {monthOptions.map(month => (
                  <SelectItem key={month} value={month}>
                    {formatMonth(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-8 w-28" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">총 광고비</p>
                  <p className="text-2xl font-bold">{currencyFmt.format(totalSpend)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">총 매출액</p>
                  <p className="text-2xl font-bold">{currencyFmt.format(totalRevenue)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">평균 ROAS</p>
                  <p className="text-2xl font-bold">{avgRoas}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">총 전환수</p>
                  <p className="text-2xl font-bold">{totalConversions.toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>

            {/* Data table */}
            <Card>
              <CardContent className="pt-6">
                {sortedRows.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    UTM 코드가 등록된 소재가 없습니다
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          {ALL_COLUMNS.filter(c => visibleColumns.includes(c.key)).map(col => (
                            <TableHead
                              key={col.key}
                              className="cursor-pointer select-none whitespace-nowrap"
                              onClick={() => handleSort(col.key)}
                            >
                              {col.label}
                              <SortIcon col={col.key} />
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedRows.map((row, index) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <Badge
                                variant={index < 3 ? 'default' : 'secondary'}
                                className={
                                  index === 0
                                    ? 'bg-yellow-500 hover:bg-yellow-600'
                                    : index === 1
                                    ? 'bg-gray-400 hover:bg-gray-500'
                                    : index === 2
                                    ? 'bg-amber-600 hover:bg-amber-700'
                                    : ''
                                }
                              >
                                {index + 1}
                              </Badge>
                            </TableCell>
                            {ALL_COLUMNS.filter(c => visibleColumns.includes(c.key)).map(col => (
                              <TableCell key={col.key} className="whitespace-nowrap">
                                {col.key === 'product' ? (
                                  <Badge variant="outline">{row.product}</Badge>
                                ) : col.key === 'copy_type' ? (
                                  <Badge variant="secondary">{row.copy_type}</Badge>
                                ) : col.key === 'utm_code' ? (
                                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                                    {row.utm_code}
                                  </span>
                                ) : (
                                  formatCell(col.key, row[col.key])
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
