import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search } from "lucide-react";

const statusLabels: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export default function ProcessBuilderList() {
  const [search, setSearch] = useState("");
  const { data, isLoading, refetch } = trpc.processBuilder.processes.list.useQuery({
    scope: "mine",
    search: search || undefined,
  });

  const deleteMutation = trpc.processBuilder.processes.delete.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Process Builder</h1>
              <p className="text-muted-foreground">Manage your business processes</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search processes"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                />
              </div>
              <Link href="/builder/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New process
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!data || data.length === 0 ? (
          <Card className="max-w-2xl mx-auto text-center py-12">
            <CardHeader>
              <CardTitle>No processes yet</CardTitle>
              <CardDescription>Create your first process to start modeling workflows.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/builder/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create process
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((process) => (
              <Card key={process.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="truncate">{process.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {process.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{statusLabels[process.status] ?? process.status}</Badge>
                    <Badge variant="outline">{process.visibility}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/builder/${process.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        Open
                      </Button>
                    </Link>
                    <Button
                      variant="destructive"
                      onClick={() => deleteMutation.mutate({ id: process.id })}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
