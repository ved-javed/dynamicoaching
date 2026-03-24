import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useStudents, useBatches } from "@/hooks/use-finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type User } from "@/lib/schemas";
import { TrendingUp, Plus, Trash2, BookOpen, ClipboardList, Eye, MessageCircle, Pencil, CheckCircle2, Clock, Send, ChevronRight, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { buildSubjectWhatsAppUrl, buildResultWhatsAppUrl } from "@/lib/whatsapp";
import { Link } from "wouter";

function getGrade(obtained: number, total: number): { grade: string; gp: number } {
  const pct = total > 0 ? (obtained / total) * 100 : 0;
  if (pct >= 80) return { grade: "A+", gp: 5.0 };
  if (pct >= 70) return { grade: "A", gp: 4.0 };
  if (pct >= 60) return { grade: "A-", gp: 3.5 };
  if (pct >= 50) return { grade: "B", gp: 3.0 };
  if (pct >= 40) return { grade: "C", gp: 2.0 };
  if (pct >= 33) return { grade: "D", gp: 1.0 };
  return { grade: "F", gp: 0.0 };
}

function gradeColor(grade: string) {
  const map: Record<string, string> = {
    "A+": "bg-emerald-500", A: "bg-green-500", "A-": "bg-teal-500",
    B: "bg-blue-500", C: "bg-yellow-500", D: "bg-orange-500", F: "bg-red-500",
  };
  return map[grade] ?? "bg-gray-400";
}

function WhatsAppBtn({ url }: { url: string }) {
  if (!url) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 cursor-not-allowed" disabled title="No phone number saved">
        <MessageCircle className="w-4 h-4" />
      </Button>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]">
        <MessageCircle className="w-4 h-4" />
      </Button>
    </a>
  );
}

type Subject = { name: string; totalMarks: string };

