"""Serviços fictícios para demonstração local. Não usar como prestadores reais.

Uso: docker compose exec backend python seed_services.py
Idempotente: não altera anúncios existentes nem duplica os exemplos por autor/nome.
"""
import asyncio

from sqlalchemy import select

from app.database import AsyncSessionLocal, engine
from app.models.pickup_service import PickupService
from app.models.user import User
from app.models.waste_category import WasteCategory
from app.schemas.pickup_service import PickupServiceCreate
from app.services.pickup_service import save_service

EXAMPLES = [
    ("ana@teste.com", "[DEMO] Ana — Pequenos eletrônicos", "individual", "ana@example.com", "Santana e Tucuruvi — São Paulo/SP", "free", ["Smartphone / Tablet", "Cabo / Adaptador"], "Exemplo fictício. Retirada de pequenos itens, mediante combinação prévia. Não é um serviço real."),
    ("carlos@teste.com", "[DEMO] Carlos — Computadores", "individual", "carlos@example.com", "Lapa e Barra Funda — São Paulo/SP", "on_request", ["Computador / Notebook", "TV / Monitor", "Cabo / Adaptador"], "Exemplo fictício. Informe quantidade e tamanho dos equipamentos para combinar a retirada. Não é um serviço real."),
    ("juliana@teste.com", "[DEMO] Circular Eletrônicos", "company", "circular@example.com", "Vila Mariana e Saúde — São Paulo/SP", "free", ["Smartphone / Tablet", "Computador / Notebook", "Cabo / Adaptador"], "Empresa fictícia para demonstração do catálogo. Materiais e disponibilidade sujeitos a confirmação. Não é um serviço real."),
    ("pedro@teste.com", "[DEMO] Retira Eletro", "company", "retira-eletro@example.com", "Mooca e Tatuapé — São Paulo/SP", "paid", ["Eletrodoméstico", "TV / Monitor"], "Empresa fictícia. Exemplo de retirada cobrada para equipamentos volumosos, com valor combinado previamente. Não é um serviço real."),
    ("marina@teste.com", "[DEMO] Marina — Pilhas e baterias", "individual", "marina@example.com", "Pinheiros e Butantã — São Paulo/SP", "on_request", ["Bateria / Pilha", "Smartphone / Tablet"], "Exemplo fictício para testar categorias e região de atendimento. Não é um serviço real."),
    ("roberto@teste.com", "[DEMO] Rede Reuso", "company", "rede-reuso@example.com", "Centro e Bela Vista — São Paulo/SP", "on_request", ["Computador / Notebook", "Smartphone / Tablet", "Outro"], "Empresa fictícia para testar anúncios de empresas e múltiplos materiais. Não é um serviço real."),
]


async def seed():
    created = skipped = 0
    async with AsyncSessionLocal() as db:
        categories = {item.name: item.id for item in (await db.execute(select(WasteCategory))).scalars()}
        users = {item.email: item.id for item in (await db.execute(select(User))).scalars()}
        # Confere todas as dependências antes de gravar os exemplos.
        for email, _, _, _, _, _, names, _ in EXAMPLES:
            if email not in users:
                raise RuntimeError(f"Usuário {email} ausente. Execute seed_users.py primeiro.")
            if any(name not in categories for name in names):
                raise RuntimeError("Categorias ausentes. Verifique a inicialização do banco.")
        for email, name, provider_type, contact, area, pricing, names, description in EXAMPLES:
            user_id = users[email]
            existing = await db.scalar(select(PickupService.id).where(PickupService.user_id == user_id, PickupService.name == name))
            if existing is not None:
                print(f"Já existe: {name}")
                skipped += 1
                continue
            body = PickupServiceCreate(name=name, provider_type=provider_type, contact=contact, service_area=area, pricing=pricing, category_ids=[categories[item] for item in names], description=description)
            await save_service(db, user_id, body)
            print(f"Criado: {name} (autor: {email})")
            created += 1
    print(f"Concluído: {created} criados, {skipped} já existentes. Todos são fictícios.")


async def main():
    try:
        await seed()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
