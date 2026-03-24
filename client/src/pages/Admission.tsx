import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useBatches, useCreateStudent, useStudents } from "@/hooks/use-finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertStudentSchema } from "@/lib/schemas";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, CheckCircle2, ChevronDown, GraduationCap, RefreshCw } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { type User } from "@/lib/schemas";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const studentFormSchema = insertStudentSchema.extend({
  batchId: z.coerce.number().min(1, "Select a batch"),
  mobileNumber: z.string().optional(),
});

export default function Admission() {
  const [open, setOpen] = useState(false);
  const { data: batches } = useBatches();
  const { data: students, refetch: refetchStudents } = useStudents();
  const createStudent = useCreateStudent();
  const { toast } = useToast();
  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });

  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";

  const form = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: "",
      batchId: 0,
      mobileNumber: "",
    },
  });

  function onSubmit(values: z.infer<typeof studentFormSchema>) {
    createStudent.mutate({ ...values, studentCustomId: null }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: ["/api/students"] });
        queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
        toast({
          title: "Success",
          description: "Student has been admitted successfully.",
        });
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Admission Failed",
          description: error.message,
        });
      },
    });
  }

  // Build admission list data
  const myStudents = isTeacher
    ? (students as any[] | undefined)?.filter((s: any) => s.addedByUserId === (user as any)?.id) ?? []
    : [];

  const allStudents = isAdmin
    ? (students as any[] | undefined) ?? []
    : [];

  // Group teacher's own students by batch
  const myStudentsByBatch: Record<string, any[]> = {};
  for (const s of myStudents) {
    const batchName = s.batch?.name ?? "Unknown";
    if (!myStudentsByBatch[batchName]) myStudentsByBatch[batchName] = [];
    myStudentsByBatch[batchName].push(s);
  }

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd MMM yyyy"); } catch { return "—"; }
  };

  return (
    <Layout
      title="Student Admission"
      subtitle="Enroll new students into classes"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Admission card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <UserPlus className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">New Admission</h2>
            <p className="text-muted-foreground">Fill in student details to enroll them in a batch.</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="w-full shadow-lg hover:shadow-xl transition-all h-12 text-lg">
                Start Admission Process
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Student Admission Form</DialogTitle>
                <DialogDescription>Enter the student's information below.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mobileNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="e.g. 01700000000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="batchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class/Batch</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a class" />
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
                  <Button type="submit" className="w-full h-11" disabled={createStudent.isPending}>
                    {createStudent.isPending ? "Processing..." : "Confirm Admission"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-800 font-medium leading-relaxed">
            Students added here will immediately appear in the payment list and administrative records.
          </p>
        </div>

        {/* ── TEACHER: My Admissions (own records only) ── */}
        {isTeacher && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100">
                  <GraduationCap className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">My Admissions</h3>
                  <p className="text-xs text-muted-foreground">Students you have enrolled</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{myStudents.length} student{myStudents.length !== 1 ? "s" : ""}</Badge>
                <Button variant="outline" size="sm" className="gap-1.5 text-slate-600 h-8" onClick={() => refetchStudents()}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </Button>
              </div>
            </div>

            {myStudents.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                You haven't admitted any students yet.
              </div>
            ) : (
              <div className="p-4">
                <Accordion type="multiple" className="space-y-2">
                  {Object.entries(myStudentsByBatch).map(([batchName, batchStudents]) => (
                    <AccordionItem
                      key={batchName}
                      value={batchName}
                      className="border border-slate-100 rounded-xl overflow-hidden"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">Class {batchName}</span>
                          <Badge variant="secondary" className="text-xs">{batchStudents.length} student{batchStudents.length !== 1 ? "s" : ""}</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-0 pb-0">
                        <div className="border-t border-slate-100">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                                <th className="px-4 py-2 text-left font-medium">Name</th>
                                <th className="px-4 py-2 text-left font-medium">ID</th>
                                <th className="px-4 py-2 text-left font-medium">Class</th>
                                <th className="px-4 py-2 text-left font-medium">Admitted</th>
                              </tr>
                            </thead>
                            <tbody>
                              {batchStudents.map((s: any) => (
                                <tr key={s.id} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors">
                                  <td className="px-4 py-2.5 font-medium text-slate-800">{s.name}</td>
                                  <td className="px-4 py-2.5 text-slate-500">{s.studentCustomId ?? "—"}</td>
                                  <td className="px-4 py-2.5 text-slate-600">{s.batch?.name ?? "—"}</td>
                                  <td className="px-4 py-2.5 text-slate-500">{formatDate(s.admissionDate)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </div>
        )}

        {/* ── ADMIN: All Admitted Students ── */}
        {isAdmin && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100">
                  <GraduationCap className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">All Admitted Students</h3>
                  <p className="text-xs text-muted-foreground">Complete admission records across all teachers</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{allStudents.length} total</Badge>
                <Button variant="outline" size="sm" className="gap-1.5 text-slate-600 h-8" onClick={() => refetchStudents()}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </Button>
              </div>
            </div>

            {allStudents.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No students have been admitted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                      <th className="px-4 py-3 text-left font-medium">Name</th>
                      <th className="px-4 py-3 text-left font-medium">ID</th>
                      <th className="px-4 py-3 text-left font-medium">Class</th>
                      <th className="px-4 py-3 text-left font-medium">Admitted By</th>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allStudents.map((s: any) => (
                      <tr key={s.id} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-slate-800">{s.name}</td>
                        <td className="px-4 py-2.5 text-slate-500">{s.studentCustomId ?? "—"}</td>
                        <td className="px-4 py-2.5 text-slate-600">{s.batch?.name ?? "—"}</td>
                        <td className="px-4 py-2.5">
                          {s.addedByUser ? (
                            <span className="inline-flex items-center gap-1.5 text-indigo-700 font-medium">
                              <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                                {s.addedByUser.username?.charAt(0)?.toUpperCase()}
                              </span>
                              {s.addedByUser.username}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Not recorded</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{formatDate(s.admissionDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
