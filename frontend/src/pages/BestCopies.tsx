import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adPerformanceApi, checklistsApi } from '@/lib/api-client';
import type { AdPerformance, Checklist } from '@/types';
import { Trophy } from 'lucide-react';

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount);
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

interface UtmPerformanceRow {
  utmCode: string;
  checklist: Checklist;
  perf: AdPerformance | null;
}

export function BestCopies() {
  const [rows, setRows] = useState<UtmPerformanceRow[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);

  const monthOptions = generateMonthOptions();

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  async function fetchData() {
    setLoading(true);
    try {
      const checklists = await checklistsApi.list();

      // 체크리스트에서 UTM 코드별 개별 행 생성
      const utmRows: { utmCode: string; checklist: Checklist }[] = [];
      for (const cl of checklists) {
        const codes = parseUtmCodes(cl.utm_code);
        for (const code of codes) {
          utmRows.push({ utmCode: code, checklist: cl });
        }
      }

      const uniqueUtmCodes = [...new Set(utmRows.map(r => r.utmCode))];

      let perfData: Record<string, AdPerformance> = {};
      if (uniqueUtmCodes.length > 0) {
        try {
          perfData = await adPerformanceApi.getByUtmCodes(uniqueUtmCodes, selectedMonth);
        } catch {
          perfData = {};
        }
      }

      // 각 UTM 코드에 성과 매핑
      const result: UtmPerformanceRow[] = utmRows.map(row => ({
        ...row,
        perf: perfData[row.utmCode] || null,
      }));

      // 광고비 내림차순 (성과 있는 것 우선)
      result.sort((a, b) => {
        if (!!a.perf !== !!b.perf) return a.perf ? -1 : 1;
        return (b.perf?.spend || 0) - (a.perf?.spend || 0);
      });

      setRows(result);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  const rowsWithPerf = rows.filter(r => r.perf);
  const totalSpend = rowsWithPerf.reduce((sum, r) => sum + (r.perf?.spend || 0), 0);
  const totalImpressions = rowsWithPerf.reduce((sum, r) => sum + (r.perf?.impressions || 0), 0);
  const totalClicks = rowsWithPerf.reduce((sum, r) => sum + (r.perf?.clicks || 0), 0);
  const totalCtr = totalImpressions > 0
    ? Math.round((totalClicks / totalImpressions) * 10000) / 100
    : 0;

  return (
    <>
      <Header title="등록소재 성과추적" />
      <div className="p-6 space-y-6">
        {/* 월별 필터 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="font-medium">{formatMonth(selectedMonth)} 등록소재 성과</span>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(month => (
                <SelectItem key={month} value={month}>
                  {formatMonth(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 총 성과 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">총 광고비</p>
              <p className="text-2xl font-bold">{formatCurrency(totalSpend)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">총 노출수</p>
              <p className="text-2xl font-bold">{totalImpressions.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">총 클릭수</p>
              <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">평균 CTR</p>
              <p className="text-2xl font-bold">{totalCtr}%</p>
            </CardContent>
          </Card>
        </div>

        {/* UTM 코드별 성과 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>UTM 코드별 성과</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">로딩 중...</div>
            ) : rows.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                UTM 코드가 등록된 소재가 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((row, index) => (
                  <div
                    key={`${row.checklist.id}-${row.utmCode}`}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                  >
                    <div className="flex-shrink-0">
                      <Badge
                        variant={index < 3 && row.perf ? 'default' : 'secondary'}
                        className={
                          index === 0 && row.perf
                            ? 'bg-yellow-500 hover:bg-yellow-600'
                            : index === 1 && row.perf
                            ? 'bg-gray-400 hover:bg-gray-500'
                            : index === 2 && row.perf
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : ''
                        }
                      >
                        {index + 1}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {(row.checklist.product || row.checklist.products) && (
                          <Badge variant="outline">
                            {(row.checklist.product || row.checklist.products)!.name}
                          </Badge>
                        )}
                        {(row.checklist.copy_type || row.checklist.copy_types) && (
                          <Badge variant="secondary">
                            {(row.checklist.copy_type || row.checklist.copy_types)!.code}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {row.utmCode}
                      </span>
                    </div>
                    <div className="flex-shrink-0 text-right space-y-1">
                      {row.perf ? (
                        <>
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(row.perf.spend)}
                          </p>
                          <p className="text-xs text-muted-foreground">광고비</p>
                          <div className="text-xs text-muted-foreground space-y-0.5 pt-1 border-t">
                            <p>노출 {row.perf.impressions.toLocaleString()}</p>
                            <p>클릭 {row.perf.clicks.toLocaleString()}</p>
                            <p>CTR {row.perf.ctr}%</p>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">-</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
