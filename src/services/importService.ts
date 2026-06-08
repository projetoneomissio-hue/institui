import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { unmaskCPF, validateCPF } from "@/utils/cpf";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImportRow {
  // Identificação
  nome_completo: string;
  data_nascimento: string;
  cpf?: string;
  rg?: string;
  sexo?: string;
  // Endereço / Escola
  bairro?: string;
  endereco?: string;
  escola?: string;
  serie_ano?: string;
  // Responsável
  responsavel_nome: string;
  responsavel_email: string;
  responsavel_telefone?: string;
  grau_parentesco?: string;
  // Saúde
  tipo_sanguineo?: string;
  alergias?: string;
  medicamentos?: string;
  doenca_cronica?: string;
  necessidade_especial?: string; // "S" | "N"
  necessidade_descricao?: string;
  necessidade_cid?: string;
  necessidade_laudo?: string; // "S" | "N"
  // Extras livres
  [key: string]: string | undefined;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ParsedImport {
  rows: ImportRow[];
  errors: ValidationError[];
}

export interface ImportSummary {
  total: number;
  alunosCriados: number;
  responsaveisNovos: number;   // convite enviado
  responsaveisVinculados: number; // já existia no sistema
  erros: { row: number; nome: string; motivo: string }[];
}

// ---------------------------------------------------------------------------
// Template generation
// ---------------------------------------------------------------------------

const TEMPLATE_HEADERS: { key: keyof ImportRow; label: string }[] = [
  { key: "nome_completo",          label: "nome_completo *" },
  { key: "data_nascimento",        label: "data_nascimento * (DD/MM/AAAA)" },
  { key: "cpf",                    label: "cpf (somente números)" },
  { key: "rg",                     label: "rg" },
  { key: "sexo",                   label: "sexo (M/F)" },
  { key: "bairro",                 label: "bairro" },
  { key: "endereco",               label: "endereco" },
  { key: "escola",                 label: "escola" },
  { key: "serie_ano",              label: "serie_ano (ex: 5º ano)" },
  { key: "responsavel_nome",       label: "responsavel_nome *" },
  { key: "responsavel_email",      label: "responsavel_email *" },
  { key: "responsavel_telefone",   label: "responsavel_telefone" },
  { key: "grau_parentesco",        label: "grau_parentesco (ex: Mãe, Pai)" },
  { key: "tipo_sanguineo",         label: "tipo_sanguineo (ex: A+)" },
  { key: "alergias",               label: "alergias (ex: Amendoim, Lactose)" },
  { key: "medicamentos",           label: "medicamentos em uso" },
  { key: "doenca_cronica",         label: "doenca_cronica (ex: Asma)" },
  { key: "necessidade_especial",   label: "necessidade_especial (S/N)" },
  { key: "necessidade_descricao",  label: "necessidade_descricao (preencher se S)" },
  { key: "necessidade_cid",        label: "necessidade_cid (ex: F90.0)" },
  { key: "necessidade_laudo",      label: "necessidade_laudo (S/N)" },
];

const EXAMPLE_ROW: Record<string, string> = {
  "nome_completo *": "Maria da Silva",
  "data_nascimento * (DD/MM/AAAA)": "15/03/2015",
  "cpf (somente números)": "12345678900",
  "rg": "9.999.999-9",
  "sexo (M/F)": "F",
  "bairro": "Centro",
  "endereco": "Rua das Flores, 10, Apto 2",
  "escola": "E.M. João Paulo II",
  "serie_ano (ex: 5º ano)": "5º ano",
  "responsavel_nome *": "João da Silva",
  "responsavel_email *": "joao@email.com",
  "responsavel_telefone": "(41) 99999-8888",
  "grau_parentesco (ex: Mãe, Pai)": "Pai",
  "tipo_sanguineo (ex: A+)": "A+",
  "alergias (ex: Amendoim, Lactose)": "Amendoim",
  "medicamentos em uso": "Ritalina 10mg",
  "doenca_cronica (ex: Asma)": "Asma",
  "necessidade_especial (S/N)": "S",
  "necessidade_descricao (preencher se S)": "TDAH — dificuldade de concentração. Sentar na frente.",
  "necessidade_cid (ex: F90.0)": "F90.0",
  "necessidade_laudo (S/N)": "S",
};

const INSTRUCTIONS = [
  ["INSTRUÇÕES DE PREENCHIMENTO"],
  [],
  ["Campos obrigatórios", "nome_completo, data_nascimento, responsavel_nome, responsavel_email"],
  [],
  ["CAMPO", "DESCRIÇÃO"],
  ["nome_completo", "Nome completo do aluno"],
  ["data_nascimento", "Formato DD/MM/AAAA — ex: 15/03/2015"],
  ["cpf", "Somente números, sem pontos ou traços — ex: 12345678900"],
  ["sexo", "M para masculino, F para feminino"],
  ["responsavel_email", "Email do responsável. Se já tiver conta no sistema, o aluno será vinculado automaticamente. Caso contrário, um convite será enviado."],
  ["necessidade_especial", "S para Sim, N para Não"],
  ["necessidade_descricao", "Preencha somente se necessidade_especial = S. Descreva diagnóstico e como a equipe deve agir."],
  ["necessidade_laudo", "S se o responsável possui laudo médico. O upload do arquivo é feito no perfil do aluno após a importação."],
  [],
  ["IMPORTANTE"],
  ["• Não altere os cabeçalhos da aba 'alunos'"],
  ["• Colunas extras ao final serão importadas como dados adicionais"],
  ["• CPFs duplicados serão ignorados (aluno já existe)"],
  ["• A primeira linha de dados é apenas um exemplo — apague-a antes de importar"],
];

export function generateTemplate(): void {
  const wb = XLSX.utils.book_new();

  // Aba 1: alunos
  const headers = TEMPLATE_HEADERS.map((h) => h.label);
  const ws = XLSX.utils.aoa_to_sheet([headers, headers.map((h) => EXAMPLE_ROW[h] ?? "")]);

  // Largura automática das colunas
  ws["!cols"] = headers.map(() => ({ wch: 30 }));

  XLSX.utils.book_append_sheet(wb, ws, "alunos");

  // Aba 2: instrucoes
  const wsInstr = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
  wsInstr["!cols"] = [{ wch: 28 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, "instrucoes");

  XLSX.writeFile(wb, "template_importacao_alunos.xlsx");
}

// ---------------------------------------------------------------------------
// Parsing & Validation
// ---------------------------------------------------------------------------

function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();

  // DD/MM/AAAA
  const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // YYYY-MM-DD (já no formato certo)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Excel serial number
  const serial = Number(s);
  if (!isNaN(serial) && serial > 1000) {
    const date = XLSX.SSF.parse_date_code(serial);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
  }

  return null;
}

function normalizeHeader(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s*\*.*$/, "")       // remove "* ..." do final
    .replace(/\s*\(.*?\)/g, "")    // remove "(...)"
    .trim()
    .replace(/\s+/g, "_");
}

