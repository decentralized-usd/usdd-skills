# USDD Vault (CDP) Guide

## What is a Vault?

A USDD Vault is a Collateralized Debt Position: the user locks an approved collateral asset (TRX, stETH, …) into a vault contract, and is allowed to mint USDD against it up to the ilk's collateral ratio. The vault is liquidated if the collateral value falls below the liquidation ratio.

## Ilks (collateral types)

Each supported collateral has its own ilk with parameters:
- **Min collateral ratio** — the minimum ratio of collateral value to USDD debt; below this, liquidation triggers.
- **Stability fee** — the interest accrued on minted USDD.
- **Debt ceiling** — protocol-wide cap on USDD mintable from this ilk.

Read live numbers from `get_supported_ilks` (official MCP).

## Liquidation

If the oracle reports a collateral price such that:

```
collateral_amount × oracle_price < debt × liquidation_ratio
```

then **anyone** can call the liquidation function and seize the collateral at a discount. The vault owner loses their position.

The skill's risk-summary precheck (3 lines: ratio / liquidation price / tier) exists specifically to surface this before the user makes any write that worsens the ratio.

## Write actions

| Action | Effect |
|---|---|
| `open_vault` | Create an empty vault for a given ilk. Bookkeeping only — no token movement. |
| `deposit_and_mint` | Lock collateral and mint USDD in one tx. The bread-and-butter operation. |
| `mint_usdd` | Mint additional USDD from an already-collateralized vault. Increases ratio risk. |
| `repay_usdd` | Repay debt. Improves ratio. |
| `withdraw_collateral` | Take collateral back. Increases ratio risk. |
| `close_vault` | Repay all debt and pull all collateral. |

## Risk tiers

The `analyze_vault_risk` tool returns a tier:

- **SAFE** — collateral ratio ≥ 2× liquidation ratio. Plenty of headroom.
- **WATCH** — between 1.3× and 2× liquidation ratio. Monitor oracle price.
- **DANGER** — within 1.3× liquidation ratio. Mint and withdraw are refused by the skill.

Tiers are heuristic thresholds, not protocol constants — they live in this skill's contract, not the on-chain protocol.

## Projected ratio (chat-confirm requirement)

Before any write that changes collateral or debt, the skill computes:

```
projected_ratio = (collateral - δ_collateral) × oracle_price / (debt + δ_debt)
```

and shows it in the chat-confirmation message. The user verifies this number, not just the input amounts.

## References

- Vault product page: <https://usdd.io/vault>
- Live ilk parameters: official MCP `get_supported_ilks`
- Per-ilk historical analytics: this repo's `get_ilk_collateral_history`
