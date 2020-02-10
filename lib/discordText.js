/* https://support.discordapp.com/hc/en-us/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline- */

module.exports = {
  bold,
  codeBlock,
  codeInline,
  italic,
  quote,
  spoiler,
  strikethrough,
  underline,
  urlNoPreview
}

function bold (string) {
  return `**${string}**`
}

function codeBlock (language, string) {
  return `\`\`\`${language}\n${string}\n\`\`\``
}

function codeInline (string) {
  return `\`${string}\``
}

function italic (string) {
  return `*${string}*`
}

function quote (string) {
  return `> ${string}`
}

function spoiler (string) {
  return `||${string}||`
}

function strikethrough (string) {
  return `~~${string}~~`
}

function underline (string) {
  return `__${string}__`
}

function urlNoPreview (string) {
  return `<${string}>`
}