export function parseFile(file: File): Promise<ParsedImport> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: false });

        // Procura aba "alunos" ou usa a primeira
        const sheetName = wb.SheetNames.find((n) => n.toLowerCase() === "alunos") ?? wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const raw: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (raw.length === 0) {
          return resolve({ rows: [], errors: [{ row: 0, field: "arquivo", message: "Planilha vazia ou sem dados." }] });
        }

        // Normaliza cabeçalhos
        const normalized = raw.map((r) => {
          const out: Record<string, string> = {};
          for (const [k, v] of Object.entries(r)) {
            out[normalizeHeader(k)] = String(v).trim();
          }
          return out;
        });

        const errors: ValidationError[] = [];
        const rows: ImportRow[] = [];

        normalized.forEach((r, i) => {
          const rowNum = i + 2; // linha 1 = cabeçalho
          const rowErrors: ValidationError[] = [];

          // Obrigatórios
          if (!r.nome_completo) rowErrors.push({ row: rowNum, field: "nome_completo", message: "Campo obrigatório." });
          if (!r.data_nascimento) rowErrors.push({ row: rowNum, field: "data_nascimento", message: "Campo obrigatório." });
          if (!r.responsavel_nome) rowErrors.push({ row: rowNum, field: "responsavel_nome", message: "Campo obrigatório." });
          if (!r.responsavel_email) rowErrors.push({ row: rowNum, field: "responsavel_email", message: "Campo obrigatório." });

          // Validações de formato
          const dateStr = parseDate(r.data_nascimento);
          if (r.data_nascimento && !dateStr) {
            rowErrors.push({ row: rowNum, field: "data_nascimento", message: `Formato inválido: "${r.data_nascimento}". Use DD/MM/AAAA.` });
          }

          if (r.responsavel_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.responsavel_email)) {
            rowErrors.push({ row: rowNum, field: "responsavel_email", message: "Email inválido." });
          }

          const cpfRaw = r.cpf ? unmaskCPF(r.cpf) : "";
          if (cpfRaw && (cpfRaw.length !== 11 || !validateCPF(cpfRaw))) {
            rowErrors.push({ row: rowNum, field: "cpf", message: `CPF inválido: "${r.cpf}".` });
          }

          errors.push(...rowErrors);
          if (rowErrors.length === 0) {
            rows.push({
              ...r,
              data_nascimento: dateStr ?? r.data_nascimento,
              cpf: cpfRaw || undefined,
            } as ImportRow);
          }
        });

        resolve({ rows, errors });
      } catch (err) {
        reject(new Error("Não foi possível ler o arquivo. Verifique se é um .xlsx ou .csv válido."));
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo."));
    reader.readAsArrayBuffer(file);
  });
}

