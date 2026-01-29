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
import { Trophy, TrendingUp } from 'lucide-react';

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

interface ChecklistWithPerf {
  checklist: Checklist;
  utmCodes: string[];
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  hasPerf: boolean;
}

export function BestCopies() {
  const [items, setItems] = useState<ChecklistWithPerf[]>([]);
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

      // UTM 코드가 있는 체크리스트만 필터링
      const withUtm = checklists
        .map(cl => ({ checklist: cl, utmCodes: parseUtmCodes(cl.utm_code) }))
        .filter(item => item.utmCodes.length > 0);

      // 모든 UTM 코드 수집
      const allUtmCodes = [...new Set(withUtm.flatMap(item => item.utmCodes))];

      let perfData: Record<string, AdPerformance> = {};
      if (allUtmCodes.length > 0) {
        try {
          perfData = await adPerformanceApi.getByUtmCodes(allUtmCodes, selectedMonth);
        } catch {
          perfData = {};
        }
      }

      // 체크리스트별 성과 집계
      const result: ChecklistWithPerf[] = withUtm.map(({ checklist, utmCodes }) => {
        let spend = 0;
        let impressions = 0;
        let clicks = 0;
        let hasPerf = false;

        for (const utm of utmCodes) {
          const p = perfData[utm];
          if (p) {
            spend += p.spend;
            impressions += p.impressions;
            clicks += p.clicks;
            hasPerf = true;
          }
        }

        const ctr = impressions > 0
          ? Math.round((clicks / impressions) * 10000) / 100
          : 0;

        return { checklist, utmCodes, spend, impressions, clicks, ctr, hasPerf };
      });

      // 광고비 내림차순 정렬 (성과 있는 것 우선)
      result.sort((a, b) => {
        if (a.hasPerf !== b.hasPerf) return a.hasPerf ? -1 : 1;
        return b.spend - a.spend;
      });

      setItems(result);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalSpend = items.reduce((sum, item) => sum + item.spend, 0);
  const totalImpressions = items.reduce((sum, item) => sum + item.impressions, 0);
  const totalClicks = items.reduce((sum, item) => sum + item.clicks, 0);
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

        {/* 소재별 성과 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>소재별 성과</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">로딩 중...</div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                UTM 코드가 등록된 소재가 없습니다
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={item.checklist.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                  >
                    <div className="flex-shrink-0">
                      <Badge
                        variant={index < 3 && item.hasPerf ? 'default' : 'secondary'}
                        className={
                          index === 0 && item.hasPerf
                            ? 'bg-yellow-500 hover:bg-yellow-600'
                            : index === 1 && item.hasPerf
                            ? 'bg-gray-400 hover:bg-gray-500'
                            : index === 2 && item.hasPerf
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : ''
                        }
                      >
                        {index + 1}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {item.checklist.products && (
                          <Badge variant="outline">
                            {item.checklist.products.name}
                          </Badge>
                        )}
                        {item.checklist.copy_types && (
                          <Badge variant="secondary">
                            {item.checklist.copy_types.code}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.utmCodes.map(utm => (
                          <span key={utm} className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {utm}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right space-y-1">
                      {item.hasPerf ? (
                        <>
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(item.spend)}
                          </p>
                          <p className="text-xs text-muted-foreground">광고비</p>
                          <div className="text-xs text-muted-foreground space-y-0.5 pt-1 border-t">
                            <p>노출 {item.impressions.toLocaleString()}</p>
                            <p>클릭 {item.clicks.toLocaleString()}</p>
                            <p>CTR {item.ctr}%</p>
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
