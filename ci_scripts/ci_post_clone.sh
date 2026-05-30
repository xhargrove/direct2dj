#!/bin/sh
set -e

# Capacitor iOS (SPM) resolves plugins from repo-root node_modules — see ios/App/CapApp-SPM/Package.swift
if ! command -v node >/dev/null 2>&1; then
  export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
  brew install node
fi

cd "$CI_PRIMARY_REPOSITORY_PATH"

npm ci
npm run cap:sync:prod
