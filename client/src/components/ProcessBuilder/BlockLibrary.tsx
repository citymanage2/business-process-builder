import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  BLOCK_LIBRARY,
  BLOCK_CATEGORIES,
  BlockDefinition,
  BlockCategory,
  getBlocksByCategory,
} from '@shared/processBuilder';
import * as LucideIcons from 'lucide-react';
import { Search, GripVertical } from 'lucide-react';

// Get icon component by name
const getIcon = (iconName: string, className?: string) => {
  const Icon = (LucideIcons as any)[iconName];
  if (!Icon) return null;
  return <Icon className={className} />;
};

// Category configuration
const CATEGORY_CONFIG: Record<BlockCategory, { name: { en: string; ru: string }; icon: string; color: string }> = {
  [BLOCK_CATEGORIES.START_END]: {
    name: { en: 'Start & End', ru: 'Начало и завершение' },
    icon: 'Play',
    color: 'bg-green-50 border-green-200 hover:bg-green-100',
  },
  [BLOCK_CATEGORIES.ACTIONS]: {
    name: { en: 'Actions', ru: 'Действия' },
    icon: 'CheckSquare',
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
  },
  [BLOCK_CATEGORIES.DECISIONS]: {
    name: { en: 'Decisions', ru: 'Решения' },
    icon: 'GitBranch',
    color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
  },
  [BLOCK_CATEGORIES.DATA]: {
    name: { en: 'Data', ru: 'Данные' },
    icon: 'Database',
    color: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
  },
  [BLOCK_CATEGORIES.EVENTS]: {
    name: { en: 'Events', ru: 'События' },
    icon: 'Bell',
    color: 'bg-pink-50 border-pink-200 hover:bg-pink-100',
  },
  [BLOCK_CATEGORIES.PARTICIPANTS]: {
    name: { en: 'Participants', ru: 'Участники' },
    icon: 'Users',
    color: 'bg-slate-50 border-slate-200 hover:bg-slate-100',
  },
};

interface BlockLibraryProps {
  onDragStart: (event: React.DragEvent, blockType: string, blockDef: BlockDefinition) => void;
  language?: 'en' | 'ru';
}

function BlockItem({
  block,
  onDragStart,
  language = 'ru',
}: {
  block: BlockDefinition;
  onDragStart: (event: React.DragEvent, blockType: string, blockDef: BlockDefinition) => void;
  language?: 'en' | 'ru';
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, block.type, block)}
      className={cn(
        'flex items-center gap-2 p-2 rounded-md border cursor-grab active:cursor-grabbing',
        'bg-white hover:bg-gray-50 transition-colors group'
      )}
    >
      <div
        className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${block.color}20` }}
      >
        {getIcon(block.icon, 'w-4 h-4')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{block.name[language]}</div>
        <div className="text-xs text-muted-foreground truncate">{block.description[language]}</div>
      </div>
      <GripVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </div>
  );
}

export default function BlockLibrary({ onDragStart, language = 'ru' }: BlockLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter blocks based on search query
  const filteredBlocks = useMemo(() => {
    if (!searchQuery.trim()) return null;
    
    const query = searchQuery.toLowerCase();
    return BLOCK_LIBRARY.filter(
      (block) =>
        block.name.en.toLowerCase().includes(query) ||
        block.name.ru.toLowerCase().includes(query) ||
        block.description.en.toLowerCase().includes(query) ||
        block.description.ru.toLowerCase().includes(query)
    );
  }, [searchQuery]);
  
  // Group blocks by category
  const blocksByCategory = useMemo(() => {
    const result: Record<BlockCategory, BlockDefinition[]> = {} as any;
    Object.values(BLOCK_CATEGORIES).forEach((category) => {
      result[category] = getBlocksByCategory(category);
    });
    return result;
  }, []);
  
  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === 'ru' ? 'Поиск блоков...' : 'Search blocks...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* Search results */}
          {filteredBlocks ? (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                {language === 'ru'
                  ? `Найдено: ${filteredBlocks.length}`
                  : `Found: ${filteredBlocks.length}`}
              </div>
              {filteredBlocks.map((block) => (
                <BlockItem
                  key={block.type}
                  block={block}
                  onDragStart={onDragStart}
                  language={language}
                />
              ))}
              {filteredBlocks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {language === 'ru' ? 'Ничего не найдено' : 'No blocks found'}
                </div>
              )}
            </div>
          ) : (
            /* Categories accordion */
            <Accordion
              type="multiple"
              defaultValue={Object.values(BLOCK_CATEGORIES)}
              className="space-y-2"
            >
              {Object.entries(CATEGORY_CONFIG).map(([category, config]) => (
                <AccordionItem
                  key={category}
                  value={category}
                  className={cn('border rounded-lg', config.color)}
                >
                  <AccordionTrigger className="px-3 py-2 hover:no-underline">
                    <div className="flex items-center gap-2">
                      {getIcon(config.icon, 'w-4 h-4')}
                      <span className="font-medium">{config.name[language]}</span>
                      <span className="text-xs text-muted-foreground">
                        ({blocksByCategory[category as BlockCategory]?.length || 0})
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2">
                    <div className="space-y-1.5">
                      {blocksByCategory[category as BlockCategory]?.map((block) => (
                        <BlockItem
                          key={block.type}
                          block={block}
                          onDragStart={onDragStart}
                          language={language}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </ScrollArea>
      
      {/* Drag hint */}
      <div className="p-3 border-t bg-muted/30">
        <p className="text-xs text-center text-muted-foreground">
          {language === 'ru'
            ? 'Перетащите блок на холст для добавления'
            : 'Drag and drop blocks to the canvas'}
        </p>
      </div>
    </div>
  );
}
