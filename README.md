# Calculadora Controle

---

## ✨ Características

### &#x20;Modos de Especificação

- **Mp + ts**: Especifique overshoot máximo e tempo de assentamento
- **ζ + ωₙ**: Amortecimento e frequência natural (clássico)
- **sd direto**: Defina polos complexos desejados manualmente

### &#x20;Métodos de Discretização

* **Tustin (Bilinear).**
* **Euler Forward**.
* **Euler Backward**.

### &#x20;Visualizações em Tempo Real

* **Mapa Polo-Zero**.
* **Resposta ao Degrau**.
* **Equação de Diferenças**.

---

## 🚀 Como Usar

### Opção 1: Online

Clone o repositório e abra o arquivo no navegador:

```bash
git clone https://github.com/seu-usuario/calculadora-controle.git
cd calculadora-controle
# Abra index-novo.html no navegador
```

### Opção 2: Direto de GitHub Pages

---

## 🏗️ Estrutura do Projeto

```
calculadora-controle/
├── index-novo.html          # Entry point
├── README.md                # Este arquivo
├── LICENSE                  # MIT License
├── .gitignore               # Git ignore
│
├── css/
│   └── style.css           
│
└── js/
    ├── lib.js              # Matemática
    ├── solver.js           # Solucionadores de controladores
    ├── discretization.js   # Tustin, Euler FW/BW
    ├── plots.js            # Renderização
    └── app.js              # React
```

### Dependências (CDN)

- **React 18** - UI componentizada
- **HTM** - Template literals (sem JSX)
- **KaTeX** - Renderização LaTeX
- **Tailwind CSS** - Utility-first CSS

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

​
