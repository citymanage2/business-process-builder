import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { History, RotateCcw, Eye, Clock, User } from "lucide-react";
import { toast } from "sonner";

interface VersionHistoryProps {
  processId: number;
  currentVersion: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVersionRestored?: () => void;
}

export function VersionHistory({
  processId,
  currentVersion,
  open,
  onOpenChange,
  onVersionRestored
}: VersionHistoryProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { data: versions, isLoading } = trpc.builder.versions.list.useQuery(
    { processId },
    { enabled: open }
  );

  const { data: versionPreview } = trpc.builder.versions.get.useQuery(
    { id: selectedVersionId! },
    { enabled: !!selectedVersionId && showPreview }
  );

  const restoreVersion = trpc.builder.versions.restore.useMutation({
    onSuccess: (result) => {
      toast.success(`Restored to version ${result.newVersion}`);
      onOpenChange(false);
      onVersionRestored?.();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleRestore = (versionId: number) => {
    restoreVersion.mutate({ processId, versionId });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </DialogTitle>
            <DialogDescription>
              View and restore previous versions of this process
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : versions && versions.length > 0 ? (
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      version.versionNumber === currentVersion
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Version {version.versionNumber}</span>
                          {version.versionNumber === currentVersion && (
                            <Badge variant="default" className="text-xs">Current</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {version.comment || "No description"}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(version.createdAt), "MMM d, yyyy 'at' HH:mm")}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Author #{version.authorId}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedVersionId(version.id);
                            setShowPreview(true);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </Button>
                        {version.versionNumber !== currentVersion && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(version.id)}
                            disabled={restoreVersion.isPending}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restore
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No version history available</p>
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Version Preview</DialogTitle>
            <DialogDescription>
              Preview of version {versionPreview?.versionNumber}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[500px]">
            {versionPreview?.snapshot ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Blocks ({versionPreview.snapshot.blocks?.length || 0})</h4>
                  <div className="grid gap-2">
                    {versionPreview.snapshot.blocks?.map((block: any) => (
                      <div key={block.id} className="p-2 rounded border bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{block.type}</Badge>
                          <span className="font-medium">{block.name}</span>
                        </div>
                        {block.description && (
                          <p className="text-sm text-muted-foreground mt-1">{block.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Connections ({versionPreview.snapshot.connections?.length || 0})</h4>
                  <div className="grid gap-2">
                    {versionPreview.snapshot.connections?.map((conn: any) => (
                      <div key={conn.id} className="p-2 rounded border bg-muted/50 text-sm">
                        <span>{conn.source}</span>
                        <span className="mx-2 text-muted-foreground">→</span>
                        <span>{conn.target}</span>
                        {conn.label && (
                          <Badge variant="secondary" className="ml-2">{conn.label}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Skeleton className="h-full w-full" />
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            {selectedVersionId && (
              <Button
                onClick={() => {
                  handleRestore(selectedVersionId);
                  setShowPreview(false);
                }}
                disabled={restoreVersion.isPending}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore This Version
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
