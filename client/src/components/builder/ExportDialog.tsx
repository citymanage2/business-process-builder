import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Download, FileJson, FileImage, FileText, Loader2 } from "lucide-react";
import { toPng, toSvg } from "html-to-image";
import { useReactFlow } from "reactflow";

interface ExportDialogProps {
  processId: number;
  processName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExportFormat = "png" | "svg" | "json" | "pdf";

export function ExportDialog({ processId, processName, open, onOpenChange }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [includeBackground, setIncludeBackground] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { getNodes } = useReactFlow();

  const { data: exportData } = trpc.builder.export.json.useQuery(
    { processId },
    { enabled: open && format === "json" }
  );

  const handleExport = async () => {
    setIsExporting(true);

    try {
      switch (format) {
        case "png":
          await exportAsPng();
          break;
        case "svg":
          await exportAsSvg();
          break;
        case "json":
          exportAsJson();
          break;
        case "pdf":
          await exportAsPdf();
          break;
      }
      toast.success(`Process exported as ${format.toUpperCase()}`);
      onOpenChange(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export process");
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsPng = async () => {
    const element = document.querySelector(".react-flow__viewport") as HTMLElement;
    if (!element) throw new Error("Canvas not found");

    const dataUrl = await toPng(element, {
      backgroundColor: includeBackground ? "#ffffff" : undefined,
      quality: 1,
      pixelRatio: 2
    });

    downloadFile(dataUrl, `${processName}.png`);
  };

  const exportAsSvg = async () => {
    const element = document.querySelector(".react-flow__viewport") as HTMLElement;
    if (!element) throw new Error("Canvas not found");

    const dataUrl = await toSvg(element, {
      backgroundColor: includeBackground ? "#ffffff" : undefined
    });

    downloadFile(dataUrl, `${processName}.svg`);
  };

  const exportAsJson = () => {
    if (!exportData) throw new Error("Export data not available");

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    downloadFile(url, `${processName}.json`);
    URL.revokeObjectURL(url);
  };

  const exportAsPdf = async () => {
    // Dynamic import for html2pdf
    const html2pdf = (await import("html2pdf.js")).default;
    
    const element = document.querySelector(".react-flow__viewport") as HTMLElement;
    if (!element) throw new Error("Canvas not found");

    // Create a container for PDF content
    const container = document.createElement("div");
    container.style.padding = "20px";
    
    // Add title
    const title = document.createElement("h1");
    title.textContent = processName;
    title.style.marginBottom = "20px";
    container.appendChild(title);

    // Clone the canvas
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.transform = "none";
    container.appendChild(clone);

    // Add blocks list
    const nodes = getNodes();
    if (nodes.length > 0) {
      const blocksList = document.createElement("div");
      blocksList.style.marginTop = "40px";
      blocksList.innerHTML = `
        <h2 style="margin-bottom: 15px;">Process Blocks</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Name</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Type</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Description</th>
            </tr>
          </thead>
          <tbody>
            ${nodes.map(node => `
              <tr>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">${node.data.name || node.data.label}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">${node.data.type}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">${node.data.description || "-"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
      container.appendChild(blocksList);
    }

    document.body.appendChild(container);

    const options = {
      margin: 10,
      filename: `${processName}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "landscape" as const }
    };

    await html2pdf().set(options).from(container).save();
    document.body.removeChild(container);
  };

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Process
          </DialogTitle>
          <DialogDescription>
            Export "{processName}" in your preferred format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    format === "png" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value="png" />
                  <FileImage className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">PNG</p>
                    <p className="text-xs text-muted-foreground">High quality image</p>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    format === "svg" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value="svg" />
                  <FileImage className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">SVG</p>
                    <p className="text-xs text-muted-foreground">Scalable vector</p>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    format === "json" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value="json" />
                  <FileJson className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-medium">JSON</p>
                    <p className="text-xs text-muted-foreground">Process data</p>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    format === "pdf" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value="pdf" />
                  <FileText className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium">PDF</p>
                    <p className="text-xs text-muted-foreground">Document with details</p>
                  </div>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Options */}
          {(format === "png" || format === "svg") && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="background"
                checked={includeBackground}
                onCheckedChange={(checked) => setIncludeBackground(checked === true)}
              />
              <Label htmlFor="background" className="cursor-pointer">
                Include white background
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
