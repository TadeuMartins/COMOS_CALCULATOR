import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { BarChart3, Calculator, TrendingUp, Clock3, RefreshCcw, FileBarChart2, Languages, Link2, LineChart as LineChartIcon } from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  type TooltipValueType,
} from "recharts";

function formatCurrency(value: number, locale: string, currency: "BRL" | "USD") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function percent(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value) + "%";
}

function numberFmt(value: number, locale: string, digits = 1) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

function calcNPV(rate: number, cashFlows: number[]) {
  return cashFlows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + rate, i), 0);
}

function calcIRR(cashFlows: number[]) {
  let guess = 0.15;
  for (let i = 0; i < 100; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      npv += cashFlows[t] / Math.pow(1 + guess, t);
      if (t > 0) {
        dnpv += (-t * cashFlows[t]) / Math.pow(1 + guess, t + 1);
      }
    }
    if (Math.abs(dnpv) < 1e-10) break;
    const next = guess - npv / dnpv;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - guess) < 1e-7) {
      guess = next;
      break;
    }
    guess = Math.max(-0.99, next);
  }
  return guess;
}

function calcDiscountedPayback(rate: number, cashFlows: number[]) {
  let cumulative = 0;
  for (let i = 0; i < cashFlows.length; i++) {
    const discounted = cashFlows[i] / Math.pow(1 + rate, i);
    const previous = cumulative;
    cumulative += discounted;
    if (cumulative >= 0) {
      if (i === 0) return 0;
      const remaining = 0 - previous;
      const fraction = discounted !== 0 ? remaining / discounted : 0;
      return i - 1 + fraction;
    }
  }
  return null;
}

const scenarioPresets = {
  conservador: {
    engineeringGain: 0.05,
    reworkReduction: 0.1,
    infoHoursPerWeek: 0.5,
  },
  base: {
    engineeringGain: 0.08,
    reworkReduction: 0.15,
    infoHoursPerWeek: 1.0,
  },
  agressivo: {
    engineeringGain: 0.1,
    reworkReduction: 0.2,
    infoHoursPerWeek: 2.0,
  },
} as const;

type ScenarioKey = keyof typeof scenarioPresets;
type LanguageKey = "pt" | "en";
type CurrencyKey = "BRL" | "USD";

function ComosLogo({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <img
      src="/COMOS_CALCULATOR/contoso.png"
      alt="Contoso logo"
      className={className}
    />
  );
}

