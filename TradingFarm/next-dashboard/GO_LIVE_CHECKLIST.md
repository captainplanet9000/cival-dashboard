# Go-Live Checklist: Trading Farm

## Pre-Launch
- [ ] All database migrations applied and RLS enabled
- [ ] Environment variables set (API keys, endpoints, secrets)
- [ ] Paper trading simulation run and validated
- [ ] Logging and alerting verified
- [ ] Security audit passed (RLS, access controls, secrets)
- [ ] All critical workflows tested (orders, agents, strategies)
- [ ] Backup and recovery plan in place

## Launch
- [ ] Start with minimal funds for live trading
- [ ] Monitor dashboards for health and trading metrics
- [ ] Enable alerting for anomalies/errors
- [ ] Scale up only after successful live validation

## Post-Launch
- [ ] Regularly monitor logs and metrics
- [ ] Run periodic compliance and security checks
- [ ] Update documentation as system evolves

---
For operational runbooks and troubleshooting, see `src/core/README.md` and `src/services/README.md`.
