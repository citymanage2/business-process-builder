import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  BLOCK_CATEGORIES,
  BLOCK_DEFINITIONS,
  BlockCategory,
  BlockDefinition,
  BlockType,
} from '@/lib/processBuilder';
import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface BlockLibraryProps {
  onDragStart: (event: React.DragEvent, blockType: BlockType) => void;
  className?: string;
}

export function BlockLibrary({ onDragStart, className }: BlockLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredBlocks = useMemo(() => {
    if (!searchQuery.trim()) {
      return BLOCK_DEFINITIONS;
    }
    
    const query = searchQuery.toLowerCase();
    return BLOCK_DEFINITIONS.filter(
      block =>
        block.name.toLowerCase().includes(query) ||
        block.nameRu.toLowerCase().includes(query) ||
        block.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const blocksByCategory = useMemo(() => {
    const grouped: Record<BlockCategory, BlockDefinition[]> = {
      start_end: [],
      actions: [],
      decisions: [],
      data: [],
      events: [],
      participants: [],
    };
    
    filteredBlocks.forEach(block => {
      grouped[block.category].push(block);
    });
    
    return grouped;
  }, [filteredBlocks]);

  return (
    <div className={cn('flex flex-col h-full bg-background border-r', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-3">Библиотека блоков</h2>
        <div className="relative">
          <LucideIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Поиск блоков..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      
      {/* Block Categories */}
      <ScrollArea className="flex-1">
        <Accordion type="multiple" defaultValue={BLOCK_CATEGORIES.map(c => c.id)} className="px-2 py-2">
          {BLOCK_CATEGORIES.map(category => {
            const blocks = blocksByCategory[category.id];
            if (blocks.length === 0) return null;
            
            return (
              <AccordionItem key={category.id} value={category.id} className="border-b-0">
                <AccordionTrigger className="py-2 px-2 hover:no-underline hover:bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">{category.nameRu}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({blocks.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="grid grid-cols-2 gap-2 px-1">
                    {blocks.map(block => (
                      <BlockItem
                        key={block.type}
                        block={block}
                        onDragStart={onDragStart}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
        
        {filteredBlocks.length === 0 && (
          <div className="p-4 text-center text-muted-foreground">
            <LucideIcons.SearchX className="mx-auto mb-2" size={24} />
            <p className="text-sm">Блоки не найдены</p>
          </div>
        )}
      </ScrollArea>
      
      {/* Help text */}
      <div className="p-3 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          Перетащите блок на холст или дважды кликните для добавления
        </p>
      </div>
    </div>
  );
}

interface BlockItemProps {
  block: BlockDefinition;
  onDragStart: (event: React.DragEvent, blockType: BlockType) => void;
}

function BlockItem({ block, onDragStart }: BlockItemProps) {
  const IconComponent = useMemo(() => {
    if (block.icon && block.icon in LucideIcons) {
      return (LucideIcons as unknown as Record<string, LucideIcon>)[block.icon];
    }
    return LucideIcons.Square;
  }, [block.icon]);

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, block.type)}
      className={cn(
        'flex flex-col items-center p-2 rounded-lg border-2 cursor-grab',
        'bg-card hover:bg-muted/50 transition-colors',
        'active:cursor-grabbing'
      )}
      style={{ borderColor: `${block.color}40` }}
      title={block.description}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-1"
        style={{ backgroundColor: `${block.color}20` }}
      >
        <IconComponent size={18} style={{ color: block.color }} />
      </div>
      <span className="text-xs text-center font-medium line-clamp-2">
        {block.nameRu}
      </span>
    </div>
  );
}

export default BlockLibrary;
