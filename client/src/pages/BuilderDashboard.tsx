import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import {
  Plus,
  Search,
  FileEdit,
  Eye,
  Trash2,
  Copy,
  Clock,
  LayoutGrid,
  List,
  Folder,
  Users,
  TrendingUp,
  FileText,
  Globe,
  Lock,
  MoreVertical,
  ArrowRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { toast } from "sonner";

export default function BuilderDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProcessName, setNewProcessName] = useState("");
  const [newProcessDescription, setNewProcessDescription] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.builder.stats.user.useQuery(undefined, {
    enabled: !!user
  });

  const { data: processes, isLoading: processesLoading, refetch: refetchProcesses } = trpc.builder.processes.list.useQuery(
    { search: search || undefined },
    { enabled: !!user }
  );

  const { data: sharedProcesses } = trpc.builder.processes.shared.useQuery(undefined, {
    enabled: !!user
  });

  const { data: categories } = trpc.builder.categories.list.useQuery(undefined, {
    enabled: !!user
  });

  const { data: templates } = trpc.builder.templates.list.useQuery({}, {
    enabled: !!user
  });

  // Mutations
  const createProcess = trpc.builder.processes.create.useMutation({
    onSuccess: (result) => {
      toast.success("Process created successfully");
      setCreateDialogOpen(false);
      setNewProcessName("");
      setNewProcessDescription("");
      setSelectedCategoryId("");
      setLocation(`/builder/edit/${result.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const deleteProcess = trpc.builder.processes.delete.useMutation({
    onSuccess: () => {
      toast.success("Process moved to trash");
      refetchProcesses();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const duplicateProcess = trpc.builder.processes.duplicate.useMutation({
    onSuccess: (result) => {
      toast.success("Process duplicated");
      setLocation(`/builder/edit/${result.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleCreateProcess = () => {
    if (!newProcessName.trim()) {
      toast.error("Please enter a process name");
      return;
    }

    createProcess.mutate({
      name: newProcessName.trim(),
      description: newProcessDescription.trim() || undefined,
      categoryId: selectedCategoryId ? parseInt(selectedCategoryId) : undefined
    });
  };

  const handleCreateFromTemplate = (templateId: number) => {
    createProcess.mutate({
      name: "New Process from Template",
      templateId
    });
  };

  if (authLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Process Builder</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your business processes
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Process
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Process</DialogTitle>
              <DialogDescription>
                Start with a blank process or choose from templates
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Process Name</Label>
                <Input
                  id="name"
                  placeholder="Enter process name..."
                  value={newProcessName}
                  onChange={(e) => setNewProcessName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your process..."
                  value={newProcessDescription}
                  onChange={(e) => setNewProcessDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category (optional)</Label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateProcess} disabled={createProcess.isPending}>
                {createProcess.isPending ? "Creating..." : "Create Process"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Processes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.totalProcesses ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.publishedProcesses ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shared with Me</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.sharedWithMe ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.totalViews ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="my-processes">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="my-processes">My Processes</TabsTrigger>
            <TabsTrigger value="shared">Shared with Me</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search processes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-[200px] sm:w-[300px]"
              />
            </div>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <TabsContent value="my-processes" className="mt-6">
          {processesLoading ? (
            <ProcessListSkeleton viewMode={viewMode} />
          ) : processes && processes.length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {processes.map((process) => (
                  <ProcessCard
                    key={process.id}
                    process={process}
                    onEdit={() => setLocation(`/builder/edit/${process.id}`)}
                    onView={() => setLocation(`/builder/view/${process.id}`)}
                    onDelete={() => deleteProcess.mutate({ id: process.id })}
                    onDuplicate={() => duplicateProcess.mutate({ id: process.id })}
                  />
                ))}
              </div>
            ) : (
              <ProcessTable
                processes={processes}
                onEdit={(id) => setLocation(`/builder/edit/${id}`)}
                onView={(id) => setLocation(`/builder/view/${id}`)}
                onDelete={(id) => deleteProcess.mutate({ id })}
                onDuplicate={(id) => duplicateProcess.mutate({ id })}
              />
            )
          ) : (
            <EmptyState
              title="No processes yet"
              description="Create your first process to get started"
              action={
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Process
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="shared" className="mt-6">
          {sharedProcesses && sharedProcesses.length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sharedProcesses.map((process) => (
                  <ProcessCard
                    key={process.id}
                    process={process}
                    onEdit={() => 
                      process.accessRole === "editor" 
                        ? setLocation(`/builder/edit/${process.id}`)
                        : setLocation(`/builder/view/${process.id}`)
                    }
                    onView={() => setLocation(`/builder/view/${process.id}`)}
                    showAccessRole
                    accessRole={process.accessRole}
                  />
                ))}
              </div>
            ) : (
              <ProcessTable
                processes={sharedProcesses}
                onEdit={(id) => setLocation(`/builder/edit/${id}`)}
                onView={(id) => setLocation(`/builder/view/${id}`)}
                showAccessRole
              />
            )
          ) : (
            <EmptyState
              title="No shared processes"
              description="Processes shared with you will appear here"
            />
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          {templates && templates.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {templates.map((template) => (
                <Card key={template.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">
                          {template.description || "No description"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{template.usageCount} uses</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleCreateFromTemplate(template.id)}
                        disabled={createProcess.isPending}
                      >
                        Use Template
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No templates available"
              description="Templates will appear here once they're created"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Process Card Component
function ProcessCard({
  process,
  onEdit,
  onView,
  onDelete,
  onDuplicate,
  showAccessRole,
  accessRole
}: {
  process: any;
  onEdit?: () => void;
  onView?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  showAccessRole?: boolean;
  accessRole?: string;
}) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base truncate">{process.name}</CardTitle>
              {process.visibility === "public" ? (
                <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              )}
            </div>
            <CardDescription className="line-clamp-2 mt-1">
              {process.description || "No description"}
            </CardDescription>
          </div>
          {(onDelete || onDuplicate) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <FileEdit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onView && (
                  <DropdownMenuItem onClick={onView}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </DropdownMenuItem>
                )}
                {onDuplicate && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDuplicate}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                  </>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={process.status === "published" ? "default" : "secondary"}>
              {process.status}
            </Badge>
            {showAccessRole && accessRole && (
              <Badge variant="outline">{accessRole}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {format(new Date(process.updatedAt), "MMM d, yyyy")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Process Table Component
function ProcessTable({
  processes,
  onEdit,
  onView,
  onDelete,
  onDuplicate,
  showAccessRole
}: {
  processes: any[];
  onEdit?: (id: number) => void;
  onView?: (id: number) => void;
  onDelete?: (id: number) => void;
  onDuplicate?: (id: number) => void;
  showAccessRole?: boolean;
}) {
  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="h-10 px-4 text-left text-sm font-medium">Name</th>
            <th className="h-10 px-4 text-left text-sm font-medium">Status</th>
            {showAccessRole && (
              <th className="h-10 px-4 text-left text-sm font-medium">Access</th>
            )}
            <th className="h-10 px-4 text-left text-sm font-medium">Modified</th>
            <th className="h-10 px-4 text-right text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {processes.map((process) => (
            <tr key={process.id} className="border-b hover:bg-muted/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{process.name}</span>
                  {process.visibility === "public" ? (
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant={process.status === "published" ? "default" : "secondary"}>
                  {process.status}
                </Badge>
              </td>
              {showAccessRole && (
                <td className="px-4 py-3">
                  <Badge variant="outline">{process.accessRole}</Badge>
                </td>
              )}
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {format(new Date(process.updatedAt), "MMM d, yyyy")}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  {onEdit && (
                    <Button variant="ghost" size="icon" onClick={() => onEdit(process.id)}>
                      <FileEdit className="h-4 w-4" />
                    </Button>
                  )}
                  {onView && (
                    <Button variant="ghost" size="icon" onClick={() => onView(process.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {onDuplicate && (
                    <Button variant="ghost" size="icon" onClick={() => onDuplicate(process.id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="ghost" size="icon" onClick={() => onDelete(process.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Empty State Component
function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Folder className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-muted-foreground mt-1 mb-4">{description}</p>
      {action}
    </div>
  );
}

// Skeleton Components
function DashboardSkeleton() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-10 w-96" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}

function ProcessListSkeleton({ viewMode }: { viewMode: "grid" | "list" }) {
  if (viewMode === "list") {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(8)].map((_, i) => (
        <Skeleton key={i} className="h-40" />
      ))}
    </div>
  );
}
