# USDD PSM (Peg Stability Module) Guide

## What is PSM?

The Peg Stability Module lets users swap between USDD and supported stablecoins (USDT, USDC, …) at a **fixed rate with no slippage**, subject to a per-direction fee and a per-direction capacity cap.

This is how arbitrageurs keep USDD pegged to $1 — when USDD trades below $1 on a DEX, anyone can buy it on the market and redeem to USDT/USDC via the PSM at par minus fee.

## Three-chain coverage

PSM is deployed on TRON, ETH, and BSC. Each chain has:
- A list of supported input stablecoins (varies per chain)
- An `fee in` (when swapping stable → USDD)
- An `fee out` (when swapping USDD → stable)
- A capacity cap per direction (how much more USDD the PSM can mint / burn before hitting governance limit)

Use `get_psm_status` from the official MCP to read the current parameters per chain.

## Swap flow (stable → USDD)

1. Hold the input stable on the target chain.
2. Approve the PSM contract to spend the input stable.
3. Call `psm_swap_to_usdd(amount, stable, chain, from)`.
4. Receive USDD into the same wallet, minus `fee in`.

## Swap flow (USDD → stable)

1. Hold USDD on the target chain.
2. Approve the PSM contract to spend USDD.
3. Call `psm_swap_from_usdd(amount, stable, chain, from)`.
4. Receive the chosen stable, minus `fee out`.

## Capacity

Each direction has a cap. If you ask to swap more than the remaining capacity, the transaction will revert. Always check `get_psm_status` before a large swap; for retail-size swaps the cap is rarely a constraint.

## Risks

- **Stablecoin risk**: PSM holds the input stable as backing for USDD. If the input stable de-pegs (USDT, USDC, …), the USDD backed by it inherits that risk.
- **Fee changes**: governance can change PSM fees. The displayed `get_psm_status` is the live number, not a guarantee.
- **Capacity exhaustion**: very large flows can fill one direction's cap, blocking further swaps until governance raises the ceiling or counter-flow refills it.

## References

- PSM product page: <https://usdd.io/psm>
- Live PSM metrics: official MCP `get_psm_status` and `get_psm_metrics`
