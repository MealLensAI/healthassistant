#!/bin/bash
# Install Clearaer from the DMG and clear the macOS download warning.
# Usage:
#   bash install-clearaer.sh
#   curl -fsSL https://healthassistant.meallensai.com/downloads/install-clearaer.sh | bash
set -euo pipefail

DMG_URL="${CLEARAER_DMG_URL:-https://healthassistant.meallensai.com/downloads/Clearaer.dmg}"
APP_DEST="/Applications/Clearaer.app"
WORK="$(mktemp -d /tmp/clearaer-install.XXXXXX)"
MOUNT="$WORK/mnt"
cleanup() {
  hdiutil detach "$MOUNT" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Clearaer is a Mac app." >&2
  exit 1
fi

CHIP="$(uname -m)"
if [[ "$CHIP" == "arm64" ]]; then
  echo "Installing Clearaer for Apple Silicon."
elif [[ "$CHIP" == "x86_64" ]]; then
  echo "Installing Clearaer for Intel."
else
  echo "Installing Clearaer ($CHIP)."
fi

SRC=""
if [[ -f "$HOME/Downloads/Clearaer.dmg" ]]; then
  SRC="$HOME/Downloads/Clearaer.dmg"
  echo "Using $SRC"
else
  echo "Downloading Clearaer…"
  curl -fL --progress-bar -o "$WORK/Clearaer.dmg" "$DMG_URL"
  SRC="$WORK/Clearaer.dmg"
fi

mkdir -p "$MOUNT"
hdiutil attach "$SRC" -nobrowse -quiet -mountpoint "$MOUNT"

if [[ ! -d "$MOUNT/Clearaer.app" ]]; then
  echo "Clearaer.app was not found in the disk image." >&2
  exit 1
fi

echo "Installing to $APP_DEST"
rm -rf "$APP_DEST"
cp -R "$MOUNT/Clearaer.app" "$APP_DEST"
xattr -dr com.apple.quarantine "$APP_DEST" 2>/dev/null || true
open "$APP_DEST"
echo "Clearaer is installed. You can delete the DMG in Downloads."
