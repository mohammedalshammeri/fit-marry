"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MessageSquareText, ShieldAlert, User } from "lucide-react";
import { format } from "date-fns";

export default function ComplaintDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const { data: complaint, isLoading } = useQuery({
    queryKey: ["complaint", id],
    queryFn: () => api.get(`/admin/complaints/${id}`).then((r) => r.data),
  });

  const { data: messages } = useQuery({
    queryKey: ["complaint-messages", id],
    queryFn: () => api.get(`/admin/complaints/${id}/messages`).then((r) => r.data),
    enabled: !!complaint?.conversationId,
  });

  if (isLoading) return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>;
  if (!complaint) return <div className="p-8 text-center text-red-500">لم يتم العثور على الشكوى</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">تفاصيل الشكوى</h1>
        <Badge variant={complaint.status === "OPEN" ? "destructive" : "secondary"}>
          {complaint.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-gray-500" />
              المعلومات الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-gray-500 text-sm block">تاريخ الشكوى</span>
              <span className="font-medium">{format(new Date(complaint.createdAt), "yyyy-MM-dd HH:mm")}</span>
            </div>
            <div>
              <span className="text-gray-500 text-sm block">السبب</span>
              <span className="font-medium">{complaint.reason}</span>
            </div>
            {complaint.details && (
              <div>
                <span className="text-gray-500 text-sm block">تفاصيل إضافية</span>
                <p className="bg-gray-50 p-3 rounded mt-1 text-sm">{complaint.details}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-500" />
              أطراف الشكوى
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 border rounded-lg bg-red-50 border-red-100">
              <span className="text-red-800 text-sm font-bold block mb-1">المُبلّغ ضده (المشكو في حقه)</span>
              <span className="font-medium text-red-900">{complaint.reported?.profile?.nickname || "مستخدم غير معروف"}</span>
              <span className="text-red-700 text-xs block">{complaint.reportedUser}</span>
            </div>
            <div className="p-3 border rounded-lg">
              <span className="text-gray-500 text-sm block mb-1">المُقدّم (الشاكي)</span>
              <span className="font-medium">{complaint.reporter?.profile?.nickname || "مستخدم غير معروف"}</span>
              <span className="text-gray-400 text-xs block">{complaint.reporterUser}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {complaint.conversationId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-blue-500" />
              سجل المحادثة المتعلقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {messages?.length ? (
              <div className="space-y-3 max-h-96 overflow-y-auto p-4 border rounded bg-slate-50">
                {messages.map((msg: any) => {
                   const isReported = msg.senderId === complaint.reportedUser;
                   return (
                    <div key={msg.id} className={`p-3 rounded-lg max-w-[80%] ${isReported ? 'bg-red-100 mr-auto' : 'bg-white ml-auto border'}`}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-gray-700">
                                {isReported ? 'المُبلّغ ضده' : 'الشاكي'}
                            </span>
                            <span className="text-[10px] text-gray-400">{format(new Date(msg.createdAt), 'HH:mm')}</span>
                        </div>
                        <p className="text-sm">{msg.text || (msg.type === 'IMAGE' ? '[صورة]' : '[صوت]')}</p>
                    </div>
                   );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">لا توجد رسائل متاحة أو تم حذفها.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
