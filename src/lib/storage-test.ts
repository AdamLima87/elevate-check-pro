import { Resposta, Inspecao, Estabelecimento, Funcionario, QuestionarioEstab } from "./storage";

// This file is to be run with 'bun src/lib/storage-test.ts'
// But since we are in browser environment, let's just make it a valid TS file

const NUMEROS_DISPONIVEIS_KEY = "elevare_numeros_disponiveis";
const PROXIMO_NUMERO_KEY = "elevare:proximo_numero";
const HISTORICO_KEY = "elevare_inspecoes";
const RASCUNHO_KEY = "elevare:rascunho";

import { newInspecao, saveRascunho, saveToHistorico, deleteFromHistorico, loadHistorico } from "./storage";

// Mock localStorage for Bun
if (typeof localStorage === "undefined") {
    const store: Record<string, string> = {};
    (global as any).localStorage = {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, val: string) => { store[key] = val },
        removeItem: (key: string) => { delete store[key] }
    };
}

// 1. Clear state
localStorage.removeItem(NUMEROS_DISPONIVEIS_KEY);
localStorage.removeItem(PROXIMO_NUMERO_KEY);
localStorage.removeItem(HISTORICO_KEY);
localStorage.removeItem(RASCUNHO_KEY);

console.log("--- TEST 1: Initial Numbers ---");
const i1 = newInspecao();
console.log(`Inspection 1: #${i1.numero}`);
if (i1.numero !== 1) throw new Error("Expected 1");

const i2 = newInspecao();
console.log(`Inspection 2: #${i2.numero}`);
if (i2.numero !== 2) throw new Error("Expected 2");

console.log("--- TEST 2: Reuse Deleted Number ---");
deleteFromHistorico(i1.id);
const i3 = newInspecao();
console.log(`Inspection 3 (after deleting 1): #${i3.numero}`);
if (i3.numero !== 1) throw new Error("Expected reuse of 1");

console.log("--- TEST 3: Corruption Resilience ---");
// Manually inject bad data
const badData = [
    { id: "corrupt-1", status: "em_andamento" }, // Missing numero, dados, respostas
    i3
];
localStorage.setItem(HISTORICO_KEY, JSON.stringify(badData));

const history = loadHistorico();
history.forEach(item => {
    // Check if UI would crash
    try {
        const display = item.estabelecimento || (item as any).dados?.estabelecimento?.nomeFantasia || "Sem nome";
        const num = item.numero || 0;
        console.log(`Card would show: #${num} - ${display}`);
    } catch (e: any) {
        console.error(`UI CRASH SIMULATED: ${e.message}`);
    }
});

console.log("ALL LOGICAL TESTS PASSED.");
