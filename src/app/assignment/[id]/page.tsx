"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { BookOpen, Clock, Loader2, CheckCircle2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Assignment {
    id: string;
    title: string;
    assignmentType: string;
    dueDate: string;
    level: string;
    storyContent?: string;
    requiredWords?: string[];
    matchingWords?: string[];
}

function AssignmentPageInner({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [studentEmail, setStudentEmail] = useState("");
    const [emailConfirmed, setEmailConfirmed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        loadAssignment();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    const loadAssignment = async () => {
        try {
            const { client } = await import("@/lib/amplify-client");

            const getAssignmentQuery = /* GraphQL */ `
        query GetAssignment($id: ID!) {
          getAssignment(id: $id) {
            id
            title
            assignmentType
            dueDate
            level
            storyContent
            requiredWords
            matchingWords
          }
        }
      `;

            const response = (await client.graphql({
                query: getAssignmentQuery,
                variables: { id: params.id },
                authMode: "apiKey", // Public access
            })) as { data?: { getAssignment?: Assignment } };

            const assignmentData = response.data?.getAssignment;
            if (!assignmentData) {
                toast({
                    title: "Hiba",
                    description: "Nem található feladat.",
                    variant: "destructive",
                });
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

    const handleEmailConfirm = () => {
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

        setEmailConfirmed(true);
        toast({
            title: "Email megerősítve",
            description: "Most kezdheted el a feladatot!",
        });
    };

    const handleSubmit = async () => {
        if (!studentEmail || !emailConfirmed) {
            toast({
                title: "Hiba",
                description: "Kérlek add meg az email címedet először.",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);
        try {
            const { client } = await import("@/lib/amplify-client");

            // Create a submission record
            const createSubmissionMutation = /* GraphQL */ `
        mutation CreateAssignmentSubmission($input: CreateAssignmentSubmissionInput!) {
          createAssignmentSubmission(input: $input) {
            id
            assignmentId
            studentEmail
            submittedAt
          }
        }
      `;

            const now = new Date().toISOString();

            await client.graphql({
                query: createSubmissionMutation,
                variables: {
                    input: {
                        assignmentId: params.id,
                        studentEmail: studentEmail.trim().toLowerCase(),
                        submittedAt: now,
                        status: "submitted",
                    },
                },
                authMode: "apiKey",
            });

            setSubmitted(true);
            toast({
                title: "Beküldve!",
                description: "A tanárod értesítést kapott a beküldésről.",
            });
        } catch (error) {
            console.error("Error submitting assignment:", error);
            toast({
                title: "Hiba",
                description: "Nem sikerült beküldeni a feladatot. Próbáld újra.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!assignment) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <p className="text-lg text-muted-foreground">Nem található feladat</p>
                </div>
            </div>
        );
    }

    const dueDate = new Date(assignment.dueDate).toLocaleDateString("hu-HU");
    const isOverdue = new Date(assignment.dueDate) < new Date();

    const getAssignmentIcon = () => {
        switch (assignment.assignmentType) {
            case "fill_blanks":
                return "🧩";
            case "word_matching":
                return "🔗";
            case "custom_words":
                return "⭐";
            default:
                return "📖";
        }
    };

    const getAssignmentTypeLabel = () => {
        switch (assignment.assignmentType) {
            case "fill_blanks":
                return "Szókitöltés";
            case "word_matching":
                return "Szópárosítás";
            case "custom_words":
                return "Szógyakorlás";
            default:
                return "Olvasási feladat";
        }
    };

    // Show email input first if not confirmed
    if (!emailConfirmed) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md"
                >
                    <Card>
                        <CardHeader className="text-center">
                            <div className="flex h-16 w-16 mx-auto mb-4 items-center justify-center rounded-full bg-primary/10">
                                <span className="text-3xl">{getAssignmentIcon()}</span>
                            </div>
                            <CardTitle className="text-2xl">
                                🪺 WordNest Feladat
                            </CardTitle>
                            <CardDescription className="text-base">
                                {assignment.title}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="student-email">Email cím *</Label>
                                <Input
                                    id="student-email"
                                    type="email"
                                    placeholder="pelda@email.com"
                                    value={studentEmail}
                                    onChange={(e) => setStudentEmail(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleEmailConfirm();
                                        }
                                    }}
                                />
                                <p className="text-sm text-muted-foreground">
                                    A tanárod így tudja majd nyomon követni, hogy megcsináltad a feladatot.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-2 text-sm">
                                    <Badge variant="outline">{getAssignmentTypeLabel()}</Badge>
                                    <Badge variant="outline">{assignment.level}</Badge>
                                </div>
                            </div>

                            <Button
                                onClick={handleEmailConfirm}
                                className="w-full gap-2"
                                disabled={!studentEmail.trim()}
                            >
                                <Mail className="h-4 w-4" />
                                Feladat megkezdése
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
            {/* Header */}
            <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                <span className="text-2xl">{getAssignmentIcon()}</span>
                            </div>
                            <div>
                                <h1 className="text-2xl font-display font-bold text-foreground">
                                    🪺 WordNest
                                </h1>
                                <p className="text-sm text-muted-foreground">English Learning Platform</p>
                            </div>
                        </div>
                        <div className="text-right hidden sm:block">
                            <p className="text-sm text-muted-foreground">Bejelentkezve:</p>
                            <p className="text-sm font-medium">{studentEmail}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Assignment Info */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline">{getAssignmentTypeLabel()}</Badge>
                                        <Badge variant="outline">{assignment.level}</Badge>
                                    </div>
                                    <CardTitle className="text-3xl">{assignment.title}</CardTitle>
                                    <CardDescription className="text-base mt-2">
                                        <Clock className="inline h-4 w-4 mr-1" />
                                        Határidő: {dueDate}
                                        {isOverdue && (
                                            <span className="ml-2 text-destructive font-medium">(Lejárt)</span>
                                        )}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        {assignment.storyContent && (
                            <CardContent>
                                <div className="prose prose-slate max-w-none">
                                    <div className="whitespace-pre-wrap text-base leading-relaxed">
                                        {assignment.storyContent}
                                    </div>
                                </div>
                            </CardContent>
                        )}
                    </Card>

                    {/* Assignment-specific content */}
                    {assignment.assignmentType === "fill_blanks" && assignment.requiredWords && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Hiányzó szavak</CardTitle>
                                <CardDescription>
                                    Töltsd ki a hiányzó szavakat a szövegben
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {assignment.requiredWords.map((word, index) => (
                                        <Badge key={index} variant="secondary" className="text-base px-3 py-1">
                                            {word}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {assignment.assignmentType === "word_matching" && assignment.matchingWords && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Párosítandó szavak</CardTitle>
                                <CardDescription>
                                    Párosítsd össze a szavakat a jelentésükkel
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {assignment.matchingWords.map((word, index) => (
                                        <Badge key={index} variant="secondary" className="text-base px-3 py-1">
                                            {word}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Submit Section */}
                    <Card>
                        <CardContent className="p-6">
                            {submitted ? (
                                <div className="text-center py-8">
                                    <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
                                    <h3 className="text-xl font-semibold mb-2">Beküldve!</h3>
                                    <p className="text-muted-foreground mb-2">
                                        A tanárod értesítést kapott a beküldésről.
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Beküldve: {studentEmail}
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-muted-foreground mb-4">
                                        Miután elkészültél a feladattal, jelezd a tanárodnak!
                                    </p>
                                    <Button
                                        onClick={handleSubmit}
                                        size="lg"
                                        className="gap-2"
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Beküldés...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-5 w-5" />
                                                Feladat beküldése
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="border-t border-border/40 mt-16 py-8">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    <p>© 2025 WordNest. Minden jog fenntartva.</p>
                </div>
            </footer>
        </div>
    );
}

export default function AssignmentPage({ params }: { params: { id: string } }) {
    return <AssignmentPageInner params={params} />;
}
