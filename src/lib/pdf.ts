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

  // Adiciona rodapé e barra de topo em todas as páginas (será feito ao final com um loop)
  const addLayoutElements = (pageDoc: jsPDF, pageIndex: number, totalPages: number) => {
    pageDoc.setPage(pageIndex);
    
    // Faixa colorida no topo (8px)
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

  // Carregar Logo
  const logoUrl = "https://www.elevareconsultoria.com/assets/logo-BuPDZoNv.png";
  let logoData = "";
  try {
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    logoData = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Não foi possível carregar o logo para o PDF", error);
  }

  // Header Content
  let y = 45;
  if (logoData) {
    doc.addImage(logoData, "PNG", 40, 20, 100, 40, undefined, 'FAST');
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(26, 77, 46);
    doc.text("ELEVARE", 40, 45);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(50, 50, 50);
  doc.text("Relatório de Inspeção", pageWidth - 40, 45, { align: "right" });
  
  y = 85;

  // Dados do Estabelecimento
  const e = insp.dados.estabelecimento;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(26, 77, 46);
  doc.text("DADOS DO ESTABELECIMENTO", 40, y);
  y += 15;

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

  let tempY = y;
  leftCol.forEach(line => {
    doc.text(line, 40, tempY);
    tempY += 13;
  });
  tempY = y;
  rightCol.forEach(line => {
    doc.text(line, pageWidth / 2, tempY);
    tempY += 13;
  });
  y = Math.max(y + (leftCol.length * 13), tempY) + 20;

  // Bloco de Resumo Visual
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(40, y, pageWidth - 80, 85, 4, 4, "F");
  
  // Percentual Grande
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(26, 77, 46);
  doc.text(`${score.percentual.toFixed(1)}%`, 60, y + 45);
  
  // Badge de Classificação
  const tone = cls.tone === "success" ? [26, 77, 46] : cls.tone === "warning" ? [234, 179, 8] : [185, 28, 28];
  doc.setFillColor(tone[0], tone[1], tone[2]);
  doc.roundedRect(60, y + 55, 80, 18, 2, 2, "F");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(cls.label, 100, y + 67, { align: "center" });

  // Métricas Lado a Lado
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "bold");
  doc.text("Conformes", 200, y + 30);
  doc.text("Não conformes", 300, y + 30);
  doc.text("NA", 420, y + 30);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(26, 77, 46);
  doc.text(String(score.sim), 200, y + 50);
  doc.setTextColor(185, 28, 28);
  doc.text(String(score.nao), 300, y + 50);
  doc.setTextColor(120, 120, 120);
  doc.text(String(score.na), 420, y + 50);

  // Barra de Progresso
  const barWidth = pageWidth - 120;
  doc.setFillColor(220, 220, 220);
  doc.roundedRect(60, y + 75, barWidth, 4, 2, 2, "F");
  doc.setFillColor(tone[0], tone[1], tone[2]);
  doc.roundedRect(60, y + 75, (barWidth * score.percentual) / 100, 4, 2, 2, "F");

  y += 110;

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
    headStyles: { fillColor: [26, 77, 46], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    styles: { fontSize: 8, cellPadding: 5, valign: 'middle' },
    columnStyles: {
      4: { fontStyle: 'bold', halign: 'center' },
      5: { cellWidth: 80 }
    },
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
          const barX = data.cell.x + 5;
          const barY = data.cell.y + (data.cell.height / 2) - 2;
          const fullW = data.cell.width - 10;
          
          doc.setFillColor(230, 230, 230);
          doc.rect(barX, barY, fullW, 4, "F");
          
          let bColor = [185, 28, 28];
          if (val >= 76) bColor = [26, 77, 46];
          else if (val >= 51) bColor = [234, 179, 8];
          
          doc.setFillColor(bColor[0], bColor[1], bColor[2]);
          doc.rect(barX, barY, (fullW * val) / 100, 4, "F");
        }
      }
    },
    margin: { left: 40, right: 40 },
  });

  // Não conformidades
  const ncRows: string[][] = [];
  checklistSections.forEach((sec) => {
    sec.items.forEach((it) => {
      if (insp.respostas[it.id] === "N") ncRows.push([it.id, sec.title, it.text]);
    });
  });

  if (ncRows.length) {
    const lastY = (doc as any).lastAutoTable?.finalY ?? y;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(26, 77, 46);
    doc.text("NÃO CONFORMIDADES IDENTIFICADAS", 40, lastY + 25);

    autoTable(doc, {
      startY: lastY + 35,
      head: [["Item", "Seção", "Descrição da Não Conformidade"]],
      body: ncRows,
      headStyles: { fillColor: [26, 77, 46], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      styles: { fontSize: 8, cellPadding: 8, overflow: 'ellipsize', cellWidth: 'auto' },
      columnStyles: { 
        0: { fillColor: [252, 235, 235], textColor: [163, 45, 45], fontStyle: 'bold', cellWidth: 35, halign: 'center' }, 
        1: { cellWidth: 100 },
        2: { cellWidth: 'auto' }
      },
      margin: { left: 40, right: 40 },
      didParseCell: (data) => {
        if (data.column.index === 2 && data.section === 'body') {
          // Garante que o texto quebra corretamente e não ultrapassa muito o espaço
          // @ts-ignore - maxLines exist em run-time para overflow: ellipsize mas não no tipo Styles
          data.cell.styles.maxLines = 2;
        }
      }
    });
  }

  // Observações e Assinatura
  let finalY = (doc as any).lastAutoTable?.finalY + 40;
  if (finalY > pageHeight - 150) {
    doc.addPage();
    finalY = 50;
  }

  // Observações
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(26, 77, 46);
  doc.text("OBSERVAÇÕES DO CONSULTOR", 40, finalY);
  finalY += 15;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  
  // Como não temos um campo específico "observações" na interface Inspecao ainda, 
  // simulamos a lógica pedida. Se existir no futuro, será puxado daqui.
  const obs = (insp as any).observacoes || "";
  if (obs) {
    const splitObs = doc.splitTextToSize(obs, pageWidth - 80);
    doc.text(splitObs, 40, finalY);
    finalY += (splitObs.length * 12) + 40;
  } else {
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(40, finalY + 10, pageWidth - 40, finalY + 10);
    doc.setLineDashPattern([], 0);
    finalY += 60;
  }

  if (finalY > pageHeight - 120) {
    doc.addPage();
    finalY = 80;
  }

  // Assinatura
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 100, finalY + 40, pageWidth / 2 + 100, finalY + 40);
  
  doc.setFontSize(9);
  doc.text("Assinatura do Responsável Técnico", pageWidth / 2, finalY + 55, { align: "center" });
  
  doc.setFont("helvetica", "bold");
  const techName = e.respTecNome || "__________________________";
  const techReg = e.respTecConselho && e.respTecRegistro ? `${e.respTecConselho} ${e.respTecRegistro}` : "Conselho/Registro";
  doc.text(techName, pageWidth / 2, finalY + 70, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(techReg, pageWidth / 2, finalY + 82, { align: "center" });

  const dateStr = e.dataHora ? new Date(e.dataHora).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR");
  doc.text(`Data: ${dateStr}`, pageWidth / 2, finalY + 98, { align: "center" });

  // Finalização: Adiciona layout em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    addLayoutElements(doc, i, totalPages);
  }

  const filename = `Relatorio_Elevare_${(insp.estabelecimento || "inspecao").replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}

