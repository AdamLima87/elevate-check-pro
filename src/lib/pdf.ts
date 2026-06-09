import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { checklistSections } from "./checklist-data";
import { calcularPercentual, classificacao, type Inspecao } from "./storage";

export async function gerarPDF(insp: Inspecao) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const score = calcularPercentual(insp.respostas);
  const cls = classificacao(score.percentual);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Cores
  const colorElevare = [26, 77, 46]; // #1a4d2e
  const colorGrey = [245, 245, 245]; // #f5f5f5
  const colorRedBg = [252, 235, 235]; // #FCEBEB
  const colorRedText = [163, 45, 45]; // #A32D2D
  const colorYellowBg = [254, 252, 232];
  const colorGreenBg = [234, 243, 222];

  // Layout de página (cabeçalho + rodapé)
  const addLayoutElements = (pageDoc: jsPDF, pageIndex: number, totalPages: number) => {
    pageDoc.setPage(pageIndex);
    
    // Faixa colorida no topo
    pageDoc.setFillColor(26, 77, 46);
    pageDoc.rect(0, 0, pageWidth, 8, "F");

    // Rodapé
    pageDoc.setDrawColor(26, 77, 46);
    pageDoc.setLineWidth(0.5);
    pageDoc.line(40, pageHeight - 40, pageWidth - 40, pageHeight - 40);

    pageDoc.setFontSize(8);
    pageDoc.setTextColor(100, 100, 100);
    pageDoc.setFont("helvetica", "normal");
    pageDoc.text("Elevare Consultoria · elevareconsultoria.com · (11) 99484-0948", 40, pageHeight - 25);
    pageDoc.text(`Página ${pageIndex} de ${totalPages}`, pageWidth - 40, pageHeight - 25, { align: "right" });
  };

  // Cabeçalho Principal (apenas primeira página)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(50, 50, 50);
  doc.text("Relatório de Inspeção", pageWidth - 40, 45, { align: "right" });
  
  // Dados do Estabelecimento
  const e = insp.dados.estabelecimento;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(26, 77, 46);
  doc.text("DADOS DO ESTABELECIMENTO", 40, 70);
  doc.line(40, 75, pageWidth - 40, 75);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);

  const leftCol = [
    `Razão Social: ${e.razaoSocial || "-"}`,
    `Nome Fantasia: ${e.nomeFantasia || "-"}`,
    `CNPJ: ${e.cnpj || "-"}`,
    `Atividade: ${e.atividade || "-"}`,
  ];
  const rightCol = [
    `Endereço: ${e.endereco || "-"}`,
    `Bairro: ${e.bairro || "-"}`,
    `Responsável Legal: ${e.respLegalNome || "-"}`,
    `Data da Inspeção: ${e.dataHora ? new Date(e.dataHora).toLocaleDateString("pt-BR") : "-"}`,
  ];

  let y = 90;
  leftCol.forEach((line, i) => { doc.text(line, 40, y + (i * 15)); });
  rightCol.forEach((line, i) => { doc.text(line, pageWidth / 2, y + (i * 15)); });
  
  y += (leftCol.length * 15) + 20;

  // Bloco de Resumo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(26, 77, 46);
  doc.text("RESUMO DA AVALIAÇÃO", 40, y);
  y += 15;

  // Cards de Métricas
  const cardW = (pageWidth - 100) / 3;
  const drawCard = (x: number, title: string, value: number, bgColor: number[]) => {
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.roundedRect(x, y, cardW, 40, 3, 3, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(title, x + cardW/2, y + 15, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(26, 77, 46);
    doc.text(String(value), x + cardW/2, y + 32, { align: "center" });
  };
  drawCard(40, "CONFORMES", score.sim, [234, 243, 222]);
  drawCard(40 + cardW + 10, "NÃO CONFORMES", score.nao, [252, 235, 235]);
  drawCard(40 + (cardW + 10) * 2, "N/A", score.na, [245, 245, 245]);

  y += 55;
  
  // Percentual
  doc.setFontSize(32);
  doc.setTextColor(26, 77, 46);
  doc.text(`${score.percentual.toFixed(1)}%`, 40, y + 15);
  
  const badgeColor = cls.tone === "success" ? [26, 77, 46] : cls.tone === "warning" ? [234, 179, 8] : [185, 28, 28];
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(120, y - 5, 80, 20, 3, 3, "F");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(cls.label, 160, y + 8, { align: "center" });

  // Barra de progresso geral
  const barW = pageWidth - 80;
  doc.setFillColor(220, 220, 220);
  doc.rect(40, y + 30, barW, 6, "F");
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.rect(40, y + 30, (barW * score.percentual) / 100, 6, "F");

  y += 60;

  // Tabela de Seções
  const sectionRows = checklistSections.map((sec) => {
    const itens = sec.items.map((i) => insp.respostas[i.id]);
    const s = itens.filter((r) => r === "S").length;
    const n = itens.filter((r) => r === "N").length;
    const na = itens.filter((r) => r === "NA").length;
    const aplic = s + n;
    const val = aplic === 0 ? 0 : (s / aplic) * 100;
    const pct = aplic === 0 ? "-" : `${val.toFixed(0)}%`;
    return [sec.title, String(s), String(n), String(na), pct, ""];
  });

  autoTable(doc, {
    startY: y,
    head: [["Seção", "S", "N", "NA", "%", "Progresso"]],
    body: sectionRows,
    headStyles: { fillColor: [26, 77, 46], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    styles: { fontSize: 8, cellPadding: 6 },
    columnStyles: { 4: { fontStyle: 'bold', halign: 'center' }, 5: { cellWidth: 100 } },
    didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
            const valStr = data.cell.raw as string;
            if (valStr !== "-") {
                const val = parseInt(valStr);
                if (val >= 76) doc.setTextColor(26, 77, 46);
                else if (val >= 51) doc.setTextColor(180, 140, 0);
                else doc.setTextColor(185, 28, 28);
            }
        }
        if (data.section === 'body' && data.column.index === 5) {
            const valStr = data.row.cells[4].raw as string;
            if (valStr !== "-") {
                const val = parseInt(valStr);
                const bX = data.cell.x + 5, bY = data.cell.y + (data.cell.height / 2) - 2;
                doc.setFillColor(230, 230, 230);
                doc.rect(bX, bY, data.cell.width - 10, 4, "F");
                let bColor = val >= 76 ? [26, 77, 46] : val >= 51 ? [234, 179, 8] : [185, 28, 28];
                doc.setFillColor(bColor[0], bColor[1], bColor[2]);
                doc.rect(bX, bY, ((data.cell.width - 10) * val) / 100, 4, "F");
            }
        }
    }
  });

  // Tabela de NCs
  const ncRows = checklistSections.flatMap((sec) => 
    sec.items.filter((it) => insp.respostas[it.id] === "N").map((it) => [it.id, sec.title, it.text])
  );

  if (ncRows.length) {
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(26, 77, 46);
    doc.text("NÃO CONFORMIDADES", 40, 30);
    autoTable(doc, {
      startY: 40,
      head: [["Item", "Seção", "Descrição"]],
      body: ncRows,
      headStyles: { fillColor: [26, 77, 46], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: { 0: { fillColor: [252, 235, 235], textColor: [163, 45, 45], fontStyle: 'bold', halign: 'center' } }
    });
  }

  // Observações e Assinatura (última página)
  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.text("OBSERVAÇÕES DO CONSULTOR", 40, 30);
  doc.setDrawColor(200);
  doc.setLineDashPattern([2, 2]);
  doc.rect(40, 40, pageWidth - 80, 100);
  doc.setLineDashPattern([]);

  const fY = 200;
  doc.setLineWidth(0.5);
  doc.line(40, fY, 250, fY);
  doc.text("Assinatura do Consultor", 40, fY + 15);
  doc.line(350, fY, pageWidth - 40, fY);
  doc.text("Carimbo", 350, fY + 15);
  
  doc.setFont("helvetica", "normal");
  doc.text(`${e.respTecNome || ""}`, 40, fY + 30);
  doc.text(`${new Date().toLocaleDateString("pt-BR")}`, pageWidth - 40, fY + 30, { align: "right" });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) addLayoutElements(doc, i, totalPages);

  doc.save(`Relatorio_Elevare_${insp.estabelecimento.replace(/\s+/g, "_")}.pdf`);
}
