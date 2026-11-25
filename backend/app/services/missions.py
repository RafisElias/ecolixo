"""Catálogo versionado de missões educativas.

O gabarito fica somente no servidor. Ao mudar o conteúdo de uma missão de forma
relevante, crie uma nova chave (ex.: ``-v2``) em vez de editar a existente, para
que as conclusões já registradas continuem se referindo ao conteúdo respondido.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class Option:
    id: str
    text: str


@dataclass(frozen=True)
class Question:
    id: str
    prompt: str
    options: tuple[Option, ...]
    correct_option_id: str


@dataclass(frozen=True)
class Mission:
    key: str
    title: str
    summary: str
    content: tuple[str, ...]
    questions: tuple[Question, ...]


MISSIONS: tuple[Mission, ...] = (
    Mission(
        key="o-que-e-residuo-eletronico-v1",
        title="O que é resíduo eletrônico",
        summary="Reconheça quais objetos são resíduos eletroeletrônicos e por que eles têm destino próprio.",
        content=(
            "Resíduos eletroeletrônicos são equipamentos que funcionam com eletricidade ou baterias e "
            "foram descartados: celulares, computadores, cabos, carregadores, pilhas, eletrodomésticos e similares.",
            "Esses equipamentos podem conter substâncias como chumbo, mercúrio e cádmio. Descartados no lixo "
            "comum, podem contaminar solo e água; encaminhados a pontos de coleta, permitem o reaproveitamento de materiais.",
        ),
        questions=(
            Question(
                id="q1",
                prompt="Qual destes itens é um resíduo eletroeletrônico?",
                options=(
                    Option("a", "Casca de fruta"),
                    Option("b", "Carregador de celular quebrado"),
                    Option("c", "Garrafa de vidro"),
                ),
                correct_option_id="b",
            ),
            Question(
                id="q2",
                prompt="Por que não descartar eletrônicos no lixo comum?",
                options=(
                    Option("a", "Podem conter substâncias que contaminam solo e água"),
                    Option("b", "Porque ocupam pouco espaço no caminhão"),
                    Option("c", "Não há nenhum motivo"),
                ),
                correct_option_id="a",
            ),
        ),
    ),
    Mission(
        key="preparar-antes-de-entregar-v1",
        title="Preparar antes de entregar",
        summary="Cuide dos seus dados e da segurança antes de levar um aparelho ao ponto de coleta.",
        content=(
            "Antes de entregar celulares e computadores, faça cópia do que for importante e apague seus dados "
            "pessoais, por exemplo restaurando as configurações de fábrica. Retire cartões de memória e chip.",
            "Não desmonte aparelhos nem perfure baterias. Baterias estufadas ou danificadas devem ser "
            "manuseadas com cuidado, mantidas longe do calor e levadas a um ponto de coleta.",
        ),
        questions=(
            Question(
                id="q1",
                prompt="O que fazer com seus dados antes de entregar um celular?",
                options=(
                    Option("a", "Nada, o ponto de coleta apaga tudo"),
                    Option("b", "Fazer cópia do que importa e apagar os dados pessoais"),
                    Option("c", "Anotar as senhas na tampa do aparelho"),
                ),
                correct_option_id="b",
            ),
            Question(
                id="q2",
                prompt="Como lidar com uma bateria estufada?",
                options=(
                    Option("a", "Perfurar para esvaziar"),
                    Option("b", "Jogar no lixo orgânico"),
                    Option("c", "Não perfurar, manter longe do calor e levar a um ponto de coleta"),
                ),
                correct_option_id="c",
            ),
        ),
    ),
    Mission(
        key="logistica-reversa-v1",
        title="Logística reversa",
        summary="Entenda quem participa do retorno dos eletrônicos após o uso.",
        content=(
            "A Política Nacional de Resíduos Sólidos (Lei nº 12.305/2010) prevê a logística reversa: "
            "o retorno de produtos após o uso para reaproveitamento ou destinação ambientalmente adequada.",
            "Fabricantes, importadores, distribuidores e comerciantes estruturam esse retorno, e o consumidor "
            "participa devolvendo os produtos nos locais indicados. É uma responsabilidade compartilhada.",
        ),
        questions=(
            Question(
                id="q1",
                prompt="Qual lei instituiu a Política Nacional de Resíduos Sólidos?",
                options=(
                    Option("a", "Lei nº 12.305/2010"),
                    Option("b", "Lei nº 13.709/2018"),
                    Option("c", "Lei nº 8.078/1990"),
                ),
                correct_option_id="a",
            ),
            Question(
                id="q2",
                prompt="Qual é o papel do consumidor na logística reversa?",
                options=(
                    Option("a", "Nenhum, a responsabilidade é só do fabricante"),
                    Option("b", "Devolver os produtos nos locais indicados"),
                    Option("c", "Desmontar os aparelhos em casa"),
                ),
                correct_option_id="b",
            ),
        ),
    ),
)

MISSIONS_BY_KEY: dict[str, Mission] = {mission.key: mission for mission in MISSIONS}