export default function ComosRoiCalculatorApp() {
  const [language, setLanguage] = useState<LanguageKey>("en");
  const [currency, setCurrency] = useState<CurrencyKey>("USD");
  const [scenario, setScenario] = useState<ScenarioKey>("base");
  const [mainTab, setMainTab] = useState("calculator");

  const [users, setUsers] = useState(25);
  const [hourCost, setHourCost] = useState(180);
  const [engineeringHoursMonth, setEngineeringHoursMonth] = useState(1600);
  const [infoHoursMonth, setInfoHoursMonth] = useState(220);
  const [autoBenchmarkMode, setAutoBenchmarkMode] = useState(true);
  const [reworkPct, setReworkPct] = useState(12);
  const [investment, setInvestment] = useState(650000);
  const [annualRecurring, setAnnualRecurring] = useState(120000);
  const [horizonYears, setHorizonYears] = useState(5);
  const [discountRatePct, setDiscountRatePct] = useState(12);

  const preset = scenarioPresets[scenario];
  const locale = language === "pt" ? "pt-BR" : "en-US";

  const t = {
    pt: {
      businessCase: "COMOS Business Case",
      roiCalculator: "Calculadora de ROI",
      title: "Calculadora de Retorno sobre Investimento do COMOS",
      subtitle:
        "Modelo simples e geral para estimar ganhos com eficiência de engenharia, redução de retrabalho e menor esforço para localizar e validar informação técnica.",
      benchmarkScenario: "Cenário de benchmark",
      conservative: "Conservador",
      base: "Base",
      aggressive: "Agressivo",
      mainInputs: "Entradas principais",
      language: "Idioma",
      currency: "Moeda",
      impactedUsers: "Usuários impactados",
      avgHourCost: currency === "BRL" ? "Custo médio por hora (R$)" : "Custo médio por hora (US$)",
      autoBenchmark: "Modo benchmark automático",
      autoBenchmarkDesc: "Calcula horas mensais com base no número de usuários e no cenário selecionado.",
      on: "Ligado",
      off: "Desligado",
      engPerUser: "Engenharia/doc por usuário",
      infoPerUser: "Busca/validação por usuário",
      autoHours: "Horas calculadas automaticamente",
      engDoc: "Engenharia/documentação",
      infoValidation: "Busca/validação",
      engHours: "Horas mensais de engenharia/documentação",
      infoHours: "Horas mensais de busca/validação de informação",
      estimatedRework: "Retrabalho atual estimado",
      initialInvestment: currency === "BRL" ? "Investimento inicial total (R$)" : "Investimento inicial total (US$)",
      annualRecurring: currency === "BRL" ? "Custo anual recorrente (R$)" : "Custo anual recorrente (US$)",
      horizon: "Horizonte de análise (anos)",
      discountRate: "Taxa de desconto",
      annualSavings: "Economia anual total",
      annualNet: "Fluxo líquido anual",
      accumulatedRoi: "ROI acumulado",
      simplePayback: "Payback simples",
      notReached: "Não atinge",
      years: "anos",
      financialIndicators: "Indicadores financeiros",
      discountedPayback: "Payback descontado",
      annualEngineeringCost: "Custo anual atual de engenharia",
      annualReworkCost: "Custo anual atual de retrabalho",
      annualBenefitsComposition: "Composição dos benefícios anuais",
      engineeringProductivity: "Produtividade de engenharia",
      reworkReduction: "Redução de retrabalho",
      searchValidation: "Busca e validação de informação",
      assumptionsTitle: "Premissas de conversão do cenário",
      methodology: "Metodologia e coerência dos cálculos",
      p1: "Esta calculadora usa três drivers gerais de valor: ganho de produtividade em engenharia, redução de retrabalho e redução do tempo gasto buscando ou validando informação técnica.",
      p2: "As premissas-base foram mantidas em 8% de ganho de produtividade, 15% de redução do retrabalho atual e 1 h/semana por usuário em busca/validação recuperada, por estarem coerentes e conservadoras frente ao conjunto das fontes externas.",
      p3: "Para evitar dupla contagem, o ganho de produtividade de engenharia é aplicado apenas sobre a parcela produtiva da base anual de engenharia, excluindo o retrabalho atual estimado.",
      p4: "A redução de retrabalho é aplicada somente sobre o custo anual de retrabalho atual estimado, e a economia com busca/validação é limitada pela linha de base de horas já informada no modelo.",
      p5: "No modo benchmark automático, as horas mensais são estimadas a partir do número de usuários impactados. Você ainda pode desligar esse modo para inserir valores reais do cliente quando tiver dados melhores.",
      a1: "Ganho de produtividade em engenharia",
      a2: "Redução de retrabalho",
      a3: "Redução de tempo de busca/validação",
      externalSourcesLabel: "Materias externas",
      siemensSourcesLabel: "Materias Siemens",
      assumptionHoursPerUser: "h/semana por usuário",
      hoursMonth: "h/mês",
      portuguese: "Português",
      english: "English",
      nd: "N/D",
      tabCalculator: "Calculadora",
      tabTimeline: "Análise Temporal",
      timelineTitle: "Evolução Temporal do Investimento",
      year: "Ano",
      initialInvestmentShort: "Investimento",
      annualSavingsShort: "Economia",
      netFlow: "Fluxo Líquido",
      cumulativeFlow: "Acumulado",
      discountedCumulative: "Acumulado Descontado",
      paybackMark: "Payback",
      summaryCards: "Resumo Financeiro",
      annualTable: "Tabela Anual",
      chartTitle: "Fluxo de Caixa Anual e Acumulado",
      paybackNote: "O payback ocorre quando o acumulado cruza o zero.",
      roiAtHorizon: "ROI no horizonte",
      npvLabel: "VPL (NPV)",
      irrLabel: "TIR (IRR)",
      simplePaybackLabel: "Payback simples",
      discountedPaybackLabel: "Payback descontado",
    },
    en: {
      businessCase: "COMOS Business Case",
      roiCalculator: "ROI Calculator",
      title: "COMOS Return on Investment Calculator",
      subtitle:
        "Simple and general model to estimate gains from engineering efficiency, rework reduction, and lower effort to find and validate technical information.",
      benchmarkScenario: "Benchmark scenario",
      conservative: "Conservative",
      base: "Base",
      aggressive: "Aggressive",
      mainInputs: "Main inputs",
      language: "Language",
      currency: "Currency",
      impactedUsers: "Impacted users",
      avgHourCost: currency === "BRL" ? "Average hourly cost (R$)" : "Average hourly cost (US$)",
      autoBenchmark: "Automatic benchmark mode",
      autoBenchmarkDesc: "Calculates monthly hours based on the number of users and the selected scenario.",
      on: "On",
      off: "Off",
      engPerUser: "Engineering/doc per user",
      infoPerUser: "Search/validation per user",
      autoHours: "Automatically calculated hours",
      engDoc: "Engineering/documentation",
      infoValidation: "Search/validation",
      engHours: "Monthly engineering/documentation hours",
      infoHours: "Monthly search/validation hours",
      estimatedRework: "Estimated current rework",
      initialInvestment: currency === "BRL" ? "Total initial investment (R$)" : "Total initial investment (US$)",
      annualRecurring: currency === "BRL" ? "Annual recurring cost (R$)" : "Annual recurring cost (US$)",
      horizon: "Analysis horizon (years)",
      discountRate: "Discount rate",
      annualSavings: "Total annual savings",
      annualNet: "Annual net cash flow",
      accumulatedRoi: "Accumulated ROI",
      simplePayback: "Simple payback",
      notReached: "Not reached",
      years: "years",
      financialIndicators: "Financial indicators",
      discountedPayback: "Discounted payback",
      annualEngineeringCost: "Current annual engineering cost",
      annualReworkCost: "Current annual rework cost",
      annualBenefitsComposition: "Annual benefits composition",
      engineeringProductivity: "Engineering productivity",
      reworkReduction: "Rework reduction",
      searchValidation: "Search and information validation",
      assumptionsTitle: "Scenario conversion assumptions",
      methodology: "Methodology and calculation coherence",
      p1: "This calculator uses three general value drivers: engineering productivity gain, rework reduction, and reduced time spent searching for or validating technical information.",
      p2: "The base assumptions remain 8% engineering productivity gain, 15% reduction of current rework, and 1 hour/week per user of recovered search/validation time because they are coherent and conservative against the external evidence set.",
      p3: "To avoid double counting, the engineering productivity gain is applied only to the productive portion of the annual engineering baseline, excluding the currently estimated rework.",
      p4: "Rework reduction is applied only to the estimated current annual rework cost, and search/validation savings are capped by the baseline search/validation hours already entered in the model.",
      p5: "In automatic benchmark mode, monthly hours are estimated from the number of impacted users. You can still turn this mode off to enter actual client values when better data is available.",
      a1: "Engineering productivity gain",
      a2: "Rework reduction",
      a3: "Search/validation time reduction",
      externalSourcesLabel: "External materials",
      siemensSourcesLabel: "Siemens materials",
      assumptionHoursPerUser: "h/week per user",
      hoursMonth: "h/month",
      portuguese: "Português",
      english: "English",
      nd: "N/A",
      tabCalculator: "Calculator",
      tabTimeline: "Temporal Analysis",
      timelineTitle: "Investment Timeline",
      year: "Year",
      initialInvestmentShort: "Investment",
      annualSavingsShort: "Savings",
      netFlow: "Net Flow",
      cumulativeFlow: "Cumulative",
      discountedCumulative: "Discounted Cumulative",
      paybackMark: "Payback",
      summaryCards: "Financial Summary",
      annualTable: "Annual Table",
      chartTitle: "Annual Cash Flow and Cumulative",
      paybackNote: "Payback occurs when the cumulative crosses zero.",
      roiAtHorizon: "ROI at horizon",
      npvLabel: "NPV",
      irrLabel: "IRR",
      simplePaybackLabel: "Simple payback",
      discountedPaybackLabel: "Discounted payback",
    },
  }[language];

  const benchmarkHoursPerUserMonth = useMemo(() => {
    const engineering = scenario === "conservador" ? 120 : scenario === "base" ? 140 : 160;
    const info = scenario === "conservador" ? 6 : scenario === "base" ? 9 : 12;
    return { engineering, info };
  }, [scenario]);

  const effectiveEngineeringHoursMonth = autoBenchmarkMode ? users * benchmarkHoursPerUserMonth.engineering : engineeringHoursMonth;
  const effectiveInfoHoursMonth = autoBenchmarkMode ? users * benchmarkHoursPerUserMonth.info : infoHoursMonth;

  const model = useMemo(() => {
    const annualEngineeringHours = effectiveEngineeringHoursMonth * 12;
    const annualInfoHours = effectiveInfoHoursMonth * 12;
    const annualEngineeringCost = annualEngineeringHours * hourCost;
    const annualReworkCost = annualEngineeringCost * (reworkPct / 100);
    const annualNonReworkEngineeringCost = Math.max(annualEngineeringCost - annualReworkCost, 0);

    const engineeringSavings = annualNonReworkEngineeringCost * preset.engineeringGain;
    const reworkSavings = annualReworkCost * preset.reworkReduction;

    const monthlyInfoHoursPerUser = (preset.infoHoursPerWeek * 52) / 12;
    const annualInfoSavings = Math.min(annualInfoHours, users * monthlyInfoHoursPerUser * 12) * hourCost;

    const annualBenefit = engineeringSavings + reworkSavings + annualInfoSavings;
    const annualNet = annualBenefit - annualRecurring;

    const cashFlows = [-investment, ...Array.from({ length: horizonYears }, () => annualNet)];
    const rate = discountRatePct / 100;

    const npv = calcNPV(rate, cashFlows);
    const irr = calcIRR(cashFlows);
    const roi = investment !== 0 ? ((annualNet * horizonYears - investment) / investment) * 100 : 0;
    const simplePayback = annualNet > 0 ? investment / annualNet : null;
    const discountedPayback = calcDiscountedPayback(rate, cashFlows);

    return {
      annualEngineeringCost,
      annualReworkCost,
      engineeringSavings,
      reworkSavings,
      annualInfoSavings,
      annualBenefit,
      annualNet,
      npv,
      irr,
      roi,
      simplePayback,
      discountedPayback,
    };
  }, [effectiveEngineeringHoursMonth, hourCost, reworkPct, preset, annualRecurring, users, effectiveInfoHoursMonth, investment, horizonYears, discountRatePct]);

  const timelineData = useMemo(() => {
    const rate = discountRatePct / 100;
    const rows = [];
    let cumulative = 0;
    let discountedCumulative = 0;
    for (let yr = 0; yr <= horizonYears; yr++) {
      const isYear0 = yr === 0;
      const inv = isYear0 ? investment : 0;
      const savings = isYear0 ? 0 : model.annualBenefit;
      const recurring = isYear0 ? 0 : annualRecurring;
      const net = isYear0 ? -investment : model.annualNet;
      const discountedNet = net / Math.pow(1 + rate, yr);
      cumulative += net;
      discountedCumulative += discountedNet;
      rows.push({ yr, inv, savings, recurring, net, cumulative, discountedCumulative });
    }
    return rows;
  }, [model, investment, annualRecurring, horizonYears, discountRatePct]);

  const assumptions = [
    {
      title: t.a1,
      highlight: percent(preset.engineeringGain * 100, locale),
      description:
        language === "pt"
          ? "Baseado em racional de engenharia digital integrada e benchmark de cenário."
          : "Based on integrated digital engineering rationale and scenario benchmark.",
      sources: [
        {
          label: language === "pt" ? "Chalmers systematic review sobre quantificação de valor em BIM" : "Chalmers systematic review on quantifying BIM investment value",
          url: "https://research.chalmers.se/publication/540280/file/540280_Fulltext.pdf",
          tooltip: language === "pt" ? "Revisão sistemática sobre retorno de investimento em BIM — Chalmers University" : "Systematic review on BIM investment returns — Chalmers University",
        },
        {
          label: language === "pt" ? "ScienceDirect 2024 sobre influência do BIM em tempo e custo" : "ScienceDirect 2024 on BIM influence on time and cost",
          url: "https://www.sciencedirect.com/science/article/pii/S2590123024008107",
          tooltip: language === "pt" ? "Estudo sobre impacto do BIM em prazo e custo de projetos — ScienceDirect" : "Study on BIM impact on project time and cost — ScienceDirect",
        },
        {
          label: language === "pt" ? "COMOS brochure com caso Novartis (8%–12% engineering savings)" : "COMOS brochure with Novartis case (8%–12% engineering savings)",
          url: "https://support.industry.siemens.com/cs/attachments/109765354/COMOS_Imagebroschuere_EN.pdf",
          tooltip: language === "pt" ? "Caso Novartis: 8%–12% de economia em engenharia — Siemens COMOS" : "Novartis case: 8%–12% engineering savings — Siemens COMOS",
        },
        {
          label: language === "pt" ? "PwC Global Mine 2024 — tendências de custo e produtividade" : "PwC Global Mine 2024 — cost and productivity trends",
          url: "https://www.pwc.com/gx/en/mining/assets/pwc-global-mine-2024.pdf",
          tooltip: language === "pt" ? "Panorama global de mineração: produtividade e otimização de custos — PwC" : "Global mining outlook: productivity and cost optimization — PwC",
        },
        {
          label: language === "pt" ? "McKinsey: produtividade em operações de mineração" : "McKinsey: productivity in mining operations",
          url: "https://www.mckinsey.com/industries/metals-and-mining/our-insights/productivity-in-mining-operations-reversing-the-downward-trend",
          tooltip: language === "pt" ? "Como reverter a queda de produtividade na mineração — McKinsey" : "How to reverse declining mining productivity — McKinsey",
        },
        {
          label: language === "pt" ? "McKinsey: inovação digital para produtividade em mineração" : "McKinsey: digital innovation for mining productivity",
          url: "https://www.mckinsey.com/industries/metals-and-mining/our-insights/how-digital-innovation-can-improve-mining-productivity",
          tooltip: language === "pt" ? "Inovação digital elevando a produtividade na mineração — McKinsey" : "Digital innovation boosting mining productivity — McKinsey",
        },
        {
          label: language === "pt" ? "McKinsey: excelência operacional em mineração" : "McKinsey: mining for operational excellence",
          url: "https://www.mckinsey.com/capabilities/operations/our-insights/mining-for-operational-excellence",
          tooltip: language === "pt" ? "Estratégias para excelência operacional em mineração — McKinsey" : "Strategies for operational excellence in mining — McKinsey",
        },
      ],
    },
    {
      title: t.a2,
      highlight: percent(preset.reworkReduction * 100, locale),
      description:
        language === "pt"
          ? "Aplicado sobre o custo anual estimado de retrabalho atual."
          : "Applied to the estimated current annual rework cost.",
      sources: [
        {
          label: language === "pt" ? "NIST sobre custo de interoperabilidade inadequada" : "NIST on the cost of inadequate interoperability",
          url: "https://nvlpubs.nist.gov/nistpubs/gcr/2004/nist.gcr.04-867.pdf",
          tooltip: language === "pt" ? "Custo da falta de interoperabilidade em instalações industriais — NIST" : "Cost of inadequate interoperability in industrial facilities — NIST",
        },
        {
          label: language === "pt" ? "Love, Irani e Edwards sobre rework como problema endêmico" : "Love, Irani, and Edwards on rework as an endemic problem",
          url: "https://bura.brunel.ac.uk/bitstream/2438/1730/1/01347434.pdf",
          tooltip: language === "pt" ? "Retrabalho como problema endêmico em projetos — Brunel University" : "Rework as an endemic problem in projects — Brunel University",
        },
        {
          label: language === "pt" ? "MDPI 2020 sobre redução de horas acumuladas com BIM" : "MDPI 2020 on reduced cumulative hours with BIM",
          url: "https://www.mdpi.com/2071-1050/12/21/8927",
          tooltip: language === "pt" ? "Redução de horas acumuladas em projetos com uso de BIM — MDPI" : "Reduction of cumulative project hours using BIM — MDPI",
        },
        {
          label: language === "pt" ? "PlanGrid/FMI sobre retrabalho ligado a dados ruins e má comunicação" : "PlanGrid/FMI on rework caused by bad data and miscommunication",
          url: "https://pg.plangrid.com/rs/572-JSV-775/images/Construction_Disconnected.pdf",
          tooltip: language === "pt" ? "Retrabalho causado por dados ruins e comunicação falha — PlanGrid/FMI" : "Rework driven by poor data and miscommunication — PlanGrid/FMI",
        },
        {
          label:
            language === "pt"
              ? "COMOS brochure (base integrada para reduzir inconsistências e retrabalho)"
              : "COMOS brochure (integrated data foundation to reduce inconsistencies and rework)",
          url: "https://support.industry.siemens.com/cs/attachments/109765354/COMOS_Imagebroschuere_EN.pdf",
          tooltip: language === "pt" ? "Base de dados integrada para reduzir inconsistências — Siemens COMOS" : "Integrated data foundation to cut inconsistencies — Siemens COMOS",
        },
        {
          label: language === "pt" ? "Deloitte/Siemens: digital twin e empresa baseada em modelo" : "Deloitte/Siemens: digital twin and the model-based enterprise",
          url: "https://blogs.sw.siemens.com/thought-leadership/2023/04/05/deloitte-siemens-and-the-model-based-enterprise-the-future-of-the-digital-twin/",
          tooltip: language === "pt" ? "Digital twin como base para reduzir retrabalho em engenharia — Deloitte/Siemens" : "Digital twin as foundation to reduce engineering rework — Deloitte/Siemens",
        },
        {
          label: language === "pt" ? "Deloitte: aplicações de digital twin — ponte entre físico e digital" : "Deloitte: digital twin applications — bridging physical and digital",
          url: "https://www2.deloitte.com/us/en/insights/focus/tech-trends/2020/digital-twin-applications-bridging-the-physical-and-digital.html",
          tooltip: language === "pt" ? "Aplicações de gêmeo digital para eliminar erros e retrabalho — Deloitte" : "Digital twin applications eliminating errors and rework — Deloitte",
        },
        {
          label: language === "pt" ? "Deloitte: estratégia de digital twin para redução de riscos" : "Deloitte: digital twin strategy for risk reduction",
          url: "https://www.deloitte.com/us/en/insights/topics/business-strategy-growth/digital-twin-strategy.html",
          tooltip: language === "pt" ? "Estratégia de gêmeo digital para minimizar riscos e retrabalho — Deloitte" : "Digital twin strategy to minimize risk and rework — Deloitte",
        },
      ],
    },
    {
      title: t.a3,
      highlight: `${numberFmt(preset.infoHoursPerWeek, locale, 1)} ${t.assumptionHoursPerUser}`,
      description:
        language === "pt"
          ? "Conversão geral para eficiência na localização e validação da informação."
          : "General conversion for efficiency in finding and validating information.",
      sources: [
        {
          label: language === "pt" ? "McKinsey The Social Economy" : "McKinsey The Social Economy",
          url: "https://www.mckinsey.com/industries/technology-media-and-telecommunications/our-insights/the-social-economy",
          tooltip: language === "pt" ? "Valor da economia social e busca de informação — McKinsey" : "Value of the social economy and information search — McKinsey",
        },
        {
          label: language === "pt" ? "McKinsey Capturing business value with social technologies" : "McKinsey Capturing business value with social technologies",
          url: "https://www.mckinsey.com/~/media/McKinsey/Industries/Technology%20Media%20and%20Telecommunications/High%20Tech/Our%20Insights/Capturing%20business%20value%20with%20social%20technologies/Capturing%20business%20value%20with%20social%20technologies.pdf",
          tooltip: language === "pt" ? "Captura de valor com tecnologias sociais na busca de informação — McKinsey" : "Capturing value with social technologies in information search — McKinsey",
        },
        {
          label: language === "pt" ? "Deloitte Access Economics 2025 sobre adoção digital na construção" : "Deloitte Access Economics 2025 on digital adoption in construction",
          url: "https://www.deloitte.com/au/en/services/economics/analysis/state-digital-adoption-construction-industry.html",
          tooltip: language === "pt" ? "Estado da adoção digital na construção e acesso à informação — Deloitte" : "State of digital adoption in construction and information access — Deloitte",
        },
        {
          label:
            language === "pt"
              ? "COMOS brochure (single source of truth e fluxo contínuo da informação)"
              : "COMOS brochure (single source of truth and continuous flow of information)",
          url: "https://support.industry.siemens.com/cs/attachments/109765354/COMOS_Imagebroschuere_EN.pdf",
          tooltip: language === "pt" ? "Fonte única de verdade e fluxo contínuo de informação — Siemens COMOS" : "Single source of truth and continuous information flow — Siemens COMOS",
        },
        {
          label: language === "pt" ? "Siemens: mina digital — gestão de informação no ciclo de vida" : "Siemens: digital mine — lifecycle information management",
          url: "https://assets.new.siemens.com/siemens/assets/api/uuid:b773dc99-f6c6-4747-96c9-0395b98c39e8/minerals-days-chile-digital-mine-roland-ehrl.pdf",
          tooltip: language === "pt" ? "Gestão de informação da mina digital no ciclo de vida — Siemens" : "Digital mine lifecycle information management — Siemens",
        },
        {
          label: language === "pt" ? "Siemens: ferramenta de colaboração digital para mineração" : "Siemens: digital collaboration tool for mining operations",
          url: "https://resources.sw.siemens.com/en-US/solution-brief-mining-operations-digital-collaboration-tool/",
          tooltip: language === "pt" ? "Colaboração digital para acesso rápido a dados de operação — Siemens" : "Digital collaboration for quick access to operations data — Siemens",
        },
        {
          label: language === "pt" ? "Siemens: excelência digital no ciclo de vida da mineração" : "Siemens: digital lifecycle excellence for mining",
          url: "https://blogs.sw.siemens.com/energy-utilities/2023/07/07/digital-lifecycle-excellence-for-mining/",
          tooltip: language === "pt" ? "Excelência no ciclo de vida digital para mineração — Siemens" : "Digital lifecycle excellence for mining operations — Siemens",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/10 bg-[#2BAAAB] px-5 py-3 text-white shadow-lg md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <ComosLogo className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold tracking-brand text-lg">COMOS</span>
                <span className="text-white/30 text-xl">|</span>
                <span className="text-sm uppercase tracking-[0.24em] text-white/70">by Siemens</span>
              </div>
              <div className="text-sm text-white/75">Siemens Digital Industries Software</div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[390px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5 backdrop-blur">
              <Label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                <Languages className="h-4 w-4" />
                {t.language}
              </Label>
              <Tabs value={language} onValueChange={(v) => setLanguage(v as LanguageKey)}>
                <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl bg-white/10 p-1 text-white/70">
                  <TabsTrigger value="pt" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950">{t.portuguese}</TabsTrigger>
                  <TabsTrigger value="en" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950">{t.english}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5 backdrop-blur">
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{t.currency}</Label>
              <Tabs value={currency} onValueChange={(v) => setCurrency(v as CurrencyKey)}>
                <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl bg-white/10 p-1 text-white/70">
                  <TabsTrigger value="BRL" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950">BRL (R$)</TabsTrigger>
                  <TabsTrigger value="USD" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950">USD (US$)</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </header>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <div className="border-b border-border/60 bg-white px-4 md:px-6 xl:px-8">
          <div className="mx-auto max-w-7xl">
            <TabsList className="mt-0 h-12 gap-1 rounded-none border-0 bg-transparent p-0">
              <TabsTrigger
                value="calculator"
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-500 data-[state=active]:border-[#2BAAAB] data-[state=active]:bg-transparent data-[state=active]:text-[#2BAAAB] data-[state=active]:shadow-none"
              >
                <Calculator className="h-4 w-4" />
                {t.tabCalculator}
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-500 data-[state=active]:border-[#2BAAAB] data-[state=active]:bg-transparent data-[state=active]:text-[#2BAAAB] data-[state=active]:shadow-none"
              >
                <LineChartIcon className="h-4 w-4" />
                {t.tabTimeline}
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="calculator" className="mt-0">
      <div className="px-4 py-5 md:px-6 md:py-8 xl:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <div className="space-y-3">
          <div className="w-full rounded-[1.75rem] border border-border/70 bg-gradient-to-br from-white via-white to-slate-50/80 p-5 shadow-sm md:p-6">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">
              <span className="text-[#2BAAAB]">{t.businessCase}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden="true" />
              <span>{t.roiCalculator}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">{t.title}</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 md:text-base">{t.subtitle}</p>
          </div>

          <section
            aria-label={t.benchmarkScenario}
            className="w-full rounded-[1.75rem] border border-border/70 bg-white/90 p-4 shadow-sm"
          >
            <Label className="mb-2 block text-sm text-slate-600">{t.benchmarkScenario}</Label>
            <Tabs value={scenario} onValueChange={(v) => setScenario(v as ScenarioKey)}>
              <TabsList className="grid h-11 w-full grid-cols-3 rounded-2xl">
                <TabsTrigger value="conservador" className="rounded-xl">{t.conservative}</TabsTrigger>
                <TabsTrigger value="base" className="rounded-xl">{t.base}</TabsTrigger>
                <TabsTrigger value="agressivo" className="rounded-xl">{t.aggressive}</TabsTrigger>
              </TabsList>
            </Tabs>
          </section>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 rounded-3xl shadow-sm border border-border/60">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-slate-700"><Calculator className="h-5 w-5 text-[#2BAAAB]" /> {t.mainInputs}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <Field label={t.impactedUsers} value={users} setValue={setUsers} />
              <Field label={t.avgHourCost} value={hourCost} setValue={setHourCost} step="10" />

              <div className="rounded-2xl border border-border bg-secondary/50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{t.autoBenchmark}</div>
                    <div className="text-xs text-muted-foreground">{t.autoBenchmarkDesc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoBenchmarkMode((v) => !v)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${autoBenchmarkMode ? "bg-[#2BAAAB] text-white shadow-sm" : "bg-white text-slate-600 border border-border hover:border-slate-400"}`}
                  >
                    {autoBenchmarkMode ? t.on : t.off}
                  </button>
                </div>

                {autoBenchmarkMode ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white border border-slate-200 p-3">
                      <div className="text-slate-500">{t.engPerUser}</div>
                      <div className="text-lg font-semibold">{benchmarkHoursPerUserMonth.engineering} {t.hoursMonth}</div>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-200 p-3">
                      <div className="text-slate-500">{t.infoPerUser}</div>
                      <div className="text-lg font-semibold">{benchmarkHoursPerUserMonth.info} {t.hoursMonth}</div>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-200 p-3 col-span-2">
                      <div className="text-slate-500">{t.autoHours}</div>
                      <div className="mt-1 text-sm text-slate-700">
                        {t.engDoc}: <span className="font-semibold">{numberFmt(effectiveEngineeringHoursMonth, locale, 0)} {t.hoursMonth}</span>
                        <span className="mx-2">•</span>
                        {t.infoValidation}: <span className="font-semibold">{numberFmt(effectiveInfoHoursMonth, locale, 0)} {t.hoursMonth}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <Field label={t.engHours} value={engineeringHoursMonth} setValue={setEngineeringHoursMonth} step="10" />
                    <Field label={t.infoHours} value={infoHoursMonth} setValue={setInfoHoursMonth} step="10" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t.estimatedRework}</Label>
                  <span className="text-sm font-medium text-slate-700">{reworkPct}%</span>
                </div>
                <Slider value={[reworkPct]} onValueChange={(v) => setReworkPct(v[0])} min={0} max={30} step={1} />
              </div>

              <Separator />

              <Field label={t.initialInvestment} value={investment} setValue={setInvestment} step="10000" />
              <Field label={t.annualRecurring} value={annualRecurring} setValue={setAnnualRecurring} step="5000" />
              <Field label={t.horizon} value={horizonYears} setValue={setHorizonYears} min="1" max="15" />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t.discountRate}</Label>
                  <span className="text-sm font-medium text-slate-700">{discountRatePct}%</span>
                </div>
                <Slider value={[discountRatePct]} onValueChange={(v) => setDiscountRatePct(v[0])} min={0} max={30} step={1} />
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 grid gap-6">
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard title={t.annualSavings} value={formatCurrency(model.annualBenefit, locale, currency)} icon={<TrendingUp className="h-5 w-5" />} />
              <MetricCard title={t.annualNet} value={formatCurrency(model.annualNet, locale, currency)} icon={<BarChart3 className="h-5 w-5" />} />
              <MetricCard title={t.accumulatedRoi} value={percent(model.roi, locale)} icon={<FileBarChart2 className="h-5 w-5" />} />
              <MetricCard
                title={t.simplePayback}
                value={model.simplePayback ? `${numberFmt(model.simplePayback, locale, 1)} ${t.years}` : t.notReached}
                icon={<Clock3 className="h-5 w-5" />}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="rounded-3xl shadow-sm border border-border/60">
                <CardHeader className="border-b border-border/50 pb-4">
                  <CardTitle className="text-lg text-slate-700">{t.financialIndicators}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm pt-5">
                  <KeyValue label="VPL / NPV" value={formatCurrency(model.npv, locale, currency)} />
                  <KeyValue label="TIR / IRR" value={Number.isFinite(model.irr) ? percent(model.irr * 100, locale) : t.nd} />
                  <KeyValue label={t.discountedPayback} value={model.discountedPayback ? `${numberFmt(model.discountedPayback, locale, 1)} ${t.years}` : t.notReached} />
                  <KeyValue label={t.annualEngineeringCost} value={formatCurrency(model.annualEngineeringCost, locale, currency)} />
                  <KeyValue label={t.annualReworkCost} value={formatCurrency(model.annualReworkCost, locale, currency)} />
                </CardContent>
              </Card>

              <Card className="rounded-3xl shadow-sm border border-border/60">
                <CardHeader className="border-b border-border/50 pb-4">
                  <CardTitle className="text-lg text-slate-700">{t.annualBenefitsComposition}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <BenefitBar label={t.engineeringProductivity} value={model.engineeringSavings} total={model.annualBenefit} currency={currency} locale={locale} />
                  <BenefitBar label={t.reworkReduction} value={model.reworkSavings} total={model.annualBenefit} currency={currency} locale={locale} />
                  <BenefitBar label={t.searchValidation} value={model.annualInfoSavings} total={model.annualBenefit} currency={currency} locale={locale} />
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-3xl shadow-sm border border-border/60">
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-700"><RefreshCcw className="h-5 w-5 text-[#2BAAAB]" /> {t.assumptionsTitle}</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid md:grid-cols-3 gap-4">
                  {assumptions.map((item) => (
                    <article key={item.title} className="flex flex-col justify-between rounded-3xl border border-border/80 bg-white/80 p-5 shadow-sm">
                      <div className="space-y-3">
                        <h4 className="text-sm leading-7 text-slate-600">{item.title}</h4>
                        <strong className="block text-[2rem] font-semibold leading-tight tracking-tight text-[#2BAAAB]">{item.highlight}</strong>
                        <div className="max-w-xs text-sm leading-7 text-slate-700">{item.description}</div>
                      </div>
                      <SourceList
                        sources={item.sources}
                        itemTitle={item.title}
                        externalSourcesLabel={t.externalSourcesLabel}
                        siemensSourcesLabel={t.siemensSourcesLabel}
                      />
                    </article>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm border border-border/60">
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="text-lg text-slate-700">{t.methodology}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 leading-6 space-y-3 pt-5">
                <p>{t.p1}</p>
                <p>{t.p2}</p>
                <p>{t.p3}</p>
                <p>{t.p4}</p>
                <p>{t.p5}</p>
              </CardContent>
            </Card>
          </div>
                  <div className="pt-2 text-center text-sm text-slate-500">
            <span>By </span>
            <span className="font-medium text-slate-700">Tadeu Martins PMP, MBA</span>
            <span className="mx-2">•</span>
            <a
              href="https://www.linkedin.com/in/tadeu-martins-pmp-tecnologia-industria-engenharia-transformacao-digital-projetos-gestao-inovacao/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-slate-900"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
      </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-0">
          <TimelineTab
            model={model}
            timelineData={timelineData}
            investment={investment}
            horizonYears={horizonYears}
            currency={currency}
            locale={locale}
            t={t}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type TranslationT = {
  year: string;
  initialInvestmentShort: string;
  annualSavingsShort: string;
  netFlow: string;
  cumulativeFlow: string;
  discountedCumulative: string;
  paybackMark: string;
  summaryCards: string;
  annualTable: string;
  chartTitle: string;
  paybackNote: string;
  roiAtHorizon: string;
  npvLabel: string;
  irrLabel: string;
  simplePaybackLabel: string;
  discountedPaybackLabel: string;
  notReached: string;
  years: string;
  nd: string;
  timelineTitle: string;
  [key: string]: string;
};

type TimelineRow = {
  yr: number;
  inv: number;
  savings: number;
  recurring: number;
  net: number;
  cumulative: number;
  discountedCumulative: number;
};

type ModelResult = {
  annualBenefit: number;
  annualNet: number;
  npv: number;
  irr: number;
  roi: number;
  simplePayback: number | null;
  discountedPayback: number | null;
  [key: string]: unknown;
};

function TimelineTab({
  model,
  timelineData,
  investment,
  horizonYears,
  currency,
  locale,
  t,
}: {
  model: ModelResult;
  timelineData: TimelineRow[];
  investment: number;
  horizonYears: number;
  currency: CurrencyKey;
  locale: string;
  t: TranslationT;
}) {
  const paybackYear = model.simplePayback != null ? Math.ceil(model.simplePayback) : null;

  const chartData = timelineData.map((row) => ({
    name: `${t.year} ${row.yr}`,
    [t.initialInvestmentShort]: row.yr === 0 ? row.inv : undefined,
    [t.annualSavingsShort]: row.yr > 0 ? row.savings : undefined,
    [t.cumulativeFlow]: row.cumulative,
    [t.discountedCumulative]: row.discountedCumulative,
  }));

  const fmtCur = (v: number) => formatCurrency(v, locale, currency);
  const fmtPct = (v: number) => percent(v, locale);
  const fmtYrs = (v: number | null) =>
    v != null ? `${numberFmt(v, locale, 1)} ${t.years}` : t.notReached;

  return (
    <div className="px-4 py-6 md:px-6 md:py-8 xl:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="w-full rounded-[1.75rem] border border-border/70 bg-gradient-to-br from-white via-white to-slate-50/80 p-5 shadow-sm md:p-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">{t.timelineTitle}</h2>
          <p className="mt-1 text-sm text-slate-500">{t.paybackNote}</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title={t.roiAtHorizon} value={fmtPct(model.roi)} icon={<FileBarChart2 className="h-5 w-5" />} />
          <MetricCard title={t.npvLabel} value={fmtCur(model.npv)} icon={<TrendingUp className="h-5 w-5" />} />
          <MetricCard
            title={t.irrLabel}
            value={Number.isFinite(model.irr) ? fmtPct(model.irr * 100) : t.nd}
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <MetricCard title={t.simplePaybackLabel} value={fmtYrs(model.simplePayback)} icon={<Clock3 className="h-5 w-5" />} />
        </div>

        {/* Chart */}
        <Card className="rounded-3xl shadow-sm border border-border/60">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg text-slate-700">{t.chartTitle}</CardTitle>
          </CardHeader>
          <CardContent className="pt-5 pb-2">
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis
                  tickFormatter={(v: number) =>
                    new Intl.NumberFormat(locale, {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(v)
                  }
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  width={72}
                />
                <Tooltip
                  formatter={(value: TooltipValueType | undefined, name: number | string | undefined) =>
                    [fmtCur(Number(value ?? 0)), name ?? ""] as [string, string]
                  }
                  contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
                {paybackYear != null && paybackYear <= horizonYears && (
                  <ReferenceLine
                    x={`${t.year} ${paybackYear}`}
                    stroke="#f59e0b"
                    strokeDasharray="4 2"
                    label={{ value: t.paybackMark, position: "top", fontSize: 11, fill: "#f59e0b" }}
                  />
                )}
                <Bar dataKey={t.initialInvestmentShort} fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={48} />
                <Bar dataKey={t.annualSavingsShort} fill="#2BAAAB" radius={[6, 6, 0, 0]} maxBarSize={48} />
                <Line type="monotone" dataKey={t.cumulativeFlow} stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey={t.discountedCumulative} stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Annual table */}
        <Card className="rounded-3xl shadow-sm border border-border/60">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg text-slate-700">{t.annualTable}</CardTitle>
          </CardHeader>
          <CardContent className="pt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 pr-4 text-left font-medium">{t.year}</th>
                  <th className="pb-3 pr-4 text-right font-medium">{t.initialInvestmentShort}</th>
                  <th className="pb-3 pr-4 text-right font-medium">{t.annualSavingsShort}</th>
                  <th className="pb-3 pr-4 text-right font-medium">{t.netFlow}</th>
                  <th className="pb-3 pr-4 text-right font-medium">{t.cumulativeFlow}</th>
                  <th className="pb-3 text-right font-medium">{t.discountedCumulative}</th>
                </tr>
              </thead>
              <tbody>
                {timelineData.map((row) => {
                  const isPaybackYear = paybackYear === row.yr && row.yr > 0;
                  return (
                    <tr
                      key={row.yr}
                      className={`border-b border-slate-100 last:border-0 ${isPaybackYear ? "bg-amber-50" : ""}`}
                    >
                      <td className="py-2.5 pr-4 font-medium text-slate-700">
                        {row.yr}
                        {isPaybackYear && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                            {t.paybackMark}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-slate-600">{row.inv > 0 ? fmtCur(row.inv) : "–"}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-600">{row.savings > 0 ? fmtCur(row.savings) : "–"}</td>
                      <td className={`py-2.5 pr-4 text-right font-medium ${row.net >= 0 ? "text-[#2BAAAB]" : "text-red-500"}`}>
                        {fmtCur(row.net)}
                      </td>
                      <td className={`py-2.5 pr-4 text-right font-semibold ${row.cumulative >= 0 ? "text-[#2BAAAB]" : "text-slate-700"}`}>
                        {fmtCur(row.cumulative)}
                      </td>
                      <td className={`py-2.5 text-right font-medium ${row.discountedCumulative >= 0 ? "text-[#2BAAAB]" : "text-slate-500"}`}>
                        {fmtCur(row.discountedCumulative)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Extra financial indicators */}
        <Card className="rounded-3xl shadow-sm border border-border/60">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg text-slate-700">
              {t.summaryCards}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm pt-5">
            <KeyValue label={t.npvLabel} value={fmtCur(model.npv)} />
            <KeyValue label={t.irrLabel} value={Number.isFinite(model.irr) ? fmtPct(model.irr * 100) : t.nd} />
            <KeyValue label={t.simplePaybackLabel} value={fmtYrs(model.simplePayback)} />
            <KeyValue label={t.discountedPaybackLabel} value={fmtYrs(model.discountedPayback)} />
            <KeyValue label={t.roiAtHorizon} value={fmtPct(model.roi)} />
          </CardContent>
        </Card>

        <div className="pt-2 text-center text-sm text-slate-500">
          <span>By </span>
          <span className="font-medium text-slate-700">Tadeu Martins PMP, MBA</span>
          <span className="mx-2">•</span>
          <a
            href="https://www.linkedin.com/in/tadeu-martins-pmp-tecnologia-industria-engenharia-transformacao-digital-projetos-gestao-inovacao/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-slate-900"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  setValue,
  step = "1",
  min,
  max,
}: {
  label: string;
  value: number;
  setValue: (value: number) => void;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => setValue(Number(e.target.value || 0))}
        className="rounded-2xl h-11"
      />
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="rounded-3xl shadow-sm border-0">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-slate-500 font-medium">{title}</div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2BAAAB]/10 text-[#2BAAAB]">{icon}</div>
        </div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900 text-right">{value}</span>
    </div>
  );
}

function BenefitBar({ label, value, total, currency, locale }: { label: string; value: number; total: number; currency: CurrencyKey; locale: string }) {
  const width = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold">{formatCurrency(value, locale, currency)}</span>
      </div>
      <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-[#2BAAAB]" style={{ width: `${Math.max(0, Math.min(100, width))}%` }} />
      </div>
    </div>
  );
}

function isSiemensSource(url: string) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.includes("siemens.");
  } catch {
    return false;
  }
}

function resolveSourceUrl(url: string) {
  return url;
}

function SourceList({
  sources,
  itemTitle,
  externalSourcesLabel,
  siemensSourcesLabel,
}: {
  sources: Array<{ label: string; url: string; tooltip?: string }>;
  itemTitle: string;
  externalSourcesLabel: string;
  siemensSourcesLabel: string;
}) {
  const groupedSources = [
    {
      label: externalSourcesLabel,
      items: sources.filter((source) => !isSiemensSource(source.url)),
    },
    {
      label: siemensSourcesLabel,
      items: sources.filter((source) => isSiemensSource(source.url)),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="mt-4 space-y-1.5">
      {groupedSources.map((group) => (
        <div key={group.label} className="space-y-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{group.label}</div>
          <ul className="flex flex-wrap gap-1">
            {group.items.map((source, idx) => {
              const tipId = `tip-${group.label}-${idx}`;
              return (
                <li key={source.url} className="relative group/tip">
                  <a
                    href={resolveSourceUrl(source.url)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${itemTitle}: ${group.label} — ${source.label}`}
                    aria-describedby={tipId}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    <Link2 className="h-2.5 w-2.5 shrink-0" />
                    <span className="sr-only">{source.label}</span>
                  </a>
                  <span
                    id={tipId}
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1 text-[11px] leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100"
                  >
                    {source.tooltip || source.label}
                    <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
