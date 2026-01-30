import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api-client';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Check, Pencil, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [resetDialog, setResetDialog] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: '', userName: '' });
  const [newPassword, setNewPassword] = useState('');

  const loadUsers = async () => {
    const data = await authApi.listUsers();
    setUsers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await authApi.updateRole(userId, role);
      toast.success('역할이 변경되었습니다');
      loadUsers();
    } catch {
      toast.error('오류가 발생했습니다');
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      await authApi.approve(userId);
      toast.success('사용자가 승인되었습니다');
      loadUsers();
    } catch {
      toast.error('오류가 발생했습니다');
    }
  };

  const handleNameUpdate = async (userId: string, name: string) => {
    try {
      await authApi.updateName(userId, name);
      toast.success('이름이 변경되었습니다');
      setEditingNameId(null);
      loadUsers();
    } catch {
      toast.error('오류가 발생했습니다');
    }
  };

  const handlePasswordReset = async () => {
    try {
      await authApi.resetPassword(resetDialog.userId, newPassword);
      toast.success('비밀번호가 변경되었습니다');
      setResetDialog(prev => ({ ...prev, open: false }));
      setNewPassword('');
    } catch {
      toast.error('오류가 발생했습니다');
    }
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>사용자 관리</CardTitle>
          <CardDescription>등록된 사용자 목록과 승인 상태를 관리합니다</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>소속 팀</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {editingNameId === user.id ? (
                        <Input
                          value={editingNameValue}
                          onChange={(e) => setEditingNameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleNameUpdate(user.id, editingNameValue);
                            if (e.key === 'Escape') setEditingNameId(null);
                          }}
                          onBlur={() => handleNameUpdate(user.id, editingNameValue)}
                          className="h-8 w-[140px]"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 cursor-pointer group"
                          onClick={() => {
                            setEditingNameId(user.id);
                            setEditingNameValue(user.name);
                          }}
                        >
                          {user.name}
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.team?.name || '-'}</TableCell>
                    <TableCell>
                      {user.role === 'admin' ? (
                        <Badge variant="default">관리자</Badge>
                      ) : user.role === 'leader' ? (
                        <Badge variant="default">리더</Badge>
                      ) : user.is_approved ? (
                        <Badge variant="secondary">승인됨</Badge>
                      ) : (
                        <Badge variant="outline">대기중</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select value={user.role} onValueChange={(value) => handleRoleChange(user.id, value)}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">사용자</SelectItem>
                          <SelectItem value="leader">리더</SelectItem>
                          <SelectItem value="admin">관리자</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString('ko-KR')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {!user.is_approved && user.role === 'user' && (
                          <Button size="sm" onClick={() => handleApprove(user.id)}>
                            <Check className="w-4 h-4 mr-1" />
                            승인
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setResetDialog({ open: true, userId: user.id, userName: user.name })}>
                          <KeyRound className="w-4 h-4 mr-1" />
                          PW 재설정
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

      <Dialog open={resetDialog.open} onOpenChange={(open) => { setResetDialog(prev => ({ ...prev, open })); setNewPassword(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{resetDialog.userName} 비밀번호 재설정</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>새 비밀번호</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="새 비밀번호 입력" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialog(prev => ({ ...prev, open: false }))}>취소</Button>
            <Button onClick={handlePasswordReset} disabled={!newPassword}>변경</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
