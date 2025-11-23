"use client";

import { useEffect, useState } from "react";
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
  studentIds?: string[];
  color?: string;
}

interface ClassStudent {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  joinedAt?: string;
  level?: string;
}

interface ClassInvite {
  id: string;
  studentEmail?: string;
  inviteCode: string;
  status: string;
  expiresAt: string;
  acceptedAt?: string;
}

function ClassDetailPageInner({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [classGroup, setClassGroup] = useState<ClassGroup | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [invites, setInvites] = useState<ClassInvite[]>([]);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<ClassStudent | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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
            studentIds
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

      // Load students who are in this class
      if (classData.studentIds && classData.studentIds.length > 0) {
        const studentsPromises = classData.studentIds.map(async (studentId: string) => {
          const getStudentQuery = /* GraphQL */ `
            query GetStudentProfile($id: ID!) {
              getStudentProfile(id: $id) {
                id
                name
                email
                avatarUrl
                level
              }
            }
          `;

          try {
            const studentResponse = (await client.graphql({
              query: getStudentQuery,
              variables: { id: studentId },
            })) as { data?: { getStudentProfile?: ClassStudent } };

            return studentResponse.data?.getStudentProfile;
          } catch (error) {
            console.error(`Error loading student ${studentId}:`, error);
            return null;
          }
        });

        const studentsData = await Promise.all(studentsPromises);
        setStudents(studentsData.filter((s): s is ClassStudent => s !== null));
      }

      // Load pending invites
      const listInvitesQuery = /* GraphQL */ `
        query ListInvitesByTeacher($teacherId: ID!) {
          listInvitesByTeacher(teacherId: $teacherId) {
            items {
              id
              studentEmail
              inviteCode
              status
              expiresAt
              acceptedAt
              classGroupId
            }
          }
        }
      `;

      const { getCurrentUser } = await import("aws-amplify/auth");
      const user = await getCurrentUser();

      const invitesResponse = (await client.graphql({
        query: listInvitesQuery,
        variables: { teacherId: user.userId },
      })) as { data?: { listInvitesByTeacher?: { items?: Array<ClassInvite & { classGroupId: string }> } } };

      const allInvites = invitesResponse.data?.listInvitesByTeacher?.items || [];
      const classInvites = allInvites.filter(
        (invite: ClassInvite & { classGroupId: string }) =>
          invite.classGroupId === params.id && invite.status === "pending"
      );
      setInvites(classInvites);

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

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !classGroup) {
      toast({
        title: "Hiányzó adat",
        description: "Add meg a diák email címét.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
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
      const { getCurrentUser } = await import("aws-amplify/auth");
      const user = await getCurrentUser();

      // Generate invite code
      const inviteCode = `${classGroup.id.substring(0, 8)}-${Date.now()}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

      const createInviteMutation = /* GraphQL */ `
        mutation CreateClassInvite($input: CreateClassInviteInput!) {
          createClassInvite(input: $input) {
            id
            studentEmail
            inviteCode
            status
            expiresAt
          }
        }
      `;

      const response = (await client.graphql({
        query: createInviteMutation,
        variables: {
          input: {
            teacherId: user.userId,
            classGroupId: classGroup.id,
            className: classGroup.name,
            inviteCode,
            studentEmail: inviteEmail.trim().toLowerCase(),
            status: "pending",
            expiresAt: expiresAt.toISOString(),
          },
        },
      })) as { data?: { createClassInvite?: ClassInvite } };

      const newInvite = response.data?.createClassInvite;
      if (newInvite) {
        setInvites([...invites, newInvite]);
        setIsInviteDialogOpen(false);
        setInviteEmail("");
        toast({
          title: "Meghívó elküldve",
          description: `Meghívó elküldve a következőnek: ${inviteEmail}`,
        });

        // TODO: Send actual email with invite link
        // The invite link would be: /auth/invite/${inviteCode}
      }
    } catch (error) {
      console.error("Error sending invite:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült elküldeni a meghívót.",
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

      // Remove student from class group
      const updatedStudentIds = classGroup.studentIds?.filter(
        (id) => id !== selectedStudent.id
      ) || [];

      const updateClassMutation = /* GraphQL */ `
        mutation UpdateClassGroup($input: UpdateClassGroupInput!) {
          updateClassGroup(input: $input) {
            id
            studentIds
          }
        }
      `;

      await client.graphql({
        query: updateClassMutation,
        variables: {
          input: {
            id: classGroup.id,
            studentIds: updatedStudentIds,
          },
        },
      });

      setStudents(students.filter((s) => s.id !== selectedStudent.id));
      setClassGroup({ ...classGroup, studentIds: updatedStudentIds });
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
            <Button onClick={() => setIsInviteDialogOpen(true)} className="gap-2 shrink-0">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Meghívás</span>
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

          {/* Pending Invites */}
          {invites.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Függőben lévő meghívók</CardTitle>
                  <CardDescription>
                    Még nem elfogadott meghívók
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {invite.studentEmail || "Nincs email"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Lejár: {new Date(invite.expiresAt).toLocaleDateString("hu-HU")}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteCode(invite.inviteCode)}
                          className="shrink-0"
                        >
                          {copiedCode === invite.inviteCode ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
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
                      onClick={() => setIsInviteDialogOpen(true)}
                      variant="outline"
                      className="mt-4"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Első diák meghívása
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
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={student.avatarUrl || undefined} />
                            <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{student.name}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs text-muted-foreground truncate">
                                {student.email}
                              </p>
                              {student.level && (
                                <Badge variant="outline" className="text-xs">
                                  {student.level}
                                </Badge>
                              )}
                            </div>
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

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Diák meghívása</DialogTitle>
            <DialogDescription>
              Add meg a diák email címét, hogy meghívhasd az osztályba.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email cím *</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="diak@example.com"
              />
            </div>
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 inline mr-2" />
              A diák email-ben kap egy meghívó linket, amellyel csatlakozhat az osztályhoz.
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsInviteDialogOpen(false);
                setInviteEmail("");
              }}
              disabled={submitting}
            >
              Mégse
            </Button>
            <Button onClick={handleSendInvite} disabled={submitting || !inviteEmail.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Küldés...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Meghívó küldése
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

export default function ClassDetailPage({ params }: { params: { id: string } }) {
  return (
    <RequireAuth role="teacher">
      <ClassDetailPageInner params={params} />
    </RequireAuth>
  );
}
