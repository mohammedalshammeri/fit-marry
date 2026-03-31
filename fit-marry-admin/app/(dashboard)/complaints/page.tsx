"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Complaint = {
  id: string;
  category: string;
  text?: string | null;
  status: string;
  createdAt: string;
  reporterId: string;
  reportedUserId: string;
  conversationId?: string | null;
  attachments?: Array<{ id: string; url: string }>;
  reporter?: { id: string; email?: string | null; phone?: string | null; profile?: { nickname?: string | null } | null };
  reportedUser?: { id: string; email?: string | null; phone?: string | null; profile?: { nickname?: string | null } | null };
};

type LimitedMessage = {
  id: string;
  senderId: string;
  type: "TEXT" | "IMAGE" | "VOICE";
  text: string | null;
  mediaUrl: string | null;
  createdAt: string;
};

type LimitedMessagesResponse = {
  complaintId: string;
  conversationId: string;
  items: LimitedMessage[];
};

export default function ComplaintsPage() {
  const queryClient = useQueryClient();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [open, setOpen] = useState(false);

  const { data: complaints, isLoading, error } = useQuery<Complaint[]>({
    queryKey: ["complaints"],
    queryFn: async () => {
      const res = await api.get("/admin/complaints");
      return res.data;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "WARN" | "SUSPEND" | "BAN" }) => {
      await api.post(`/admin/complaints/${id}/actions`, { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      setSelectedComplaint(null);
      setOpen(false);
    },
  });

  const complaintDetailsQuery = useQuery<Complaint>({
    queryKey: ["complaint-details", selectedComplaint?.id],
    queryFn: async () => {
      const res = await api.get(`/admin/complaints/${selectedComplaint?.id}`);
      return res.data;
    },
    enabled: open && !!selectedComplaint?.id,
  });

  const limitedMessagesQuery = useQuery<LimitedMessagesResponse>({
    queryKey: ["complaint-limited-messages", selectedComplaint?.id],
    queryFn: async () => {
      const res = await api.post("/admin/complaints/limited-messages", {
        complaintId: selectedComplaint?.id,
        limit: 20,
      });
      return res.data;
    },
    enabled: open && !!selectedComplaint?.id && !!selectedComplaint?.conversationId,
  });

  const details = complaintDetailsQuery.data ?? selectedComplaint;

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="p-8 text-red-500">فشل تحميل البلاغات</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>البلاغات والشكاوى</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المبلغ</TableHead>
              <TableHead>المبلغ عنه</TableHead>
              <TableHead>السبب</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {complaints?.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{getDisplayName(c.reporter, c.reporterId)}</TableCell>
                <TableCell>{getDisplayName(c.reportedUser, c.reportedUserId)}</TableCell>
                <TableCell>{c.category}</TableCell>
                <TableCell>
                    <span className={cn(
                        "px-2 py-1 rounded text-xs",
                        c.status === "OPEN" || c.status === "UNDER_REVIEW" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                    )}>
                        {translateComplaintStatus(c.status)}
                    </span>
                </TableCell>
                <TableCell>
                  <Dialog
                    open={open && selectedComplaint?.id === c.id}
                    onOpenChange={(value) => {
                      setOpen(value);
                      setSelectedComplaint(value ? c : null);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => { setSelectedComplaint(c); setOpen(true); }}>مراجعة</Button>
                    </DialogTrigger>
                    {selectedComplaint?.id === c.id && (
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>تفاصيل البلاغ</DialogTitle>
                                <DialogDescription>مراجعة الشكوى والسياق المحدود للمحادثة قبل اتخاذ الإجراء.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <Label>المبلغ:</Label>
                                        <div className="font-semibold">{getDisplayName(details?.reporter, details?.reporterId || c.reporterId)}</div>
                                    </div>
                                    <div>
                                        <Label>المبلغ عنه:</Label>
                                        <div className="font-semibold">{getDisplayName(details?.reportedUser, details?.reportedUserId || c.reportedUserId)}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <Label>نوع البلاغ:</Label>
                                    <div className="font-semibold">{details?.category || c.category}</div>
                                  </div>
                                  <div>
                                    <Label>الحالة:</Label>
                                    <div className="font-semibold">{translateComplaintStatus(details?.status || c.status)}</div>
                                  </div>
                                </div>
                                <div>
                                    <Label>الوصف:</Label>
                                    <p className="mt-1 rounded bg-muted p-2 text-sm">{details?.text || "لا يوجد وصف"}</p>
                                </div>

                                <div>
                                  <Label>المرفقات:</Label>
                                  <div className="mt-2 space-y-2 text-sm">
                                    {details?.attachments?.length ? details.attachments.map((attachment) => (
                                      <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="block text-blue-600 underline">
                                        {attachment.url}
                                      </a>
                                    )) : <p className="text-muted-foreground">لا توجد مرفقات</p>}
                                  </div>
                                </div>

                                <div>
                                  <Label>رسائل محدودة من المحادثة:</Label>
                                  <div className="mt-2 max-h-72 space-y-2 overflow-y-auto rounded border p-3">
                                    {!selectedComplaint?.conversationId ? (
                                      <p className="text-sm text-muted-foreground">هذا البلاغ غير مرتبط بمحادثة.</p>
                                    ) : limitedMessagesQuery.isLoading ? (
                                      <div className="flex justify-center py-6"><Loader2 className="animate-spin" /></div>
                                    ) : limitedMessagesQuery.error ? (
                                      <p className="text-sm text-red-500">تعذر تحميل الرسائل المحدودة.</p>
                                    ) : limitedMessagesQuery.data?.items.length ? (
                                      limitedMessagesQuery.data.items.map((message) => (
                                        <div key={message.id} className="rounded-md bg-muted/60 p-3 text-sm">
                                          <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                            <span>{message.senderId === details?.reporterId ? "المبلغ" : message.senderId === details?.reportedUserId ? "المبلغ عنه" : message.senderId}</span>
                                            <span>{new Date(message.createdAt).toLocaleString("ar-EG")}</span>
                                          </div>
                                          <div className="font-medium">{translateMessageType(message.type)}</div>
                                          <div className="mt-1 text-foreground">{message.text || "تم إخفاء محتوى الوسائط حفاظاً على الخصوصية"}</div>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-sm text-muted-foreground">لا توجد رسائل متاحة ضمن هذا البلاغ.</p>
                                    )}
                                  </div>
                                </div>
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="secondary" onClick={() => actionMutation.mutate({ id: c.id, action: "WARN" })} disabled={actionMutation.isPending}>تحذير</Button>
                                <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => actionMutation.mutate({ id: c.id, action: "SUSPEND" })} disabled={actionMutation.isPending}>تعليق حساب</Button>
                                <Button variant="destructive" onClick={() => actionMutation.mutate({ id: c.id, action: "BAN" })} disabled={actionMutation.isPending}>حظر نهائي</Button>
                            </DialogFooter>
                        </DialogContent>
                    )}
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
             {complaints?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">لا توجد بلاغات جديدة</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function getDisplayName(user: Complaint["reporter"] | Complaint["reportedUser"] | undefined, fallback: string) {
  return user?.profile?.nickname || user?.email || user?.phone || fallback;
}

function translateComplaintStatus(status: string) {
  switch (status) {
    case "OPEN":
      return "مفتوح";
    case "UNDER_REVIEW":
      return "قيد المراجعة";
    case "ACTION_TAKEN":
      return "تم اتخاذ إجراء";
    case "CLOSED":
      return "مغلق";
    default:
      return status;
  }
}

function translateMessageType(type: LimitedMessage["type"]) {
  switch (type) {
    case "TEXT":
      return "رسالة نصية";
    case "IMAGE":
      return "صورة";
    case "VOICE":
      return "رسالة صوتية";
    default:
      return type;
  }
}
