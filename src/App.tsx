import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { UnidadeProvider } from "@/contexts/UnidadeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PostHogProvider } from "@/providers/PostHogProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeColorInjector } from "@/components/ThemeColorInjector";

import Index from "./pages/Index";
// [ZAFEM-FUTURE] Planos e Checkout desativados temporariamente — serão usados na multiplataforma
// import Planos from "./pages/Planos";
// import Checkout from "./pages/Checkout";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import { RealtimeNotifications } from "./components/RealtimeNotifications";
import Dashboard from "./pages/Dashboard";
import Atividades from "./pages/Atividades";
import Alunos from "./pages/Alunos";
import Professores from "./pages/Professores";
import Financeiro from "./pages/Financeiro";
import Predio from "./pages/Predio";
import Configuracoes from "./pages/Configuracoes";
import CalendarioEscolar from "./pages/CalendarioEscolar";
import MfaSetup from "./pages/MfaSetup";
import MfaVerify from "./pages/MfaVerify";
import NotFound from "./pages/NotFound";

import { ReloadPrompt } from "./components/ReloadPrompt";
import MatriculaOnline from "./pages/public/MatriculaOnline";
import ResgatarConvite from "./pages/public/ResgatarConvite";
import Ajuda from "./pages/Ajuda";

// Direção
import Usuarios from "./pages/direcao/Usuarios";
import Convites from "./pages/direcao/Convites";
import Matriculas from "./pages/direcao/Matriculas";
import ManagementDashboard from "./pages/direcao/ManagementDashboard";
import Coordenadores from "./pages/direcao/Coordenadores";
import Interessados from "./pages/direcao/Interessados";
import Comunicados from "./pages/direcao/Comunicados";
import GestaoCobrancas from "./pages/direcao/GestaoCobrancas";
import LandingEditor from "./pages/direcao/LandingEditor";

// Coordenação
import DashboardCoordenacao from "./pages/coordenacao/DashboardCoordenacao";
import TurmasCoordenacao from "./pages/coordenacao/Turmas";
import Relatorios from "./pages/coordenacao/Relatorios";
import GerenciarNotificacoes from "./pages/coordenacao/GerenciarNotificacoes";
import RelatorioVoluntarios from "./pages/coordenacao/RelatorioVoluntarios";

// Professores
import DashboardProfessor from "./pages/professor/Dashboard";
import Turmas from "./pages/professor/Turmas";
import Chamada from "./pages/professor/Chamada";
import GradeAvaliacao from "./pages/professor/GradeAvaliacao";
import AlunosProfessor from "./pages/professor/Alunos";
import Observacoes from "./pages/professor/Observacoes";
import Comissoes from "./pages/professor/Comissoes";

// Responsáveis
import AtividadesMatriculadas from "./pages/responsavel/AtividadesMatriculadas";
import Pagamentos from "./pages/responsavel/Pagamentos";
import RelatoriosAluno from "./pages/responsavel/RelatoriosAluno";
import NovaMatricula from "./pages/responsavel/NovaMatricula";
import Anamnese from "./pages/responsavel/Anamnese";
import CadastrarAluno from "./pages/responsavel/CadastrarAluno";
import RegistrarPagamento from "./pages/responsavel/RegistrarPagamento";
import DashboardResponsavel from "./pages/responsavel/DashboardResponsavel";
import PagamentoSucesso from "./pages/responsavel/PagamentoSucesso";

// Secretaria (Voluntários)
import DashboardSecretaria from "./pages/secretaria/DashboardSecretaria";

