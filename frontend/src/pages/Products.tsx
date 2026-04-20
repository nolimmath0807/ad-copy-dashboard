import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { productsApi, sellingPointsApi, assetsApi, pricingApi } from '@/lib/api-client';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Trash2, X, Package, ChevronRight } from 'lucide-react';
import type {
  Product,
  ProductCreate,
  ProductSellingPoint,
  ProductSellingPointCreate,
  ProductAsset,
  ProductAssetCreate,
  ProductPricing,
  ProductPricingCreate,
} from '@/types';

// ─── 기본정보 탭 ────────────────────────────────────────────────────────────

interface BasicInfoTabProps {
  product: Product;
  onSaved: (updated: Product) => void;
}

function BasicInfoTab({ product, onSaved }: BasicInfoTabProps) {
  const [form, setForm] = useState<ProductCreate>({
    name: product.name,
    usp: product.usp || '',
    appeal_points: product.appeal_points || [],
    mechanism: product.mechanism || '',
    english_name: product.english_name || '',
    shape: product.shape || '',
    default_utm_code: product.default_utm_code || '',
    slug: product.slug || '',
    form: product.form || '',
    dosage: product.dosage || '',
    cta_channel: product.cta_channel || '',
  });
  const [newAppealPoint, setNewAppealPoint] = useState('');
  const [saving, setSaving] = useState(false);

  function addAppealPoint() {
    if (!newAppealPoint.trim()) return;
    setForm((prev) => ({
      ...prev,
      appeal_points: [...(prev.appeal_points || []), newAppealPoint.trim()],
    }));
    setNewAppealPoint('');
  }

  function removeAppealPoint(index: number) {
    setForm((prev) => ({
      ...prev,
      appeal_points: (prev.appeal_points || []).filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await productsApi.update(product.id, form);
      toast.success('기본정보가 저장되었습니다');
      onSaved(updated);
    } catch {
      toast.error('저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>품명 *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>영문명</Label>
          <Input
            value={form.english_name}
            onChange={(e) => setForm({ ...form, english_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>슬러그 (slug)</Label>
          <Input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="예: black-hair-supplement"
          />
        </div>
        <div className="space-y-2">
          <Label>제형 (form)</Label>
          <Input
            value={form.form}
            onChange={(e) => setForm({ ...form, form: e.target.value })}
            placeholder="예: 캡슐, 정제, 분말"
          />
        </div>
        <div className="space-y-2">
          <Label>용량 (dosage)</Label>
          <Input
            value={form.dosage}
            onChange={(e) => setForm({ ...form, dosage: e.target.value })}
            placeholder="예: 1일 2캡슐"
          />
        </div>
        <div className="space-y-2">
          <Label>CTA 채널</Label>
          <Input
            value={form.cta_channel}
            onChange={(e) => setForm({ ...form, cta_channel: e.target.value })}
            placeholder="예: 스마트스토어, 자사몰"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>핵심 USP</Label>
        <Textarea
          value={form.usp}
          onChange={(e) => setForm({ ...form, usp: e.target.value })}
          placeholder="예: 먹기만 해도 염색없이 머리가 뿌리부터 까맣게 나는 영양제"
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label>소구점</Label>
        <div className="flex gap-2">
          <Input
            value={newAppealPoint}
            onChange={(e) => setNewAppealPoint(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addAppealPoint();
              }
            }}
            placeholder="소구점 입력 후 Enter 또는 추가 버튼"
          />
          <Button type="button" variant="outline" onClick={addAppealPoint}>
            추가
          </Button>
        </div>
        {(form.appeal_points || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {(form.appeal_points || []).map((point, index) => (
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
        <Label>기전</Label>
        <Textarea
          value={form.mechanism}
          onChange={(e) => setForm({ ...form, mechanism: e.target.value })}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>형태</Label>
          <Input
            value={form.shape}
            onChange={(e) => setForm({ ...form, shape: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>기본 UTM 코드</Label>
          <Input
            value={form.default_utm_code}
            onChange={(e) => setForm({ ...form, default_utm_code: e.target.value })}
            placeholder="예: utm_source=naver&utm_medium=cpc"
          />
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? '저장 중...' : '저장'}
      </Button>
    </div>
  );
}

// ─── 소구점 탭 ───────────────────────────────────────────────────────────────

interface SellingPointsTabProps {
  productId: string;
  sellingPoints: ProductSellingPoint[];
  onRefresh: () => void;
}

interface SellingPointFormState extends ProductSellingPointCreate {
  id?: string;
  isNew?: boolean;
}

interface SellingPointItemProps {
  item: SellingPointFormState;
  index: number;
  isSaving: boolean;
  isDeleting: boolean;
  onChange: (patch: Partial<SellingPointFormState>) => void;
  onSave: () => void;
  onDelete: () => void;
}

function SellingPointItem({
  item,
  index,
  isSaving,
  isDeleting,
  onChange,
  onSave,
  onDelete,
}: SellingPointItemProps) {
  const [newSymptom, setNewSymptom] = useState('');

  function addSymptom() {
    if (!newSymptom.trim()) return;
    onChange({ target_symptoms: [...(item.target_symptoms || []), newSymptom.trim()] });
    setNewSymptom('');
  }

  function removeSymptom(si: number) {
    onChange({ target_symptoms: (item.target_symptoms || []).filter((_, i) => i !== si) });
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">
          소구점 {index + 1}{item.isNew ? ' (신규)' : ''}
        </span>
        <Button variant="ghost" size="icon" disabled={isDeleting} onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">레이블 (label) *</Label>
          <Input
            value={item.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="예: 흡수율"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">헤드라인</Label>
          <Input
            value={item.headline || ''}
            onChange={(e) => onChange({ headline: e.target.value })}
            placeholder="예: 특허받은 흡수율 200%"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">기전 (mechanism)</Label>
        <Textarea
          value={item.mechanism || ''}
          onChange={(e) => onChange({ mechanism: e.target.value })}
          rows={2}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">핵심 성분 (key_ingredients)</Label>
        <Input
          value={item.key_ingredients || ''}
          onChange={(e) => onChange({ key_ingredients: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">경쟁 대안 (competitor_alt)</Label>
        <Input
          value={item.competitor_alt || ''}
          onChange={(e) => onChange({ competitor_alt: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">타겟 증상 (target_symptoms)</Label>
        <div className="flex gap-2">
          <Input
            value={newSymptom}
            onChange={(e) => setNewSymptom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSymptom();
              }
            }}
            placeholder="증상 입력 후 Enter"
          />
          <Button type="button" variant="outline" size="sm" onClick={addSymptom}>
            추가
          </Button>
        </div>
        {(item.target_symptoms || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {(item.target_symptoms || []).map((s, si) => (
              <Badge key={si} variant="secondary" className="text-xs px-2 py-0.5">
                {s}
                <button
                  type="button"
                  onClick={() => removeSymptom(si)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`is_active_${item.id}`}
          checked={item.is_active ?? true}
          onCheckedChange={(checked) => onChange({ is_active: !!checked })}
        />
        <Label htmlFor={`is_active_${item.id}`} className="text-sm cursor-pointer">
          활성화
        </Label>
      </div>
      <Button size="sm" disabled={isSaving} onClick={onSave} className="w-full">
        {isSaving ? '저장 중...' : '저장'}
      </Button>
    </div>
  );
}

function SellingPointsTab({ productId, sellingPoints, onRefresh }: SellingPointsTabProps) {
  const [items, setItems] = useState<SellingPointFormState[]>(() =>
    sellingPoints.map((sp) => ({ ...sp }))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(sellingPoints.map((sp) => ({ ...sp })));
  }, [sellingPoints]);

  function updateItem(index: number, patch: Partial<SellingPointFormState>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addNewItem() {
    setItems((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        isNew: true,
        label: '',
        headline: '',
        mechanism: '',
        key_ingredients: '',
        target_symptoms: [],
        competitor_alt: '',
        is_active: true,
      },
    ]);
  }

  async function saveItem(index: number) {
    const item = items[index];
    const tempId = item.id!;
    setSavingId(tempId);
    try {
      const payload: ProductSellingPointCreate = {
        label: item.label,
        headline: item.headline,
        mechanism: item.mechanism,
        key_ingredients: item.key_ingredients,
        target_symptoms: item.target_symptoms,
        competitor_alt: item.competitor_alt,
        is_active: item.is_active,
      };
      if (item.isNew) {
        await sellingPointsApi.create(productId, payload);
        toast.success('소구점이 추가되었습니다');
      } else {
        await sellingPointsApi.update(productId, tempId, payload);
        toast.success('소구점이 저장되었습니다');
      }
      onRefresh();
    } catch {
      toast.error('저장에 실패했습니다');
    } finally {
      setSavingId(null);
    }
  }

  async function deleteItem(index: number) {
    const item = items[index];
    if (item.isNew) {
      setItems((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    if (!confirm('소구점을 삭제하시겠습니까?')) return;
    setDeletingId(item.id!);
    try {
      await sellingPointsApi.delete(productId, item.id!);
      toast.success('소구점이 삭제되었습니다');
      onRefresh();
    } catch {
      toast.error('삭제에 실패했습니다');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="py-4 space-y-4">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">등록된 소구점이 없습니다</p>
      )}
      {items.map((item, index) => (
        <SellingPointItem
          key={item.id}
          item={item}
          index={index}
          isSaving={savingId === item.id}
          isDeleting={deletingId === item.id}
          onChange={(patch) => updateItem(index, patch)}
          onSave={() => saveItem(index)}
          onDelete={() => deleteItem(index)}
        />
      ))}
      <Button variant="outline" className="w-full" onClick={addNewItem}>
        <Plus className="h-4 w-4 mr-2" /> 소구점 추가
      </Button>
    </div>
  );
}

// ─── 가격 탭 ─────────────────────────────────────────────────────────────────

interface PricingTabProps {
  productId: string;
  pricingList: ProductPricing[];
  onRefresh: () => void;
}

interface PricingFormState extends ProductPricingCreate {
  id?: string;
  isNew?: boolean;
}

function PricingTab({ productId, pricingList, onRefresh }: PricingTabProps) {
  const [items, setItems] = useState<PricingFormState[]>(() =>
    pricingList.map((p) => ({ ...p }))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(pricingList.map((p) => ({ ...p })));
  }, [pricingList]);

  function updateItem(index: number, patch: Partial<PricingFormState>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addNewItem() {
    setItems((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        isNew: true,
        option_name: '',
        price: undefined,
        original_price: undefined,
        discount_rate: undefined,
        daily_price: undefined,
        is_main: false,
      },
    ]);
  }

  async function saveItem(index: number) {
    const item = items[index];
    const tempId = item.id!;
    setSavingId(tempId);
    try {
      const payload: ProductPricingCreate = {
        option_name: item.option_name,
        price: item.price,
        original_price: item.original_price,
        discount_rate: item.discount_rate,
        daily_price: item.daily_price,
        is_main: item.is_main,
      };
      if (item.isNew) {
        await pricingApi.create(productId, payload);
        toast.success('가격 옵션이 추가되었습니다');
      } else {
        await pricingApi.update(productId, tempId, payload);
        toast.success('가격 옵션이 저장되었습니다');
      }
      onRefresh();
    } catch {
      toast.error('저장에 실패했습니다');
    } finally {
      setSavingId(null);
    }
  }

  async function deleteItem(index: number) {
    const item = items[index];
    if (item.isNew) {
      setItems((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    if (!confirm('가격 옵션을 삭제하시겠습니까?')) return;
    setDeletingId(item.id!);
    try {
      await pricingApi.delete(productId, item.id!);
      toast.success('가격 옵션이 삭제되었습니다');
      onRefresh();
    } catch {
      toast.error('삭제에 실패했습니다');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="py-4 space-y-4">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">등록된 가격 옵션이 없습니다</p>
      )}
      {items.map((item, index) => (
        <div key={item.id} className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">
              옵션 {index + 1}{item.isNew ? ' (신규)' : ''}
              {item.is_main && (
                <Badge variant="default" className="ml-2 text-xs">메인</Badge>
              )}
            </span>
            <Button
              variant="ghost"
              size="icon"
              disabled={deletingId === item.id}
              onClick={() => deleteItem(index)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">옵션명 *</Label>
            <Input
              value={item.option_name}
              onChange={(e) => updateItem(index, { option_name: e.target.value })}
              placeholder="예: 1박스 (30캡슐)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">판매가 (원)</Label>
              <Input
                type="number"
                value={item.price ?? ''}
                onChange={(e) =>
                  updateItem(index, { price: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">정가 (원)</Label>
              <Input
                type="number"
                value={item.original_price ?? ''}
                onChange={(e) =>
                  updateItem(index, {
                    original_price: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">할인율 (%)</Label>
              <Input
                type="number"
                value={item.discount_rate ?? ''}
                onChange={(e) =>
                  updateItem(index, {
                    discount_rate: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">일일 가격 (원)</Label>
              <Input
                type="number"
                value={item.daily_price ?? ''}
                onChange={(e) =>
                  updateItem(index, {
                    daily_price: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`is_main_${item.id}`}
              checked={item.is_main ?? false}
              onCheckedChange={(checked) => updateItem(index, { is_main: !!checked })}
            />
            <Label htmlFor={`is_main_${item.id}`} className="text-sm cursor-pointer">
              메인 옵션
            </Label>
          </div>
          <Button
            size="sm"
            disabled={savingId === item.id}
            onClick={() => saveItem(index)}
            className="w-full"
          >
            {savingId === item.id ? '저장 중...' : '저장'}
          </Button>
        </div>
      ))}
      <Button variant="outline" className="w-full" onClick={addNewItem}>
        <Plus className="h-4 w-4 mr-2" /> 가격 옵션 추가
      </Button>
    </div>
  );
}

// ─── 에셋 탭 ─────────────────────────────────────────────────────────────────

interface AssetsTabProps {
  productId: string;
  assets: ProductAsset[];
  onRefresh: () => void;
}

interface AssetFormState extends ProductAssetCreate {
  id?: string;
  isNew?: boolean;
}

function AssetsTab({ productId, assets, onRefresh }: AssetsTabProps) {
  const [items, setItems] = useState<AssetFormState[]>(() => assets.map((a) => ({ ...a })));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(assets.map((a) => ({ ...a })));
  }, [assets]);

  function updateItem(index: number, patch: Partial<AssetFormState>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addNewItem() {
    setItems((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        isNew: true,
        asset_key: '',
        asset_value: '',
        asset_label: '',
      },
    ]);
  }

  async function saveItem(index: number) {
    const item = items[index];
    const tempId = item.id!;
    setSavingId(tempId);
    try {
      const payload: ProductAssetCreate = {
        asset_key: item.asset_key,
        asset_value: item.asset_value,
        asset_label: item.asset_label,
      };
      if (item.isNew) {
        await assetsApi.create(productId, payload);
        toast.success('에셋이 추가되었습니다');
      } else {
        await assetsApi.update(productId, tempId, payload);
        toast.success('에셋이 저장되었습니다');
      }
      onRefresh();
    } catch {
      toast.error('저장에 실패했습니다');
    } finally {
      setSavingId(null);
    }
  }

  async function deleteItem(index: number) {
    const item = items[index];
    if (item.isNew) {
      setItems((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    if (!confirm('에셋을 삭제하시겠습니까?')) return;
    setDeletingId(item.id!);
    try {
      await assetsApi.delete(productId, item.id!);
      toast.success('에셋이 삭제되었습니다');
      onRefresh();
    } catch {
      toast.error('삭제에 실패했습니다');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="py-4 space-y-3">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">등록된 에셋이 없습니다</p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-36">Key</TableHead>
            <TableHead>Value</TableHead>
            <TableHead className="w-32">Label</TableHead>
            <TableHead className="w-20 text-right">액션</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={item.id}>
              <TableCell>
                <Input
                  value={item.asset_key}
                  onChange={(e) => updateItem(index, { asset_key: e.target.value })}
                  placeholder="key"
                  className="h-8 text-sm"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={item.asset_value}
                  onChange={(e) => updateItem(index, { asset_value: e.target.value })}
                  placeholder="value"
                  className="h-8 text-sm"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={item.asset_label || ''}
                  onChange={(e) => updateItem(index, { asset_label: e.target.value })}
                  placeholder="label"
                  className="h-8 text-sm"
                />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={savingId === item.id}
                    onClick={() => saveItem(index)}
                    className="h-8 px-2 text-xs"
                  >
                    {savingId === item.id ? '...' : '저장'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === item.id}
                    onClick={() => deleteItem(index)}
                    className="h-8 px-2"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button variant="outline" className="w-full" onClick={addNewItem}>
        <Plus className="h-4 w-4 mr-2" /> 에셋 추가
      </Button>
    </div>
  );
}

// ─── 상품 상세 Sheet ──────────────────────────────────────────────────────────

interface ProductDetailSheetProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductUpdated: (updated: Product) => void;
}

function ProductDetailSheet({
  product,
  open,
  onOpenChange,
  onProductUpdated,
}: ProductDetailSheetProps) {
  const [sellingPoints, setSellingPoints] = useState<ProductSellingPoint[]>([]);
  const [pricingList, setPricingList] = useState<ProductPricing[]>([]);
  const [assets, setAssets] = useState<ProductAsset[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (open && product) {
      loadDetail(product.id);
    }
  }, [open, product?.id]);

  async function loadDetail(productId: string) {
    setLoadingDetail(true);
    try {
      const [sp, pricing, asset] = await Promise.all([
        sellingPointsApi.list(productId),
        pricingApi.list(productId),
        assetsApi.list(productId),
      ]);
      setSellingPoints(sp);
      setPricingList(pricing);
      setAssets(asset);
    } catch {
      toast.error('상세 정보를 불러오지 못했습니다');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function refreshSellingPoints() {
    if (!product) return;
    const sp = await sellingPointsApi.list(product.id);
    setSellingPoints(sp);
  }

  async function refreshPricing() {
    if (!product) return;
    const pricing = await pricingApi.list(product.id);
    setPricingList(pricing);
  }

  async function refreshAssets() {
    if (!product) return;
    const asset = await assetsApi.list(product.id);
    setAssets(asset);
  }

  if (!product) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <div className="px-6 pt-6 pb-2 border-b">
          <h2 className="text-lg font-bold pr-8">{product.name}</h2>
        </div>
        {loadingDetail ? (
          <div className="space-y-3 mt-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="basic">기본정보</TabsTrigger>
              <TabsTrigger value="selling-points">소구점</TabsTrigger>
              <TabsTrigger value="pricing">가격</TabsTrigger>
              <TabsTrigger value="assets">에셋</TabsTrigger>
            </TabsList>
            <TabsContent value="basic">
              <BasicInfoTab product={product} onSaved={onProductUpdated} />
            </TabsContent>
            <TabsContent value="selling-points">
              <SellingPointsTab
                productId={product.id}
                sellingPoints={sellingPoints}
                onRefresh={refreshSellingPoints}
              />
            </TabsContent>
            <TabsContent value="pricing">
              <PricingTab
                productId={product.id}
                pricingList={pricingList}
                onRefresh={refreshPricing}
              />
            </TabsContent>
            <TabsContent value="assets">
              <AssetsTab
                productId={product.id}
                assets={assets}
                onRefresh={refreshAssets}
              />
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── 새 상품 생성 Dialog ──────────────────────────────────────────────────────

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

function CreateProductDialog({ open, onOpenChange, onCreated }: CreateProductDialogProps) {
  const [form, setForm] = useState<ProductCreate>({
    name: '',
    usp: '',
    appeal_points: [],
    mechanism: '',
    english_name: '',
    shape: '',
    default_utm_code: '',
    slug: '',
    form: '',
    dosage: '',
    cta_channel: '',
  });
  const [newAppealPoint, setNewAppealPoint] = useState('');
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setForm({
      name: '',
      usp: '',
      appeal_points: [],
      mechanism: '',
      english_name: '',
      shape: '',
      default_utm_code: '',
      slug: '',
      form: '',
      dosage: '',
      cta_channel: '',
    });
    setNewAppealPoint('');
  }

  function addAppealPoint() {
    if (!newAppealPoint.trim()) return;
    setForm((prev) => ({
      ...prev,
      appeal_points: [...(prev.appeal_points || []), newAppealPoint.trim()],
    }));
    setNewAppealPoint('');
  }

  function removeAppealPoint(index: number) {
    setForm((prev) => ({
      ...prev,
      appeal_points: (prev.appeal_points || []).filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await productsApi.create(form);
      toast.success('상품이 추가되었습니다');
      onOpenChange(false);
      resetForm();
      onCreated();
    } catch {
      toast.error('오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 상품 등록</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>품명 *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>영문명</Label>
              <Input
                value={form.english_name}
                onChange={(e) => setForm({ ...form, english_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>슬러그 (slug)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="예: black-hair-supplement"
              />
            </div>
            <div className="space-y-2">
              <Label>제형 (form)</Label>
              <Input
                value={form.form}
                onChange={(e) => setForm({ ...form, form: e.target.value })}
                placeholder="예: 캡슐, 정제"
              />
            </div>
            <div className="space-y-2">
              <Label>용량 (dosage)</Label>
              <Input
                value={form.dosage}
                onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                placeholder="예: 1일 2캡슐"
              />
            </div>
            <div className="space-y-2">
              <Label>CTA 채널</Label>
              <Input
                value={form.cta_channel}
                onChange={(e) => setForm({ ...form, cta_channel: e.target.value })}
                placeholder="예: 스마트스토어"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>핵심 USP</Label>
            <Textarea
              value={form.usp}
              onChange={(e) => setForm({ ...form, usp: e.target.value })}
              placeholder="예: 먹기만 해도 염색없이 머리가 뿌리부터 까맣게 나는 영양제"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>소구점</Label>
            <div className="flex gap-2">
              <Input
                value={newAppealPoint}
                onChange={(e) => setNewAppealPoint(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addAppealPoint();
                  }
                }}
                placeholder="소구점 입력 후 Enter 또는 추가 버튼"
              />
              <Button type="button" variant="outline" onClick={addAppealPoint}>
                추가
              </Button>
            </div>
            {(form.appeal_points || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {(form.appeal_points || []).map((point, index) => (
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
            <Label>기전</Label>
            <Textarea
              value={form.mechanism}
              onChange={(e) => setForm({ ...form, mechanism: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>형태</Label>
              <Input
                value={form.shape}
                onChange={(e) => setForm({ ...form, shape: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>기본 UTM 코드</Label>
              <Input
                value={form.default_utm_code}
                onChange={(e) => setForm({ ...form, default_utm_code: e.target.value })}
                placeholder="예: utm_source=naver&utm_medium=cpc"
              />
            </div>
          </div>
          <Button type="submit" className="w-full mt-2" disabled={saving}>
            {saving ? '등록 중...' : '등록'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const data = await productsApi.list();
      setProducts(data);
    } catch {
      toast.error('상품 목록을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await productsApi.delete(id);
      toast.success('상품이 삭제되었습니다');
      if (selectedProduct?.id === id) {
        setSheetOpen(false);
        setSelectedProduct(null);
      }
      fetchProducts();
    } catch {
      toast.error('오류가 발생했습니다');
    }
  }

  function openSheet(product: Product) {
    setSelectedProduct(product);
    setSheetOpen(true);
  }

  function handleProductUpdated(updated: Product) {
    setSelectedProduct(updated);
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">상품 관리</h1>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>상품 목록</CardTitle>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> 새 상품
              </Button>
            </DialogTrigger>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="등록된 상품이 없습니다"
              description="새 상품을 추가하여 시작하세요"
              action={<Button onClick={() => setCreateDialogOpen(true)}>새 상품 추가</Button>}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>품명</TableHead>
                  <TableHead>영문명</TableHead>
                  <TableHead>슬러그</TableHead>
                  <TableHead>핵심 USP</TableHead>
                  <TableHead>소구점</TableHead>
                  <TableHead className="w-16">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openSheet(product)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        {product.name}
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{product.english_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{product.slug}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{product.usp}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(product.appeal_points || []).slice(0, 2).map((point, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {point.length > 12 ? point.slice(0, 12) + '...' : point}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(e, product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateProductDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={fetchProducts}
      />

      <ProductDetailSheet
        product={selectedProduct}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onProductUpdated={handleProductUpdated}
      />
    </div>
  );
}
