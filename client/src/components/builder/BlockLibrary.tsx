import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BLOCK_CATEGORIES, BLOCK_METADATA, BlockType } from "@shared/builderTypes";
import { Search, X, GripVertical } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface BlockLibraryProps {
  onClose: () => void;
}

export function BlockLibrary({ onClose }: BlockLibraryProps) {
  const [search, setSearch] = useState("");

  const filteredCategories = Object.entries(BLOCK_CATEGORIES).map(([key, category]) => {
    const filteredTypes = category.types.filter((type) => {
      const meta = BLOCK_METADATA[type];
      if (!meta) return false;
      if (!search) return true;
      
      const searchLower = search.toLowerCase();
      return (
        meta.label.toLowerCase().includes(searchLower) ||
        meta.labelRu.toLowerCase().includes(searchLower) ||
        meta.description.toLowerCase().includes(searchLower) ||
        meta.descriptionRu.toLowerCase().includes(searchLower)
      );
    });

    return {
      key,
      ...category,
      types: filteredTypes
    };
  }).filter((cat) => cat.types.length > 0);

  const onDragStart = (event: React.DragEvent, blockType: BlockType) => {
    event.dataTransfer.setData("application/reactflow", blockType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-64 border-r bg-background flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">Blocks</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Block Categories */}
      <ScrollArea className="flex-1">
        <Accordion type="multiple" defaultValue={Object.keys(BLOCK_CATEGORIES)} className="px-2">
          {filteredCategories.map((category) => (
            <AccordionItem key={category.key} value={category.key}>
              <AccordionTrigger className="py-2 text-sm hover:no-underline">
                {category.label}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 pb-2">
                  {category.types.map((type) => {
                    const meta = BLOCK_METADATA[type];
                    if (!meta) return null;

                    const IconComponent = (LucideIcons as any)[meta.icon] || LucideIcons.Box;

                    return (
                      <div
                        key={type}
                        draggable
                        onDragStart={(e) => onDragStart(e, type)}
                        className="flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent cursor-grab active:cursor-grabbing transition-colors"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                          style={{ backgroundColor: meta.color + "20" }}
                        >
                          <IconComponent className="h-3.5 w-3.5" style={{ color: meta.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{meta.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{meta.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>

      {/* Help */}
      <div className="p-3 border-t bg-muted/50">
        <p className="text-xs text-muted-foreground">
          Drag and drop blocks onto the canvas to add them to your process.
        </p>
      </div>
    </div>
  );
}
