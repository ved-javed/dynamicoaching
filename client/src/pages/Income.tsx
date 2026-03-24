import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useIncomes, useCreateIncome, useDeleteIncome, useBatches, useStudents } from "@/hooks/use-finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Search, Filter, Calendar as CalendarIcon, CheckCircle, History as HistoryIcon, MessageCircle } from "lucide-react";
import { buildPaymentWhatsAppUrl } from "@/lib/whatsapp";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertIncomeSchema, type Income as IncomeType, type Batch, type Student } from "@/lib/schemas";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const formSchema = insertIncomeSchema.extend({
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  batchId: z.coerce.number().min(1, "Select a batch"),
  studentId: z.coerce.number().min(1, "Select a student"),
});

type IncomeWithRelations = IncomeType & {
  student?: Student;
  batch?: Batch;
  addedBy?: string;
};

export default function Income() {
  const { data: user } = useQuery<any>({ queryKey: ["/api/user"] });
  const [open, setOpen] = useState(false);
  const { data: incomes, isLoading } = useIncomes();
  const { data: batches } = useBatches();
  const { data: students } = useStudents();
  
  const createMutation = useCreateIncome();
  const deleteMutation = useDeleteIncome();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: 0,
      batchId: 0,
      month: MONTHS[new Date().getMonth()],
      amount: 0,
    },
  });

  const selectedBatchId = form.watch("batchId");
  const filteredStudents = (students as any[])?.filter(s => s.batchId === Number(selectedBatchId)) || [];

  const verifyMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/incomes/${id}/status`, { status: "Verified" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incomes"] });
      toast({
        title: "Payment Verified",
        description: "The payment has been marked as verified.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    form.setValue("studentId", 0);
  }, [selectedBatchId, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    createMutation.mutate(values, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        toast({
          title: "Payment added",
          description: "Payment recorded successfully",
        });
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      },
    });
  }

  function handleDelete(id: number) {
    if (confirm("Are you sure you want to delete this record?")) {
        deleteMutation.mutate(id, {
            onSuccess: () => {
                toast({ title: "Record deleted" });
            }
        });
    }
  }

  const filteredIncomes = (incomes as IncomeWithRelations[])?.filter(inc => 
    inc.student?.name.toLowerCase().includes(search.toLowerCase()) || 
    inc.batch?.name.toLowerCase().includes(search.toLowerCase())
  );

  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";

  if (user?.role === "student") {
    return (
      <Layout title="Payments" subtitle="View your payment history">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full mb-4">
            <HistoryIcon className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Personal History Only</h2>
          <p className="text-slate-500 max-w-md mt-2">
            Students can only view their own payment history from the Dashboard. You do not have permission to record or manage payments.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
        title="Payment Records" 
        subtitle="Manage tuition payments and income sources"
        action={
            isTeacher && (
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="shadow-lg hover:shadow-xl transition-all">
                            <Plus className="w-4 h-4 mr-2" /> Add Payment
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add New Payment</DialogTitle>
                            <DialogDescription>
                                Record a tuition payment from a student.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                                <FormField
                                    control={form.control}
                                    name="batchId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Batch</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value?.toString()}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a batch" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {(batches as any[])?.map((batch) => (
                                                        <SelectItem key={batch.id} value={batch.id.toString()}>{batch.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="studentId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Student</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value?.toString()} disabled={!selectedBatchId}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={selectedBatchId ? "Select a student" : "Select batch first"} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <div className="p-2 border-b border-border/50">
                                                        <Input 
                                                            placeholder="Search Student ID or Name..." 
                                                            className="h-8 text-xs"
                                                            onChange={(e) => {
                                                                const val = e.target.value.toLowerCase();
                                                                const items = document.querySelectorAll('[role="option"]');
                                                                items.forEach((item: any) => {
                                                                    const text = item.innerText.toLowerCase();
                                                                    if (text.includes(val)) {
                                                                        item.style.display = 'flex';
                                                                    } else {
                                                                        item.style.display = 'none';
                                                                    }
                                                                });
                                                            }}
                                                        />
                                                    </div>
                                                    {filteredStudents.map((student: any) => (
                                                        <SelectItem key={student.id} value={student.id.toString()}>
                                                            {student.name} ({student.studentCustomId})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="month"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Month</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a month" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {MONTHS.map((month) => (
                                                        <SelectItem key={month} value={month}>{month}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Amount (৳)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="0.00" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex flex-col gap-1 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                                    <div className="flex items-center gap-2">
                                        <Plus className="w-3 h-3" />
                                        <span>Recorded by: {user?.username}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon className="w-3 h-3" />
                                        <span>Recorded date will be set to: {format(new Date(), "PPpp")}</span>
                                    </div>
                                </div>
                                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? "Adding..." : "Add Record"}
                                </Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            )
        }
    >
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search student or batch..." 
                        className="pl-9 bg-background" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Filter className="w-4 h-4" />
                    <span>{filteredIncomes?.length || 0} records found</span>
                </div>
            </div>

            <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Student Name</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Month</TableHead>
                    {isAdmin && <TableHead>Added By</TableHead>}
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[90px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 6} className="h-24 text-center">Loading...</TableCell>
                    </TableRow>
                  ) : filteredIncomes?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 6} className="h-24 text-center">No records found.</TableCell>
                    </TableRow>
                  ) : (
                    filteredIncomes?.map((inc: any) => (
                      <TableRow 
                        key={inc.id} 
                        className={`group transition-colors ${
                          inc.status === 'Pending' 
                            ? 'bg-amber-500/5 hover:bg-amber-500/10' 
                            : inc.status === 'Verified'
                            ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                            : 'hover:bg-muted/30'
                        }`}
                      >
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {inc.student?.name}
                              {inc.status === 'Pending' && (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Pending</span>
                              )}
                              {inc.status === 'Verified' && (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <CheckCircle className="w-2.5 h-2.5" />
                                  Verified
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {inc.batch?.name}
                          </span>
                        </TableCell>
                        <TableCell>{inc.month}</TableCell>
                        {isAdmin && <TableCell>{inc.addedBy || "N/A"}</TableCell>}
                        <TableCell className="text-muted-foreground text-sm">{format(new Date(inc.date), "MMM d, y")}</TableCell>
                        <TableCell className="text-right font-medium text-emerald-600">
                          <div className="flex items-center justify-end gap-3">
                            +৳{inc.amount.toLocaleString()}
                            {isAdmin && inc.status === 'Pending' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-7 text-[10px] bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 hover:text-white"
                                onClick={() => verifyMutation.mutate(inc.id)}
                                disabled={verifyMutation.isPending}
                              >
                                {verifyMutation.isPending ? "..." : "Verify"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100">
                            {isAdmin && inc.student?.mobileNumber && (() => {
                              const url = buildPaymentWhatsAppUrl(
                                inc.student.mobileNumber,
                                inc.amount,
                                inc.student.name,
                                inc.month
                              );
                              return url ? (
                                <a href={url} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="icon" className="text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]">
                                    <MessageCircle className="w-4 h-4" />
                                  </Button>
                                </a>
                              ) : null;
                            })()}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleDelete(inc.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
            </Table>
        </div>
    </Layout>
  );
}
