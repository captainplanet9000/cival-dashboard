"""
Routes package for the Trading Farm dashboard.
"""
from .vault_banking import vault_banking

# List of all blueprints to register
blueprints = [
    vault_banking,
]
