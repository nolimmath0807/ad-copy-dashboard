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
import { bestCopiesApi } from '@/lib/api-client';
import type { BestCopy } from '@/types';
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

export function BestCopies() {
  const [bestCopies, setBestCopies] = useState<BestCopy[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);

  const monthOptions = generateMonthOptions();

  useEffect(() => {
    fetchBestCopies();
  }, [selectedMonth]);

  async function fetchBestCopies() {
    setLoading(true);
    try {
      const data = await bestCopiesApi.list(selectedMonth);
      setBestCopies(data.sort((a, b) => b.ad_spend - a.ad_spend));
    } catch (error) {
      console.error('Failed to fetch best copies:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalAdSpend = bestCopies.reduce((sum, bc) => sum + bc.ad_spend, 0);

  return (
    <>
      <Header title="베스트 원고" />
      <div className="p-6 space-y-6">
        {/* 월별 필터 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="font-medium">{formatMonth(selectedMonth)} 베스트 원고</span>
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

        {/* 총 광고비 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">총 광고비</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAdSpend)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 베스트 원고 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>광고비 순위</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">로딩 중...</div>
            ) : bestCopies.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                해당 월의 베스트 원고가 없습니다
              </div>
            ) : (
              <div className="space-y-4">
                {bestCopies.map((bc, index) => (
                  <div
                    key={bc.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                  >
                    <div className="flex-shrink-0">
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
                        {index + 1}위
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {bc.generated_copies?.products && (
                          <Badge variant="outline">
                            {bc.generated_copies.products.name}
                          </Badge>
                        )}
                        {bc.generated_copies?.copy_types && (
                          <Badge variant="secondary">
                            {bc.generated_copies.copy_types.code}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {bc.generated_copies?.content || '원고 내용 없음'}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(bc.ad_spend)}
                      </p>
                      <p className="text-xs text-muted-foreground">광고비</p>
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