// ---------------------------------------------------------------------------
// Import execution
// ---------------------------------------------------------------------------

async function upsertResponsavel(
  email: string,
  nome: string,
  telefone?: string
): Promise<{ id: string; isNew: boolean }> {
  // Verifica se já existe profile com esse email
  const { data: existing } = await (supabase
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle() as any);

  if (existing) return { id: existing.id, isNew: false };

  // Envia convite pelo Supabase Auth (cria o usuário e dispara email)
  const { data: invited, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { nome_completo: nome, telefone: telefone ?? "" },
  });

  if (error || !invited?.user) {
    throw new Error(`Falha ao enviar convite para ${email}: ${error?.message}`);
  }

  return { id: invited.user.id, isNew: true };
}

export async function executeImport(rows: ImportRow[]): Promise<ImportSummary> {
  const summary: ImportSummary = {
    total: rows.length,
    alunosCriados: 0,
    responsaveisNovos: 0,
    responsaveisVinculados: 0,
    erros: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      // 1. Verifica CPF duplicado
      if (row.cpf) {
        const { data: dupAluno } = await supabase
          .from("alunos")
          .select("id")
          .eq("cpf", row.cpf)
          .maybeSingle();
        if (dupAluno) {
          summary.erros.push({ row: i + 2, nome: row.nome_completo, motivo: `CPF ${row.cpf} já cadastrado.` });
          continue;
        }
      }

      // 2. Cria ou localiza responsável
      const { id: responsavelId, isNew } = await upsertResponsavel(
        row.responsavel_email,
        row.responsavel_nome,
        row.responsavel_telefone
      );

      if (isNew) summary.responsaveisNovos++;
      else summary.responsaveisVinculados++;

      // 3. Coleta dados extras (colunas não mapeadas)
      const knownKeys = new Set(TEMPLATE_HEADERS.map((h) => h.key));
      const dadosExtras: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        if (!knownKeys.has(k as keyof ImportRow) && v) dadosExtras[k] = v;
      }

      // 4. Insere aluno
      const { data: novoAluno, error: alunoError } = await supabase
        .from("alunos")
        .insert({
          responsavel_id: responsavelId,
          nome_completo: row.nome_completo,
          data_nascimento: row.data_nascimento,
          cpf: row.cpf || null,
          rg: row.rg || null,
          telefone: row.responsavel_telefone || null,
          endereco: row.endereco || null,
          bairro: row.bairro || null,
          escola: row.escola || null,
          serie_ano: row.serie_ano || null,
          grau_parentesco: row.grau_parentesco || null,
          alergias: row.alergias || null,
          medicamentos: row.medicamentos || null,
          observacoes: Object.keys(dadosExtras).length ? JSON.stringify(dadosExtras) : null,
        } as any)
        .select("id")
        .single();

      if (alunoError || !novoAluno) throw new Error(alunoError?.message ?? "Erro ao criar aluno.");

      // 5. Insere anamnese (se houver dados de saúde)
      const temSaude =
        row.tipo_sanguineo ||
        row.doenca_cronica ||
        row.necessidade_especial?.toUpperCase() === "S";

      if (temSaude) {
        await supabase.from("anamneses").insert({
          aluno_id: novoAluno.id,
          tipo_sanguineo: row.tipo_sanguineo || null,
          alergias: row.alergias || null,
          medicamentos: row.medicamentos || null,
          doenca_cronica: row.doenca_cronica || null,
          is_pne: row.necessidade_especial?.toUpperCase() === "S",
          pne_descricao: row.necessidade_descricao || null,
          pne_cid: row.necessidade_cid || null,
          pne_laudo: row.necessidade_laudo?.toUpperCase() === "S",
        } as any);
      }

      summary.alunosCriados++;
    } catch (err: any) {
      summary.erros.push({ row: i + 2, nome: row.nome_completo, motivo: err.message ?? "Erro desconhecido." });
    }
  }

  return summary;
}

