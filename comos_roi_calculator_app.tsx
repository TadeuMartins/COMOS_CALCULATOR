import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
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
    engineeringGain: 0.12,
    reworkReduction: 0.25,
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
  const [language, setLanguage] = useState<LanguageKey>("pt");
  const [currency, setCurrency] = useState<CurrencyKey>("BRL");
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
      methodology: "Metodologia resumida",
      p1: "Esta calculadora usa três drivers gerais de valor: ganho de produtividade em engenharia, redução de retrabalho e redução do tempo gasto buscando ou validando informação técnica.",
      p2: "O objetivo é oferecer uma estimativa executiva simples para business case, sem depender de um diagnóstico detalhado do cliente. Os fatores variam conforme o cenário selecionado.",
      p3: "No modo benchmark automático, as horas mensais são estimadas a partir do número de usuários impactados. Você ainda pode desligar esse modo para inserir valores reais do cliente quando tiver dados melhores.",
      p4: "Para uma versão mais robusta, você pode complementar o app com evidências internas, benchmark do setor e ganhos adicionais de handover, operação e manutenção.",
      a1: "Ganho de produtividade em engenharia",
      a1n: "Baseado em racional de engenharia digital integrada e benchmark de cenário.",
      a2: "Redução de retrabalho",
      a2n: "Aplicado sobre o custo anual estimado de retrabalho atual.",
      a3: "Redução de tempo de busca/validação",
      a3n: "Conversão geral para eficiência na localização e validação da informação.",
      hoursWeekUser: "h/semana por usuário",
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
      methodology: "Methodology summary",
      p1: "This calculator uses three general value drivers: engineering productivity gain, rework reduction, and reduced time spent searching for or validating technical information.",
      p2: "The goal is to provide a simple executive estimate for a business case without depending on a detailed client diagnosis. Factors vary according to the selected scenario.",
      p3: "In automatic benchmark mode, monthly hours are estimated from the number of impacted users. You can still turn this mode off to enter actual client values when better data is available.",
      p4: "For a more robust version, you can complement the app with internal evidence, industry benchmarks, and additional handover, operations, and maintenance gains.",
      a1: "Engineering productivity gain",
      a1n: "Based on integrated digital engineering rationale and scenario benchmark.",
      a2: "Rework reduction",
      a2n: "Applied to the estimated current annual rework cost.",
      a3: "Search/validation time reduction",
      a3n: "General conversion for efficiency in finding and validating information.",
      hoursWeekUser: "h/week per user",
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

    const engineeringSavings = annualEngineeringCost * preset.engineeringGain;
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
      value: percent(scenarioPresets[scenario].engineeringGain * 100, locale),
      note: t.a1n,
      sources: [
        {
          label: language === "pt" ? "Siemens COMOS: smart templates e single source of truth" : "Siemens COMOS: smart templates and single source of truth",
          url: "https://www.siemens.com/en-us/products/comos/",
        },
        {
          label: language === "pt" ? "Siemens COMOS Modularized Engineering" : "Siemens COMOS Modularized Engineering",
          url: "https://www.siemens.com/en-us/products/comos/modularized-engineering/",
        },
      ],
    },
    {
      title: t.a2,
      value: percent(scenarioPresets[scenario].reworkReduction * 100, locale),
      note: t.a2n,
      sources: [
        {
          label: language === "pt" ? "Siemens COMOS Portfolio: compress schedules and cut rework" : "Siemens COMOS Portfolio: compress schedules and cut rework",
          url: "https://www.siemens.com/en-us/products/comos/portfolio/",
        },
        {
          label: language === "pt" ? "McKinsey: digital transformation in capital projects" : "McKinsey: digital transformation in capital projects",
          url: "https://www.mckinsey.com/~/media/McKinsey/Industries/Capital%20Projects%20and%20Infrastructure/Our%20Insights/Navigating%20the%20digital%20future%20The%20disruption%20of%20capital%20projects/Navigating-the-digital-future-The-disruption-of-capital-projects.pdf",
        },
      ],
    },
    {
      title: t.a3,
      value: `${numberFmt(scenarioPresets[scenario].infoHoursPerWeek, locale, 1)} ${t.hoursWeekUser}`,
      note: t.a3n,
      sources: [
        {
          label: language === "pt" ? "McKinsey: knowledge workers and search time" : "McKinsey: knowledge workers and search time",
          url: "https://www.mckinsey.com/~/media/mckinsey/dotcom/client_service/high%20tech/pdfs/impact_of_internet_technologies_search_final2.ashx",
        },
        {
          label: language === "pt" ? "McKinsey: social technologies and time recovered" : "McKinsey: social technologies and time recovered",
          url: "https://www.mckinsey.com/~/media/mckinsey/industries/technology%20media%20and%20telecommunications/high%20tech/our%20insights/the%20social%20economy/mgi_the_social_economy_full_report.pdf",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Professional top header band */}
      <header className="bg-[#2BAAAB] text-white px-6 md:px-10 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <ComosLogo className="h-9 w-9" />
          <span className="font-bold tracking-brand text-lg">COMOS</span>
          <span className="mx-2 opacity-40 text-xl">|</span>
          <span className="text-sm opacity-90 tracking-wide">Siemens Digital Industries Software</span>
        </div>
      </header>

      <div className="p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <ComosLogo className="h-14 w-14 drop-shadow-sm" />
              <div>
                <div className="text-xl font-extrabold tracking-brand text-[#2BAAAB]">COMOS</div>
                <div className="text-xs text-slate-400 tracking-widest uppercase">by Siemens</div>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="rounded-full px-3 py-1 text-sm">{t.businessCase}</Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-sm">{t.roiCalculator}</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t.title}</h1>
            <p className="text-slate-600 mt-2 max-w-3xl">{t.subtitle}</p>
          </div>
          <div className="w-full md:w-[520px] space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block flex items-center gap-2"><Languages className="h-4 w-4" /> {t.language}</Label>
                <Tabs value={language} onValueChange={(v) => setLanguage(v as LanguageKey)}>
                  <TabsList className="grid grid-cols-2 w-full rounded-2xl h-12">
                    <TabsTrigger value="pt" className="rounded-xl">{t.portuguese}</TabsTrigger>
                    <TabsTrigger value="en" className="rounded-xl">{t.english}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div>
                <Label className="mb-2 block">{t.currency}</Label>
                <Tabs value={currency} onValueChange={(v) => setCurrency(v as CurrencyKey)}>
                  <TabsList className="grid grid-cols-2 w-full rounded-2xl h-12">
                    <TabsTrigger value="BRL" className="rounded-xl">BRL (R$)</TabsTrigger>
                    <TabsTrigger value="USD" className="rounded-xl">USD (US$)</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">{t.benchmarkScenario}</Label>
              <Tabs value={scenario} onValueChange={(v) => setScenario(v as ScenarioKey)}>
                <TabsList className="grid grid-cols-3 w-full rounded-2xl h-12">
                  <TabsTrigger value="conservador" className="rounded-xl">{t.conservative}</TabsTrigger>
                  <TabsTrigger value="base" className="rounded-xl">{t.base}</TabsTrigger>
                  <TabsTrigger value="agressivo" className="rounded-xl">{t.aggressive}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
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
                    <div key={item.title} className="rounded-2xl border border-border p-4 bg-secondary/30">
                      <div className="text-sm text-muted-foreground mb-1">{item.title}</div>
                      <div className="text-2xl font-semibold text-[#2BAAAB]">{item.value}</div>
                      <p className="text-sm text-slate-600 mt-2">{item.note}</p>
                      <div className="mt-3 flex items-center gap-2">
                        {item.sources.map((source, index) => (
                          <a
                            key={source.url}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`${item.title} source ${index + 1}`}
                            title={source.label}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                          >
                            <Link2 className="h-4 w-4" />
                          </a>
                        ))}
                      </div>
                    </div>
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
