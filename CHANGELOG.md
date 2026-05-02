# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.1] - 2026-05-02

### Changed

- Updated README: added npm installation section and npm/demo badges

## [1.0.0] - 2026-04-29

### Added

- Copy button injected next to every `h1`–`h6` heading
- Copies the heading and its full section content as raw Markdown
- Fenced code blocks are correctly excluded from heading detection
- Handles duplicate headings at the same level via FIFO matching
- Race condition guard for rapid page navigation (queue-based)
- Visual feedback: checkmark on success, × on failure (2 s)
- Automatic light/dark mode styling via `light-dark()`
- Styles injected as a `<style>` tag — no separate CSS file required
- Clipboard fallback (`execCommand`) for non-HTTPS / older browsers
