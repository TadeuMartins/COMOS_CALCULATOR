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

const comosLogoSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPgAAAEQCAYAAACdsblQAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAACxIAAAsSAdLdfvwAAGklSURBVHhe7X0JYBTHlfZw6EA3ICRxSBpxHxIIcxqwkYxPcEDYiWM7ayNtEodknSD+3U2yf/YPkE02aye7QI5dO9lYwt71lcQSxMZHbEvYgA3YlkBcQoAuDh2ARhfoAv73varq7hmNhAQ6pkf9jZ7q1atX1T3T9XUdXd096Pr16zYL3omCisrE2qbmsLLaWnu5o9YO2+HKqlm1TVfCoJeRrcxRx/abRUxYSElMWGgJ9FD/YY74yIiD0KPJFhMaWhLq7+dIiIrMh81C38MiuMkhSFpr31NalkQkji2rddgLKqqJ2E1MYk9BqL8/EX1UfkxoWAmRv3RxbEwuTgzq5GChd2AR3ERAi1xQWZV4pKJqVkFlReLukvIkmWRqLLFH5yZERuXPiIo4mBAZkW+1+D0Hi+AejN0lZUlomfeUli71xFa5t6Ba+8WxsbvQ0i+xx+TKJAvdhEVwDwJa6J2FRSkgtLe0zj0FtPIPTJm8fQkR3mrhuw6L4P0ItMhopd8uLFr1FhF7oLTQtwq08CumTMp+YMqk7WjdEZdJFlxgEbyPARKDzEzq4ydSpNnCLWDF1MlMdpDeIrszLIL3ASxS9x0ssjvDIngvAmQGqV8+WJAqTRb6CKob/+ishG0DeZLOIngPA9ekXyFCv3Lw0JpbXURioWeAxTjfWjBv6+OzEjIHWqtuEbwHgMmyVw8WrLFaa88GSD6QWnWL4LcIEPr5fZ+twyUuabJgAuBS27cWzOVWXZq8EhbBbwKYNHtu32fpVjfc/PD27rtF8G5AEZtknXXN2rsAcq+lFp1kizcR3SJ4F2ARe+DA24huEbwTWMQeuPAWolsE7wCYPPvRux9stog9sIEx+veX3rHJrJNxFsFdgMtdT+94M8OaPLNgBGbdf3bvsvVmu7xmEVwCC1RAbOsuLgudAUthQXSzPKhiwBNcjbOf2bV7gzRZsNAp1Pj8B0uXbJQmj8WAJrjVHbdwK8D4/DcrH0zz5G77gCQ4Wu2nd+zMsO7sstATwATcz+5btt4TZ9sHHMFBapDbmh230JMAuX+zcnkaxujS5BEYMAS3Wm0LfQEQHET3lNZ8QBAcY+0nXn8jy2q1LfQFPGls7vUEx2KV/9p3IF1GLVjoM3x7wbwtGJvLaL/AawmO2zfRJbdu47TQn8ACmZceeWh1f10390qCW8tMLXgS+nMCzusIbnXJLXgq+qPL7jUER2u98sVXcqwuuQVPBl7g8NIjD6/uq1l2ryA4SA1yW11yC2YAZtlB8r54Q8tgGZoWGG9b5LZgJmBpNOpsXzyg09Qt+DO7dm+0bhKxYGZgTI6xuYz2OExL8Ke3v5XRF2dACxZ6G1jL/ptVK9JktEdhOoKjK/7E63/Osu7btuBN6K3JN1MR3Jopt+DNwKTbjicfS+5Jkptmks0itwVvR29cDTJFC25dBrMwkIAWHC15T1xG8/gW3CK3hYGGnuytenQLbpHbwkAGWvJdT6XNvpUbVTy2BbfIbWGgA+83v9W70DyS4Ba5LQx09NS1cY/rooPUib96rtgit4WBip5c+OJRLThIbbXcFgYyenpVm8e04IrcPTFzaKF7wGROQtSobl2SsVYS9jx6Y8mqxxB85Yv/m2NVmt4BlkGG+g9zxEdGHIwOCy2JCQ0tCfX3I1L3zO2KeKglwoLKysS6puawPaWlS2ubWsKsk3XX0Vvr0T2C4NaNIz0HkHlxbOwuInM+CNzf79ACyQsqqxKPVFTN2l1almSRvj16i9xAvxPcuuXz5oGuNR7Nuyg2eteS2JjcvniAQE8ALf4eIvvOwqJVA53wvUluoF8JjlYbrbeMWugC8DSQFVOmZD8wZdJ2s73K1h0w9/JWYVHK3pKypQgH0gRrb5Mb6DeC48xtzZh3DYrUj86K32aWVvpmgTfPvE0tu7eTvS/IDfQLwXHgrGvdnQPdb6xk+taCuVu9ndQdAWR/9dDhNd72uqm+IjfQLwRf+ruMPGuyxT1AZpAa5AbJpXlAo8xRa3+FhnOvHDy0xuyveu5LcgN9TnDrueXugQP/6KyEbd4wru5NYN7m+X2frTNjA9HX5Ab6lODWpFp74KB/f+mSTX15OQsz2AijQ0NL+vsy2s0CM/HPfvTxBrOsnegPcgN9RnBrUs0ZfUVs/N7o3u4sPLFqb6kzGb5/55JNtA8bZdSUMAPR+4vcQJ8R3Bp3C/QmsTFWVa3zY7Qd6E928trk7U8+nrw41juGBJ5K9P4kN9AnBLfG3WKF2c/uvXt9T86Ig9AIf/TeB5vfLjyRsig2OvdIZXXiIiLt8imTtn93R/vhUExYGC9VfWrB3K3k0+cvw+ttYBj47K6PN3jCZFx/kxvodYLjzLryxZdzZHTAAdewQeyefLMkWuTn932W/uxHuzegfNfKrGbfsS6cDYRBJP9y77L131owt9cesu8pwO/zHP0+/blC0hPIDfQqwfFDD+Tr3XhjxfeXLt50q5e7DtPQBteDa680hc2Iijj4u/0H1nXUQg3ijyD0oEFCBxAussdQC1+ZWN/UEob4+jsWbfo/dy7e+CmNzUP8/RzTIyO86no7ejhP73gzo6+77Z5CbqBXCf4Ejf+8bZFCV4BuON4HfSvdcUVqTJAh/lNqfRG273YbCE0yWJIaQgzXdYQu8R/fnbz+/aKiVftKzyQtiB2X+/LXHk2WSV4FdNv76n3xnkRuoNcIDmKD4DI6YPCDpUs2kdz0zDQmxp6hMaSa8cZMN7rVhyurElcZhjqgKohqJDSLMe6axjaEg2zToiLyj1OZsMGybPL47P98KGU1R70QIPfTO3Zm9GaD42nkBnrliS7qx5TRAQGMhXc8+XjyrZD7n9/7YDNIDHJjwuyL7347DpexVBcfE2SDiYxDSIYSUyFDXETZhdg49BksZOjgwRSHDLKdrKxOVH4+JGlz52zlnfBQoLuNBkNdJegu8Bu+9MhDq/Gyv95YIeiJ5AZ6heAg90Aad2MCbddTfzv7ZlehoRuOivuc4UrDv95793rjpTTMfDc2N4UpUmqkpjQjUUFqRWgfIjPb5AlBpBsEdpKfLb83bV5MtEdfLnuNfqN3CotScALEw0EwhJFJ3QLmRXrqpQIKnkpuoMe76ANt1vxWX/+a9PuMPFRWtCrqpAj9i++ujcMs+NsnilI+KS1b+m7hyRSn7jjpODtDSNW66mjhRTr8dH9A2AQmjwrPv2vyxO1zo6Nz58aM82hyf0I9modfeiXnGunXqL5iQvDDb97a88LxW2NcjvG5NN0UPJncQI8SHD/a0t+9kGf2GwK6ApDwVloC/FYdrTB78ZGHV797omjV6wcPp4KQGnk1EkM3xiWRYVM6Cf4pnUX6A8mTxmf/ImWlKcbcIPgj//NqDmoqCP7IrPjMLV9a3iOkupXl055ObqBHu+i49jgQyA1S539vbdytdPNWUYuEMbeR3CumTM7Oo3E3FqC8U3gipd3YmnzQzebxNMbSRFfXLvcQYrASpzSZjhBlTImIOCi2enNoaG4O++Pn+elFVdW9vjpxf1l5EvYbv0PYMD/H39+5eJNMumWApHh7SHfH5WYgN9BjBMckyEB49NLNVggAXfFnd+3eCDGOIdGugty/WrkiDQ9FhO2nNAZfbI/OFeQUxB7KxNYJz2FnpKY0PiHwWFwfj4f6+jsenTP7pocVIPefvshPz/xk/4Z/3r4z62Qvkxy9FfGdbLYXvvzQatwkI5N6BDhR45h29YRtFnIDPUZwLCiQqtcCY+2bPbDokqPV3l1aunSxPSb3ASL0WioPlQpEXWKP2YUnncL3D/s/T//+m+9kFFVVJarWWmvFJUkFmRWxndMQKkJjxh3pRklfduf6ID+xra4CpN6w4+2sX7z3QUbKf/53TdYXBeuaWlvDLjTU2/9z18ebpVuvAMMO8f0GM9l7AxjPd2XIZSZyAz1CcEysefsjj3FQMaEmo90GZsnVJNoe+r1mRkYcpEpV+rN7l60/8PS34r45X19C+pWZ8ZmxVOEam9vCjJfEjK014hqxya5aat1PT1d5EJ8SMSr//hnTMuWmuozT1RcSPz1dnPL+0cJUlPN3yUvW3zZuXO4Q2mZxdU2vteDr39iR9fyeTzfge+B3md+Ls/3olaElB4mlyQlmIzfQIwT39tYbB7Wjg95VHK6oYhLsLT2T9MuP9mz494/3btj43oeb/3To8BrVLTficktz2O2xsotOcRAUrZc7UrtvqYXvEK0HQEL6pJtcjhoZElKC/Kr8D48Vrjl87lxSCJHil19Z1Wsr4Brpd1AnqPO14uaa3oa7421GcgO3PIvu7Q9xuBlyYz7iF7t2b1hE3W51KQe3ZWLc/XZhUcofC46sCfXzdZytq7NvfnB52n2d3NX1WdmZpL8cPrrmrSNHxYy6bMUxbsfZ2XnlmrC7hoDQWbO9s+7bQu0GCs6eS/q/b+zQLn9GhASV/GHN38TJaK8ht+hUygka46OWTqbeR/KkCX12B5x6Xr9ZyQ3cEsHR5fTmm0luhtyYQHt+/2fr8JvE03hOTaZhEq2uqSUsISoi/yf33tXtrv6CX2y9jpYTzDQSG626kcxayD5CB4SOcJDtze+uFcZuoKqu3p7+2p/yLje38LG+a9qUzO8tS+r1Sr/z8LHUzR9+tNlG9fSv69YOl+Y+gyK4jJoOt9RFx2Uxi9wC6t5sTKLhN8FSU5AbJP/BnUs2vXfiZMr+8vKkv1IY/x+/qtny8d5uLWnlbriTULeVu8yi681hOx8SpMmu9f978P7VP39o5U11pyNCgkvEpJ4o69H5c3rsUlVHwMTev737fkZTa0vYZRLEZdIN8eAfXsx7gCT6Z7+4jqEQbHtvYpmrmckN3DTBUYmJ4Otk1KvQXXKj1cZDF6DjHWCYrFk+ZfL2x2bOzMz9ZhovYWViUPp56pZfoZYcS0/h31VgUQvya6SV42q2u4qB1FoekpILFxMTxo65qUmq6vp6+7JpUzNRDsgdERzco5eq3OFk9YVE43fIKz/bJYIeq6xOPFFNUlnF+f9YIFar/fuuvRuOkI2dBghumuDe2np3l9zfpXEaHrxwpLKCKw5uE10+eVL2/6NWIyYspJSdqHOMijZ8mJ8DrSCuZ+8oOLpm4Zbf1vzPZ1906Uk3XNElcQdrrbVO3o5ILUTEMX6/WVTXN9jfPXQkfXRwSMmKmQl98tCIvx4tXGP8XntOnVolkzrFAeop8dUHyoff+3Jza9hR3DlHtX3djrcyyqm3lfKiWGgks3gtborg3tp641bP7pAbFeSVQ65rmQfZ3jlRxKvQ0Lqeqa21b9m9ZwNIh262uqb9+ZkzSVdoPNsVyp1CS0aVlYktTxaasJ1C8nOyG8iPbUYSMZOnTb7p7ub0MaNz1961NG3tsjvTAvx8e/xuLHf44FhhKr6vOqEVlJ/vUgueV3Zmqbg8KL479H2l5UnnHPX2wqoLiff8d0bep2XlSb+jRgonaJnNKzFk48bu3924dc+nP/zg1On7ZdQrAGL/6313d3nyCye52qbm4YtjY3b5DfVp+v1Dqx5L/v0LeScv1EydPGrk8eNV1YlYUolVVxcbL48GoduuXvMH8XCJi3jJJDx6rmJh69Wrw+Z0cMOHWGDyTlbd5StRqjuOcLBs1XCG5jin6TpIAR8Vb6Yx7JOLb7/p6/hAbPjI/FF90DVXQK+hmIYVakKxoaUlbPGEuO0jAgMqhId7/Pzd959rvnbVn3ss/DfI5uszpOng2fMLMdvY3HbVH+VBx33210nD4iPO7GXoNsFRsb/xxo5Xmtva/KXJ9MDqpT9+7ZEHZLRT4Pvfn/HSJ68eOpy67fO8tU30O6TNmf28P5H813v3/fAOe2zuX44de7SVKhEWskwIH3H8XuqyjwsNLQ0bNswRHRpS4jd0SFPtlStRIOhVIv3JqouJ90yd/FqwXMlmxFsFR9buKy5JgR+TlYltJLVOYh6TG0htDw/Pr6ftBPj7OrZ9M22YLNI0uJ3IHBkaUrrvdHEKXxmg7z08IKBy1rixHZIRl9Re+yI/nZ0JIt8gW3VjYxSdSGWdlWlkh4ZFSMZLmt6EbnfRvW3sLR7U8FiXZ5afeP3PWZgdV5e/cLMIHk181+8z8kC2Fw58nt7Y1ML3bf9m994NROySf/sgd/OPd76XMTUi/OCWh1aufnLenK3oUqtuJGTPydNunzSyaML47GcfXpWsiK38nXUSSWzVhU+eOjnz376yevbv//bJ4V+Z2/sz3r2Fu6dNyUwcNyZX9VgOnz23VCa5RSP1eMRCIPX7UEg6xuE8Lkca2fi3J7s4MQ6yfXfHzoybfZiEJ6PbBMf7oaRqemC2+6VHHl7d1RtHMF5zvbUTEItPhOAHVTq657/d/cnG//0sL/0Hy5auX5UwI7OeKmBR1YVZoX7DHNp4GoVQ6A6b3/8wI/3VP/HJQ1RGWSllXlXxtbIG03iVZE/RqdSfv/l2zuLD...";

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
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                <img src={comosLogoSrc} alt="COMOS logo" className="h-12 w-12 object-contain" />
              </div>
              <div className="text-sm font-medium tracking-[0.2em] text-slate-500">COMOS</div>
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
          <Card className="lg:col-span-1 rounded-3xl shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl"><Calculator className="h-5 w-5" /> {t.mainInputs}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Field label={t.impactedUsers} value={users} setValue={setUsers} />
              <Field label={t.avgHourCost} value={hourCost} setValue={setHourCost} step="10" />

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{t.autoBenchmark}</div>
                    <div className="text-xs text-slate-600">{t.autoBenchmarkDesc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoBenchmarkMode((v) => !v)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${autoBenchmarkMode ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-300"}`}
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
              <Card className="rounded-3xl shadow-sm border-0">
                <CardHeader>
                  <CardTitle>{t.financialIndicators}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <KeyValue label="VPL / NPV" value={formatCurrency(model.npv, locale, currency)} />
                  <KeyValue label="TIR / IRR" value={Number.isFinite(model.irr) ? percent(model.irr * 100, locale) : t.nd} />
                  <KeyValue label={t.discountedPayback} value={model.discountedPayback ? `${numberFmt(model.discountedPayback, locale, 1)} ${t.years}` : t.notReached} />
                  <KeyValue label={t.annualEngineeringCost} value={formatCurrency(model.annualEngineeringCost, locale, currency)} />
                  <KeyValue label={t.annualReworkCost} value={formatCurrency(model.annualReworkCost, locale, currency)} />
                </CardContent>
              </Card>

              <Card className="rounded-3xl shadow-sm border-0">
                <CardHeader>
                  <CardTitle>{t.annualBenefitsComposition}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <BenefitBar label={t.engineeringProductivity} value={model.engineeringSavings} total={model.annualBenefit} currency={currency} locale={locale} />
                  <BenefitBar label={t.reworkReduction} value={model.reworkSavings} total={model.annualBenefit} currency={currency} locale={locale} />
                  <BenefitBar label={t.searchValidation} value={model.annualInfoSavings} total={model.annualBenefit} currency={currency} locale={locale} />
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-3xl shadow-sm border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><RefreshCcw className="h-5 w-5" /> {t.assumptionsTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {assumptions.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-slate-200 p-4 bg-white">
                      <div className="text-sm text-slate-500 mb-1">{item.title}</div>
                      <div className="text-2xl font-semibold">{item.value}</div>
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

            <Card className="rounded-3xl shadow-sm border-0">
              <CardHeader>
                <CardTitle>{t.methodology}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 leading-6 space-y-3">
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
          <div className="text-sm text-slate-500">{title}</div>
          <div className="text-slate-500">{icon}</div>
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
        <div className="h-full rounded-full bg-slate-900" style={{ width: `${Math.max(0, Math.min(100, width))}%` }} />
      </div>
    </div>
  );
}
