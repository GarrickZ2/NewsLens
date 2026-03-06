#!/bin/sh
# NewsLens installer
# Usage: curl -sSL https://raw.githubusercontent.com/GarrickZ2/NewsLens/main/install.sh | sh

set -e

REPO="GarrickZ2/NewsLens"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
BINARY_NAME="newslens"

detect_platform() {
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)

    case "$OS" in
        darwin)
            OS="apple-darwin"
            ;;
        *)
            echo "Error: Only macOS is supported. Detected: $OS"
            exit 1
            ;;
    esac

    case "$ARCH" in
        arm64|aarch64)
            ARCH="aarch64"
            ;;
        x86_64|amd64)
            ARCH="x86_64"
            ;;
        *)
            echo "Error: Unsupported architecture: $ARCH"
            exit 1
            ;;
    esac

    PLATFORM="${ARCH}-${OS}"
    echo "Detected platform: $PLATFORM"
}

get_latest_version() {
    VERSION=$(curl -sSL "https://api.github.com/repos/${REPO}/releases/latest" \
        | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
    if [ -z "$VERSION" ]; then
        echo "Error: Could not determine latest version"
        exit 1
    fi
    echo "Latest version: $VERSION"
}

install() {
    DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${VERSION}/${BINARY_NAME}-${VERSION}-${PLATFORM}.tar.gz"
    echo "Downloading: $DOWNLOAD_URL"

    TMP_DIR=$(mktemp -d)
    trap "rm -rf $TMP_DIR" EXIT

    curl -sSL "$DOWNLOAD_URL" | tar -xz -C "$TMP_DIR"

    APP_BUNDLE="$TMP_DIR/NewsLens.app"
    if [ ! -d "$APP_BUNDLE" ]; then
        echo "Error: NewsLens.app not found in archive"
        exit 1
    fi

    # Install .app bundle to /Applications (provides icon + notification support)
    if [ -d "/Applications/NewsLens.app" ]; then
        echo "Removing previous installation..."
        sudo rm -rf "/Applications/NewsLens.app"
    fi
    sudo mv "$APP_BUNDLE" /Applications/

    # Remove macOS quarantine flag so the app opens without Gatekeeper prompt
    sudo xattr -rd com.apple.quarantine "/Applications/NewsLens.app" 2>/dev/null || true

    # Create a CLI launcher symlink in INSTALL_DIR
    LAUNCHER="$INSTALL_DIR/$BINARY_NAME"
    BUNDLE_BIN="/Applications/NewsLens.app/Contents/MacOS/$BINARY_NAME"
    if [ -w "$INSTALL_DIR" ]; then
        ln -sf "$BUNDLE_BIN" "$LAUNCHER"
    else
        echo "Creating launcher in $INSTALL_DIR (requires sudo)"
        sudo ln -sf "$BUNDLE_BIN" "$LAUNCHER"
    fi

    echo ""
    echo "NewsLens installed successfully!"
    echo "  App: /Applications/NewsLens.app"
    echo "  CLI: $INSTALL_DIR/$BINARY_NAME"
    echo ""
    echo "Run 'newslens' to launch, or open NewsLens from Finder/Spotlight."
}

main() {
    echo "Installing NewsLens..."
    echo ""
    detect_platform
    get_latest_version
    install
}

main