// ---------------------------------------------------------------------------
// Export error report
// ---------------------------------------------------------------------------

export function downloadErrorReport(erros: ImportSummary["erros"]): void {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(
    erros.map((e) => ({ Linha: e.row, Nome: e.nome, Motivo: e.motivo }))
  );
  ws["!cols"] = [{ wch: 8 }, { wch: 30 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws, "erros");
  XLSX.writeFile(wb, "erros_importacao.xlsx");
}

// ===========================================================================
// FASE B — Importação de Matrículas
// ===========================================================================

export interface MatriculaImportRow {
  cpf_aluno?: string;
  nome_aluno?: string;
  data_nascimento_aluno?: string;
  atividade?: string;
  turma: string;
  data_inicio: string;
  data_fim?: string;
  status?: string; // ativa | concluida | cancelada | pendente
}

export interface MatriculaImportSummary {
  total: number;
  matriculasCriadas: number;
  erros: { row: number; nome: string; motivo: string }[];
}

const MATRICULA_HEADERS: { key: keyof MatriculaImportRow; label: string }[] = [
  { key: "cpf_aluno",              label: "cpf_aluno (somente números)" },
  { key: "nome_aluno",             label: "nome_aluno (se não tiver CPF)" },
  { key: "data_nascimento_aluno",  label: "data_nascimento_aluno (DD/MM/AAAA)" },
  { key: "atividade",              label: "atividade (nome da atividade)" },
  { key: "turma",                  label: "turma * (nome exato da turma)" },
  { key: "data_inicio",            label: "data_inicio * (DD/MM/AAAA)" },
  { key: "data_fim",               label: "data_fim (DD/MM/AAAA — opcional)" },
  { key: "status",                 label: "status (ativa/concluida/cancelada/pendente)" },
];

const MATRICULA_EXAMPLE: Record<string, string> = {
  "cpf_aluno (somente números)": "12345678900",
  "nome_aluno (se não tiver CPF)": "Maria da Silva",
  "data_nascimento_aluno (DD/MM/AAAA)": "15/03/2015",
  "atividade (nome da atividade)": "Jiu-Jitsu",
  "turma * (nome exato da turma)": "Jiu-jitsu infantil 1 (4-7 anos)",
  "data_inicio * (DD/MM/AAAA)": "01/03/2025",
  "data_fim (DD/MM/AAAA — opcional)": "31/12/2025",
  "status (ativa/concluida/cancelada/pendente)": "ativa",
};

const MATRICULA_INSTRUCTIONS = [
  ["INSTRUÇÕES DE PREENCHIMENTO — MATRÍCULAS"],
  [],
  ["Campos obrigatórios", "turma, data_inicio"],
  ["Identificação do aluno", "cpf_aluno (preferencial) OU nome_aluno + data_nascimento_aluno"],
  [],
  ["CAMPO", "DESCRIÇÃO"],
  ["cpf_aluno", "CPF do aluno sem pontos/traços. Método mais confiável de identificação."],
  ["nome_aluno", "Usado apenas se cpf_aluno estiver vazio. Deve ser idêntico ao cadastrado."],
  ["turma", "Nome exato da turma como está cadastrado no sistema. Consulte a tela de Turmas."],
  ["atividade", "Opcional — ajuda a desambiguar turmas com nomes iguais em atividades diferentes."],
  ["data_inicio", "Data de início da matrícula. Pode ser no passado para histórico."],
  ["data_fim", "Data de encerramento. Deixe vazio se a matrícula ainda está ativa."],
  ["status", "ativa = em curso | concluida = encerrada | cancelada = desistência | pendente = aguardando confirmação"],
  [],
  ["IMPORTANTE"],
  ["• O aluno precisa já existir no sistema (use Importar Alunos antes se necessário)"],
  ["• Matrículas duplicadas (mesmo aluno + mesma turma) serão ignoradas"],
  ["• A capacidade máxima da turma será verificada antes de cada matrícula"],
  ["• Se status estiver vazio, será definido como 'ativa'"],
];

export function generateMatriculaTemplate(): void {
  const wb = XLSX.utils.book_new();

  const headers = MATRICULA_HEADERS.map((h) => h.label);
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    headers.map((h) => MATRICULA_EXAMPLE[h] ?? ""),
  ]);
  ws["!cols"] = headers.map(() => ({ wch: 35 }));
  XLSX.utils.book_append_sheet(wb, ws, "matriculas");

  const wsInstr = XLSX.utils.aoa_to_sheet(MATRICULA_INSTRUCTIONS);
  wsInstr["!cols"] = [{ wch: 30 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, "instrucoes");

  XLSX.writeFile(wb, "template_importacao_matriculas.xlsx");
}

