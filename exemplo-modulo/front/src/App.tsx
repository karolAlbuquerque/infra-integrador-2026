import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { chamar, entrarComUsuarioDeTeste, ErroDaApi, type Pagina } from './plataforma/api'
import { aoMudarSessao, estaEmbutido, notificarCasca, sessaoAtual, type Sessao } from './plataforma/sessao'

interface Item {
  id: string
  nome: string
  descricao: string | null
  criadoEm: string
}

type Estado =
  | { fase: 'carregando' }
  | { fase: 'erro'; mensagem: string }
  | { fase: 'pronto'; pagina: Pagina<Item> }

const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function App() {
  const [sessao, setSessao] = useState<Sessao | null>(sessaoAtual())
  useEffect(() => {
    const parar = aoMudarSessao(setSessao)
    // A casca responde ao modulo:pronto na hora: a sessão pode ter chegado entre o primeiro
    // render e esta inscrição. Sem reler aqui, ela se perde e a tela fica esperando para sempre.
    setSessao(sessaoAtual())
    return parar
  }, [])

  if (!sessao) {
    return estaEmbutido() ? <Aguardando /> : <EntradaDeTeste />
  }
  return <Itens sessao={sessao} />
}

function Aguardando() {
  return (
    <main className="grid min-h-40 place-items-center p-6 text-sm text-texto-3">
      Aguardando a sessão da plataforma…
    </main>
  )
}

/** Modo direto, só para desenvolvimento: login com um usuário de docs/usuarios-de-teste.md. */
function EntradaDeTeste() {
  const [email, setEmail] = useState('administrador@empresa-a.dev')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function entrar(evento: FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      await entrarComUsuarioDeTeste(email, senha)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <p className="font-mono text-xs uppercase tracking-widest text-texto-3">Modo direto · desenvolvimento</p>
      <h1 className="mt-2 text-xl font-bold text-titulo">Entrar com usuário de teste</h1>
      <p className="mt-1 text-sm text-texto-3">
        Dentro da plataforma, este passo não existe: a casca entrega a sessão.
      </p>
      <form onSubmit={entrar} className="mt-6 grid gap-3">
        <label className="grid gap-1 text-sm">
          E-mail
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="h-9 rounded-lg border border-borda-forte bg-superficie px-3 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/20" />
        </label>
        <label className="grid gap-1 text-sm">
          Senha
          <input id="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)}
            className="h-9 rounded-lg border border-borda-forte bg-superficie px-3 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/20" />
        </label>
        {erro && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
        <button type="submit" disabled={enviando}
          className="h-9 rounded-lg bg-brand-800 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-55">
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}

function Itens({ sessao }: { sessao: Sessao }) {
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' })

  const carregar = useCallback(async () => {
    setEstado({ fase: 'carregando' })
    try {
      const pagina = await chamar<Pagina<Item>>('/api/exemplo/itens?tamanho=50')
      setEstado({ fase: 'pronto', pagina })
    } catch (e) {
      const mensagem = e instanceof ErroDaApi && e.status === 403
        ? 'Seu perfil não tem a permissão exemplo.item.ver.'
        : e instanceof Error ? e.message : 'Não foi possível carregar os itens.'
      setEstado({ fase: 'erro', mensagem })
    }
  }, [])

  // Recarrega quando o token muda (renovação feita pela casca)
  useEffect(() => {
    void carregar()
  }, [carregar, sessao.token])

  return (
    <main>
      {/* Cabeçalho de página do design system (§12.3): título, contador e ações sobre brand-950 */}
      <header className="flex flex-wrap items-center justify-between gap-2 bg-brand-950 px-5 py-3.5 text-white">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Itens</h1>
          <p className="mt-0.5 text-xs text-brand-300">
            Módulo de exemplo · {sessao.usuario.nome}
            {estado.fase === 'pronto' && ` · ${estado.pagina.total} ${estado.pagina.total === 1 ? 'item' : 'itens'}`}
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-3xl p-5">

      <NovoItem aoCriar={carregar} />

      <section className="mt-6" aria-live="polite">
        {estado.fase === 'carregando' && <p className="text-sm text-texto-3">Carregando…</p>}
        {estado.fase === 'erro' && (
          <div role="alert" className="rounded-xl border border-red-300 dark:border-red-500/40 p-4 text-sm">
            <p className="text-red-600 dark:text-red-400">{estado.mensagem}</p>
            <button type="button" onClick={() => void carregar()} className="mt-2 font-medium text-brand-700 underline dark:text-brand-400">Tentar de novo</button>
          </div>
        )}
        {estado.fase === 'pronto' && estado.pagina.itens.length === 0 && (
          <p className="rounded-xl border border-dashed border-borda-forte p-6 text-center text-sm text-texto-3">
            Nenhum item ainda. Crie o primeiro acima.
          </p>
        )}
        {estado.fase === 'pronto' && estado.pagina.itens.length > 0 && (
          <ul className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie shadow-sm">
            {estado.pagina.itens.map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
                <div>
                  <p className="font-medium text-titulo">{item.nome}</p>
                  {item.descricao && <p className="text-sm text-texto-3">{item.descricao}</p>}
                </div>
                <time dateTime={item.criadoEm} className="font-mono text-xs text-texto-3">
                  {dataHora.format(new Date(item.criadoEm))}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </main>
  )
}

function NovoItem({ aoCriar }: { aoCriar: () => Promise<void> }) {
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function criar(evento: FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      await chamar('/api/exemplo/itens', { method: 'POST', body: JSON.stringify({ nome }) })
      setNome('')
      notificarCasca('sucesso', 'Item criado.')
      await aoCriar()
    } catch (e) {
      const detalhe = e instanceof ErroDaApi ? e.envelope?.errors[0]?.detalhe : undefined
      setErro(detalhe ?? (e instanceof Error ? e.message : 'Não foi possível criar o item.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={criar} className="mt-6 flex flex-wrap items-start gap-2">
      <label htmlFor="novo-item" className="sr-only">Nome do novo item</label>
      <input id="novo-item" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do novo item"
        maxLength={200} className="h-9 min-w-0 flex-1 rounded-lg border border-borda-forte bg-superficie px-3 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/20" />
      <button type="submit" disabled={enviando || !nome.trim()}
        className="h-9 rounded-lg bg-brand-800 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-55">
        {enviando ? 'Criando…' : 'Criar item'}
      </button>
      {erro && <p role="alert" className="basis-full text-sm text-red-600 dark:text-red-400">{erro}</p>}
    </form>
  )
}
