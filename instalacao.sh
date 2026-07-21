#!/usr/bin/env bash
# instalacao.sh
# Instala e ativa todas as ferramentas do repo template e prepara o projeto
# pra começar a trabalhar. Rode uma vez logo depois de criar o repo a partir
# do template (ou depois de clonar).
#
# Uso:
#   chmod +x instalacao.sh
#   ./instalacao.sh

set -e

echo "=== 1. Detectando stack do projeto ==="
HAS_NODE=false
HAS_PYTHON=false
[ -f "package.json" ] && HAS_NODE=true
[ -f "requirements.txt" ] || [ -f "pyproject.toml" ] && HAS_PYTHON=true

echo "Node: $HAS_NODE | Python: $HAS_PYTHON"
echo "(se nenhum dos dois for detectado, o script instala só as ferramentas de repo/segurança)"

echo ""
echo "=== 2. Dependências do projeto ==="
if [ "$HAS_NODE" = true ]; then
  npm install
fi
if [ "$HAS_PYTHON" = true ]; then
  python3 -m pip install --upgrade pip
  [ -f "requirements.txt" ] && pip install -r requirements.txt
fi

echo ""
echo "=== 3. pre-commit (orquestra Gitleaks, Semgrep, checagem de commit) ==="
pip install pre-commit
pre-commit install
pre-commit install --hook-type commit-msg

echo ""
echo "=== 4. spec-kit (organização / spec-driven development) ==="
# Requer 'uv' (https://docs.astral.sh/uv/). Instala se não existir.
if ! command -v uv &> /dev/null; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
echo "Pra gerar a primeira spec: specify init"

echo ""
echo "=== 5. coderlm (indexação de código pro agente) ==="
if command -v cargo &> /dev/null; then
  git clone https://github.com/JaredStewart/coderlm.git /tmp/coderlm 2>/dev/null || true
  (cd /tmp/coderlm/server && cargo build --release)
  echo "Servidor buildado. Pra rodar: cd /tmp/coderlm/server && cargo run --release -- serve"
else
  echo "AVISO: cargo/Rust não encontrado — pulei o coderlm. Instale via https://rustup.rs se quiser usá-lo."
fi

echo ""
echo "=== 6. Playwright (testes e2e) — só se for projeto Node ==="
if [ "$HAS_NODE" = true ]; then
  npm install -D @playwright/test
  npx playwright install
fi

echo ""
echo "=== 7. Documentação navegável (MkDocs Material) — opcional ==="
read -p "Instalar MkDocs Material agora? (s/N) " INSTALL_DOCS
if [ "$INSTALL_DOCS" = "s" ] || [ "$INSTALL_DOCS" = "S" ]; then
  pip install mkdocs-material
  echo "Pra visualizar: mkdocs serve"
fi

echo ""
echo "=== 8. Checagem final de segurança ==="
pre-commit run --all-files || echo "AVISO: pre-commit encontrou algo pra corrigir acima (normal na primeira rodada)."

echo ""
echo "=== Pronto ==="
echo "Próximos passos:"
echo "  1. specify init                 -> gerar a primeira spec em /specs"
echo "  2. Preencher os <preencher> em AGENTS.md, docs/setup.md e dependabot.yml"
echo "  3. Escolher Dependabot OU Renovate (não os dois) e remover o outro"
echo "  4. npm run dev  /  python -m app.main  (conforme sua stack)"