export function parseMatriculaFile(file: File): Promise<{ rows: MatriculaImportRow[]; errors: ValidationError[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: false });

        const sheetName =
          wb.SheetNames.find((n) => n.toLowerCase() === "matriculas") ?? wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const raw: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (raw.length === 0) {
          return resolve({ rows: [], errors: [{ row: 0, field: "arquivo", message: "Planilha vazia." }] });
        }

        const normalized = raw.map((r) => {
          const out: Record<string, string> = {};
          for (const [k, v] of Object.entries(r)) out[normalizeHeader(k)] = String(v).trim();
          return out;
        });

        const errors: ValidationError[] = [];
        const rows: MatriculaImportRow[] = [];

        normalized.forEach((r, i) => {
          const rowNum = i + 2;
          const rowErrors: ValidationError[] = [];

          if (!r.turma) rowErrors.push({ row: rowNum, field: "turma", message: "Campo obrigatório." });
          if (!r.data_inicio) rowErrors.push({ row: rowNum, field: "data_inicio", message: "Campo obrigatório." });
          if (!r.cpf_aluno && !r.nome_aluno) {
            rowErrors.push({ row: rowNum, field: "identificacao", message: "Informe cpf_aluno ou nome_aluno." });
          }

          const dateInicio = parseDate(r.data_inicio);
          if (r.data_inicio && !dateInicio) {
            rowErrors.push({ row: rowNum, field: "data_inicio", message: `Formato inválido: "${r.data_inicio}". Use DD/MM/AAAA.` });
          }

          const dateFim = r.data_fim ? parseDate(r.data_fim) : null;
          if (r.data_fim && !dateFim) {
            rowErrors.push({ row: rowNum, field: "data_fim", message: `Formato inválido: "${r.data_fim}". Use DD/MM/AAAA.` });
          }

          const validStatuses = ["ativa", "concluida", "cancelada", "pendente", ""];
          if (r.status && !validStatuses.includes(r.status.toLowerCase())) {
            rowErrors.push({ row: rowNum, field: "status", message: `Status inválido: "${r.status}". Use ativa/concluida/cancelada/pendente.` });
          }

          const cpfClean = r.cpf_aluno ? unmaskCPF(r.cpf_aluno) : "";
          if (cpfClean && (cpfClean.length !== 11 || !validateCPF(cpfClean))) {
            rowErrors.push({ row: rowNum, field: "cpf_aluno", message: `CPF inválido: "${r.cpf_aluno}".` });
          }

          errors.push(...rowErrors);
          if (rowErrors.length === 0) {
            rows.push({
              cpf_aluno: cpfClean || undefined,
              nome_aluno: r.nome_aluno || undefined,
              data_nascimento_aluno: r.data_nascimento_aluno ? (parseDate(r.data_nascimento_aluno) ?? r.data_nascimento_aluno) : undefined,
              atividade: r.atividade || undefined,
              turma: r.turma,
              data_inicio: dateInicio!,
              data_fim: dateFim ?? undefined,
              status: r.status?.toLowerCase() || "ativa",
            });
          }
        });

        resolve({ rows, errors });
      } catch (err) {
        reject(new Error("Não foi possível ler o arquivo."));
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo."));
    reader.readAsArrayBuffer(file);
  });
}

