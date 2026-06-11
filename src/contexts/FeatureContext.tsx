import { useUnidade } from "./UnidadeContext";

export type FeatureKey =
  | "saude"                        // Anamnese, PNE, dados médicos
  | "predio"                       // Gestão do espaço físico e locações
  | "academico"                    // Série, grade de avaliação, chamada formal, bimestre
  | "comissoes"                    // Comissões para instrutores/professores
  | "calendario"                   // Calendário de eventos e feriados
  | "voluntarios"                  // Role secretaria e gestão de voluntários
  | "indicacoes"                   // Sistema de referência e rastreio de leads
  | "landing_publica"              // Landing page pública e matrícula online
  | "matricula_aprovacao_automatica"; // Aprovação automática quando há vaga disponível

const DEFAULT_FLAGS: Record<FeatureKey, boolean> = {
  saude: true,
  predio: true,
  academico: true,
  comissoes: true,
  calendario: true,
  voluntarios: true,
  indicacoes: false,
  landing_publica: true,
  matricula_aprovacao_automatica: false,
};

/**
 * Retorna true se o módulo está ativo para a unidade corrente.
 * Fallback para DEFAULT_FLAGS caso feature_flags não esteja no banco ainda.
 *
 * Uso: const temPredio = useFeature("predio");
 */
export const useFeature = (flag: FeatureKey): boolean => {
  const { currentUnidade } = useUnidade();
  const flags = (currentUnidade as any)?.feature_flags;
  if (!flags || typeof flags !== "object") return DEFAULT_FLAGS[flag];
  return flag in flags ? Boolean(flags[flag]) : DEFAULT_FLAGS[flag];
};

/**
 * Retorna o objeto completo de feature flags da unidade corrente.
 * Útil para renderizar a tela de Configurações > Módulos.
 */
export const useAllFeatures = (): Record<FeatureKey, boolean> => {
  const { currentUnidade } = useUnidade();
  const flags = (currentUnidade as any)?.feature_flags ?? {};
  return {
    ...DEFAULT_FLAGS,
    ...flags,
  } as Record<FeatureKey, boolean>;
};
