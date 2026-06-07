import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { checklistSections } from "./checklist-data";
import { calcularPercentual, classificacao, type Inspecao } from "./storage";

export function gerarPDF(insp: Inspecao) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const score = calcularPercentual(insp.respostas);
  const cls = classificacao(score.percentual);
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(26, 58, 92);
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("ELEVARE CONSULTORIA", 40, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Segurança dos Alimentos · Diagnóstico Sanitário", 40, 48);
  doc.setFontSize(9);
  doc.text("Baseado nas RDC nº 275/2002 e RDC nº 216/2004 — ANVISA", 40, 62);

  doc.setTextColor(20, 20, 20);
  let y = 95;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Relatório de Inspeção", 40, y);
  y += 18;

  const e = insp.estabelecimento;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lines = [
    `Razão Social: ${e.razaoSocial}`,
    `Nome Fantasia: ${e.nomeFantasia}`,
    `Atividade: ${e.atividade}    CNPJ: ${e.cnpj}`,
    `Endereço: ${e.endereco}  -  Bairro: ${e.bairro}`,
    `Resp. Legal: ${e.respLegalNome} (CPF ${e.respLegalCpf})`,
    `Resp. Técnico: ${e.respTecNome} (CPF ${e.respTecCpf}) - ${e.respTecConselho} ${e.respTecRegistro}`,
    `Data/Hora: ${e.dataHora ? new Date(e.dataHora).toLocaleString("pt-BR") : ""}`,
  ];
  lines.forEach((l) => {
    doc.text(l, 40, y);
    y += 14;
  });

  // Score box
  y += 8;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(40, y, pageWidth - 80, 60, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(`${score.percentual.toFixed(1)}%`, 60, y + 38);
  doc.setFontSize(12);
  doc.text(`${cls.label}`, 160, y + 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Conformes: ${score.sim}   Não conformes: ${score.nao}   NA: ${score.na}`, 160, y + 50);
  y += 80;

  // Tabela por seção
  const sectionRows = checklistSections.map((sec) => {
    const itens = sec.items.map((i) => insp.respostas[i.id]);
    const s = itens.filter((r) => r === "S").length;
    const n = itens.filter((r) => r === "N").length;
    const na = itens.filter((r) => r === "NA").length;
    const aplic = s + n;
    const pct = aplic === 0 ? "-" : `${((s / aplic) * 100).toFixed(0)}%`;
    return [sec.title, String(s), String(n), String(na), pct];
  });

  autoTable(doc, {
    startY: y,
    head: [["Seção", "S", "N", "NA", "%"]],
    body: sectionRows,
    headStyles: { fillColor: [26, 58, 92], textColor: 255 },
    styles: { fontSize: 9 },
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
    const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    autoTable(doc, {
      startY: lastY + 16,
      head: [["Item", "Seção", "Não Conformidade"]],
      body: ncRows,
      headStyles: { fillColor: [200, 50, 50], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 4 },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 110 } },
      margin: { left: 40, right: 40 },
    });
  }

  // Fotos
  const fotosExistentes: { item: string; url: string }[] = [];
  Object.entries(insp.fotos || {}).forEach(([itemId, urls]) => {
    urls.forEach((url) => fotosExistentes.push({ item: itemId, url }));
  });

  if (fotosExistentes.length) {
    let lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    if (lastY > doc.internal.pageSize.getHeight() - 150) {
      doc.addPage();
      lastY = 40;
    } else {
      lastY += 30;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Anexo Fotográfico", 40, lastY);
    lastY += 20;

    let xPos = 40;
    const imgWidth = 160;
    const imgHeight = 120;
    const spacing = 15;

    fotosExistentes.forEach((foto, idx) => {
      if (lastY > doc.internal.pageSize.getHeight() - imgHeight - 40) {
        doc.addPage();
        lastY = 40;
        xPos = 40;
      }

      try {
        doc.addImage(foto.url, "JPEG", xPos, lastY, imgWidth, imgHeight);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const secao = checklistSections.find((s) => s.id === foto.item);
        doc.text(`Tópico: ${secao?.title || foto.item}`, xPos, lastY + imgHeight + 10);
      } catch (e) {
        console.warn("Erro ao adicionar imagem ao PDF", e);
      }

      xPos += imgWidth + spacing;
      if (xPos + imgWidth > pageWidth - 40) {
        xPos = 40;
        lastY += imgHeight + 35;
      }
    });
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Elevare Consultoria · Página ${i} de ${pages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" },
    );
  }

  const filename = `inspecao-${(insp.estabelecimento.nomeFantasia || "elevare").replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}
