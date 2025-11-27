"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
    ArrowLeft,
    Loader2,
    Calendar,
    Users,
    FileText,
    Send,
    Pencil,
    Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RequireAuth } from "@/components/providers/require-auth";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Assignment {
    id: string;
    title: string;
    dueDate: string;
    level: string;
    status: string;
    assignmentType: string;
    classGroupId?: string;
    classGroupName?: string;
    sentTo?: string[];
    storyContent?: string;
    blankPositions?: string;
    matchingWords?: string[];
}

function AssignmentViewPageInner({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadAssignment();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadAssignment = async () => {
        try {
            const { client } = await import("@/lib/amplify-client");

            const getAssignmentQuery = /* GraphQL */ `
        query GetAssignment($id: ID!) {
          getAssignment(id: $id) {
            id
            title
            dueDate
            level
            status
            assignmentType
            classGroupId
            classGroupName
            sentTo
            storyContent
            blankPositions
            matchingWords
          }
        }
      `;

            const response = (await client.graphql({
                query: getAssignmentQuery,
                variables: { id },
            })) as { data?: { getAssignment?: Assignment } };

            const assignmentData = response.data?.getAssignment;
            if (!assignmentData) {
                toast({
                    title: "Hiba",
                    description: "Nem található a feladat.",
                    variant: "destructive",
                });
                router.push("/teacher/assignments");
                return;
            }

            setAssignment(assignmentData);
            setLoading(false);
        } catch (error) {
            console.error("Error loading assignment:", error);
            setLoading(false);
            toast({
                title: "Hiba",
                description: "Nem sikerült betölteni a feladatot.",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async () => {
        if (!assignment) return;

        setDeleting(true);
        try {
            const { client } = await import("@/lib/amplify-client");

            const deleteAssignmentMutation = /* GraphQL */ `
        mutation DeleteAssignment($input: DeleteAssignmentInput!) {
          deleteAssignment(input: $input) {
            id
          }
        }
      `;

            await client.graphql({
                query: deleteAssignmentMutation,
                variables: {
                    input: { id: assignment.id },
                },
            });

            toast({
                title: "Sikeres törlés",
                description: "A feladat sikeresen törölve.",
            });

            router.push("/teacher/assignments");
        } catch (error) {
            console.error("Error deleting assignment:", error);
            toast({
                title: "Hiba",
                description: "Nem sikerült törölni a feladatot.",
                variant: "destructive",
            });
            setDeleting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "draft":
                return <Badge variant="outline">Piszkozat</Badge>;
            case "sent":
                return <Badge variant="default">Kiküldve</Badge>;
            case "submitted":
                return <Badge variant="default">Beküldve</Badge>;
            case "graded":
                return <Badge variant="default">Értékelve</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
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

    const getDisplayContent = () => {
        if (!assignment?.storyContent) return "";

        if (assignment.assignmentType === "fill_blanks" && assignment.blankPositions) {
            let content = assignment.storyContent;
            try {
                const blanks = JSON.parse(assignment.blankPositions).sort((a: any, b: any) => b.offset - a.offset);

                blanks.forEach((blank: any) => {
                    const before = content.substring(0, blank.offset);
                    const after = content.substring(blank.offset + blank.length);
                    content = before + "______" + after;
                });

                return content;
            } catch (error) {
                console.error("Error parsing blank positions:", error);
                return assignment.storyContent;
            }
        }

        return assignment.storyContent;
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
                                onClick={() => router.push("/teacher/assignments")}
                                className="shrink-0"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-xl font-display font-bold text-foreground sm:text-2xl truncate">
                                    {assignment.title}
                                </h1>
                                <div className="flex gap-2 mt-1 flex-wrap">
                                    {getStatusBadge(assignment.status)}
                                    {getTypeBadge(assignment.assignmentType)}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            {assignment.status === "draft" && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => router.push(`/teacher/assignment/${assignment.id}/edit`)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="default"
                                        className="gap-2"
                                        onClick={() => router.push(`/teacher/assignment/${assignment.id}/send`)}
                                    >
                                        <Send className="h-4 w-4" />
                                        <span className="hidden sm:inline">Kiküldés</span>
                                    </Button>
                                </>
                            )}
                            <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => setIsDeleteDialogOpen(true)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 max-w-4xl">
                <div className="space-y-6">
                    {/* Details Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle>Feladat részletei</CardTitle>
                                <CardDescription>Alapvető információk a feladatról</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div>
                                            <p className="text-muted-foreground">Határidő</p>
                                            <p className="font-medium">
                                                {new Date(assignment.dueDate).toLocaleDateString("hu-HU")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div>
                                            <p className="text-muted-foreground">Szint</p>
                                            <p className="font-medium">{assignment.level}</p>
                                        </div>
                                    </div>
                                </div>
                                {assignment.classGroupName && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div>
                                            <p className="text-muted-foreground">Osztály</p>
                                            <p className="font-medium">{assignment.classGroupName}</p>
                                        </div>
                                    </div>
                                )}
                                {assignment.sentTo && assignment.sentTo.length > 0 && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Send className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div>
                                            <p className="text-muted-foreground">Kiküldve</p>
                                            <p className="font-medium">{assignment.sentTo.length} diáknak</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Content Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle>Feladat tartalma</CardTitle>
                                <CardDescription>
                                    {assignment.assignmentType === "fill_blanks" && "Kihagyásos feladat - az üres helyek aláhúzással jelölve"}
                                    {assignment.assignmentType === "word_matching" && "Szópárosítós feladat"}
                                    {assignment.assignmentType === "basic" && "Alapvető történet"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="prose prose-sm max-w-none">
                                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                        {getDisplayContent()}
                                    </p>
                                </div>
                                {assignment.assignmentType === "word_matching" && assignment.matchingWords && assignment.matchingWords.length > 0 && (
                                    <div className="mt-6 pt-6 border-t">
                                        <p className="font-medium text-sm mb-3">Párosítandó szavak:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {assignment.matchingWords.map((word, idx) => (
                                                <Badge key={idx} variant="outline">
                                                    {word}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </main>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Biztosan törölni szeretnéd?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Ez a művelet nem vonható vissza. A feladat véglegesen törlődik.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Mégse</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {deleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Törlés...
                                </>
                            ) : (
                                "Törlés"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default function AssignmentViewPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <RequireAuth role="teacher">
            <AssignmentViewPageInner params={params} />
        </RequireAuth>
    );
}
