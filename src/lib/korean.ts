// 마지막 글자 받침 유무로 조사를 고른다 (한글이 아니면 받침 없음으로 본다)
export function particle(word: string, withFinal: string, withoutFinal: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 ? withFinal : withoutFinal;
}
