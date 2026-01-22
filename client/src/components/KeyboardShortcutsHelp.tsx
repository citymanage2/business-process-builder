import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { HelpCircle, Keyboard } from "lucide-react";

interface ShortcutCategory {
  name: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

const SHORTCUTS: ShortcutCategory[] = [
  {
    name: "Общие",
    shortcuts: [
      { keys: ["Ctrl", "S"], description: "Сохранить процесс" },
      { keys: ["Ctrl", "Z"], description: "Отменить действие" },
      { keys: ["Ctrl", "Shift", "Z"], description: "Повторить действие" },
      { keys: ["Ctrl", "C"], description: "Копировать выбранный блок" },
      { keys: ["Delete"], description: "Удалить выбранный элемент" },
    ],
  },
  {
    name: "Навигация",
    shortcuts: [
      { keys: ["Scroll"], description: "Масштабирование холста" },
      { keys: ["Space", "Drag"], description: "Перемещение по холсту" },
      { keys: ["Shift", "Click"], description: "Множественный выбор" },
    ],
  },
  {
    name: "Редактирование",
    shortcuts: [
      { keys: ["Drag"], description: "Перетащить блок из библиотеки" },
      { keys: ["Click", "Drag"], description: "Создать связь между блоками" },
      { keys: ["Double Click"], description: "Редактировать блок" },
    ],
  },
];

interface KeyboardShortcutsHelpProps {
  trigger?: React.ReactNode;
}

export default function KeyboardShortcutsHelp({ trigger }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" title="Горячие клавиши">
            <Keyboard className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Горячие клавиши
          </DialogTitle>
          <DialogDescription>
            Используйте клавиатурные сокращения для ускорения работы
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {SHORTCUTS.map((category, categoryIndex) => (
            <div key={category.name}>
              <h4 className="text-sm font-semibold mb-3">{category.name}</h4>
              <div className="space-y-2">
                {category.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center">
                          <Kbd>{key}</Kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground mx-1">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {categoryIndex < SHORTCUTS.length - 1 && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <HelpCircle className="w-3 h-3" />
          <span>Нажмите ? для открытия этого диалога</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
