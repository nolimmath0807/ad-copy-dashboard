import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adPerformanceApi, teamsApi } from '@/lib/api-client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { CopyTypePerformance, Team } from '@/types';

const currencyFmt = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 });

function getLastMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${y}-${m}`);
  }
  return months;
}

export default function Analytics() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [month, setMonth] = useState(defaultMonth);
  const [teamId, setTeamId] = useState<string | undefined>(undefined);
  const [data, setData] = useState<CopyTypePerformance[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<string>('total_spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const months = getLastMonths(6);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sortKey as keyof CopyTypePerformance];
      const bv = b[sortKey as keyof CopyTypePerformance];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [data, sortKey, sortDir]);

  useEffect(() => {
    teamsApi.list().then(setTeams);
  }, []);

  useEffect(() => {
    setLoading(true);
    adPerformanceApi.getCopyTypePerformance(month, teamId)
      .then((result) => setData(result))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [month, teamId]);

  const totalSpend = data.reduce((s, d) => s + d.total_spend, 0);
  const totalImpressions = data.reduce((s, d) => s + d.total_impressions, 0);
  const totalClicks = data.reduce((s, d) => s + d.total_clicks, 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const totalRevenue = data.reduce((s, d) => s + d.total_revenue, 0);
  const avgRoas = totalSpend > 0 ? Math.round(totalRevenue / totalSpend * 100) : 0;

  return (
    <div className="space-y-6">
      <Header title="원고유형 분석" />

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체기간</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={teamId ?? 'all'} onValueChange={(v) => setTeamId(v === 'all' ? undefined : v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">총 광고비</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalSpend.toLocaleString()}원</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">총 노출</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalImpressions.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">총 클릭</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">평균 CTR</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{avgCtr.toFixed(2)}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">총 매출액</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalRevenue.toLocaleString()}원</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">평균 ROAS</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{avgRoas}%</p></CardContent>
        </Card>
      </div>

      {!loading && data.length > 0 && (
        <Card>
          <CardHeader><CardTitle>원고유형별 성과</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="copy_type_code" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value, name) => {
                  const v = Number(value);
                  if (name === '광고비' || name === '매출액') return [currencyFmt.format(v), name];
                  if (name === '평균 CTR') return [`${v.toFixed(2)}%`, name];
                  return [v.toLocaleString(), name];
                }} />
                <Legend />
                <Bar yAxisId="left" dataKey="total_spend" name="광고비" fill="#8884d8" />
                <Bar yAxisId="left" dataKey="total_revenue" name="매출액" fill="#ffc658" />
                <Bar yAxisId="right" dataKey="avg_ctr" name="평균 CTR" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>상세 데이터</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 cursor-pointer select-none" onClick={() => handleSort('copy_type_code')}>
                  원고유형 코드
                  {sortKey === 'copy_type_code' ? (sortDir === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 inline" /> : <ArrowDown className="ml-1 h-3 w-3 inline" />) : <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-40" />}
                </th>
                <th className="pb-2 cursor-pointer select-none" onClick={() => handleSort('copy_type_name')}>
                  원고유형 이름
                  {sortKey === 'copy_type_name' ? (sortDir === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 inline" /> : <ArrowDown className="ml-1 h-3 w-3 inline" />) : <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-40" />}
                </th>
                <th className="pb-2 text-right cursor-pointer select-none" onClick={() => handleSort('total_spend')}>
                  광고비
                  {sortKey === 'total_spend' ? (sortDir === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 inline" /> : <ArrowDown className="ml-1 h-3 w-3 inline" />) : <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-40" />}
                </th>
                <th className="pb-2 text-right cursor-pointer select-none" onClick={() => handleSort('total_impressions')}>
                  노출
                  {sortKey === 'total_impressions' ? (sortDir === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 inline" /> : <ArrowDown className="ml-1 h-3 w-3 inline" />) : <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-40" />}
                </th>
                <th className="pb-2 text-right cursor-pointer select-none" onClick={() => handleSort('total_clicks')}>
                  클릭
                  {sortKey === 'total_clicks' ? (sortDir === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 inline" /> : <ArrowDown className="ml-1 h-3 w-3 inline" />) : <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-40" />}
                </th>
                <th className="pb-2 text-right cursor-pointer select-none" onClick={() => handleSort('avg_ctr')}>
                  CTR
                  {sortKey === 'avg_ctr' ? (sortDir === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 inline" /> : <ArrowDown className="ml-1 h-3 w-3 inline" />) : <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-40" />}
                </th>
                <th className="pb-2 text-right cursor-pointer select-none" onClick={() => handleSort('total_revenue')}>
                  매출액
                  {sortKey === 'total_revenue' ? (sortDir === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 inline" /> : <ArrowDown className="ml-1 h-3 w-3 inline" />) : <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-40" />}
                </th>
                <th className="pb-2 text-right cursor-pointer select-none" onClick={() => handleSort('roas')}>
                  ROAS
                  {sortKey === 'roas' ? (sortDir === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 inline" /> : <ArrowDown className="ml-1 h-3 w-3 inline" />) : <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-40" />}
                </th>
                <th className="pb-2 text-right cursor-pointer select-none" onClick={() => handleSort('utm_count')}>
                  UTM 수
                  {sortKey === 'utm_count' ? (sortDir === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 inline" /> : <ArrowDown className="ml-1 h-3 w-3 inline" />) : <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-40" />}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row) => (
                <tr key={row.copy_type_code} className="border-b">
                  <td className="py-2">{row.copy_type_code}</td>
                  <td className="py-2">{row.copy_type_name}</td>
                  <td className="py-2 text-right">{currencyFmt.format(row.total_spend)}</td>
                  <td className="py-2 text-right">{row.total_impressions.toLocaleString()}</td>
                  <td className="py-2 text-right">{row.total_clicks.toLocaleString()}</td>
                  <td className="py-2 text-right">{row.avg_ctr.toFixed(2)}%</td>
                  <td className="py-2 text-right">{currencyFmt.format(row.total_revenue)}</td>
                  <td className="py-2 text-right">{row.roas}%</td>
                  <td className="py-2 text-right">{row.utm_count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
