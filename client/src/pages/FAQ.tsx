import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { APP_TITLE } from "@/const";

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Получить все FAQ или результаты поиска
  const { data: allFaq = [] } = trpc.faq.getAll.useQuery(undefined, {
    enabled: !searchQuery,
  });

  const { data: searchResults = [] } = trpc.faq.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 0 }
  );

  const faqList = searchQuery ? searchResults : allFaq;

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Группировка по категориям
  const groupedFaq = faqList.reduce((acc, item) => {
    const category = item.category || "Общие вопросы";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof faqList>);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto py-6">
          <h1 className="text-3xl font-bold">{APP_TITLE} - База знаний</h1>
          <p className="text-muted-foreground mt-2">
            Ответы на часто задаваемые вопросы
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto py-8">
        {/* Search */}
        <Card className="p-6 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по вопросам..."
              className="pl-10"
            />
          </div>
        </Card>

        {/* FAQ List */}
        {Object.keys(groupedFaq).length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              {searchQuery
                ? "По вашему запросу ничего не найдено"
                : "База знаний пока пуста"}
            </p>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedFaq).map(([category, items]) => (
              <div key={category}>
                <h2 className="text-2xl font-semibold mb-4">{category}</h2>
                <div className="space-y-3">
                  {items.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                      >
                        <h3 className="text-left font-medium">{item.question}</h3>
                        {expandedId === item.id ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-4" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-4" />
                        )}
                      </button>
                      {expandedId === item.id && (
                        <div className="px-4 pb-4 border-t bg-muted/30">
                          <p className="text-muted-foreground whitespace-pre-wrap pt-4">
                            {item.answer}
                          </p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
