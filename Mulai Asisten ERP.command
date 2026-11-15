#!/bin/zsh
cd "${0:A:h}"
python3 scripts/start_local_agent.py
if [[ $? -ne 0 ]]; then
  read -r "?Tekan Enter untuk menutup…"
fi
