"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
    ArrowLeft,
    Loader2,
    Save,
    Eye,
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RequireAuth } from "@/components/providers/require-auth";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Assignment {
    id: string;
    title: string;
    dueDate: string;
    level: string;
    status: string;
    assignmentType: string;
    storyContent?: string;
    blankPositions?: string;
    matchingWords?: string[];
}

function AssignmentEditPageInner({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        content: "",
        level: "A2",
        assignmentType: "basic",
        dueDate: "",
        blankPositions: [] as any[],
        matchingWords: [] as string[],
    });

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
            dueDate
            level
            status
            assignmentType
            storyContent
            blankPositions
            matchingWords
          }
        }
      `;

            const response = (await client.graphql({
                query: getAssignmentQuery,
                variables: { id: params.id },
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

            // Check if it's a draft
            if (assignmentData.status !== "draft") {
                toast({
                    title: "Nem szerkeszthető",
                    description: "Csak piszkozat státuszú feladatokat lehet szerkeszteni.",
                    variant: "destructive",
                });
                router.push(`/teacher/assignment/${params.id}`);
                return;
            }

            // Parse blank positions if they exist
            let blankPositions: any[] = [];
            if (assignmentData.blankPositions) {
                try {
                    blankPositions = JSON.parse(assignmentData.blankPositions);
                } catch (error) {
                    console.error("Error parsing blank positions:", error);
                }
            }

            setFormData({
                title: assignmentData.title,
                content: assignmentData.storyContent || "",
                level: assignmentData.level,
                assignmentType: assignmentData.assignmentType,
                dueDate: assignmentData.dueDate,
                blankPositions,
                matchingWords: assignmentData.matchingWords || [],
            });

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

    const validateForm = useCallback(() => {
        if (!formData.title.trim()) {
            toast({
                title: "Hiányzó cím",
                description: "Add meg a feladat címét.",
                variant: "destructive",
            });
            return false;
        }

        if (!formData.content.trim()) {
            toast({
                title: "Hiányzó tartalom",
                description: "Add meg a feladat tartalmát.",
                variant: "destructive",
            });
            return false;
        }

        if (formData.content.trim().length < 50) {
            toast({
                title: "Túl rövid tartalom",
                description: "A feladat tartalmának legalább 50 karakter hosszúnak kell lennie.",
                variant: "destructive",
            });
            return false;
        }

        return true;
    }, [formData.title, formData.content, toast]);

    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }

        setSaving(true);
        try {
            const { client } = await import("@/lib/amplify-client");

            const updateAssignmentMutation = /* GraphQL */ `
        mutation UpdateAssignment($input: UpdateAssignmentInput!) {
          updateAssignment(input: $input) {
            id
            title
          }
        }
      `;

            await client.graphql({
                query: updateAssignmentMutation,
                variables: {
                    input: {
                        id: params.id,
                        title: formData.title,
                        storyContent: formData.content,
                        level: formData.level,
                        dueDate: formData.dueDate,
                        blankPositions: formData.blankPositions.length > 0 ? JSON.stringify(formData.blankPositions) : null,
                        matchingWords: formData.matchingWords.length > 0 ? formData.matchingWords : null,
                    },
                },
            });

            toast({
                title: "Változtatások mentve",
                description: "A feladat sikeresen frissítve.",
            });

            router.push("/teacher/assignments");
        } catch (error) {
            console.error("Error updating assignment:", error);
            toast({
                title: "Hiba",
                description: "Nem sikerült menteni a változtatásokat.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
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

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

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
                                Feladat szerkesztése
                            </h1>
                            <p className="text-xs text-muted-foreground sm:text-sm">
                                Módosítsd a feladat részleteit
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
                                <CardTitle>Feladat adatok</CardTitle>
                                <CardDescription>
                                    Módosítsd a feladat részleteit
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
                        transition={{ duration: 0.3, delay: 0.1 }}
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
                                onClick={handleSave}
                                disabled={saving || !formData.title || !formData.content}
                                className="gap-2"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Mentés...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Mentés
                                    </>
                                )}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </main>

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
        </div>
    );
}

export default function AssignmentEditPage({ params }: { params: { id: string } }) {
    return (
        <RequireAuth role="teacher">
            <AssignmentEditPageInner params={params} />
        </RequireAuth>
    );
}
