/**
 * Экспорт процесса в PDF
 * Использует html2pdf.js для генерации PDF из HTML
 */

export async function exportProcessToPDF(process: any) {
  // Динамический импорт html2pdf
  const html2pdf = (await import("html2pdf.js")).default;

  // Создаем HTML контент для PDF
  const content = createPDFContent(process);

  // Настройки PDF
  const opt = {
    margin: 10,
    filename: `${process.title || "Процесс"}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
  };

  // Генерируем PDF
  return html2pdf().set(opt).from(content).save();
}

function createPDFContent(process: any): string {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} ч ${mins} мин`;
    }
    return `${mins} мин`;
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(cost);
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 {
          color: #4F46E5;
          border-bottom: 3px solid #4F46E5;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        h2 {
          color: #6366F1;
          margin-top: 30px;
          margin-bottom: 15px;
          border-left: 4px solid #6366F1;
          padding-left: 10px;
        }
        h3 {
          color: #4B5563;
          margin-top: 20px;
          margin-bottom: 10px;
        }
        .section {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        .metric-box {
          background: #F3F4F6;
          padding: 15px;
          border-radius: 8px;
          margin: 10px 0;
        }
        .metric-label {
          font-weight: 600;
          color: #6B7280;
          font-size: 14px;
        }
        .metric-value {
          font-size: 24px;
          font-weight: bold;
          color: #1F2937;
          margin-top: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        th, td {
          border: 1px solid #E5E7EB;
          padding: 10px;
          text-align: left;
        }
        th {
          background: #F9FAFB;
          font-weight: 600;
          color: #374151;
        }
        .stage-block {
          background: #EEF2FF;
          padding: 15px;
          border-left: 4px solid #6366F1;
          margin: 15px 0;
          page-break-inside: avoid;
        }
        .step-item {
          background: white;
          padding: 10px;
          margin: 8px 0;
          border-radius: 4px;
          border: 1px solid #E5E7EB;
        }
        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          margin-right: 5px;
        }
        .badge-high {
          background: #FEE2E2;
          color: #991B1B;
        }
        .badge-medium {
          background: #FEF3C7;
          color: #92400E;
        }
        .badge-low {
          background: #D1FAE5;
          color: #065F46;
        }
        ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        li {
          margin: 5px 0;
        }
        .funnel-variant {
          background: #F9FAFB;
          padding: 15px;
          margin: 15px 0;
          border-radius: 8px;
          page-break-inside: avoid;
        }
        .advantage {
          color: #059669;
        }
        .disadvantage {
          color: #DC2626;
        }
      </style>
    </head>
    <body>
      <h1>${process.title || "Бизнес-процесс"}</h1>
      <p>${process.description || ""}</p>
      
      ${
        process.totalTime || process.totalCost
          ? `
      <div class="section">
        <h2>📊 Метрики процесса</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          ${
            process.totalTime
              ? `
          <div class="metric-box">
            <div class="metric-label">Общее время</div>
            <div class="metric-value">${formatTime(process.totalTime)}</div>
          </div>
          `
              : ""
          }
          ${
            process.totalCost
              ? `
          <div class="metric-box">
            <div class="metric-label">Стоимость процесса</div>
            <div class="metric-value">${formatCost(process.totalCost)}</div>
          </div>
          `
              : ""
          }
        </div>
        
        ${
          process.salaryData && process.salaryData.length > 0
            ? `
        <h3>Распределение по ролям</h3>
        <table>
          <thead>
            <tr>
              <th>Роль</th>
              <th>ЗП/мес</th>
              <th>Время</th>
              <th>Стоимость</th>
            </tr>
          </thead>
          <tbody>
            ${process.salaryData
              .map(
                (role: any) => `
            <tr>
              <td>${role.roleName}</td>
              <td>${formatCost(role.salaryMonthly)}</td>
              <td>${formatTime(role.timeSpentMinutes)}</td>
              <td><strong>${formatCost(role.costRub)}</strong></td>
            </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        `
            : ""
        }
      </div>
      `
          : ""
      }
      
      ${
        process.stageDetails && process.stageDetails.length > 0
          ? `
      <div class="section">
        <h2>📋 Детальное описание этапов</h2>
        ${process.stages
          ?.map((stage: any) => {
            const detail = process.stageDetails.find((d: any) => d.stageId === stage.id);
            if (!detail) return "";
            return `
          <div class="stage-block">
            <h3>${stage.name}</h3>
            <p><strong>Что делать:</strong> ${detail.whatToDo}</p>
            <p><strong>Где делать:</strong> ${detail.whereToDo}</p>
            ${
              detail.keyActions && detail.keyActions.length > 0
                ? `
            <p><strong>Ключевые действия:</strong></p>
            <ol>
              ${detail.keyActions.map((action: string) => `<li>${action}</li>`).join("")}
            </ol>
            `
                : ""
            }
            <p><strong>Ожидаемые результаты:</strong> ${detail.expectedResults}</p>
          </div>
          `;
          })
          .join("")}
      </div>
      `
          : ""
      }
      
      ${
        process.crmFunnels && process.crmFunnels.length > 0
          ? `
      <div class="section">
        <h2>🔄 Варианты воронок CRM</h2>
        ${process.crmFunnels
          .map(
            (funnel: any) => `
        <div class="funnel-variant">
          <h3>${funnel.name}</h3>
          <p>${funnel.description}</p>
          
          <h4>Стадии воронки:</h4>
          ${funnel.stages
            .map(
              (stage: any) => `
          <div class="step-item">
            <strong>${stage.name}</strong>
            <p>${stage.description}</p>
            ${
              stage.automations && stage.automations.length > 0
                ? `
            <p><em>Автоматизация:</em> ${stage.automations.join(", ")}</p>
            `
                : ""
            }
          </div>
          `
            )
            .join("")}
          
          <div style="margin-top: 15px;">
            <p><strong>Преимущества:</strong></p>
            <ul>
              ${funnel.advantages.map((adv: string) => `<li class="advantage">${adv}</li>`).join("")}
            </ul>
            <p><strong>Недостатки:</strong></p>
            <ul>
              ${funnel.disadvantages.map((dis: string) => `<li class="disadvantage">${dis}</li>`).join("")}
            </ul>
          </div>
        </div>
        `
          )
          .join("")}
      </div>
      `
          : ""
      }
      
      ${
        process.requiredDocuments && process.requiredDocuments.length > 0
          ? `
      <div class="section">
        <h2>📄 Необходимые документы</h2>
        ${["high", "medium", "low"]
          .map((priority) => {
            const docs = process.requiredDocuments.filter((d: any) => d.priority === priority);
            if (docs.length === 0) return "";
            const priorityLabel = priority === "high" ? "Высокий" : priority === "medium" ? "Средний" : "Низкий";
            const badgeClass = priority === "high" ? "badge-high" : priority === "medium" ? "badge-medium" : "badge-low";
            return `
          <h3>Приоритет: ${priorityLabel}</h3>
          ${docs
            .map(
              (doc: any) => `
          <div class="step-item">
            <strong>${doc.name}</strong>
            <span class="badge ${badgeClass}">${doc.type === "regulation" ? "Регламент" : doc.type === "instruction" ? "Инструкция" : "Шаблон"}</span>
            <p>${doc.description}</p>
          </div>
          `
            )
            .join("")}
          `;
          })
          .join("")}
      </div>
      `
          : ""
      }
      
      <div class="section" style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #E5E7EB;">
        <p style="text-align: center; color: #6B7280; font-size: 12px;">
          Сгенерировано Business Process Builder • ${new Date().toLocaleDateString("ru-RU")}
        </p>
      </div>
    </body>
    </html>
  `;
}