async function findAluno(row: MatriculaImportRow): Promise<string | null> {
  // Busca por CPF (mais confiável)
  if (row.cpf_aluno) {
    const { data } = await supabase
      .from("alunos")
      .select("id")
      .eq("cpf", row.cpf_aluno)
      .maybeSingle();
    if (data) return data.id;
  }

  // Busca por nome + data de nascimento
  if (row.nome_aluno) {
    let query = supabase
      .from("alunos")
      .select("id")
      .ilike("nome_completo", row.nome_aluno);

    if (row.data_nascimento_aluno) {
      query = query.eq("data_nascimento", row.data_nascimento_aluno);
    }

    const { data } = await query.maybeSingle();
    if (data) return data.id;
  }

  return null;
}

async function findTurma(row: MatriculaImportRow): Promise<{ id: string; capacidade_maxima: number } | null> {
  let query = supabase
    .from("turmas")
    .select("id, capacidade_maxima, atividade:atividades(nome)")
    .ilike("nome", row.turma);

  const { data } = await query;
  if (!data || data.length === 0) return null;

  // Se veio atividade, filtra
  if (row.atividade && data.length > 1) {
    const filtered = data.filter((t: any) =>
      t.atividade?.nome?.toLowerCase().includes(row.atividade!.toLowerCase())
    );
    if (filtered.length > 0) return filtered[0];
  }

  return data[0];
}

export async function executeMatriculaImport(rows: MatriculaImportRow[]): Promise<MatriculaImportSummary> {
  const summary: MatriculaImportSummary = {
    total: rows.length,
    matriculasCriadas: 0,
    erros: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const label = row.nome_aluno ?? row.cpf_aluno ?? `linha ${i + 2}`;

    try {
      // 1. Localiza aluno
      const alunoId = await findAluno(row);
      if (!alunoId) {
        summary.erros.push({ row: i + 2, nome: label, motivo: "Aluno não encontrado no sistema. Importe-o primeiro pela Fase A." });
        continue;
      }

      // 2. Localiza turma
      const turma = await findTurma(row);
      if (!turma) {
        summary.erros.push({ row: i + 2, nome: label, motivo: `Turma "${row.turma}" não encontrada.` });
        continue;
      }

      // 3. Verifica duplicata
      const { data: existente } = await supabase
        .from("matriculas")
        .select("id")
        .eq("aluno_id", alunoId)
        .eq("turma_id", turma.id)
        .maybeSingle();

      if (existente) {
        summary.erros.push({ row: i + 2, nome: label, motivo: `Matrícula duplicada — aluno já está na turma "${row.turma}".` });
        continue;
      }

      // 4. Verifica capacidade (apenas para matrículas ativas)
      if (row.status === "ativa" || row.status === "pendente") {
        const { count } = await supabase
          .from("matriculas")
          .select("id", { count: "exact", head: true })
          .eq("turma_id", turma.id)
          .in("status", ["ativa", "pendente"]);

        if (count !== null && count >= turma.capacidade_maxima) {
          summary.erros.push({ row: i + 2, nome: label, motivo: `Turma "${row.turma}" sem vagas (capacidade ${turma.capacidade_maxima}).` });
          continue;
        }
      }

      // 5. Insere matrícula
      const { error } = await supabase.from("matriculas").insert({
        aluno_id: alunoId,
        turma_id: turma.id,
        data_inicio: row.data_inicio,
        data_fim: row.data_fim ?? null,
        status: (row.status ?? "ativa") as any,
      });

      if (error) throw new Error(error.message);

      summary.matriculasCriadas++;
    } catch (err: any) {
      summary.erros.push({ row: i + 2, nome: label, motivo: err.message ?? "Erro desconhecido." });
    }
  }

  return summary;
}

export function downloadMatriculaErrorReport(erros: MatriculaImportSummary["erros"]): void {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(
    erros.map((e) => ({ Linha: e.row, Aluno: e.nome, Motivo: e.motivo }))
  );
  ws["!cols"] = [{ wch: 8 }, { wch: 30 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws, "erros");
  XLSX.writeFile(wb, "erros_importacao_matriculas.xlsx");
}
