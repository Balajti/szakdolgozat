"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Plus,
  Filter,
  Search,
  Calendar,
  Users,
  FileText,
  Loader2,
  MoreVertical,
  Eye,
  Send,
  Trash2,
  Pencil,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { RequireAuth } from "@/components/providers/require-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  createdAt?: string;
}

interface ClassGroup {
  id: string;
  name: string;
  studentIds?: string[];
}

function AssignmentsPageInner() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const { client } = await import("@/lib/amplify-client");
      const { getCurrentUser } = await import("aws-amplify/auth");
      const user = await getCurrentUser();

      // Load assignments
      const listAssignmentsQuery = /* GraphQL */ `
        query ListAssignmentsByTeacher($teacherId: ID!) {
          listAssignmentsByTeacher(teacherId: $teacherId) {
            items {
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
              createdAt
            }
          }
        }
      `;

      const assignmentsResponse = (await client.graphql({
        query: listAssignmentsQuery,
        variables: { teacherId: user.userId },
      })) as { data?: { listAssignmentsByTeacher?: { items?: Assignment[] } } };

      const assignmentsData = assignmentsResponse.data?.listAssignmentsByTeacher?.items || [];
      setAssignments(assignmentsData);

      // Load classes
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

      const classesResponse = (await client.graphql({
        query: listClassesQuery,
        variables: { teacherId: user.userId },
      })) as { data?: { listGroupsByTeacher?: { items?: ClassGroup[] } } };

      const classesData = classesResponse.data?.listGroupsByTeacher?.items || [];
      setClasses(classesData);

      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      setLoading(false);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni az adatokat.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
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
          input: { id: assignmentId },
        },
      });

      setAssignments(assignments.filter((a) => a.id !== assignmentId));
      toast({
        title: "Sikeres törlés",
        description: "A feladat sikeresen törölve.",
      });
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült törölni a feladatot.",
        variant: "destructive",
      });
    }
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch =
      assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.classGroupName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass =
      selectedClass === "all" || assignment.classGroupId === selectedClass;

    return matchesSearch && matchesClass;
  });

  const unassignedAssignments = filteredAssignments.filter(
    (a) => a.status === "draft" || !a.classGroupId
  );

  const assignedAssignments = filteredAssignments.filter(
    (a) => a.status === "sent" && a.classGroupId
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Piszkozat</Badge>;
      case "sent":
        return <Badge variant="default">Kiküldve</Badge>;
      case "submitted":
        return <Badge variant="default">Beküldve</Badge>;
      case "graded":
        return <Badge variant="success">Értékelve</Badge>;
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

  const AssignmentCard = ({ assignment }: { assignment: Assignment }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg break-words line-clamp-2">
              {assignment.title}
            </CardTitle>
            <CardDescription className="mt-2 flex flex-wrap items-center gap-2">
              {getStatusBadge(assignment.status)}
              {getTypeBadge(assignment.assignmentType)}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/teacher/assignment/${assignment.id}`)}>
                <Eye className="h-4 w-4 mr-2" />
                Megtekintés
              </DropdownMenuItem>
              {assignment.status === "draft" && (
                <>
                  <DropdownMenuItem onClick={() => router.push(`/teacher/assignment/${assignment.id}/edit`)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Szerkesztés
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/teacher/assignment/${assignment.id}/send`)}>
                    <Send className="h-4 w-4 mr-2" />
                    Kiküldés
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                onClick={() => handleDeleteAssignment(assignment.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Törlés
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          {assignment.classGroupName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 shrink-0" />
              <span className="truncate">{assignment.classGroupName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>Határidő: {new Date(assignment.dueDate).toLocaleDateString("hu-HU")}</span>
          </div>
          {assignment.sentTo && assignment.sentTo.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Send className="h-4 w-4 shrink-0" />
              <span>{assignment.sentTo.length} diáknak kiküldve</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4 shrink-0" />
            <span>Szint: {assignment.level}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                <h1 className="text-xl font-display font-bold text-foreground sm:text-2xl">
                  Feladatok
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {assignments.length} feladat összesen
                </p>
              </div>
            </div>
            <Button onClick={() => router.push("/teacher/assignment/create")} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Új feladat</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-6">
          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Szűrés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Keresés</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Feladat neve vagy osztály..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Osztály</label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Válassz osztályt" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Minden osztály</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Assignments Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Tabs defaultValue="unassigned" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="unassigned">
                  Nem kiosztott ({unassignedAssignments.length})
                </TabsTrigger>
                <TabsTrigger value="assigned">
                  Kiosztott ({assignedAssignments.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="unassigned">
                {unassignedAssignments.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nincs nem kiosztott feladat</h3>
                      <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
                        Hozz létre új feladatot és oszd ki az osztályoknak.
                      </p>
                      <Button onClick={() => router.push("/teacher/assignment/create")} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Új feladat létrehozása
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {unassignedAssignments.map((assignment) => (
                      <AssignmentCard key={assignment.id} assignment={assignment} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="assigned">
                {assignedAssignments.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Send className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nincs kiosztott feladat</h3>
                      <p className="text-sm text-muted-foreground text-center max-w-sm">
                        A kiosztott feladatok itt jelennek meg.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {assignedAssignments.map((assignment) => (
                      <AssignmentCard key={assignment.id} assignment={assignment} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default function AssignmentsPage() {
  return (
    <RequireAuth role="teacher">
      <AssignmentsPageInner />
    </RequireAuth>
  );
}
