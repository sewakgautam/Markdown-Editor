declare module 'emoji-dictionary' {
  interface EmojiDictionary {
    getUnicode(name: string): string | undefined;
    names: string[];
    unescape: (input: string) => string;
  }

  const emoji: EmojiDictionary;
  export default emoji;
}
