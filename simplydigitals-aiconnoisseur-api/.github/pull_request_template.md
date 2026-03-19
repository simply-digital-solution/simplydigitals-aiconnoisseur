## Summary

<!-- Briefly describe what this PR changes and why -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / improvement
- [ ] Documentation
- [ ] CI/CD / infrastructure
- [ ] Security fix

## Checklist

- [ ] Tests written (unit and/or BDD) for all new behaviour
- [ ] Coverage ≥ 80% maintained (`pytest --cov`)
- [ ] `pre-commit run --all-files` passes cleanly
- [ ] No hard-coded secrets or credentials
- [ ] `CHANGELOG.md` updated if user-facing change
- [ ] PR title follows Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.)

## Test Evidence

<!-- Paste relevant pytest output or coverage diff -->

```
pytest tests/unit/ -v --cov=app --cov-report=term-missing
```

## Security Considerations

<!-- Note any security impact, or write "None" -->
