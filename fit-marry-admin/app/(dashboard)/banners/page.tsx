"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

type Banner = {
  id: string;
  title: string;
  imageUrl: string;
  startAt: string;
  endAt: string;
  targetCountries: string[];
  targetLanguages: string[];
};

export default function BannersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    imageUrl: "",
    startAt: "",
    endAt: "",
    targetCountries: "",
    targetLanguages: "",
  });

  const { data: banners, isLoading, error } = useQuery<Banner[]>({
    queryKey: ["banners"],
    queryFn: async () => {
      const res = await api.get("/admin/banners");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        targetCountries: data.targetCountries.split(",").map((s: string) => s.trim()).filter(Boolean),
        targetLanguages: data.targetLanguages.split(",").map((s: string) => s.trim()).filter(Boolean),
      };
      await api.post("/admin/banners", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      setOpen(false);
      setFormData({ title: "", imageUrl: "", startAt: "", endAt: "", targetCountries: "", targetLanguages: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/banners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="p-8 text-red-500">حدث خطأ أثناء تحميل البيانات</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>إدارة الإعلانات</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="flex gap-2"><Plus size={16} /> إضافة إعلان</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة إعلان جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>عنوان الإعلان</Label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>رابط الصورة</Label>
                <Input value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} required placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label>تاريخ البدء</Label>
                   <Input type="date" value={formData.startAt} onChange={e => setFormData({...formData, startAt: e.target.value})} required />
                </div>
                <div className="space-y-2">
                   <Label>تاريخ الانتهاء</Label>
                   <Input type="date" value={formData.endAt} onChange={e => setFormData({...formData, endAt: e.target.value})} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>الدول المستهدفة (فاصلة للدول المتعددة)</Label>
                <Input value={formData.targetCountries} onChange={e => setFormData({...formData, targetCountries: e.target.value})} placeholder="EG, SA, AE" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>العنوان</TableHead>
              <TableHead>الصورة</TableHead>
              <TableHead>الفترة</TableHead>
              <TableHead>الاستهداف</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banners?.map((banner) => (
              <TableRow key={banner.id}>
                <TableCell>{banner.title}</TableCell>
                <TableCell>
                  <img src={banner.imageUrl} alt={banner.title} className="h-10 w-20 object-cover rounded" />
                </TableCell>
                <TableCell>
                  <div className="text-xs">
                    {format(new Date(banner.startAt), "yyyy/MM/dd")} - {format(new Date(banner.endAt), "yyyy/MM/dd")}
                  </div>
                </TableCell>
                <TableCell>{banner.targetCountries.join(", ") || "الكل"}</TableCell>
                <TableCell>
                  <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(banner.id)}>
                    <Trash2 size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {banners?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">لا توجد إعلانات</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
