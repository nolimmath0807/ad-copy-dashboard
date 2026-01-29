import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { checklistsApi, teamsApi, teamProductsApi, adPerformanceApi } from '@/lib/api-client';
import { Download } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import type { Checklist, Team, TeamProduct, WeeklyPerformance } from '@/types';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F'];

const SERVICE_START_WEEK = '2026-W05';

function getCurrentWeek(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

function getPreviousWeek(week: string): string {
  const [year, w] = week.split('-W');
  const weekNum = parseInt(w);
  if (weekNum === 1) {
    return `${parseInt(year) - 1}-W52`;
  }
  return `${year}-W${(weekNum - 1).toString().padStart(2, '0')}`;
}

function getAllWeeksFromStart(): string[] {
  const weeks: string[] = [];
  let current = getCurrentWeek();
  while (current >= SERVICE_START_WEEK) {
    weeks.push(current);
    current = getPreviousWeek(current);
  }
  return weeks;
}

function getWeekDateRange(week: string): string {
  const [year, w] = week.split('-W');
  const weekNum = parseInt(w);
  const jan4 = new Date(parseInt(year), 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);
  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const startMonth = weekStart.getMonth() + 1;
  const startDay = weekStart.getDate();
  const endMonth = weekEnd.getMonth() + 1;
  const endDay = weekEnd.getDate();

  return `${startMonth}/${startDay}~${endMonth}/${endDay}`;
}

function getWeeksBetween(start: string, end: string): string[] {
  const allWeeks = getAllWeeksFromStart();
  return allWeeks.filter(w => w >= start && w <= end).sort();
}

export default function AdminReport() {
  const allWeeks = getAllWeeksFromStart();
  const [startWeek, setStartWeek] = useState(allWeeks[allWeeks.length - 1] || SERVICE_START_WEEK);
  const [endWeek, setEndWeek] = useState(getCurrentWeek());
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamProducts, setTeamProducts] = useState<TeamProduct[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<Record<string, Record<string, WeeklyPerformance>>>({});
  const [perfLoading, setPerfLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [teamsData, teamProductsData, checklistsData] = await Promise.all([
        teamsApi.list(),
        teamProductsApi.list(),
        checklistsApi.list(),
      ]);
      setTeams(teamsData);
      setTeamProducts(teamProductsData);
      setChecklists(checklistsData);
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (teams.length > 0 && selectedTeamIds.length === 0) {
      const defaultTeams = teams.filter(t => t.name.includes('퍼포AI'));
      setSelectedTeamIds(defaultTeams.length > 0 ? defaultTeams.map(t => t.id) : teams.map(t => t.id));
    }
  }, [teams]);

  useEffect(() => {
    if (selectedTeamIds.length === 0 || !startWeek || !endWeek) return;
    setPerfLoading(true);
    adPerformanceApi.getWeeklyReport(startWeek, endWeek, selectedTeamIds)
      .then(data => setPerformanceData(data))
      .catch(() => setPerformanceData({}))
      .finally(() => setPerfLoading(false));
  }, [startWeek, endWeek, selectedTeamIds]);

  const filteredTeams = teams.filter(t => selectedTeamIds.includes(t.id));

  const selectedWeeks = getWeeksBetween(startWeek, endWeek);

  // Build completion rate map: { teamId: { week: rate } }
  const completionData: Record<string, Record<string, number>> = {};

  for (const team of filteredTeams) {
    completionData[team.id] = {};
    const teamProductIds = teamProducts
      .filter(tp => tp.team_id === team.id)
      .map(tp => tp.product_id);

    for (const week of selectedWeeks) {
      const weekChecklists = checklists.filter(
        c => c.week === week && teamProductIds.includes(c.product_id)
      );
      const total = weekChecklists.length;
      const filled = weekChecklists.filter(c => c.utm_code && c.utm_code.trim() !== '').length;
      completionData[team.id][week] = total > 0 ? Math.round((filled / total) * 100) : 0;
    }
  }

  // Chart data
  const chartData = selectedWeeks.map(week => {
    const entry: Record<string, string | number> = { week: getWeekDateRange(week) };
    for (const team of filteredTeams) {
      entry[team.name] = completionData[team.id]?.[week] ?? 0;
    }
    return entry;
  });

  const perfChartData = selectedWeeks.map(week => {
    const entry: Record<string, string | number> = { week: getWeekDateRange(week) };
    for (const team of filteredTeams) {
      entry[team.name] = performanceData[team.id]?.[week]?.spend ?? 0;
    }
    return entry;
  });

  const perfTotals = (() => {
    let totalSpend = 0, totalImpressions = 0, totalClicks = 0;
    for (const teamData of Object.values(performanceData)) {
      for (const wp of Object.values(teamData)) {
        totalSpend += wp.spend;
        totalImpressions += wp.impressions;
        totalClicks += wp.clicks;
      }
    }
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    return { totalSpend, totalImpressions, totalClicks, avgCtr };
  })();

  function exportToExcel() {
    const headerRow = ['팀', ...selectedWeeks.map(w => getWeekDateRange(w))];
    const dataRows = filteredTeams.map(team => [
      team.name,
      ...selectedWeeks.map(w => `${completionData[team.id]?.[w] ?? 0}%`),
    ]);
    const worksheetData = [headerRow, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '체크리스트 리포트');

    const perfHeaderRow = ['팀', ...selectedWeeks.map(w => getWeekDateRange(w))];
    const perfDataRows = filteredTeams.map(team => [
      team.name,
      ...selectedWeeks.map(w => performanceData[team.id]?.[w]?.spend ?? 0),
    ]);
    const perfWs = XLSX.utils.aoa_to_sheet([perfHeaderRow, ...perfDataRows]);
    XLSX.utils.book_append_sheet(wb, perfWs, '광고 성과');

    XLSX.writeFile(wb, `checklist-report-${startWeek}-${endWeek}.xlsx`);
  }

  return (
    <>
      <Header title="리포트" />
      <div className="p-6 space-y-6">
        {/* Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium whitespace-nowrap">시작 주</span>
                  <Select value={startWeek} onValueChange={setStartWeek}>
                    <SelectTrigger className="w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allWeeks.map(week => (
                        <SelectItem key={week} value={week}>
                          {week} ({getWeekDateRange(week)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium whitespace-nowrap">종료 주</span>
                  <Select value={endWeek} onValueChange={setEndWeek}>
                    <SelectTrigger className="w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allWeeks.map(week => (
                        <SelectItem key={week} value={week}>
                          {week} ({getWeekDateRange(week)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={exportToExcel} variant="outline" className="ml-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Excel 다운로드
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium whitespace-nowrap">팀 필터</span>
                {teams.map(team => (
                  <Button
                    key={team.id}
                    size="sm"
                    variant={selectedTeamIds.includes(team.id) ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectedTeamIds(prev =>
                        prev.includes(team.id)
                          ? prev.filter(id => id !== team.id)
                          : [...prev, team.id]
                      );
                    }}
                  >
                    {team.name}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedTeamIds(teams.map(t => t.id))}
                >
                  전체 선택
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {!perfLoading && Object.keys(performanceData).length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">총 광고비</div>
                <div className="text-2xl font-bold">{perfTotals.totalSpend.toLocaleString()}원</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">총 노출</div>
                <div className="text-2xl font-bold">{perfTotals.totalImpressions.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">총 클릭</div>
                <div className="text-2xl font-bold">{perfTotals.totalClicks.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">평균 CTR</div>
                <div className="text-2xl font-bold">{perfTotals.avgCtr.toFixed(2)}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground">데이터를 불러오는 중...</div>
        ) : teams.length === 0 ? (
          <div className="flex justify-center py-12 text-muted-foreground">등록된 팀이 없습니다.</div>
        ) : selectedWeeks.length === 0 ? (
          <div className="flex justify-center py-12 text-muted-foreground">선택된 주간이 없습니다. 시작 주와 종료 주를 확인해 주세요.</div>
        ) : (
          <>
            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>팀별 주간 완료율</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value: unknown) => `${value}%`} />
                    <Legend />
                    {filteredTeams.map((team, i) => (
                      <Bar
                        key={team.id}
                        dataKey={team.name}
                        fill={COLORS[i % COLORS.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Line Chart - 광고비 추이 */}
            <Card>
              <CardHeader>
                <CardTitle>주간 광고비 추이</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={perfChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                    <Tooltip formatter={(value: unknown) => `${Number(value).toLocaleString()}원`} />
                    <Legend />
                    {filteredTeams.map((team, i) => (
                      <Line key={team.id} type="monotone" dataKey={team.name} stroke={COLORS[i % COLORS.length]} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle>팀별 완료율 상세</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium bg-muted/50 sticky left-0">팀</th>
                        {selectedWeeks.map(week => (
                          <th key={week} className="text-center p-3 font-medium bg-muted/50 whitespace-nowrap">
                            {getWeekDateRange(week)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeams.map(team => (
                        <tr key={team.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium sticky left-0 bg-background">{team.name}</td>
                          {selectedWeeks.map(week => {
                            const rate = completionData[team.id]?.[week] ?? 0;
                            return (
                              <td
                                key={week}
                                className="text-center p-3"
                                style={{
                                  backgroundColor: rate === 100
                                    ? 'hsl(142 76% 94%)'
                                    : rate >= 50
                                      ? 'hsl(48 96% 94%)'
                                      : rate > 0
                                        ? 'hsl(0 84% 95%)'
                                        : undefined,
                                }}
                              >
                                <div>{rate}%</div>
                                {performanceData[team.id]?.[week] && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {performanceData[team.id][week].spend.toLocaleString()}원
                                    <br />
                                    CTR {performanceData[team.id][week].ctr.toFixed(2)}%
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
