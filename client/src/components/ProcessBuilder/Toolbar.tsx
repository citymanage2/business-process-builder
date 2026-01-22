import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProcessBuilderStore } from '@/stores/processBuilderStore';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Save,
  Download,
  Upload,
  Copy,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Settings,
  MoreHorizontal,
  Grid3X3,
  Mouse,
  Hand,
  MessageSquare,
  History,
  FileJson,
  FileImage,
  FileText,
} from 'lucide-react';
import { useReactFlow } from 'reactflow';
import { toast } from 'sonner';

interface ToolbarProps {
  onSave: () => void;
  onExport: (format: 'png' | 'svg' | 'pdf' | 'json' | 'bpmn') => void;
  onImport: () => void;
  isSaving?: boolean;
  language?: 'en' | 'ru';
}

export default function Toolbar({
  onSave,
  onExport,
  onImport,
  isSaving = false,
  language = 'ru',
}: ToolbarProps) {
  const { fitView, zoomIn, zoomOut, getZoom } = useReactFlow();
  
  const isDirty = useProcessBuilderStore((state) => state.isDirty);
  const selectedNodes = useProcessBuilderStore((state) => state.selectedNodes);
  const selectedEdges = useProcessBuilderStore((state) => state.selectedEdges);
  const validationResult = useProcessBuilderStore((state) => state.validationResult);
  const activePanel = useProcessBuilderStore((state) => state.activePanel);
  
  const undo = useProcessBuilderStore((state) => state.undo);
  const redo = useProcessBuilderStore((state) => state.redo);
  const canUndo = useProcessBuilderStore((state) => state.canUndo);
  const canRedo = useProcessBuilderStore((state) => state.canRedo);
  const removeNodes = useProcessBuilderStore((state) => state.removeNodes);
  const removeEdges = useProcessBuilderStore((state) => state.removeEdges);
  const duplicateNodes = useProcessBuilderStore((state) => state.duplicateNodes);
  const selectAll = useProcessBuilderStore((state) => state.selectAll);
  const clearSelection = useProcessBuilderStore((state) => state.clearSelection);
  const validate = useProcessBuilderStore((state) => state.validate);
  const setActivePanel = useProcessBuilderStore((state) => state.setActivePanel);
  
  const handleDelete = () => {
    if (selectedNodes.length > 0) {
      removeNodes(selectedNodes);
    }
    if (selectedEdges.length > 0) {
      removeEdges(selectedEdges);
    }
  };
  
  const handleDuplicate = () => {
    if (selectedNodes.length > 0) {
      duplicateNodes(selectedNodes);
    }
  };
  
  const handleValidate = () => {
    const result = validate();
    if (result.isValid) {
      toast.success(language === 'ru' ? 'Процесс валиден' : 'Process is valid');
    } else {
      toast.error(
        language === 'ru'
          ? `Найдено ошибок: ${result.errors.length}, предупреждений: ${result.warnings.length}`
          : `Errors: ${result.errors.length}, Warnings: ${result.warnings.length}`
      );
    }
  };
  
  const hasSelection = selectedNodes.length > 0 || selectedEdges.length > 0;
  const errorCount = validationResult?.errors.length || 0;
  const warningCount = validationResult?.warnings.length || 0;
  
  const texts = {
    en: {
      save: 'Save',
      saving: 'Saving...',
      undo: 'Undo',
      redo: 'Redo',
      zoomIn: 'Zoom In',
      zoomOut: 'Zoom Out',
      fitView: 'Fit View',
      delete: 'Delete',
      duplicate: 'Duplicate',
      selectAll: 'Select All',
      validate: 'Validate',
      comments: 'Comments',
      versions: 'Versions',
      export: 'Export',
      import: 'Import',
      exportPng: 'Export as PNG',
      exportSvg: 'Export as SVG',
      exportPdf: 'Export as PDF',
      exportJson: 'Export as JSON',
      exportBpmn: 'Export as BPMN',
    },
    ru: {
      save: 'Сохранить',
      saving: 'Сохранение...',
      undo: 'Отменить',
      redo: 'Повторить',
      zoomIn: 'Увеличить',
      zoomOut: 'Уменьшить',
      fitView: 'Вместить',
      delete: 'Удалить',
      duplicate: 'Дублировать',
      selectAll: 'Выбрать все',
      validate: 'Проверить',
      comments: 'Комментарии',
      versions: 'Версии',
      export: 'Экспорт',
      import: 'Импорт',
      exportPng: 'Экспорт в PNG',
      exportSvg: 'Экспорт в SVG',
      exportPdf: 'Экспорт в PDF',
      exportJson: 'Экспорт в JSON',
      exportBpmn: 'Экспорт в BPMN',
    },
  };
  
  const t = texts[language];
  
  return (
    <div className="flex items-center gap-1 p-2 bg-background border-b">
      {/* Save button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isDirty ? 'default' : 'ghost'}
            size="sm"
            onClick={onSave}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-1.5" />
            {isSaving ? t.saving : t.save}
            {isDirty && !isSaving && (
              <span className="ml-1 w-2 h-2 rounded-full bg-orange-400" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ctrl+S</TooltipContent>
      </Tooltip>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={undo}
              disabled={!canUndo()}
            >
              <Undo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t.undo} (Ctrl+Z)</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={redo}
              disabled={!canRedo()}
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t.redo} (Ctrl+Y)</TooltipContent>
        </Tooltip>
      </div>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      {/* Zoom controls */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => zoomOut()}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t.zoomOut}</TooltipContent>
        </Tooltip>
        
        <span className="text-xs text-muted-foreground w-10 text-center">
          {Math.round(getZoom() * 100)}%
        </span>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => zoomIn()}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t.zoomIn}</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => fitView({ padding: 0.2 })}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t.fitView}</TooltipContent>
        </Tooltip>
      </div>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      {/* Selection actions */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDuplicate}
              disabled={!hasSelection}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t.duplicate} (Ctrl+D)</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={!hasSelection}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t.delete} (Delete)</TooltipContent>
        </Tooltip>
      </div>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      {/* Validation */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleValidate}
            className={cn(
              errorCount > 0 && 'text-destructive',
              warningCount > 0 && errorCount === 0 && 'text-yellow-600'
            )}
          >
            {errorCount > 0 ? (
              <AlertTriangle className="w-4 h-4 mr-1" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-1" />
            )}
            {t.validate}
            {(errorCount > 0 || warningCount > 0) && (
              <span className="ml-1 text-xs">
                ({errorCount + warningCount})
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {errorCount > 0 || warningCount > 0
            ? `${errorCount} ${language === 'ru' ? 'ошибок' : 'errors'}, ${warningCount} ${language === 'ru' ? 'предупреждений' : 'warnings'}`
            : language === 'ru' ? 'Проверить процесс' : 'Validate process'}
        </TooltipContent>
      </Tooltip>
      
      <div className="flex-1" />
      
      {/* Right side tools */}
      <div className="flex items-center gap-1">
        {/* Comments */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activePanel === 'comments' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setActivePanel(activePanel === 'comments' ? 'properties' : 'comments')}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t.comments}</TooltipContent>
        </Tooltip>
        
        {/* Versions */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activePanel === 'versions' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setActivePanel(activePanel === 'versions' ? 'properties' : 'versions')}
            >
              <History className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t.versions}</TooltipContent>
        </Tooltip>
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4 mr-1.5" />
              {t.export}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport('png')}>
              <FileImage className="w-4 h-4 mr-2" />
              {t.exportPng}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('svg')}>
              <FileImage className="w-4 h-4 mr-2" />
              {t.exportSvg}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('pdf')}>
              <FileText className="w-4 h-4 mr-2" />
              {t.exportPdf}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onExport('json')}>
              <FileJson className="w-4 h-4 mr-2" />
              {t.exportJson}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('bpmn')}>
              <FileJson className="w-4 h-4 mr-2" />
              {t.exportBpmn}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Import */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onImport}>
              <Upload className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t.import}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