export default function EntryMarks() {
  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });
  const { data: students } = useStudents();
  const { data: batches } = useBatches();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"single" | "model">("single");

  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedShift, setSelectedShift] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [examName, setExamName] = useState("");
  const [subject, setSubject] = useState("");
  const [totalMarks, setTotalMarks] = useState("100");
  const [marks, setMarks] = useState<Record<number, string>>({});

  const [modelBatchId, setModelBatchId] = useState("");
  const [modelExamName, setModelExamName] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([{ name: "", totalMarks: "100" }]);
  const [modelMarks, setModelMarks] = useState<Record<number, Record<number, string>>>({});

  const { data: results } = useQuery<any[]>({
    queryKey: ["/api/results"],
    enabled: !!user,
  });

  const batchStudents = students?.filter((s) => s.batchId === Number(selectedBatchId)) || [];
  const modelBatchStudents = students?.filter((s) => s.batchId === Number(modelBatchId)) || [];
  const availableShifts = Array.from(new Set(batchStudents.map((s) => s.shift).filter(Boolean))) as string[];
  const availableGroups = Array.from(new Set(batchStudents.map((s) => s.academicGroup).filter(Boolean))) as string[];

  const filteredStudents = batchStudents.filter((s) => {
    const matchShift = selectedShift === "all" || s.shift === selectedShift;
    const matchGroup = selectedGroup === "all" || s.academicGroup === selectedGroup;
    return matchShift && matchGroup;
  });

  const createResultMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/results", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const [editingResult, setEditingResult] = useState<{
    id: number;
    examName: string;
    subject: string;
    obtainedMarks: number;
    totalMarks: number;
  } | null>(null);

  const updateResultMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest("PATCH", `/api/results/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      setEditingResult(null);
      toast({ title: "Result updated successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteResultMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/results/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      toast({ title: "Result deleted" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const handleSaveMarks = () => {
    if (!examName || !subject || !totalMarks || !selectedBatchId) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please fill in all exam details" });
      return;
    }
    const entries = Object.entries(marks).filter(([, v]) => v !== "");
    if (entries.length === 0) {
      toast({ variant: "destructive", title: "No marks entered" });
      return;
    }
    let saved = 0;
    entries.forEach(([studentId, obtainedMarks]) => {
      createResultMutation.mutate(
        { studentId: Number(studentId), batchId: Number(selectedBatchId), examName, subject, totalMarks: Number(totalMarks), obtainedMarks: Number(obtainedMarks), isModelTest: false },
        { onSuccess: () => { saved++; if (saved === entries.length) { toast({ title: "Marks saved successfully" }); setMarks({}); } } }
      );
    });
  };

  const handleSaveModelTest = () => {
    if (!modelBatchId || !modelExamName) {
      toast({ variant: "destructive", title: "Missing fields", description: "Select batch and enter exam name" });
      return;
    }
    const validSubjects = subjects.filter((s) => s.name.trim() && s.totalMarks);
    if (validSubjects.length === 0) {
      toast({ variant: "destructive", title: "Add at least one subject" });
      return;
    }
    const groupId = crypto.randomUUID();
    let total = 0;
    let count = 0;
    modelBatchStudents.forEach((student) => {
      validSubjects.forEach((subj, idx) => {
        const obtained = modelMarks[student.id]?.[idx];
        if (obtained !== undefined && obtained !== "") total++;
      });
    });
    if (total === 0) {
      toast({ variant: "destructive", title: "No marks entered" });
      return;
    }
    modelBatchStudents.forEach((student) => {
      validSubjects.forEach((subj, idx) => {
        const obtained = modelMarks[student.id]?.[idx];
        if (obtained !== undefined && obtained !== "") {
          createResultMutation.mutate(
            { studentId: student.id, batchId: Number(modelBatchId), examName: modelExamName, subject: subj.name, totalMarks: Number(subj.totalMarks), obtainedMarks: Number(obtained), isModelTest: true, modelTestGroupId: groupId },
            { onSuccess: () => { count++; if (count === total) { toast({ title: "Model Test saved!", description: `${total} results recorded.` }); setModelMarks({}); } } }
          );
        }
      });
    });
  };

  const addSubject = () => setSubjects((p) => [...p, { name: "", totalMarks: "100" }]);
  const removeSubject = (i: number) => setSubjects((p) => p.filter((_, j) => j !== i));
  const updateSubject = (i: number, field: keyof Subject, value: string) =>
    setSubjects((p) => p.map((s, j) => (j === i ? { ...s, [field]: value } : s)));
  const setStudentSubjectMark = (studentId: number, idx: number, value: string) =>
    setModelMarks((p) => ({ ...p, [studentId]: { ...(p[studentId] || {}), [idx]: value } }));

  // --- Admin: Draft creation state ---
  const [draftExamName, setDraftExamName] = useState("");
  const [draftBatchId, setDraftBatchId] = useState("");
  const [draftSubjects, setDraftSubjects] = useState<Subject[]>([{ name: "", totalMarks: "100" }]);

  // --- Teacher: Mark entry via draft state ---
  const [selectedDraftGroupId, setSelectedDraftGroupId] = useState("");
  const [teacherSubjectName, setTeacherSubjectName] = useState("");
  const [teacherMarks, setTeacherMarks] = useState<Record<number, string>>({});

  const addDraftSubject = () => setDraftSubjects((p) => [...p, { name: "", totalMarks: "100" }]);
  const removeDraftSubject = (i: number) => setDraftSubjects((p) => p.filter((_, j) => j !== i));
  const updateDraftSubject = (i: number, field: keyof Subject, value: string) =>
    setDraftSubjects((p) => p.map((s, j) => (j === i ? { ...s, [field]: value } : s)));

  const { data: modelTestDrafts, refetch: refetchDrafts } = useQuery<any[]>({
    queryKey: ["/api/model-test-drafts"],
    enabled: !!user && user.role !== "student",
  });

  const createDraftMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/model-test-drafts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/model-test-drafts"] });
      setDraftExamName("");
      setDraftBatchId("");
      setDraftSubjects([{ name: "", totalMarks: "100" }]);
      toast({ title: "Draft created!", description: "Teachers can now enter marks." });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to create draft" }),
  });

  const publishDraftMutation = useMutation({
    mutationFn: async (groupId: string) => {
      await apiRequest("PATCH", `/api/model-test-drafts/${groupId}/publish`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/model-test-drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      toast({ title: "Results Published!", description: "Students can now view their marksheets." });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to publish" }),
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (groupId: string) => {
      await apiRequest("DELETE", `/api/model-test-drafts/${groupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/model-test-drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      toast({ title: "Draft deleted" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to delete draft" }),
  });

  const saveModelTestMarksMutation = useMutation({
    mutationFn: async ({ groupId, entries }: { groupId: string; entries: any[] }) => {
      const res = await apiRequest("POST", `/api/model-test-drafts/${groupId}/marks`, { entries });
      return res.json();
    },
    onSuccess: (_data, { entries }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/model-test-drafts"] });
      const subject = entries[0]?.subject ?? "";
      toast({ title: "Marks saved!", description: `${entries.length} record${entries.length !== 1 ? "s" : ""} saved for ${subject}.` });
      setTeacherMarks({});
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to save marks", description: "Please try again." });
    },
  });

  const handleCreateDraft = () => {
    if (!draftExamName.trim() || !draftBatchId) {
      toast({ variant: "destructive", title: "Fill in Exam Name and Batch" });
      return;
    }
    const valid = draftSubjects.filter((s) => s.name.trim() && s.totalMarks);
    if (valid.length === 0) {
      toast({ variant: "destructive", title: "Add at least one subject" });
      return;
    }
    createDraftMutation.mutate({
      examName: draftExamName.trim(),
      batchId: Number(draftBatchId),
      subjects: valid.map((s) => ({ name: s.name.trim(), totalMarks: Number(s.totalMarks) })),
    });
  };

  const handleSaveTeacherMarks = () => {
    const draft = modelTestDrafts?.find((d) => d.groupId === selectedDraftGroupId);
    if (!draft || !teacherSubjectName) return;
    const subj = (draft.subjects as { name: string; totalMarks: number }[]).find((s) => s.name === teacherSubjectName);
    if (!subj) return;
    const draftBatchStudents = students?.filter((s) => s.batchId === draft.batchId) || [];
    const filled = draftBatchStudents.filter(
      (s) => teacherMarks[s.id] !== undefined && teacherMarks[s.id] !== ""
    );
    if (filled.length === 0) {
      toast({ variant: "destructive", title: "No marks entered" });
      return;
    }
    const entries = filled.map((student) => ({
      studentId: student.id,
      batchId: draft.batchId,
      examName: draft.examName,
      subject: teacherSubjectName,
      totalMarks: subj.totalMarks,
      obtainedMarks: Number(teacherMarks[student.id]),
    }));
    saveModelTestMarksMutation.mutate({ groupId: draft.groupId, entries });
  };

  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const isAdmin = user?.role === "admin";

  const singleResults = results?.filter((r: any) => !r.isModelTest) || [];
  const modelTestResults = results?.filter((r: any) => r.isModelTest && r.modelTestGroupId) || [];

  const modelTestGroups: Record<string, any[]> = {};
  modelTestResults.forEach((r: any) => {
    if (!modelTestGroups[r.modelTestGroupId]) modelTestGroups[r.modelTestGroupId] = [];
    modelTestGroups[r.modelTestGroupId].push(r);
  });

  const getBatchName = (batchId: number) =>
    batches?.find((b) => b.id === batchId)?.name ?? `Batch ${batchId}`;

  const singleByBatch: Record<number, any[]> = {};
  singleResults.forEach((r: any) => {
    if (!singleByBatch[r.batchId]) singleByBatch[r.batchId] = [];
    singleByBatch[r.batchId].push(r);
  });

  const modelByBatch: Record<number, Record<string, any[]>> = {};
  Object.entries(modelTestGroups).forEach(([groupId, groupResults]) => {
    const batchId = (groupResults[0] as any).batchId;
    if (!modelByBatch[batchId]) modelByBatch[batchId] = {};
    modelByBatch[batchId][groupId] = groupResults;
  });

  return (
    <Layout
      title="Results"
      subtitle={isStudent ? "Your academic performance overview" : "Record and review student exam results"}
    >
      <div className="space-y-6">
        {/* Tab switcher — visible to all roles */}
        <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit">
          <Button
            variant={mode === "single" ? "default" : "ghost"}
            onClick={() => setMode("single")}
            className="gap-2 rounded-lg"
          >
            <BookOpen className="w-4 h-4" /> Subject-wise Result
          </Button>
          <Button
            variant={mode === "model" ? "default" : "ghost"}
            onClick={() => setMode("model")}
            className="gap-2 rounded-lg"
          >
            <ClipboardList className="w-4 h-4" /> Model Test
          </Button>
        </div>

        {/* ── SUBJECT-WISE TAB ── */}
        {mode === "single" && (
          <div className="space-y-6">
            {/* Entry forms — teacher only */}
            {isTeacher && (
              <>
                <Card>
                  <CardHeader><CardTitle>Exam Details</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Batch</label>
                      <Select onValueChange={setSelectedBatchId} value={selectedBatchId}>
                        <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                        <SelectContent>{batches?.map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Exam Name</label>
                      <Input placeholder="e.g. Monthly Test 1" value={examName} onChange={(e) => setExamName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Subject</label>
                      <Input placeholder="e.g. Physics" value={subject} onChange={(e) => setSubject(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Total Marks</label>
                      <Input type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} />
                    </div>
                  </CardContent>
                </Card>

                {selectedBatchId && (availableShifts.length > 0 || availableGroups.length > 0) && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Filters</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableShifts.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Shift</label>
                          <Select value={selectedShift} onValueChange={setSelectedShift}>
                            <SelectTrigger><SelectValue placeholder="All Shifts" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Shifts</SelectItem>
                              {availableShifts.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {availableGroups.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Academic Group</label>
                          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                            <SelectTrigger><SelectValue placeholder="All Groups" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Groups</SelectItem>
                              {availableGroups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {selectedBatchId && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Students List</CardTitle>
                      <Button onClick={handleSaveMarks} disabled={createResultMutation.isPending}>Save All Marks</Button>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-[200px]">Obtained Marks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStudents.map((student) => (
                            <TableRow key={student.id}>
                              <TableCell>{student.studentCustomId || "N/A"}</TableCell>
                              <TableCell>{student.name}</TableCell>
                              <TableCell>
                                <Input type="number" placeholder="Marks" value={marks[student.id] || ""} onChange={(e) => setMarks((p) => ({ ...p, [student.id]: e.target.value }))} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Subject-wise Results — Batch → Exam Name → Students hierarchy */}
            {!isStudent && Object.keys(singleByBatch).length > 0 && (
              <Card className="border-none bg-white shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-slate-100 py-5 px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
                        <BookOpen className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">Subject-wise Results</CardTitle>
                        <p className="text-sm text-muted-foreground">Click a batch, then an exam to view results</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-slate-600"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/results"] })}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <Accordion type="multiple" className="space-y-2">
                    {Object.entries(singleByBatch).map(([batchId, batchResults]) => {
                      const examGroups: Record<string, any[]> = {};
                      batchResults.forEach((r: any) => {
                        if (!examGroups[r.examName]) examGroups[r.examName] = [];
                        examGroups[r.examName].push(r);
                      });
                      return (
                        <AccordionItem
                          key={batchId}
                          value={batchId}
                          className="border border-slate-200 rounded-xl overflow-hidden"
                        >
                          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-800 text-base">Class {getBatchName(Number(batchId))}</span>
                              <Badge variant="secondary" className="text-xs">{Object.keys(examGroups).length} exam{Object.keys(examGroups).length !== 1 ? "s" : ""}</Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 pb-3 pt-1">
                            <Accordion type="multiple" className="space-y-1.5">
                              {Object.entries(examGroups).map(([examName, examResults]) => {
                                const studentCount = new Set(examResults.map((r: any) => r.studentId)).size;
                                return (
                                  <AccordionItem
                                    key={examName}
                                    value={examName}
                                    className="border border-slate-100 rounded-lg overflow-hidden bg-slate-50/50"
                                  >
                                    <AccordionTrigger className="px-4 py-2.5 hover:no-underline hover:bg-slate-100/70 [&[data-state=open]]:bg-slate-100/70">
                                      <div className="flex items-center gap-2.5">
                                        <ClipboardList className="w-4 h-4 text-blue-400 shrink-0" />
                                        <span className="font-semibold text-slate-700 text-sm">{examName}</span>
                                        <Badge className="text-xs bg-blue-100 text-blue-700 border-0 hover:bg-blue-100">
                                          {studentCount} student{studentCount !== 1 ? "s" : ""}
                                        </Badge>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-0">
                                      <div className="overflow-x-auto bg-white border-t border-slate-100">
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="hover:bg-transparent bg-slate-50/80">
                                              <TableHead className="text-xs font-semibold">Student</TableHead>
                                              <TableHead className="text-xs font-semibold">Subject</TableHead>
                                              <TableHead className="text-xs font-semibold text-center">Marks</TableHead>
                                              <TableHead className="text-xs w-[100px]"></TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {examResults.map((res: any) => {
                                              const waUrl = buildSubjectWhatsAppUrl(
                                                res.student?.mobileNumber,
                                                res.student?.name || "Student",
                                                res.examName,
                                                res.subject,
                                                res.obtainedMarks,
                                                res.totalMarks
                                              );
                                              return (
                                                <TableRow key={res.id} className="hover:bg-slate-50/50 group">
                                                  <TableCell className="font-medium text-sm py-2.5">{res.student?.name || "—"}</TableCell>
                                                  <TableCell className="text-sm py-2.5 text-slate-600">{res.subject}</TableCell>
                                                  <TableCell className="text-sm py-2.5 text-center font-bold">
                                                    {res.obtainedMarks}<span className="text-slate-400 font-normal">/{res.totalMarks}</span>
                                                  </TableCell>
                                                  <TableCell className="py-2.5">
                                                    <div className="flex items-center gap-0.5 justify-end">
                                                      {isAdmin && <WhatsAppBtn url={waUrl} />}
                                                      {isAdmin && (
                                                        <>
                                                          <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                                            onClick={() => setEditingResult({ id: res.id, examName: res.examName, subject: res.subject, obtainedMarks: res.obtainedMarks, totalMarks: res.totalMarks })}
                                                          >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                          </Button>
                                                          <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => { if (confirm("Delete this result record?")) deleteResultMutation.mutate(res.id); }}
                                                          >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                          </Button>
                                                        </>
                                                      )}
                                                    </div>
                                                  </TableCell>
                                                </TableRow>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                );
                              })}
                            </Accordion>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            )}

            {/* Student's own subject-wise results */}
            {isStudent && singleResults.length > 0 && (
              <Card className="border-none bg-white shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-[#F1F5F9] py-6 px-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-50 border border-blue-100"><BookOpen className="w-5 h-5 text-blue-500" /></div>
                    <div>
                      <CardTitle className="text-xl text-[#1E293B] font-extrabold">Subject-wise Results</CardTitle>
                      <p className="text-sm text-[#64748B]">Your individual subject performance</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#F8FAFC] border-[#F1F5F9]">
                          <TableHead className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-[#64748B]">Exam</TableHead>
                          <TableHead className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-[#64748B]">Subject</TableHead>
                          <TableHead className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-[#64748B]">Total</TableHead>
                          <TableHead className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-[#64748B]">Obtained</TableHead>
                          <TableHead className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-[#64748B]">Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {singleResults.map((res: any) => {
                          const { grade, gp } = getGrade(res.obtainedMarks, res.totalMarks);
                          return (
                            <TableRow key={res.id} className="hover:bg-[#F8FAFC]/50 border-[#F1F5F9] transition-colors">
                              <TableCell className="py-5 px-6 font-bold text-[#1E293B]">{res.examName}</TableCell>
                              <TableCell className="py-5 px-6 font-medium text-[#1E293B]">{res.subject}</TableCell>
                              <TableCell className="py-5 px-6 text-[#64748B] font-bold">{res.totalMarks}</TableCell>
                              <TableCell className="py-5 px-6"><span className="font-black text-lg text-emerald-600">{res.obtainedMarks}</span></TableCell>
                              <TableCell className="py-5 px-6">
                                <Badge className={`font-bold text-white ${gradeColor(grade)}`}>{grade} ({gp.toFixed(2)})</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {isStudent && singleResults.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No subject-wise results yet</p>
              </div>
            )}
          </div>
        )}

        {/* ── MODEL TEST TAB ── */}
        {mode === "model" && (
          <div className="space-y-5">

            {/* ═══ ADMIN VIEW ═══ */}
            {isAdmin && (
              <>
                {/* Create Draft Card */}
                <Card className="border-2 border-slate-100">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-bold">Create New Model Test Draft</CardTitle>
                    <p className="text-sm text-muted-foreground">Define the exam structure. Teachers will enter marks for each subject.</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Exam Name</label>
                        <Input placeholder="e.g. Model Test 1" value={draftExamName} onChange={(e) => setDraftExamName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Batch</label>
                        <Select value={draftBatchId} onValueChange={setDraftBatchId}>
                          <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                          <SelectContent>{batches?.map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Subjects</label>
                        <Button variant="outline" size="sm" onClick={addDraftSubject}><Plus className="w-3 h-3 mr-1" /> Add Subject</Button>
                      </div>
                      <div className="space-y-2">
                        {draftSubjects.map((subj, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <Input placeholder="Subject name (e.g. Physics)" value={subj.name} onChange={(e) => updateDraftSubject(idx, "name", e.target.value)} className="flex-1" />
                            <Input type="number" placeholder="Total" value={subj.totalMarks} onChange={(e) => updateDraftSubject(idx, "totalMarks", e.target.value)} className="w-24" />
                            {draftSubjects.length > 1 && (
                              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeDraftSubject(idx)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleCreateDraft} disabled={createDraftMutation.isPending} className="gap-2">
                      <Send className="w-4 h-4" />
                      {createDraftMutation.isPending ? "Creating..." : "Create Draft"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Draft List */}
                {modelTestDrafts && modelTestDrafts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Active & Published Drafts</h3>
                    {modelTestDrafts.map((draft) => {
                      const draftSubjectList = draft.subjects as { name: string; totalMarks: number }[];
                      const draftGroupResults = modelTestResults.filter((r: any) => r.modelTestGroupId === draft.groupId);
                      const filledSubjectNames = draftSubjectList.filter((s) =>
                        draftGroupResults.some((r: any) => r.subject === s.name)
                      );
                      const allFilled = filledSubjectNames.length === draftSubjectList.length;

                      const byStudent: Record<number, any[]> = {};
                      draftGroupResults.forEach((r: any) => {
                        if (!byStudent[r.studentId]) byStudent[r.studentId] = [];
                        byStudent[r.studentId].push(r);
                      });

                      return (
                        <Card key={draft.groupId} className={`border-2 ${draft.status === "published" ? "border-green-200 bg-green-50/30" : "border-slate-100"}`}>
                          <CardHeader className="pb-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <CardTitle className="text-base font-bold">{draft.examName}</CardTitle>
                                <p className="text-sm text-muted-foreground">{draft.batch?.name} · {draftSubjectList.length} subject{draftSubjectList.length !== 1 ? "s" : ""}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={draft.status === "published" ? "bg-green-500 text-white" : "bg-amber-400 text-white"}>
                                  {draft.status === "published" ? "Published" : "Draft"}
                                </Badge>
                                {draft.status === "draft" && (
                                  <Button
                                    size="sm"
                                    className="gap-1.5 bg-green-600 hover:bg-green-700"
                                    disabled={publishDraftMutation.isPending}
                                    onClick={() => {
                                      if (confirm(`Publish "${draft.examName}"? Students will be able to view results immediately.`)) {
                                        publishDraftMutation.mutate(draft.groupId);
                                      }
                                    }}
                                  >
                                    <Send className="w-3.5 h-3.5" /> Publish Result
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    if (confirm(`Delete draft "${draft.examName}" and all its marks? This cannot be undone.`)) {
                                      deleteDraftMutation.mutate(draft.groupId);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Subject progress */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {draftSubjectList.map((s) => {
                                const subjectResults = draftGroupResults.filter((r: any) => r.subject === s.name);
                                const filled = subjectResults.length > 0;
                                const studentCount = new Set(subjectResults.map((r: any) => r.studentId)).size;
                                return (
                                  <div
                                    key={s.name}
                                    className={`rounded-lg px-3 py-2.5 text-sm flex items-center gap-2 border ${filled ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}`}
                                  >
                                    {filled
                                      ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                      : <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                    }
                                    <div className="min-w-0">
                                      <div className="font-semibold truncate">{s.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {filled ? `${studentCount} student${studentCount !== 1 ? "s" : ""}` : "Pending"}
                                        {" "}· /{s.totalMarks}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Student results summary (if any marks entered) */}
                            {Object.keys(byStudent).length > 0 && (
                              <div className="rounded-xl border border-slate-100 overflow-hidden">
                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center gap-2">
                                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Student Results</span>
                                  <span className="text-xs text-slate-400">{Object.keys(byStudent).length} student{Object.keys(byStudent).length !== 1 ? "s" : ""}</span>
                                </div>
                                <Table>
                                  <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                      <TableHead className="py-2 text-xs">Student</TableHead>
                                      <TableHead className="py-2 text-xs text-center">Total Marks</TableHead>
                                      <TableHead className="py-2 text-xs text-center">GPA</TableHead>
                                      <TableHead className="py-2 w-16"></TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {Object.entries(byStudent).map(([, sr]) => {
                                      const studentRes = sr as any[];
                                      const st = studentRes[0]?.student;
                                      const totalObtained = studentRes.reduce((s: number, r: any) => s + r.obtainedMarks, 0);
                                      const totalFull = studentRes.reduce((s: number, r: any) => s + r.totalMarks, 0);
                                      const gpa = studentRes.map((r: any) => getGrade(r.obtainedMarks, r.totalMarks).gp)
                                        .reduce((s: number, g: number) => s + g, 0) / studentRes.length;
                                      const waUrl = buildResultWhatsAppUrl(
                                        st?.mobileNumber, st?.name || "Student", draft.examName, totalObtained, totalFull, gpa
                                      );
                                      return (
                                        <TableRow key={studentRes[0]?.studentId} className="hover:bg-slate-50/60 group">
                                          <TableCell className="py-2.5 font-medium text-sm">{st?.name || "—"}</TableCell>
                                          <TableCell className="py-2.5 text-center text-sm font-bold">
                                            {totalObtained}<span className="text-slate-400 font-normal">/{totalFull}</span>
                                          </TableCell>
                                          <TableCell className="py-2.5 text-center font-black text-indigo-600 text-sm">{gpa.toFixed(2)}</TableCell>
                                          <TableCell className="py-2.5">
                                            <div className="flex items-center gap-0.5 justify-end">
                                              {isAdmin && draft.status === "published" && <WhatsAppBtn url={waUrl} />}
                                              <Button
                                                variant="ghost" size="icon"
                                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                  if (confirm(`Delete ${st?.name}'s results in this exam?`)) {
                                                    studentRes.forEach((r: any) => deleteResultMutation.mutate(r.id));
                                                  }
                                                }}
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {(!modelTestDrafts || modelTestDrafts.length === 0) && (
                  <div className="text-center py-14 text-slate-400">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No model tests yet</p>
                    <p className="text-sm">Create a draft above to get started.</p>
                  </div>
                )}
              </>
            )}

            {/* ═══ TEACHER VIEW ═══ */}
            {isTeacher && (
              <div className="space-y-4">
                {/* Step 1: Select Draft */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Step 1 — Select Exam</CardTitle>
                    <p className="text-sm text-muted-foreground">Choose an active model test created by the Authority</p>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={selectedDraftGroupId}
                      onValueChange={(v) => { setSelectedDraftGroupId(v); setTeacherSubjectName(""); setTeacherMarks({}); }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select active model test..." /></SelectTrigger>
                      <SelectContent>
                        {modelTestDrafts?.filter((d) => d.status === "draft").map((d) => (
                          <SelectItem key={d.groupId} value={d.groupId}>
                            {d.examName} — {d.batch?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {selectedDraftGroupId && (() => {
                  const draft = modelTestDrafts?.find((d) => d.groupId === selectedDraftGroupId);
                  if (!draft) return null;
                  const draftSubjectList = draft.subjects as { name: string; totalMarks: number }[];
                  const draftGroupResults = modelTestResults.filter((r: any) => r.modelTestGroupId === selectedDraftGroupId);
                  const draftBatchStudents = students?.filter((s) => s.batchId === draft.batchId) || [];

                  return (
                    <>
                      {/* Step 2: Select Subject */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Step 2 — Select Your Subject</CardTitle>
                          <p className="text-sm text-muted-foreground">Choose the subject you're entering marks for</p>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {draftSubjectList.map((s) => {
                              const subjectResults = draftGroupResults.filter((r: any) => r.subject === s.name);
                              const isFilled = subjectResults.length > 0;
                              const isSelected = teacherSubjectName === s.name;
                              return (
                                <button
                                  key={s.name}
                                  onClick={() => { setTeacherSubjectName(s.name); setTeacherMarks({}); }}
                                  className={`rounded-xl px-3 py-3 text-sm border-2 transition-all text-left ${
                                    isSelected
                                      ? "bg-primary border-primary text-white"
                                      : isFilled
                                      ? "bg-green-50 border-green-300 text-green-800"
                                      : "bg-white border-slate-200 hover:border-primary/40 text-slate-700"
                                  }`}
                                >
                                  <div className="font-bold">{s.name}</div>
                                  <div className={`text-xs mt-0.5 ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                                    /{s.totalMarks} marks{isFilled ? ` · ${new Set(subjectResults.map((r: any) => r.studentId)).size} submitted` : ""}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Step 3: Enter Marks */}
                      {teacherSubjectName && (() => {
                        const subj = draftSubjectList.find((s) => s.name === teacherSubjectName);
                        const existingSubjectResults = draftGroupResults.filter((r: any) => r.subject === teacherSubjectName);

                        return (
                          <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                              <div>
                                <CardTitle className="text-base">Step 3 — Enter Marks: {teacherSubjectName}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  Total: {subj?.totalMarks} marks · {draft.batch?.name} · {draftBatchStudents.length} students
                                </p>
                              </div>
                              <Button
                                onClick={handleSaveTeacherMarks}
                                disabled={saveModelTestMarksMutation.isPending}
                                className="gap-2 shrink-0"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                {saveModelTestMarksMutation.isPending ? "Saving..." : "Save Marks"}
                              </Button>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="min-w-[140px]">Student</TableHead>
                                    <TableHead className="min-w-[120px]">Marks (/{subj?.totalMarks})</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {draftBatchStudents.map((student) => {
                                    const existing = existingSubjectResults.find((r: any) => r.studentId === student.id);
                                    const displayVal = teacherMarks[student.id] !== undefined
                                      ? teacherMarks[student.id]
                                      : existing ? String(existing.obtainedMarks) : "";
                                    return (
                                      <TableRow key={student.id}>
                                        <TableCell className="font-medium">{student.name}</TableCell>
                                        <TableCell>
                                          <Input
                                            type="number"
                                            placeholder="Marks"
                                            value={displayVal}
                                            onChange={(e) => setTeacherMarks((p) => ({ ...p, [student.id]: e.target.value }))}
                                            className="w-24"
                                          />
                                        </TableCell>
                                        <TableCell>
                                          {teacherMarks[student.id] !== undefined
                                            ? <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">Edited</Badge>
                                            : existing
                                            ? <Badge className="text-xs bg-green-500 text-white">Saved</Badge>
                                            : <span className="text-slate-400 text-xs">—</span>
                                          }
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </CardContent>
                          </Card>
                        );
                      })()}
                    </>
                  );
                })()}

                {(!modelTestDrafts?.filter((d) => d.status === "draft").length) && (
                  <div className="text-center py-14 text-slate-400">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No active model tests</p>
                    <p className="text-sm">The Authority hasn't created any model test drafts yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* ═══ STUDENT VIEW ═══ */}
            {isStudent && Object.keys(modelTestGroups).length > 0 && (
              <Card className="border-none bg-white shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-[#F1F5F9] py-6 px-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100"><ClipboardList className="w-5 h-5 text-indigo-500" /></div>
                    <div>
                      <CardTitle className="text-xl text-[#1E293B] font-extrabold">Model Test Results</CardTitle>
                      <p className="text-sm text-[#64748B]">Official results published by your Authority</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {Object.entries(modelTestGroups).map(([groupId, groupResults]) => {
                    const examN = groupResults[0]?.examName;
                    const totalObtained = groupResults.reduce((s: number, r: any) => s + r.obtainedMarks, 0);
                    const totalFull = groupResults.reduce((s: number, r: any) => s + r.totalMarks, 0);
                    const gpa = groupResults.map((r: any) => getGrade(r.obtainedMarks, r.totalMarks).gp)
                      .reduce((s: number, g: number) => s + g, 0) / groupResults.length;
                    return (
                      <div key={groupId} className="border border-border rounded-xl p-4 flex items-center justify-between bg-slate-50">
                        <div>
                          <p className="font-bold text-[#1E293B]">{examN}</p>
                          <p className="text-sm text-[#64748B]">{groupResults.length} subjects · GPA: <span className="font-black text-indigo-600">{gpa.toFixed(2)}</span></p>
                        </div>
                        <Link href={`/marksheet?groupId=${groupId}`}>
                          <Button size="sm" variant="outline" className="gap-2"><Eye className="w-4 h-4" /> View Marksheet</Button>
                        </Link>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {isStudent && Object.keys(modelTestGroups).length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No published results yet</p>
                <p className="text-sm">Results will appear here once your Authority publishes them.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Result Dialog — admin only */}
      <Dialog open={!!editingResult} onOpenChange={(open) => !open && setEditingResult(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Result Record</DialogTitle>
          </DialogHeader>
          {editingResult && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Exam Name</Label>
                <Input
                  value={editingResult.examName}
                  onChange={(e) => setEditingResult(prev => prev ? { ...prev, examName: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Subject</Label>
                <Input
                  value={editingResult.subject}
                  onChange={(e) => setEditingResult(prev => prev ? { ...prev, subject: e.target.value } : null)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Obtained Marks</Label>
                  <Input
                    type="number"
                    value={editingResult.obtainedMarks}
                    onChange={(e) => setEditingResult(prev => prev ? { ...prev, obtainedMarks: Number(e.target.value) } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Total Marks</Label>
                  <Input
                    type="number"
                    value={editingResult.totalMarks}
                    onChange={(e) => setEditingResult(prev => prev ? { ...prev, totalMarks: Number(e.target.value) } : null)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingResult(null)}>Cancel</Button>
                <Button
                  disabled={updateResultMutation.isPending}
                  onClick={() => {
                    updateResultMutation.mutate({
                      id: editingResult.id,
                      data: {
                        examName: editingResult.examName,
                        subject: editingResult.subject,
                        obtainedMarks: editingResult.obtainedMarks,
                        totalMarks: editingResult.totalMarks,
                      }
                    });
                  }}
                >
                  {updateResultMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
