import { LucideIcon, BookOpen, Music, Trophy, Activity, Heart, Users, Sparkles, Palette, Star, Scissors } from "lucide-react";
import testimonialMaria from "@/assets/testimonial-maria.jpg";
import testimonialLucas from "@/assets/testimonial-lucas.jpg";
import testimonialCarlos from "@/assets/testimonial-carlos.jpg";

export interface ActivityItem {
    id: string;
    title: string;
    description: string;
    price: string;
    priceNote?: string;
    frequency: string;
    schedule: string;
    targetAudience: string;
    note?: string;
    image: string;
    icon: LucideIcon;
    gradient: string;
    waitlist?: boolean;
    free?: boolean;
}

export interface TestimonialItem {
    name: string;
    role: string;
    photo: string;
    feedback: string;
}

export const ICON_OPTIONS = [
    { name: "Palette", icon: Palette, label: "Arte" },
    { name: "BookOpen", icon: BookOpen, label: "Educação" },
    { name: "Music", icon: Music, label: "Música" },
    { name: "Trophy", icon: Trophy, label: "Esporte" },
    { name: "Activity", icon: Activity, label: "Fitness" },
    { name: "Heart", icon: Heart, label: "Saúde" },
    { name: "Users", icon: Users, label: "Grupo" },
    { name: "Sparkles", icon: Sparkles, label: "Arte/Dança" },
    { name: "Star", icon: Star, label: "Destaque" },
    { name: "Scissors", icon: Scissors, label: "Artesanato" },
] as const;

export const GRADIENT_OPTIONS = [
    { value: "from-indigo-500 to-purple-500", label: "Índigo" },
    { value: "from-blue-500 to-cyan-500", label: "Azul" },
    { value: "from-yellow-500 to-amber-500", label: "Amarelo" },
    { value: "from-pink-500 to-rose-500", label: "Rosa" },
    { value: "from-red-500 to-orange-500", label: "Vermelho" },
    { value: "from-orange-600 to-red-600", label: "Laranja" },
    { value: "from-teal-500 to-emerald-500", label: "Verde-água" },
    { value: "from-orange-500 to-yellow-500", label: "Laranja Claro" },
    { value: "from-violet-500 to-purple-500", label: "Violeta" },
    { value: "from-purple-500 to-pink-500", label: "Roxo" },
    { value: "from-fuchsia-500 to-pink-500", label: "Fúcsia" },
    { value: "from-rose-500 to-pink-500", label: "Rosa Escuro" },
    { value: "from-blue-400 to-indigo-500", label: "Azul Claro" },
    { value: "from-rose-400 to-pink-500", label: "Rosa Suave" },
    { value: "from-amber-400 to-yellow-500", label: "Âmbar" },
    { value: "from-green-500 to-emerald-600", label: "Verde" },
];

export const getIconByName = (name: string): LucideIcon => {
    const found = ICON_OPTIONS.find(o => o.name === name);
    return found?.icon ?? Activity;
};

