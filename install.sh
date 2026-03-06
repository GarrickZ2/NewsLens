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

    if [ ! -f "$TMP_DIR/$BINARY_NAME" ]; then
        echo "Error: Binary not found in archive"
        exit 1
    fi

    if [ -w "$INSTALL_DIR" ]; then
        mv "$TMP_DIR/$BINARY_NAME" "$INSTALL_DIR/"
    else
        echo "Installing to $INSTALL_DIR (requires sudo)"
        sudo mv "$TMP_DIR/$BINARY_NAME" "$INSTALL_DIR/"
    fi

    chmod +x "$INSTALL_DIR/$BINARY_NAME"

    # Remove macOS quarantine flag so the app opens without Gatekeeper prompt
    xattr -rd com.apple.quarantine "$INSTALL_DIR/$BINARY_NAME" 2>/dev/null || true

    echo ""
    echo "NewsLens installed successfully!"
    echo "Run 'newslens' to launch."
}

main() {
    echo "Installing NewsLens..."
    echo ""
    detect_platform
    get_latest_version
    install
}

main
