"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Mail,
  UserPlus,
  Loader2,
  UserMinus,
  Copy,
  CheckCircle2,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RequireAuth } from "@/components/providers/require-auth";

interface ClassGroup {
  id: string;
  name: string;
  description?: string;
  studentIds?: string[]; // Legacy
  students?: Array<{ id: string; name: string; email: string; addedAt: string }>;
  color?: string;
}

interface ClassStudent {
  id: string;
  name: string;
  email: string;
  addedAt?: string;
}

function ClassDetailPageInner({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [classGroup, setClassGroup] = useState<ClassGroup | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<ClassStudent | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadClassData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadClassData = async () => {
    try {
      const { client } = await import("@/lib/amplify-client");

      // Load class group
      const getClassQuery = /* GraphQL */ `
        query GetClassGroup($id: ID!) {
          getClassGroup(id: $id) {
            id
            name
            description
            students
            color
          }
        }
      `;

      const classResponse = (await client.graphql({
        query: getClassQuery,
        variables: { id: params.id },
      })) as { data?: { getClassGroup?: ClassGroup } };

      const classData = classResponse.data?.getClassGroup;
      if (!classData) {
        toast({
          title: "Hiba",
          description: "Nem található az osztály.",
          variant: "destructive",
        });
        router.push("/teacher");
        return;
      }

      setClassGroup(classData);

      // Load students from ClassGroup.students array
      let studentsList = classData.students;
      if (typeof studentsList === 'string') {
        try {
          studentsList = JSON.parse(studentsList);
        } catch (e) {
          console.error("Error parsing students JSON:", e);
          studentsList = [];
        }
      }
      setStudents((studentsList as ClassStudent[]) || []);

      setLoading(false);
    } catch (error) {
      console.error("Error loading class data:", error);
      setLoading(false);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni az osztály adatait.",
        variant: "destructive",
      });
    }
  };

  const handleAddStudent = async () => {
    if (!studentName.trim() || !studentEmail.trim() || !classGroup) {
      toast({
        title: "Hiányzó adat",
        description: "Add meg a diák nevét és email címét.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentEmail)) {
      toast({
        title: "Hibás email",
        description: "Add meg egy érvényes email címet.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { client } = await import("@/lib/amplify-client");

      // Create new student record
      const newStudent = {
        id: `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: studentName.trim(),
        email: studentEmail.trim().toLowerCase(),
        addedAt: new Date().toISOString(),
      };

      // Add to students array
      let currentStudents = classGroup.students;
      if (typeof currentStudents === 'string') {
        try {
          currentStudents = JSON.parse(currentStudents);
        } catch (e) {
          currentStudents = [];
        }
      }
      const updatedStudents = [...((currentStudents as ClassStudent[]) || []), newStudent];

      const updateClassMutation = /* GraphQL */ `
        mutation UpdateClassGroup($input: UpdateClassGroupInput!) {
          updateClassGroup(input: $input) {
            id
            students
          }
        }
      `;

      await client.graphql({
        query: updateClassMutation,
        variables: {
          input: {
            id: classGroup.id,
            students: JSON.stringify(updatedStudents),
          },
        },
      });

      setStudents(updatedStudents);
      setClassGroup({ ...classGroup, students: updatedStudents });
      setIsAddDialogOpen(false);
      setStudentName("");
      setStudentEmail("");
      toast({
        title: "Diák hozzáadva",
        description: `${newStudent.name} hozzáadva az osztályhoz.`,
      });
    } catch (error) {
      console.error("Error adding student:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült hozzáadni a diákot.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStudent = async () => {
    if (!selectedStudent || !classGroup) return;

    setSubmitting(true);
    try {
      const { client } = await import("@/lib/amplify-client");

      // Remove student from students array
      let currentStudents = classGroup.students;
      if (typeof currentStudents === 'string') {
        try {
          currentStudents = JSON.parse(currentStudents);
        } catch (e) {
          currentStudents = [];
        }
      }
      const updatedStudents = ((currentStudents as ClassStudent[]) || []).filter(
        (s) => s.id !== selectedStudent.id
      );

      const updateClassMutation = /* GraphQL */ `
        mutation UpdateClassGroup($input: UpdateClassGroupInput!) {
          updateClassGroup(input: $input) {
            id
            students
          }
        }
      `;

      await client.graphql({
        query: updateClassMutation,
        variables: {
          input: {
            id: classGroup.id,
            students: JSON.stringify(updatedStudents),
          },
        },
      });

      setStudents(updatedStudents);
      setClassGroup({ ...classGroup, students: updatedStudents });
      setIsRemoveDialogOpen(false);
      setSelectedStudent(null);
      toast({
        title: "Diák eltávolítva",
        description: `${selectedStudent.name} eltávolítva az osztályból.`,
      });
    } catch (error) {
      console.error("Error removing student:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült eltávolítani a diákot.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/auth/invite/${code}`);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Másolva",
      description: "A meghívó link a vágólapra másolva.",
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!classGroup) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Nem található osztály</p>
          <Button onClick={() => router.push("/teacher")} className="mt-4">
            Vissza az irányítópulthoz
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/teacher")}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-display font-bold text-foreground sm:text-2xl truncate">
                  {classGroup.name}
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm truncate">
                  {students.length} diák
                </p>
              </div>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 shrink-0">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Diák hozzáadása</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Class Info Card */}
          {classGroup.description && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground break-words">
                    {classGroup.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Students List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Diákok</CardTitle>
                <CardDescription>
                  Az osztályban lévő diákok listája
                </CardDescription>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      Még nincsenek diákok az osztályban.
                    </p>
                    <Button
                      onClick={() => setIsAddDialogOpen(true)}
                      variant="outline"
                      className="mt-4"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Első diák hozzáadása
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{student.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {student.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsRemoveDialogOpen(true);
                          }}
                          className="shrink-0 text-destructive hover:text-destructive"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Diák hozzáadása</DialogTitle>
            <DialogDescription>
              Add meg a diák nevét és email címét a nyilvántartáshoz.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="student-name">Név *</Label>
              <Input
                id="student-name"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Kovács János"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-email">Email cím *</Label>
              <Input
                id="student-email"
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="diak@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setStudentName("");
                setStudentEmail("");
              }}
              disabled={submitting}
            >
              Mégse
            </Button>
            <Button onClick={handleAddStudent} disabled={submitting || !studentName.trim() || !studentEmail.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Hozzáadás...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Diák hozzáadása
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Student Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Diák eltávolítása</DialogTitle>
            <DialogDescription>
              Biztosan el szeretnéd távolítani <strong>{selectedStudent?.name}</strong> diákot az osztályból?
              <br />
              <span className="text-xs">A diák később újra meghívható.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRemoveDialogOpen(false);
                setSelectedStudent(null);
              }}
              disabled={submitting}
            >
              Mégse
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveStudent}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eltávolítás...
                </>
              ) : (
                'Eltávolítás'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  return (
    <RequireAuth role="teacher">
      <ClassDetailPageInner params={resolvedParams} />
    </RequireAuth>
  );
}
