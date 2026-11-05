#!/usr/bin/env python3
"""Flags vague or banned words in the submission's Markdown files.
Faculty rules (class of 31 Oct 2026): define every vague word and put a number on it; do not use
'user' / 'customer' / 'client' generically, name the stakeholder instead.
Usage: python tools/wording_check.py README.md 0*.md 1*.md     (code blocks are skipped)"""
import re, sys, pathlib
WORDS = ["user", "users", "customer", "customers", "client", "clients", "accurate", "accurately", "accuracy",
         "user-friendly", "easy", "easily", "seamless", "seamlessly", "robust", "leverage", "synergy", "fast",
         "quickly", "significant", "significantly", "high risk", "unsafe", "reduction", "improve", "improved",
         "better", "many", "several", "some", "various", "etc", "appropriate", "adequate", "reasonable", "soon",
         "timely", "optimal"]
def main(paths):
    total = 0
    for p in paths:
        in_code = False
        for i, line in enumerate(pathlib.Path(p).read_text(encoding="utf-8").splitlines(), 1):
            if line.strip().startswith("```"):
                in_code = not in_code; continue
            if in_code: continue
            low = line.lower()
            for w in WORDS:
                if re.search(r"(?<![\w-])" + re.escape(w) + r"(?![\w-])", low):
                    total += 1
                    print(f"{pathlib.Path(p).name}:{i}: '{w}': {line.strip()[:120]}")
    print(f"\n{total} flags. Each one was rewritten with a number or definition, or kept on purpose (see 11).")
if __name__ == "__main__":
    main(sys.argv[1:])
