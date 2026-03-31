"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, Loader2, Eye, ShieldCheck, ShieldX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VerificationRequest {
  id: string;
  userId: string;
  selfieUrl: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  user?: { firstName?: string; email?: string; phone?: string };
}

export default function VerificationPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["verification-pending", page],
    queryFn: () => api.get(`/admin/verification/pending?page=${page}&limit=20`).then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/verification/${id}/approve`, { adminId: "current" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification-pending"] });
      setSelectedRequest(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post(`/admin/verification/${id}/reject`, { adminId: "current", reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification-pending"] });
      setSelectedRequest(null);
      setRejectReason("");
    },
  });

  const formatDate = (d: string) =>
    new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "short", day: "numeric" }).format(new Date(d));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">توثيق الحسابات</h1>
        <p className="text-muted-foreground">مراجعة طلبات توثيق الحسابات بالسيلفي</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-amber-100 p-3">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">بانتظار المراجعة</p>
                <p className="text-2xl font-bold">{data?.total ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>طلبات التوثيق المعلقة</CardTitle>
          <CardDescription>راجع صور السيلفي ووافق أو ارفض</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.items?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-green-100 p-4 mb-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="font-medium">لا توجد طلبات معلقة</p>
              <p className="text-sm text-muted-foreground">جميع الطلبات تمت مراجعتها</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>تاريخ الطلب</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((req: VerificationRequest) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.userId}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(req.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700">
                        <Clock className="h-3 w-3" />
                        معلق
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedRequest(req)}>
                          <Eye className="h-4 w-4 ml-1" /> مراجعة
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => approveMutation.mutate(req.id)}
                          disabled={approveMutation.isPending}
                        >
                          <ShieldCheck className="h-4 w-4 ml-1" /> موافقة
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

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>مراجعة طلب التوثيق</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={selectedRequest.selfieUrl}
                  alt="صورة السيلفي"
                  className="w-full h-auto max-h-96 object-contain bg-gray-50"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                المعرف: {selectedRequest.userId}
              </div>
              <div className="space-y-2">
                <Label>سبب الرفض (اختياري)</Label>
                <Input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="اكتب سبب الرفض إن وجد..."
                />
              </div>
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                  onClick={() => approveMutation.mutate(selectedRequest.id)}
                  disabled={approveMutation.isPending}
                >
                  <ShieldCheck className="h-4 w-4" /> موافقة
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-2"
                  onClick={() =>
                    rejectMutation.mutate({
                      id: selectedRequest.id,
                      reason: rejectReason || undefined,
                    })
                  }
                  disabled={rejectMutation.isPending}
                >
                  <ShieldX className="h-4 w-4" /> رفض
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
