# COMOS ROI Calculator — Metodologia de Cálculo

> Documento de referência que descreve, passo a passo, todas as fórmulas
> utilizadas pela calculadora para chegar nos valores de **savings** e
> **indicadores financeiros**.
>
> Todas as fórmulas estão implementadas em `comos_roi_calculator_app.tsx`.

---

## Sumário

1. [Variáveis de entrada](#1-variáveis-de-entrada)
2. [Cenários de benchmark](#2-cenários-de-benchmark)
3. [Horas efetivas mensais](#3-horas-efetivas-mensais)
4. [Custos anuais base](#4-custos-anuais-base)
5. [Cálculo dos três drivers de economia (savings)](#5-cálculo-dos-três-drivers-de-economia-savings)
6. [Benefício anual e fluxo líquido](#6-benefício-anual-e-fluxo-líquido)
7. [Indicadores financeiros](#7-indicadores-financeiros)
8. [Exemplo numérico completo (valores padrão)](#8-exemplo-numérico-completo-valores-padrão)
9. [Salvaguardas contra dupla contagem](#9-salvaguardas-contra-dupla-contagem)
10. [Conclusão da revisão](#10-conclusão-da-revisão)

---

## 1. Variáveis de entrada

| Variável | Padrão | Descrição |
|---|---|---|
| `users` | 25 | Quantidade de usuários impactados |
| `hourCost` | 180 | Custo médio por hora (na moeda selecionada) |
| `reworkPct` | 12 % | Percentual estimado de retrabalho sobre engenharia |
| `investment` | 650 000 | Investimento inicial total |
| `annualRecurring` | 120 000 | Custo anual recorrente (licenças, suporte etc.) |
| `horizonYears` | 5 | Horizonte de análise em anos |
| `discountRatePct` | 12 % | Taxa de desconto para VPL e payback descontado |
| `engineeringHoursMonth` | 1 600 | Horas mensais de engenharia/documentação (modo manual) |
| `infoHoursMonth` | 220 | Horas mensais de busca/validação (modo manual) |

---

## 2. Cenários de benchmark

Três cenários predefinidos controlam os parâmetros de ganho (aplicados via `scenarioPresets`):

| Parâmetro | Conservador | Base | Agressivo |
|---|---|---|---|
| `engineeringGain` | 5 % | 8 % | 10 % |
| `reworkReduction` | 10 % | 15 % | 20 % |
| `infoHoursPerWeek` | 0,5 h | 1,0 h | 2,0 h |

Quando o **modo benchmark automático** está ativo, as horas mensais por
usuário também variam por cenário:

| Horas/usuário/mês | Conservador | Base | Agressivo |
|---|---|---|---|
| Engenharia/documentação | 120 | 140 | 160 |
| Busca/validação | 6 | 9 | 12 |

---

## 3. Horas efetivas mensais

### Modo benchmark automático (padrão)

```
effectiveEngineeringHoursMonth = users × engPerUserMonth
effectiveInfoHoursMonth        = users × infoPerUserMonth
```

### Modo manual

O usuário informa diretamente `engineeringHoursMonth` e `infoHoursMonth`.

---

## 4. Custos anuais base

```
annualEngineeringHours = effectiveEngineeringHoursMonth × 12
annualInfoHours        = effectiveInfoHoursMonth × 12

annualEngineeringCost          = annualEngineeringHours × hourCost
annualReworkCost               = annualEngineeringCost × (reworkPct / 100)
annualNonReworkEngineeringCost = max(annualEngineeringCost − annualReworkCost, 0)
```

**Por que o `max(..., 0)`?** — Garante que, caso o percentual de retrabalho
informado seja 100 %, a parcela produtiva não se torna negativa.

---

## 5. Cálculo dos três drivers de economia (savings)

A calculadora utiliza **três drivers de valor independentes**. Cada um é
aplicado a uma base diferente para evitar dupla contagem.

### 5.1 Produtividade de engenharia (`engineeringSavings`)

```
engineeringSavings = annualNonReworkEngineeringCost × engineeringGain
```

- Aplica o percentual de ganho **apenas sobre a parcela produtiva**
  (exclui o retrabalho).
- Isso evita que um ganho de produtividade "duplique" a economia já contada
  pela redução de retrabalho.

### 5.2 Redução de retrabalho (`reworkSavings`)

```
reworkSavings = annualReworkCost × reworkReduction
```

- Aplica o percentual de redução **apenas sobre o custo de retrabalho**.

### 5.3 Economia em busca/validação de informação (`annualInfoSavings`)

```
monthlyInfoHoursPerUser = (infoHoursPerWeek × 52) / 12

annualInfoSavings = min(annualInfoHours, users × monthlyInfoHoursPerUser × 12) × hourCost
```

- Converte as horas semanais recuperadas por usuário em horas mensais
  (`× 52 / 12`), depois anualiza e monetiza.
- O `min(...)` **limita a economia** ao teto de horas de busca/validação
  já declaradas na linha-base (`annualInfoHours`), impedindo que a economia
  hipotética exceda as horas efetivamente dedicadas a essa atividade.

---

## 6. Benefício anual e fluxo líquido

```
annualBenefit = engineeringSavings + reworkSavings + annualInfoSavings
annualNet     = annualBenefit − annualRecurring
```

O vetor de fluxos de caixa para os indicadores financeiros é:

```
cashFlows = [−investment, annualNet, annualNet, …, annualNet]
              ↑ ano 0      ↑ ano 1                  ↑ ano N
```

---

## 7. Indicadores financeiros

### 7.1 VPL (Valor Presente Líquido) / NPV

```
            N
NPV = Σ   CF_t / (1 + r)^t
           t=0
```

Onde `r = discountRatePct / 100` e `CF_t` são os fluxos de caixa.

### 7.2 TIR (Taxa Interna de Retorno) / IRR

Determinada pelo método de **Newton-Raphson**: busca iterativa da taxa `r*`
que zera o VPL.

```
f(r)  = Σ CF_t / (1 + r)^t          → VPL em função de r
f'(r) = Σ (−t × CF_t) / (1 + r)^(t+1)   para t > 0   → derivada

r_(n+1) = r_n − f(r_n) / f'(r_n)
```

Critério de parada: `|r_(n+1) − r_n| < 10⁻⁷` ou máximo de 100 iterações.

### 7.3 ROI (Retorno sobre Investimento)

```
ROI (%) = ((annualNet × horizonYears − investment) / investment) × 100
```

Interpretação: lucro líquido total não descontado ao longo do horizonte,
dividido pelo investimento inicial.

### 7.4 Payback simples

```
simplePayback = investment / annualNet     (em anos)
```

Se `annualNet ≤ 0`, o payback não é atingido.

### 7.5 Payback descontado

Encontra o momento exato em que o **VPL acumulado** cruza zero, usando
interpolação linear dentro do ano:

```
Para cada ano t (de 0 a N):
  DCF_t = CF_t / (1 + r)^t
  cumulativo += DCF_t

  Se cumulativo ≥ 0:
    restante  = 0 − cumulativo_anterior
    fração    = restante / DCF_t
    payback   = (t − 1) + fração
```

---

## 8. Exemplo numérico completo (valores padrão)

Cenário **Base**, modo benchmark automático, todos os valores padrão.

### 8.1 Horas e custos base

| Etapa | Cálculo | Resultado |
|---|---|---|
| Eng. horas/mês | 25 × 140 | **3 500 h/mês** |
| Info horas/mês | 25 × 9 | **225 h/mês** |
| Eng. horas/ano | 3 500 × 12 | **42 000 h/ano** |
| Info horas/ano | 225 × 12 | **2 700 h/ano** |
| Custo anual engenharia | 42 000 × 180 | **$ 7 560 000** |
| Custo anual retrabalho | 7 560 000 × 12 % | **$ 907 200** |
| Custo produtivo (sem retrabalho) | 7 560 000 − 907 200 | **$ 6 652 800** |

### 8.2 Savings anuais

| Driver | Cálculo | Resultado |
|---|---|---|
| Produtividade de engenharia | 6 652 800 × 8 % | **$ 532 224** |
| Redução de retrabalho | 907 200 × 15 % | **$ 136 080** |
| Busca/validação — horas/mês/usuário | 1,0 × 52 / 12 ≈ 4,333 h/mês/usuário | — |
| Busca/validação — teto por cenário | min(2 700, 25 × 4,333 × 12) = min(2 700, 1 300) = 1 300 h | — |
| Busca/validação — monetizada | 1 300 × 180 | **$ 234 000** |
| **Total de savings anuais** | 532 224 + 136 080 + 234 000 | **$ 902 304** |

### 8.3 Fluxo líquido

| Item | Cálculo | Resultado |
|---|---|---|
| Fluxo líquido anual | 902 304 − 120 000 | **$ 782 304** |

### 8.4 Vetor de fluxos de caixa

| Ano | Fluxo de caixa |
|---|---|
| 0 | −$ 650 000 |
| 1 | $ 782 304 |
| 2 | $ 782 304 |
| 3 | $ 782 304 |
| 4 | $ 782 304 |
| 5 | $ 782 304 |

### 8.5 Indicadores financeiros

| Indicador | Cálculo / Método | Resultado |
|---|---|---|
| **NPV** | Σ DCF (taxa 12 %) | **≈ $ 2 170 031** |
| **IRR** | Newton-Raphson (NPV = 0) | **117,9 %** |
| **ROI** | (782 304 × 5 − 650 000) / 650 000 × 100 | **501,8 %** |
| **Payback simples** | 650 000 / 782 304 | **0,83 anos (~10 meses)** |
| **Payback descontado** | interpolação no VPL acumulado | **0,93 anos (~11 meses)** |

#### Detalhamento do VPL — fluxos descontados ano a ano

| Ano | Fluxo (CF) | Fator `1/(1,12)^t` | Fluxo descontado (DCF) | VPL acumulado |
|---|---|---|---|---|
| 0 | −650 000 | 1,0000 | −650 000,00 | −650 000,00 |
| 1 | 782 304 | 0,8929 | 698 485,71 | 48 485,71 |
| 2 | 782 304 | 0,7972 | 623 647,96 | 672 133,67 |
| 3 | 782 304 | 0,7118 | 556 828,53 | 1 228 962,21 |
| 4 | 782 304 | 0,6355 | 497 168,33 | 1 726 130,54 |
| 5 | 782 304 | 0,5674 | 443 900,30 | **2 170 030,84** |

#### Detalhamento do payback descontado

No **ano 0** o acumulado é −650 000.
No **ano 1** soma-se 698 485,71, totalizando +48 485,71 (já positivo).

```
restante = 0 − (−650 000) = 650 000
fração   = 650 000 / 698 485,71 = 0,9306
payback  = (1 − 1) + 0,9306 = 0,93 anos
```

---

## 9. Salvaguardas contra dupla contagem

A calculadora incorpora três mecanismos para evitar dupla contagem de
benefícios:

1. **Segregação produtividade × retrabalho**: o ganho de produtividade de
   engenharia é aplicado somente à parcela **não-retrabalho** do custo anual.
   O retrabalho tem seu próprio driver de redução. Dessa forma, nenhum real/dólar
   é contado duas vezes.

2. **Cap de horas em busca/validação**: a economia por busca/validação é
   limitada pelo `min(annualInfoHours, …)`, garantindo que não se economize
   mais horas do que as que realmente existem na linha-base.

3. **Bases independentes**: cada driver opera sobre uma base de custo distinta
   (custo produtivo, custo de retrabalho, horas de busca), sem sobreposição.

---

## 10. Conclusão da revisão

Após revisão detalhada de todas as fórmulas implementadas em
`comos_roi_calculator_app.tsx`:

- **Todas as fórmulas estão matematicamente corretas** e produzem resultados
  coerentes com as premissas informadas.
- **Não há dupla contagem** entre os drivers de economia.
- **Os indicadores financeiros** (NPV, IRR, ROI, payback simples e
  descontado) utilizam fórmulas padrão de análise de investimento.
- **Nenhuma correção foi necessária** no código de cálculo.
