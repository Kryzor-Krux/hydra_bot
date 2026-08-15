# CICLOS v3 — Redesign e Correções de Comportamento

> Atualizado em: 2026-08-15

## Sumário

O módulo CICLOS foi completamente redesenhado (v3) com foco em:

1. **Correção da lógica financeira**
2. **UI/UX premium dark+red**
3. **Paginação 5-a-5 com load-more**
4. **Estado vazio polido**

---

## Lógica Financeira Corrigida

### Semântica

| Campo     | Natureza | Display   |
| --------- | -------- | --------- |
| depósitos | Negativo | `-150.00` |
| saques    | Positivo | `+100.00` |
| baús      | Positivo | `+100.00` |

### Fórmula do saldo

```
saldo = total_saques + total_baus - total_depositos
```

**Exemplo:**

- depósitos: 50 + 50 + 50 = 150 → display `-150.00`
- saques: 50 + 50 = 100 → display `+100.00`
- baús: 50 + 50 = 100 → display `+100.00`
- saldo: `+100.00 + +100.00 - 150.00 = +50.00`

### Local no código

- Implementação: [`repository.ts`](../src/lib/modules/ciclos/server/repository.ts) linha 69
- Teste unitário: [`db.test.ts`](../src/lib/modules/ciclos/server/db.test.ts)

---

## UI — Decisões de Design

### Visual language

- Base: `#0a0a0b` (quase preto)
- Accent: `#dc2626` (crimson)
- Tipografia: Inter (display) + JetBrains Mono (valores financeiros)
- Sombras: multicamadas com profundidade sutil
- Animação: `slide-up` com `cubic-bezier(0.22, 1, 0.36, 1)` (spring)

### Cards de ciclo

- Cada card é compacto: header (ciclo + timestamp + botão copiar) + grid 1×2 de profiles
- Profile card: badge de role, id-grid de campos, sumário financeiro, inputs de entrada
- Hover: `translateY(-1px)` + border-color highlight

### Inputs de entrada

3 inputs compactos por profile em grid 1×3:

| Input | Tipo       | Color focus |
| ----- | ---------- | ----------- |
| Dep.  | deposit    | vermelho    |
| Saque | withdrawal | verde       |
| Baú   | chest      | verde       |

- Pressionar Enter submete o formulário, limpa o input e atualiza o total

### Flash de feedback

Quando um valor é adicionado com sucesso, a linha financeira correspondente pisca (keyframe `flash-row`, 550ms).

### Chips removidos

Não há mais exibição de valores individuais (chips). Apenas o **total acumulado** é exibido para cada categoria.

---

## Paginação 5-a-5

- Ao carregar a página, são exibidos até **5 ciclos** (os mais recentes)
- O botão **"Carregar Mais"** aparece se há mais ciclos disponíveis
- Clicar adiciona mais 5 ao estado local (`visibleCount += 5`)
- O estado do servidor usa `limit=5` no parâmetro de URL; se o usuário tiver mais de 5 e carregar todos os locais, mas ainda houver no servidor (`data.hasMore`), o botão permanece visível

---

## Estado Vazio

Exibido quando `allCycles.length === 0`:

- Ícone de aviso (SVG inline)
- Título "Nenhum ciclo gerado"
- Subtítulo convidando o usuário a clicar em **GERAR DADOS**
- Animação `fade-in` suave

---

## Output do Copy

```
nome: Valentina Oliveira
senha: xK7!qR2#mn5
cpf: 12345678901
numero: 11999999999
senha saque: 101010
depositos: -150.00
saques: +100.00
baus: +100.00
saldo: +50.00
```

---

## Arquivos Modificados

| Arquivo                                       | Mudança                                     |
| --------------------------------------------- | ------------------------------------------- |
| `src/routes/ciclos/+page.svelte`              | Redesign completo (UI/UX v3)                |
| `src/routes/ciclos/+page.server.ts`           | Limit 10 → 5                                |
| `src/lib/modules/ciclos/server/repository.ts` | Formula: `withdrawal+chest-deposit`         |
| `src/lib/modules/ciclos/server/db.test.ts`    | Asserção de saldo corrigida                 |
| `tests/e2e/ciclos.e2e.ts`                     | Testes reescritos para novos comportamentos |

---

## Dados de Produção

O banco de dados SQLite (`data/ciclos.db`) está no `.gitignore` e **não é commitado**.
Para resetar os dados em produção:

```bash
# Parar a aplicação e deletar os arquivos do banco
rm data/ciclos.db data/ciclos.db-shm data/ciclos.db-wal
# Reiniciar a aplicação (initDb() recria o schema do zero)
```
