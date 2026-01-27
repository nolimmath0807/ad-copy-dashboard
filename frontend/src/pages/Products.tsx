import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Product, ProductCreate } from '@/types';

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductCreate>({
    name: '',
    usp: '',
    mechanism: '',
    english_name: '',
    shape: '',
  });

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
      } else {
        await productsApi.create(formData);
      }
      setDialogOpen(false);
      setEditingProduct(null);
      setFormData({ name: '', usp: '', mechanism: '', english_name: '', shape: '' });
      fetchProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await productsApi.delete(id);
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      usp: product.usp || '',
      mechanism: product.mechanism || '',
      english_name: product.english_name || '',
      shape: product.shape || '',
    });
    setDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingProduct(null);
    setFormData({ name: '', usp: '', mechanism: '', english_name: '', shape: '' });
    setDialogOpen(true);
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
            <DialogContent className="max-w-2xl">
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
                  <Label htmlFor="usp">USP</Label>
                  <Textarea
                    id="usp"
                    value={formData.usp}
                    onChange={(e) => setFormData({ ...formData, usp: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mechanism">기전</Label>
                  <Textarea
                    id="mechanism"
                    value={formData.mechanism}
                    onChange={(e) => setFormData({ ...formData, mechanism: e.target.value })}
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
            <p className="text-muted-foreground">등록된 상품이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>품명</TableHead>
                  <TableHead>영문명</TableHead>
                  <TableHead>USP</TableHead>
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
