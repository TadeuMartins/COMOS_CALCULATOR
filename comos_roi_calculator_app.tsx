import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { BarChart3, Calculator, TrendingUp, Clock3, RefreshCcw, FileBarChart2, Languages, Link2 } from "lucide-react";

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
      src="/COMOS_CALCULATOR/comos-logo.svg"
      alt="COMOS logo"
      className={className}
    />
  );
}

export default function ComosRoiCalculatorApp() {
  const [language, setLanguage] = useState<LanguageKey>("en");
  const [currency, setCurrency] = useState<CurrencyKey>("USD");
  const [scenario, setScenario] = useState<ScenarioKey>("base");

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
      p6: "Para uma versão mais robusta, você pode complementar o app com evidências internas, benchmark do setor e ganhos adicionais de handover, operação e manutenção.",
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
      p6: "For a more robust version, you can complement the app with internal evidence, industry benchmarks, and additional handover, operations, and maintenance gains.",
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
        },
        {
          label: language === "pt" ? "ScienceDirect 2024 sobre influência do BIM em tempo e custo" : "ScienceDirect 2024 on BIM influence on time and cost",
          url: "https://www.sciencedirect.com/science/article/pii/S2590123024008107",
        },
        {
          label: language === "pt" ? "COMOS brochure com caso Novartis (8%–12% engineering savings)" : "COMOS brochure with Novartis case (8%–12% engineering savings)",
          url: "https://support.industry.siemens.com/cs/attachments/109765354/COMOS_Imagebroschuere_EN.pdf",
        },
        {
          label: language === "pt" ? "Making Water Work (até 20% shorter engineering time)" : "Making Water Work (up to 20% shorter engineering time)",
          url: "https://assets.new.siemens.com/siemens/assets/api/uuid%3A5be03374-4417-418a-afaa-2e80517b9ca7/pibr-b10020-0320-making-water-work.pdf",
        },
        {
          label: language === "pt" ? "COMOS for EPC (engineering workflows accelerated)" : "COMOS for EPC (engineering workflows accelerated)",
          url: "https://assets.new.siemens.com/siemens/assets/api/uuid%3A36e6fda0-c1ee-4c93-83f8-caaa477ac03d/sie-onepager-comos-for-epc-en-iedit-v260618.pdf",
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
        },
        {
          label: language === "pt" ? "Love, Irani e Edwards sobre rework como problema endêmico" : "Love, Irani, and Edwards on rework as an endemic problem",
          url: "https://bura.brunel.ac.uk/bitstream/2438/1730/1/01347434.pdf",
        },
        {
          label: language === "pt" ? "MDPI 2020 sobre redução de horas acumuladas com BIM" : "MDPI 2020 on reduced cumulative hours with BIM",
          url: "https://www.mdpi.com/2071-1050/12/21/8927",
        },
        {
          label: language === "pt" ? "PlanGrid/FMI sobre retrabalho ligado a dados ruins e má comunicação" : "PlanGrid/FMI on rework caused by bad data and miscommunication",
          url: "https://pg.plangrid.com/rs/572-JSV-775/images/Construction_Disconnected.pdf",
        },
        {
          label: language === "pt" ? "COMOS for EPC (reduction of errors and reworking)" : "COMOS for EPC (reduction of errors and reworking)",
          url: "https://assets.new.siemens.com/siemens/assets/api/uuid%3A36e6fda0-c1ee-4c93-83f8-caaa477ac03d/sie-onepager-comos-for-epc-en-iedit-v260618.pdf",
        },
        {
          label: language === "pt" ? "COMOS Process (eliminação de entradas manuais e checagens demoradas)" : "COMOS Process (elimination of manual entry and time-consuming checks)",
          url: "https://assets.new.siemens.com/siemens/assets/api/uuid%3Ac9dcb8d2-4fdb-4bb7-88b6-820b5835e12e/comos-process-en.pdf",
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
        },
        {
          label: language === "pt" ? "McKinsey Capturing business value with social technologies" : "McKinsey Capturing business value with social technologies",
          url: "https://www.mckinsey.com/~/media/McKinsey/Industries/Technology%20Media%20and%20Telecommunications/High%20Tech/Our%20Insights/Capturing%20business%20value%20with%20social%20technologies/Capturing%20business%20value%20with%20social%20technologies.pdf",
        },
        {
          label: language === "pt" ? "Deloitte Access Economics 2025 sobre adoção digital na construção" : "Deloitte Access Economics 2025 on digital adoption in construction",
          url: "https://www.deloitte.com/au/en/services/economics/analysis/state-digital-adoption-construction-industry.html",
        },
        {
          label: language === "pt" ? "COMOS Lifecycle (common database e seamless flow of information)" : "COMOS Lifecycle (common database and seamless flow of information)",
          url: "https://siemens.ebene1.org/comos-lifecycle/pdf/comos_lifecycle_en.pdf",
        },
        {
          label: language === "pt" ? "COMOS brochure (making data work e single source of truth)" : "COMOS brochure (making data work and single source of truth)",
          url: "https://support.industry.siemens.com/cs/attachments/109765354/COMOS_Imagebroschuere_EN.pdf",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/10 bg-[#2BAAAB] px-6 py-4 text-white shadow-lg md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <ComosLogo className="h-8 w-8" />
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

          <div className="grid gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[430px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
              <Label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                <Languages className="h-4 w-4" />
                {t.language}
              </Label>
              <Tabs value={language} onValueChange={(v) => setLanguage(v as LanguageKey)}>
                <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-white/10 p-1 text-white/70">
                  <TabsTrigger value="pt" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950">{t.portuguese}</TabsTrigger>
                  <TabsTrigger value="en" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950">{t.english}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{t.currency}</Label>
              <Tabs value={currency} onValueChange={(v) => setCurrency(v as CurrencyKey)}>
                <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-white/10 p-1 text-white/70">
                  <TabsTrigger value="BRL" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950">BRL (R$)</TabsTrigger>
                  <TabsTrigger value="USD" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950">USD (US$)</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)] xl:items-start">
          <div className="rounded-[2rem] border border-border/70 bg-gradient-to-br from-white via-white to-slate-50/80 p-6 shadow-sm md:p-8">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">
              <span className="text-[#2BAAAB]">{t.businessCase}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden="true" />
              <span>{t.roiCalculator}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">{t.title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">{t.subtitle}</p>
          </div>

          <section
            aria-label={t.benchmarkScenario}
            className="w-full rounded-[2rem] border border-border/70 bg-white/90 p-5 shadow-sm xl:max-w-[420px] xl:justify-self-end"
          >
            <Label className="mb-2 block text-slate-600">{t.benchmarkScenario}</Label>
            <Tabs value={scenario} onValueChange={(v) => setScenario(v as ScenarioKey)}>
              <TabsList className="grid h-12 w-full grid-cols-3 rounded-2xl">
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
                <p>{t.p6}</p>
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

function SourceList({
  sources,
  itemTitle,
  externalSourcesLabel,
  siemensSourcesLabel,
}: {
  sources: Array<{ label: string; url: string }>;
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
    <div className="mt-6 space-y-3">
      {groupedSources.map((group) => (
        <div key={group.label} className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{group.label}</div>
          <ul className="flex flex-wrap gap-2">
            {group.items.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${itemTitle}: ${group.label} — ${source.label}`}
                  title={source.label}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                >
                  <Link2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="sr-only">{source.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
