#!/bin/bash
# Generate phoneme syllable audio clips using macOS say
# Output: 16kHz mono WAV files, one per syllable

OUTDIR="$(dirname "$0")/syllables"
VOICE="Samantha"
RATE=140

ONSETS=("" "b" "d" "f" "g" "h" "k" "l" "m" "n" "p" "r" "s" "t" "v" "w" "z" "th" "sh" "ch")
VOWELS=("ah" "eh" "ee" "oh" "oo" "ay" "ow" "uh")

count=0
for onset in "${ONSETS[@]}"; do
  for vowel in "${VOWELS[@]}"; do
    syllable="${onset}${vowel}"
    aiff="$OUTDIR/${count}.aiff"
    wav="$OUTDIR/${count}.wav"

    say -v "$VOICE" -r "$RATE" -o "$aiff" "$syllable" 2>/dev/null
    afconvert -f 'WAVE' -d LEI16@16000 -c 1 "$aiff" "$wav" 2>/dev/null
    rm -f "$aiff"

    echo "$count: $syllable"
    count=$((count + 1))
  done
done

echo ""
echo "Generated $count syllable clips in $OUTDIR"
