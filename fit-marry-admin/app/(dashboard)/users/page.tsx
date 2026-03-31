"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Ban, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { enUS } from "date-fns/locale"; // Or arabic locale if desired
import { cn } from "@/lib/utils";

type User = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  role: string;
  isVerified: boolean;
  status: "ACTIVE" | "SUSPENDED" | "BANNED";
  createdAt: string;
};

export default function UsersPage() {
  const queryClient = useQueryClient();

  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get("/admin/users");
      return res.data;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "ban" | "unban" | "suspend" }) => {
      await api.post(`/admin/users/${id}/${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="p-8 text-red-500">حدث خطأ أثناء جلب البيانات</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>إدارة المستخدمين</CardTitle>
        <CardDescription>عرض وإدارة جميع المستخدمين المسجلين في التطبيق</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>البريد/الهاتف</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ التسجيل</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  <a href={`/users/${user.id}`} className="hover:underline text-primary">
                    {user.displayName || "مستخدم غير معرف"}
                  </a>
                </TableCell>
                <TableCell>{user.email || user.phone}</TableCell>
                <TableCell>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-semibold",
                    user.status === "ACTIVE" && "bg-green-100 text-green-700",
                    user.status === "SUSPENDED" && "bg-yellow-100 text-yellow-700",
                    user.status === "BANNED" && "bg-red-100 text-red-700"
                  )}>
                    {user.status === "ACTIVE" && "نشط"}
                    {user.status === "SUSPENDED" && "معلق"}
                    {user.status === "BANNED" && "محظور"}
                  </span>
                </TableCell>
                <TableCell>{format(new Date(user.createdAt), "yyyy/MM/dd")}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {user.status !== "BANNED" && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => actionMutation.mutate({ id: user.id, action: "ban" })}
                        disabled={actionMutation.isPending}
                      >
                        <Ban size={16} />
                      </Button>
                    )}
                    {user.status !== "ACTIVE" && (
                       <Button 
                         size="sm" 
                         variant="outline"
                         className="text-green-600 hover:text-green-700 hover:bg-green-50"
                         onClick={() => actionMutation.mutate({ id: user.id, action: "unban" })}
                         disabled={actionMutation.isPending}
                       >
                         <CheckCircle size={16} />
                       </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