// Shared Management/Secretaria
import PreCadastro from "./pages/shared/PreCadastro";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60, // 1 hour
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/mfa-setup" element={<MfaSetup />} />
      <Route path="/mfa-verify" element={<MfaVerify />} />
      {/* [ZAFEM-FUTURE] Rotas de Planos/Checkout desativadas — serão reativadas na multiplataforma */}
      {/* <Route path="/planos" element={<Planos />} /> */}
      {/* <Route path="/checkout" element={<Checkout />} /> */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/matricula/:slug" element={<MatriculaOnline />} />
      <Route path="/resgatar-convite" element={<ResgatarConvite />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/atividades" element={<ProtectedRoute><Atividades /></ProtectedRoute>} />
      <Route path="/alunos" element={<ProtectedRoute><Alunos /></ProtectedRoute>} />
      <Route path="/professores" element={<ProtectedRoute><Professores /></ProtectedRoute>} />
      <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
      <Route path="/predio" element={<ProtectedRoute><Predio /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
      <Route path="/calendario" element={<ProtectedRoute><CalendarioEscolar /></ProtectedRoute>} />

      {/* Direção */}
      <Route path="/direcao" element={<Navigate to="/direcao/dashboard" replace />} />
      <Route path="/direcao/dashboard" element={<ProtectedRoute allowedRoles={["direcao"]}><ManagementDashboard /></ProtectedRoute>} />
      <Route path="/direcao/usuarios" element={<ProtectedRoute allowedRoles={["direcao"]}><Usuarios /></ProtectedRoute>} />
      <Route path="/direcao/coordenadores" element={<ProtectedRoute allowedRoles={["direcao"]}><Coordenadores /></ProtectedRoute>} />
      <Route path="/convites" element={<ProtectedRoute allowedRoles={["direcao"]}><Convites /></ProtectedRoute>} />
      <Route path="/direcao/matriculas" element={<ProtectedRoute allowedRoles={["direcao"]}><Matriculas /></ProtectedRoute>} />
      <Route path="/direcao/turmas" element={<ProtectedRoute allowedRoles={["direcao", "coordenacao"]}><TurmasCoordenacao /></ProtectedRoute>} />
      <Route path="/direcao/interessados" element={<ProtectedRoute allowedRoles={["direcao", "coordenacao"]}><Interessados /></ProtectedRoute>} />
      <Route path="/direcao/cobrancas" element={<ProtectedRoute allowedRoles={["direcao"]}><GestaoCobrancas /></ProtectedRoute>} />
      <Route path="/direcao/comunicados" element={<ProtectedRoute allowedRoles={["direcao"]}><Comunicados /></ProtectedRoute>} />
      <Route path="/direcao/pre-cadastro" element={<ProtectedRoute allowedRoles={["direcao"]}><PreCadastro /></ProtectedRoute>} />
      <Route path="/direcao/landing" element={<ProtectedRoute allowedRoles={["direcao"]}><LandingEditor /></ProtectedRoute>} />

      {/* Coordenação */}
      <Route path="/coordenacao" element={<Navigate to="/coordenacao/dashboard" replace />} />
      <Route path="/coordenacao/dashboard" element={<ProtectedRoute allowedRoles={["coordenacao"]}><DashboardCoordenacao /></ProtectedRoute>} />
      <Route path="/coordenacao/turmas" element={<ProtectedRoute allowedRoles={["coordenacao", "direcao"]}><TurmasCoordenacao /></ProtectedRoute>} />
      <Route path="/coordenacao/relatorios" element={<ProtectedRoute allowedRoles={["coordenacao"]}><Relatorios /></ProtectedRoute>} />
      <Route path="/coordenacao/notificacoes" element={<ProtectedRoute allowedRoles={["coordenacao", "direcao"]}><GerenciarNotificacoes /></ProtectedRoute>} />
      <Route path="/coordenacao/voluntarios" element={<ProtectedRoute allowedRoles={["coordenacao", "direcao"]}><RelatorioVoluntarios /></ProtectedRoute>} />

      {/* Professores */}
      <Route path="/professor" element={<Navigate to="/professor/dashboard" replace />} />
      <Route path="/professor/dashboard" element={<ProtectedRoute allowedRoles={["professor"]}><DashboardProfessor /></ProtectedRoute>} />
      <Route path="/professor/turmas" element={<ProtectedRoute allowedRoles={["professor"]}><Turmas /></ProtectedRoute>} />
      <Route path="/professor/chamada" element={<ProtectedRoute allowedRoles={["professor"]}><Chamada /></ProtectedRoute>} />
      <Route path="/professor/avaliacoes" element={<ProtectedRoute allowedRoles={["professor"]}><GradeAvaliacao /></ProtectedRoute>} />
      <Route path="/professor/alunos" element={<ProtectedRoute allowedRoles={["professor"]}><AlunosProfessor /></ProtectedRoute>} />
      <Route path="/professor/observacoes" element={<ProtectedRoute allowedRoles={["professor"]}><Observacoes /></ProtectedRoute>} />
      <Route path="/professor/comissoes" element={<ProtectedRoute allowedRoles={["professor"]}><Comissoes /></ProtectedRoute>} />

      {/* Responsáveis */}
      <Route path="/responsavel" element={<Navigate to="/responsavel/dashboard" replace />} />
      <Route path="/responsavel/dashboard" element={<ProtectedRoute allowedRoles={["responsavel"]}><DashboardResponsavel /></ProtectedRoute>} />
      <Route path="/responsavel/nova-matricula" element={<ProtectedRoute allowedRoles={["responsavel"]}><NovaMatricula /></ProtectedRoute>} />
      <Route path="/responsavel/atividades-matriculadas" element={<ProtectedRoute allowedRoles={["responsavel"]}><AtividadesMatriculadas /></ProtectedRoute>} />
      <Route path="/responsavel/pagamentos" element={<ProtectedRoute allowedRoles={["responsavel"]}><Pagamentos /></ProtectedRoute>} />
      <Route path="/responsavel/registrar-pagamento" element={<ProtectedRoute allowedRoles={["responsavel"]}><RegistrarPagamento /></ProtectedRoute>} />
      <Route path="/responsavel/relatorios-aluno" element={<ProtectedRoute allowedRoles={["responsavel"]}><RelatoriosAluno /></ProtectedRoute>} />
      <Route path="/responsavel/anamnese" element={<ProtectedRoute allowedRoles={["responsavel"]}><Anamnese /></ProtectedRoute>} />
      <Route path="/responsavel/cadastrar-aluno" element={<ProtectedRoute allowedRoles={["responsavel"]}><CadastrarAluno /></ProtectedRoute>} />
      <Route path="/responsavel/pagamento-sucesso" element={<ProtectedRoute allowedRoles={["responsavel"]}><PagamentoSucesso /></ProtectedRoute>} />

      {/* Secretaria (Voluntários) */}
      <Route path="/secretaria" element={<Navigate to="/secretaria/dashboard" replace />} />
      <Route path="/secretaria/dashboard" element={<ProtectedRoute allowedRoles={["secretaria"]}><DashboardSecretaria /></ProtectedRoute>} />
      <Route path="/secretaria/cadastrar-aluno" element={<ProtectedRoute allowedRoles={["secretaria"]}><CadastrarAluno /></ProtectedRoute>} />
      <Route path="/secretaria/nova-matricula" element={<ProtectedRoute allowedRoles={["secretaria"]}><NovaMatricula /></ProtectedRoute>} />
      <Route path="/secretaria/alunos" element={<ProtectedRoute allowedRoles={["secretaria"]}><Alunos /></ProtectedRoute>} />
      <Route path="/secretaria/pre-cadastro" element={<ProtectedRoute allowedRoles={["secretaria", "direcao"]}><PreCadastro /></ProtectedRoute>} />

      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="/ajuda" element={<ProtectedRoute><Ajuda /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <AuthProvider>
          <UnidadeProvider>
            <ThemeColorInjector />
            <TooltipProvider>
              <PostHogProvider>
                <Toaster />
                <Sonner />
                <RealtimeNotifications />
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </PostHogProvider>
            </TooltipProvider>
          </UnidadeProvider>
          <ReloadPrompt /> {/* Added ReloadPrompt here */}
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
