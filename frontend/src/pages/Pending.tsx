import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export default function Pending() {
  const { user, logout } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Clock className="w-16 h-16 text-muted-foreground" />
          </div>
          <CardTitle>승인 대기 중</CardTitle>
          <CardDescription>
            관리자의 승인을 기다리고 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>{user?.name}</strong>님의 계정이 생성되었습니다.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              관리자가 승인하면 서비스를 이용할 수 있습니다.
            </p>
          </div>
          <Button variant="outline" onClick={logout} className="w-full">
            로그아웃
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
