import { readdir, readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import process from "node:process";
import YAML from "yaml";

const root = process.cwd();
const modulosDir = join(root, "modulos");
const permissoesDir = join(root, "permissoes");
const contratosDir = join(root, "contratos");
const erros = [];

function erro(arquivo, mensagem) {
  erros.push(`${arquivo}: ${mensagem}`);
}

const arquivosModulos = (await readdir(modulosDir))
  .filter((arquivo) => arquivo.endsWith(".json") && arquivo !== "schema.json")
  .sort();
const arquivosPermissoes = (await readdir(permissoesDir))
  .filter((arquivo) => arquivo.endsWith(".yaml") && arquivo !== "schema.yaml")
  .sort();

const registros = [];
const permissoesPorCodigo = new Map();

for (const arquivo of arquivosModulos) {
  const caminho = join(modulosDir, arquivo);
  const registro = JSON.parse(await readFile(caminho, "utf8"));
  const nomeArquivo = `modulos/${arquivo}`;
  const codigoArquivo = basename(arquivo, ".json");

  if (!registro.codigo) {
    erro(nomeArquivo, `o campo codigo é obrigatório e deve ser "${codigoArquivo}"`);
  } else if (registro.codigo !== codigoArquivo) {
    erro(nomeArquivo, `o nome do arquivo deveria ser modulos/${registro.codigo}.json para bater com o campo codigo`);
  }

  if (registro.codigo) {
    const esperados = {
      urlFrontend: `/modulos/${registro.codigo}/`,
      prefixoApi: `/api/${registro.codigo}`,
      healthcheck: `/api/${registro.codigo}/health`,
      permissaoMenu: `${registro.codigo}.acessar`,
    };
    for (const [campo, esperado] of Object.entries(esperados)) {
      if (registro[campo] !== esperado) {
        erro(nomeArquivo, `${campo} deve ser "${esperado}" para o código "${registro.codigo}"`);
      }
    }
  }

  registros.push({ arquivo: nomeArquivo, registro });
}

for (const arquivo of arquivosPermissoes) {
  const caminho = join(permissoesDir, arquivo);
  const lista = YAML.parse(await readFile(caminho, "utf8"));
  const nomeArquivo = `permissoes/${arquivo}`;
  const moduloArquivo = basename(arquivo, ".yaml");

  if (!lista.modulo) {
    erro(nomeArquivo, `o campo modulo é obrigatório e deve ser "${moduloArquivo}"`);
  } else if (lista.modulo !== moduloArquivo) {
    erro(nomeArquivo, `o nome do arquivo deveria ser permissoes/${lista.modulo}.yaml para bater com o campo modulo`);
  }

  const modulo = lista.modulo;
  for (const permissao of lista.permissoes ?? []) {
    const codigo = permissao.codigo;
    if (modulo && codigo && !codigo.startsWith(`${modulo}.`)) {
      erro(nomeArquivo, `a permissão ${codigo} deve começar com ${modulo}.`);
    }
    if (codigo) {
      const anterior = permissoesPorCodigo.get(codigo);
      if (anterior) {
        erro(nomeArquivo, `a permissão ${codigo} está repetida em ${anterior}`);
      } else {
        permissoesPorCodigo.set(codigo, nomeArquivo);
      }
    }
  }
}

for (const { arquivo, registro } of registros) {
  const citadas = [registro.permissaoMenu, ...(registro.itensSubmenu ?? []).map((item) => item.permissao)];
  for (const permissao of citadas) {
    if (permissao && !permissoesPorCodigo.has(permissao)) {
      erro(arquivo, `a permissão ${permissao} não existe em permissoes/`);
    }
  }
}

// Todo módulo registrado serve uma API REST — o próprio registro declara prefixoApi e healthcheck —,
// então o OpenAPI dele precisa estar publicado (§14.1 do Contrato de Integração). Enquanto um grupo
// não entrega, a dívida fica listada aqui e sai como aviso: o main não trava por pendência de outro
// grupo, mas ela também não desaparece do log do CI.
const SEM_OPENAPI_AINDA = new Map([
  ["landing", "issue #24"],
]);

const contratos = new Set(await readdir(contratosDir));
const pendencias = [];
for (const { arquivo, registro } of registros) {
  if (!registro.codigo || contratos.has(`${registro.codigo}.yaml`)) continue;
  const motivo = SEM_OPENAPI_AINDA.get(registro.codigo);
  if (motivo) {
    pendencias.push(`${arquivo}: falta contratos/${registro.codigo}.yaml — pendência conhecida (${motivo})`);
  } else {
    erro(arquivo, `o módulo declara prefixoApi "${registro.prefixoApi}", então precisa do OpenAPI em contratos/${registro.codigo}.yaml (§14.1)`);
  }
}

const arquivosPorOrdemMenu = new Map();
for (const { arquivo, registro } of registros) {
  if (registro.ordemMenu === undefined) continue;
  const anterior = arquivosPorOrdemMenu.get(registro.ordemMenu);
  if (anterior) {
    erro(arquivo, `ordemMenu ${registro.ordemMenu} já está em uso por ${anterior}`);
  } else {
    arquivosPorOrdemMenu.set(registro.ordemMenu, arquivo);
  }
}

if (pendencias.length > 0) {
  console.warn(["Pendências conhecidas:", ...pendencias].join("\n"));
}

if (erros.length > 0) {
  console.error(erros.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Coerência validada: ${registros.length} registros e ${permissoesPorCodigo.size} permissões.`);
}