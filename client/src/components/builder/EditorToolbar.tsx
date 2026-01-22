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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

interface EditorToolbarProps {
  // View controls
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  
  // Edit controls
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  
  // Selection controls
  hasSelection: boolean;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
  
  // Alignment
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onAlignTop: () => void;
  onAlignMiddle: () => void;
  onAlignBottom: () => void;
  onDistributeHorizontal: () => void;
  onDistributeVertical: () => void;
  
  // Grid and snap
  showGrid: boolean;
  snapToGrid: boolean;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  
  // Minimap
  showMinimap: boolean;
  onToggleMinimap: () => void;
  
  // Validation
  validationErrors: number;
  onValidate: () => void;
  
  // Save/Export
  isSaving: boolean;
  onSave: () => void;
  onExportJSON: () => void;
  onExportPNG: () => void;
  onExportSVG: () => void;
  onImport: () => void;
  
  className?: string;
}

export function EditorToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitView,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasSelection,
  onCopy,
  onPaste,
  onDelete,
  onSelectAll,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignMiddle,
  onAlignBottom,
  onDistributeHorizontal,
  onDistributeVertical,
  showGrid,
  snapToGrid,
  onToggleGrid,
  onToggleSnap,
  showMinimap,
  onToggleMinimap,
  validationErrors,
  onValidate,
  isSaving,
  onSave,
  onExportJSON,
  onExportPNG,
  onExportSVG,
  onImport,
  className,
}: EditorToolbarProps) {
  return (
    <div className={cn(
      'flex items-center gap-1 px-2 py-1 bg-background border-b',
      className
    )}>
      {/* Undo/Redo */}
      <ToolbarGroup>
        <ToolbarButton
          icon={<LucideIcons.Undo2 size={18} />}
          tooltip="Отменить (Ctrl+Z)"
          onClick={onUndo}
          disabled={!canUndo}
        />
        <ToolbarButton
          icon={<LucideIcons.Redo2 size={18} />}
          tooltip="Повторить (Ctrl+Y)"
          onClick={onRedo}
          disabled={!canRedo}
        />
      </ToolbarGroup>

      <Separator orientation="vertical" className="h-6" />

      {/* Clipboard */}
      <ToolbarGroup>
        <ToolbarButton
          icon={<LucideIcons.Copy size={18} />}
          tooltip="Копировать (Ctrl+C)"
          onClick={onCopy}
          disabled={!hasSelection}
        />
        <ToolbarButton
          icon={<LucideIcons.Clipboard size={18} />}
          tooltip="Вставить (Ctrl+V)"
          onClick={onPaste}
        />
        <ToolbarButton
          icon={<LucideIcons.Trash2 size={18} />}
          tooltip="Удалить (Delete)"
          onClick={onDelete}
          disabled={!hasSelection}
        />
      </ToolbarGroup>

      <Separator orientation="vertical" className="h-6" />

      {/* Alignment */}
      <ToolbarGroup>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2" disabled={!hasSelection}>
              <LucideIcons.AlignHorizontalJustifyStart size={18} />
              <LucideIcons.ChevronDown size={14} className="ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onAlignLeft}>
              <LucideIcons.AlignHorizontalJustifyStart size={16} className="mr-2" />
              По левому краю
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAlignCenter}>
              <LucideIcons.AlignHorizontalJustifyCenter size={16} className="mr-2" />
              По центру (горизонтально)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAlignRight}>
              <LucideIcons.AlignHorizontalJustifyEnd size={16} className="mr-2" />
              По правому краю
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onAlignTop}>
              <LucideIcons.AlignVerticalJustifyStart size={16} className="mr-2" />
              По верхнему краю
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAlignMiddle}>
              <LucideIcons.AlignVerticalJustifyCenter size={16} className="mr-2" />
              По центру (вертикально)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAlignBottom}>
              <LucideIcons.AlignVerticalJustifyEnd size={16} className="mr-2" />
              По нижнему краю
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDistributeHorizontal}>
              <LucideIcons.AlignHorizontalSpaceAround size={16} className="mr-2" />
              Распределить горизонтально
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDistributeVertical}>
              <LucideIcons.AlignVerticalSpaceAround size={16} className="mr-2" />
              Распределить вертикально
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ToolbarGroup>

      <Separator orientation="vertical" className="h-6" />

      {/* Zoom */}
      <ToolbarGroup>
        <ToolbarButton
          icon={<LucideIcons.ZoomOut size={18} />}
          tooltip="Уменьшить"
          onClick={onZoomOut}
        />
        <span className="px-2 text-sm font-medium min-w-[50px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <ToolbarButton
          icon={<LucideIcons.ZoomIn size={18} />}
          tooltip="Увеличить"
          onClick={onZoomIn}
        />
        <ToolbarButton
          icon={<LucideIcons.Maximize2 size={18} />}
          tooltip="По размеру"
          onClick={onFitView}
        />
      </ToolbarGroup>

      <Separator orientation="vertical" className="h-6" />

      {/* View options */}
      <ToolbarGroup>
        <ToolbarButton
          icon={<LucideIcons.Grid3X3 size={18} />}
          tooltip={showGrid ? 'Скрыть сетку' : 'Показать сетку'}
          onClick={onToggleGrid}
          active={showGrid}
        />
        <ToolbarButton
          icon={<LucideIcons.Magnet size={18} />}
          tooltip={snapToGrid ? 'Отключить привязку' : 'Включить привязку'}
          onClick={onToggleSnap}
          active={snapToGrid}
        />
        <ToolbarButton
          icon={<LucideIcons.Map size={18} />}
          tooltip={showMinimap ? 'Скрыть миникарту' : 'Показать миникарту'}
          onClick={onToggleMinimap}
          active={showMinimap}
        />
      </ToolbarGroup>

      <div className="flex-1" />

      {/* Validation */}
      <ToolbarGroup>
        <ToolbarButton
          icon={
            <div className="relative">
              <LucideIcons.CheckCircle size={18} />
              {validationErrors > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                  {validationErrors > 9 ? '9+' : validationErrors}
                </span>
              )}
            </div>
          }
          tooltip="Проверить процесс"
          onClick={onValidate}
        />
      </ToolbarGroup>

      <Separator orientation="vertical" className="h-6" />

      {/* Import/Export */}
      <ToolbarGroup>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <LucideIcons.Download size={18} />
              <LucideIcons.ChevronDown size={14} className="ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onExportJSON}>
              <LucideIcons.FileJson size={16} className="mr-2" />
              Экспорт в JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportPNG}>
              <LucideIcons.Image size={16} className="mr-2" />
              Экспорт в PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportSVG}>
              <LucideIcons.FileCode size={16} className="mr-2" />
              Экспорт в SVG
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onImport}>
              <LucideIcons.Upload size={16} className="mr-2" />
              Импорт из JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ToolbarGroup>

      <Separator orientation="vertical" className="h-6" />

      {/* Save */}
      <Button onClick={onSave} disabled={isSaving} size="sm">
        {isSaving ? (
          <LucideIcons.Loader2 size={16} className="mr-2 animate-spin" />
        ) : (
          <LucideIcons.Save size={16} className="mr-2" />
        )}
        Сохранить
      </Button>
    </div>
  );
}

// =============================================
// Helper Components
// =============================================

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}

function ToolbarButton({ icon, tooltip, onClick, disabled, active }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onClick}
          disabled={disabled}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export default EditorToolbar;
