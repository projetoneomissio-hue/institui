
import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTurmaAlunos } from "@/hooks/useTurmas";
import { useAvaliacoes, useAvaliacaoMutations } from "@/hooks/useAvaliacoes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, ArrowLeft, Trophy, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GradeAvaliacao = () => {
    const [searchParams] = useSearchParams();
    const turmaId = searchParams.get("turma");
    const navigate = useNavigate();
    const { toast } = useToast();
    const [bimestre, setBimestre] = useState("1");
    const [isAddingAvaliacao, setIsAddingAvaliacao] = useState(false);

    // New evaluation state
    const [newEval, setNewEval] = useState({
        titulo: "",
        tipo: "prova",
        peso: "1",
        data_realizacao: new Date().toISOString().split("T")[0],
    });

    const { data: alunos, isLoading: loadingAlunos } = useTurmaAlunos(turmaId);
    const { data: avaliacoes, isLoading: loadingEvals } = useAvaliacoes(turmaId);
    const { createAvaliacao, upsertNota } = useAvaliacaoMutations(turmaId);

    // Filter evaluations by selected bimestre
    const filteredEvals = avaliacoes?.filter(a => a.bimestre === parseInt(bimestre)) || [];

    const handleCreateAvaliacao = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!turmaId) return;

        try {
            await createAvaliacao.mutateAsync({
                turma_id: turmaId,
                titulo: newEval.titulo,
                tipo: newEval.tipo,
                bimestre: parseInt(bimestre),
                peso: parseFloat(newEval.peso),
                data_realizacao: newEval.data_realizacao,
            });
            setIsAddingAvaliacao(false);
            setNewEval({ ...newEval, titulo: "" });
        } catch (err) {
            console.error(err);
        }
    };

    const handleNotaChange = (avaliacaoId: string, alunoId: string, valor: string) => {
        // Basic validation for 0-10
        const num = parseFloat(valor);
        if (valor !== "" && (isNaN(num) || num < 0 || num > 10)) {
            toast({ title: "Nota inválida", description: "A nota deve ser entre 0 e 10", variant: "destructive" });
            return;
        }

        upsertNota.mutate({
            avaliacao_id: avaliacaoId,
            aluno_id: alunoId,
            valor_numerico: valor === "" ? undefined : num,
        });
    };

    const getNotaColor = (nota: number | null) => {
        if (nota === null) return "text-muted-foreground";
        if (nota >= 7) return "text-green-500 font-bold";
        if (nota >= 5) return "text-yellow-500 font-bold";
        return "text-red-500 font-bold";
    };

    if (!turmaId) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center">
                    <h2 className="text-xl font-bold">Turma não encontrada</h2>
                    <Button onClick={() => navigate("/professor/turmas")} className="mt-4">
                        Voltar para Turmas
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/professor/turmas")}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Grade de Avaliações</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">Lançamento de notas e desempenho pedagógico.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Select value={bimestre} onValueChange={setBimestre}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Bimestre" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1º Bimestre</SelectItem>
                                <SelectItem value="2">2º Bimestre</SelectItem>
                                <SelectItem value="3">3º Bimestre</SelectItem>
                                <SelectItem value="4">4º Bimestre</SelectItem>
                            </SelectContent>
                        </Select>

                        <Dialog open={isAddingAvaliacao} onOpenChange={setIsAddingAvaliacao}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Nova Avaliação
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Criar Nova Avaliação</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateAvaliacao} className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label>Título da Avaliação</Label>
                                        <Input
                                            placeholder="Ex: Prova Mensal, Trabalho em Grupo"
                                            value={newEval.titulo}
                                            onChange={(e) => setNewEval({ ...newEval, titulo: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Tipo</Label>
                                            <Select value={newEval.tipo} onValueChange={(v) => setNewEval({ ...newEval, tipo: v })}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="prova">Prova</SelectItem>
                                                    <SelectItem value="trabalho">Trabalho</SelectItem>
                                                    <SelectItem value="participacao">Participação</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Peso</Label>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                value={newEval.peso}
                                                onChange={(e) => setNewEval({ ...newEval, peso: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Data</Label>
                                        <Input
                                            type="date"
                                            value={newEval.data_realizacao}
                                            onChange={(e) => setNewEval({ ...newEval, data_realizacao: e.target.value })}
                                        />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={createAvaliacao.isPending}>
                                        {createAvaliacao.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Avaliação"}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-primary/5">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <Trophy className="h-5 w-5 text-yellow-500" />
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Média da Turma</p>
                                    <p className="text-2xl font-bold">7.8</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-green-500/5">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Aprovados</p>
                                    <p className="text-2xl font-bold">85%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-red-500/5">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Abaixo da Média</p>
                                    <p className="text-2xl font-bold">2 Alunos</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Grade Table */}
                <Card className="overflow-hidden">
                    <CardHeader className="border-b border-border">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Plus className="h-4 w-4 text-primary" />
                            Notas do {bimestre}º Bimestre
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            {(loadingAlunos || loadingEvals) ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow>
                                            <TableHead className="w-[300px] border-r border-border sticky left-0 bg-background z-20">Aluno</TableHead>
                                            {filteredEvals.map(evalu => (
                                                <TableHead key={evalu.id} className="text-center min-w-[120px]">
                                                    <div className="space-y-1">
                                                        <span className="block font-bold">{evalu.titulo}</span>
                                                        <Badge variant="secondary" className="text-[10px] py-0">{evalu.tipo}</Badge>
                                                    </div>
                                                </TableHead>
                                            ))}
                                            {filteredEvals.length === 0 && (
                                                <TableHead className="text-center text-muted-foreground">Nenhuma avaliação criada p/ este período</TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {alunos?.map((aluno) => (
                                            <TableRow key={aluno.id} className="hover:bg-primary/5 transition-colors">
                                                <TableCell className="font-medium border-r border-border sticky left-0 bg-background z-10">
                                                    <div className="flex flex-col">
                                                        <span>{aluno.nome_completo}</span>
                                                        <span className="text-[10px] text-muted-foreground truncate">{aluno.responsavel_nome}</span>
                                                    </div>
                                                </TableCell>
                                                {filteredEvals.map(evalu => {
                                                    const notaObj = evalu.notas?.find(n => n.aluno_id === aluno.aluno_id);
                                                    return (
                                                        <TableCell key={evalu.id} className="text-center p-2">
                                                            <Input
                                                                type="number"
                                                                step="0.1"
                                                                min="0"
                                                                max="10"
                                                                defaultValue={notaObj?.valor_numerico === undefined ? "" : notaObj.valor_numerico}
                                                                onBlur={(e) => handleNotaChange(evalu.id, aluno.aluno_id, e.target.value)}
                                                                className={`w-16 mx-auto text-center font-bold focus:bg-primary/10 transition-all ${getNotaColor(notaObj?.valor_numerico ?? null)}`}
                                                            />
                                                        </TableCell>
                                                    );
                                                })}
                                                {filteredEvals.length === 0 && (
                                                    <TableCell className="text-center py-8 text-muted-foreground italic">
                                                        Adicione avaliações para começar a lançar notas.
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default GradeAvaliacao;
