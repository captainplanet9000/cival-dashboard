---
title: Approval Required for Production Deployment
labels: deployment, needs-approval
assignees: TradingFarmAdmin
---

## Production Deployment Pending Approval

A new production deployment is ready for approval.

### Deployment Details
- **Branch**: {{ github.ref }}
- **Commit**: [{{ github.sha }}]({{ github.event.repository.html_url }}/commit/{{ github.sha }})
- **Triggered by**: @{{ github.actor }}
- **Build URL**: {{ github.server_url }}/{{ github.repository }}/actions/runs/{{ github.run_id }}
- **Deployment Time**: {{ date | date('YYYY-MM-DD HH:mm:ss') }}

### Pre-deployment Checks
- [x] All tests have passed
- [x] Security scan completed successfully
- [x] Type checking completed successfully
- [x] Linting checks completed successfully
- [x] Performance tests passed benchmarks

### Changes Summary
{{ env.GITHUB_SHA_SHORT }}

### Approval Process
1. Review the changes and verify all checks have passed
2. Test the staging deployment at https://staging.tradingfarm.app
3. Comment with `/approve` to trigger the production deployment
4. The deployment will proceed automatically once approved

### Post-deployment Verification
After deployment, please verify the following:
- Application loads correctly at https://tradingfarm.app
- Authentication system works as expected
- Trading functionality operates correctly
- No security headers or CSP errors are present
