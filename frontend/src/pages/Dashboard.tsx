import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { productsApi, copyTypesApi, checklistsApi, copiesApi } from '@/lib/api-client';
import { Package, FileText, CheckCircle, BarChart3 } from 'lucide-react';
import type { Product, CopyType, ChecklistStats, GeneratedCopy } from '@/types';

export function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [copyTypes, setCopyTypes] = useState<CopyType[]>([]);
  const [stats, setStats] = useState<ChecklistStats | null>(null);
  const [allCopies, setAllCopies] = useState<GeneratedCopy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [productsData, copyTypesData, statsData, copiesData] = await Promise.all([
          productsApi.list(),
          copyTypesApi.list(),
          checklistsApi.stats(),
          copiesApi.list(),
        ]);
        setProducts(productsData);
        setCopyTypes(copyTypesData);
        setStats(statsData);
        setAllCopies(copiesData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // 부모 유형만 필터링
  const parentCopyTypes = copyTypes.filter(ct => ct.parent_id === null);

  // 상품 × 유형별 생성 횟수 계산
  function getGenerationCount(productId: string, copyTypeId: string): number {
    // 해당 유형의 자식들 ID도 포함
    const childTypeIds = copyTypes
      .filter(ct => ct.parent_id === copyTypeId)
      .map(ct => ct.id);
    const allTypeIds = [copyTypeId, ...childTypeIds];

    return allCopies.filter(
      copy => copy.product_id === productId && allTypeIds.includes(copy.copy_type_id)
    ).length;
  }

  // 총 생성 횟수
  const totalGenerations = allCopies.length;

  if (loading) {
    return (
      <>
        <Header title="대시보드" />
        <div className="p-6">로딩 중...</div>
      </>
    );
  }

  return (
    <>
      <Header title="대시보드" />
      <div className="p-6 space-y-6">
        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">상품 수</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">원고 유형</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{parentCopyTypes.length}</div>
              <p className="text-xs text-muted-foreground">
                세부 스타일 {copyTypes.length - parentCopyTypes.length}개
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">총 생성 횟수</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalGenerations}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">체크리스트 완료율</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.completion_rate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                {stats?.completed || 0} / {stats?.total || 0} 완료
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 상품 × 유형별 생성 횟수 매트릭스 */}
        <Card>
          <CardHeader>
            <CardTitle>상품별 원고 생성 현황</CardTitle>
            <p className="text-sm text-muted-foreground">각 셀은 해당 상품 × 유형 조합의 원고 생성 횟수입니다</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border px-4 py-3 bg-muted text-left min-w-40">원고 유형</th>
                    {products.map(product => (
                      <th key={product.id} className="border px-4 py-3 bg-muted text-center min-w-24">
                        {product.name}
                      </th>
                    ))}
                    <th className="border px-4 py-3 bg-muted text-center min-w-20">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {parentCopyTypes.map(copyType => {
                    const rowTotal = products.reduce(
                      (sum, product) => sum + getGenerationCount(product.id, copyType.id),
                      0
                    );
                    return (
                      <tr key={copyType.id}>
                        <td className="border px-4 py-3">
                          <div className="font-medium">[{copyType.code}] {copyType.name}</div>
                        </td>
                        {products.map(product => {
                          const count = getGenerationCount(product.id, copyType.id);
                          return (
                            <td key={product.id} className="border px-4 py-3 text-center">
                              {count > 0 ? (
                                <Badge variant={count >= 3 ? "default" : "secondary"}>
                                  {count}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="border px-4 py-3 text-center font-bold">
                          {rowTotal}
                        </td>
                      </tr>
                    );
                  })}
                  {/* 합계 행 */}
                  <tr className="bg-muted/50">
                    <td className="border px-4 py-3 font-bold">합계</td>
                    {products.map(product => {
                      const colTotal = parentCopyTypes.reduce(
                        (sum, ct) => sum + getGenerationCount(product.id, ct.id),
                        0
                      );
                      return (
                        <td key={product.id} className="border px-4 py-3 text-center font-bold">
                          {colTotal}
                        </td>
                      );
                    })}
                    <td className="border px-4 py-3 text-center font-bold text-primary">
                      {totalGenerations}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 최근 생성 원고 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 생성 원고</CardTitle>
          </CardHeader>
          <CardContent>
            {allCopies.length === 0 ? (
              <p className="text-muted-foreground">아직 생성된 원고가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {allCopies.slice(0, 5).map((copy) => (
                  <div key={copy.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <span className="font-medium">{copy.products?.name}</span>
                      <Badge variant="outline" className="ml-2">{copy.copy_types?.code}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(copy.created_at).toLocaleDateString()}
                    </span>
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