export const activities: ActivityItem[] = [
    {
        id: "desenho",
        title: "Aulas de Desenho",
        description: "Técnicas de desenho incluindo animes, cartoons, realismo, anatomia humana, sombras, perspectivas e expressões. Para crianças e adultos.",
        price: "R$ 60,00/mês",
        frequency: "1x por semana",
        schedule: "Quartas-feiras | 19h às 20h",
        targetAudience: "Crianças e adultos",
        note: "Trazer caderno, lápis, borracha, lápis de cor, giz e demais materiais conforme orientação do professor.",
        image: "",
        icon: Palette,
        gradient: "from-indigo-500 to-purple-500"
    },
    {
        id: "ingles",
        title: "Aulas de Inglês",
        description: "Aulas de inglês com material cristão, ensino dinâmico e interativo. Turma Basic para 7-12 anos; Basic 1 com vagas abertas aos sábados.",
        price: "R$ 60,00/mês",
        priceNote: "Material didático semestral: R$ 100,00",
        frequency: "1x por semana",
        schedule: "Basic (7-12 anos): Sábados | 9h às 11h\nBasic 1 (10-12 anos): Segundas-feiras",
        targetAudience: "7 a 12 anos",
        image: "",
        icon: BookOpen,
        gradient: "from-blue-500 to-cyan-500",
        waitlist: true
    },
    {
        id: "musica",
        title: "Música – Violão e Teclado",
        description: "Aulas de violão e teclado com foco em teoria musical e prática. Horários definidos diretamente com o professor conforme disponibilidade.",
        price: "R$ 100,00/mês",
        priceNote: "Apostila semestral: R$ 25,00",
        frequency: "1x por semana",
        schedule: "Teclado: Sábados (manhã)\nViolão: Sábados (manhã) e Terças-feiras (noite)",
        targetAudience: "A partir de 10 anos",
        note: "Necessário possuir instrumento.",
        image: "",
        icon: Music,
        gradient: "from-yellow-500 to-amber-500"
    },
    {
        id: "ballet",
        title: "Ballet Infantil",
        description: "Ballet clássico que desenvolve coordenação, postura, expressão artística e disciplina desde a primeira infância.",
        price: "R$ 60,00/mês",
        frequency: "1x por semana",
        schedule: "4 a 6 anos: Sábados | 10h30 às 11h30\n7 a 10 anos: Sábados | 9h30 às 10h30",
        targetAudience: "4 a 10 anos",
        image: "",
        icon: Sparkles,
        gradient: "from-pink-500 to-rose-500"
    },
    {
        id: "jiu-jitsu",
        title: "Jiu-Jitsu",
        description: "Arte marcial completa ministrada por faixa preta experiente. Turmas separadas por faixa etária garantindo o melhor desenvolvimento.",
        price: "Infantil: R$ 70,00 | Adulto: R$ 100,00/mês",
        frequency: "2x por semana",
        schedule: "Infantil – Ter e Qui:\n• 4-6a: 18h30-19h15 | • 7-9a: 19h15-20h | • 10-14a: 20h-21h\nAdulto – Seg e Qua: 19h30 às 21h",
        targetAudience: "A partir de 4 anos",
        note: "Quimono não incluso.",
        image: "",
        icon: Trophy,
        gradient: "from-red-500 to-orange-500"
    },
    {
        id: "judo",
        title: "Judô",
        description: "Arte marcial japonesa que ensina respeito, autocontrole e disciplina. Ideal para crianças em fase de desenvolvimento motor e social.",
        price: "R$ 60,00/mês",
        frequency: "1x por semana",
        schedule: "Sábados | 11h às 12h",
        targetAudience: "4 a 14 anos",
        image: "",
        icon: Trophy,
        gradient: "from-orange-600 to-red-600"
    },
    {
        id: "pilates",
        title: "Pilates Solo",
        description: "Pilates para adultos com foco em fortalecimento do core, flexibilidade, postura e bem-estar físico e mental.",
        price: "R$ 100,00/mês",
        frequency: "2x por semana",
        schedule: "Terças e Quintas | 13h30 às 14h30",
        targetAudience: "Adultos (a partir de 18 anos)",
        image: "",
        icon: Activity,
        gradient: "from-teal-500 to-emerald-500"
    },
    {
        id: "volei",
        title: "Vôlei",
        description: "Aulas de vôlei com foco em técnica, tática e espírito de equipe. Turmas separadas por faixa etária para melhor aprendizado.",
        price: "R$ 60,00/mês",
        frequency: "1x por semana",
        schedule: "Sábados:\n• Adulto: 8h20-9h20 | • Juvenil (12-15a): 9h20-10h20 | • Infantil (8-11a): 10h20-11h20",
        targetAudience: "8 anos em diante",
        image: "",
        icon: Trophy,
        gradient: "from-orange-500 to-yellow-500"
    },
    {
        id: "reforco",
        title: "Reforço Escolar",
        description: "Acompanhamento pedagógico personalizado para ajudar crianças e adolescentes a superar dificuldades e avançar nas matérias escolares.",
        price: "R$ 50,00/mês",
        frequency: "A combinar",
        schedule: "Horários definidos diretamente com o professor",
        targetAudience: "6 a 15 anos",
        image: "",
        icon: BookOpen,
        gradient: "from-violet-500 to-purple-500"
    },
    {
        id: "crochet",
        title: "Aulas de Crochê",
        description: "Aprenda a arte do crochê do zero ou aprimore suas técnicas. Uma atividade manual que relaxa, conecta pessoas e gera renda.",
        price: "R$ 60,00/mês",
        frequency: "1x por semana",
        schedule: "Toda Terça-feira | 15h",
        targetAudience: "Adultos",
        image: "",
        icon: Scissors,
        gradient: "from-purple-500 to-pink-500"
    },
    {
        id: "danca",
        title: "Dança de Salão e Ritmos",
        description: "Aulas de dança de salão e outros ritmos para iniciantes e intermediários. Pode vir sozinho(a) ou em casal — todos são bem-vindos!",
        price: "Individual: R$ 60,00 | Casal: R$ 100,00/mês",
        frequency: "1x por semana",
        schedule: "Todas as Segundas-feiras | 19h30",
        targetAudience: "Adultos",
        image: "",
        icon: Music,
        gradient: "from-fuchsia-500 to-pink-500"
    },
    {
        id: "escuta-terapeutica",
        title: "Escuta Terapêutica Cristã",
        description: "Atendimento terapêutico individual com base em valores cristãos. Presencial ou online. Cuide da sua saúde emocional com suporte especializado.",
        price: "Investimento: R$ 70,00/mês",
        priceNote: "Manutenção mensal: R$ 25,00",
        frequency: "Semanal",
        schedule: "Presencial ou on-line (híbrido)\nHorários a combinar",
        targetAudience: "Adultos",
        image: "",
        icon: Heart,
        gradient: "from-rose-500 to-pink-500"
    },
    {
        id: "aconselhamento-homens",
        title: "Aconselhamento – Homens",
        description: "Espaço de encorajamento ao crescimento emocional e espiritual com base em valores cristãos. 4 sessões presenciais, 1 hora por semana.",
        price: "Gratuito",
        frequency: "1x por semana",
        schedule: "Conforme agenda",
        targetAudience: "Homens adultos",
        image: "",
        icon: Users,
        gradient: "from-blue-400 to-indigo-500",
        free: true
    },
    {
        id: "tecendo-afetos",
        title: "Tecendo Afetos",
        description: "Grupo de mulheres que gostam de tricô, reunidas para tecer peças lindas para doação. Transformam linhas em carinho e solidariedade.",
        price: "Gratuito",
        frequency: "1x por semana",
        schedule: "Toda Segunda-feira | 15h às 17h",
        targetAudience: "Mulheres",
        image: "",
        icon: Heart,
        gradient: "from-rose-400 to-pink-500",
        free: true
    },
    {
        id: "serie-alpha",
        title: "Série Alpha",
        description: "Existe mais na vida do que simplesmente viver. Uma série de encontros com roda de conversa sobre o sentido da vida. Ambiente acolhedor e sem julgamentos.",
        price: "Gratuito",
        frequency: "Semanal",
        schedule: "Segundas-feiras | 19h30",
        targetAudience: "Todos",
        image: "",
        icon: Star,
        gradient: "from-amber-400 to-yellow-500",
        free: true
    },
];

export const testimonials: TestimonialItem[] = [
    {
        name: "Maria Aparecida",
        role: "Mãe da Ana (Ballet)",
        photo: testimonialMaria,
        feedback: "A instituição transformou a vida da minha filha. O ballet trouxe disciplina, confiança e alegria. Os professores são incríveis e o ambiente é acolhedor!"
    },
    {
        name: "Lucas Ferreira",
        role: "Aluno de Jiu-Jitsu",
        photo: testimonialLucas,
        feedback: "Comecei no Jiu-Jitsu há 2 anos e mudou minha vida completamente. Aprendi disciplina, respeito e faço parte de uma família. Recomendo para todos!"
    },
    {
        name: "Carlos Roberto",
        role: "Pai do Pedro",
        photo: testimonialCarlos,
        feedback: "Meu filho participa do vôlei e das aulas de desenho. Ver ele feliz e desenvolvendo suas habilidades não tem preço. Este centro é uma bênção para nossa comunidade!"
    }
];
