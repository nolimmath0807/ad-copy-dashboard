import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adPerformanceApi, teamsApi } from '@/lib/api-client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CopyTypePerformance, Team } from '@/types';

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

  const months = getLastMonths(6);

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

      <div className="grid grid-cols-4 gap-4">
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
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="total_spend" name="광고비" fill="#8884d8" />
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
                <th className="pb-2">원고유형 코드</th>
                <th className="pb-2">원고유형 이름</th>
                <th className="pb-2 text-right">광고비</th>
                <th className="pb-2 text-right">노출</th>
                <th className="pb-2 text-right">클릭</th>
                <th className="pb-2 text-right">CTR</th>
                <th className="pb-2 text-right">UTM 수</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.copy_type_code} className="border-b">
                  <td className="py-2">{row.copy_type_code}</td>
                  <td className="py-2">{row.copy_type_name}</td>
                  <td className="py-2 text-right">{row.total_spend.toLocaleString()}원</td>
                  <td className="py-2 text-right">{row.total_impressions.toLocaleString()}</td>
                  <td className="py-2 text-right">{row.total_clicks.toLocaleString()}</td>
                  <td className="py-2 text-right">{row.avg_ctr.toFixed(2)}%</td>
                  <td className="py-2 text-right">{row.utm_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
