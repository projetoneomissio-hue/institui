import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, MapPin, Heart, Clock } from "lucide-react";
import { differenceInYears, differenceInMonths } from "date-fns";

interface SocialImpactDashboardProps {
  alunos: any[];
}

export const SocialImpactDashboard = ({ alunos }: SocialImpactDashboardProps) => {
  // Cores do Design System e Auxiliares
  const COLORS = ["#E8004F", "#FFC200", "#4DD9C0", "#6B5CE7", "#001F7A", "#FFB6C1", "#00A8FF"];
  
  // 1. Faixas Etárias
  const ageGroups = {
    "0 a 5 anos": 0,
    "6 a 10 anos": 0,
    "11 a 14 anos": 0,
    "15 a 17 anos": 0,
    "18+ anos": 0,
  };

  // 2. Bairros (Mapa de Calor / Distribuição)
  const bairrosMap: Record<string, number> = {};

  // 3. PNE (Necessidades Especiais)
  let pneCount = 0;

  // 4. Retenção
  let totalMonths = 0;
  let enrolledCount = 0;

  const today = new Date();

  alunos.forEach((aluno) => {
    // Idade
    if (aluno.data_nascimento && aluno.data_nascimento !== "1900-01-01") {
      const age = differenceInYears(today, new Date(aluno.data_nascimento));
      if (age <= 5) ageGroups["0 a 5 anos"]++;
      else if (age <= 10) ageGroups["6 a 10 anos"]++;
      else if (age <= 14) ageGroups["11 a 14 anos"]++;
      else if (age <= 17) ageGroups["15 a 17 anos"]++;
      else ageGroups["18+ anos"]++;
    }

    // Bairro
    if (aluno.bairro && aluno.bairro.trim() !== "") {
      const b = aluno.bairro.trim().toUpperCase();
      bairrosMap[b] = (bairrosMap[b] || 0) + 1;
    }

    // PNE
    const hasPne = aluno.anamneses?.some((a: any) => a.is_pne === true);
    if (hasPne) pneCount++;

    // Retenção
    if (aluno.matriculas && aluno.matriculas.length > 0) {
      // Find the earliest data_inicio
      const firstMatricula = [...aluno.matriculas].sort(
        (a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime()
      )[0];
      
      if (firstMatricula && firstMatricula.data_inicio) {
        const monthsInApp = differenceInMonths(today, new Date(firstMatricula.data_inicio));
        totalMonths += monthsInApp;
        enrolledCount++;
      }
    }
  });

  const avgMonths = enrolledCount > 0 ? (totalMonths / enrolledCount) : 0;
  const averageRetention = avgMonths > 0 ? avgMonths.toFixed(1) : "< 1";
  const retentionLabel = avgMonths > 0 ? "meses" : "mês";

  const barChartData = Object.entries(ageGroups).map(([name, value]) => ({
    name,
    value,
  }));

  // Sort bairros by count descending and take top 10
  const bairrosChartData = Object.entries(bairrosMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  const topBairro = bairrosChartData.length > 0 ? bairrosChartData[0].name : "N/D";

  const pneData = [
    { name: "Com Necessidade (PNE)", value: pneCount },
    { name: "Sem Necessidade", value: alunos.length - pneCount },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Top Impact KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-primary/10 border-primary/20 shadow-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-16 h-16 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-primary font-bold uppercase tracking-wider text-xs">Vidas Alcançadas</CardDescription>
            <CardTitle className="text-4xl font-bold text-primary">{alunos.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-primary/80 font-medium">Alunos cadastrados na base</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/10 border-orange-500/20 shadow-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <MapPin className="w-16 h-16 text-orange-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-orange-600 font-bold uppercase tracking-wider text-xs">Principal Bairro</CardDescription>
            <CardTitle className="text-3xl font-bold text-orange-600 truncate" title={topBairro}>{topBairro}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-600/80 font-medium">{Object.keys(bairrosMap).length} bairros diferentes alcançados</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 border-purple-500/20 shadow-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Heart className="w-16 h-16 text-purple-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-purple-600 font-bold uppercase tracking-wider text-xs">Inclusão (PNE)</CardDescription>
            <CardTitle className="text-4xl font-bold text-purple-600">{pneCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-purple-600/80 font-medium">Alunos com necessidades atendidos</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/10 border-emerald-500/20 shadow-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-16 h-16 text-emerald-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-600 font-bold uppercase tracking-wider text-xs">Retenção Média</CardDescription>
            <CardTitle className="text-4xl font-bold text-emerald-600">{averageRetention} <span className="text-xl">{retentionLabel}</span></CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-emerald-600/80 font-medium">Tempo médio de permanência</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Faixa Etária */}
        <Card className="border-border shadow-md bg-card">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <Users className="w-5 h-5" /> Distribuição por Faixa Etária
            </CardTitle>
            <CardDescription>Mostra o público principal atendido pelo projeto.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: "hsl(var(--muted))" }}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} 
                  />
                  <Bar dataKey="value" fill={COLORS[0]} radius={[6, 6, 0, 0]} barSize={40}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico 2: Bairros (Reach) */}
        <Card className="border-border shadow-md bg-card">
          <CardHeader>
            <CardTitle className="text-orange-600 flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Alcance Geográfico (Top 10)
            </CardTitle>
            <CardDescription>Principais bairros de onde os alunos vêm.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bairrosChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: "transparent" }}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} 
                  />
                  <Bar dataKey="value" fill={COLORS[1]} radius={[0, 6, 6, 0]} barSize={20}>
                    {bairrosChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico 3: Inclusão (PNE) */}
        <Card className="border-border shadow-md bg-card">
          <CardHeader>
            <CardTitle className="text-purple-600 flex items-center gap-2">
              <Heart className="w-5 h-5" /> Perfil de Inclusão
            </CardTitle>
            <CardDescription>Proporção de alunos com necessidades específicas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pneData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill={COLORS[3]} />
                    <Cell fill="hsl(var(--muted))" />
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center mt-[-10px]">
                <p className="text-3xl font-bold text-purple-600">
                  {alunos.length > 0 ? ((pneCount / alunos.length) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Inclusão</p>
              </div>
            </div>
            <div className="flex justify-center flex-wrap gap-4 mt-2">
              <div className="flex justify-center items-center gap-2">
                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[3] }}></div>
                 <span className="text-sm font-medium">Com PNE ({pneCount})</span>
              </div>
              <div className="flex justify-center items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-muted"></div>
                 <span className="text-sm font-medium">Sem PNE ({alunos.length - pneCount})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
