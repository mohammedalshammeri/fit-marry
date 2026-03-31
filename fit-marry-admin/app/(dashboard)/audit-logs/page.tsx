"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

type AuditLog = {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actorAdmin: { email: string } | null;
  actorUserId: string | null;
};

export default function AuditLogsPage() {
  const { data: logs, isLoading, error } = useQuery<AuditLog[]>({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const res = await api.get("/admin/audit-logs");
      return res.data;
    },
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="p-8 text-red-500">فشل تحميل السجلات</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>سجلات النظام</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المشرف/المستخدم</TableHead>
              <TableHead>الإجراء</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>المعرف</TableHead>
              <TableHead>التاريخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.actorAdmin?.email || "System"}</TableCell>
                <TableCell className="font-mono text-xs">{log.actionType}</TableCell>
                <TableCell>{log.entityType}</TableCell>
                <TableCell className="font-mono text-xs">{log.entityId}</TableCell>
                <TableCell>{format(new Date(log.createdAt), "yyyy/MM/dd HH:mm")}</TableCell>
              </TableRow>
            ))}
             {logs?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">لا توجد سجلات</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
