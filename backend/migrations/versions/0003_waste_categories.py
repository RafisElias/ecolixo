"""Categorias de resíduos usadas pelo mapa e pelos serviços (dados de referência).

Equivale ao antigo database/seed.sql; não duplica categorias existentes.

Revision ID: 0003_waste_categories
Revises: 0002_gamification
"""
from alembic import op

revision = "0003_waste_categories"
down_revision = "0002_gamification"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        INSERT INTO waste_categories (name, description, map_color) VALUES
          ('Smartphone / Tablet',  'Celulares, tablets e acessórios',                      '#E53935'),
          ('Computador / Notebook','Desktops, notebooks, teclados e mouses',               '#8E24AA'),
          ('TV / Monitor',         'Televisores, monitores e projetores',                  '#1E88E5'),
          ('Eletrodoméstico',      'Geladeiras, máquinas de lavar, micro-ondas, etc.',     '#00897B'),
          ('Bateria / Pilha',      'Baterias de celular, pilhas alcalinas e recarregáveis','#F4511E'),
          ('Cabo / Adaptador',     'Cabos USB, carregadores e tomadas',                    '#6D4C41'),
          ('Outro',                'Demais resíduos eletroeletrônicos',                    '#757575')
        ON CONFLICT (name) DO NOTHING
    """)


def downgrade() -> None:
    pass
