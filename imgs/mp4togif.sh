#!/usr/bin/env bash

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 input.mp4 [output.gif]"
    exit 1
fi

INPUT="$1"
OUTPUT="${2:-${INPUT%.*}.gif}"

# Configuration for GitHub-optimized high quality
FPS=15
WIDTH=800
PALETTE="/tmp/palette.png"

echo "Step 1: Generating optimized color palette..."
ffmpeg -v warning -i "$INPUT" \
    -vf "fps=$FPS,scale=$WIDTH:-1:flags=lanczos,palettegen=stats_mode=diff" \
    -y "$PALETTE"

echo "Step 2: Encoding high-quality GIF..."
ffmpeg -v warning -i "$INPUT" -i "$PALETTE" \
    -lavfi "fps=$FPS,scale=$WIDTH:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=sierra2_4a" \
    -y "$OUTPUT"

rm "$PALETTE"
echo "Done! Created: $OUTPUT"
