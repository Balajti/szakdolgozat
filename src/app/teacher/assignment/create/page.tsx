"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  Eye,
  Calendar,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RequireAuth } from "@/components/providers/require-auth";
import { StoryGenerationDialog } from "@/components/teacher/story-generation-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ClassGroup {
  id: string;
  name: string;
  studentIds?: string[];
}

interface StudentProfile {
  id: string;
  name: string;
  email: string;
}

interface GeneratedAssignment {
  title: string;
  content: string;
  level: string;
  assignmentType: string;
  highlightedWords?: any[];
  blankPositions?: any[];
  matchingWords?: string[];
}

function AssignmentCreatePageInner() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [isGenerationDialogOpen, setIsGenerationDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [sendingToClass, setSendingToClass] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    level: "A2",
    assignmentType: "basic",
    dueDate: "",
    classGroupId: "",
    highlightedWords: [] as any[],
    blankPositions: [] as any[],
    matchingWords: [] as string[],
  });

  useState(() => {
    loadClasses();
  });

  const loadClasses = async () => {
    try {
      const { client } = await import("@/lib/amplify-client");
      const { getCurrentUser } = await import("aws-amplify/auth");
      const user = await getCurrentUser();

      const listClassesQuery = /* GraphQL */ `
        query ListGroupsByTeacher($teacherId: ID!) {
          listGroupsByTeacher(teacherId: $teacherId) {
            items {
              id
              name
              studentIds
            }
          }
        }
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await client.graphql({
        query: listClassesQuery,
        variables: { teacherId: user.userId },
      }) as any;

      const classesData = response.data?.listGroupsByTeacher?.items || [];
      setClasses(classesData);
    } catch (error) {
      console.error("Error loading classes:", error);
    }
  };

  const handleGenerated = (assignment: GeneratedAssignment) => {
    setFormData({
      ...formData,
      title: assignment.title,
      content: assignment.content,
      level: assignment.level,
      assignmentType: assignment.assignmentType,
      highlightedWords: assignment.highlightedWords || [],
      blankPositions: assignment.blankPositions || [],
      matchingWords: assignment.matchingWords || [],
    });
  };

  const handleSaveDraft = async () => {
    if (!formData.title || !formData.content) {
      toast({
        title: "Hiányzó adatok",
        description: "A cím és a tartalom kötelező.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { client } = await import("@/lib/amplify-client");
      const { getCurrentUser } = await import("aws-amplify/auth");
      const user = await getCurrentUser();

      const createAssignmentMutation = /* GraphQL */ `
        mutation CreateAssignment($input: CreateAssignmentInput!) {
          createAssignment(input: $input) {
            id
            title
          }
        }
      `;

      const dueDate = formData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await client.graphql({
        query: createAssignmentMutation,
        variables: {
          input: {
            teacherId: user.userId,
            title: formData.title,
            storyContent: formData.content,
            level: formData.level,
            assignmentType: formData.assignmentType,
            dueDate,
            status: "draft",
            blankPositions: formData.blankPositions.length > 0 ? JSON.stringify(formData.blankPositions) : null,
            matchingWords: formData.matchingWords.length > 0 ? formData.matchingWords : null,
          },
        },
      });

      toast({
        title: "Piszkozat mentve",
        description: "A feladat piszkozatként elmentve.",
      });

      router.push("/teacher/assignments");
    } catch (error) {
      console.error("Error saving draft:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült menteni a piszkozatot.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendToClass = async () => {
    if (!formData.classGroupId) {
      toast({
        title: "Hiányzó osztály",
        description: "Válassz osztályt a kiküldéshez.",
        variant: "destructive",
      });
      return;
    }

    setSendingToClass(true);
    try {
      const { client } = await import("@/lib/amplify-client");
      const { getCurrentUser } = await import("aws-amplify/auth");
      const user = await getCurrentUser();

      // Get students in the class
      const selectedClass = classes.find((c) => c.id === formData.classGroupId);
      if (!selectedClass || !selectedClass.studentIds || selectedClass.studentIds.length === 0) {
        toast({
          title: "Üres osztály",
          description: "Az osztályban nincsenek diákok.",
          variant: "destructive",
        });
        setSendingToClass(false);
        return;
      }

      // Get student emails
      const studentEmails: string[] = [];
      for (const studentId of selectedClass.studentIds) {
        const getStudentQuery = /* GraphQL */ `
          query GetStudentProfile($id: ID!) {
            getStudentProfile(id: $id) {
              email
            }
          }
        `;

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const studentResponse = await client.graphql({
            query: getStudentQuery,
            variables: { id: studentId },
          }) as any;

          const studentEmail = studentResponse.data?.getStudentProfile?.email;
          if (studentEmail) {
            studentEmails.push(studentEmail);
          }
        } catch (error) {
          console.error(`Error loading student ${studentId}:`, error);
        }
      }

      // Create assignment
      const createAssignmentMutation = /* GraphQL */ `
        mutation CreateAssignment($input: CreateAssignmentInput!) {
          createAssignment(input: $input) {
            id
            title
          }
        }
      `;

      const dueDate = formData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await client.graphql({
        query: createAssignmentMutation,
        variables: {
          input: {
            teacherId: user.userId,
            title: formData.title,
            storyContent: formData.content,
            level: formData.level,
            assignmentType: formData.assignmentType,
            dueDate,
            status: "sent",
            classGroupId: formData.classGroupId,
            classGroupName: selectedClass.name,
            sentTo: studentEmails,
            blankPositions: formData.blankPositions.length > 0 ? JSON.stringify(formData.blankPositions) : null,
            matchingWords: formData.matchingWords.length > 0 ? formData.matchingWords : null,
          },
        },
      });

      toast({
        title: "Feladat kiküldve",
        description: `A feladat ${studentEmails.length} diáknak elküldve.`,
      });

      // TODO: Send actual emails to students
      // This would typically be done via an AWS Lambda function or similar service

      setIsSendDialogOpen(false);
      router.push("/teacher/assignments");
    } catch (error) {
      console.error("Error sending assignment:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült kiküldeni a feladatot.",
        variant: "destructive",
      });
    } finally {
      setSendingToClass(false);
    }
  };

  const getPreviewContent = () => {
    if (formData.assignmentType === "fill_blanks" && formData.blankPositions.length > 0) {
      let content = formData.content;
      const blanks = [...formData.blankPositions].sort((a, b) => b.offset - a.offset);
      
      blanks.forEach((blank) => {
        const before = content.substring(0, blank.offset);
        const after = content.substring(blank.offset + blank.length);
        content = before + "______" + after;
      });
      
      return content;
    }
    return formData.content;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/teacher/assignments")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground sm:text-2xl">
                Új feladat létrehozása
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Generálj AI történetet vagy írj sajátot
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 max-w-4xl">
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>AI Generálás</CardTitle>
                <CardDescription>
                  Használd az AI-t automatikus feladat készítéshez
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setIsGenerationDialogOpen(true)} className="w-full sm:w-auto">
                  Történet generálása AI-val
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Feladat adatok</CardTitle>
                <CardDescription>
                  Add meg a feladat részleteit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Cím *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Feladat címe..."
                    maxLength={100}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="level">Szint</Label>
                    <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
                      <SelectTrigger id="level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A1">A1 - Kezdő</SelectItem>
                        <SelectItem value="A2">A2 - Alapfok</SelectItem>
                        <SelectItem value="B1">B1 - Középfok</SelectItem>
                        <SelectItem value="B2">B2 - Felsőfok</SelectItem>
                        <SelectItem value="C1">C1 - Haladó</SelectItem>
                        <SelectItem value="C2">C2 - Mesterfok</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due-date">Határidő</Label>
                    <Input
                      id="due-date"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Tartalom *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="A feladat szövege..."
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.content.length} karakter
                  </p>
                </div>

                {formData.assignmentType && (
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm font-medium mb-1">Feladat típus:</p>
                    <Badge variant="outline">
                      {formData.assignmentType === "basic" && "Alapvető történet"}
                      {formData.assignmentType === "fill_blanks" && "Kihagyásos feladat"}
                      {formData.assignmentType === "word_matching" && "Szópárosítás"}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => setIsPreviewDialogOpen(true)}
                disabled={!formData.content}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Előnézet
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={loading || !formData.title || !formData.content}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Mentés piszkozatként
              </Button>
              <Button
                onClick={() => setIsSendDialogOpen(true)}
                disabled={!formData.title || !formData.content}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Kiküldés osztálynak
              </Button>
            </div>
          </motion.div>
        </div>
      </main>

      <StoryGenerationDialog
        open={isGenerationDialogOpen}
        onOpenChange={setIsGenerationDialogOpen}
        onGenerated={handleGenerated}
      />

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{formData.title || "Előnézet"}</DialogTitle>
            <DialogDescription>
              Így fogják látni a diákok
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Szint: {formData.level}</Badge>
                {formData.assignmentType && (
                  <Badge variant="outline">
                    {formData.assignmentType === "basic" && "Alapvető"}
                    {formData.assignmentType === "fill_blanks" && "Kihagyásos"}
                    {formData.assignmentType === "word_matching" && "Szópárosítás"}
                  </Badge>
                )}
              </div>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap break-words">{getPreviewContent()}</p>
              </div>
              {formData.assignmentType === "word_matching" && formData.matchingWords.length > 0 && (
                <div>
                  <p className="font-medium text-sm mb-2">Párosítandó szavak:</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.matchingWords.map((word, idx) => (
                      <Badge key={idx} variant="outline">{word}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Feladat kiküldése</DialogTitle>
            <DialogDescription>
              Válaszd ki az osztályt, amelynek ki szeretnéd küldeni a feladatot.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="class-select">Osztály *</Label>
              <Select value={formData.classGroupId} onValueChange={(value) => setFormData({ ...formData, classGroupId: value })}>
                <SelectTrigger id="class-select">
                  <SelectValue placeholder="Válassz osztályt" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} ({cls.studentIds?.length || 0} diák)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.classGroupId && (
              <div className="rounded-lg bg-muted/50 p-4 text-sm">
                <Calendar className="h-4 w-4 inline mr-2" />
                A feladat email-ben is el lesz küldve minden diáknak az osztályból.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSendDialogOpen(false)}
              disabled={sendingToClass}
            >
              Mégse
            </Button>
            <Button onClick={handleSendToClass} disabled={sendingToClass || !formData.classGroupId}>
              {sendingToClass ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Küldés...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Kiküldés
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AssignmentCreatePage() {
  return (
    <RequireAuth role="teacher">
      <AssignmentCreatePageInner />
    </RequireAuth>
  );
}
