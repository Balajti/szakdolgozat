"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
    ArrowLeft,
    Loader2,
    Send,
    Calendar,
    FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RequireAuth } from "@/components/providers/require-auth";

interface Assignment {
    id: string;
    title: string;
    dueDate: string;
    level: string;
    status: string;
    assignmentType: string;
    storyContent?: string;
}

interface ClassGroup {
    id: string;
    name: string;
    students?: Array<{ id: string; name: string; email: string }>;
}

function AssignmentSendPageInner({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [classes, setClasses] = useState<ClassGroup[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [classesLoading, setClassesLoading] = useState(true);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadData = async () => {
        try {
            const { client } = await import("@/lib/amplify-client");
            const { getCurrentUser } = await import("aws-amplify/auth");
            const user = await getCurrentUser();

            // Load assignment
            const getAssignmentQuery = /* GraphQL */ `
        query GetAssignment($id: ID!) {
          getAssignment(id: $id) {
            id
            title
            dueDate
            level
            status
            assignmentType
            storyContent
          }
        }
      `;

            const assignmentResponse = (await client.graphql({
                query: getAssignmentQuery,
                variables: { id },
            })) as { data?: { getAssignment?: Assignment } };

            const assignmentData = assignmentResponse.data?.getAssignment;
            if (!assignmentData) {
                toast({
                    title: "Hiba",
                    description: "Nem található a feladat.",
                    variant: "destructive",
                });
                router.push("/teacher/assignments");
                return;
            }

            // Check if it's a draft
            if (assignmentData.status !== "draft") {
                toast({
                    title: "Már ki van küldve",
                    description: "Ez a feladat már ki van küldve vagy nincs piszkozat módban.",
                    variant: "destructive",
                });
                router.push(`/teacher/assignment/${id}`);
                return;
            }

            setAssignment(assignmentData);
            setLoading(false);

            // Load classes
            const listClassesQuery = /* GraphQL */ `
        query ListGroupsByTeacher($teacherId: ID!) {
          listGroupsByTeacher(teacherId: $teacherId) {
            items {
              id
              name
              students
            }
          }
        }
      `;

            const classesResponse = (await client.graphql({
                query: listClassesQuery,
                variables: { teacherId: user.userId },
            })) as { data?: { listGroupsByTeacher?: { items?: ClassGroup[] } } };

            const classesData = classesResponse.data?.listGroupsByTeacher?.items || [];

            // Parse students JSON for each class
            const parsedClasses = classesData.map((cls) => {
                try {
                    if (typeof cls.students === 'string') {
                        return { ...cls, students: JSON.parse(cls.students) };
                    }
                    return cls;
                } catch (error) {
                    console.error(`Error parsing students for class ${cls.id}:`, error);
                    return { ...cls, students: [] };
                }
            });

            setClasses(parsedClasses);
            setClassesLoading(false);
        } catch (error) {
            console.error("Error loading data:", error);
            setLoading(false);
            setClassesLoading(false);
            toast({
                title: "Hiba",
                description: "Nem sikerült betölteni az adatokat.",
                variant: "destructive",
            });
        }
    };

    const handleSend = async () => {
        if (!selectedClassId || !assignment) {
            toast({
                title: "Hiányzó osztály",
                description: "Válassz osztályt a kiküldéshez.",
                variant: "destructive",
            });
            return;
        }

        const selectedClass = classes.find((c) => c.id === selectedClassId);
        if (!selectedClass || !selectedClass.students || selectedClass.students.length === 0) {
            toast({
                title: "Üres osztály",
                description: "Az osztályban nincsenek diákok.",
                variant: "destructive",
            });
            return;
        }

        setSending(true);
        try {
            const { client } = await import("@/lib/amplify-client");
            const { getCurrentUser } = await import("aws-amplify/auth");
            const user = await getCurrentUser();

            // Extract student emails
            const studentEmails = selectedClass.students.map((s) => s.email);

            // Call distributeAssignment mutation
            const distributeAssignmentMutation = /* GraphQL */ `
        mutation DistributeAssignment(
          $assignmentId: ID!
          $teacherId: ID!
          $classId: ID
          $sendToAll: Boolean
        ) {
          distributeAssignment(
            assignmentId: $assignmentId
            teacherId: $teacherId
            classId: $classId
            sendToAll: $sendToAll
          ) {
            success
            assignmentId
            recipientCount
            emailsSent
            emailsFailed
          }
        }
      `;

            const distributeResponse = (await client.graphql({
                query: distributeAssignmentMutation,
                variables: {
                    assignmentId: assignment.id,
                    teacherId: user.userId,
                    classId: selectedClassId,
                    sendToAll: true, // Send to all students in the selected class
                },
            })) as { data?: { distributeAssignment?: { success: boolean; recipientCount: number; emailsSent?: number; emailsFailed?: number } } };

            // Also update the assignment to mark it as sent
            const updateAssignmentMutation = /* GraphQL */ `
        mutation UpdateAssignment($input: UpdateAssignmentInput!) {
          updateAssignment(input: $input) {
            id
          }
        }
      `;

            await client.graphql({
                query: updateAssignmentMutation,
                variables: {
                    input: {
                        id: assignment.id,
                        status: "sent",
                        classGroupId: selectedClassId,
                        classGroupName: selectedClass.name,
                        sentTo: studentEmails,
                    },
                },
            });

            const recipientCount = distributeResponse.data?.distributeAssignment?.recipientCount || studentEmails.length;
            const emailsSent = distributeResponse.data?.distributeAssignment?.emailsSent || 0;
            const emailsFailed = distributeResponse.data?.distributeAssignment?.emailsFailed || 0;

            let successMessage = `A feladat ${recipientCount} diáknak elküldve.`;
            if (emailsSent > 0) {
                successMessage += ` ${emailsSent} email sikeresen elküldve.`;
            }
            if (emailsFailed > 0) {
                successMessage += ` ${emailsFailed} email küldése sikertelen.`;
            }

            toast({
                title: "Feladat kiküldve",
                description: successMessage,
            });

            router.push("/teacher/assignments");
        } catch (error: any) {
            console.error("Error sending assignment:", error);

            // Log GraphQL errors if present
            if (error?.errors) {
                console.error("GraphQL errors:", JSON.stringify(error.errors, null, 2));
            }

            // Extract error message if available
            const errorMessage = error?.errors?.[0]?.message || error?.message || "Nem sikerült kiküldeni a feladatot.";

            toast({
                title: "Hiba",
                description: errorMessage,
                variant: "destructive",
            });
            setSending(false);
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case "basic":
                return <Badge variant="outline">Alapvető</Badge>;
            case "fill_blanks":
                return <Badge variant="outline">Kihagyásos</Badge>;
            case "word_matching":
                return <Badge variant="outline">Szópárosítás</Badge>;
            case "custom_words":
                return <Badge variant="outline">Egyedi szavak</Badge>;
            default:
                return <Badge variant="outline">{type}</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!assignment) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <p className="text-lg text-muted-foreground">Nem található feladat</p>
                    <Button onClick={() => router.push("/teacher/assignments")} className="mt-4">
                        Vissza a feladatokhoz
                    </Button>
                </div>
            </div>
        );
    }

    const selectedClass = classes.find((c) => c.id === selectedClassId);
    const studentCount = selectedClass?.students?.length || 0;

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
                                Feladat kiküldése
                            </h1>
                            <p className="text-xs text-muted-foreground sm:text-sm">
                                Küld el a feladatot egy osztálynak
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 max-w-4xl">
                <div className="space-y-6">
                    {/* Assignment Summary */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle>Feladat összefoglaló</CardTitle>
                                <CardDescription>A kiküldendő feladat részletei</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-lg mb-2">{assignment.title}</h3>
                                    <div className="flex gap-2 flex-wrap">
                                        {getTypeBadge(assignment.assignmentType)}
                                        <Badge variant="outline">Szint: {assignment.level}</Badge>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4 shrink-0" />
                                    <span>Határidő: {new Date(assignment.dueDate).toLocaleDateString("hu-HU")}</span>
                                </div>
                                {assignment.storyContent && (
                                    <div className="pt-4 border-t">
                                        <p className="text-sm text-muted-foreground mb-2">Tartalom előnézet:</p>
                                        <div className="bg-muted/50 rounded-lg p-4 max-h-32 overflow-y-auto">
                                            <p className="text-sm line-clamp-4">{assignment.storyContent}</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Class Selection */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle>Osztály kiválasztása</CardTitle>
                                <CardDescription>
                                    Válaszd ki az osztályt, amelynek ki szeretnéd küldeni a feladatot
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="class-select">Osztály *</Label>
                                    {classesLoading ? (
                                        <div className="flex items-center gap-2 p-3 rounded-lg border border-border/40 bg-muted/30">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="text-sm text-muted-foreground">Osztályok betöltése...</span>
                                        </div>
                                    ) : (
                                        <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={classes.length === 0}>
                                            <SelectTrigger id="class-select">
                                                <SelectValue placeholder={classes.length === 0 ? "Nincs elérhető osztály" : "Válassz osztályt"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {classes.map((cls) => {
                                                    const studentCount = cls.students?.length || 0;
                                                    return (
                                                        <SelectItem key={cls.id} value={cls.id}>
                                                            {cls.name} ({studentCount} diák)
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                {selectedClassId && studentCount > 0 && (
                                    <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4 text-sm">
                                        <div className="flex items-start gap-2">
                                            <FileText className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-medium text-blue-900 dark:text-blue-100">
                                                    A feladat {studentCount} diáknak lesz elküldve
                                                </p>
                                                <p className="text-blue-800 dark:text-blue-200 mt-1">
                                                    Email értesítések lesznek küldve minden diáknak az osztályból.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedClassId && studentCount === 0 && (
                                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-sm">
                                        <p className="text-amber-900 dark:text-amber-100">
                                            Ez az osztály üres. Add hozzá a diákokat mielőtt elküldenéd a feladatot.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Send Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                    >
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => router.push("/teacher/assignments")}
                                disabled={sending}
                            >
                                Mégse
                            </Button>
                            <Button
                                onClick={handleSend}
                                disabled={sending || !selectedClassId || studentCount === 0}
                                className="gap-2"
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Küldés...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" />
                                        Kiküldés
                                    </>
                                )}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}

export default function AssignmentSendPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <RequireAuth role="teacher">
            <AssignmentSendPageInner params={params} />
        </RequireAuth>
    );
}
