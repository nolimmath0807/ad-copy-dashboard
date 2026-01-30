import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { productsApi } from '@/lib/api-client';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Pencil, Trash2, X, Package } from 'lucide-react';
import type { Product, ProductCreate } from '@/types';

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductCreate>({
    name: '',
    usp: '',
    appeal_points: [],
    mechanism: '',
    english_name: '',
    shape: '',
    default_utm_code: '',
  });
  const [newAppealPoint, setNewAppealPoint] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const data = await productsApi.list();
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, formData);
        toast.success('상품이 수정되었습니다');
      } else {
        await productsApi.create(formData);
        toast.success('상품이 추가되었습니다');
      }
      setDialogOpen(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
      toast.error('오류가 발생했습니다');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await productsApi.delete(id);
      toast.success('상품이 삭제되었습니다');
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('오류가 발생했습니다');
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      usp: '',
      appeal_points: [],
      mechanism: '',
      english_name: '',
      shape: '',
      default_utm_code: '',
    });
    setNewAppealPoint('');
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      usp: product.usp || '',
      appeal_points: product.appeal_points || [],
      mechanism: product.mechanism || '',
      english_name: product.english_name || '',
      shape: product.shape || '',
      default_utm_code: product.default_utm_code || '',
    });
    setNewAppealPoint('');
    setDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingProduct(null);
    resetForm();
    setDialogOpen(true);
  }

  function addAppealPoint() {
    if (!newAppealPoint.trim()) return;
    setFormData({
      ...formData,
      appeal_points: [...(formData.appeal_points || []), newAppealPoint.trim()],
    });
    setNewAppealPoint('');
  }

  function removeAppealPoint(index: number) {
    setFormData({
      ...formData,
      appeal_points: (formData.appeal_points || []).filter((_, i) => i !== index),
    });
  }

  function handleAppealPointKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addAppealPoint();
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">상품 관리</h1>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>상품 목록</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" /> 새 상품
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? '상품 수정' : '새 상품 등록'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="name">품명 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="english_name">영문명</Label>
                    <Input
                      id="english_name"
                      value={formData.english_name}
                      onChange={(e) => setFormData({ ...formData, english_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usp">핵심 USP (한 줄 요약)</Label>
                  <Textarea
                    id="usp"
                    value={formData.usp}
                    onChange={(e) => setFormData({ ...formData, usp: e.target.value })}
                    placeholder="예: 먹기만 해도 염색없이 머리가 뿌리부터 까맣게 나는 영양제"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>소구점 (복수 입력 가능)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newAppealPoint}
                      onChange={(e) => setNewAppealPoint(e.target.value)}
                      onKeyDown={handleAppealPointKeyDown}
                      placeholder="소구점 입력 후 Enter 또는 추가 버튼"
                    />
                    <Button type="button" variant="outline" onClick={addAppealPoint}>
                      추가
                    </Button>
                  </div>
                  {(formData.appeal_points || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(formData.appeal_points || []).map((point, index) => (
                        <Badge key={index} variant="secondary" className="px-3 py-1 text-sm">
                          {point}
                          <button
                            type="button"
                            onClick={() => removeAppealPoint(index)}
                            className="ml-2 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mechanism">기전</Label>
                  <Textarea
                    id="mechanism"
                    value={formData.mechanism}
                    onChange={(e) => setFormData({ ...formData, mechanism: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shape">형태</Label>
                  <Input
                    id="shape"
                    value={formData.shape}
                    onChange={(e) => setFormData({ ...formData, shape: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_utm_code">기본 UTM 코드</Label>
                  <Input
                    id="default_utm_code"
                    value={formData.default_utm_code}
                    onChange={(e) => setFormData({ ...formData, default_utm_code: e.target.value })}
                    placeholder="예: utm_source=naver&utm_medium=cpc"
                  />
                </div>
                <Button type="submit" className="w-full mt-2">
                  {editingProduct ? '수정' : '등록'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>로딩 중...</p>
          ) : products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="등록된 상품이 없습니다"
              description="새 상품을 추가하여 시작하세요"
              action={<Button onClick={openCreateDialog}>새 상품 추가</Button>}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>품명</TableHead>
                  <TableHead>영문명</TableHead>
                  <TableHead>핵심 USP</TableHead>
                  <TableHead>소구점</TableHead>
                  <TableHead className="w-24">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.english_name}</TableCell>
                    <TableCell className="max-w-xs truncate">{product.usp}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(product.appeal_points || []).slice(0, 2).map((point, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {point.length > 15 ? point.slice(0, 15) + '...' : point}
                          </Badge>
                        ))}
                        {(product.appeal_points || []).length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{(product.appeal_points || []).length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(product)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
