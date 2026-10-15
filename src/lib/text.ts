/** Characters as the Go services count them (Unicode code points of the trimmed text, utf8.RuneCountInString). */
export function codePointLength(value: string): number {
  return [...value.trim()].length
}
