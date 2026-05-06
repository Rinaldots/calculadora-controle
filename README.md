# Calculadora Controle

<div align="center">

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![HTML5](https://img.shields.io/badge/HTML5-E34C26?style=flat&logo=html5&logoColor=white)](https://html.spec.whatwg.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![Canvas](https://img.shields.io/badge/Canvas-JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

**Ferramenta interativa para projeto de controladores em tempo contínuo e discreto.**

Defina G(s) e H(s), escolha o tipo de controlador (PD, PI, PID, lead/lag) e o método de discretização. A ferramenta resolve automaticamente usando critério de ângulo e magnitude, mostrando cada passo do cálculo.

[📚 Documentação](#características) • 
[💻 Estrutura](#-estrutura-do-projeto) • 
[🚀 Usar](#-como-usar)

</div>

---

## ✨ Características

### 🎯 Tipos de Controladores Suportados

| Tipo | Fórmula | Uso |
|------|---------|-----|
| **PD** | Kc(s+z) | Sistemas de baixa ordem |
| **PI** | Kc(s+z)/s | Erro zero em regime permanente |
| **PID Duplo** | Kc(s+z)²/s | Duas raízes iguais |
| **PID Distinto** | Kc(s+z₁)(s+z₂)/s | Raízes diferentes |
| **Lead/Lag** | Kc(s+a)/(s+b) | Compensação avançada |
| **a/(s+b)** | Ganho com polo | Casos especiais |

### 📊 Modos de Especificação

- **Mp + ts**: Especifique overshoot máximo e tempo de assentamento
- **ζ + ωₙ**: Amortecimento e frequência natural (clássico)
- **sd direto**: Defina polos complexos desejados manualmente

### 🔄 Métodos de Discretização

- **Tustin (Bilinear)**: Excelente para preservação de fase
- **Euler Forward**: Simples, menos preciso
- **Euler Backward**: Numericamente estável

### 📈 Visualizações em Tempo Real

- **Mapa Polo-Zero**: Posição de polos (×) e zeros (○) no plano-s
- **Resposta ao Degrau**: Gráfico y(t) com Mp, ts(2%), ts(5%) calculados
- **Equação de Diferenças**: G_c(z) pronto para implementação em código

### ✅ Verificação Automática

Critérios do Lugar das Raízes:
- ∠G_c(s_d)·G(s_d)·H(s_d) = −180° ✓
- |G_c(s_d)·G(s_d)·H(s_d)| = 1 ✓

Indicadores visuais confirmam se o projeto atende aos critérios.

---

## 🚀 Como Usar

### Opção 1: Online (Recomendado)

Clone o repositório e abra o arquivo no navegador:

```bash
git clone https://github.com/seu-usuario/calculadora-controle.git
cd calculadora-controle
# Abra index-novo.html no navegador
```

### Opção 2: Direto de GitHub Pages

(Será disponível quando publicado em Pages)

### Exemplo Rápido

1. **Defina a planta G(s)**
   - Num: `(s+2)`
   - Den: `s(s+5)`

2. **Escolha controlador**: `PD`

3. **Especifique polo desejado**
   - Modo: `Mp + ts`
   - Mp: `10%` | ts: `4s`

4. **Discretização**: `Tustin`, T = `0.5s`

5. **Resultado automático**:
   - Kc = ?
   - z = ?
   - Gráficos
   - G_c(z)
   - Equação de diferenças

---

## 🏗️ Estrutura do Projeto

```
calculadora-controle/
├── index-novo.html          # Entry point
├── README.md                # Este arquivo
├── LICENSE                  # MIT License
├── .gitignore              # Git ignore
│
├── css/
│   └── style.css           # Tema Inked + Tailwind
│
└── js/
    ├── lib.js              # Matemática (complexos, polinômios)
    ├── solver.js           # Solucionadores de controladores
    ├── discretization.js   # Tustin, Euler FW/BW
    ├── plots.js            # Canvas renderização
    └── app.js              # React componentes + estado
```

### Dependências (CDN)

- **React 18** - UI componentizada
- **HTM** - Template literals (sem JSX)
- **KaTeX** - Renderização LaTeX
- **Tailwind CSS** - Utility-first CSS

Nenhuma compilação necessária! Funciona direto no navegador.

---

## 🔧 Desenvolvendo Localmente

### Adicionar Novo Controlador

1. Abra `js/solver.js`
2. Crie a função:
   ```javascript
   function solveNomeCtrl({ GH, sd, ...extras }){
     const z = /* calcular zero */;
     const Kc = /* calcular ganho */;
     return {
       Gc: { num: [Kc*z, Kc], den: [1] },
       params: { z, Kc, ... },
       name: 'Nome',
       formula: `G_c(s) = ${formata(Kc,4)}(s+${formata(z,4)})`
     };
   }
   ```
3. Registre em `CONTROLLER_TYPES`:
   ```javascript
   'MeuCtrl': { 
     label: 'Meu Controlador',
     solver: solveNomeCtrl,
     extra: [] 
   }
   ```

### Adicionar Método de Discretização

1. Abra `js/discretization.js`
2. Implemente:
   ```javascript
   function meuMetodo(TF, T){
     // Retorna novo { num, den }
     return { num: [...], den: [...] };
   }
   ```
3. Exporte em `DISC_METHODS`

### Modificar Estilos

Edite `css/style.css` - Variáveis CSS para tema:

```css
:root {
  --ink-0: #000000;        /* Fundo */
  --paper: #2B2B2B;        /* Texto */
  --amber: #00ACAC;        /* Destaque */
  --rose: #E74C3C;         /* Erros */
}
```

### Ajustar Interface

Edite `js/app.js` - Função `App()` com componentes React.

---

## 📚 Referência Técnica

### Entrada de Polinômios

Aceita múltiplos formatos:

```
Formato padrão:        s^2 + 2s + 1
Fatorado:             5(s+3)(s+1)
Misto:                (s+1)(s^2+2s+2)
Decimal (. ou ,):     0.5 ou 0,5
```

### Critério de Projeto (Lugar das Raízes)

$$\angle G_c(s_d) \cdot G(s_d) \cdot H(s_d) = -180° + k \cdot 360°$$

$$|G_c(s_d) \cdot G(s_d) \cdot H(s_d)| = 1$$

### Especificações de Tempo

Relação entre tempo de assentamento e ζ, ωₙ:

$$t_s(5\%) = \frac{3}{\zeta \omega_n} \quad \text{ou} \quad t_s(2\%) = \frac{4}{\zeta \omega_n}$$

Sobressinal máximo:

$$M_p = 100 \cdot e^{-\zeta\pi/\sqrt{1-\zeta^2}} \%$$

---

## 🎨 Tema & Personalização

### Cores Inked (Padrão)

| Variável | Cor | Uso |
|----------|-----|-----|
| `--ink-0` | #000000 | Fundo |
| `--paper` | #2B2B2B | Texto principal |
| `--amber` | #00ACAC | Destaque |
| `--rose` | #E74C3C | Erros |
| `--grid` | #3A3A3A | Grid nos gráficos |

Altere em `css/style.css` → `:root { ... }`

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| Gráfico não aparece | Abra F12 (Console) - verifique erros |
| Erro parsing polinômio | Use `s` como variável; `.` ou `,` para decimais |
| Simulação lenta | Reduza `t_end` ou aumente `dt` |
| Resposta discretizada oscilatória | Diminua período T (maior frequência de amostragem) |

---

## 📄 Licença

MIT © 2025 - Veja [LICENSE](LICENSE) para detalhes.

---

## 🤝 Contribuindo

Contribuições são bem-vindas!

1. Abra uma **Issue** descrevendo sua proposta
2. Fork o repositório
3. Crie sua branch: `git checkout -b feature/minha-feature`
4. Commit: `git commit -am 'Add nova feature'`
5. Push: `git push origin feature/minha-feature`
6. Abra um Pull Request

---

## 💡 Exemplos Práticos

### Exemplo 1: PD para Sistema de 1ª Ordem

```
G(s) = 1/(s+1)
H(s) = 1

Especificação: Mp = 5%, ts(5%) = 2s
Resultado: Kc = 1.42, z = 0.65
```

### Exemplo 2: PI com Integrador

```
G(s) = 2/(s(s+3))
H(s) = 1

Especificação: ζ = 0.7, ωₙ = 1.5 rad/s
Resultado: Kc = 1.125, z = 1.5
```

### Exemplo 3: Discretização com Tustin

```
G_c(s) = 2(s+0.5)/s
T = 0.1s
G_c(z) = [resultado calculado]
eq. diferenças: y[k] = ...
```

---

## 📞 Contato

- **Issues**: [GitHub Issues](../../issues)
- **Discussões**: [GitHub Discussions](../../discussions)

---

<div align="center">

Made with ❤️ for Control Engineers

[⬆ Voltar ao topo](#calculadora-controle)

</div>
