# USDD Earn (Savings) Guide

## What is Earn?

USDD Earn lets holders deposit USDD and receive sUSDD, a yield-bearing token that appreciates against USDD as the savings rate accrues. There is no lock-up — sUSDD can be redeemed back to USDD at the current exchange rate at any time.

## Three-chain coverage

Earn is deployed on TRON, Ethereum, and BSC. Each chain has its own:
- `USDD` ERC20/TRC20 contract address
- `sUSDD` ERC20/TRC20 contract address
- Earn (Savings) contract address

The savings rate and APY can differ per chain. Use `get_earn_apy` (this repo's MCP) or `get_savings_status` (official MCP) for the current numbers.

## Deposit flow

1. Hold USDD on the target chain.
2. Approve the Earn contract to spend USDD (one-time per chain per amount — re-approve if you want a higher cap).
3. Call `deposit_savings(amount, chain, from)` via the official MCP.
4. Receive sUSDD into the same wallet at the current `sUSDD/USDD` exchange rate.

## Withdraw flow

1. Hold sUSDD on the target chain.
2. Call `withdraw_savings(amount, chain, from)` — no approval needed (sUSDD is burned, not pulled).
3. Receive USDD back at the current exchange rate.

## How APY accrues

sUSDD has a monotonically increasing exchange rate against USDD. The savings rate (set by USDD governance) compounds continuously per block. The APY shown by `get_earn_apy` is annualized at the current rate.

## Cross-chain comparison

Use `get_earn_apy` (this repo's MCP, `openapi.usdd.io /external/earn-apy`) to see APY on all three chains at once. Pick the chain with the highest rate **and** lowest gas cost for your deposit size.

## Risks

- **Smart-contract risk**: sUSDD relies on the Earn contract holding USDD and tracking the exchange rate correctly.
- **Bridge risk**: if you want to move USDD between chains before depositing, the bridge introduces additional risk.
- **Rate risk**: the savings rate can be changed by USDD governance. APY shown is the current rate, not a guarantee.

## References

- Earn product page: <https://usdd.io/earn>
- Smart contract addresses: see official MCP `get_supported_networks` output
